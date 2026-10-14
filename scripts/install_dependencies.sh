#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y build-essential cmake ninja-build pkg-config qt6-base-dev qt6-multimedia-dev libssl-dev libgl1-mesa-dev
echo "Debian dependencies installed."
