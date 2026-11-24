# Mission 003 visual QA report

Captured locally on 2026-11-24 with Chromium headless and SwiftShader. These measurements describe the software renderer, not a discrete GPU.

## Actual captures

- [World Explorer](visual-qa/world-explorer.png)
- [Product Lab](visual-qa/product-lab.png)
- [Engineering Studio](visual-qa/engineering-studio.png)
- [Product Lab mobile](visual-qa/product-lab-mobile.png)

Reference targets are in [the official references directory](../ONDA-Universe-References/references/README.md). No visual-parity claim is made.

## Measured low-profile run

| Measurement | Result |
|---|---:|
| Window | 2167.4 ms |
| Frames observed | 9 |
| SwiftShader rate | 4.2 fps |
| Resource entries | 13 |
| Transfer bytes reported | 80,734 |
| Decoded resource bytes | 77,434 |
| JavaScript heap | 14,021,140 bytes |
| Horizontal overflow | None at 1440 × 900 or 390 × 844 |

The low SwiftShader rate is a confirmed limitation. Adaptive quality, capped pixel ratio, low-profile shadow removal and disposal are implemented, but hardware-GPU profiling remains required.

## Comparison

- Central 3D viewports and contextual editors are closer to the references; cinematic interiors remain absent.
- Product and refrigerator exceed the primitive baseline but still lack authored production assets.
- Shared PBR materials and ACES lighting are present; HDRI reflections and texture maps are absent.
- Selection, orbit, zoom, exploded views, quality controls and shared-data actions work.
- The baseline is reproducible at commit `440d0e2`; no false same-run “before” screenshot was created after modification.

## Sources and licenses

- Three.js `0.170.0`: MIT, pinned jsDelivr URL.
- Owner reference images: requirements only, never used as application backgrounds.
- New geometry/materials: procedural source authored in this repository.
- No external texture, HDRI, model or replacement-logo assets were introduced.
