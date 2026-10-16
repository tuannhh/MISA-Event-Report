# Kiểm chứng bản v3 — 16/10/2026

## Đã kiểm tra

- Docker multi-stage Vite build thành công; backend Node24/PostgreSQL16.4.
- 15/15 tests đạt trên QA localhost:8097 riêng: miền email/password policy, ngày UTC+7, dedup, nguồn AND, slug, XLSX parser, report export, full integration bốn cấp quyền/forced change/member Excel/cross-event write isolation/attendance modes/session revoke.
- UI browser nguồn a: total4→2, completion40%→20% ngay khi chọn. Desktop MDS header/sidebar; mobile composition không header/sidebar desktop.
- Mobile 320/360/390/430/768: root không tràn ngang, document height bằng viewport. Ngày đăng ký hiển thị14/10/2026,15/10/2026. Chi tiết phạm vi UI-VERIFICATION.md.
- Backup pg_dump custom trước migration; pg_restore --exit-on-error vào events_restore_check thành công. Main và restored DB đều1event/2snapshots/134active rows; main sau migration schema3, dữ liệu giữ nguyên.
- Bản local localhost:8096 đã nâng schema3 và UI mới, không đổi Compose project/volume. Session cũ bị thu hồi theo migration. Super admin bắt đổi mật khẩu ở lần đăng nhập đầu.
- npm install audit tại thời điểm thực hiện:0 vulnerabilities.

## Giới hạn

MISA server/IP allowlist chưa triển khai do thiếu máy chủ và danh sách IP. Cloud Run/managed Agent Runtime chưa deploy. Mobile native host/OS accessibility chưa kiểm chứng; không gọi production-ready hoặc compliant toàn bộ MDS/backend standard. Rate limiter RAM, draft restore và một số audit atomic tiếp tục ở active context.
