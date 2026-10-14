# Debian

Nhánh `linux-debian` hướng tới Debian Stable x86_64, ưu tiên độ ổn định và khả năng triển khai lâu dài trên workstation hoặc máy chủ có giao diện.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Nếu máy chủ không có desktop, phần mã hóa vẫn build được nhưng giao diện Qt và xem video cần phiên đồ họa cùng backend multimedia.
