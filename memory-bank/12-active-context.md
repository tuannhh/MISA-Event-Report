# 12 — Ngữ cảnh đang làm và việc tiếp theo

Cập nhật 16/10/2026. Đây là yêu cầu trực tiếp của chủ dự án; không tự coi là hoàn thành nếu code chưa có. Tài liệu này giúp tiếp tục công việc sau khi bàn giao/đổi phiên.

## Đã triển khai trong source

- Baseline import Excel/CSV/Sheet, snapshots, KPI, bảng/chart, Gemini, sync, PNG và quyền owner/editor/viewer.
- Ô KPI “Tỷ lệ C-Level” dùng tổng đăng ký / tổng mục tiêu theo chỉ định mới, dù tên nhãn vẫn là C-Level.
- Excel báo cáo theo bộ lọc và lựa chọn report, gồm kỳ so sánh; không phải export raw lead.
- Toggle % trên cột/piece; chọn chiều nguồn để xem chart/table.
- Nhiều cột nguồn khách nhận diện từ header bằng Gemini, fallback có thông báo, chọn lại trước commit; filter AND, dữ liệu cũ có fallback source/tracking.
- Slug URL ổn định, suffix 6 ký tự hex, migration v2; các trang tong-quan/du-lieu/nguon-du-lieu/muc-tieu/thanh-vien/nhat-ky.
- Memory bank theo MISA Backend Standard. Kết quả test/deploy cuối cùng ghi ở VERIFICATION.md.

## Chưa triển khai — vẫn còn trong phạm vi yêu cầu

| Yêu cầu | Tiêu chí cần hoàn tất |
|---|---|
| Ngày/số Việt Nam toàn UI | dd/mm/yyyy, nghìn '.', thập phân ','; hiện số đã vi-VN, date picker chưa đồng nhất |
| MISA Design System | Dùng skill/component repo do chủ dự án cấp; desktop/mobile composition đúng chuẩn, test viewport và keyboard |
| Mobile như native | Bottom navigation, safe area, thao tác chạm và draft state; chưa có native host kiểm chứng |
| Import thành viên Excel | Hai trường Họ và tên, Email; user chung nhiều event; import cấp editor riêng sự kiện; không reset mật khẩu user cũ |
| Viewer mặc định | Mọi người đăng nhập xem mọi sự kiện, không edit; khác quyền đọc v1 |
| Editor | Cập nhật thông tin/dữ liệu riêng sự kiện được cấp quyền |
| Admin sự kiện | Editor + thêm/import editor đúng sự kiện; không tự cấp admin/super admin |
| Super admin | Toàn ứng dụng; provision bmtuan@misa.com.vn bằng secret ngoài Git; mật khẩu ban đầu đã được cung cấp riêng trong phiên làm việc |
| Không gửi lời mời | Thay luồng invite bằng tạo tài khoản/membership, không phụ thuộc mail server |
| Domain MISA | Chỉ misa.com.vn và subdomain thực của misa.com.vn, chống suffix giả |
| Mật khẩu | Mặc định do chủ dự án cấp ngoài Git; bắt đổi lần đầu; mới ≥10 ký tự, chữ thường/hoa/số/đặc biệt; user đổi được mật khẩu |
| Online/offline/hybrid | Cấu hình kiểu sự kiện, lưu hình thức từng đăng ký, lọc/tổng hợp từng hình thức; dữ liệu không rõ giữ Chưa xác định |
| Máy chủ và IP MISA | Backend trên server MISA; chưa có địa chỉ server hoặc allowlist IP, chưa deploy/chặn IP |

Không lưu lại mật khẩu cụ thể trong memory bank; lấy từ kênh bàn giao bảo mật khi triển khai provisioning. Tài khoản bootstrap hiện tại không tự trở thành super admin khi đổi env.

## Quyết định nghiệp vụ đã chốt

Giữ mặc định mỗi dòng là một đăng ký, C-Level CEO/Giám đốc + Chủ doanh nghiệp, lọc thời gian submit UTC+7; cấu hình được chỉnh trong sự kiện. Mục tiêu tổng và mục tiêu chi tiết độc lập, chênh lệch phải hiển thị cảnh báo. Snapshot cũ không bị sửa; lọc/so sánh dùng cùng quy tắc hiện tại.

## Thứ tự tiếp tục

1. Backup DB local ngoài Git và thử restore trước migration quyền.
2. Thiết kế migration roles/account/force-change; giữ membership/data hiện có và thu hồi quyền không hợp lệ. Kiểm tra server authorization ở mọi route, không chỉ UI.
3. Import thành viên có preview/validation/duplicates; tests user nhiều event và admin không nâng quyền.
4. Hình thức online/offline và dữ liệu chưa xác định; tests tổng không đếm trùng theo cấu hình.
5. Chuyển frontend sang MDS từ repo đã cài, giữ API/business logic; date/number thống nhất.
6. Cấu hình MISA server/TLS/proxy/IP khi nhận được thông tin; kiểm chứng chống spoof, backup và tải trước production.

## Đánh giá chuẩn backend còn mở

Chưa có config JSON theo môi trường, chưa tách hết route/controller/service, một số audit không atomic, limiter trong RAM, chưa có restore drill/retention/RPO/RTO, chưa kiểm tra tải production. CI được thêm để chạy kiểm thử tự động; không thay thế review bảo mật và production acceptance. Managed Agent Runtime chưa deploy; hiện gọi Gemini REST model.
