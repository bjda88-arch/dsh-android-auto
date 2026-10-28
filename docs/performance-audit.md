# DSH Android Performance Audit

Updated: 2026-10-29

## Reported symptom

The mobile port felt slightly delayed during sustained interaction, especially
while an answer was streaming and while typing in the composer.

## Root causes

1. A page-wide `MutationObserver` watched every character change and scanned
   every Markdown paragraph once per animation frame.
2. Every composer `input` event scheduled another geometry read via
   `getBoundingClientRect()`.
3. The fixed menu button and scroll-to-bottom control used live
   `backdrop-filter`; the modal drawer scrim blurred the full viewport.
4. WebView relied on default overscroll, host scrollbars and renderer priority.

## Changes

- Conversation typography enhancement now observes only `.wSkVaW_body`, queues
  only changed paragraphs, and processes them in `requestIdleCallback`.
- Per-keystroke composer geometry work was removed. The existing
  `ResizeObserver` handles real size changes.
- Composer CSS variables and accessibility attributes are written only when
  their values actually change.
- Backdrop blur was removed from the fixed menu, scroll control, drawer scrim,
  popovers and selectors. Surfaces remain opaque or translucent with semantic
  DSH colors.
- The screen shadow was reduced from 26px to 16px.
- The Android shell now requests a hardware WebView layer, disables host
  scrollbars and overscroll glow, disables offscreen pre-raster, and gives the
  WebView foreground renderer priority.

## Measured result

The headless Chromium fixture emits 80 live-updating Markdown nodes over 60
animation frames, then 120 composer input events. Values below are averages
from three consecutive runs.

| Scenario | Metric | Before | After | Change |
| --- | --- | ---: | ---: | ---: |
| Streaming | Task duration | 243.27ms | 199.50ms | -18.0% |
| Streaming | Layout duration | 97.27ms | 89.10ms | -8.4% |
| Typing | Script duration | 13.23ms | 6.90ms | -47.8% |
| Typing | Task duration | 31.17ms | 26.37ms | -15.4% |

No long tasks were reported in either build. The headless runner is capped at
about 30 frames per second, so these figures are relative CPU/layout results,
not a claim of measured 60fps on the target phone. A physical-device frame
profile remains required for vendor WebView and SoC-specific validation.

Streaming typography work now runs incrementally during browser idle time.
This can slightly increase isolated script time while reducing total task and
layout time and keeping that work out of the animation frame.
