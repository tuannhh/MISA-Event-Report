# MISA Event Report

Ứng dụng báo cáo sự kiện MISA, chạy Docker tại http://localhost:8096. Source được quản lý trong repository riêng tư MISA-Event-Report. Tên Docker project `misa-event-insights` được giữ để bảo toàn volume.

## Chức năng hiện tại

- Mỗi sự kiện có URL ổn định `/ten-su-kien-123abc/tong-quan`, `/thanh-vien`, `/du-lieu`, `/nguon-du-lieu`, `/muc-tieu`, `/nhat-ky`.
- Nhập Excel/CSV hoặc Google Sheet, ghép cột bằng tay/Gemini, kiểm tra trước khi nhập. Snapshot cũ giữ nguyên; đồng bộ Sheet mỗi 5 phút.
- Chọn nguồn khách tự cập nhật KPI, bảng, biểu đồ, so sánh và Excel. Các chiều nguồn được phát hiện từ header, có thể chỉnh trước khi import. Nhiều điều kiện kết hợp AND.
- Xuất Excel số liệu tổng hợp và PNG, chọn báo cáo, bật phần trăm trên biểu đồ. Ô “Tỷ lệ C-Level” dùng tổng đăng ký / tổng mục tiêu theo chỉ định nghiệp vụ.
- UI Vue 3 dùng component, token, font Inter của MISA Design System. Desktop và mobile có composition riêng. Ngày dd/mm/yyyy; số vi-VN (1.350; 9,93%).
- Sự kiện Online / Offline / kết hợp. Mỗi đăng ký có hình thức Online / Offline / Cả hai / Chưa xác định; báo cáo chia nhóm không đếm trùng, có bộ lọc hình thức. Dữ liệu cũ không bị đoán hình thức.
- Import thành viên Excel hai cột **Họ và tên, Email**, preview lỗi/duplicate; xác nhận tạo Editor riêng sự kiện. Một tài khoản dùng nhiều sự kiện; import không reset mật khẩu tài khoản cũ. Không gửi link mời.

## Phân quyền và tài khoản

| Quyền | Phạm vi |
|---|---|
| Viewer | Mọi tài khoản hợp lệ xem tất cả sự kiện, báo cáo và dữ liệu; không sửa |
| Editor | Viewer + sửa thông tin/dữ liệu của sự kiện được cấp quyền |
| Admin | Editor + thêm/import/thu hồi Editor trong sự kiện |
| Super admin | Toàn ứng dụng; tạo sự kiện, cấp Admin, tạo tài khoản Viewer |

Super admin được cấu hình là bmtuan@misa.com.vn. Mật khẩu ban đầu được bàn giao riêng, không lưu trong source. Tài khoản mới bắt buộc đổi mật khẩu lần đầu. Mật khẩu mới dài 10–128 ký tự, có chữ thường/hoa/số/đặc biệt. Chỉ email misa.com.vn và subdomain hợp lệ được đăng nhập. Tài khoản bootstrap ngoài miền cũ bị vô hiệu hóa khi nâng cấp; dữ liệu giữ nguyên.

## Chạy Docker

Sao chép `.env.example` ra file cấu hình **ngoài repo**; điền DB_PASSWORD, SUPER_ADMIN_PASSWORD, DEFAULT_MEMBER_PASSWORD và đường dẫn Google key. Không commit file thật.

```powershell
docker compose --env-file PATH_TO_RUNTIME_ENV up -d --build
```

Máy hiện tại dùng `../../work/runtime.env`. Compose chỉ bind localhost:8096. Backend phục vụ bundle Vite đã build trong image; không chạy Vite dev server ở production.

Dữ liệu hiện có: sự kiện Đà Nẵng, 134 đăng ký/84 C-Level tại thời điểm kiểm tra; 2 snapshots được giữ qua migration v3. Mục tiêu tổng 1.350, mục tiêu chi tiết 1.650 có cảnh báo. Số liệu tự thay đổi khi Sheet cập nhật.

## Kiểm tra và tài liệu

`npm ci`, `npm run build`, `npm test`. Integration test chỉ chạy với BASE_URL trỏ môi trường QA riêng; xem `.github/workflows/verify.yml`. [Memory bank](memory-bank/README.md) theo cấu trúc MISA Backend Standard; [bằng chứng kiểm tra](VERIFICATION.md).

Chưa triển khai máy chủ MISA/IP allowlist vì chưa có thông tin máy chủ và danh sách IP. Cloud Run script chỉ là phương án triển khai, chưa chạy. Gemini hiện gọi REST trên Google Cloud; chưa triển khai managed Agent Runtime. Mobile browser đã kiểm tra viewport; chưa có runtime MISA AMIS và thiết bị iOS/Android để chứng nhận native production.
