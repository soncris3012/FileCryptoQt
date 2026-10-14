# Ubuntu

Nhánh `linux-ubuntu` dành cho Ubuntu Desktop/LTS x86_64. Đây là lựa chọn thuận tiện cho người mới vì Qt 6, OpenSSL và multimedia có sẵn trong kho APT.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Khuyến nghị Ubuntu 22.04 LTS trở lên. Wayland và X11 đều dùng được thông qua Qt platform plugin.
