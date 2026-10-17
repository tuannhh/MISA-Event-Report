# 08 — Bảo mật và phân quyền (schema v3)

Cookie session HttpOnly, SameSite=Strict, Secure trừ Docker localhost. Token ngẫu nhiên 32 byte chỉ lưu SHA-256 trong DB, hạn 12h. Password salt ngẫu nhiên + scrypt, so sánh timingSafeEqual. Đổi password xóa mọi session cũ rồi cấp session mới. Không log mật khẩu, key hoặc payload đăng nhập.

`authenticate` chỉ nhận user active; login yêu cầu miền MISA hợp lệ. Tài khoản mới must_change_password=true; sau me/logout/password, middleware chặn toàn bộ API còn lại đến khi đổi password. Policy: 10–128 ký tự, ASCII hoa/thường, số, ký tự đặc biệt; không cho dùng lại mật khẩu hiện tại/default. Mật khẩu khởi tạo Super admin do env cung cấp, được thay ở lần đầu.

Viewer mặc định xem tất cả sự kiện theo yêu cầu chủ dự án. `authorize` LEFT JOIN membership, thiếu role thành viewer, global super_admin ghi đè quyền. Editor sửa đúng event; Admin sửa và quản lý Editor đúng event; chỉ Super admin tạo event hoặc cấp/đổi Admin. Import luôn Editor; admin không thể tự nâng quyền. Thu hồi membership có hiệu lực ở request tiếp theo; người dùng vẫn có quyền Viewer. Không có signup/invite/mail server.

Import account validates hai cột, email domain, duplicate, tối đa 500; commit revalidates toàn bộ trong transaction. Existing account giữ password/name/role cao hơn. Đồng thời tạo user dùng unique email + ON CONFLICT. User tham gia nhiều event qua khóa ghép members. Snapshot/import truy vấn event_id; staging thêm user_id + hạn 1 ngày.

Mỗi mutation kiểm tra Origin khi được gửi. Helmet CSP, JSON 1MB, file 10MB, XLSX giới hạn inflate, Google Sheet URL allowlist cố định. Login limiter 30/15 phút; AI/upload/export limiter 12/phút. SQL tham số hóa. Nội dung import/AI là dữ liệu, không HTML hay instruction; Excel text không trở thành formula. Số liệu tính bằng code, không giao AI tính.

Còn mở: TLS/ingress/IP allowlist trên máy chủ MISA chưa cấu hình do chưa có server/IP; limiter in-memory chưa chia sẻ replicas; không có MFA/reset qua email; cookie localhost chưa Secure. Cloud Run đã triển khai (xem mục dưới); managed Agent Runtime chưa chạy. Không tuyên bố production security acceptance.

17/10/2026: nhập tự động vẫn yêu cầu Editor/Admin/Super admin, validate server và transaction như commit thủ công; pending chỉ trả cho người tạo và event tương ứng, hạn một ngày. Refresh quyền đọc chỉ được chạy sync đã bật, không thay cấu hình; cooldown dưới row lock và expensive limiter giữ giới hạn. Nhận xét AI tự động chỉ gửi allowlist aggregate, không gửi tên nhân viên/giá trị source filters/source dimensions/targets/groups/tên file. Browser test QA dùng 127.0.0.1:8097, tách cookie khỏi localhost:8096.

17/10/2026: nhận diện mục tiêu AI chỉ nhận tên tab, kết quả allowlist rồi parser xác minh B:I; không thực thi công thức/chỉ dẫn Sheet. API rows dùng strict whitelist, mảng/từkhóa/ngày/paging bị giới hạn và vẫn qua read authorization. Kế hoạch lưu cùng snapshot có event_id; lỗi đọc nguồn không commit dữ liệu nửa chừng. Nhập tài khoản thành viên tắt hoàn toàn nhận diện mục tiêu.

## Cloud Run public tạm thời — 17/10/2026
Chủ dự án yêu cầu truy cập cloud không giới hạn IP. Cloud Run ingress all/Invoker allUsers mở trang login; API nghiệp vụ vẫn session + phân quyền. Cookie Secure/HttpOnly/SameSite Strict, Origin đúng URL cloud. Đã kiểm tra API chưa đăng nhập401, forced-change gate403, khác Origin403, logout thu hồi session. Max instance1 trong lúc limiter còn RAM. Không nhúng JSON key: ADC runtime + Secret Manager, secret accessor chỉ ba secret Event Report. Mật khẩu Super admin cloud random riêng, bắt đổi lần đầu, không đổi mật khẩu local. Không mang session/invitation local lên cloud. API/role/schema không thay đổi trong lần deploy này.
