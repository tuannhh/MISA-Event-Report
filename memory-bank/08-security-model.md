# 08 — Bảo mật và phân quyền

## Hiện trạng v1

Mật khẩu scrypt với salt 16 byte và output 64 byte; so sánh timingSafeEqual. Cookie session random 32 byte, DB chỉ lưu SHA-256, hạn 12 giờ. HttpOnly, SameSite=Strict, Secure trừ khi COOKIE_SECURE=false. Đổi mật khẩu yêu cầu mật khẩu hiện tại và thu hồi mọi session cũ rồi tạo session mới. Chưa có force-change, complexity policy mới hoặc SSO/MFA/reset email.

| Role hiện tại | Đọc báo cáo/dữ liệu | Import/sửa dữ liệu/settings | Quản lý member/audit |
|---|---|---|---|
| viewer | Chỉ sự kiện có membership | Không | Xem member, không audit |
| editor | Chỉ sự kiện có membership | Có | Xem member, không quản lý |
| owner | Chỉ sự kiện có membership | Có | Có, không sửa/xóa owner |

Mỗi request event dùng authorize join members với user từ session. Snapshot luôn kiểm tra event_id; staging kiểm tra event_id+user_id+hạn. Không dùng role do client gửi để quyết định quyền hiện hành. Cách ly ở API/SQL, chưa có PostgreSQL RLS.

## Các lớp bảo vệ đã có

- Zod validation, SQL parameters, escape dữ liệu khi đưa vào HTML.
- Helmet CSP script self; style cho phép inline do frontend hiện tại. Origin mutation được so APP_ORIGIN nếu header có mặt; SameSite strict bổ trợ, chưa có CSRF token riêng.
- Login/AI/upload rate limit; upload và parsing có giới hạn. OOXML guard dựa kích thước khai báo, chưa thay thế sandbox parser hoặc load/fuzz testing.
- URL Sheet phải HTTPS/docs.google.com; HTTP gọi host Google cố định, không fetch URL tùy ý do người dùng cung cấp.
- Lỗi nội bộ ẩn chi tiết, log mã/status không chủ động log raw contact/key. Audit member vẫn có email, cần bảo vệ như dữ liệu cá nhân.
- Secrets mount ngoài image/source; không đóng gói JSON key vào Git. Key do chủ dự án cung cấp chỉ dùng cho Sheets/model đã yêu cầu.

## Endpoint công khai

GET /api/health chỉ trả ok sau kiểm tra DB, không trả cấu hình. POST /api/login để đăng nhập, có limiter. POST /api/accept-invite dùng token ngẫu nhiên một lần, hạn 3 ngày, có limiter. Static HTML/assets công khai nhưng dữ liệu báo cáo vẫn cần session.

Luồng invite chưa có xác minh quyền sở hữu email qua mail/SSO; người sở hữu link có thể nhận lời mời. Yêu cầu mới đã loại bỏ invitation, phải triển khai thay thế chứ không coi thiếu email server là lý do giữ luồng này.

## Mô hình mới đã được yêu cầu — chưa triển khai

Viewer mặc định mọi tài khoản đăng nhập được xem mọi sự kiện. Editor có quyền cập nhật từng sự kiện. Admin thêm/import editor của sự kiện mình; chỉ super admin toàn ứng dụng được quản lý toàn cục. User chung theo email, membership nhiều sự kiện; import thêm membership không reset mật khẩu tài khoản cũ. Tài khoản chỉ @misa.com.vn hoặc subdomain hợp lệ của misa.com.vn. Chi tiết và test bắt buộc ở [12](12-active-context.md).

## Khoảng trống cần xử lý

Chưa chặn IP MISA, chưa giới hạn domain email, chưa có bốn cấp quyền/force-change. Trust proxy=1 chỉ phù hợp topology Cloud Run đã giả định, không tự dùng cho server MISA. Limiter chưa distributed; chưa có retention snapshots/audit, DB access separation hay kiểm thử restore/tải production. Một số cập nhật member/source và audit là query riêng, chưa atomic cùng transaction. Không tuyên bố production-ready từ kết quả test v1.
