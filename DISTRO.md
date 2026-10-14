# Zorin OS

Nhánh `linux-zorin` dành cho Zorin OS x86_64. Cấu hình ưu tiên trải nghiệm desktop và đóng gói AppImage để dễ chạy mà không cần cài thủ công nhiều tệp Qt.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Sau khi build, chạy `./scripts/build_linux.sh` để tạo AppImage nếu đã cài `linuxdeploy`.
