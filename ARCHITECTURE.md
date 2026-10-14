# macOS Apple Silicon — arm64

Nhánh `macos-silicon` được tách từ `macos` và tối ưu native cho Apple Silicon `arm64`.

## Máy phù hợp

- Mac dùng chip Apple M1, M2, M3, M4 hoặc thế hệ Apple Silicon mới hơn.
- macOS 12 trở lên.

Homebrew ARM64 thường ở `/opt/homebrew`; Qt và OpenSSL phải cùng kiến trúc `arm64`.

```bash
cmake --preset macos-silicon-release
cmake --build --preset macos-silicon-release
./scripts/build_macos.sh
```

Script xác minh executable cuối bằng `lipo -info` và tạo `dist/FileCryptoQt-macOS-Apple-Silicon.dmg`.
