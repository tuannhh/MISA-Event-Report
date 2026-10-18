# 07 — Triển khai và hạ tầng

## Hiện trạng

Docker Compose project `misa-event-insights`: app Node 24 chạy user node, PostgreSQL 16.4 lưu named volume `event-data`; tên volume mặc định `misa-event-insights_event-data`. App bind 127.0.0.1:8096, DB không mở host port. Không đổi tên project/volume khi đổi tên GitHub repository. Container có healthcheck và restart unless-stopped.

Môi trường MISA production chưa có địa chỉ, danh sách IP, chứng thư TLS hay tài khoản triển khai. Đã triển khai Cloud Run ngày 17/10/2026, tạm thời không giới hạn IP theo yêu cầu mới; xem `deploy/CLOUD-RUN.md` và phần cloud bên dưới.

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

Ở môi trường bàn giao trước, PATH_TO_RUNTIME_ENV là `../../work/runtime.env`. Bản cài macOS ngày 17/10/2026 dùng `../.misa-event-report-local/runtime.env` ngoài repository. Không in file này vào log. Đổi SUPER_ADMIN_EMAIL/PASSWORD khi DB đã có user không tự đổi tài khoản hiện hữu.

### Bản cài macOS ngày 17/10/2026

- Clone revision `6436c18` vào thư mục `MISA-Event-Report` trong workspace MISA Event Management; đã đọc toàn bộ memory bank trước cấu hình.
- Chạy từ root repository: `docker compose --env-file ../.misa-event-report-local/runtime.env up -d --build`. Truy cập `http://localhost:8096/log-in`.
- Giữ project `misa-event-insights` và volume `misa-event-insights_event-data`. Ban đầu tạo DB mới schema v3; hiện đã nâng schema v4 và người dùng đã nhập dữ liệu sự kiện. Dữ liệu không được đồng bộ qua Git.
- JSON service account do chủ dự án cung cấp nằm ngoài source, mount read-only qua cấu hình hiện có. Runtime env và tệp bàn giao đăng nhập nằm trong thư mục riêng ngoài repository; thư mục mode 700, các tệp mode 600. Không ghi giá trị bí mật vào memory bank.
- Đã xác minh health HTTP 200, đăng nhập Super admin, forced-password gate trả 403 trước đổi mật khẩu và đăng xuất phiên kiểm tra. Trang đăng nhập được mở và xác minh trên trình duyệt.
- Đã gọi thật `suggestMapping` với tên cột tổng hợp qua `gemini-4-argon`, nhận JSON mapping hợp lệ. Chưa kiểm tra Sheet cụ thể; không triển khai managed Agent Runtime.
- Build Docker/Vite thành công; npm audit trong build báo 0 vulnerabilities. Toàn bộ 19/19 tests đạt, không skip, trên Compose QA riêng dùng PostgreSQL tmpfs, không publish port và không mount Google key. Không chạy integration tests trên database local phục vụ người dùng.

## Kiểm thử

`npm ci`, `npm test`. Mặc định 8 unit/ingestion tests, integration skip khi thiếu BASE_URL. Full integration dùng một app+DB riêng, đặt BASE_URL/TEST_EMAIL/TEST_PASSWORD ngoài Git; test tạo QA users/events. Không trỏ vào cổng 8096 đang dùng thật. CI chạy đủ bộ với PostgreSQL service riêng; không gọi Google thật và không cần production secrets.

## Máy chủ MISA — kế hoạch chưa triển khai

Chuẩn bị DNS/TLS, reverse proxy và firewall allowlist IP MISA. Backend phải không có đường truy cập vòng qua proxy; chỉ tin forwarded headers từ proxy đã định danh. Phải kiểm tra IP trực tiếp, IP proxy hợp lệ và header X-Forwarded-For giả. Chưa có middleware IP trong baseline và chưa thể cấu hình rule thật khi chưa có danh sách.

Trước chuyển production: hoàn tất quyền mới, chính sách email/password; chốt retention/backup/RPO/RTO; kiểm thử tải file lớn, restore DB và ingress; cấu hình cookie secure và origin HTTPS. Không dùng Compose local nguyên trạng để mở Internet.

## Backup, rollback, sự cố

- Cloud SQL đã bật backup hằng ngày/PITR 7 ngày. Local có restore drill trước đây và dump local đã restore sang Cloud SQL mới; chưa có drill từ Cloud SQL backup. RPO/RTO, người trực và kênh báo sự cố: chưa xác định.
- Sao lưu bằng pg_dump format custom vào vùng bảo mật ngoài Git; copy qua kênh nội bộ, restore thử vào DB cách ly, đối chiếu số bảng/snapshot và kiểm tra báo cáo. Đây là runbook dự kiến, chưa phải kết quả thực thi.
- Giữ image bất biến và phiên bản cấu hình trước khi nâng cấp. Với migration, chuẩn bị phương án tương thích/khôi phục trước deploy; không rollback DB mù khi có dữ liệu mới.
- Không `down -v` môi trường đang dùng. Khi lỗi đồng bộ, tắt nguồn nếu cần và giữ snapshot cuối; xem sync_error/log đã lọc; ghi nguyên nhân đã xác minh vào technical traps.
- API SIGTERM/SIGINT dừng timer, ngừng nhận request và đóng pool, timeout 10 giây. Rate limiting nằm RAM, chưa dùng chung nhiều instance.

## Migration v2 và lần cập nhật báo cáo

Đã tạo backup local trước migration slug ngoài repository. V2 backfill slug cho sự kiện hiện hữu, giữ UUID/rows. Code v1 cũ không ghi slug khi tạo event, nên không rollback chỉ image về v1 trên DB v2 mà không chuẩn bị tương thích. Nếu cần quay lui toàn bộ, restore bản backup vào DB riêng và chuyển có kiểm soát; cân nhắc dữ liệu ghi mới sau backup. Đã restore drill trước migration v3 vào database riêng; xem VERIFICATION.md.

CI và bộ test mới gồm 14 test, phải chạy full integration trên stack cách ly để kiểm tra migration, route, export và nguồn. Kết quả cuối và giới hạn xem VERIFICATION.md.

DEFAULT_MEMBER_PASSWORD bắt buộc qua policy (10–128 ký tự đủ hoa/thường/số/đặc biệt), cấp khi tạo user mới. Không đổi password user tồn tại. Vite frontend build trong stage build; runtime serve dist. Backup/restore thử đã chạy trước migration v3, chi tiết VERIFICATION.md.

## Cloud Run — 17/10/2026

Đã triển khai project `prapplication-479309`, region `asia-southeast1`, service `misa-event-report`, SQL riêng `misa-event-report-db` (PostgreSQL16/db-f1-micro), job/Scheduler `misa-event-report-sync` mỗi5phút. URL: https://misa-event-report-784559735000.asia-southeast1.run.app/log-in. Source image commit `0899d42`, digest `sha256:c00ab95cefb1bc2b9f20bc65a1abe625fb38837f12fd2f911626b76cd59c5f0d`; revision có APP_ORIGIN đúng là `misa-event-report-00002-ql5`.

Service ingress all + Run Invoker allUsers theo yêu cầu; auth ứng dụng giữ nguyên, Secure cookie và origin HTTPS. 1CPU/1GiB, min0/max1, concurrency20. SQL không mở authorized network, kết nối Unix socket. Runtime ADC dùng identity đã có quyền đọc Sheet; không deploy JSON key. Ba secret riêng được pin version1. Scheduler dùng identity riêng, quyền Invoker chỉ trên job. API timer tắt; sync job độc lập.

Dữ liệu chuyển:1event/1user/4snapshots/134active rows/31goal rows/target1350. Không chuyển sessions/invitations. Super admin cloud được cấp mật khẩu ngẫu nhiên mới và must_change_password=true; local giữ nguyên. Dump/credentials 0600 ngoài Git. Runtime credentials không nằm trong memory bank.

Build context được giới hạn source qua .dockerignore và .gcloudignore. Runbook cập nhật secret names/version, public-access switch, backup/PITR và rollback. Chưa có load test hay chứng nhận native/production toàn diện.

## 18/10/2026 — chuyển sang registry v5
Cutover dùng trang bảo trì không kết nối DB và pause Scheduler; chờ hết timeout300s của request cũ trước khởi động writer v5. Backup trước nâng cấp1792314455030 SUCCESSFUL. Chạy migration/backfill tự động trên service, sau đó cập nhật job cùng digest và resume lịch. Database cloud/local độc lập, không restore local đè cloud. Không đổi secrets/password/IP policy. Bản build cuối dùng runtime+frontend bất biến của commit06baebc và COPY toàn bộ server từ commit086d7bf; package/lockfile không đổi. Digest/revision kết quả ở VERIFICATION.
