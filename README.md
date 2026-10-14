# FileCryptoQt

Ứng dụng Qt 6/C++ mã hóa và giải mã mọi loại tệp (văn bản, hình ảnh, video) bằng OpenSSL.

## Thuật toán

- AES-256-CBC
- AES-256-GCM
- ChaCha20-Poly1305

Khóa 256-bit được dẫn xuất từ mật khẩu bằng PBKDF2-HMAC-SHA256 với salt ngẫu nhiên và 200.000 vòng. GCM và ChaCha20-Poly1305 kiểm tra tính toàn vẹn của dữ liệu bằng thẻ xác thực.

## Biên dịch

```bash
cmake -S . -B build
cmake --build build
```

Mở trực tiếp `CMakeLists.txt` trong Qt Creator cũng được. Yêu cầu Qt 6 và OpenSSL.
Giao diện nằm trong `mainwindow.ui`; mở tệp này bằng Qt Designer để chỉnh sửa bằng thao tác kéo thả.

## Sử dụng

1. Kéo thả tệp từ Finder vào cửa sổ, hoặc nhấn **Mở tệp** để chọn văn bản, ảnh hay video.
2. Chọn thuật toán, nhập mật khẩu tối thiểu 8 ký tự.
3. Nhấn **Mã hóa**. Tệp kết quả có đuôi `.fcq`.
4. Muốn khôi phục, chọn tệp `.fcq`, nhập đúng mật khẩu rồi nhấn **Giải mã**.

Sau khi xử lý, vùng **Kết quả** hiển thị dữ liệu mã hóa dạng HEX hoặc nội dung văn bản vừa giải mã. Hai nút bên dưới cho phép mở tệp kết quả và thư mục chứa tệp.

Không xóa tệp gốc trước khi đã thử giải mã và kiểm tra kết quả.
