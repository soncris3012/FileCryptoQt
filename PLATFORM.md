# Nhánh Windows

Nhánh này dành cho Windows 10/11 x64 với Visual Studio 2022 và Qt 6 MSVC.

## Phụ thuộc

- Visual Studio 2022, workload **Desktop development with C++**.
- Qt 6 MSVC 2022 64-bit, gồm Qt Multimedia.
- OpenSSL x64 và CMake 3.21 trở lên.

Đặt `QT_PREFIX`, ví dụ `C:\Qt\6.8.0\msvc2022_64`, rồi build:

```powershell
cmake --preset windows-release
cmake --build --preset windows-release
```

## Đóng gói

```powershell
.\scripts\build_windows.ps1
```

Script dùng `windeployqt` để chép DLL, plugin multimedia và platform plugin, sau đó tạo `dist\FileCryptoQt-Windows-x64.zip`.

## Nhánh theo phiên bản Windows

| Nhánh | Mục tiêu | Trạng thái nền tảng |
|---|---|---|
| [`win11`](https://github.com/soncris3012/FileCryptoQt/tree/win11) | Windows 11 x64 | Qt 6, Visual Studio 2022 |
| [`win10`](https://github.com/soncris3012/FileCryptoQt/tree/win10) | Windows 10 x64 | Qt 6, Visual Studio 2022 |
| [`win8`](https://github.com/soncris3012/FileCryptoQt/tree/win8) | Windows 8/8.1 x64 | Cần cổng Qt 5.15 và kiểm thử thật |
| [`win7`](https://github.com/soncris3012/FileCryptoQt/tree/win7) | Windows 7 SP1 x64 | Cần cổng Qt 5.15 và kiểm thử thật |
| [`winvista`](https://github.com/soncris3012/FileCryptoQt/tree/winvista) | Windows Vista | Cần toolchain legacy |
| [`winxp`](https://github.com/soncris3012/FileCryptoQt/tree/winxp) | Windows XP | Cần Qt/toolchain legacy dành cho XP |

Các nhánh con đều xuất phát từ `windows`. `win10` và `win11` dùng trực tiếp mã Qt 6 hiện tại; các hệ đã hết vòng đời được giữ thành nhánh chuyển đổi riêng để tránh tuyên bố tương thích khi chưa có môi trường kiểm thử phù hợp.
