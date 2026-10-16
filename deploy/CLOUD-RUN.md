# Chuyển lên Cloud Run

Docker đã chạy local. Tài liệu và script này chuẩn bị bước cloud; **chưa triển khai dịch vụ Cloud Run**.

## Kiến trúc

- Cloud Run service chạy cùng image Node.js, phục vụ UI và API cùng origin.
- Cloud SQL PostgreSQL 16 lưu users, sessions, memberships, imports, snapshots và audit. Không dùng filesystem của Cloud Run để lưu dữ liệu.
- Secret Manager lưu `DATABASE_URL` và mật khẩu bootstrap. Service account runtime dùng ADC, không đóng gói JSON key.
- Gemini 4 Argon gọi `aiplatform.googleapis.com` tại location `global`. Google Sheets dùng API v4 với phạm vi chỉ đọc.
- Cloud Run Job chạy `node server/sync-job.js`; Cloud Scheduler gọi jobs.run mỗi 5 phút. Tắt timer trong service (`SYNC_INTERVAL_SECONDS=0`) để không phụ thuộc CPU idle của Cloud Run.
- Membership kiểm tra tại API cho mọi endpoint có eventId. Truy vấn snapshot/import luôn kèm eventId; đây là cách ly ở tầng ứng dụng, không phải database riêng hay Postgres RLS cho từng tenant.

## Tài nguyên cần chuẩn bị

1. Bật Cloud Run, Cloud Build, Artifact Registry, Cloud SQL Admin, Secret Manager, Cloud Scheduler, Sheets và AI Platform APIs trong project đích. Chọn region cho SQL/Run cùng khu vực. Model cấu hình global nên cần kiểm tra yêu cầu lưu trú dữ liệu của tổ chức trước khi đưa dữ liệu sản xuất vào AI.
2. Tạo PostgreSQL database `events` và user riêng. Bật backup tự động và point-in-time recovery. Connection string qua Unix socket:
   `postgresql://events:URL_ENCODED_PASSWORD@localhost/events?host=/cloudsql/PROJECT:REGION:INSTANCE`
   Lưu làm secret `misa-event-database-url`. Không ghi mật khẩu vào lệnh shell/history; dùng Console hoặc `gcloud secrets versions add --data-file` với file bảo mật.
3. Tạo secret `misa-event-bootstrap-password` có mật khẩu ngẫu nhiên >=12 ký tự. Sau lần khởi tạo DB, bootstrap không ghi đè tài khoản đã có.
4. Service account runtime cần `roles/cloudsql.client`, `roles/aiplatform.user`, quyền đọc đúng hai secret và `serviceusage.services.use` nếu policy của project yêu cầu. Chia sẻ **chỉ những Google Sheets cần thiết** cho email của service account với quyền Viewer.
5. Build image trong Artifact Registry (repo `misa-tools` đã tạo):
   ```powershell
   gcloud builds submit --project=PROJECT --tag=asia-southeast1-docker.pkg.dev/PROJECT/misa-tools/event-insights:v1 .
   ```
6. Chạy script từ thư mục gốc source, với origin HTTPS thật của service hoặc domain:
   ```powershell
   ./deploy/cloud-run.ps1 -Project PROJECT -SqlConnection PROJECT:asia-southeast1:INSTANCE -ServiceAccount event-insights@PROJECT.iam.gserviceaccount.com -Image asia-southeast1-docker.pkg.dev/PROJECT/misa-tools/event-insights:v1 -Origin https://events.example.com
   ```
   Script giữ Cloud Run ở trạng thái yêu cầu IAM. Để dùng trình duyệt cho nhân viên, cấu hình HTTPS load balancer/IAP hoặc chính sách ingress phù hợp. Đăng nhập ứng dụng hiện dùng tài khoản nội bộ; chưa tích hợp SSO MISA. Không bật truy cập công khai bằng cách vô hiệu hóa auth ứng dụng.
7. Tạo Scheduler HTTP POST `https://run.googleapis.com/v2/projects/PROJECT/locations/asia-southeast1/jobs/misa-event-insights-sync:run`, lịch `*/5 * * * *`, body `{}`, OAuth service account có quyền `run.jobs.run` trên đúng job. Chọn Asia/Ho_Chi_Minh. Dùng OAuth access token, không dùng OIDC cho Google APIs endpoint này.
8. Lần đầu kiểm tra `/api/health`, đăng nhập, tạo tenant thử, nhập Sheet, chạy job thủ công, kiểm tra phiên dữ liệu, thử Viewer và truy cập trái tenant. Khi đạt yêu cầu mới chuyển dữ liệu và người dùng thật.

## Vận hành

- Giữ image tag bất biến và version secrets để rollback. Migration v1 chạy có advisory lock; thay đổi schema tương lai cần migration tăng version có phương án rollback.
- Đo memory với file lớn trước khi tăng giới hạn 20.000 dòng. Hiện snapshot lưu JSONB, phù hợp quy mô sự kiện vừa; khối lượng lớn cần bảng registrations, batch ingestion và queue riêng.
- Timer/job giữ dữ liệu cũ nếu nguồn lỗi, lưu thông báo vào `events.sync_error`; không ghi raw contact/khóa vào log.
- Job xử lý tối đa 20 sự kiện đến hạn mỗi lần, theo thứ tự lần kiểm tra cũ nhất. Khi có >20 nguồn cần tăng throughput hoặc chia batch.
- Rate limiter hiện trong bộ nhớ từng process. Trước khi mở production nhiều instance, dùng Cloud Armor/IAP hoặc distributed rate limiting cho đăng nhập và AI.
- Invitation là liên kết dùng một lần, hiệu lực 3 ngày; người quản trị gửi thủ công đúng người. Chưa có xác thực email tự động, MFA, reset mật khẩu qua email hoặc SSO.
- Backup local: dùng `pg_dump` trong container db; restore vào DB thử để kiểm tra trước khi sử dụng. Không xóa volume bằng `down -v` nếu chưa sao lưu.
- Chuyển dữ liệu local: `pg_dump --format=custom`, chuyển qua kênh bảo mật và `pg_restore` vào Cloud SQL. Không đưa dump vào repository/image.

## Tài liệu chính thức đã đối chiếu

- [Gemini 4 Argon developer guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon)
- [Cloud Run + Cloud SQL PostgreSQL](https://cloud.google.com/sql/docs/postgres/connect-run)
- [Schedule Cloud Run jobs](https://cloud.google.com/run/docs/execute/jobs-on-schedule)
