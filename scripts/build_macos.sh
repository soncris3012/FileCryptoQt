#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
build_dir="$root_dir/build-macos-silicon"
qt_prefix="${QT_PREFIX:-$(brew --prefix qt)}"
openssl_prefix="${OPENSSL_ROOT_DIR:-$(brew --prefix openssl@3)}"
cmake -S "$root_dir" -B "$build_dir" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64 -DCMAKE_OSX_DEPLOYMENT_TARGET=12.0 -DCMAKE_PREFIX_PATH="$qt_prefix" -DOPENSSL_ROOT_DIR="$openssl_prefix"
cmake --build "$build_dir" -j
"$qt_prefix/bin/macdeployqt" "$build_dir/FileCryptoQt.app"
lipo -info "$build_dir/FileCryptoQt.app/Contents/MacOS/FileCryptoQt"
mkdir -p "$root_dir/dist"
hdiutil create -volname FileCryptoQt -srcfolder "$build_dir/FileCryptoQt.app" -ov -format UDZO "$root_dir/dist/FileCryptoQt-macOS-Apple-Silicon.dmg"
echo "Created dist/FileCryptoQt-macOS-Apple-Silicon.dmg"
