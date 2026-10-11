# Reimagine Education Academy: the Grand Hall

An interactive Three.js site for **Reimagine Education Academy** (a proposed tuition-free K–8 public
charter school in Mobile, AL), built to drop into **Webflow**.

The duck mascot's paint-swipe intro gives way to a cinematic **Grand Hall** at golden hour: neon
arches, a reflective terrazzo floor, ribbons across a glass vault, and a giant round window looking
out at the sunset over the bay. As you scroll, the camera glides from stop to stop and the 3D duck
hops along to meet you:

- **Learning bays** for the five design elements (STREAM+H, Careers, SEL, Advocacy, House System)
- **The House System**, inspired by RCA: four House archways in Aqua, Yellow, Orange and Black,
  plus a spinnable **House Wheel** on its own stage
- **The Road to Fall 2028**: enrollment light-pillars that rise as you arrive
- **Town Hall**: community co-design numbers and what families said
- **Graduation steps** leading up to the window

Copy comes from the *REI/REA Website Narrative and Content Guide* and keeps its guardrails (proposed /
planned / subject to authorization; the interest-form disclaimer sits next to the submit button).
House names are **working proposals** for students and families to finalize.

## Run it locally

```bash
npm install
npm run build      # bundles src/ → dist/, and writes public/ for deploying
npm run serve      # http://localhost:8080
```

- `index.html`: Home tour
- `houses.html`: The Houses
- Add `?nointro` to skip the preloader, `&snap` to jump the camera straight to each stop.
- `npm run dev` rebuilds on every save.

## Put it in Webflow

See **[docs/webflow-build-guide.md](docs/webflow-build-guide.md)**. Short version: deploy `public/` to
Cloudflare Pages / Netlify / Vercel, add one CSS link and one script tag in Webflow, paste a small
embed, and give each Webflow section a `data-world-stop` attribute. Webflow keeps all the content
editable (including Houses via the CMS), and the world renders behind it.

## Layout

```
index.html, houses.html     prototype pages (the reference for the Webflow build)
src/main.js                 boot: preloader → world → scroll tour → UI
src/world/World.js          renderer, bloom, lighting, intro, picking
src/world/Tour.js           camera shots for each data-world-stop
src/world/Mascot.js         the duck (3D model + flat fallback)
src/world/hall/*            the Grand Hall: layout, architecture, zones, props, sky
src/ui/*                    preloader, smooth scroll + reveals, drawer, toast, cursor
src/styles/runtime.css      → dist/rea-world.css (needed in Webflow)
src/styles/site.css         → dist/rea-site.css (prototype page styles, optional in Webflow)
assets/                     duck model + views, logo, fonts, preloader video, Draco decoder
```

Built with Three.js r186, GSAP 3.15, Lenis 1.3 and esbuild. Fonts: Bricolage Grotesque and
Permanent Marker (SIL OFL).
