# Webflow build guide: the REA Grand Hall

This guide covers putting the interactive 3D site into Webflow. The idea in one sentence: **Webflow
holds the words, the 3D world runs behind them.** You design and edit every section, form and
headline in Webflow as usual. One script (hosted next to the 3D files) draws the Grand Hall behind
the page and flies the camera to a new spot as each section scrolls into view.

```
┌────────────────────────── browser window ──────────────────────────┐
│  Webflow nav (fixed)                                                │
│  ┌───────────── Webflow section  data-world-stop="hero" ─────────┐  │
│  │  [ card with headline, buttons ]        ← you design this     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  ░░░░░░░░ 3D Grand Hall canvas (fixed, behind everything) ░░░░░░░░░  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Host the 3D files

The world needs these files on a public host: `dist/` (script + CSS) and `assets/` (duck model,
textures, fonts, preloader video). The GitHub repo is private, so jsDelivr and free GitHub Pages
won't serve it. Use any of these instead. All are free for this size:

| Host | Setup |
|---|---|
| **Cloudflare Pages** (recommended) | Create project → connect `Alanl212/REI` → build command `npm ci && npm run build` → output directory `public` |
| **Netlify** | New site from Git → same build command → publish directory `public` |
| **Vercel** | Import repo → Framework "Other" → build `npm run build` → output `public` |

`npm run build` writes a clean `public/` folder (pages, `dist/`, `assets/` and `_headers`). The
`_headers` file adds the cross-origin headers the world needs to load the duck and textures from a
different domain than your Webflow site. Cloudflare Pages and Netlify read it automatically. On
Vercel, add the same headers in project settings.

When the deploy finishes you'll have a URL like `https://rea-world.pages.dev`. Open
`https://rea-world.pages.dev/index.html` to see the full prototype running. That's your reference
while building in Webflow.

> Below, **`HOST`** means that URL, e.g. `https://rea-world.pages.dev`.

---

## 2. Site-wide settings in Webflow

**Fonts** (Site settings → Fonts → Google Fonts): add **Bricolage Grotesque** (400, 600, 800) and
**Permanent Marker**. The 3D signs are drawn with these same font names.

**Variables** (Variables panel → Colors):

| Name | Value | Use |
|---|---|---|
| Aqua | `#0FD1EB` | accents, highlights |
| Yellow | `#FCD615` | primary buttons, highlights |
| Orange | `#FCA00C` | accents, highlights |
| Ink | `#111111` | text, borders |
| Paper | `#EBE4E2` | page background (matches the preloader's last frame) |
| Cream | `#FBF8F5` | cards |

The brand guide asks for black text on light backgrounds. Aqua, yellow and orange are accents, never body text.

**Custom code → Head code**:

```html
<link rel="stylesheet" href="HOST/dist/rea-world.css">
<script>
  window.REA_WORLD = {
    assets: 'HOST/assets/',
    // optional:
    // quality: 'low',          // force the lighter renderer everywhere
    // model: false,            // use the flat duck instead of the 3D duck
  };
</script>
```

**Custom code → Footer code** (before `</body>`):

```html
<script defer src="HOST/dist/rea-world.js"></script>
```

**Fast path for styling:** also add `<link rel="stylesheet" href="HOST/dist/rea-site.css">` to the
head and use the prototype's class names (`rea-chapter`, `rea-card`, `rea-btn`, `rea-h2`, `rea-mark`,
`rea-chips`, `rea-house-btn`, `rea-faq`, `rea-marquee`…). Your Webflow elements then look like the
prototype immediately, and you can restyle them in the Designer over time. Skip it if you'd rather
style everything natively.

The bundle already includes Three.js, GSAP (+ ScrollTrigger) and Lenis smooth scrolling. You don't
need Webflow's GSAP integration for this, though leaving it on won't break anything.

---

## 3. Page skeleton

On every page that shows the world (Home and Houses), add a **Code Embed** as the very first element
inside the Body:

```html
<div class="rea-preloader" data-rea-preloader>
  <video muted playsinline autoplay preload="auto" poster="HOST/assets/video/rea-preloader-poster.jpg" aria-hidden="true">
    <source src="HOST/assets/video/rea-preloader.mp4" type="video/mp4">
  </video>
  <button class="rea-preloader__skip" type="button" data-rea-preloader-skip>Skip intro</button>
  <div class="rea-preloader__progress" aria-hidden="true"><span data-rea-preloader-bar></span></div>
</div>
<div data-rea-world aria-hidden="true"></div>
<nav class="rea-rail" data-rea-rail aria-label="Tour progress"></nav>
```

That's the paint-swipe preloader (shown once per visit), the layer the hall renders into, and the
dot rail on the right that lets people jump between stops.

Then build the page normally: a **Navbar**, the **sections** (next step), and a **Footer**. Give the
footer the attribute `data-world-content` so it sits above the 3D canvas.

---

## 4. Sections = camera stops

Each full-height section is one stop on the tour. Select the Section → Settings (gear) → **Custom
attributes**:

| Attribute | Example | What it does |
|---|---|---|
| `data-world-stop` | `hero` | Which camera shot to fly to (names below) |
| `data-stop-label` | `Welcome` | Label in the right-hand dot rail |

Style each section with a **min height of 115vh** (the hero 100vh) so there's time to look at the
shot. Put the content in a **card** (a Div with class `rea-card`: cream background, 3px ink border,
24px radius, hard shadow `7px 7px 0 #111`). Cards sit on the left by default. Add `rea-chapter--right` (or
justify the section's content to the end) for cards on the right.

**The card side matters.** Every shot is framed so its subject lands in the open half of the screen.
Match the card side in this table:

### Home page stops (in this order)

| `data-world-stop` | Card side | Camera / what the duck shows |
|---|---|---|
| `hero` | left | Down the hall to the round sunset window, under the neon motto sign |
| `why` | right | Close on the duck |
| `model` | left | The first learning bays |
| `el-1` | left | STREAM+H bay: robot arm, telescope, easels, globe |
| `el-2` | left | Careers bay: DISCOVER / EXPLORE / EXPERIENCE / PLAN signpost, desks |
| `el-3` | left | SEL bay: circle of poufs around a glowing heart |
| `el-4` | left | Advocacy bay: stage, podium, megaphone |
| `el-5` | left | The House Cup trophy with four feathers |
| `houses` | left | The House Wheel on its stage |
| `road` | right | Road to Fall 2028: enrollment light-pillars rise (164 → 432, 705 max) |
| `graduate` | left | Graduation steps up to the window: pennants, tossed caps |
| `codesign` | right | Town Hall: 300+ / 100+ / 10+ / 4 totems, "what we heard" bubbles |
| `founder` | left | Back with the duck at the entrance |
| `join` | right | Crane shot over the whole hall |
| `faq` | left | Looking back from the window toward the entrance |

### Houses page stops

| `data-world-stop` | Card side |
|---|---|
| `houses-intro` | left |
| `houses-how` | right |
| `house-lumiere` | left |
| `house-pluma` | right |
| `house-igboya` | left |
| `house-umoja` | right |
| `houses-sorting` | left |
| `houses-cup` | right |
| `houses-cta` | left |

You can reorder or skip stops freely. The camera always flies between whichever stops are on the
page, in page order. Each stop name can be used on any page.

---

## 5. Interactions (all via custom attributes)

| Attribute | Put it on | Effect |
|---|---|---|
| `data-reveal` | any block | Fades/rises in when scrolled into view |
| `data-split` | a heading | Words slide up one by one |
| `data-hero-in` | hero elements | Animates in after the preloader instead of on scroll |
| `data-count="300"` `data-suffix="+"` | a number | Counts up from 0 |
| `data-marquee` (wrapper) + `data-marquee-track` (inner row) | ticker | Infinite scrolling ticker (style the animation in Webflow or use class `rea-marquee`) |
| `data-world-action="spin"` | a button | Spins the House Wheel. The result pops up and the duck celebrates |
| `data-spin-result` | a text block | Gets filled with the wheel's result (screen-reader friendly) |
| `data-open-house="pluma"` | a button | Opens the House drawer (on the Houses page, flies to that House instead) |
| `data-cursor="Spin!"` | anything | Custom cursor label on hover (desktop) |
| `data-nav` (navbar) + `data-nav-toggle` (menu button) | nav | Simple mobile menu toggle (or use Webflow's Navbar component instead) |
| `data-track="Join list – hero"` | links/buttons | Names the CTA in analytics events (see §9) |

Clicking 3D objects also works: the House Wheel spins, each House archway opens or flies to that
House, and the duck waves when you click it.

---

## 6. Houses in the CMS

House names are **working proposals**. Students and families will help choose the final ones, so
keep them editable. Create a **Houses** collection:

| Field | Example |
|---|---|
| Name | Ìgboyà |
| Slug | igboya |
| Language | Yoruba |
| Meaning | courage |
| Say it | ee-gboh-YAH |
| Color (hex text) | #FCA00C |
| Ink (hex text) | #000000 (white `#FFFFFF` for Umoja/black) |
| Pillar | Advocate Boldly |
| Blurb | … |
| Traits | Brave, Principled, Action-ready |

On each House card (Collection List item), bind these **custom attributes** to CMS fields:
`data-house-key` → Slug, `data-house-name` → Name, `data-house-color` → Color, `data-house-ink` →
Ink, `data-house-meaning` → Meaning, `data-house-language` → Language.

The 3D world reads those attributes when the page loads. Rename a House in the CMS and its banner,
wheel segment and drawer update on publish. The order in the list is the order of the four House
bays: 1st = left front, 2nd = right front, 3rd = left back, 4th = right back.

Optional: inside each item add a hidden Div with `data-house-detail="{slug}"` containing whatever
you want the drawer to show. Otherwise the drawer builds itself from the attributes.

---

## 7. Forms

Use **native Webflow forms** (the prototype's fake submit is only for the preview). Per the content
guide:

- Separate forms (or a "role" field) for mailing list, family interest, partners, volunteers, donations.
- Put the interest-form disclaimer **directly next to the submit button**:
  > Submitting an interest form does not constitute an application for admission, guarantee
  > enrollment, or create a place on a waiting list. Formal enrollment materials and lottery
  > procedures will be announced only after charter authorization and in accordance with Alabama law.
- Form elements inside a stop section stay clickable automatically.

---

## 8. Numbers inside the 3D world

The enrollment pillars, stat totems and speech bubbles are drawn in 3D, so their text comes from the
script. Defaults match the content guide (164 / 276 / 368 / 432 / 432, max 705; 300+ / 100+ / 10+ /
4). To change them without rebuilding, add to the `window.REA_WORLD` block:

```js
enrollment: [
  { students: 164, label: 'Year 1 · K–2 + 6' },
  { students: 276, label: 'Year 2 · + 3 & 7' },
  { students: 368, label: 'Year 3 · + 4 & 8' },
  { students: 432, label: 'Year 4 · full K–8' },
  { students: 432, label: 'Year 5 · full K–8' },
],
stats: [
  { value: '300+', label: 'Survey responses' },
  { value: '100+', label: '1:1 conversations' },
  { value: '10+', label: 'Community events' },
  { value: '4', label: 'Town halls' },
],
voices: ['High expectations + cultural pride', 'Strong literacy & math', 'Mental-health support',
         'Arts, tech & careers', 'A real voice in decisions', 'Honor our history'],
```

Do not publish the 258 / 860 figures; the guide marks them as unreconciled.

---

## 9. Analytics hooks

The script fires these DOM events. Hook them up in Webflow's footer code to GA4, Plausible, etc.:

```html
<script>
  ['cta', 'stop', 'spin', 'house'].forEach((name) =>
    document.addEventListener('rea:' + name, (e) => {
      // e.g. gtag('event', 'rea_' + name, e.detail);
      console.log('rea:' + name, e.detail);
    }));
</script>
```

`rea:stop` fires as visitors reach each camera stop, which shows how far they get through the tour.

---

## 10. The 3D duck

The package's 15.4 MB `duck-web.glb` was compressed to **2.7 MB** (`assets/models/rea-duck.glb`) with
geometry compression (meshopt) and WebP textures. The rig, both clips and all facial shapes are
unchanged; side-by-side renders matched. In the hall the duck:

- shows a lightweight flat version instantly, then swaps to the 3D duck as soon as it loads;
- idles on the **Expressions** clip, blinks, and turns its head toward the camera;
- **waves Hello** when it reaches a stop (at most every few seconds) and when clicked;
- hops between stops, with one big cartoon leap for long distances.

To replace the model later, run:

```bash
npx @gltf-transform/cli optimize duck-web.glb assets/models/rea-duck.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 \
  --simplify false --join false --flatten false --instance false --palette false --weld false
```

Clip names are matched loosely (`/idle|expression/i` for idle, `/wave|hello/i` for the wave), so a
new export with similar names just works.

You don't need the GitHub Pages iframe from the duck package. The world loads the model directly.

---

## 11. Performance & accessibility

- **Two quality levels**, picked automatically. `high` (desktop) adds live floor reflections,
  4× anti-aliasing and 2K shadows. `low` (phones/tablets) skips them. Force one with
  `quality: 'low'` in `window.REA_WORLD`.
- **Reduced motion**: visitors with "reduce motion" on skip the preloader video and intro, get
  instant camera cuts, and see no idle animation.
- **No WebGL** (old devices, some corporate laptops): the page still works with a flat duck
  illustration, and the wheel buttons still pick a House.
- The canvas is `aria-hidden`. Every piece of content and every 3D interaction also exists as real
  HTML (headings, buttons, forms), so the site is fully usable with a keyboard or screen reader.
- Budget: ~0.9 MB script (260 KB gzipped) + 2.7 MB duck + 0.7 MB preloader video.

---

## 12. Editing the world itself

The hall is code, not a model file, so changes are made in `src/` and rebuilt:

| File | What's in it |
|---|---|
| `src/world/hall/layout.js` | Floor plan: hall size, where each zone and House bay lives |
| `src/world/hall/architecture.js` | Floor, neon arches, wood bays, glass vault, ribbons, window, lights |
| `src/world/hall/zones.js` | Learning zones, House bays, wheel stage, road pillars, town hall, graduation |
| `src/world/hall/props.js` | Furniture kit: plants, poufs, shelves, globes, telescope, robot arm |
| `src/world/hall/env.js` | Sunset sky, water, bridge silhouette, reflections |
| `src/world/Tour.js` | Camera shots for every `data-world-stop` |
| `src/world/Mascot.js` | Duck behaviour |

`npm run dev` rebuilds on save. Open `index.html?nointro` to skip the preloader while iterating, and
add `&snap` to jump the camera straight to each stop. Then commit and your host redeploys.

For a photoreal upgrade later, a 3D artist can model the hall in Blender with baked lighting and
export a GLB. The camera tour, duck and interactions in this repo stay the same.

---

## 13. Launch checklist (from the content guide)

- [ ] "Proposed / planned / subject to authorization" language everywhere
- [ ] House names, colors and crests confirmed (or clearly marked as working proposals)
- [ ] Founder headshot and real community-event photography (with signed permissions)
- [ ] Partnership language uses "exploring / prospective" unless formally documented
- [ ] Enrollment numbers match 164 / 432 / 705
- [ ] Interest-form disclaimer next to every submit button
- [ ] Alt text, heading order, keyboard navigation and contrast checked
- [ ] "Last updated" date on FAQ and enrollment content
- [ ] Analytics events connected
