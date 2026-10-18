# 04 — API hiện tại (schema v3)

JSON errors `{error}`. API cần session cookie trừ health/login. R = mọi user active đã đổi mật khẩu; E = Editor/Admin event hoặc Super admin; A = Admin event/Super admin; S = Super admin. Viewer mặc định xem mọi event.

## Auth

| Route | Input / hành vi |
|---|---|
| GET /api/health | Public, DB health |
| POST /api/login | email/password, kiểm tra MISA domain + active, cookie12h |
| GET /api/me | id,email,name,global_role,must_change_password,model,fields |
| POST /api/logout | Xóa session |
| POST /api/password | current/password; policy10–128 đủ hoa/thường/số/đặc biệt, không dùng lại current/default; thu hồi sessions, cấp mới |

User must_change_password chỉ dùng me/logout/password; route còn lại403. Không có accept-invite/join/invite nữa. Không signup công khai.

Browser GET `/log-in`, `/su-kien`, `/change-password` trả SPA shell, không trả dữ liệu bảo vệ. Client chuẩn hóa URL theo session: chưa đăng nhập → `/log-in`; đăng nhập thành công → `/su-kien`; cần đổi mật khẩu → `/change-password` rồi danh sách. API vẫn kiểm tra session, forced-change và quyền từng sự kiện độc lập với URL giao diện.

## Events / members

| Route | Quyền | Input / output |
|---|---|---|
| GET /api/events | R | Tất cả events + slug/mode/role; không membership là viewer |
| POST /api/events | Global Admin/S | name,event_date ISO/null,mode online/offline/hybrid;201 id/slug |
| GET /api/events/:eventId | R | event + settings/source/role |
| PATCH /api/events/:eventId | E | name,event_date,mode; slug giữ ổn định |
| PUT /api/events/:eventId/settings | E | target,clevel,dedup,targets,reports |
| GET /api/events/:eventId/members | E | Danh sách active Admin/Editor |
| POST /api/events/:eventId/members | A | name,email; chỉ role editor, role admin/viewer bị403 |
| POST /api/events/:eventId/members/import/preview | A | multipart file10MB, hai cột Họ và tên/Email; max500; rows/errors/total, chưa ghi DB |
| POST /api/events/:eventId/members/import | A | rows[{name,email,role:editor}]; validate lại + atomic provision; trảcount |
| PATCH /api/events/:eventId/members/:userId | A | Luôn403; dùng /api/admins để cấp Admin toàn app |
| DELETE /api/events/:eventId/members/:userId | A | Admin chỉ xóa editor; Super xóa admin/editor; không xóa tài khoản |

Settings target0–10.000.000 nguyên, clevel≤40, dedup none/email/phone, targets≤500 gồm group/name/code/target code unique sau norm; reports≤5. Account mới default password env + forced change; existing account không reset password/name. Email MISA và subdomain thật; spoof suffix bị400.

## Nguồn và nhập dữ liệu

Prefix `P = /api/events/:eventId`. Tất cả route trong nhóm cần E.

| Method / đường dẫn | Input | Output / lỗi |
|---|---|---|
| POST `P/import/file` | multipart file bắt buộc, sheetName?, headerRow? (1–50, mặc định 1) | StageResult; .xlsx/.csv ≤10 MB; thiếu/không đọc được 400 |
| POST `P/import/sheet` | `{url,sheetName?,headerRow?}` | StageResult; URL docs.google.com; Google 403/502 |
| POST `P/import/:importId/ai` | Không | Mapping do model gợi ý, đã kiểm tra cột tồn tại; 503 thiếu project, 502 model lỗi |
| POST `P/import/:importId/preview` | `{mapping}` | `{quality,sample,summary}`; chưa thay active snapshot |
| POST `P/import/:importId/commit` | `{mapping,autoSync?}` mặc định false | `{id}` snapshot mới; transaction khóa event, xóa staging, thay source |
| POST `P/sync` | Không | `{changed,count}`; 400 nếu chưa bật nguồn; fetch thất bại không thay snapshot |
| PATCH `P/source` | `{enabled:boolean}` | `{ok:true}`; chưa có source 400 |

**StageResult:** `{id,headers,sample,count,mapping,tabs?,sheetName?}`; sample tối đa 5 dòng raw. Staging chỉ dùng trong 1 ngày, đúng event và user đã tạo; ngoài phạm vi hoặc đã commit nhận 404.

**Mapping:** object các key name/email/phone/company/position/size/industry/submitted_at/tracking/source/attendance_mode; value tên header chính xác hoặc chuỗi trống. submitted_at và position bắt buộc được ghép. Dữ liệu chuẩn hóa chứa 11 trường trên cộng id dòng. `quality={total,invalidDates,missingPosition,duplicateRows}`.

## Báo cáo, dữ liệu, AI, audit

| Method / đường dẫn | Quyền | Input | Output |
|---|---|---|---|
| GET `P/snapshots` | R | Không | Tối đa 100 `{id,label,created_at}`, mới trước |
| GET `P/report` | R | query snapshot?, from?, to?, compareFrom?, compareTo? | Report bên dưới |
| GET `P/rows` | E | query snapshot?, page? ≥1, q? ≤150 ký tự | `{rows,total,page}` 50 dòng/trang, tìm name/company/email/tracking |
| PATCH `P/rows/:rowId` | E | `{snapshot,row}` đủ 11 trường chuỗi ≤1.000 | `{id}` snapshot mới; active khác 409; row không có 404; ngày sai 400; dừng sync |
| POST `P/insights` | R | query cùng report; body không dùng | `{summary,observations,model,snapshot}`; tối đa 8 observations sau kiểm tra schema; Google/model lỗi 403/502/503 |
| GET `P/audit` | A | Không | 100 bản gần nhất `{action,detail,created_at,name}` |

**Report:** `{snapshot:{id,label,created_at},quality,current,comparison,range}`. Chưa có snapshot trả current từ mảng rỗng, snapshot.id null. comparison null khi không chọn kỳ; chọn kỳ phải đủ hai ngày, ngày đầu không sau ngày cuối. Snapshot ngoài event nhận 404.

**Summary:** total, clevel, clevel_share, completion, target, positions/sizes/sources (`{label,count,percent}`), targets (`{group,name,code,target,count,clevel,completion,clevel_share,clevel_completion}`), groups (`{name,target,count,clevel,tracking_codes}`), trend (`{label:YYYY-MM-DD,count}`), unmapped, invalidDates, targetSum.

`clevel_share = C-Level / đăng ký`; `completion = đăng ký / mục tiêu`. Theo yêu cầu mới riêng ô KPI “Tỷ lệ C-Level” dùng completion; hợp đồng API và bảng chi tiết không đổi.

## Bổ sung nguồn khách, Excel và URL

- GET/POST `/api/events` và GET event trả thêm slug; tạo event trả `{id,slug}`. Slug được tạo từ tên không dấu và suffix 6 hex, không thay thế UUID trong API.
- StageResult thêm sourceColumns và discovery. Preview/commit nhận sourceColumns tùy chọn; tối đa 12 cột hiện có, duy nhất, không phải tên/email/phone/address/password. Bỏ qua field thì dùng danh sách đã tự nhận diện. Header mapping AI route vẫn giữ hợp đồng cũ.
- GET report, POST insights và GET export.xlsx nhận query `sourceFilters` là JSON object `{tên cột:giá trị}`, ≤12 cặp, key ≤200, value ≤1.000 ký tự, encoded query ≤10.000. Nhiều cặp kết hợp AND. Giá trị rỗng chọn nhóm chưa xác định. Sai JSON hoặc field không thuộc snapshot trả 400. Cùng bộ lọc áp dụng cả hai kỳ.
- Report thêm sourceDimensions (options theo kỳ hiện tại trước lọc nguồn), range.sourceFilters, current/comparison.sourceBreakdowns (`{name,values:[{value,label,count,percent}]}`). Tỷ lệ lấy tổng đăng ký sau lọc. Dữ liệu cũ fallback Nguồn khách/Mã tracking.
- **GET `P/export.xlsx`**, quyền R và expensive limiter: query cùng report, thêm reports chuỗi phân cách dấu phẩy trong 5 loại hợp lệ; thiếu thì xuất tất cả, rỗng xuất tổng quan và hình thức. Trả binary XLSX, Content-Disposition attachment filename MISA-Event-Report.xlsx. Tổng quan luôn có; loại chọn có sheet kỳ hiện tại và kỳ so sánh khi có. Dữ liệu tổng hợp, không raw lead. Lỗi quyền/filter cùng report, 429 khi quá giới hạn.
- Browser GET `/:slug/tong-quan`, du-lieu, nguon-du-lieu, muc-tieu, thanh-vien, nhat-ky trả index.html. Client chọn event từ danh sách được cấp quyền; slug lạ hoặc trái quyền không tự chuyển sang sự kiện khác. API vẫn xác thực và authorize bình thường.

## Query hình thức v3

Report/insights/export thêm mode=all|online|offline|both|unknown (mặc định all), áp dụng cả hai kỳ. Summary thêm modes[{value,label,count,percent}]. Các nhóm loại trừ nhau. Excel luôn thêm sheet Hình thức mỗi kỳ; còn lại theo reports được chọn.

## 17/10/2026 — Nhập tự động và báo cáo mới nhất

- POST import/file nhận multipart `automatic=true`; import/sheet nhận JSON `automatic:true`. Khi mapping hợp lệ, tự công bố và trả StageResult + `committed:true,snapshotId`; thiếu mapping/dữ liệu rỗng trả `needsMapping:true,notice`, giữ snapshot cũ. Không truyền automatic vẫn dùng staging thủ công.
- GET `P/imports/pending`, quyền E: trả phiên staging mới nhất còn hạn của chính user trong event hoặc null; không trả staging của người khác.
- POST `P/refresh`, quyền R + expensive limiter: chỉ đồng bộ nguồn đã enabled; không nhận URL/mapping từ client. Trả `{changed,skipped?}` hoặc `{changed:false,warning}` nếu Google lỗi. File/nguồn tắt không bị thay đổi. Cooldown 15 giây kiểm tra trong transaction dưới row lock.
- Report thêm `generatedAt,totalRows,source:{enabled,checkedAt,error}`. Mặc định không có date/snapshot filter là toàn active snapshot. `sourceDimensions` lấy toàn snapshot sau dedup để luôn giữ lựa chọn nhân viên/nguồn ngay cả khi lọc ngày rỗng; số liệu và Excel vẫn dùng đúng bộ lọc.

## Bổ sung gọi xác nhận và hai hình thức — 17/10/2026
`report.current/comparison` thêm `called`, `call_rate`, `call_unknown`, `attendance` (chỉ online/offline). `modes` giữ bốn giá trị để tương thích và ghi chú thiếu/cả hai. Lọc `mode=online/offline` bao gồm bản ghi `both`, khớp KPI; `all/both/unknown` cũ vẫn được API hỗ trợ. `rows` trả `call_status`, `call_attempts`, `utm_content`. PATCH row nhận `call_status` enum tùy chọn để client cũ không bị lỗi; sửa trạng thái tạo snapshot và xóa chi tiết lần gọi cũ trên dòng đã sửa. Mapping import là partial record có whitelist keys; hai cột bắt buộc vẫn được kiểm tra ở normalizeRows. Excel mặc định không có Mục tiêu, chỉ xuất sheet Hình thức với event hybrid và hai dòng Online/Offline; có tử số/mẫu số và tỷ lệ gọi ở Tổng quan.

## Bổ sung 17/10/2026 — mục tiêu và lọc danh sách
- GET rows: `pageSize` chỉ 20/50/100 (mặc định20); `filters` JSON object strict với call_status/position/utm_content/company, mỗi trường mảng tối đa100 chuỗi; `from`,`to` ISO ngày UTC+7 inclusive. OR trong trường, AND giữa trường. Lọc trước phân trang; tự kẹp page khi hết dữ liệu. Trả options từ toàn bộ phiên, hasTaxId, page/pageSize/total. q cũng tìm phone/tax_id.
- Report.current/comparison thêm clevel_completion và targetPlan (kế hoạch theo snapshot + kết quả từng dòng + unmatched). target lấy tổng kế hoạch nếu có; source/date/mode/dedup áp dụng chung.
- Row PATCH hỗ trợ tax_id optional; chuẩn hóa phone/tax_id, giữ target_plan khi tạo snapshot sửa. Báo cáo lịch sử giữ kế hoạch của phiên, dùng cấu hình lọc trùng/C-Level hiện tại như trước.
- Export reports=targets: bảng Chi tiết mục tiêu8cột tương ứngB:I, số thật và định dạng %, cảnh báo chênh lệch/mã chưa khớp. KPI C-Level dùng clevel_completion.

## Phân trang nhật ký — 17/10/2026
GET `/api/events/:eventId/audit` vẫn giới hạn Admin/Super admin, đổi từ mảng tối đa100 sang `{rows,total,page,pageSize}`. `page` nguyên1–1000000 (mặc định1), `pageSize` chỉ20/50/100 (mặc định20); sai đầu vào trả400. SQL parameterized count+page cùng snapshot, thứ tự id giảm dần, kẹp trang cuối; không cắt lịch sử ở100bản ghi.

## 18/10/2026 — nguồn, hồ sơ và liên hệ
Các route dưới `/api/events/:eventId` giữ session, forced-password và quyền event hiện hữu.
- GET `/sources`; PATCH `/sources/:sourceId` {enabled} chỉ Admin/Super admin. Nhiều nguồn Sheet độc lập.
- GET/PUT `/assignments` chỉ Admin/Super admin, body {assignments:[{code,user_id}]}; user phải là thành viên event.
- POST `/rows`: thêm khách; PATCH `/rows/:rowId`: {version,row}, xung đột version trả409. Editor chỉ khách thuộc mã đã được phân công. call_status không sửa qua PATCH; client cũ được yêu cầu reload.
- GET `/rows/:rowId/contacts`: lịch sử, page/pageSize20/50/100. POST cùng đường dẫn: {version,channel,called,response,note,follow_up_at}; channel phone/paper/email/other, response pending/confirmed/declined/no_answer/call_back. Chỉ phone được called=true.
- GET `/conflicts` phân trang20/50/100; POST `/conflicts/:id` {registration_id: UUID hoặc null} để Admin chọn hồ sơ phù hợp hoặc tạo mới.
- Import thêm mode auto/online/offline, registrationStatus invited/registered; sheetName `*` đọc mọi tab danh sách, headerRow0 tự tìm header. File Editor chỉ nhận khách đã phân công; nguồn Sheet/mục tiêu chỉ Admin. Commit bổ sung/cập nhật, không thay toàn bộ danh sách.
- Rows thêm lọc mode, registration_status, department, staff_code, assignee_id, contact_response. Report mode online/offline/unknown áp dụng mục tiêu đúng kênh; unknown không có mục tiêu suy đoán.

## 18/10/2026 — quyền toàn app v6
`GET /api/admins` (Super only) trả[{id,name,email,active}] global Admin; `POST` nhận{name,email}, trả201{id}; email MISA, không reset tài khoản cũ, mới buộc đổi mật khẩu. Trùng Admin/Super hoặc inactive trả409. `DELETE /api/admins/:userId` thu hồi global role về viewer, không xóa account/membership/password; không có Admin hoặc chỉ định Super trả404. Audit admin.granted/admin.revoked với event_id null trong cùng transaction.
Viewer chỉ dùng overview/report metadata, snapshots và automatic refresh. GET rows, contacts, sources, members và export.xlsx cần E; conflicts/assignments/audit cần A. GET event chỉ trả allowlist metadata/settings, không trả nguyên record DB/config nguồn. Browser `/thiet-lap-thanh-vien` chỉ hiển thị cho Super; server vẫn tự kiểm tra mọi request.
