# 3D scene assets

## Quaternius — Ultimate Stylized Nature

- Official source: https://quaternius.com/packs/ultimatestylizednature.html
- License: CC0 1.0 Universal. Preserved notice: `nature/QUATERNIUS-LICENSE.txt`.
- Used models: BirchTree_1, BirchTree_3, Bush_Large, Bush_Flowers.
- Web adaptations: original glTF geometry retained; textures resized to 512 pixels, buffers and textures packed into independent GLB files; foliage uses alpha mask at 0.42; leaf pixels color graded to a subdued blue-green palette and roughness adjusted for the scene.

## Kenney — Nature Kit 2.1

- Official source: https://kenney.nl/assets/nature-kit
- License: CC0 1.0 Universal. Original license: `nature/LICENSE.txt`.
- Used models: rock_largeA, rock_largeB, plant_bushSmall. The previously used bridge is no longer loaded.
- Models copied from the official GLTF distribution; runtime scale and placement adapted.

## Runtime and original artwork

- Three.js 0.180.0, MIT. License in `vendor/three/LICENSE`. Core, GLTFLoader, BufferGeometryUtils and RoomEnvironment are local, version-pinned copies of the official npm distribution.
- Terrain, path, rounded garden architecture, lighting, camera routes and water animation are original site code.
- The current guide is the **rigged 3D RobotExpressive** by Quaternius, adapted by Don McCurdy, under CC0. Provenance and modifications: [character/SOURCES.md](character/SOURCES.md). The previous DeepSeek sprite is no longer requested or rendered by the page.
- All runtime models and code are local. Reference portfolio code and art have not been copied.
