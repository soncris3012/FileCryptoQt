# Linux Mint

Nhánh `linux-mint` dành cho Linux Mint Cinnamon/MATE/Xfce dựa trên Ubuntu. Giao diện CryptoLab hoạt động tự nhiên với desktop truyền thống và trình quản lý tệp Nemo/Caja/Thunar.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Kéo thả tệp hoặc thư mục từ trình quản lý tệp vào cửa sổ được hỗ trợ.
