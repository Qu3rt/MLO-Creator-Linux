# lib

`CodeWalker.Core.dll`, `SharpDX.dll` and `SharpDX.Mathematics.dll` taken from the modified Windows build
(`other-sources/MLO-Creator-main1/lib`). They are the exact libraries the Windows application uses.

**Do not replace them with the NuGet `CodeWalker.Core` package.** The NuGet 1.0.3 build writes `.ybn`
collision resources with a different material/vertex order and, for the same project, produced 1,108
collision triangles that did not match the Windows export. The game then built an incomplete bounds BVH:
walls had invisible holes and furniture collision did not work. With these DLLs the exported collision
and visual triangle sets match the Windows application.

The assemblies target `netstandard2.0` and run on Linux. They keep CodeWalker's own terms; see
`../THIRD-PARTY-NOTICES.md` and the CodeWalker repository before redistributing them.
