# Nhánh Linux

Nhánh này dành cho Linux x86_64. Cấu hình đã kiểm tra theo gói Qt 6 của Ubuntu/Debian; các bản phân phối khác dùng tên gói tương đương.

## Phụ thuộc và build

```bash
sudo apt install build-essential cmake ninja-build qt6-base-dev qt6-multimedia-dev libssl-dev
cmake --preset linux-release
cmake --build --preset linux-release
```

## Đóng gói

```bash
./scripts/build_linux.sh
```

Khi có `linuxdeploy`, script tạo AppImage. Nếu chưa cài `linuxdeploy`, script tạo gói `tar.gz` từ AppDir. Hệ thống cần backend multimedia phù hợp để phát video trong phần xem trước.

## Nhánh theo bản phân phối

- `linux-debian`
- `linux-ubuntu`
- `linux-mint`
- `linux-kali`
- `linux-popos`
- `linux-zorin`
- `linux-elementary`

Mỗi nhánh con có `DISTRO.md` và `scripts/install_dependencies.sh` phù hợp với bản phân phối tương ứng.
