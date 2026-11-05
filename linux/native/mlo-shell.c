/*
 * MLO Creator - the native Linux window.
 *
 * This is the part that used to be AppWindow.cs with Microsoft WebView2 on Windows: one GTK window with a
 * WebKit2GTK view. It works on both X11 and Wayland because GTK does the platform work; there is no X11 or
 * Wayland specific code here.
 *
 * It is a separate process from the .NET host on purpose: the host is a small HTTP server and the editor is a
 * WebGL page; GTK needs to own the main loop. The host starts this program, waits for it, and the program exits
 * when the window is closed (after asking the page to save). The same program is also the native file dialog:
 *   mlo-shell --pick-files  [--last DIR]    prints the picked paths, one per line
 *   mlo-shell --pick-folder [--last DIR]    prints the picked folder
 */
#include <gtk/gtk.h>
#include <webkit2/webkit2.h>
#include <jsc/jsc.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <errno.h>

#define MLO_TITLE "MLO Creator"
#define MLO_VERSION "1.0.0"

typedef struct {
    GtkWidget *window;
    GtkWidget *web;
    char *url;
    char *data_dir;
    char *icon_path;
    gboolean devtools;
    gboolean flushed;
    gboolean loaded;
    char *eval_file;
    gboolean eval_exit;
    gboolean eval_ran;
    char *shot_file;
    gboolean shot_exit;
    int close_after;
    pid_t parent;
    guint parent_watch;
} App;

static App *app = NULL;

static void log_line(const char *fmt, ...)
{
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
    fputc('\n', stderr);
    fflush(stderr);
}

/* ---------------- window size memory ---------------- */
static char *bounds_path(void)
{
    if (!app->data_dir) return NULL;
    return g_build_filename(app->data_dir, "window.txt", NULL);
}

static void restore_bounds(GtkWindow *win)
{
    int w = 1600, h = 960, maximized = 0;
    char *p = bounds_path();
    if (p) {
        FILE *f = fopen(p, "r");
        if (f) {
            if (fscanf(f, "%d %d %d", &w, &h, &maximized) != 3) { w = 1600; h = 960; maximized = 0; }
            fclose(f);
        }
        g_free(p);
    }
    if (w < 900) w = 900;
    if (h < 600) h = 600;
    gtk_window_set_default_size(win, w, h);
    if (maximized) gtk_window_maximize(win);
}

static void save_bounds(GtkWindow *win)
{
    char *p = bounds_path();
    if (!p) return;
    int w = 1600, h = 960;
    gtk_window_get_size(win, &w, &h);
    int maximized = gtk_window_is_maximized(win) ? 1 : 0;
    FILE *f = fopen(p, "w");
    if (f) { fprintf(f, "%d %d %d\n", w, h, maximized); fclose(f); }
    g_free(p);
}

/* ---------------- closing: let the editor save first ---------------- */
static void save_bounds(GtkWindow *win);

static gboolean close_now(gpointer data)
{
    App *a = (App *)data;
    if (a->window) { save_bounds(GTK_WINDOW(a->window)); gtk_widget_destroy(a->window); }
    gtk_main_quit();
    return G_SOURCE_REMOVE;
}

static gboolean on_delete(GtkWidget *widget, GdkEvent *event, gpointer data)
{
    App *a = (App *)data;
    save_bounds(GTK_WINDOW(a->window));
    if (a->flushed || !a->web) return FALSE;
    a->flushed = TRUE;
    if (a->loaded) {
        const char *script =
            "(function(){try{var M=window.MLO;if(M&&M.Model&&M.Model.state&&!M.Model.state.saved)"
            "return M.Model.save();}catch(e){}return 1;})()";
        webkit_web_view_evaluate_javascript(WEBKIT_WEB_VIEW(a->web), script, -1, NULL, NULL, NULL, NULL, NULL);
        /* the page saves in a moment; give it that moment, then close */
        g_timeout_add(1200, close_now, a);
        return TRUE;
    }
    return FALSE;
}

/* ---------------- page ---------------- */
static gboolean take_screenshot(gpointer data);
static gboolean close_after_cb(gpointer data);

/* ---------------- optional developer hook: run a JS file in the page ---------------- */
static void on_eval_done(GObject *source, GAsyncResult *res, gpointer user_data)
{
    App *a = (App *)user_data;
    GError *err = NULL;
    JSCValue *v = webkit_web_view_call_async_javascript_function_finish(WEBKIT_WEB_VIEW(source), res, &err);
    if (err) { printf("MLO_EVAL_ERROR:%s\n", err->message ? err->message : "?"); g_error_free(err); }
    else if (v) {
        char *str = jsc_value_to_string(v);
        printf("MLO_EVAL_RESULT:%s\n", str ? str : "");
        g_free(str); g_object_unref(v);
    }
    fflush(stdout);
    if (a->shot_file) g_timeout_add(900, take_screenshot, a);
    if (a->eval_exit) gtk_main_quit();
}

static void run_eval(App *a)
{
    if (a->eval_ran || !a->eval_file) return;
    a->eval_ran = TRUE;
    char *script = NULL; gsize len = 0; GError *err = NULL;
    if (!g_file_get_contents(a->eval_file, &script, &len, &err)) {
        printf("MLO_EVAL_ERROR:%s\n", err ? err->message : "?"); fflush(stdout);
        if (err) g_error_free(err);
        if (a->eval_exit) gtk_main_quit();
        return;
    }
    log_line("mlo-shell: evaluating %s", a->eval_file);
    webkit_web_view_call_async_javascript_function(WEBKIT_WEB_VIEW(a->web), script, (gssize)len, NULL, NULL, NULL, NULL, on_eval_done, a);
    g_free(script);
}

static void on_title(GObject *obj, GParamSpec *pspec, gpointer data)
{
    App *a = (App *)data;
    const char *t = webkit_web_view_get_title(WEBKIT_WEB_VIEW(a->web));
    gtk_window_set_title(GTK_WINDOW(a->window), (t && *t) ? t : MLO_TITLE);
}

/* ---------------- developer hook: save the window contents (works on X11) ---------------- */
static gboolean take_screenshot(gpointer data)
{
    App *a = (App *)data;
    if (!a->shot_file || !a->window) return G_SOURCE_REMOVE;
    GdkWindow *w = gtk_widget_get_window(a->window);
    if (!w) { log_line("mlo-shell: screenshot: no window"); return G_SOURCE_REMOVE; }
    int width = gdk_window_get_width(w), height = gdk_window_get_height(w);
    GdkPixbuf *pb = gdk_pixbuf_get_from_window(w, 0, 0, width, height);
    if (!pb) { log_line("mlo-shell: screenshot: this backend does not allow reading the window"); }
    else {
        GError *err = NULL;
        if (gdk_pixbuf_save(pb, a->shot_file, "png", &err, NULL)) printf("MLO_SCREENSHOT:%s\n", a->shot_file);
        else { log_line("mlo-shell: screenshot failed: %s", err ? err->message : "?"); if (err) g_error_free(err); }
        fflush(stdout);
        g_object_unref(pb);
    }
    if (a->shot_exit) gtk_main_quit();
    return G_SOURCE_REMOVE;
}

static void on_load_changed(WebKitWebView *web, WebKitLoadEvent ev, gpointer data)
{
    App *a = (App *)data;
    if (ev == WEBKIT_LOAD_FINISHED) {
        a->loaded = TRUE;
        log_line("mlo-shell: page loaded: %s", webkit_web_view_get_uri(web));
        /* the page is an application, not a document: no text selection cursor on the chrome, no zoom */
        webkit_web_view_set_zoom_level(web, 1.0);
        if (a->shot_file && !a->eval_file) g_timeout_add(1500, take_screenshot, a);
        if (a->close_after > 0) g_timeout_add_seconds(a->close_after, close_after_cb, a);
        run_eval(a);
    }
}

static gboolean on_load_failed(WebKitWebView *web, WebKitLoadEvent ev, const char *uri, GError *error, gpointer data)
{
    log_line("mlo-shell: load failed: %s (%s)", uri, error ? error->message : "?");
    return TRUE; /* do not show WebKit's own error page */
}

static gboolean on_context_menu(WebKitWebView *web, WebKitContextMenu *menu, GdkEvent *event, WebKitHitTestResult *hit, gpointer data)
{
    /* it is an application: the editor has its own right-button camera, no browser menu */
    return TRUE;
}

static gboolean on_decide_policy(WebKitWebView *web, WebKitPolicyDecision *decision, WebKitPolicyDecisionType type, gpointer data)
{
    App *a = (App *)data;
    if (type == WEBKIT_POLICY_DECISION_TYPE_NAVIGATION_ACTION || type == WEBKIT_POLICY_DECISION_TYPE_NEW_WINDOW_ACTION) {
        WebKitNavigationAction *na = webkit_navigation_policy_decision_get_navigation_action(WEBKIT_NAVIGATION_POLICY_DECISION(decision));
        WebKitURIRequest *req = webkit_navigation_action_get_request(na);
        const char *uri = req ? webkit_uri_request_get_uri(req) : NULL;
        if (type == WEBKIT_POLICY_DECISION_TYPE_NEW_WINDOW_ACTION) { webkit_policy_decision_ignore(decision); return TRUE; }
        if (uri && a->url && strncmp(uri, a->url, strlen(a->url)) != 0) {
            /* a file dropped beside the drop zone, a link, a stray navigation: keep the editor */
            if (strncmp(uri, "data:", 5) != 0) { webkit_policy_decision_ignore(decision); return TRUE; }
        }
    }
    return FALSE;
}

static gboolean on_permission(WebKitWebView *web, WebKitPermissionRequest *req, gpointer data)
{
    /* the editor only asks for the clipboard (the "Copy details" buttons); everything else is refused */
    if (G_OBJECT_TYPE_NAME(req) && strstr(G_OBJECT_TYPE_NAME(req), "Clipboard")) webkit_permission_request_allow(req);
    else webkit_permission_request_deny(req);
    return TRUE;
}

static gboolean on_key_press(GtkWidget *widget, GdkEventKey *ev, gpointer data)
{
    App *a = (App *)data;
    gboolean ctrl = (ev->state & GDK_CONTROL_MASK) != 0;
    gboolean shift = (ev->state & GDK_SHIFT_MASK) != 0;
    if (ev->keyval == GDK_KEY_F12 && a->devtools) {
        WebKitWebInspector *ins = webkit_web_view_get_inspector(WEBKIT_WEB_VIEW(a->web));
        webkit_web_inspector_show(ins);
        return TRUE;
    }
    if (a->devtools) return FALSE;
    /* an application window, not a browser: no reload, no zoom, no back/forward */
    if (ev->keyval == GDK_KEY_F5) return TRUE;
    if (ctrl && (ev->keyval == GDK_KEY_r || ev->keyval == GDK_KEY_R)) return TRUE;
    if (ctrl && (ev->keyval == GDK_KEY_plus || ev->keyval == GDK_KEY_equal || ev->keyval == GDK_KEY_KP_Add)) return TRUE;
    if (ctrl && (ev->keyval == GDK_KEY_minus || ev->keyval == GDK_KEY_KP_Subtract)) return TRUE;
    if (ctrl && (ev->keyval == GDK_KEY_0 || ev->keyval == GDK_KEY_KP_0)) return TRUE;
    if (ctrl && shift && (ev->keyval == GDK_KEY_I || ev->keyval == GDK_KEY_i)) return TRUE;
    if (ev->state & GDK_MOD1_MASK) {
        if (ev->keyval == GDK_KEY_Left || ev->keyval == GDK_KEY_Right) return TRUE;
    }
    return FALSE;
}

static gboolean close_after_cb(gpointer data)
{
    App *a = (App *)data;
    log_line("mlo-shell: --close-after: asking the window to close");
    if (a->window) gtk_window_close(GTK_WINDOW(a->window));
    return G_SOURCE_REMOVE;
}

static gboolean watch_parent(gpointer data)
{
    App *a = (App *)data;
    if (a->parent > 1 && kill(a->parent, 0) != 0 && errno == ESRCH) {
        log_line("mlo-shell: the host is gone, closing");
        gtk_main_quit();
        return G_SOURCE_REMOVE;
    }
    return G_SOURCE_CONTINUE;
}

/* ---------------- main window ---------------- */
static int run_window(const char *url, const char *data_dir, const char *icon_path, gboolean devtools, pid_t parent, const char *eval_file, gboolean eval_exit, const char *shot_file, gboolean shot_exit, int close_after)
{
    /* in a sandbox the runtime dir can be read-only; dconf then prints a warning per setting */
    const char *rt = g_get_user_runtime_dir();
    if (rt) { char *dd = g_build_filename(rt, "dconf", NULL); if (access(dd, W_OK) != 0) g_setenv("GSETTINGS_BACKEND", "memory", FALSE); g_free(dd); }
    g_set_prgname("mlo-creator");
    gdk_set_program_class("MloCreator");
    int argc0 = 0; char **argv0 = NULL;
    if (!gtk_init_check(&argc0, &argv0)) {
        log_line("mlo-shell: no display (set DISPLAY or WAYLAND_DISPLAY)");
        return 3;
    }
    App a;
    memset(&a, 0, sizeof(a));
    a.url = g_strdup(url); a.data_dir = g_strdup(data_dir); a.icon_path = icon_path ? g_strdup(icon_path) : NULL;
    a.devtools = devtools; a.parent = parent;
    a.eval_file = eval_file ? g_strdup(eval_file) : NULL; a.eval_exit = eval_exit;
    a.shot_file = shot_file ? g_strdup(shot_file) : NULL; a.shot_exit = shot_exit; a.close_after = close_after;
    app = &a;

    if (data_dir) g_mkdir_with_parents(data_dir, 0700);

    a.window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(a.window), MLO_TITLE);
    gtk_window_set_default_icon_name("applications-graphics");
    if (a.icon_path) gtk_window_set_icon_from_file(GTK_WINDOW(a.window), a.icon_path, NULL);
    gtk_container_set_border_width(GTK_CONTAINER(a.window), 0);
    restore_bounds(GTK_WINDOW(a.window));
    g_signal_connect(a.window, "delete-event", G_CALLBACK(on_delete), &a);

    a.web = webkit_web_view_new();
    gtk_widget_set_hexpand(a.web, TRUE);
    gtk_widget_set_vexpand(a.web, TRUE);
    gtk_container_add(GTK_CONTAINER(a.window), a.web);
    gtk_widget_show_all(a.window);
    gtk_widget_grab_focus(a.web);

    WebKitSettings *settings = webkit_web_view_get_settings(WEBKIT_WEB_VIEW(a.web));
    webkit_settings_set_enable_webgl(settings, TRUE);
    webkit_settings_set_hardware_acceleration_policy(settings, WEBKIT_HARDWARE_ACCELERATION_POLICY_ALWAYS);
    webkit_settings_set_enable_developer_extras(settings, devtools);
    webkit_settings_set_javascript_can_access_clipboard(settings, TRUE);
    webkit_settings_set_enable_write_console_messages_to_stdout(settings, TRUE);
    webkit_settings_set_enable_smooth_scrolling(settings, TRUE);
    webkit_settings_set_enable_page_cache(settings, FALSE);
    webkit_settings_set_allow_file_access_from_file_urls(settings, FALSE);
    webkit_settings_set_allow_universal_access_from_file_urls(settings, FALSE);
    webkit_settings_set_enable_media_stream(settings, FALSE);
    webkit_settings_set_enable_mediasource(settings, FALSE);

    g_signal_connect(a.web, "notify::title", G_CALLBACK(on_title), &a);
    g_signal_connect(a.web, "load-changed", G_CALLBACK(on_load_changed), &a);
    g_signal_connect(a.web, "load-failed", G_CALLBACK(on_load_failed), &a);
    g_signal_connect(a.web, "context-menu", G_CALLBACK(on_context_menu), &a);
    g_signal_connect(a.web, "decide-policy", G_CALLBACK(on_decide_policy), &a);
    g_signal_connect(a.web, "permission-request", G_CALLBACK(on_permission), &a);
    g_signal_connect(a.web, "key-press-event", G_CALLBACK(on_key_press), &a);

    if (parent > 1) a.parent_watch = g_timeout_add_seconds(2, watch_parent, &a);

    gchar *wv = g_strdup_printf("%u.%u.%u", webkit_get_major_version(), webkit_get_minor_version(), webkit_get_micro_version());
    GdkDisplay *disp = gdk_display_get_default();
    const char *backend = "?";
    if (disp) { const char *tn = G_OBJECT_TYPE_NAME(disp); backend = strstr(tn, "X11") ? "X11" : (strstr(tn, "Wayland") ? "Wayland" : tn); }
    log_line("mlo-shell: %s, display %s (%s), GTK %u.%u.%u, WebKitGTK %s", url, backend,
             disp ? gdk_display_get_name(disp) : "?", gtk_get_major_version(), gtk_get_minor_version(), gtk_get_micro_version(), wv);
    g_free(wv);
    webkit_web_view_load_uri(WEBKIT_WEB_VIEW(a.web), url);
    gtk_main();
    if (a.parent_watch) g_source_remove(a.parent_watch);
    g_free(a.url); g_free(a.data_dir); g_free(a.icon_path); g_free(a.eval_file);
    app = NULL;
    return 0;
}

/* ---------------- native file dialogs ---------------- */
static int run_picker(gboolean folder, const char *last)
{
    int argc0 = 0; char **argv0 = NULL;
    if (!gtk_init_check(&argc0, &argv0)) {
        log_line("mlo-shell: no display for the file dialog");
        return 3;
    }
    GtkFileChooserAction action = folder ? GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER : GTK_FILE_CHOOSER_ACTION_OPEN;
    GtkFileChooserNative *native = gtk_file_chooser_native_new(
        folder ? "Pick the folder that holds the model files (.ydr, .ytd, .ybn, .ymap, .glb)" : "Import model files",
        NULL, action, folder ? "_Open" : "_Open", "_Cancel");
    GtkFileChooser *chooser = GTK_FILE_CHOOSER(native);
    if (!folder) {
        gtk_file_chooser_set_select_multiple(chooser, TRUE);
        GtkFileFilter *filter = gtk_file_filter_new();
        gtk_file_filter_set_name(filter, "Model files (*.ydr, *.ytd, *.ybn, *.ymap, *.glb)");
        gtk_file_filter_add_pattern(filter, "*.ydr");
        gtk_file_filter_add_pattern(filter, "*.ytd");
        gtk_file_filter_add_pattern(filter, "*.ybn");
        gtk_file_filter_add_pattern(filter, "*.ymap");
        gtk_file_filter_add_pattern(filter, "*.glb");
        gtk_file_chooser_add_filter(chooser, filter);
        GtkFileFilter *all = gtk_file_filter_new();
        gtk_file_filter_set_name(all, "All files");
        gtk_file_filter_add_pattern(all, "*");
        gtk_file_chooser_add_filter(chooser, all);
    }
    if (last && *last && g_file_test(last, G_FILE_TEST_IS_DIR)) gtk_file_chooser_set_current_folder(chooser, last);
    int res = gtk_native_dialog_run(GTK_NATIVE_DIALOG(native));
    int rc = 1;
    if (res == GTK_RESPONSE_ACCEPT) {
        GSList *files = gtk_file_chooser_get_filenames(chooser);
        for (GSList *it = files; it; it = it->next) {
            if (it->data) { printf("%s\n", (char *)it->data); }
        }
        g_slist_free_full(files, g_free);
        fflush(stdout);
        rc = 0;
    }
    g_object_unref(native);
    return rc;
}

static void usage(void)
{
    printf("mlo-shell %s - the native window and file dialogs of MLO Creator\n", MLO_VERSION);
    printf("  --url URL [--data DIR] [--icon FILE] [--devtools] [--parent PID]\n");
    printf("  --eval-file FILE [--eval-exit]  run a JS file in the page (developer/testing hook)\n");
    printf("  --screenshot FILE [--screenshot-exit]  save the window contents (developer/testing hook)\n");
    printf("  --close-after SECONDS            close the window as if the user did (testing hook)\n");
    printf("  --pick-files [--last DIR]   print the picked files, one per line\n");
    printf("  --pick-folder [--last DIR]  print the picked folder\n");
}

int main(int argc, char **argv)
{
    const char *url = NULL, *data = NULL, *icon = NULL, *last = NULL, *parent_s = NULL, *eval_file = NULL, *shot_file = NULL, *close_after_s = NULL;
    gboolean devtools = FALSE, pick_files = FALSE, pick_folder = FALSE, eval_exit = FALSE, shot_exit = FALSE;
    int close_after = 0;

    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "--url") && i + 1 < argc) url = argv[++i];
        else if (!strcmp(argv[i], "--data") && i + 1 < argc) data = argv[++i];
        else if (!strcmp(argv[i], "--icon") && i + 1 < argc) icon = argv[++i];
        else if (!strcmp(argv[i], "--parent") && i + 1 < argc) parent_s = argv[++i];
        else if (!strcmp(argv[i], "--last") && i + 1 < argc) last = argv[++i];
        else if (!strcmp(argv[i], "--eval-file") && i + 1 < argc) eval_file = argv[++i];
        else if (!strcmp(argv[i], "--eval-exit")) eval_exit = TRUE;
        else if (!strcmp(argv[i], "--screenshot") && i + 1 < argc) shot_file = argv[++i];
        else if (!strcmp(argv[i], "--screenshot-exit")) shot_exit = TRUE;
        else if (!strcmp(argv[i], "--close-after") && i + 1 < argc) close_after_s = argv[++i];
        else if (!strcmp(argv[i], "--devtools")) devtools = TRUE;
        else if (!strcmp(argv[i], "--pick-files")) pick_files = TRUE;
        else if (!strcmp(argv[i], "--pick-folder")) pick_folder = TRUE;
        else if (!strcmp(argv[i], "--version")) { printf("mlo-shell %s\n", MLO_VERSION); return 0; }
        else if (!strcmp(argv[i], "--help") || !strcmp(argv[i], "-h")) { usage(); return 0; }
    }

    if (pick_files || pick_folder) return run_picker(pick_folder, last);
    if (!url) { usage(); return 2; }
    pid_t parent = 0;
    if (parent_s) { long v = strtol(parent_s, NULL, 10); if (v > 1) parent = (pid_t)v; }
    if (close_after_s) close_after = (int)strtol(close_after_s, NULL, 10);
    return run_window(url, data, icon, devtools, parent, eval_file, eval_exit, shot_file, shot_exit, close_after);
}
