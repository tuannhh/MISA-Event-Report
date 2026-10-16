# Kiểm chứng bản v3 — 16/10/2026

## Đã kiểm tra

- Docker multi-stage Vite build thành công; backend Node24/PostgreSQL16.4.
- 15/15 tests đạt trên QA localhost:8097 riêng: miền email/password policy, ngày UTC+7, dedup, nguồn AND, slug, XLSX parser, report export, full integration bốn cấp quyền/forced change/member Excel/cross-event write isolation/attendance modes/session revoke.
- UI browser nguồn a: total4→2, completion40%→20% ngay khi chọn. Desktop MDS header/sidebar; mobile composition không header/sidebar desktop.
- Mobile 320/360/390/430/768: root không tràn ngang, document height bằng viewport. Ngày đăng ký hiển thị14/10/2026,15/10/2026. Chi tiết phạm vi UI-VERIFICATION.md.
- Backup pg_dump custom trước migration; pg_restore --exit-on-error vào events_restore_check thành công. Main và restored DB đều1event/2snapshots/134active rows; main sau migration schema3, dữ liệu giữ nguyên.
- Bản local localhost:8096 đã nâng schema3 và UI mới, không đổi Compose project/volume. Session cũ bị thu hồi theo migration. Super admin bắt đổi mật khẩu ở lần đăng nhập đầu.
- npm install audit tại thời điểm thực hiện:0 vulnerabilities.

## Bổ sung luồng đăng nhập và danh sách sự kiện

- 19/19 tests đạt trên QA riêng: thêm 4 test navigation, kiểm tra SPA entrypoints và role Viewer/Editor riêng từng event sau revoke. Docker build thành công, bản localhost:8096 được cập nhật giữ nguyên schema/volume.
- Browser QA: mở deep link khi chưa đăng nhập chuyển `/log-in`; đăng nhập về `/su-kien`; cùng tài khoản có Viewer ở một sự kiện và Editor ở sự kiện khác. Viewer không có nút Nhập dữ liệu; Editor có. Refresh giữ route hợp lệ; logout và Back sau logout đều về `/log-in`.
- Danh sách desktop có nhãn quyền, tìm tên, ngày dd/mm/yyyy. Mobile 390px dùng composition riêng; 320px document width = scroll width = 320, bộ lọc Được sửa chỉ còn sự kiện được cấp Editor.
- Ảnh bằng chứng QA: `../MISA-Event-Report-event-list.png` và `../MISA-Event-Report-event-list-mobile.png` (artifact local, dữ liệu thử nghiệm).

## Giới hạn hiện tại

MISA server/IP allowlist chưa triển khai do thiếu máy chủ và danh sách IP. Cloud Run/managed Agent Runtime chưa deploy. Mobile native host/OS accessibility chưa kiểm chứng; không gọi production-ready hoặc compliant toàn bộ MDS/backend standard. Rate limiter RAM, draft restore và một số audit atomic tiếp tục ở active context.
