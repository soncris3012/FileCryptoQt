#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
qt_prefix="${QT_PREFIX:-$(brew --prefix qt)}"
openssl_prefix="${OPENSSL_ROOT_DIR:-$(brew --prefix openssl@3)}"
cmake -S "$root_dir" -B "$root_dir/build-macos" -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="$qt_prefix" -DOPENSSL_ROOT_DIR="$openssl_prefix"
cmake --build "$root_dir/build-macos" -j
"$qt_prefix/bin/macdeployqt" "$root_dir/build-macos/FileCryptoQt.app"
mkdir -p "$root_dir/dist"
hdiutil create -volname FileCryptoQt -srcfolder "$root_dir/build-macos/FileCryptoQt.app" -ov -format UDZO "$root_dir/dist/FileCryptoQt-macOS.dmg"
echo "Created dist/FileCryptoQt-macOS.dmg"
