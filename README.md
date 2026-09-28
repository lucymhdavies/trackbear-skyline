# Writing Skyline

Static browser prototype. Import a TrackBear progress export ZIP or JSON, choose a project/year/cutoff and square-root or raw heights, and download an STL. Monday–Sunday weeks. The preview parses the exact exported STL bytes.

Import and geometry generation run locally in a Web Worker. No export is uploaded or persisted. The initial dataset is synthetic.

Run `npm ci`, `npm run dev`. Validate with `npm test`; build with `npm run build`. Deploy the `dist` directory as static assets. No backend or environment variables required.

STL coordinates are millimetres. Models contain intersecting closed solids; inspect and repair/union in a slicer if required before printing. Browser preview is not a printability guarantee.

Inspired by github/gh-skyline. Uses Three.js, fflate, Mona Sans and the bundled Helvetiker font; font licences are included in public/.

## Netlify

Connect this repository with the repository root as the base directory. `netlify.toml` runs `npm run build` and publishes only `dist/`. The build output contains the page, browser bundles, fonts, font licences and export-guide screenshots. Repository configuration, tests, dependencies and local exports are not published. Everything placed in `public/` is copied into the website, so keep that directory limited to intentional public assets.
