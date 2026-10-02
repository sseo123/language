#!/bin/sh
# Compiles the Swift helper into the sidecar binary Tauri expects:
#   src-tauri/binaries/teachya-helper-<rust target triple>
set -eu
cd "$(dirname "$0")/.."

SRC=native/helper/Helper.swift
case "$(uname -m)" in
  arm64) TRIPLE=aarch64-apple-darwin; TARGET=arm64-apple-macos14.0 ;;
  x86_64) TRIPLE=x86_64-apple-darwin; TARGET=x86_64-apple-macos14.0 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac
OUT="src-tauri/binaries/teachya-helper-$TRIPLE"

if [ -f "$OUT" ] && [ "$OUT" -nt "$SRC" ]; then
  exit 0
fi

mkdir -p src-tauri/binaries
echo "Building $OUT"
xcrun swiftc -O -parse-as-library -swift-version 5 -target "$TARGET" \
  -framework AppKit -framework AVFoundation -framework ScreenCaptureKit -framework Vision \
  -o "$OUT" "$SRC"
