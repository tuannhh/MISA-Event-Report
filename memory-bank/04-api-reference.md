# 04 — Tham chiếu API v1

Nguồn: `server/index.js`, `server/auth.js`. Có **29 API route**, cộng một SPA fallback regex. JSON cùng origin; cookie `session`. Các endpoint trừ health/login/accept-invite cần đăng nhập. `R` = thành viên sự kiện (owner/editor/viewer), `E` = owner/editor, `O` = owner. Không có quyền admin/super_admin trong baseline.

## Quy ước chung

- JSON request tối đa 1 MB. Các mutation có Origin header phải trùng APP_ORIGIN; API đặt Cache-Control no-store.
- Response thành công 200, riêng tạo event 201. Lỗi `{error: string}`: 400 dữ liệu sai, 401 chưa đăng nhập/sai login, 403 thiếu quyền hoặc nguồn không hợp lệ, 404 tenant/resource không thuộc phạm vi, 409 trùng hoặc xung đột snapshot, 413 upload quá lớn, 429 rate limit, 500 lỗi nội bộ đã ẩn chi tiết.
- Login/accept-invite chung limiter 30 request/15 phút/IP. Các route có giới hạn nặng dùng chung 12 request/phút/user (file, sheet, AI mapping, sync, insights); limiter trong RAM.
- ID event/snapshot/import là UUID. Range dùng ISO YYYY-MM-DD ở API; hiển thị là trách nhiệm UI. Cột ngày đọc theo UTC+7.

## Xác thực và người dùng

| Method / đường dẫn | Quyền | Input | Output và nhánh đặc biệt |
|---|---|---|---|
| GET `/api/health` | Công khai | Không | `{ok:true}` sau SELECT 1 DB; lỗi DB 500 |
| POST `/api/login` | Công khai | `{email,password}` | `{ok:true}` và cookie 12h; sai thông tin 401 |
| POST `/api/accept-invite` | Công khai | `{token,name,password}` token 64 ký tự; password 12–128 | Tạo tài khoản và membership; cookie. Invite hết hạn/đã dùng 400; email đã tồn tại 409 |
| GET `/api/me` | Đăng nhập | Không | `{id,email,name,model,fields}` |
| POST `/api/logout` | Đăng nhập | Không | Xóa session hiện tại, clear cookie, `{ok:true}` |
| POST `/api/password` | Đăng nhập | `{current,password}` password mới 12–128 | Kiểm tra mật khẩu cũ; đổi hash, xóa mọi session cũ, tạo session mới; sai mật khẩu cũ 400 |
| POST `/api/join` | Đăng nhập | `{token}` | Nhận invite đúng email, xóa invite; `{ok:true}`. Membership có sẵn giữ nguyên role. Token sai/email sai/hết hạn 400 |

Không có signup công khai, reset password qua email hoặc bắt buộc đổi lần đầu. V1 chưa giới hạn email MISA.

## Sự kiện và thành viên

| Method / đường dẫn | Quyền | Input | Output |
|---|---|---|---|
| GET `/api/events` | Đăng nhập | Không | Array `{id,name,event_date,active_snapshot_id,synced_at,sync_error,role}` chỉ sự kiện có membership |
| POST `/api/events` | Đăng nhập | `{name,event_date?}` name 1–150; date ISO hoặc null | 201 `{id}`; tạo owner cho người gọi |
| GET `/api/events/:eventId` | R | path ID | Bản ghi event gồm settings/source và role hiện tại |
| PUT `/api/events/:eventId/settings` | E | Toàn bộ Settings bên dưới | `{ok:true}`, audit settings.updated |
| GET `/api/events/:eventId/members` | R | Không | Array `{id,name,email,role}` |
| POST `/api/events/:eventId/invite` | O | `{email,role:viewer hoặc editor}` | `{url}` chứa token một lần, hạn 3 ngày; không gửi mail |
| PATCH `/api/events/:eventId/members/:userId` | O | `{role:viewer hoặc editor}` | `{ok:true}`; không sửa owner, 400 nếu không cập nhật được |
| DELETE `/api/events/:eventId/members/:userId` | O | path userId UUID | `{ok:true}`; không xóa owner, 400 nếu không xóa được |

**Settings:** `{target,clevel,dedup,targets,reports}`. target 0–10.000.000 nguyên; clevel tối đa 40 chuỗi; dedup none/email/phone; targets tối đa 500 `{group,name,code,target}` với code duy nhất sau norm; reports là mảng tối đa 5 giá trị targets/positions/sizes/trend/sources. V1 chưa có endpoint sửa tên/ngày sự kiện, xóa sự kiện hoặc thêm/import tài khoản trực tiếp.

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

**Mapping:** object các key name/email/phone/company/position/size/industry/submitted_at/tracking/source; value tên header chính xác hoặc chuỗi trống. submitted_at và position bắt buộc được ghép. Dữ liệu chuẩn hóa chứa 10 trường trên cộng id dòng. `quality={total,invalidDates,missingPosition,duplicateRows}`.

## Báo cáo, dữ liệu, AI, audit

| Method / đường dẫn | Quyền | Input | Output |
|---|---|---|---|
| GET `P/snapshots` | R | Không | Tối đa 100 `{id,label,quality,created_at}`, mới trước |
| GET `P/report` | R | query snapshot?, from?, to?, compareFrom?, compareTo? | Report bên dưới |
| GET `P/rows` | R | query snapshot?, page? ≥1, q? ≤150 ký tự | `{rows,total,page}` 50 dòng/trang, tìm name/company/email/tracking |
| PATCH `P/rows/:rowId` | E | `{snapshot,row}` đủ 10 trường chuỗi ≤1.000 | `{id}` snapshot mới; active khác 409; row không có 404; ngày sai 400; dừng sync |
| POST `P/insights` | R | query cùng report; body không dùng | `{summary,observations,model,snapshot}`; tối đa 8 observations sau kiểm tra schema; Google/model lỗi 403/502/503 |
| GET `P/audit` | O | Không | 100 bản gần nhất `{action,detail,created_at,name}` |

**Report:** `{snapshot:{id,label,created_at},quality,current,comparison,range}`. Chưa có snapshot trả current từ mảng rỗng, snapshot.id null. comparison null khi không chọn kỳ; chọn kỳ phải đủ hai ngày, ngày đầu không sau ngày cuối. Snapshot ngoài event nhận 404.

**Summary:** total, clevel, clevel_share, completion, target, positions/sizes/sources (`{label,count,percent}`), targets (`{group,name,code,target,count,clevel,completion,clevel_share,clevel_completion}`), groups (`{name,target,count,clevel,tracking_codes}`), trend (`{label:YYYY-MM-DD,count}`), unmapped, invalidDates, targetSum.

`clevel_share = C-Level / đăng ký`; `completion = đăng ký / mục tiêu`. Theo yêu cầu mới riêng ô KPI “Tỷ lệ C-Level” dùng completion; hợp đồng API và bảng chi tiết không đổi.

## Bổ sung nguồn khách, Excel và URL

- GET/POST `/api/events` và GET event trả thêm slug; tạo event trả `{id,slug}`. Slug được tạo từ tên không dấu và suffix 6 hex, không thay thế UUID trong API.
- StageResult thêm sourceColumns và discovery. Preview/commit nhận sourceColumns tùy chọn; tối đa 12 cột hiện có, duy nhất, không phải tên/email/phone/address/password. Bỏ qua field thì dùng danh sách đã tự nhận diện. Header mapping AI route vẫn giữ hợp đồng cũ.
- GET report, POST insights và GET export.xlsx nhận query `sourceFilters` là JSON object `{tên cột:giá trị}`, ≤12 cặp, key ≤200, value ≤1.000 ký tự, encoded query ≤10.000. Nhiều cặp kết hợp AND. Giá trị rỗng chọn nhóm chưa xác định. Sai JSON hoặc field không thuộc snapshot trả 400. Cùng bộ lọc áp dụng cả hai kỳ.
- Report thêm sourceDimensions (options theo kỳ hiện tại trước lọc nguồn), range.sourceFilters, current/comparison.sourceBreakdowns (`{name,values:[{value,label,count,percent}]}`). Tỷ lệ lấy tổng đăng ký sau lọc. Dữ liệu cũ fallback Nguồn khách/Mã tracking.
- **GET `P/export.xlsx`**, quyền R và expensive limiter: query cùng report, thêm reports chuỗi phân cách dấu phẩy trong 5 loại hợp lệ; thiếu thì xuất tất cả, rỗng chỉ xuất tổng quan. Trả binary XLSX, Content-Disposition attachment filename MISA-Event-Report.xlsx. Tổng quan luôn có; loại chọn có sheet kỳ hiện tại và kỳ so sánh khi có. Dữ liệu tổng hợp, không raw lead. Lỗi quyền/filter cùng report, 429 khi quá giới hạn.
- Browser GET `/:slug/tong-quan`, du-lieu, nguon-du-lieu, muc-tieu, thanh-vien, nhat-ky trả index.html. Client chọn event từ danh sách được cấp quyền; slug lạ hoặc trái quyền không tự chuyển sang sự kiện khác. API vẫn xác thực và authorize bình thường.
