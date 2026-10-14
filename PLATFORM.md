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
