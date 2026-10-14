# FileCryptoQt

Ứng dụng Qt 6/C++ mã hóa và giải mã mọi loại tệp bằng OpenSSL, có xem trước riêng cho văn bản, hình ảnh, video và dữ liệu nhị phân.

## Thuật toán

- AES-256-CBC + HMAC-SHA256 (encrypt-then-MAC)
- AES-256-GCM
- ChaCha20-Poly1305

Khóa được dẫn xuất từ mật khẩu bằng PBKDF2-HMAC-SHA256 với salt ngẫu nhiên và 200.000 vòng. Cả ba chế độ đều kiểm tra tính toàn vẹn: GCM và ChaCha20-Poly1305 dùng thẻ AEAD; CBC dùng khóa HMAC riêng. Metadata (tên, MIME, thuật toán) cũng được xác thực.

Định dạng `FCQ2` lưu tên và loại tệp gốc để khôi phục đúng phần mở rộng. Ứng dụng vẫn đọc được tệp `FCQ1` đã tạo bởi phiên bản trước.

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

Giao diện chạy mã hóa trong luồng nền, có hiệu ứng tiến trình và mô phỏng đường truyền. Sau giải mã, ảnh được hiển thị trực tiếp, video/âm thanh có nút phát, văn bản hiện nội dung và tệp khác hiện HEX.

Toàn bộ tệp được mã hóa/giải mã theo từng khối 1 MB. Giới hạn 8 KB chỉ dành cho vùng xem trước HEX trong giao diện, không phải giới hạn dữ liệu được mã hóa.

## Kiến trúc module

- `cryptoengine`: định dạng FCQ2, dẫn xuất khóa, mã hóa, xác thực và giải mã streaming.
- `filepreview`: phân loại MIME và xem trước văn bản/ảnh/video/tệp nhị phân.
- `transmissionwidget`: mô phỏng tệp gốc, thuật toán, kênh truyền và dữ liệu phía nhận.
- `mainwindow`: điều phối giao diện, tác vụ nền và trạng thái tiến trình.

Không xóa tệp gốc trước khi đã thử giải mã và kiểm tra kết quả.
