# 03 — Lược đồ cơ sở dữ liệu

Nguồn thực thi duy nhất: `server/db.js:migrate()`. PostgreSQL; schema v3 (slug, roles/account, event mode). Trong các bảng dưới, `NN` = NOT NULL, `PK` = primary key, `FK` = foreign key. Cột không ghi NN/PK cho phép NULL. Không có ON DELETE CASCADE được khai báo.

## users — tài khoản

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| id | uuid PK | ID tài khoản |
| email | text NN UNIQUE | Email được API chuyển chữ thường |
| password | text NN | Salt và hash scrypt, không phải mật khẩu rõ |
| name | text NN | Tên hiển thị |
| global_role | text NN DEFAULT viewer, CHECK viewer/super_admin | Quyền toàn ứng dụng |
| must_change_password | boolean NN DEFAULT true | Bắt đổi mật khẩu |
| active | boolean NN DEFAULT true | Tài khoản đang hoạt động |
| created_at | timestamptz NN DEFAULT now() | Ngày tạo |

## sessions — phiên đăng nhập

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| token | text PK | SHA-256 của cookie token |
| user_id | uuid NN FK users(id) | Chủ phiên |
| expires_at | timestamptz NN | Hết hạn sau 12 giờ khi tạo |

## events — tenant sự kiện

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| id | uuid PK | Tenant ID |
| name | text NN | Tên sự kiện |
| slug | text NN, unique index events_slug_unique | Tên không dấu + '-' + 6 ký tự hex; URL ổn định |
| event_date | date | Ngày diễn ra |
| mode | text NN DEFAULT hybrid, CHECK online/offline/hybrid | Hình thức tổ chức |
| settings | jsonb NN | target, clevel, dedup, targets, reports |
| active_snapshot_id | uuid | Snapshot hiện hành, **chưa có FK** |
| source | jsonb | url, sheetName, headerRow, mapping, enabled, fingerprint |
| sync_error | text | Lỗi đồng bộ gần nhất |
| synced_at | timestamptz | Lần kiểm tra nguồn gần nhất |
| created_at | timestamptz NN DEFAULT now() | Ngày tạo |

## members — quan hệ nhiều user/nhiều sự kiện

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| event_id | uuid PK thành phần, FK events(id) | Sự kiện |
| user_id | uuid PK thành phần, FK users(id) | Tài khoản |
| role | text NN CHECK admin/editor | Quyền riêng trong sự kiện |

PK `(event_id,user_id)` chống membership trùng. Viewer là quyền đọc mặc định toàn ứng dụng; không cần membership. Super admin dùng users.global_role.

## snapshots — bản dữ liệu bất biến theo luồng ứng dụng

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| id | uuid PK | ID phiên |
| event_id | uuid NN FK events(id) | Tenant |
| label | text NN | Nguồn hoặc lý do tạo |
| rows | jsonb NN | Mảng 11 trường chuẩn hóa cộng id, source_details; attendance_mode là online/offline/both/unknown. Dòng cũ thiếu field đọc thành unknown. |
| quality | jsonb NN | total, invalidDates, missingPosition, duplicateRows |
| created_by | uuid FK users(id) | NULL khi đồng bộ nền |
| created_at | timestamptz NN DEFAULT now() | Ngày nhập |

Index `snapshots_event(event_id,created_at DESC)`. Bất biến được giữ bằng code tạo phiên mới, chưa có trigger/permission DB cấm UPDATE.

## imports — dữ liệu chờ duyệt

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| id | uuid PK | ID staging |
| event_id | uuid NN FK events(id) | Tenant |
| user_id | uuid NN FK users(id) | Người nhập; người khác không commit được |
| label | text NN | Tên nguồn |
| payload | jsonb NN | headers, raw, mapping, metadata nguồn |
| created_at | timestamptz NN DEFAULT now() | Hết hiệu lực nghiệp vụ sau 1 ngày |

## invitations — lời mời v1

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| token | text PK | SHA-256 token lời mời |
| event_id | uuid NN FK events(id) | Tenant |
| email | text NN | Người nhận |
| role | text NN CHECK viewer/editor | Quyền được mời |
| expires_at | timestamptz NN | Hạn 3 ngày |

Không có unique `(event_id,email)`; route xóa lời mời cũ trước khi chèn. Luồng lời mời dự kiến bỏ theo yêu cầu mới.

## audit — nhật ký

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| id | bigserial PK | Thứ tự |
| event_id | uuid FK events(id) | Tenant |
| user_id | uuid FK users(id) | Tác nhân, có thể NULL |
| action | text NN | Loại hành động |
| detail | jsonb NN DEFAULT '{}' | Metadata, có thể chứa email thành viên |
| created_at | timestamptz NN DEFAULT now() | Thời điểm |

Index `audit_event(event_id,created_at DESC)`.

## schema_versions

| Cột | Kiểu / ràng buộc | Ý nghĩa |
|---|---|---|
| version | integer PK | Phiên bản đã ghi nhận |
| applied_at | timestamptz DEFAULT now() | Thời điểm |

## Quan hệ và migration

users–members–events là nhiều/nhiều. events có nhiều snapshots/imports/invitations/audit; users có nhiều sessions và các bản ghi tác giả. `active_snapshot_id` được code kiểm soát; mọi truy vấn snapshot phải kèm event_id, không chỉ UUID.

Ngày 16/10/2026: v1 tạo 9 bảng bằng CREATE IF NOT EXISTS trong transaction và advisory lock 847201. Bootstrap dùng lock 847202. V2 thêm slug, backfill từng event còn null, đặt NOT NULL và unique index, ghi version 2; chạy lại giữ nguyên slug cũ. Các thao tác nằm cùng transaction/advisory lock. Đây chưa phải runner migration tách file tăng dần.

JSONB bổ sung không cần ALTER: rows có source_details `{tên cột:giá trị}`; source có sourceColumns, sourceHeaders và discovery `{columns,method,notice}`. imports.payload cũng có sourceColumns/discovery. Snapshot cũ không có source_details vẫn đọc được bằng fallback source/tracking; không sửa lịch sử để bổ sung dữ liệu không có.

Thay đổi quyền/account/channel tiếp theo phải có migration thực thi và tài liệu này cập nhật cùng lúc. Không tự sửa DB chạy thật chỉ bằng câu lệnh thủ công.

## Migration v3

Thực thi một lần dưới advisory lock và transaction: thêm ba cột users, events.mode; đổi owner → admin; xóa membership viewer vì quyền đọc đã mặc định; CHECK chỉ admin/editor; xóa invitations và sessions cũ. Bootstrap vô hiệu tài khoản ngoài miền MISA, tạo Super admin được cấu hình nếu chưa có, không reset mật khẩu tài khoản hiện hữu. Giữ events, snapshots, imports, audit và UUID/slug. Invitations chỉ còn bảng tương thích lịch sử, không có API sử dụng.

17/10/2026: không đổi schema SQL. JSON events.source thêm staffDimensionsVersion=1 khi nhập mới/sync để bổ sung chiều nhân viên cho nguồn Sheet cũ một lần. Các cột nhân viên nằm trong snapshots.rows[].source_details, không tạo tài khoản users. Staging automatic dùng cùng bảng imports và transaction publish hiện có; snapshot lịch sử không bị sửa.

## Dashboard và trạng thái gọi — 17/10/2026
Snapshot JSONB mới thêm `utm_content` (đúng cột UTM, không lấy utm_term thay thế), `call_status` (`called`, `not_called`, `unknown`) và `call_attempts` (tên cột, giá trị gốc từng lần gọi). Không đổi bảng/cột SQL, không cần migration DDL. Snapshot lịch sử thiếu trường gọi vẫn đọc được, tính vào chưa xác định. Lần đồng bộ Sheet kế tiếp chuẩn hóa lại từ nguồn, fingerprint mới tạo snapshot; không sửa snapshot cũ. File cũ cần nhập lại để bổ sung dữ liệu gọi chưa từng được lưu.

## Schema v4 — mục tiêu theo phiên (17/10/2026)
`snapshots.target_plan jsonb NULL`: version, label, range B:I, method (headers/gemini), target, leafSum, rows (id/name/code/kind/parent/share/target), retained nếu dùng lại kế hoạch từ bản nhập trước. Không lưu kết quả tính sẵn F:I; luôn tính theo registrations và bộ lọc. Không backfill vào snapshot lịch sử. Baseline trong db.js và delta idempotent server/migrations/20261017_target_plan.sql. Tiếp tục runner transaction/advisory lock hiện có; khác chuẩn manual migration là gap kiến trúc đã có, chưa thay vòng đời triển khai trong lượt này.

## 18/10/2026 — schema v5, hồ sơ khách bền vững
Migration `server/migrations/20261018_registration_registry.sql` thêm event_sources (nguồn độc lập, mode, config, mục tiêu, thời điểm cập nhật), registrations (UUID, dữ liệu nguồn, overrides do người dùng sửa, version), source_records (khóa dòng nguồn → hồ sơ), contact_logs (lịch sử liên hệ bất biến), staff_assignments (mã nhân viên → thành viên theo event), import_conflicts (đối chiếu danh tính), events.registry_initialized. Khóa ngoại đều gắn event/nguồn/hồ sơ; migration idempotent chạy trong advisory transaction lock.
Backfill active snapshot dưới event row lock; giữ nguyên các snapshot lịch sử và tài khoản. Khóa dấu vân tay canonical theo từng lần xuất hiện được gieo từ dữ liệu cũ để lần sync đầu không ghép sai các số điện thoại dùng chung. Snapshot mới là projection từ dữ liệu nguồn + overrides; không phải kho hồ sơ gốc. Mỗi cập nhật/import/contact tạo projection mới trong cùng transaction. Schema v5 không tương thích writer v4: không rollback traffic về app cũ sau khi đã ghi v5.


## 18/10/2026 — quản trị toàn app và luồng dữ liệu
Schema v6: migration `20261018_global_admin.sql` mở CHECK users.global_role thành viewer/admin/super_admin, idempotent theo schema_versions. Không cập nhật user/membership/data cũ. Global admin độc lập membership; audit cấp/thu hồi dùng event_id NULL. Không xóa tài khoản hay reset password khi thu hồi.
