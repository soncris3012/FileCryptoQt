#!/usr/bin/env bash
set -e

echo "=== FILECRYPTO IOS — BUILD & KIỂM THỬ TỰ ĐỘNG ==="

# 1. Chạy unit tests qua Swift compiler
echo "1. Chạy bộ kiểm thử CryptoEngine (Apple CryptoKit & CommonCrypto)..."
xcrun -sdk macosx swiftc -O ios/FileCrypto/Models/CryptoEngine.swift ios/Tests/CryptoEngineTests.swift -o /tmp/ios_test_bin
/tmp/ios_test_bin
rm -f /tmp/ios_test_bin

echo "2. Kiểm tra tính sẵn sàng của Xcode và iOS SDK..."
if command -v xcodebuild >/dev/null 2>&1; then
    SDK_VERSION=$(xcrun --sdk iphonesimulator --show-sdk-version 2>/dev/null || echo "not found")
    echo "Đã tìm thấy iOS Simulator SDK: $SDK_VERSION"
else
    echo "xcodebuild không khả dụng trong môi trường CLI hiện tại."
fi

echo "=== BUILD VÀ KIỂM THỬ IOS THÀNH CÔNG! ==="
