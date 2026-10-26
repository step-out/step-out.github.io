# Artwork and software used by this prototype

## Current 3D guide — RobotExpressive

The animated robot is by **Quaternius / Tomás Laulhé**, with GLB conversion and expression morph targets by **Don McCurdy**, under **CC0 1.0**. The original 14 animation clips and geometry are retained. Runtime materials, animation blending and navigation were adapted for this site. Provenance: [`assets/world/character/SOURCES.md`](assets/world/character/SOURCES.md).

## Previous guide — YunYueSama (retained files, not loaded)

- Repository: https://github.com/YunYueSama/codex-deepseek-pet
- Source commit: `7661c8b304c5400701f91da01b1a643a207331de`
- The guide is an **unofficial DeepSeek fan character**. This site is not affiliated with or endorsed by DeepSeek or the asset author.
- The author's contributions are used under **大肥鱼项目署名许可 1.0**, a custom attribution license; this is not MIT. The complete license and upstream asset notice are preserved in `assets/guide/deepseek/`. The additional activity atlas contains 87 continuous frames for thinking, eating, celebrating and jumping.
- Local changes: selected original animation frames, downsampled and aligned to 256-pixel cells, repacked as WebP, and integrated with this site's journey playback. These changes are not presented as the original author's work.
- Detailed sources and packaging notes: `assets/guide/deepseek/SOURCES.md`.
- The original asset notice remains with these archived files. They are no longer used by the current renderer.

## Landscape and journey

The current interactive scene uses **Three.js 0.180.0** under MIT (`vendor/three/LICENSE`), **Quaternius Ultimate Stylized Nature** and **Kenney Nature Kit 2.1** under CC0. The local model files, modifications and official sources are documented in [`assets/world/SOURCES.md`](assets/world/SOURCES.md). Terrain, research landmarks and camera routes are original site code. The previous Canvas 2D scene is retained as source but is no longer loaded by `index.html`.

The trees, shrubs, daisies and cloud are adapted from **Glitch**, by **Tiny Speck**, published under **CC0 1.0** in the [Groddle collection](https://opengameart.org/content/glitch-groddle-assets-png). Vegetation was color graded and transparent PNGs encoded as WebP. File provenance and modifications are recorded in `assets/guide/landscape/SOURCES.md`.

The earlier Canvas 2D sky, lake, path, wayfinding signs and interactions are original site code, retained in `guide-scene.js` as a local reference. The current page loads the 3D renderer. No car model or driving textures are used.
