// Bitmap work that the Windows build did with System.Drawing (which is not usable on Linux):
//  - decoding the pictures inside .glb files and scaling them to the square power-of-two the game wants
//  - the small PNG the house fitter writes to cache\last_grab.png for debugging
// Decoding is done by StbImageSharp (public domain, pure C#), scaling and the PNG writer are here.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using StbImageSharp;

namespace MloCreator
{
    public static class Img
    {
        public const int MaxTex = 1024;

        // nearest power of two for a texture, 4..1024, preferring the closer one
        public static int Pot(int v)
        {
            int p = 4; while (p < v) p <<= 1;
            if (p > 4 && (v - (p >> 1)) < (p - v)) p >>= 1;
            return Math.Min(p, MaxTex);
        }

        // Decodes a PNG/JPEG/... picture and returns a square RGBA buffer of side `side` (may be null when the data is not an image).
        public static byte[] DecodeToSquare(byte[] data, out int side, out bool hasAlpha)
        {
            side = 0; hasAlpha = false;
            ImageResult img;
            try { img = ImageResult.FromMemory(data, ColorComponents.RedGreenBlueAlpha); }
            catch (Exception) { return null; }
            if (img == null || img.Data == null || img.Width <= 0 || img.Height <= 0) return null;
            side = Pot(Math.Max(img.Width, img.Height));
            byte[] rgba = Scale(img.Data, img.Width, img.Height, side, side);
            for (int i = 3; i < rgba.Length; i += 4) if (rgba[i] < 250) { hasAlpha = true; break; }
            return rgba;
        }

        // Bilinear scaling when growing, a box filter when shrinking; edges clamp. Input and output are RGBA.
        public static byte[] Scale(byte[] src, int sw, int sh, int dw, int dh)
        {
            byte[] dst = new byte[dw * dh * 4];
            if (sw == dw && sh == dh) { Buffer.BlockCopy(src, 0, dst, 0, dst.Length); return dst; }
            double fx = (double)sw / dw, fy = (double)sh / dh;
            if (fx >= 1.5 || fy >= 1.5)
            {
                // box filter: average every source pixel that falls in the destination pixel's footprint
                for (int y = 0; y < dh; y++)
                {
                    int y0 = (int)Math.Floor(y * fy), y1 = Math.Max(y0 + 1, (int)Math.Ceiling((y + 1) * fy)); if (y1 > sh) y1 = sh;
                    for (int x = 0; x < dw; x++)
                    {
                        int x0 = (int)Math.Floor(x * fx), x1 = Math.Max(x0 + 1, (int)Math.Ceiling((x + 1) * fx)); if (x1 > sw) x1 = sw;
                        long r = 0, g = 0, b = 0, a = 0; int n = 0;
                        for (int sy = y0; sy < y1; sy++)
                            for (int sx = x0; sx < x1; sx++)
                            {
                                int o = (sy * sw + sx) * 4; r += src[o]; g += src[o + 1]; b += src[o + 2]; a += src[o + 3]; n++;
                            }
                        int d = (y * dw + x) * 4;
                        dst[d] = (byte)(r / n); dst[d + 1] = (byte)(g / n); dst[d + 2] = (byte)(b / n); dst[d + 3] = (byte)(a / n);
                    }
                }
                return dst;
            }
            for (int y = 0; y < dh; y++)
            {
                double sy = (y + 0.5) * fy - 0.5; if (sy < 0) sy = 0; if (sy > sh - 1) sy = sh - 1;
                int y0 = (int)sy, y1 = Math.Min(sh - 1, y0 + 1); double ty = sy - y0;
                for (int x = 0; x < dw; x++)
                {
                    double sx = (x + 0.5) * fx - 0.5; if (sx < 0) sx = 0; if (sx > sw - 1) sx = sw - 1;
                    int x0 = (int)sx, x1 = Math.Min(sw - 1, x0 + 1); double tx = sx - x0;
                    for (int c = 0; c < 4; c++)
                    {
                        double v00 = src[(y0 * sw + x0) * 4 + c], v10 = src[(y0 * sw + x1) * 4 + c], v01 = src[(y1 * sw + x0) * 4 + c], v11 = src[(y1 * sw + x1) * 4 + c];
                        double v = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
                        dst[(y * dw + x) * 4 + c] = (byte)Math.Max(0, Math.Min(255, Math.Round(v)));
                    }
                }
            }
            return dst;
        }
    }

    // A small RGBA canvas for the debug picture of the house fitter (the Windows build drew it with GDI+).
    public sealed class Canvas
    {
        public readonly int W, H; readonly byte[] px;
        public Canvas(int w, int h, byte r, byte g, byte b) { W = w; H = h; px = new byte[w * h * 4]; for (int i = 0; i < w * h; i++) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255; } }
        public void Set(int x, int y, byte r, byte g, byte b) { if (x < 0 || y < 0 || x >= W || y >= H) return; int o = (y * W + x) * 4; px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255; }
        public void Dot(int x, int y, int rad, byte r, byte g, byte b)
        {
            for (int dy = -rad; dy <= rad; dy++) for (int dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad) Set(x + dx, y + dy, r, g, b);
        }
        public void Line(double x0, double y0, double x1, double y1, int thick, byte r, byte g, byte b)
        {
            double dx = x1 - x0, dy = y1 - y0; int steps = (int)Math.Ceiling(Math.Max(Math.Abs(dx), Math.Abs(dy)));
            if (steps <= 0) { Dot((int)Math.Round(x0), (int)Math.Round(y0), Math.Max(0, thick / 2), r, g, b); return; }
            for (int i = 0; i <= steps; i++) { double t = (double)i / steps; Dot((int)Math.Round(x0 + dx * t), (int)Math.Round(y0 + dy * t), Math.Max(0, thick / 2), r, g, b); }
        }
        public void Save(string path) { Png.Write(path, W, H, px); }
    }

    // Minimal PNG writer (8-bit RGBA, filter 0, zlib). Enough for the one debug image the program writes.
    public static class Png
    {
        static readonly uint[] Crc = MakeCrc();
        static uint[] MakeCrc()
        {
            uint[] t = new uint[256];
            for (uint n = 0; n < 256; n++)
            {
                uint c = n;
                for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
                t[n] = c;
            }
            return t;
        }
        static uint Crc32(byte[] b, int off, int len)
        {
            uint c = 0xFFFFFFFFu;
            for (int i = 0; i < len; i++) c = Crc[(c ^ b[off + i]) & 255] ^ (c >> 8);
            return c ^ 0xFFFFFFFFu;
        }
        static void Chunk(Stream s, string type, byte[] data)
        {
            byte[] t = Encoding.ASCII.GetBytes(type);
            byte[] len = BitConverter.GetBytes(data.Length); Array.Reverse(len); s.Write(len, 0, 4);
            s.Write(t, 0, 4); s.Write(data, 0, data.Length);
            byte[] crcbuf = new byte[4 + data.Length]; Buffer.BlockCopy(t, 0, crcbuf, 0, 4); Buffer.BlockCopy(data, 0, crcbuf, 4, data.Length);
            byte[] crc = BitConverter.GetBytes(Crc32(crcbuf, 0, crcbuf.Length)); Array.Reverse(crc); s.Write(crc, 0, 4);
        }
        public static void Write(string path, int w, int h, byte[] rgba)
        {
            byte[] raw = new byte[(w * 4 + 1) * h];
            for (int y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.BlockCopy(rgba, y * w * 4, raw, y * (w * 4 + 1) + 1, w * 4); }
            byte[] idat;
            using (MemoryStream ms = new MemoryStream())
            {
                using (ZLibStream z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(raw, 0, raw.Length);
                idat = ms.ToArray();
            }
            using (FileStream f = File.Create(path))
            {
                f.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, 0, 8);
                byte[] ihdr = new byte[13];
                byte[] bw = BitConverter.GetBytes(w); Array.Reverse(bw); Buffer.BlockCopy(bw, 0, ihdr, 0, 4);
                byte[] bh = BitConverter.GetBytes(h); Array.Reverse(bh); Buffer.BlockCopy(bh, 0, ihdr, 4, 4);
                ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
                Chunk(f, "IHDR", ihdr); Chunk(f, "IDAT", idat); Chunk(f, "IEND", new byte[0]);
            }
        }
    }
}
