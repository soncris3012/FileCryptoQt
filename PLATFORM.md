# Nhánh macOS

Nhánh này dành cho macOS 12 trở lên, ưu tiên Apple Silicon nhưng cũng build được Intel khi Qt/OpenSSL cùng kiến trúc.

## Phụ thuộc

```bash
brew install qt openssl@3 cmake
```

## Build ứng dụng

```bash
cmake --preset macos-release
cmake --build --preset macos-release
```

## Đóng gói DMG

```bash
./scripts/build_macos.sh
```

Script chạy `macdeployqt` để chép Qt frameworks/plugins vào app bundle rồi dùng `hdiutil` tạo `dist/FileCryptoQt-macOS.dmg`. Bản phát hành công cộng nên được ký Developer ID và notarize trước khi phân phối.
