# 08 — Bảo mật và phân quyền (schema v6)

Cookie session HttpOnly, SameSite=Strict, Secure trừ Docker localhost. Token ngẫu nhiên 32 byte chỉ lưu SHA-256 trong DB, hạn 12h. Password salt ngẫu nhiên + scrypt, so sánh timingSafeEqual. Đổi password xóa mọi session cũ rồi cấp session mới. Không log mật khẩu, key hoặc payload đăng nhập.

`authenticate` chỉ nhận user active; login yêu cầu miền MISA hợp lệ. Tài khoản mới must_change_password=true; sau me/logout/password, middleware chặn toàn bộ API còn lại đến khi đổi password. Policy: 10–128 ký tự, ASCII hoa/thường, số, ký tự đặc biệt; không cho dùng lại mật khẩu hiện tại/default. Mật khẩu khởi tạo Super admin do env cung cấp, được thay ở lần đầu.

Viewer chỉ xem Tổng quan của mọi sự kiện: API report/metadata/snapshots/refresh; không đọc rows, contacts, sources, members, pending imports, conflicts, assignments, audit hoặc export. Backend trả403, client ẩn menu và đưa deep link chi tiết về Tổng quan. Editor cần membership đúng event; sửa khách vẫn phải có phân công. Global Admin (`users.global_role=admin`) quản lý toàn bộ sự kiện, tạo sự kiện và cấp Editor. Chỉ Super admin được GET/POST/DELETE `/api/admins`. Xóa Admin là thu hồi global role về viewer, giữ tài khoản/password/lịch sử và membership đã cấp riêng; có hiệu lực request tiếp theo. Admin scoped cũ giữ nguyên, không tự được nâng thành global. Event member POST/import chỉ cấp Editor; PATCH đổi cấp quyền đã chặn, kể cả với Super admin. Không có signup/invite/mail server.

Import account validates hai cột, email domain, duplicate, tối đa 500; commit revalidates toàn bộ trong transaction. Existing account giữ password/name/role cao hơn. Đồng thời tạo user dùng unique email + ON CONFLICT. User tham gia nhiều event qua khóa ghép members. Snapshot/import truy vấn event_id; staging thêm user_id + hạn 1 ngày.

Mỗi mutation kiểm tra Origin khi được gửi. Helmet CSP, JSON 1MB, file 10MB, XLSX giới hạn inflate, Google Sheet URL allowlist cố định. Login limiter 30/15 phút; AI/upload/export limiter 12/phút. SQL tham số hóa. Nội dung import/AI là dữ liệu, không HTML hay instruction; Excel text không trở thành formula. Số liệu tính bằng code, không giao AI tính.

Còn mở: TLS/ingress/IP allowlist trên máy chủ MISA chưa cấu hình do chưa có server/IP; limiter in-memory chưa chia sẻ replicas; không có MFA/reset qua email; cookie localhost chưa Secure. Cloud Run đã triển khai (xem mục dưới); managed Agent Runtime chưa chạy. Không tuyên bố production security acceptance.

17/10/2026: nhập tự động vẫn yêu cầu Editor/Admin/Super admin, validate server và transaction như commit thủ công; pending chỉ trả cho người tạo và event tương ứng, hạn một ngày. Refresh quyền đọc chỉ được chạy sync đã bật, không thay cấu hình; cooldown dưới row lock và expensive limiter giữ giới hạn. Nhận xét AI tự động chỉ gửi allowlist aggregate, không gửi tên nhân viên/giá trị source filters/source dimensions/targets/groups/tên file. Browser test QA dùng 127.0.0.1:8097, tách cookie khỏi localhost:8096.

17/10/2026: nhận diện mục tiêu AI chỉ nhận tên tab, kết quả allowlist rồi parser xác minh B:I; không thực thi công thức/chỉ dẫn Sheet. API rows dùng strict whitelist, mảng/từkhóa/ngày/paging bị giới hạn và cần membership Editor hoặc quyền Admin/Super admin. Kế hoạch lưu cùng snapshot có event_id; lỗi đọc nguồn không commit dữ liệu nửa chừng. Nhập tài khoản thành viên tắt hoàn toàn nhận diện mục tiêu.

## Cloud Run public tạm thời — 17/10/2026
Chủ dự án yêu cầu truy cập cloud không giới hạn IP. Cloud Run ingress all/Invoker allUsers mở trang login; API nghiệp vụ vẫn session + phân quyền. Cookie Secure/HttpOnly/SameSite Strict, Origin đúng URL cloud. Đã kiểm tra API chưa đăng nhập401, forced-change gate403, khác Origin403, logout thu hồi session. Max instance1 trong lúc limiter còn RAM. Không nhúng JSON key: ADC runtime + Secret Manager, secret accessor chỉ ba secret Event Report. Mật khẩu Super admin cloud random riêng, bắt đổi lần đầu, không đổi mật khẩu local. Không mang session/invitation local lên cloud. API/role/schema không thay đổi trong lần deploy này.

## 18/10/2026 — phân công và bảo vệ kết quả liên hệ
Admin/Super admin quản lý toàn bộ; Editor chỉ sửa/thêm/import khách có mã staff_code (fallback utm_content/tracking) được Admin ánh xạ tới chính mình trong event. Mã không tự trở thành quyền từ email/tên đoán được. Truy vấn quyền kiểm tra active user và membership hiện tại, thu hồi membership có hiệu lực ngay. Import Editor kiểm tra cả mã đầu vào và các hồ sơ trùng ứng viên để ngăn đổi mã nhằm chiếm hồ sơ người khác. Chỉ Admin đổi mã phân công.
Event lock tuần tự hóa sync/import/human edit; optimistic version chống ghi đè form cũ. Contact log và projection/audit cùng transaction. Lọc tenant ở hồ sơ, lịch sử, nguồn và đối chiếu. Sheet sync không thay human overrides. Vẫn còn các khoảng trống hardening legacy đã nêu trước; không tuyên bố tuân thủ toàn bộ standard.


## 18/10/2026 — toolbar đăng ký và mật khẩu ban đầu
Mật khẩu ban đầu cho thành viên và Admin mới dùng cùng DEFAULT_MEMBER_PASSWORD do chủ dự án chỉ định, cấu hình ngoài Git qua runtime.env/Secret Manager. Giá trị thay đổi18/10/2026 không được ghi vào tài liệu/mã nguồn. Tài khoản mới vẫn must_change_password=true; thêm lại tài khoản hiện có không reset mật khẩu hay cờ đổi lần đầu.
