# Nhánh Web — FileCrypto Web (CryptoLab Online)

Nhánh này cung cấp phiên bản web 100% chạy client-side trong trình duyệt của FileCryptoQt. Toàn bộ quá trình mã hóa, dẫn xuất khóa PBKDF2 và xác thực tính toàn vẹn diễn ra trực tiếp trên thiết bị của người dùng thông qua **Web Crypto API** (`crypto.subtle`) và thuật toán **RFC 8439 pure JavaScript**, đảm bảo zero-server leak và quyền riêng tư tuyệt đối.

## Tính năng

- **Định dạng FCQ2 & FCQ1 tương thích 100%**:
  - Tệp `.fcq` được mã hóa từ bản desktop (Qt/C++/OpenSSL) hoặc iOS (Swift/CryptoKit) đều có thể giải mã chuẩn xác trên Web và ngược lại.
- **Ba thuật toán tiêu chuẩn**:
  - `AES-256-GCM`: Chế độ AEAD với tăng tốc phần cứng trình duyệt, tag 128 bit và AAD bảo vệ metadata.
  - `ChaCha20-Poly1305`: Triển khai chuẩn RFC 8439 thuần JavaScript, chạy mượt mà trên mọi thiết bị và hệ điều hành.
  - `AES-256-CBC + HMAC-SHA256`: Mô hình Encrypt-then-MAC với 64 byte key material dẫn xuất từ PBKDF2 200.000 vòng.
- **Xem trước tệp (File Preview)**:
  - Xem trước văn bản (kèm số dòng và định dạng code).
  - Trình xem ảnh với đầy đủ metadata.
  - Trình phát Video/Audio HTML5 tích hợp.
  - Trình xuất bảng nhị phân HEX 16 cột kèm vùng ký tự ASCII tương đương bản Desktop Qt.
- **Mô phỏng đường truyền (Transmission Simulator)**:
  - Canvas động tái hiện luồng hạt bit chuyển động giữa nút Nguồn, Nút Động cơ mật mã và Nút Dữ liệu truyền.
- **Phân tích Header FCQ (Inspect)**:
  - Xem thông tin thuật toán, tên tệp gốc, loại MIME và kích thước payload mà không cần nhập mật khẩu.
- **Bộ tự kiểm thử trực tiếp (In-Browser Self-Test)**:
  - Chạy kiểm thử round-trip và bẫy can thiệp dữ liệu tự động ngay trên giao diện.

## Chạy thử nghiệm cục bộ

Không cần cài đặt phức tạp, chỉ cần Node.js hoặc Python:

### Cách 1: Dùng script tự động
```bash
./scripts/serve.sh 3000
```
Mở trình duyệt tại: `http://localhost:3000`

### Cách 2: Dùng npm
```bash
npm start
```

### Cách 3: Chạy bộ kiểm thử tự động
```bash
npm test
```

## Triển khai (Deploy)

Vì là ứng dụng thuần tĩnh (Static Web App), bạn có thể triển khai lên bất kỳ dịch vụ lưu trữ miễn phí nào:
- **GitHub Pages**: Bật GitHub Pages trỏ vào nhánh `web` thư mục root.
- **Cloudflare Pages / Vercel / Netlify**: Triển khai trực tiếp không cần build command, thư mục xuất bản là root `./`.
- **Nginx / Apache / Caddy**: Đặt các tệp `index.html`, `css/`, `js/` vào thư mục web root.
