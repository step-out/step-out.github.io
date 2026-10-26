# RobotExpressive guide

- Original model: **Tomás Laulhé (Quaternius)** — https://quaternius.com/packs/animatedrobot.html
- GLB adaptation and expression morph targets: **Don McCurdy**.
- Model-specific license: **CC0 1.0**, verified in the original author's page and [Three.js model README](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/RobotExpressive/README.md).
- Downloaded 2026-10-26 from https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb
- SHA-256: `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`
- Original model: 463,988 bytes, 3,237 triangles, two skins and 14 animation clips. The original license notice is preserved in `UPSTREAM-LICENSE.md`.

Local runtime adaptations: blue/ivory/navy materials, world scale, animation crossfades and world-space navigation. The mesh, skin, bone tracks and expression shapes are unchanged. Walking and running clips are in place; the site's path controller moves and turns the character. It is a real articulated 3D model, not a billboard.

Used clips include Idle, Walking, Running, Wave, Jump, Dance, Yes and ThumbsUp. Unused source clips remain in the original GLB.

## Bottom navigation robot

`route-robot.webp` is a transparent 128 px sprite atlas rendered locally from the
same rigged model and site materials. It contains 24 frames each of Running,
Idle and Wave, using a fixed orthographic camera and a translucent ground
shadow. Animation timings and atlas coordinates are in `route-robot.json`.
The character faces right; the navigation renderer mirrors the frames when
travelling left. The original model's CC0 license applies to this derivative.

## Loading robot

`loading-robot.webp` is the 128 × 128 transparent frame 58 from
`route-robot.webp` (Wave clip, frame 10). It preserves the original canvas,
foot anchor and translucent shadow, and uses lossless WebP encoding. This
small standalone image lets the loading screen show the same robot before
the 3D scene or complete navigation atlas is ready. The same CC0 license
applies.
