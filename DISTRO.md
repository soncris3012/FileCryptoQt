# elementary OS

Nhánh `linux-elementary` dành cho elementary OS x86_64. Giao diện Qt dùng Fusion/dark theme riêng nên không phụ thuộc GTK theme của Pantheon.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Khi chạy trên Wayland, Qt tự chọn plugin phù hợp; có thể đặt `QT_QPA_PLATFORM=xcb` nếu cần kiểm tra tương thích X11.
