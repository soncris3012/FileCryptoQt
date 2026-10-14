# Pop!_OS

Nhánh `linux-popos` dành cho Pop!_OS x86_64, phù hợp workstation đồ họa và máy có GPU rời. CryptoLab không phụ thuộc CUDA; GPU chỉ ảnh hưởng khả năng phát video của hệ thống.

```bash
./scripts/install_dependencies.sh
cmake --preset linux-release
cmake --build --preset linux-release
./build-linux/FileCryptoQt
```

Gói OpenGL và GStreamer được cài để hỗ trợ vùng xem ảnh/video trên COSMIC hoặc GNOME.
