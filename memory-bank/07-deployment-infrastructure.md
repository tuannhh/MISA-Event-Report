# 07 — Triển khai và hạ tầng

## Hiện trạng

Docker Compose project `misa-event-insights`: app Node 24 chạy user node, PostgreSQL 16.4 lưu named volume `event-data`; tên volume mặc định `misa-event-insights_event-data`. App bind 127.0.0.1:8096, DB không mở host port. Không đổi tên project/volume khi đổi tên GitHub repository. Container có healthcheck và restart unless-stopped.

Môi trường MISA production chưa có địa chỉ, danh sách IP, chứng thư TLS hay tài khoản triển khai. Chưa deploy Cloud Run; tài liệu cloud là phương án dự phòng, xem `deploy/CLOUD-RUN.md`.

## Cấu hình đang được code đọc

| Biến | Vai trò / mặc định | Nhạy cảm |
|---|---|---|
| APP_PORT | Host port Compose, 8096 | Không |
| PORT | Port Node, 8080 | Không |
| DB_PASSWORD | Compose tạo database và DATABASE_URL | Có |
| DATABASE_URL | pg connection string, bắt buộc cho API/job | Có |
| SUPER_ADMIN_EMAIL | Super admin cấu hình, tạo nếu email chưa tồn tại | Cấu hình nội bộ |
| SUPER_ADMIN_PASSWORD | Mật khẩu đầu tiên, ≥10 ký tự ban đầu, bắt đổi lần đầu, không ghi đè user đã có | Có |
| APP_ORIGIN | Origin được phép cho request thay đổi | Không |
| COOKIE_SECURE | Chỉ false ở local HTTP; mặc định secure | Không |
| GOOGLE_CLOUD_PROJECT | Project gọi model | Cấu hình nội bộ |
| GOOGLE_CREDENTIALS_PATH | Host path JSON key, Compose mount read-only | Vị trí nhạy cảm |
| GOOGLE_APPLICATION_CREDENTIALS | Container path `/run/secrets/google.json` hoặc ADC | Vị trí nhạy cảm |
| GEMINI_MODEL | gemini-4-argon | Không |
| SYNC_INTERVAL_SECONDS | Code mặc định 0; Compose 300; tối thiểu 60 khi bật | Không |
| K_SERVICE | Cloud Run đặt; code bật trust proxy 1 khi tồn tại | Ảnh hưởng bảo mật |

`.env.example` chỉ có placeholder. Runtime config và JSON key không commit. **Khoảng trống so với standard mới:** v1 dùng biến môi trường trực tiếp; chưa có loader `config.{APP_ENVIRONMENT}.json`. Không ghi tài liệu giả rằng cơ chế này đã tồn tại; chuyển đổi cần thay code/Compose đồng bộ.

## Local

1. Cài Docker/Compose v2. Chuẩn bị file cấu hình từ `.env.example` ngoài Git và JSON service account ngoài source.
2. Bật Sheets API/AI Platform API, cấp quyền model và share đúng Sheet với service account ở quyền đọc.
3. Từ root source, chạy `docker compose --env-file PATH_TO_RUNTIME_ENV up -d --build`.
4. Kiểm tra `docker compose --env-file PATH_TO_RUNTIME_ENV ps` và `/api/health`; thử login, import mẫu không nhạy cảm.

Ở máy hiện tại PATH_TO_RUNTIME_ENV là `../../work/runtime.env`. Không in file này vào log. Đổi SUPER_ADMIN_EMAIL/PASSWORD khi DB đã có user không tự đổi tài khoản hiện hữu.

## Kiểm thử

`npm ci`, `npm test`. Mặc định 8 unit/ingestion tests, integration skip khi thiếu BASE_URL. Full integration dùng một app+DB riêng, đặt BASE_URL/TEST_EMAIL/TEST_PASSWORD ngoài Git; test tạo QA users/events. Không trỏ vào cổng 8096 đang dùng thật. CI chạy đủ bộ với PostgreSQL service riêng; không gọi Google thật và không cần production secrets.

## Máy chủ MISA — kế hoạch chưa triển khai

Chuẩn bị DNS/TLS, reverse proxy và firewall allowlist IP MISA. Backend phải không có đường truy cập vòng qua proxy; chỉ tin forwarded headers từ proxy đã định danh. Phải kiểm tra IP trực tiếp, IP proxy hợp lệ và header X-Forwarded-For giả. Chưa có middleware IP trong baseline và chưa thể cấu hình rule thật khi chưa có danh sách.

Trước chuyển production: hoàn tất quyền mới, chính sách email/password; chốt retention/backup/RPO/RTO; kiểm thử tải file lớn, restore DB và ingress; cấu hình cookie secure và origin HTTPS. Không dùng Compose local nguyên trạng để mở Internet.

## Backup, rollback, sự cố

- Chưa có lịch backup tự động hoặc bằng chứng restore drill. RPO/RTO, người trực và kênh báo sự cố: chưa xác định.
- Sao lưu bằng pg_dump format custom vào vùng bảo mật ngoài Git; copy qua kênh nội bộ, restore thử vào DB cách ly, đối chiếu số bảng/snapshot và kiểm tra báo cáo. Đây là runbook dự kiến, chưa phải kết quả thực thi.
- Giữ image bất biến và phiên bản cấu hình trước khi nâng cấp. Với migration, chuẩn bị phương án tương thích/khôi phục trước deploy; không rollback DB mù khi có dữ liệu mới.
- Không `down -v` môi trường đang dùng. Khi lỗi đồng bộ, tắt nguồn nếu cần và giữ snapshot cuối; xem sync_error/log đã lọc; ghi nguyên nhân đã xác minh vào technical traps.
- API SIGTERM/SIGINT dừng timer, ngừng nhận request và đóng pool, timeout 10 giây. Rate limiting nằm RAM, chưa dùng chung nhiều instance.

## Migration v2 và lần cập nhật báo cáo

Đã tạo backup local trước migration slug ngoài repository. V2 backfill slug cho sự kiện hiện hữu, giữ UUID/rows. Code v1 cũ không ghi slug khi tạo event, nên không rollback chỉ image về v1 trên DB v2 mà không chuẩn bị tương thích. Nếu cần quay lui toàn bộ, restore bản backup vào DB riêng và chuyển có kiểm soát; cân nhắc dữ liệu ghi mới sau backup. Đã restore drill trước migration v3 vào database riêng; xem VERIFICATION.md.

CI và bộ test mới gồm 14 test, phải chạy full integration trên stack cách ly để kiểm tra migration, route, export và nguồn. Kết quả cuối và giới hạn xem VERIFICATION.md.

DEFAULT_MEMBER_PASSWORD bắt buộc qua policy (10–128 ký tự đủ hoa/thường/số/đặc biệt), cấp khi tạo user mới. Không đổi password user tồn tại. Vite frontend build trong stage build; runtime serve dist. Backup/restore thử đã chạy trước migration v3, chi tiết VERIFICATION.md.
