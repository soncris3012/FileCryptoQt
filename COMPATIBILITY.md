# Windows XP

Nhánh `winxp` được tách trực tiếp từ `windows` để theo dõi bản chuyển đổi dành cho Windows XP.

Qt 6, Visual Studio 2022 và OpenSSL hiện tại không chạy trên Windows XP. Vì vậy mã nguồn gốc được giữ làm chuẩn đối chiếu, còn bản XP cần một cổng legacy riêng với Qt 5.6.3/MinGW tương thích XP, thư viện mật mã tương thích và thay phần xem video theo backend cũ. Không dùng gói build Qt 6 hiện tại trên XP.

Trạng thái: nhánh nền cho công việc chuyển đổi legacy; chưa phát hành binary vì chưa thể xác nhận an toàn và tương thích trên máy XP thật.
