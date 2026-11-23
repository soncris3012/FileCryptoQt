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

## Nhánh theo kiến trúc CPU

- [`macos-intel`](https://github.com/soncris3012/FileCryptoQt/tree/macos-intel): build riêng cho Mac Intel `x86_64`, tạo `FileCryptoQt-macOS-Intel.dmg`.
- [`macos-silicon`](https://github.com/soncris3012/FileCryptoQt/tree/macos-silicon): build native cho Apple Silicon `arm64`, tạo `FileCryptoQt-macOS-Apple-Silicon.dmg`.

Hai nhánh con đều xuất phát từ `macos`. Mỗi nhánh ép kiến trúc trong CMake, dùng thư viện Qt/OpenSSL cùng kiến trúc và kiểm tra executable bằng `lipo` trước khi tạo DMG.
