# Character assets

The blue-haired whale girl is an **unofficial DeepSeek fan character**, created by **YunYueSama**. This website is not affiliated with or endorsed by DeepSeek or the asset author.

- Author: YunYueSama
- Repository: https://github.com/YunYueSama/codex-deepseek-pet
- Source commit: `7661c8b304c5400701f91da01b1a643a207331de`
- Upstream license: [大肥鱼项目署名许可 1.0](LICENSE), a custom attribution license, not MIT.
- Upstream asset notice: [preserved text](UPSTREAM_ASSET_LICENSE.md); [original with working relative links](https://github.com/YunYueSama/codex-deepseek-pet/blob/7661c8b304c5400701f91da01b1a643a207331de/ASSET_LICENSE.md).

The upstream license permits the author's contributions to be used, modified, displayed and redistributed with attribution and this complete license. It does not grant additional rights to underlying third-party references, trademarks or character designs. We use the generated animation atlases, not the repository's community reference illustrations.

## Source files and modifications

The local sprite sheet was adapted for this homepage: source frames were selected, downsampled to 256 × 256 pixels, aligned with a fixed horizontal offset per animation, and repacked as transparent WebP. These packaging modifications were made for this homepage and are not attributed to the original author.

| Upstream atlas | Selected frames | Local indices |
| --- | --- | --- |
| `assets/whale/idle-front.png` | 0, 1 | 0, 1 |
| `assets/whale/inbetween-walk.png` | 0, 1, 3, 2, 4, 5, 6, 7, 8, 9, 11, 10, 12, 13, 14, 15 | 8–23 |
| `assets/whale/dense-wave.png` | Odd frames 1–31 | 24–39 |
| `assets/whale/motion-turn.png` | 0–7 | 40–47 |

The walking order and wave timings follow the upstream `src/renderer/motion.js`. See [sprite.json](sprite.json) for playback metadata. Empty indices 2–7 are padding, not animation frames.

## Additional continuous activities

`activities.webp` contains 87 selected frames (256 × 256 cells; 8 columns), using the same author and source commit above. It is 1,212,844 bytes. The source playback order and durations come directly from `src/renderer/motion.js`; source file names, Git blob hashes, SHA-256 hashes, frame order, durations, stages, and fixed alignment offsets are recorded in [activities.json](activities.json).

| Local action | Upstream atlas | Frames | Duration | Visible action |
| --- | --- | ---: | ---: | --- |
| `thinking` | `assets/whale/story-token.png` | 32 | 2,580 ms | Playing with a small token, thinking, and recovering |
| `eat` | `assets/whale/dense-eat.png` | 16 | 1,595 ms | Reaching for food, lifting it, eating, and lowering the hands |
| `celebrate` | `assets/whale/dense-dance.png` | 16 | 1,420 ms | Arm and body sway, turning, and recovering |
| `jump` | `assets/whale/inbetween-jump.png` | 23 | 1,195 ms | Crouching, airborne poses, landing, and recovering |

The original atlases were downsampled and repacked with fixed offsets per animation to match the existing sprite's size and foot baseline. These packaging modifications are by this homepage. No third-party reference images are included. Every activity contains a sequence of distinct character drawings; none is a static image translated across the page. The jump drawings are baseline-aligned, so the renderer adds a vertical arc during the recorded `airborne` stage (240–720 ms). The existing full [license](LICENSE) and [asset notice](UPSTREAM_ASSET_LICENSE.md) apply to this additional sheet as well.

## Other sources reviewed, not bundled

- [vlln/whale-girl](https://github.com/vlln/whale-girl): an MIT-licensed project with 15 animated states, including working, eating, playing, and celebrating. Its README credits the underlying Whale Girl sticker character to [ZipZipPipe](https://space.bilibili.com/4168597); that credit is distinct from the repository's code license. The lower-resolution, differently proportioned animation style was reviewed but is not mixed into this site's guide.
- [keleus/deepseek-pet](https://github.com/keleus/deepseek-pet): MIT-licensed project by keleus, with polished expression and desk-work images. Its own README describes complete-image changes with breathing, tilt, and parallax effects. These are useful visual references, but do not supply the continuous walking and whole-body action drawings needed here. No images from this repository are bundled.
