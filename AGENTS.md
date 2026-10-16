# MISA Event Report — hướng dẫn làm việc

Đọc `memory-bank/README.md`, `memory-bank/11-coding-rules.md` và `memory-bank/12-active-context.md` trước khi sửa mã. Lần đầu tiếp nhận, đọc toàn bộ memory bank.

Áp dụng [MISA Backend Standard](https://github.com/tuannhh/misa-backend-standard/tree/a940384030f86224a8775b82c4f72ee592104800), đặc biệt quy định memory bank và quy trình maintenance. Với UI, dùng bộ [MISA Design System](https://github.com/tuannhh/misa-design-system-skill) mà chủ dự án yêu cầu.

- Nội dung tài liệu phải phản ánh mã đang chạy; ghi yêu cầu chưa code vào active context, không mô tả như tính năng hoàn thành.
- Khi sửa API/schema/nghiệp vụ/bảo mật, cập nhật tài liệu tương ứng và lịch sử trong cùng thay đổi. Thay schema phải có migration thực thi.
- Không commit secrets, tài khoản/mật khẩu bàn giao, dữ liệu lead, Excel thật, DB dump, hoặc file runtime config.
- Không chạy integration tests trên database đang phục vụ người dùng. Dùng môi trường riêng và giữ nguyên volume local hiện tại.
- Tên sản phẩm/repository mới không phải lý do để đổi tên Docker project/volume; làm vậy có thể khiến ứng dụng trông như mất dữ liệu.
- Chạy kiểm tra phù hợp và báo rõ phần chưa kiểm chứng. Không tuyên bố tuân thủ toàn bộ backend/design standard khi còn khoảng trống đã ghi nhận.
