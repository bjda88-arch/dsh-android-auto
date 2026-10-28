#!/usr/bin/env python3
"""Point the Android shell update checker at this repository and check on launch."""

from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one occurrence, found {count}: {old}")
    return text.replace(old, new)


def replace_optional_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count > 1:
        raise SystemExit(f"Expected at most one occurrence, found {count}: {old}")
    return text.replace(old, new) if count == 1 else text


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("main_activity", type=Path)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()

    text = args.main_activity.read_text(encoding="utf-8")
    api = f"https://api.github.com/repos/{args.repo}/releases/latest"
    page = f"https://github.com/{args.repo}/releases"

    text = replace_optional_once(
        text,
        "https://api.github.com/repos/guzhou079-arch/deepseek-harness-android/releases/latest",
        api,
    )
    text = replace_optional_once(
        text,
        "https://github.com/guzhou079-arch/deepseek-harness-android/releases",
        page,
    )
    if api not in text or page not in text:
        raise SystemExit("Could not point update URLs at the release repository")

    marker = "    private volatile boolean autoUpdateChecked = false;\n"
    if marker not in text:
        anchor = "    private volatile boolean pendingShizukuReq = false;\n"
        text = replace_once(text, anchor, anchor + "\n" + marker)

    check = (
        "                if (!autoUpdateChecked) {\n"
        "                    autoUpdateChecked = true;\n"
        "                    view.postDelayed(new Runnable() {\n"
        "                        @Override public void run() {\n"
        "                            if (!isFinishing()) checkForUpdate(false);\n"
        "                        }\n"
        "                    }, 12000L);\n"
        "                }\n"
    )
    if "if (!autoUpdateChecked)" not in text:
        anchor = (
            "                errorRetries = 0;\n"
            "                injectDraftBootstrap(view);\n"
        )
        replacement = (
            "                errorRetries = 0;\n"
            + check
            + "                injectDraftBootstrap(view);\n"
        )
        text = replace_once(text, anchor, replacement)

    text = replace_optional_once(
        text,
        "        ws.setTextZoom(100);\n",
        "        int systemFontScale = Math.round("
        "getResources().getConfiguration().fontScale * 100f);\n"
        "        ws.setTextZoom(Math.max(85, Math.min(150, systemFontScale)));\n",
    )
    if "int systemFontScale = Math.round(" not in text:
        raise SystemExit("Could not patch WebView system font scaling")

    text = replace_optional_once(
        text,
        "        ws.setSupportZoom(false);\n"
        "        ws.setBuiltInZoomControls(false);\n",
        "        ws.setSupportZoom(true);\n"
        "        ws.setBuiltInZoomControls(true);\n",
    )
    if "        ws.setSupportZoom(true);\n" not in text:
        raise SystemExit("Could not enable WebView zoom")

    text = replace_optional_once(
        text,
        '        final String body = html.replace("<body>", "<body class=\\"clean\\">");\n',
        '        final String bootTheme = themePrefersDark() ? "dark" : "light";\n'
        '        final String body = html.replace("<body>", '
        '"<body class=\\"clean\\" data-theme=\\"" + bootTheme + "\\">");\n',
    )
    if "final String bootTheme = themePrefersDark()" not in text:
        raise SystemExit("Could not theme the startup document")

    text = replace_optional_once(
        text,
        "        webView.setBackgroundColor(0xFF04050A);\n",
        "        webView.setBackgroundColor(themePrefersDark() ? 0xFF151517 : 0xFFFFFFFF);\n",
    )
    background = (
        "        webView.setBackgroundColor("
        "themePrefersDark() ? 0xFF151517 : 0xFFFFFFFF);\n"
    )
    if background not in text:
        raise SystemExit("Could not patch WebView background color")

    performance_marker = "        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);\n"
    if performance_marker not in text:
        performance = (
        "        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);\n"
        "        webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);\n"
        "        webView.setVerticalScrollBarEnabled(false);\n"
        "        webView.setHorizontalScrollBarEnabled(false);\n"
        "        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);\n"
        "        ws.setOffscreenPreRaster(false);\n"
        "        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n"
        "            webView.setRendererPriorityPolicy("
        "WebView.RENDERER_PRIORITY_IMPORTANT, true);\n"
        "        }\n"
        )
        main_background = (
            "        webView.setBackgroundColor(chromeBg());"
            " // v1.13.11：跟随主题（浅色模式下不再是深色闪屏）\n"
        )
        text = replace_once(text, main_background, main_background + performance)

    args.main_activity.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
