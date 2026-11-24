# Connected Core — Mission 002

The canonical engineering application remains in `engine/`. Crowd Surf at the repository root is independent and must remain unchanged.

## Contracts

- `universe-core.mjs` owns typed parameter definitions, deterministic formulas, the directed dependency graph, constraints, object identities and immutable revision snapshots.
- `persistence.mjs` owns schema migration and browser storage. Stored JSON is untrusted and is validated before use.
- `app.mjs` owns draft interaction and DOM rendering. Invalid drafts never replace validated state or create revisions.
- `world.mjs` owns visualization only. Three.js geometry is not engineering geometry or fabrication output.

The only verified fridge values are the SC52 exterior dimensions, 435 × 475 × 500 mm. Shelf and cup inputs are illustrative until measurement evidence is attached. The material result is explicitly the mass estimate of a solid rectangular plate, not a perforated support tray.

## Formula and units

For density in g/cm³ and volume in mm³:

`massKg = volumeMm3 × densityGPerCm3 × 10⁻⁶`

The default solid plate is 315 × 315 × 2 mm: 198,450 mm³ × 1.24 × 10⁻⁶ = 0.246078 kg. A `10⁻⁹` multiplier would contradict that expected result by a factor of 1,000.

## Reproducible dependency strategy

The browser currently imports the pinned visualization dependency `three@0.170.0` from jsDelivr. Deterministic engineering and persistence modules have no third-party dependencies and run directly with Node's test runner.

Before production deployment, vendor or bundle the exact Three.js version with integrity captured by a lockfile and serve it from the same deployment. The migration should preserve the public `mountWorld(host, onSelect)` interface so engineering modules and UI behavior remain unchanged.

## Validation

Run:

```sh
node --test engine/*.test.mjs
python3 -m http.server 4173 --bind 0.0.0.0
```

Then verify `/engine/` in desktop and mobile viewports. Confirm invalid drafts disable saving, the last valid result remains visible, revisions compare and rollback by creating a new child revision, and the 2D region navigation remains available if WebGL fails.
