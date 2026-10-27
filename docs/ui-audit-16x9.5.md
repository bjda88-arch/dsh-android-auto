# DSH Mobile 16:9.5 UI/UX Audit

## Scope

Audited the real DSH Web UI at four CSS viewports:

- `360 x 607` portrait (`9.5:16`)
- `570 x 960` portrait, high-density reference
- `640 x 380` landscape (`16:9.5`)
- `960 x 570` landscape, high-density reference

The audit used the UI UX Pro Max accessibility, touch, layout, navigation,
motion and performance rules; the Appllama native-app design workflow; and the
Appllama improve-existing-screen methodology. The Appllama online sample tool
was not exposed in this runtime, so visual comparison was performed against the
live DSH DOM and its upstream design tokens.

## Defects found

1. The collapsed sidebar still leaked a narrow rail into the visual edge.
2. Opening the React drawer removed the sidebar column from grid flow, causing
   the main column to auto-place into a zero-width track.
3. Composer padding left roughly 4–5% of the viewport unused.
4. The 16:9.5 boot film was letterboxed.
5. A custom left-edge swipe duplicated Android's system back gesture.
6. Several icon controls had visual sizes below a 44px mobile target.
7. WebView text zoom was fixed at 100%, ignoring Android font-size preferences.
8. The first-run screen used a separate cinematic black/neon visual language.
9. The settings tab inherited white text on a pale selected state, producing a
   measured contrast ratio of 1.2:1 in light mode.
10. Settings descriptions used tertiary gray at only 3.54–3.7:1 on light
    surfaces.
11. The off-screen sidebar remained in the accessibility tree while closed.
12. The viewport disabled zoom and the shell blocked pinch gestures.

## Changes

- Main content is pinned to grid column 2 and stays full-width while the drawer
  overlays it.
- The drawer is capped at `min(88vw, 360px)` and uses upstream DSH surface
  colors, one hairline border and one elevation level.
- The menu, header actions and drawer rows now expose at least a 44px hit area;
  small composer controls use non-visual hit-area expansion.
- The custom edge swipe was removed. The visible menu button, scrim tap and
  Android hardware back remain as three unambiguous navigation paths.
- The header uses `min-height` rather than a fixed height and can expand under
  large system text.
- WebView text zoom follows Android's system font scale between 85% and 150%.
- Pinch zoom is restored: the viewport no longer disables scaling and WebView
  exposes its native zoom controls without visible zoom chrome.
- The composer uses about 95–97% of the viewport width while preserving a
  readable measure on wide landscape screens.
- Drawer and scrim motion is limited to 160–180ms and removed under
  `prefers-reduced-motion`.
- The 17-second cinematic boot screen was replaced by a theme-aware DSH startup
  surface using the official whale mark, semantic colors, a quiet phase label
  and one progress rail.
- The initial WebView background is applied before React renders, preventing a
  white/black flash between startup and the application.
- The collapsed sidebar is removed from both hit testing and the accessibility
  tree.
- Settings tabs now use a DSH-style text tab with a blue underline; active text
  is primary-colored instead of white on a pale background.
- Settings section labels and descriptions use the secondary text token.

## Measured result

| Viewport | Horizontal overflow | Header | Composer | Input card |
| --- | --- | ---: | ---: | ---: |
| 360 x 607 | none | 48px | 348px (96.7%) | 340px (94.4%) |
| 640 x 380 | none | 44px | 621px (97.0%) | 613px (95.8%) |
| 570 x 960 | none | 48px | 554px (97.2%) | 546px (95.8%) |
| 960 x 570 | none | 44px | 786px | 778px |

The drawer exposes a 318px usable panel at 360px viewport width and does not
reduce the 360px main column.

## Visual-system checks

- One accent family: DSH blue, taken from upstream semantic tokens.
- One neutral family and semantic light/dark surfaces.
- Shape scale: 10px controls, 14px floating controls, 20px composer.
- No emoji in structural chrome.
- SVG icons retain upstream DSH geometry.
- Light and dark surfaces both render without component-level raw colors.
- Touch feedback uses background/opacity and 44px hit areas.

## Remaining device verification

The browser renderer and bundled WebView payload were checked at the target
aspect ratios. A physical-device pass is still required for vendor keyboards,
cutout geometry and measured frame rate; those cannot be certified by headless
rendering alone.

Automated axe checks report zero WCAG A/AA violations for the live home screen,
open drawer and settings screen in light mode; the drawer and settings screen
also report zero in dark mode.
