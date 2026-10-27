# DSH Mobile Design System

## Principle

The Android shell should disappear around the official DSH interface. Mobile
changes are limited to geometry, ergonomics, accessibility and performance.
No second visual language is introduced.

## Color roles

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#ffffff` | `#151517` |
| Layer 1 | `#ffffff` | `#232324` |
| Layer 2 | `#ffffff` | `#2c2c2e` |
| Primary label | `#0f1115` | `#f9fafb` |
| Secondary label | `#61666b` | `#cfd3d6` |
| Tertiary label | `#81858c` | `#adb2b8` |
| Caption | `#adb2b8` | `#81858c` |
| Brand / selected | `#4176e6` | `#7aaaff` |
| Hairline L1 | `#0000000a` | `#ffffff0f` |
| Hairline L2 | `#0000001a` | `#ffffff1f` |
| Press state | `#2631480f` | `#ffffff14` |
| Selected surface | `#2631481a` | `#ffffff24` |

Rules:

- One accent only: the DSH blue/light-blue pair above.
- Use semantic tokens in components; no raw colors except the boot screen's
  declaration of the same token values.
- Tertiary values are only for non-essential decoration or icons. Operational
  labels and descriptions use at least secondary contrast.
- Custom wallpaper is disabled in the mobile shell so surfaces remain coherent
  in both themes.

## Typography

- Family: upstream DSH/platform sans stack.
- App title: 18px, 600.
- Hero title: upstream DSH 26px.
- Body/input: at least 15px visual size; editable input remains 16px.
- Secondary text: 13px.
- Caption/meta: 11.5–12px.
- Body line height: 1.55–1.62.
- Numerals: tabular for progress, tokens, durations and counts.
- WebView text zoom follows Android accessibility font scale from 85% to 150%.

## Shape

- Controls and tabs: 10px.
- Floating controls/banners: 14px.
- Composer: 20px.
- Pills and circular buttons: 999px.
- Hairline borders are 0.5px using semantic border tokens.

## Spacing

- Base rhythm: 4px, preferring 8px grouping increments.
- Screen gutters: 6–10px on phones; up to 24px on wider layouts.
- Header: about 44–48px plus the system safe-area inset.
- Touch targets: 44px minimum; 48px for the visible menu hit area.
- Composer: 94–97% of viewport width on target phones.

## Icons

- Use the upstream DSH SVG icon family and official whale mark.
- No emoji or typographic glyphs as structural chrome.
- One visual weight per hierarchy level.
- Icon-only controls require an accessible name and visible pressed/focus state.

## Motion

- Press feedback: 100–140ms.
- Boot content fade: 160ms.
- Drawer entrance: 180ms, strong ease-out; scrim fades in over 160ms.
- No looping decorative animation, parallax, glow or cinematic sequence.
- All spatial motion is disabled under `prefers-reduced-motion`; the final state
  remains fully usable.

## Startup screen

- Same background, text colors, whale mark and blue accent as the application.
- Centered: whale mark, “DeepSeek Harness”, one phase label, 2px progress rail,
  percentage and ETA.
- No terminal copy, grid, neon glow or marketing tagline.
- Light and dark mode are driven by the app theme.
- Startup-to-app transition preserves the WebView background color to prevent
  a white/black flash.

## Navigation

- Collapsed sidebar consumes no content width.
- Sidebar is a modal navigation drawer with a visible menu entry, tappable
  scrim and Android hardware-back dismissal.
- Do not add a custom edge-swipe that competes with system back navigation.
- Settings is a full-screen modal sheet with quiet text tabs and an underline
  for the current page.
