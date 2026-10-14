# macOS Intel — x86_64

Nhánh `macos-intel` được tách từ `macos` và ép toàn bộ dự án build cho kiến trúc Intel `x86_64`.

## Máy phù hợp

- Mac Intel chạy macOS 12 trở lên.
- Apple Silicon cần tạo bản Intel để chạy qua Rosetta 2.

## Phụ thuộc

Qt và OpenSSL phải có thư viện `x86_64`. Trên Mac Intel, Homebrew mặc định ở `/usr/local`. Không trộn thư viện ARM64 từ `/opt/homebrew` với build Intel.

```bash
cmake --preset macos-intel-release
cmake --build --preset macos-intel-release
./scripts/build_macos.sh
```

Script xác minh executable cuối bằng `lipo -info` và tạo `dist/FileCryptoQt-macOS-Intel.dmg`.
