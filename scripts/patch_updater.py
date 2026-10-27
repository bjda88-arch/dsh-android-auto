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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("main_activity", type=Path)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()

    text = args.main_activity.read_text(encoding="utf-8")
    api = f"https://api.github.com/repos/{args.repo}/releases/latest"
    page = f"https://github.com/{args.repo}/releases"

    text = replace_once(
        text,
        "https://api.github.com/repos/guzhou079-arch/deepseek-harness-android/releases/latest",
        api,
    )
    text = replace_once(
        text,
        "https://github.com/guzhou079-arch/deepseek-harness-android/releases",
        page,
    )

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

    text = replace_once(
        text,
        "        ws.setTextZoom(100);\n",
        "        int systemFontScale = Math.round("
        "getResources().getConfiguration().fontScale * 100f);\n"
        "        ws.setTextZoom(Math.max(85, Math.min(150, systemFontScale)));\n",
    )

    text = replace_once(
        text,
        "        ws.setSupportZoom(false);\n"
        "        ws.setBuiltInZoomControls(false);\n",
        "        ws.setSupportZoom(true);\n"
        "        ws.setBuiltInZoomControls(true);\n",
    )

    text = replace_once(
        text,
        '        final String body = html.replace("<body>", "<body class=\\"clean\\">");\n',
        '        final String bootTheme = themePrefersDark() ? "dark" : "light";\n'
        '        final String body = html.replace("<body>", '
        '"<body class=\\"clean\\" data-theme=\\"" + bootTheme + "\\">");\n',
    )

    text = replace_once(
        text,
        "        webView.setBackgroundColor(0xFF04050A);\n",
        "        webView.setBackgroundColor(themePrefersDark() ? 0xFF151517 : 0xFFFFFFFF);\n",
    )

    args.main_activity.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
