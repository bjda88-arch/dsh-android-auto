# DSH Mobile Real-Device UI/UX Audit

Updated: 2026-10-28

## Scope

The latest references are two supplied physical-device captures at
1320 × 2232. At 3× density this maps to a 440 × 744 CSS viewport. The DSH Web
UI was audited at:

- `440 x 744` portrait, matching both supplied device frames
- `360 x 609` portrait, small-phone check at the same ratio
- `744 x 440` landscape

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
13. The weather table's upstream `30vw` cell cap caused short fragments and
    orphan Chinese characters.
14. The model selector showed a hard-truncated model name.
15. Composer metadata was clipped by the Android gesture area.
16. The floating return-to-bottom control could cover the final paragraph.
17. Keyboard shortcut hints in the dark account menu measured only 3.66:1.
18. The padded drawer wrapper used content-box sizing and overflowed the panel
    by about 20px, producing 24px left and 5px right content margins.
19. The drawer footer extended to within 2px of the bottom edge.
20. The drawer close affordance used the same split-pane glyph as the desktop
    side-panel control and did not read as Close.
21. The visible logo was also announced as a duplicate New Conversation button.
22. The collapsible Features row had text but no directional chevron.
23. The 18px title had been reduced to 15px, leaving insufficient hierarchy.
24. The disabled send button retained a blue fill and looked actionable.

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
- The title and tab row now align at the same 58px leading edge; answer content
  and the composer align at the screen gutter.
- CJK text uses zero tracking, `line-break: strict`, normal word breaking and
  `text-wrap: pretty`; long Latin tokens retain controlled wrapping.
- Data tables use a 30/70 split on the reference phone and a 26/74 split at
  360px. The narrow variant uses 13px/20px table text so values stay whole.
- The composer model label can use up to 45% of its row and has its separate
  icon removed, keeping `DeepSeek-V4.1-Flash` readable.
- The composer metadata has a 12px minimum safe-area floor, 11.5px text,
  semantic-secondary contrast and horizontal overflow as a last resort.
- Return-to-bottom is a 38px visual control with a 44px expanded hit area and
  is placed in the composer's quiet upper-right area.
- Keyboard shortcut hints now use the secondary label token in both themes.
- The drawer uses border-box sizing at every padded level, creating symmetric
  20px content gutters.
- The close control is a conventional X with a 44px hit area. Opening moves
  focus to Close; dismissing returns focus to Menu.
- The decorative brand is removed from mobile pointer and accessibility order
  because the dedicated New Conversation action already exists.
- Collapsible Features sections expose a chevron, and the former text glyph is
  replaced by vector grid geometry.
- Workspace section labels are 12px/600 secondary text instead of competing at
  body size.
- The footer More control is a full-width 48px row above the bottom safe area.
- The page title is restored to 18px/600. Table labels use 13px secondary text
    and values use 14px primary text.
- Disabled send is neutral; enabled send is the only blue action.
- At 150% text scaling, the header grows to 86px, the model selector receives
  a full second toolbar row, and the composer expands without clipping its
  placeholder or metadata. The page remains free of horizontal overflow.

## Measured result

| Viewport | Horizontal overflow | Header | Composer | Input card |
| --- | --- | ---: | ---: | ---: |
| 440 x 744 | none | 79px with tabs | 421px (95.7%) | 421px (95.7%) |
| 360 x 609 | none | 79px with tabs | 344px (95.6%) | 344px (95.6%) |
| 744 x 440 | none | 79px with tabs | 719px (96.6%) | 719px (96.6%) |

At 440px, the table columns measure 126px / 295px. At 360px they measure
89px / 255px. The model label measures 122px against 122px of available text
width, so the tested model name is not truncated.

The drawer measures 361px overall. Content begins and ends 20px from its
edges, Close is 44px, and the bottom More row is 48px with a 16px safe gap.

## Visual-system checks

- One accent family: DSH blue, taken from upstream semantic tokens.
- One neutral family and semantic light/dark surfaces.
- Shape scale: 10px controls, 14px floating controls, 18px composer.
- No emoji in structural chrome.
- SVG icons retain upstream DSH geometry.
- Light and dark surfaces both render without component-level raw colors.
- Touch feedback uses background/opacity and expanded 44px hit areas.
- Light and dark answer previews, drawer and menu surfaces report no WCAG A/AA
  violations in the current unauthenticated test state, including 150% text.
  The authenticated settings surface retains the earlier zero-violation audit
  and the same corrected tab styling.

## Remaining device verification

The browser renderer and bundled WebView payload were checked at the target
aspect ratios. A physical-device pass is still required for vendor keyboards,
cutout geometry and measured frame rate; those cannot be certified by headless
rendering alone.

Automated axe checks report zero WCAG A/AA violations for the live home screen,
open drawer and settings screen in light mode; the drawer and settings screen
also report zero in dark mode.
