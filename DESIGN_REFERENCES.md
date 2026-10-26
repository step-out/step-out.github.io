# 3D portfolio direction

The initial interactive requirement is a game-like, genuinely spatial homepage, with the introduction and research/paper/experience index available immediately. The former 2D landscape did not meet that visual target.

## References reviewed

| Portfolio | What informs this design |
| --- | --- |
| [Juan Antonio](https://antonio-hr.xyz/) | A coherent material palette, a composed 3D space and layered lighting. His current loading sequence is not adopted. |
| [Jesse Zhou](https://jesse-zhou.com/) | Physical signposts connect the world to its contents; lighting, props and interaction form one scene. The introductory START gate is not adopted. |
| [Henry Heffernan](https://henryheffernan.com/) | The [official camera implementation](https://github.com/henryjeff/portfolio-website/blob/master/src/Application/Camera/Camera.ts) defines continuous changes of viewpoint and focus between the environment and readable content. |
| [David Heckhoff](https://david-hckh.com/) | The [official animation source](https://github.com/davidhckh/portfolio-2025/blob/main/src/three/objects/avatar/animations.ts) connects rigged character states to scene transitions. Our implementation uses a separately licensed CC0 robot with bone animation and action crossfades. |

These sites are references for composition and interaction. Their models and site code are not bundled or copied. David's live models did not finish loading in this research session; observations about his animation architecture came from his official source.

## Implementation

`world-scene.js` replaces the 2D canvas renderer with Three.js: a perspective camera, a 3D path through seven research locations, actual glTF foliage, cast/received shadows, animated water and camera orbit. A navigation selection displays HTML content immediately while the guide and camera travel. The scene can also be explored by dragging or selecting a landmark.

The second 3D iteration replaces the sprite with RobotExpressive, reworks each landmark as rounded garden architecture, brings the camera into the scene and removes the visible display-plinth edge. Navigation takes the shortest arc; the character turns, walks or runs through authored clips and blends back into idle/wave on arrival. Dynamic shadows and an environment map support a coherent blue-and-ivory material palette. Sparse foliage is color graded to match.

The existing research content and FlagCounter identifier and URLs are preserved. Rendering is optional: the HTML profile and publications remain accessible if WebGL or asset loading fails.

The art sources and licenses are recorded in [assets/world/SOURCES.md](assets/world/SOURCES.md).

On phones the About page places a full-width live 3D view immediately below the complete biography, using a dedicated camera. The persistent bottom index replaces the duplicate top section navigation. Reading pages use a compact live scene so paper titles and resource links remain above the fold on 320px-wide screens.

## Environmental and interaction refinements

The following first-party references were rechecked for the day/night, audio and object-feedback pass:

- [Juan Antonio](https://antonio-hr.xyz/): the deployed page exposes a separate interface-sound mute control. This supports keeping effects optional and distinct from visual motion.
- [Jesse Zhou's sound manager](https://github.com/enderh3art/Ramen-Shop/blob/main/src/Experience/Sounds.js) and [raycast interaction code](https://github.com/enderh3art/Ramen-Shop/blob/main/src/Experience/RayCaster.js): different scene actions receive distinct short cues. The idea of a small coherent feedback vocabulary is used here; no audio files or source code are copied.
- [Henry Heffernan](https://henryheffernan.com/): the deployed first-party audio manager provides a master mute and per-cue volume/filter settings. Our sound layer uses independent Web Audio synthesis, with subdued volumes and no background soundtrack.

Day/night is an original treatment for this garden: automatic mode follows the visitor's local hour (day 07:00–18:59), with persistent manual Day/Night overrides. The page palette, scene fog, key/fill light, lake and practical path lamps change together. User controls remain usable without WebGL.

Landmark hover feedback belongs to the object itself: separate per-landmark materials brighten, a thin outline appears around its paving and it grows by 2.5%. Honors uses a gold accent. Leaving restores the original materials, and reduced-motion mode updates immediately. The source vertex geometry and click targets are retained.

Sound is silent by default. Opting in enables synthesized hover, navigation, arrival, footstep and character-action cues. A remembered preference waits for a fresh user gesture on a new visit. Hidden tabs suspend audio, mute stops all scheduled voices, and unsupported browsers keep all research content available.

The visitor counter is the original single DOM element and URL, shown only in About. It is never cloned or recreated by navigation.
