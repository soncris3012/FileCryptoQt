#!/usr/bin/env bash
set -euo pipefail
sudo apt update
sudo apt install -y build-essential cmake ninja-build pkg-config qt6-base-dev qt6-multimedia-dev libssl-dev libgl1-mesa-dev gstreamer1.0-plugins-good gstreamer1.0-libav
echo "Pop!_OS dependencies installed."
