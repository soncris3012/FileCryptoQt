# Kali Linux

Nhánh `linux-kali` dành cho Kali Rolling và môi trường phòng lab bảo mật. Ứng dụng minh họa mã hóa tệp, xác thực bản mã và phát hiện chỉnh sửa; không thay thế công cụ quản lý khóa chuyên dụng.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Script chỉ cài gói build/Qt/OpenSSL cần thiết, không thay đổi bộ công cụ pentest của Kali.
