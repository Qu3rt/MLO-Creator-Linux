# MLO Creator

A Windows program for building FiveM interiors (MLOs) inside an existing GTA V building model, then exporting a ready-to-upload resource folder.

You import the model files of a building (for example a vanilla house), cut doors and windows through its walls, build the rooms inside, place lights and doors, paint, and press Export. Nothing is generated for you: every wall, opening, light and cut comes from something you did. It runs on your PC, outside the game.

> **Status:** everything it writes loads in [CodeWalker](https://github.com/dexyfex/CodeWalker) and the output is checked file by file, but streaming, lighting, portals, collision and door behaviour still have to be seen in the game. Report what you find.

## What it does

- **Import** `.ydr` models, `.ytd` textures, `.ybn` collision and `.ymap` files (or look them up in your own GTA V install).
- **Frame** the grid onto the building, then **draw rooms**, cut-outs and partitions.
- **Cut doors, windows and archways** through the model and its collision, like a boolean in Blender.
- **Door and window models** from your own `.glb` files, placed by hand, including double doors.
- **Clean up the model**: delete faces, remove model parts, fill holes, clear the model out of the rooms, edit its collision, build your own collision boxes.
- **Props and plants**: find the map's bushes, trees and props across the whole model, see them in the view, and remove the ones you pick (written as a small client script).
- **Finish the inside**: floor and wall paint with built-in and your own textures, ceiling lights, scale figure.
- **Check it**: checklist, collision walk-through, then **export** a resource with `fxmanifest.lua`, `client/ipl.lua` and a README that lists every game file it replaces and a test spot to teleport to.

A second project type builds a whole new house on a grid, with the same GLB window and door library. Details of every tool are in [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

## Whole new building: window and door library

In **Build**, choose **Window** or **Door**, then pick a model thumbnail. Window shows every window system in the library; Door includes doors and frames. Keep the original `models` folder next to the executable, or use **Add .glb models...** for your own files. Custom files have a window/door/frame type selector.

Set width, height, depth and window sill height, then click a straight wall. Wide models automatically open the neighbouring wall cells; the editor rejects openings that cross a corner, another opening or the ceiling. Click an existing model's opening to resize it, reverse its facing, or remove it. Doors support left/right hinges and double leaves. A frame's **Door in frame** selector adds a door that sizes itself to the frame; it can also have double leaves. **Use simple window/doorway** keeps the original procedural tools available.

To put a frame around an existing standalone door, select a frame thumbnail and click that door's opening. The frame sizes itself around the current leaf, preserving its position, dimensions, facing and hinges (including double doors). To add a leaf to an existing frame, choose a door thumbnail and click the frame. If the larger frame would overlap another opening or cross a wall end, move the door or use a narrower frame first.

Library door openings now include finishing trim on both wall faces, leaving a small 6 mm visible reveal. The structural opening retains clearance for the leaf's thickness as it swings. Existing scratch placements receive the finish when reopened and re-exported.

Exterior openings get portals automatically on export, including upstairs. Windows keep glass collision; frames get jamb collision, while door leaves use the existing exporter's separate moving door collision. Door control/locking still needs a game door script using the model names and hinge positions listed in the exported README. All floors still share one interior visibility room.

Placements save with each level and support undo/redo. Export uses the same native fitted-model and texture writer as imported-building projects. Reopen the program after updating `ui`; no executable rebuild is needed. Back up projects before using an older editor, which does not understand these added model placements. Native Windows export and in-game door, collision and visibility checks remain required.

Developer checks: `node --test source/tests/grid-models.test.cjs` covers the mesh, collision, portals, placement validation and saved project compatibility. `node source/tests/grid-browser-smoke.cjs` exercises the real model picker, wall clicks, resizing, saving and export request against a stub library host (same Playwright environment options as the browser test below).

## Imported buildings: floors, stairs and faster face removal

This local update works with the bundled executable: close and reopen `MloCreator.exe` after copying the updated `ui` folder. No executable rebuild or server restart is needed. The matching UI files are also in `source/ui` for future builds. Keep a copy of your projects before opening an upgraded project in an older release; older editors do not understand additional floors.

In **Build → Floors and stairs**:

1. Draw and position the ground-floor rooms first.
2. Set **Spacing to new floor** (3.1 m by default), then **Add floor above**. Leave **Copy room outlines** checked to start upstairs with the same footprint. Repeat for more floors.
3. Select a floor to edit its rooms, partitions, ceiling height, doors, windows and lights. **Floor Z (model)** is the floor height relative to the imported model, not a world/player coordinate. The floor layouts share the building's horizontal frame.
4. Select the lower floor and use **Add stairs to …**. Adjust X/Y, width, run and uphill direction. The editor creates step meshes and collision, opens the lower ceiling and upper floor, and cuts the imported model/collision through the stairwell. Keep both landings inside the rooms and away from walls. Review the floor/stair warnings before exporting. You can cancel to correct them or choose **Export anyway** for a test export.
5. **Show all floors** previews the whole building; leave it off for editing one floor. Export always includes all floors of every building with rooms, including upstairs lights, doors and windows.

Floors share one MLO interior/culling room per building; this does not add separate GTA room IDs, sound isolation or visibility portals between storeys. The existing flat Walk check covers the selected floor, not travel along stairs. Validate stair access, headroom, collision, portals and lighting in GTA/FiveM before using the export live.

**Delete faces** now hides selected triangles immediately, including when a building is isolated. Pure deletion no longer waits for a host cut. More complex cuts update in the background, one at a time; older responses cannot overwrite newer edits or another project. Unchanged detail models are not recut on every deletion. Undo restores deleted faces immediately while any required full preview catches up. Deleting visible faces still does not delete collision: use the Collision tool or the room/stair collision cuts for that.

For an imported model whose map uses another name, **Import → Where it stands in the game → Map archetype** can override the lookup name without renaming the model file. For the `lr_sc1_10_shop.ydr` case, verify `sc1_10_shop` in CodeWalker and use that archetype for the lookup.

**Missing output folder:** The Export tab shows the destination from your saved settings, or the override under **Options → Output folder**. A saved absolute path can still point to an older copy of the editor after moving it. Set the desired destination in Options and press **Export resource**; the host creates the folder when writing starts. Missing models, placement or rooms leave a persistent explanation below the button. Wait for **Done:** and use its reported path to find the completed export.

Developer checks: `node --test source/tests/editor.test.cjs` tests the source UI; set `MLO_UI` to the absolute path of `ui/js` to test the runnable copy. The tests cover project compatibility, independent floors, undo/redo, stair geometry and openings, export heights and stale preview responses. For the browser smoke test, provide Playwright and run `node source/tests/browser-smoke.cjs` (`MLO_PLAYWRIGHT` and `MLO_CHROMIUM` optionally select installed paths). It exercises the controls, saving, export payload and archetype override against a local stub host. Native Windows export and in-game validation remain separate checks.

## Requirements

- Windows 10 or 11, 64-bit, with the .NET Framework 4.8 (part of Windows).
- The [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (already part of Windows 11 and of Edge). Without it the program falls back to an Edge or Chrome app window.
- A copy of GTA V, and [CodeWalker](https://github.com/dexyfex/CodeWalker) to extract the game files you work on (see below). The "look it up in the game files" buttons read your install directly. The program finds Steam, Rockstar and Epic installs by itself; otherwise set `{"gtaPath": "D:\\Games\\Grand Theft Auto V"}` in `settings.json` next to the program, or the `GTA5_PATH` environment variable.

No game files are included. You supply the models you want to work on.

## Getting the GTA V files (CodeWalker is required)

MLO Creator works on files taken from the game: the building's model (`.ydr`), textures (`.ytd`), collision (`.ybn`) and map placement (`.ymap`). **You need [CodeWalker](https://github.com/dexyfex/CodeWalker) to get them.** Open your GTA V folder in CodeWalker, find the building in its RPF Explorer or World View, extract those files, and add them in MLO Creator's Import tab (Add files, Add a folder, or drag them onto the window). The same goes for any other GTA asset you want to bring in: get it out of the game's archives with CodeWalker first.

MLO Creator also uses CodeWalker's library itself (it is built against it, see [lib/README.md](lib/README.md)), and its lookup buttons (where the model stands, its collision, occlusion files, plants and props) read your own GTA V install directly. CodeWalker is still the way to get the model files.

## Run it

Unzip the release anywhere you can write to and double-click `MloCreator.exe`. Projects, cache, settings and exports are kept next to the program (`projects\`, `cache\`, `output\`, `settings.json`). The exe is not signed, so Windows may ask once ("More info", then "Run anyway").

Command line options: `--browser` (use an Edge or Chrome app window), `--devtools` (allow F12), `--no-window` (server only, for testing), `--port N`.

## Build it yourself

You need Windows and the .NET Framework C# compiler that ships with it (no SDK). Then:

1. Get the libraries into `lib\` (see [lib/README.md](lib/README.md)): CodeWalker's DLLs from a CodeWalker build, and WebView2's with `tools\fetch-webview2.ps1`.
2. `powershell -ExecutionPolicy Bypass -File build.ps1` builds `MloCreator.exe` (`-CodeWalker <folder>` or `CODEWALKER_DIR` to copy the CodeWalker DLLs the first time; `-Out name.exe` builds beside a running copy).
3. `powershell -ExecutionPolicy Bypass -File package.ps1` makes the folder and zip you can hand to others.

The editor is plain HTML, CSS and JavaScript in `ui\` (WebGL, no framework, no build step); it is served from disk, so editing it only needs a page reload. Changes to `src\*.cs` need a rebuild. `tools\verify_export.ps1 -Res <exported folder>` opens every exported file with CodeWalker and prints what is inside.

## Layout

| Folder | Content |
|---|---|
| `src\` | The program: local server and window (`Program.cs`, `AppWindow.cs`), import and cutting (`ImportHost.cs`, `ModelCut.cs`, `CollisionCut.cs`), export (`Exporter.cs`, `FitExport.cs`), game-file lookups (`Vanilla.cs`) |
| `ui\` | The editor |
| `models\` | Window, door and frame library plus the original up-and-over garage panel (see their credits) |
| `tools\` | Helper scripts |
| `docs\` | How the program works |

## Credits and licences

MLO Creator uses [CodeWalker](https://github.com/dexyfex/CodeWalker)'s library to read and write GTA V files, SharpDX, and Microsoft's WebView2, and ships three third-party 3D models. See [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) and [models/CREDITS.txt](models/CREDITS.txt). One of the models is licensed for non-commercial use only.

GTA V and its assets belong to Rockstar Games. This project is not affiliated with Rockstar Games, Take-Two, or the FiveM team.

## Support

MLO Creator is free and open source. If it saves you time, you can leave a tip on [Ko-fi](https://ko-fi.com/tempusmlos). Thank you, it really helps.

## Licence

MLO Creator's own code is released under the [MIT licence](LICENSE). The MIT licence covers this project only: CodeWalker, SharpDX, WebView2 and the three models in `models\` keep their own licences (see above), and GTA V's files belong to Rockstar Games.

## Interior registration in exported resources

The rebuilt `MloCreator.exe` registers each generated interior through its `stream/_manifest_*.ymf` only. The exported `fxmanifest.lua` no longer adds a second `DLC_ITYP_REQUEST` for the same interior YTYP. This shared exporter covers scratch buildings, imported buildings and multiple buildings in one resource. Re-exporting replaces an older generated manifest with the corrected version. The placement YMAP also records the number of exterior portals emitted in its YTYP instead of always declaring zero exits.

Close the editor and reopen the updated executable before exporting. Existing exports outside the editor are not changed automatically. After replacing a live map, use a controlled server restart and fully reconnect clients; loading the map in-game remains a separate validation step.

Developer regression: `dotnet run --project source/tests/native-export-mounts -- <path-to-MloCreator.exe> <path-to-lib>` exercises the compiled exporter for single and multiple interiors, including replacing an old manifest and reading the generated native YMAP/YTYP files to check zero, one and two exterior portals. It leaves generated test resources in a reported temporary directory for binary/mount audits. The test needs the .NET 8 SDK; running the editor still uses Windows/.NET Framework 4.8.

## Portal fragments and export limit

Grid cells can split one wide window or door into several portal rectangles. The native exporter joins touching or overlapping rectangles with the same plane, height, direction and flags. It preserves the exact opening coverage: it does not bridge wall gaps, join floors or alter visible geometry/collision. Export logs report the fragment count and resulting opening count.

This exporter uses one interior room plus the outside room for each building. It rejects more than 96 exterior portals **after joining fragments**, because the investigated GTA b3258 crash overflowed a 192-entry internal pair array when 123 portals were enumerated from both ends. This is a guard for this exporter's two-room layout, not a universal limit for all MLO designs. Reduce separate openings or split the project into separate buildings if the guard triggers. All buildings are checked before replacing an existing export, so this rejection preserves the previous output.

The native regression also covers a 123-fragment/41-opening build, unchanged opening coverage and winding, separation across wall gaps/flags/floors, and rejecting an over-limit second building without modifying existing files.

## Exterior visibility and vertex lighting

The rebuilt native exporter places room-0 exterior meshes directly in the YMAP as world entities. They no longer depend on the MLO's door/window portal visibility. Interior meshes, fitted models and doors keep their room attachments, and portals/collision remain in the MLO. The world exterior uses the inverse entity quaternion to preserve the same building heading, with streaming bounds covering its draw distance.

Generated vertex colours now carry GTA lighting values instead of solid white: exterior RGBA is `255, 0, 0, 255`; interior/fitted meshes use `0, 51, 0, 255` for moderate artificial ambient light. This removes the previous maximum artificial illumination on every vertex. Materials, normals, textures and authored lights are retained. This is a baseline lighting correction, not baked ambient occlusion or a complete shading system; day/night appearance still needs in-game review.

Close and reopen the updated `MloCreator.exe` before exporting. Older exports must be re-exported to receive these changes. Back up the previous resource, replace it, perform a controlled server restart and fully reconnect clients. Check each side with every opening off-screen, the corners of the camera view, both floors, doors, collision and day/night lighting. The native regression checks independent exterior placement, inverse quaternion, streaming bounds, remapped room/door attachments and lighting channels in the compiled output.


## Up-and-over garage doors

The **Door** tool in Build from scratch now includes **Up-and-over garage door**. Choose it, set its width, height, depth and head clearance, then click a straight wall. The builder cuts the full opening, creates the exterior portal and checks the open panel against the ceiling. Save/load and undo retain the garage settings, including on upper floors.

The rigid panel rises and tilts back to lie horizontally inside the garage. Leave unobstructed space behind it at least equal to its height, and room above the opening for its head clearance and half its thickness. The default panel is 4 m wide, 2.4 m high with 0.15 m head clearance. Scratch placement initially faces outwards; **Reverse facing** changes the side it tips into. Check facing when placing another door on a different wall. Imported buildings can use the same model from **Models**, or assign a custom GLB the **Garage** type; cut the original wall faces and collision and check the ceiling/space manually. Custom models should contain one rigid panel without stationary frame/track geometry.

Exports containing garages include `garage_config.lua`, `client/garages.lua`, and `server/garages.lua`, and require OneSync. Press **E** near a garage door to open/close it. The server shares its state and checks proximity, routing bucket, optional ACE permission and occupants in the movement area before allowing a toggle. Each client moves a local panel and its collision together; no stationary MLO copy blocks the opening. The occupancy check is conservative and only runs before movement; keep people and vehicles clear throughout travel.

`garage_config.lua` defaults to public operation in bucket 0, a four-second movement and no ACE restriction. Set `ace` to a permission such as `mlo.garage` and grant it in the server configuration to restrict use. State resets closed when the resource restarts. Do not add these generated `gd` models to a second door controller. Ordinary exports without garages do not acquire a controller or OneSync dependency. Re-exporting regenerates the configuration, so preserve any server-specific adjustments separately.

Save projects and close the editor before replacing files. Keep the updated **executable, ui folder and models folder together**; the new runtime templates and `garage_up_and_over.glb` are required. The panel is original project artwork under MIT; `source/tools/generate_garage_model.py` reproduces it. Third-party library models keep their original licences.

Validation covers editor placement, dimensions, ceiling clearance, save/load/undo, browser controls, compiled native model/collision output and Lua controller simulations. The native test uses a test-only JSON adapter for loading GLBs under .NET 8; production still uses the Windows Framework serializer. After exporting and installing, perform a controlled server restart and fully reconnect. Check open/close direction, clearance, collision and driving through from both sides, then test with a second player, late joining and leaving/returning. Native Windows and FiveM acceptance remains required.

Developer checks (from the editor folder):

```sh
node --test source/tests/editor.test.cjs source/tests/grid-models.test.cjs
lua5.4 source/tests/garage-runtime.lua
dotnet run --project source/tests/native-export-mounts -- /absolute/path/MloCreator.exe /absolute/path/lib
# With Playwright installed; MLO_CHROMIUM can select the test browser:
node source/tests/grid-browser-smoke.cjs
```


## Added wall and floor textures

The supplied pack is registered in `ui/js/texture-catalog.js`: 600 wall images and 600 floor images. Save your project and reopen the editor, then open **Paint → Added walls** or **Added floors**. Search by material or colour, select a texture, and click the surface to paint. The palette shows 48 entries per page. These categories work in scratch and imported projects.

Keep the PNG files in `ui/tex` with their original filenames. Their matching DDS files are not used by this browser-based editor. New images are registered without decoding the whole pack at startup; palette pages show previews and full-resolution pixels load when needed for the building. Export waits for the project's selected images and reports missing files instead of exporting placeholder pixels. Only materials used by exported geometry enter the exported texture dictionary.

For updates to this same `smdz_*.png` pack, run `python source/tools/register_textures.py` (or `python3` on Linux). It rebuilds the catalog and mirrors the PNGs into `source/ui/tex` for source packaging. Arbitrary filenames require a corresponding entry in the catalog with a unique stable `id`, `name`, `file`, `cat`, `tile`, `col` and `lazy: true`. `tile` is the repeat size in metres. Keep ids stable after saving a project.

Distribute the updated UI and its texture files together. Existing exports need re-exporting only when you change their materials. Browser validation covers search/paging, painting pixels, save/load, full-resolution export, and missing-image rejection; final day/night appearance remains an in-game check.


## Wooden door model orientation

Tall door models now keep their thin horizontal axis as depth, including when a saved model-setup quarter turn points the broad face along depth. This prevents the old wooden door from appearing edge-on and prevents double leaves being separated along their thickness. Placement heading and reverse facing still determine which wall the door faces; garage and window model setup is unchanged.

Save and close the editor, then reopen the rebuilt `MloCreator.exe` with the matching UI and models. Existing setup rotations are corrected when the library reloads; saved projects are not rewritten automatically. If a door was originally sized while the axes were wrong, check its Width and Depth (width should span the doorway), or replace that door from the reloaded library. Re-export affected maps and verify in FiveM after replacing/restarting the map and reconnecting.

The native regression exercises the actual bundled wooden GLB with identity, both quarter turns and reverse facing, and writes a `wooden-door-library.json` fixture. Set `MLO_WOOD_LIBRARY` to that reported file when running the grid model and browser tests to test real wooden single/double-door geometry, both wall directions, facing, frames, save/load and export. Linux native tests validate geometry; embedded model image decoding and final door appearance still require Windows/FiveM acceptance.

## Furniture and decorations

**Whole new building → Build → Furniture** adds a searchable library of 16 original, simple furnishings: sofa, armchair, dining chair, bench, dining/coffee tables, desk, open bookshelf, cabinet, double bed, bedside table, kitchen counter, rug, book stack, planter and picture frame. Imported buildings have the same **Furniture** tool under **Finish the inside**. These are static map furnishings, not GTA model-name references or interactive furniture scripts.

Choose an item and click on the current floor to place it. Click an existing item, or its entry under **On this floor**, to select it. Use **Move with next click**, numeric X/Y, height above floor, dimensions and rotation to arrange it. **R** rotates 90 degrees, **Shift+D** duplicates then lets you place the copy, **Delete** removes it, and **Esc** clears selection/placement. Placement snaps to 10 cm; hold Shift for free positioning. Use height above floor to place books on tables or hang pictures. Check for overlap with walls, doors and stairs yourself.

Finish and Accent change the two material areas. **Use current floor paint** applies the texture currently selected in the floor paint palette, including your added textures. Solid collision defaults on except for rugs; it follows the individual rotated furniture parts, leaving spaces under tables and between shelves. Disable it for small decorations when appropriate. Tick **Outdoor prop** for furnishings on patios or outside the building, so they use the exterior visibility group.

Furniture saves with each floor/building and supports undo/redo. It is included in the existing mesh, texture and collision export without extra client scripts or portals. Save your projects, close the editor and reopen it with the updated `ui` folder; this addition does not require an executable rebuild. Older editor versions do not render or export these furnishings.

Validation: `node --test props.test.cjs editor.test.cjs grid-models.test.cjs` from `source/tests` checks all furniture geometry, rotated collision, floor/building isolation, save/reload, undo/redo and existing editor regressions. `node props-browser-smoke.cjs` tests placement and editing through the browser with a stub host (same Playwright environment variables as the other browser tests). Windows native export and FiveM visual/collision acceptance remain separate: export a furnished build, install it, restart the map and reconnect, then check indoor/outdoor visibility and collision from both sides and on upper floors.

### Furniture transforms and Crimtopia UI colours

The whole editor now uses charcoal panels, crimson active controls and warm amber focus highlights, based on the existing Crimtopia builder palette. Panels, tabs, typography and layout retain their existing dimensions. Movement axes keep standard red/green/blue colours; material thumbnails and the exported building's materials are unchanged by the UI theme.

In **Furniture**, click a prop to select it, or **Shift-click** props/the floor list to add or remove selections. **Select all furniture** affects only the current floor. Drag an axis arrow for X/Y/Z movement, drag the yellow ring to rotate around the selection's shared centre, or drag an item to slide the selection. Grid snap offers Off, 1/5/10/25/50 cm and 1 m; rotation offers Free, 15°, 45° and 90°. Hold Shift after beginning a drag to bypass snapping. Release commits one undoable move; Esc, right-click, pointer cancellation or changing floors/tools cancels the preview. Saving/exporting during a preview uses the last committed positions.

**Snap to → Floor / furniture tops** places new decorations directly on tables or shelves. **Wall faces** places the selection against the clicked wall while preserving its rotation; rotate it first to align its back with the wall. **Grid only** uses the current floor plane. Surface snapping uses the current floor's furnishings and visible building geometry; it does not check general collisions or guarantee a clear path through walls. Imported geometry must be loaded to snap to its surfaces.

Select several items and name a **Group selection** to keep a furnished set together. Clicking any member selects the whole group. Groups survive save/reload; duplicates receive their own group IDs. **Ungroup selection** restores individual selection. R, Shift+D and Delete act on the selection. The original single-item dimension/material controls remain available when one item is selected. Choose a catalog item to place a new one; after placement the editor returns to selection so it can be dragged immediately.

Additional checks: `node --test proptransforms.test.cjs` verifies group transforms, one-edit undo, preview/export separation, surface snapping, cancellation and imported floor snapshot isolation. `node proptransforms-browser-smoke.cjs` exercises real mouse handles, multi-selection, tabletop placement, saved groups and the theme. Set `MLO_BASE_CSS` to a previous stylesheet to compare panel/tab/viewport rectangles in that test. Reopen the editor with the updated UI; no executable rebuild or live server restart is needed for the editor change. Native Windows interaction and exported-map appearance/collision in FiveM still need user acceptance.

### Clean opening cuts

Face-based doors and windows now clip all original building-model geometry inside their opening volume, in addition to removing the selected faces. This clears backing faces and intersecting wall triangles across materials; triangles crossing the boundary are clipped to preserve the surrounding wall. Legacy face openings with `mesh: false` use this behaviour automatically when reopened. Library windows, doors, frames and garages with openings enabled now send their opening volumes to imported-model cutting too, including upper floors. The placed door/window model itself stays intact.

For a selected face opening, **Cut depth** controls the total depth centred on its selected surface (default 0.8 m, reaching 0.4 m each side). Increase it for thick walls. This is separate from **Depth in the wall**, which positions the door/glass. Library openings use 0.8 m; use a box cutter for greater reach. Cuts are bounded volumes, not unlimited deletion through the building. Separate detail-model files and manually added fill patches retain their existing cleanup workflow. Removing an opening restores its volume cut; unrelated manual deletions remain.

Preview, collision and export share these cutters. Save and reopen the editor; no executable rebuild is required. Automated tests cover legacy compatibility, preview payloads, undo, fitted openings on rotated upper floors and collision-only custom boxes. Native Windows cutting/export and FiveM visual/collision checks remain pending.

### Half/quarter walls and room furnishings

In **Whole new building → Wall**, choose **Full**, **Half** or **Quarter**, then draw. Drawing over a solid wall changes its height while retaining its materials. Walls containing doors or fitted openings stay full height; return a low wall to Full before adding an opening. The Room tool creates new walls at full height. Low boundary walls do not count as enclosing a room.

In **Imported building → Partition**, choose the same heights before drawing. Select an existing partition to change its Wall height. This changes generated partitions, not the original GTA exterior mesh. Low partitions have capped tops, matching collision and picking bounds; openings are clipped to their height. Full-height room boundaries retain their existing behaviour. Automatic wall-to-upper-floor linking is a separate feature, not included here.

Height is stored per wall/partition as `heightRatio` (1, 0.5 or 0.25; absent/invalid values mean full). Scratch walls use the clear storey height (storey height minus slab), and imported partitions use that floor's ceiling height. This is saved geometry and collision in preview/export, distinct from the existing view-only Half/Down cutaway. Save/load, undo and copied floors preserve it.

Both Furniture pickers now offer **36 original static furnishings**, including tall/long bar tables, stools, bar counters, display shelves, booth seating, wardrobes, drawers, single beds, kitchen islands, refrigerators, TV cabinets, decorative TVs, office chairs, filing cabinets, reception counters, workbenches, crates and floating shelves. Search by name/category; existing finish/accent paint, sizing, rotation, snapping, groups and collision controls work on the additions. These are simple built-in meshes, not interactive appliances or playable screens.

Validation: automated geometry/collision/export and save/undo tests, plus real browser drags for Half/Quarter walls in both modes, saved partition-height changes and bar-table placement. Save your project and reopen the standalone editor. Windows native export and FiveM collision/appearance still need user acceptance.

### Detailed furniture and editable text signs

Furniture now uses bevelled edges, round supports and a pedestal bar table, with new woven fabric, leather, furniture-grain wood, matte metal and enamel finishes. New placements use the recommended finishes; saved custom paint is preserved. Select older furniture and press **Use recommended furniture finishes** to update its materials. **Detailed edges and round supports** can be turned off per item to use simpler box geometry. Collision remains conservative per-part boxes, so there are still clear gaps under tables and between shelves. These are improved original procedural meshes, not a library of Rockstar props or PBR assets.

In either mode, choose **Furniture → Add text sign**, click to place, then edit **Sign lettering**. Supports up to 240 characters / 6 lines, seven font styles, text/background colours, bold, border, alignment, text size and optional lettering on both sides. Width/height set the board size; the usual position, rotation, snap, duplicate, grouping and outdoor controls apply. The front faces local +Y; rotate the sign or enable both sides as needed.

Fonts use installed system fonts with declared fallbacks. Signs render at 512×512 with aspect-correct text and save their editable settings with each floor. Preview and export use identical raster pixels; the lettering is included in the resource texture dictionary, with no server font dependency or runtime browser needed. Opening the editable project on another computer may use a fallback font; already exported texture pixels are fixed. Signs are opaque, non-emissive boards. Native Windows export and FiveM appearance/collision still require user acceptance.

Validation: `furniture-materials.test.cjs` checks opaque varied material pixels; furniture tests check closed outward detailed geometry, collision stability and saved custom paint; `signs-browser-smoke.cjs` tests actual sign UI/font changes, save/reload, both editor modes, multi-floor isolation and exact preview/export pixel equality. Save projects and reopen the editor to load the updated UI.

## Texture seam and colour finishing

Library photographs (including Added walls/floors) now receive non-destructive
edge balancing on load. Opposite borders are matched with a smooth correction
within the outer 16% of each edge. Moderate luminance contrast gives grain and
stone more definition; wood saturation is slightly reduced to limit orange
casts, other colours receive a small boost, and bright highlights roll off.
Checker photographs with baked shading bands are rebuilt as a consistent ceramic
checker pattern using the original image’s two colour families.
Palette swatches, viewport materials and exported textures use the same finished
pixels at the original resolution. Source PNG/DDS files, texture IDs and repeat
sizes are unchanged. Personal imports under Mine and generated signs are not
processed. A catalogue entry can set `finish: false` to retain its original pixels.

Procedural carpet/tile/roof noise uses integral repeat periods, shuffled stone
rows wrap consistently, and plank grain now follows directional fibres rather
than blotchy noise. Both builder modes share these changes.

Save and reopen the standalone editor, then re-export existing projects to apply
the new pixels to FiveM. Existing map resources are not edited automatically.
Edge balancing repairs colour seams; it cannot reconstruct mismatched plank or
brick layouts in a source photograph or remove every repeated landmark. This is
an albedo improvement, not normal/specular maps or baked lighting. Check the
re-export in daylight and at night before accepting its final GTA appearance.

## Faster painting

In the scratch builder's Paint tab, **Drag to paint an area** is on by default
for floors, ceilings and roofs. Hold the left mouse button, drag a rectangle,
and release to apply the selected texture. The highlighted squares show the
selection. **Whole room at once** still fills a bounded room, and **Paint entire
floor/ceiling/roof on this level** repaints the selected surface on the current
level, including existing paint. Other levels and missing floor/roof squares are
preserved. Disable area mode for individual clicks.

Area painting rebuilds and saves once on release, with one undo step for the
whole action. Escape, right-click, pointer cancellation or losing focus cancels
an unfinished rectangle. Ctrl+Z undoes a completed rectangle or bulk fill.

The imported/vanilla builder keeps its existing floor rectangle tool; opening
Paint with Floors selected now activates that tool correctly. New **Paint all
interior walls/floor/ceiling on this storey** buttons repaint the generated
interior on the active storey. Floor fills replace previous rectangular paint;
wall fills replace wall-face and partition-side paint. Other storeys retain
their finishes. Original GTA drawable faces are not retextured by these buttons.

Save and reopen the editor after updating. Paint is saved using the existing
project fields and follows the ordinary export path; already deployed maps need
re-exporting to show the changes. Browser checks cover drag/release, cancellation,
undo/redo, holes, level isolation, storey fills, persistence and export materials.
Native Windows export and in-game appearance remain manual acceptance checks.

## Paint one wall face without crossing into another room

**Whole flat face (stop at rooms)** is enabled by default for wall painting in
both builders. One click paints the connected flat side, rather than one scratch
grid segment. Corners and gaps stop the selection; scratch height changes also
stop it. Perpendicular room dividers split the painted side at their junction.
A divider reaching only one side of a shared wall does not split the other side.
Hover highlights the affected span. Opposite wall sides remain independent.

Imported/generated partitions can join adjacent coplanar pieces of matching
height. Room-bounded paint is stored as ranges in `shell.paint` (orientation,
line, inward side, optional partition `part` id, `u0`, `u1`, texture). Rendering
splits only visual faces at those ranges; openings and collision are unchanged.
Older midpoint-only boundary paint now renders correctly as well. Existing
partition `texA`/`texB` remain the base finish beneath these ranges. Whole-storey
wall fills clear the ranges and replace both partition-side finishes.

Room boundaries are evaluated when painting. Use real walls/partitions to divide
rooms; overlapping room rectangles without a dividing wall form one continuous
space. Saved paint ranges do not move automatically if a partition is moved.
This applies to the generated interior, not original GTA drawable textures.
Use this updated editor for preview/export of projects with ranged wall paint.

## Adjustable scratch archways

Choose Archway (6), set Width, Height and Sideways offset in metres, then click a solid full-height wall. Click an existing archway to select it; change the fields and press **Apply to selected archway**. **Remove selected archway** closes the entire opening. Each placement/resize/removal supports undo.

Widths can span multiple straight wall cells (0.2–12 m); height must fit below the ceiling. Wall ends, perpendicular room dividers, half/quarter walls and other openings block invalid cuts. Offset must keep the original anchor square inside the opening. Legacy one-metre archways remain supported and can be selected and resized. These remain rectangular open passages, not curved arches. Dimensions persist with the project and drive preview, collision and export. Save and reopen the updated editor and re-export maps; native Windows/FiveM appearance requires a manual check.
