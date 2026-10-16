# 01 — Tổng quan dự án

MISA Event Report giúp nhân viên quản lý sự kiện nhập dữ liệu contact/lead từ Excel hoặc Google Sheet, tổng hợp báo cáo mục tiêu, chức vụ, quy mô và nguồn đăng ký, xuất ảnh gửi ban tổ chức. Hiện không có connector trực tiếp vào hệ thống lead MISA; dữ liệu đi qua file hoặc Sheet.

Người phụ trách: chủ dự án trong phiên làm việc, tài khoản quản trị mong muốn `bmtuan@misa.com.vn`. Không lưu mật khẩu trong tài liệu/Git. Chưa xác định đầu mối vận hành máy chủ hoặc lịch backup sản xuất.

## Trạng thái và môi trường

| Môi trường | Địa chỉ | Dữ liệu | Trạng thái |
|---|---|---|---|
| Local | http://localhost:8096 | PostgreSQL 16, volume riêng của Compose | Bản v3 đã chạy Docker |
| Kiểm thử | http://localhost:8097 khi tạo QA stack | Database/volume riêng, dữ liệu tổng hợp QA | Tạo theo nhu cầu, không dùng DB local |
| Máy chủ MISA | Chưa được cung cấp | Chưa xác định | Đích triển khai mới; chờ máy chủ và IP |
| Cloud Run | Chưa có URL | Dự kiến Cloud SQL | Chỉ có tài liệu/script, chưa deploy |

Mỗi sự kiện là tenant cho dữ liệu/quyền ghi. Mọi tài khoản MISA đăng nhập xem tất cả sự kiện (Viewer). Editor/Admin được cấp riêng từng sự kiện; Super admin quản lý toàn ứng dụng. Tài khoản mới bắt đổi mật khẩu; import Excel cấp Editor không gửi lời mời.

## Quy trình điển hình hiện có

1. Đăng nhập; tạo/chọn sự kiện.
2. Nhập file hoặc Sheet, chọn tab/dòng tiêu đề, ghép cột, xem trước rồi xác nhận.
3. Đặt mục tiêu/tracking, C-Level và quy tắc gộp trùng cho sự kiện.
4. Xem phiên dữ liệu mới nhất hoặc lịch sử, lọc thời gian submit và so sánh hai kỳ.
5. Chọn báo cáo dạng bảng/biểu đồ, lấy nhận xét AI hoặc xuất PNG.
6. Admin thêm/import Editor bằng Excel Họ và tên, Email; Super admin cấp Admin. Tài khoản dùng nhiều sự kiện.

Nguồn mẫu do chủ dự án cấp đã được dùng kiểm tra v1, không đưa bản sao lead hoặc thông tin định danh của khách hàng vào repository. Chi tiết kiểm tra tổng hợp có trong VERIFICATION.md.
