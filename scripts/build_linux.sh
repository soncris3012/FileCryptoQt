#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
cmake -S "$root_dir" -B "$root_dir/build-linux" -DCMAKE_BUILD_TYPE=Release
cmake --build "$root_dir/build-linux" -j
cmake --install "$root_dir/build-linux" --prefix "$root_dir/AppDir/usr"
mkdir -p "$root_dir/dist"
if command -v linuxdeploy >/dev/null 2>&1; then
  linuxdeploy --appdir "$root_dir/AppDir" --executable "$root_dir/AppDir/usr/bin/FileCryptoQt" --output appimage
  mv ./*.AppImage "$root_dir/dist/FileCryptoQt-Linux-x86_64.AppImage"
  echo "Created dist/FileCryptoQt-Linux-x86_64.AppImage"
else
  tar -C "$root_dir/AppDir" -czf "$root_dir/dist/FileCryptoQt-Linux-x86_64.tar.gz" .
  echo "linuxdeploy not found; created dist/FileCryptoQt-Linux-x86_64.tar.gz"
fi
