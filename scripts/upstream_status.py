#!/usr/bin/env python3
"""Compare official DSH, the Android port, and this repository's releases."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import urllib.request
import zipfile
from typing import Any

API = "https://api.github.com"
UA = "dsh-android-auto/1.0"


def request_json(url: str) -> Any:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": UA,
    }
    token = os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        url,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def version_key(value: str) -> tuple[Any, ...]:
    """Return a deterministic ordering key for DSH and Android version tags."""
    text = value.strip().removeprefix("dsh-v").removeprefix("v").lower()
    text = text.replace("-", ".")
    parts: list[Any] = []
    for part in re.split(r"[._+]", text):
        if part.isdigit():
            parts.append((1, int(part)))
        elif part:
            # Stable builds sort after alpha/beta/rc for the same numeric core.
            rank = {"alpha": 0, "beta": 1, "rc": 2}.get(part, 3)
            parts.append((0, rank, part))
    return tuple(parts)


def releases(repo: str) -> list[dict[str, Any]]:
    data = request_json(f"{API}/repos/{repo}/releases?per_page=100")
    if not isinstance(data, list):
        raise RuntimeError(f"Unexpected GitHub release response for {repo}")
    return [r for r in data if not r.get("draft")]


def latest_matching(
    repo: str, pattern: str, *, optional: bool = False
) -> dict[str, Any] | None:
    candidates = [
        r
        for r in releases(repo)
        if re.fullmatch(pattern, str(r.get("tag_name", "")))
    ]
    if not candidates:
        if optional:
            return None
        raise RuntimeError(f"No matching release found for {repo}")
    return max(candidates, key=lambda r: version_key(str(r["tag_name"])))


def apk_asset(release: dict[str, Any]) -> dict[str, Any]:
    assets = release.get("assets") or []
    for asset in assets:
        if str(asset.get("name", "")).lower().endswith(".apk"):
            return asset
    raise RuntimeError(f"Release {release.get('tag_name')} has no APK asset")


def embedded_kernel(apk_url: str) -> str:
    headers = {"User-Agent": UA}
    token = os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    fd, path = tempfile.mkstemp(suffix=".apk")
    os.close(fd)
    try:
        req = urllib.request.Request(apk_url, headers=headers)
        with (
            urllib.request.urlopen(req, timeout=120) as response,
            open(path, "wb") as handle,
        ):
            while chunk := response.read(1024 * 1024):
                handle.write(chunk)
        with zipfile.ZipFile(path) as archive:
            return (
                archive.read("assets/dshroot_kernel_version.txt")
                .decode()
                .strip()
            )
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/tracked.json")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as handle:
        config = json.load(handle)

    official = latest_matching(config["official_repo"], r"dsh-v.+")
    port = latest_matching(config["android_repo"], r"v[0-9].*")
    ours = latest_matching(
        config["release_repo"], r"v[0-9].*", optional=True
    )

    official_version = str(official["tag_name"]).removeprefix("dsh-v")
    port_tag = str(port["tag_name"])
    port_version = port_tag.removeprefix("v")
    port_asset = apk_asset(port)
    port_kernel = embedded_kernel(port_asset["browser_download_url"])

    ready = version_key(port_kernel) >= version_key(official_version)
    desired_app_version = f"{port_version}.1"
    ours_version = (
        str(ours["tag_name"]).removeprefix("v") if ours is not None else "0.0.0"
    )
    should_build = ready and version_key(desired_app_version) > version_key(ours_version)

    status = {
        "official_tag": official["tag_name"],
        "official_version": official_version,
        "official_published_at": official.get("published_at"),
        "port_tag": port_tag,
        "port_version": port_version,
        "port_kernel": port_kernel,
        "port_published_at": port.get("published_at"),
        "android_ready": ready,
        "latest_auto_release": ours["tag_name"] if ours is not None else "",
        "desired_app_version": desired_app_version,
        "should_build": should_build,
        "state": (
            "ready"
            if should_build
            else "current"
            if ready
            else "waiting_for_android_adaptation"
        ),
    }

    if args.json:
        print(json.dumps(status, indent=2, ensure_ascii=False))
    else:
        print(
            "official={official_version} port={port_tag} "
            "port_kernel={port_kernel} state={state}".format(**status)
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
