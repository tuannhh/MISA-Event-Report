# Cloud Run — Event Report

Đã triển khai ngày17/10/2026. Truy cập: [Event Report](https://misa-event-report-784559735000.asia-southeast1.run.app/log-in). Bằng chứng: [VERIFICATION.md](../VERIFICATION.md).

## Kiến trúc và chính sách truy cập

Cloud Run phục vụ UI/API cùng origin HTTPS, Cloud SQL PostgreSQL 16 lưu dữ liệu bền vững. Theo yêu cầu chủ dự án ngày 17/10/2026, bản cloud cho phép truy cập Internet, **chưa giới hạn IP**. Quyền gọi Cloud Run công khai chỉ mở trang đăng nhập; các API nghiệp vụ vẫn yêu cầu session, phân quyền và đổi mật khẩu lần đầu. Đây không phải triển khai IAP/SSO hoặc chứng nhận production security acceptance.

- Project: `prapplication-479309`; region: `asia-southeast1`.
- Service: `misa-event-report`; job: `misa-event-report-sync`.
- SQL: `misa-event-report-db`, database/user `events`, PostgreSQL 16 Enterprise, `db-f1-micro`, SSD 10 GB auto-grow, zonal.
- SQL bật deletion protection, backup hằng ngày lúc 18:00 UTC (01:00 Việt Nam), giữ 7 bản, PITR 7 ngày. SQL không có authorized network; app kết nối qua Cloud SQL Unix socket.
- Image trong Artifact Registry `cloud-run-source-deploy/misa-event-report`, triển khai bằng digest bất biến. Không đưa khóa JSON, dump, runtime env vào build context.
- Runtime dùng ADC của service account đã được chia sẻ Sheet; không đóng gói khóa JSON. Identity có AI Platform User, Cloud SQL Client và Secret Accessor trên đúng ba secrets của ứng dụng.
- Secrets `misa-event-report-database-url`, `misa-event-report-admin-password`, `misa-event-report-member-password` được pin version `1` trong revision ban đầu. Không ghi giá trị vào source hoặc tài liệu.
- Service: 1 CPU, 1 GiB, min 0/max 1 instance, concurrency 20, timeout 300s, Secure cookie, APP_ORIGIN là URL HTTPS thật, `SYNC_INTERVAL_SECONDS=0`.
- Job: cùng image/runtime identity/SQL, 1 task, 1 retry, timeout 600s. Cloud Scheduler gọi jobs.run mỗi 5 phút bằng OAuth identity riêng, chỉ có Run Invoker trên job.
- Gemini giữ `gemini-4-argon` tại location global. Sheet đọc qua API v4. Không triển khai managed Agent Runtime.

## Triển khai phiên bản tiếp theo

1. Chạy kiểm thử trên QA riêng và build frontend. Không chạy integration tests trên database local/cloud đang phục vụ người dùng.
2. Build từ source đã kiểm tra, dùng tag Git SHA; kiểm tra `.dockerignore`/build context không chứa secrets hoặc dữ liệu. Ví dụ:
   ```sh
   gcloud builds submit SOURCE_ONLY_DIRECTORY --project=prapplication-479309 --tag=asia-southeast1-docker.pkg.dev/prapplication-479309/cloud-run-source-deploy/misa-event-report:GIT_SHA
   ```
3. Lấy digest từ kết quả build, ghi lại revision/image trước khi cập nhật. `deploy/cloud-run.ps1` nhận Project, SqlConnection, ServiceAccount, Image (digest), Origin và ba tham số secret `NAME:VERSION`. Chỉ thêm `-PublicAccess` khi được phép mở Internet như môi trường hiện tại. Mặc định script yêu cầu Cloud Run IAM.
4. Cập nhật cả service lẫn sync job. Giữ min/max instance hiện tại cho đến khi có distributed rate limiting và kiểm thử pool/database. Thay schema cần migration và kế hoạch rollback tương thích dữ liệu.
5. Kiểm tra health, trang đăng nhập, API chưa đăng nhập trả 401, forced-password gate với tài khoản kiểm thử phù hợp, cookie Secure/HttpOnly/SameSite và job thực thi thành công. Không thay mật khẩu thật của người dùng để kiểm thử.

## Khởi tạo và chuyển dữ liệu

Dump local bằng `pg_dump --format=custom --no-owner --no-acl --exclude-table-data=sessions --exclude-table-data=invitations` vào thư mục bảo mật ngoài Git. Restore vào Cloud SQL mới qua Cloud SQL Auth Proxy; không sửa/xóa volume local. Đối chiếu event, snapshot, tổng đăng ký và mục tiêu.

Khi chuyển lần đầu theo yêu cầu chủ dự án, Super admin được cấp mật khẩu ngẫu nhiên mới và `must_change_password=true` trên **database cloud**. Không mang session local lên cloud. Sau đó bootstrap giữ nguyên mật khẩu tài khoản đã tồn tại; restart/redeploy không reset password. Mật khẩu thành viên mới là secret riêng, cũng buộc đổi lần đầu; không dùng mật khẩu Super admin cho thành viên.

## Đồng bộ và vận hành

Scheduler HTTP POST:
`https://run.googleapis.com/v2/projects/prapplication-479309/locations/asia-southeast1/jobs/misa-event-report-sync:run`

Lịch `*/5 * * * *`, timezone `Asia/Ho_Chi_Minh`, body `{}`, OAuth SA `misa-event-report-scheduler@prapplication-479309.iam.gserviceaccount.com`. Dùng OAuth, không dùng OIDC cho Google APIs endpoint. Job giữ snapshot trước nếu nguồn lỗi; kiểm tra cả execution status và `events.sync_error` vì syncAll xử lý lỗi từng sự kiện.

Lệnh kiểm tra không chứa bí mật:
```sh
gcloud run services describe misa-event-report --project=prapplication-479309 --region=asia-southeast1
gcloud run jobs executions list --job=misa-event-report-sync --project=prapplication-479309 --region=asia-southeast1
gcloud scheduler jobs describe misa-event-report-sync --project=prapplication-479309 --location=asia-southeast1
gcloud sql backups list --instance=misa-event-report-db --project=prapplication-479309
```

Revision đầu `00001-rdp` chỉ dùng chuẩn bị với origin placeholder; không chọn làm rollback. Baseline bàn giao hợp lệ là `misa-event-report-00002-ql5`.

Rollback UI/API bằng `gcloud run services update-traffic ... --to-revisions=PREVIOUS_REVISION=100`, và cập nhật job về digest trước đó. Không rollback DB mù. Nếu cần phục hồi dữ liệu, restore backup/PITR vào instance khác, kiểm chứng rồi mới chuyển connection secret/revision. Bản local và dump chuyển dữ liệu là phương án đối chiếu ban đầu; sau khi cloud có ghi mới, không dùng local cũ thay thế cloud.

Chưa chốt RPO/RTO, retention nghiệp vụ, cảnh báo/on-call và load test. Limiter hiện trong RAM; max instance 1 giảm phân tán nhưng không thay thế limiter dùng chung khi scale. Chưa có MFA, SSO hay reset qua email. Không tuyên bố đã restore drill từ Cloud SQL backup chỉ vì đã restore dump local thành công.

## Tham khảo

- [Cloud Run + Cloud SQL PostgreSQL](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Public Cloud Run services](https://docs.cloud.google.com/run/docs/authenticating/public)
- [Schedule Cloud Run jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule)

## Cutover v5 (18/10/2026)
Trước migration: backup Cloud SQL thành công, dump riêng ngoài Git, rehearsal trên QA. Pause Scheduler, đợi job cũ hoàn tất; deploy image mới với command `node server/maintenance.js` (503, health200, không DB), rồi chuyển command sang `node server/index.js` để migrate/backfill. Cập nhật job cùng digest, chạy kiểm chứng rồi resume Scheduler. Không thay secret/password/origin/ingress/SQL. Sau khi writer v5 hoạt động, hướng dẫn rollback UI về revision v4 phía trên KHÔNG áp dụng; dùng maintenance + forward-fix hoặc restore/PITR vào DB khác và đối soát.
