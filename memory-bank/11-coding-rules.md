# 11 — Quy tắc riêng của dự án

Áp dụng [MISA Backend Standard](https://github.com/tuannhh/misa-backend-standard/tree/a940384030f86224a8775b82c4f72ee592104800). Dưới đây là bổ sung riêng; không thay thế quy chuẩn chung.

1. Số liệu bảng/chart được tính xác định tại backend. Gemini chỉ gợi ý mapping và diễn giải; lỗi AI không được thay bằng nội dung giả.
2. Mặc định mỗi dòng là một lượt đăng ký; C-Level gồm CEO/Giám đốc và Chủ doanh nghiệp. Cấu hình được sửa riêng từng sự kiện. UTC+7, lọc theo thời gian submit, bao gồm ngày đầu/cuối.
3. Luôn ghi rõ tử số/mẫu số. Theo yêu cầu trực tiếp 16/10/2026, ô KPI có nhãn “Tỷ lệ C-Level” trên tổng quan phải dùng **tổng lượt đăng ký / tổng mục tiêu sự kiện**. Đây là nhãn nghiệp vụ được yêu cầu, cùng công thức với “Hoàn thành mục tiêu”; không dùng để thay nghĩa trường `clevel_share` của API/bảng chi tiết.
4. Giữ bản nhập cũ khi nguồn lỗi; thay active snapshot và lưu dữ liệu trong cùng transaction. Truy vấn snapshot/import phải gắn event_id, staging còn gắn user_id.
5. Phải phân biệt data registration với tài khoản thành viên của ứng dụng. Import lead không được tạo tài khoản đăng nhập.
6. Bốn cấp quyền v3 đã triển khai; bảo vệ backend và kiểm tra quyền lại ở mỗi request. Các gap còn lại nằm trong [12](12-active-context.md).
7. MISA UI phải theo repo design system được cung cấp. Thay đổi nhỏ về công thức không đồng nghĩa toàn bộ UI đã chuyển MDS. Không dùng XDS thay yêu cầu MISA.
8. Không đưa khóa Google, mật khẩu bàn giao, runtime.env, bản dump hoặc thông tin lead vào Git. Thông tin đăng nhập do người dùng cấp chỉ cấu hình ngoài source.
9. Test tích hợp phải dùng DB riêng. Không đổi tên Compose project/volume đang có chỉ vì đổi tên repository.
10. Không đánh dấu production-ready khi chưa có kiểm chứng phân quyền mới, ingress/IP, backup/restore, và những mục còn mở ở active context.

## Checklist khi hoàn tất thay đổi

- [ ] Hành vi khớp yêu cầu và dữ liệu gốc; đã xác minh nhánh lỗi/biên liên quan.
- [ ] API/schema/nghiệp vụ/UI và lịch sử được cập nhật đúng phạm vi.
- [ ] Migration thực thi đi cùng mọi thay đổi DB.
- [ ] Test chạy trên đúng môi trường; phân biệt kết quả cũ và kết quả mới.
- [ ] Diff/index không có secrets hoặc dữ liệu khách hàng.
- [ ] Báo rõ các yêu cầu chưa triển khai; không chứng nhận tuân thủ toàn bộ chỉ từ tài liệu.
