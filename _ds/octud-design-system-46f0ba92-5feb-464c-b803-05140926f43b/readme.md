# Octud Design System

A Material 3 (Expressive) design system, themed for **Octud** — a polymer/plastics supplier whose promise is **"Right Polymer · Right Partner."** The component library, token set, and type scale are extracted from the *Material 3 Design Kit (Community)* Figma file; the brand identity (logo, wordmark, ink color, voice) comes from Octud's own assets.

> **What this is:** a faithful, code-first recreation of the Material 3 foundations + a curated, prop-driven React component set, dressed in Octud's monochrome brand. Use it to build product UI, prototypes, and branded artifacts.

---

## Sources

- **Figma:** *Material 3 Design Kit (Community)* — attached as a mounted file. Provides the token collections (M3 schemes, Typescale, Shape, Font theme), the ~135-glyph icon set, and the full component inventory (548 component sets + standalone symbols).
- **Brand assets (uploaded by Octud):** `assets/octud-logo-horizontal.svg`, `assets/octud-symbol.svg`, `assets/octud-wordmark.svg`, `assets/octud-og-image.png`.
- No product codebase or live URL was provided. UI-kit recreations are inferred from Octud's positioning (B2B polymer supply) built on the M3 components — flag for correction if a real product exists.

---

## Company & product context

Octud sells engineering and commodity polymers (PET, HDPE, PP, PVC, recycled grades) to manufacturers, positioning itself as a **partner** that matches the right material to the customer's application. The identity is quiet, industrial, and precise: a single near-black ink, a geometric squircle mark (a rounded square nested inside a rounded square), and an all-caps wordmark. There is no product UI in the source materials, so the system provides the foundations and components a B2B ordering/catalog/operations product would need.

---

## Content fundamentals

- **Voice:** plain, confident, industrial. Short declaratives. "Request quote", "Right polymer, right partner." No hype, no exclamation.
- **Casing:** Title case for headings; **ALL CAPS only for the wordmark and small labels** (button labels, eyebrow labels). Sentence case for body and supporting text.
- **Person:** address the customer as **you**; refer to Octud as **we/Octud**.
- **Numbers & units:** technical and exact — melt-flow index, °C, kg, lot numbers (`#OCT-2041`). Prefer real spec language over marketing adjectives.
- **Emoji:** none. **Icons** carry meaning instead.
- **Tone example:** *"Certified food-grade resin, delivered to spec."* not *"Amazing quality plastics you'll love!"*

---

## Visual foundations

- **Color:** the raw palette is the full M3 scheme system (see `tokens/fig-tokens.css`) with **29 theme scopes** — light/dark, high/medium contrast, and 13 accent themes. The default `:root` is M3 baseline purple (`--schemes-primary: rgb(103,80,164)`). **Octud's on-brand scheme is the Monochrome theme** — apply `data-mode="monochrome-lt"` (or `-dt`) on the root to render the near-black palette that matches the `#171717` mark. Max 1–2 background tones per surface; lean on surface-container steps for hierarchy.
- **Type:** Roboto (brand + plain) and Roboto Mono (technical/code), full M3 type scale in `tokens/typography.css` as `.type-*` classes. Display/Headline for moments; Title/Body/Label for working text; Mono for spec data.
- **Shape:** M3 corner ladder — 4 / 8 / 12 / 16 / 28 / 48 px and `full` (pill). Buttons/FABs/chips are pill or size-scaled squircles; cards default to 12px.
- **Elevation:** 5-level M3 shadow ladder (`--elevation-1..5`), shadows built from `rgba(0,0,0,.3)` + `rgba(0,0,0,.15)` per the source. Elevated cards use level 1; dialogs level 3; FABs level 3.
- **Backgrounds:** flat surfaces, no gradients or textures. Depth comes from surface-container tone + elevation, never decoration.
- **Interaction:** M3 **state layers** — a `currentColor` overlay at 8% (hover) / 10% (focus, press). Focus shows a 3px secondary outline. No scale-bounce; transitions are short opacity/position fades (~120ms). Disabled = 38% opacity.
- **Borders:** hairline `--schemes-outline-variant` for dividers and outlined containers; `--schemes-outline` for stronger edges.
- **Corner radii on cards:** 12px, no colored left-border accents.
- **Imagery:** product/material photography (neutral, industrial, well-lit). Clip to rounded corners; no drawn illustration in the brand.

---

## Iconography

- **Set:** Material Symbols, extracted from the Figma kit as `components/icons/icon-data.js` (~135 curated glyphs) and rendered via the **`Icon`** component: `<Icon name="Search" size={24} />`.
- **Style:** outlined/rounded Material Symbols; single-color, paint with `currentColor` (set `color` on the element).
- **Emoji / unicode:** never used as icons. Always the `Icon` component (or an inline SVG asset from `assets/`).
- **Brand marks:** the squircle symbol and wordmark live in `assets/` as SVG — use those verbatim; never redraw them.
- Full name index: `components/icons/Icon.d.ts`.

---

## Components

Prop-driven React components (one file each, `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`), grouped by concern. Each collapses the source kit's many size/variant/state permutations into props.

**actions/** — `Button`, `ButtonGroup`, `SegmentedButtonGroup`, `IconButton`, `Fab`, `SplitButton`, `FabMenu`
**selection/** — `Checkbox`, `Radio`, `Switch`, `Chip`
**inputs/** — `TextField`, `Select`, `SearchBar`, `Slider`
**containment/** — `Card`, `Divider`, `Badge`, `Dialog`, `FullScreenDialog`, `Sheet`
**navigation/** — `Tabs`, `NavigationBar`, `NavigationRail`, `NavigationDrawer`, `AppBar`, `BottomAppBar`, `Menu`, `Toolbar`
**feedback/** — `Snackbar`, `Tooltip`, `ProgressIndicator`, `LoadingIndicator`
**lists/** — `List`, `ListItem`
**data/** — `Avatar`, `Carousel`
**pickers/** — `DatePicker`, `DateInput`, `TimePicker`, `TimePickerDial`
**icons/** — `Icon`

Mount from the compiled bundle: `const { Button } = window.OctudDesignSystem_46f0ba`.

### Coverage note (component families)

The Figma kit enumerates **813 component "families"**, but these are overwhelmingly *variant permutations* of a smaller functional set — e.g. `Icon button / {XSmall…XLarge} / {Standard,Filled,Tonal,Outline} / {Selected,Unselected} / {5 states}` is dozens of "families" that are one component with `size`, `variant`, `selected`, and state props. This system implements the **complete functional inventory as 42 prop-driven components**, which together express those permutations. Building 800+ literal permutation files would bloat the bundle and hurt usability without adding capability.

**Intentional additions:** `Icon` (a thin wrapper over the extracted glyph data — needed to render Material Symbols from code).

**Known gaps (intentionally not built as separate files):** purely decorative/example “Building Blocks” sub-parts from the source (state layers, thumbnails, handles, track segments) that exist only to assemble the components above — they are internal, not public API. Tell me if you want any of these promoted.

---

## Foundations & the Design System tab

Specimen cards populate the Design System tab, grouped **Color · Type · Foundations · Brand · Components**. See `guidelines/*.card.html`. Every component directory carries a `*.card.html` thumbnail.

---

## File index

- `styles.css` — global entry (import list only). Consumers link this.
- `tokens/` — `fonts.css`, `fig-tokens.css` (Figma variables, all modes), `semantic.css` (friendly aliases + shape/elevation), `typography.css` (`.type-*` classes), `base.css`, `interactions.css` (state layers).
- `components/<group>/` — React components + `.d.ts` + `.prompt.md` + card HTML.
- `components/icons/` — `Icon.jsx`, `icon-data.js`, `Icon.d.ts`.
- `guidelines/` — foundation specimen cards.
- `ui_kits/` — full-screen product recreations.
- `assets/` — Octud logos + OG image.
- `thumbnail.html` — homepage tile.
- `SKILL.md` — Agent-Skills-compatible entry point.

---

## Caveats

- **Fonts:** the kit's Font-theme tokens name Roboto (and, in one mode, *Flow Circular* / *Google Sans*). Roboto + Roboto Mono are loaded from Google Fonts; **Google Sans / Flow Circular are not openly licensed** and fall back to Roboto. The compiler's font banner ("Regular/Medium/SemiBold/Flow Circular need a font file") stems from M3 storing *weight names* and one non-default mode as string tokens — Roboto renders correctly. Upload real font files if you have licensed them.
- **Brand vs. base theme:** default `:root` is M3 purple. For Octud-branded output, set `data-mode="monochrome-lt"`/`-dt`.
- **No product UI source:** UI kits are plausible B2B recreations, not copies of a real Octud app.
- **Component gaps:** the distinct families listed above are not built yet.
