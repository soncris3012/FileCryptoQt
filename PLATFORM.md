# Nhánh iOS — FileCrypto iOS (CryptoLab Apple Native)

Nhánh này cung cấp phiên bản iOS & iPadOS native của FileCryptoQt được xây dựng hoàn toàn bằng **Swift 6 & SwiftUI**, tương thích 100% với định dạng tệp FCQ2 và FCQ1 của bản Desktop và Web.

## Tính năng nổi bật

- **Tăng tốc phần cứng bằng Apple CryptoKit**:
  - `AES-256-GCM`: Sử dụng trực tiếp `CryptoKit.AES.GCM` tối ưu hóa trên kiến trúc Apple Silicon / chip dòng A của iPhone/iPad.
  - `ChaCha20-Poly1305`: Sử dụng `CryptoKit.ChaChaPoly` theo chuẩn RFC 8439.
  - `AES-256-CBC + HMAC-SHA256`: Sử dụng `CommonCrypto` với PKCS#7 padding và mô hình Encrypt-then-MAC qua PBKDF2 200.000 vòng.
- **Tích hợp sâu hệ điều hành iOS**:
  - **Tệp (Files app & iCloud Drive)**: Mở và lưu tệp trực tiếp qua `.fileImporter` và `.fileExporter`.
  - **Chia sẻ & AirDrop**: Chia sẻ tệp `.fcq` hoặc tệp sau khi giải mã sang các thiết bị Mac, iPhone khác qua AirDrop hoặc các ứng dụng khác.
  - **Kéo & thả (Drag and Drop)**: Hỗ trợ kéo thả tệp mượt mà trên iPadOS và iPhone (iOS 16+).
- **Trình xem trước tệp đa năng (File Preview)**:
  - Xem văn bản (với số dòng và định dạng code).
  - Xem hình ảnh (PNG, JPG, HEIC, WebP, GIF).
  - Trình phát Video / Âm thanh tích hợp qua `AVKit` / `VideoPlayer`.
  - Trình xuất bảng nhị phân HEX 16 cột kèm cột ASCII tương đương bản Desktop Qt.
- **Mô phỏng đường truyền (Transmission View)**:
  - Hiệu ứng trực quan hóa tiến trình truyền tải dữ liệu và biến đổi mật mã với hoạt họa chuyển động mượt mà.
- **Bảo mật tuyệt đối**:
  - Không kết nối Internet, không gửi dữ liệu ra ngoài, toàn bộ quá trình mã hóa/giải mã diễn ra hoàn toàn offline trên thiết bị.

## Yêu cầu môi trường

- **iOS / iPadOS**: Phiên bản 16.0 trở lên.
- **macOS để build**: macOS 13 (Ventura) trở lên.
- **Xcode**: Phiên bản 15 hoặc 16 với Swift 6.

## Hướng dẫn mở dự án và Build

### Cách 1: Mở trực tiếp bằng Xcode (Khuyến nghị)
Mở Xcode, chọn **File > Open**, sau đó điều hướng đến thư mục `ios` hoặc mở file `ios/Package.swift`.
- Chọn thiết bị mục tiêu: iPhone Simulator (ví dụ: iPhone 15 Pro / iPhone 16) hoặc thiết bị thật của bạn.
- Nhấn `Cmd + R` để Build và Run.

### Cách 2: Chạy kiểm thử tự động từ dòng lệnh
```bash
./scripts/build_ios.sh
```
Script sẽ biên dịch mã nguồn Swift với trình biên dịch `swiftc` và thực thi toàn bộ bộ kiểm thử round-trip cho cả 3 thuật toán mật mã.

## Cấu trúc thư mục nhánh `ios`

```text
ios/
├── FileCrypto/
│   ├── FileCryptoApp.swift        # Điểm khởi chạy ứng dụng SwiftUI
│   ├── Info.plist                 # Khai báo quyền và Document Types
│   ├── Models/
│   │   └── CryptoEngine.swift     # Động cơ mật mã CryptoKit + CommonCrypto
│   ├── ViewModels/
│   │   └── CryptoViewModel.swift  # Quản lý luồng xử lý và dữ liệu giao diện
│   └── Views/
│       ├── ContentView.swift      # TabView chính kết nối các màn hình
│       ├── EncryptView.swift      # Giao diện mã hóa tệp
│       ├── DecryptView.swift      # Giao diện giải mã tệp
│       ├── InspectView.swift      # Giao diện soi cấu trúc Header FCQ
│       ├── FilePreviewView.swift  # Trình xem trước Text, Media, Hex
│       └── TransmissionView.swift # Hoạt họa mô phỏng đường truyền
├── Package.swift                  # Cấu hình Swift Package Manager
└── Tests/
    └── CryptoEngineTests.swift    # Bộ kiểm thử đơn vị tự động
```
