# Kiểm chứng bản v3 — 16/10/2026

## Đã kiểm tra

- Docker multi-stage Vite build thành công; backend Node24/PostgreSQL16.4.
- 15/15 tests đạt trên QA localhost:8097 riêng: miền email/password policy, ngày UTC+7, dedup, nguồn AND, slug, XLSX parser, report export, full integration bốn cấp quyền/forced change/member Excel/cross-event write isolation/attendance modes/session revoke.
- UI browser nguồn a: total4→2, completion40%→20% ngay khi chọn. Desktop MDS header/sidebar; mobile composition không header/sidebar desktop.
- Mobile 320/360/390/430/768: root không tràn ngang, document height bằng viewport. Ngày đăng ký hiển thị14/10/2026,15/10/2026. Chi tiết phạm vi UI-VERIFICATION.md.
- Backup pg_dump custom trước migration; pg_restore --exit-on-error vào events_restore_check thành công. Main và restored DB đều1event/2snapshots/134active rows; main sau migration schema3, dữ liệu giữ nguyên.
- Bản local localhost:8096 đã nâng schema3 và UI mới, không đổi Compose project/volume. Session cũ bị thu hồi theo migration. Super admin bắt đổi mật khẩu ở lần đăng nhập đầu.
- npm install audit tại thời điểm thực hiện:0 vulnerabilities.

## Bổ sung luồng đăng nhập và danh sách sự kiện

- 19/19 tests đạt trên QA riêng: thêm 4 test navigation, kiểm tra SPA entrypoints và role Viewer/Editor riêng từng event sau revoke. Docker build thành công, bản localhost:8096 được cập nhật giữ nguyên schema/volume.
- Browser QA: mở deep link khi chưa đăng nhập chuyển `/log-in`; đăng nhập về `/su-kien`; cùng tài khoản có Viewer ở một sự kiện và Editor ở sự kiện khác. Viewer không có nút Nhập dữ liệu; Editor có. Refresh giữ route hợp lệ; logout và Back sau logout đều về `/log-in`.
- Danh sách desktop có nhãn quyền, tìm tên, ngày dd/mm/yyyy. Mobile 390px dùng composition riêng; 320px document width = scroll width = 320, bộ lọc Được sửa chỉ còn sự kiện được cấp Editor.
- Ảnh bằng chứng QA: `../MISA-Event-Report-event-list.png` và `../MISA-Event-Report-event-list-mobile.png` (artifact local, dữ liệu thử nghiệm).

## Giới hạn hiện tại

MISA server/IP allowlist chưa triển khai do thiếu máy chủ và danh sách IP. Cloud Run/managed Agent Runtime chưa deploy. Mobile native host/OS accessibility chưa kiểm chứng; không gọi production-ready hoặc compliant toàn bộ MDS/backend standard. Rate limiter RAM, draft restore và một số audit atomic tiếp tục ở active context.

## 17/10/2026 — Tự tổng hợp và cập nhật mới nhất

- Build Docker/Vite thành công. `npm test` trên stack QA riêng: 24/24 pass, 0 skip, gồm kiểm tra payload AI chỉ giữ aggregate nguồn và loại tên nhân viên/raw rows/file metadata.
- Kiểm thử mới: auto import công bố ngay, file thiếu mapping giữ snapshot cũ, pending theo user/event, Viewer không được import, staff/date/source filters, empty date range vẫn giữ options, latest so với snapshot lịch sử, concurrent commit một thành công/một 404, ba refresh đồng thời chỉ đọc Sheet một lần, lỗi nguồn giữ snapshot, autoSync tắt không fetch. Sheet cũ được bổ sung chiều nhân viên ở snapshot mới.
- Store test: import xóa bộ lọc/snapshot cũ và về tổng quan; refresh giữ filter, lịch sử không tự sync, kết quả AI cũ không ghi đè report mới.
- Browser QA dùng host 127.0.0.1:8097 tách cookie localhost. Tạo sự kiện mới, chọn CSV 3 dòng: tự về Tổng quan, total=3, clevel=1, có dữ liệu tháng trước không bị lọc mất. Chọn Nhân viên A: total=2; Xem toàn bộ mới nhất: total=3. Khi QA không cấu hình Gemini, notice rõ, KPI vẫn hoạt động.
- Mobile composition có bộ lọc và report; kiểm tra viewport 320/360/390/430/768: document scrollWidth bằng viewport, không tràn ngang ở root. Chưa kiểm chứng native host/thiết bị thật; không phải chứng nhận đầy đủ MDS/native.
- Local giữ nguyên volume và tài khoản; đã backup DB trước thay đổi ngoài Git. Đối chiếu UI thực tế: 134 đăng ký, 84 C-Level, completion=9,93%; bộ lọc Tên tiếp nhận có trên nguồn Sheet cũ. Không import dữ liệu QA vào local.

Gemini đã tự tạo nhận xét trên local, KPI không chờ AI. Nguồn Sheet thật refresh thành công và đã có Tên tiếp nhận; toàn bộ 134 dòng có ngày hợp lệ.

## 17/10/2026 — Dashboard, trạng thái gọi và header
- Docker production build thành công. Suite QA riêng: **29/29 đạt**, không skip; thêm kiểm thử nhiều lần gọi, Đ viết hoa, blank/unknown, filter ngày/nguồn, zero denominator, utm_content khác utm_term, hai ô tham dự, ngày không có đăng ký, Excel call rate, chiều mặc định utm_campaign.
- Integration kiểm tra trạng thái gọi trong rows, từ chối enum sai, Editor cập nhật tạo snapshot mới, KPI mới 75% và snapshot lịch sử giữ 50%; filter online bao gồm both. Bộ phân quyền Viewer/Editor/Admin/Super admin và tenant cũ vẫn đạt.
- Local thật giữ nguyên volume, sao lưu ngoài repo trước cập nhật. Sau sync: 134 đăng ký, 119 called, call_rate 88,81%, call_unknown 0, event offline; Gemini nhận xét đúng KPI mới. Không in dữ liệu khách hoặc credentials trong kết quả kiểm tra.
- UI browser: header picker chuyển sự kiện, logo về /su-kien; bảng đăng ký có utm_content/Gọi xác nhận và bỏ Hình thức. Dashboard offline không có filter/card tham dự; QA hybrid có đúng 2 lựa chọn + tất cả và KPI đúng theo filter.
- Browser mobile 320/360/390/430/768px không tràn ngang ở root/card. Desktop 1440px kiểm tra nhãn, màu, legend và trend. Native MISA AMIS host, thiết bị thật/OS font vẫn chưa kiểm chứng.

## 17/10/2026 — compact dashboard and target details
- Final backend suite: 35/35 passed, 0 skipped in isolated QA PostgreSQL (including concurrent sync/import protection, target-only changes/history, CSV retaining goals, XLSX import/export, safe AI tab allowlist, identifier restoration, multi-filter paging and auth). No tests ran on serving data.
- Production Vite build passed; final frontend asset index-VGNdRDeR.js. Final frontend-only polish narrowed the target table and made PNG creation await Blob completion; verified in browser afterward.
- Real supplied Sheet read-only verification: 134 registrations, 31 B:I goal rows; explicit total 1,350 vs details1,650. Deployed local schema v4, original Docker project/volume retained; backup before-target-details-20261017.dump outside Git (0600).
- Actual web: C-Level84/1350=6.22%, called119/134=88.81%, goal tracking matches129;5unmatched included in overall KPI. No dedup setting changed (none remains).
- Browser: report filter/metadata collapse toggled; QA multi-select positions + callstatus combined to70 results; 20→50→100 paging correct, phone+tax restored with leading0. Targets has31rows/8columns, no horizontal clipping at1440 (table1176/client1176). PNG render finished and UI confirmed Blob creation. Browser download-event waiter timed out; did not independently inspect saved PNG bytes. Excel bytes verified in automated tests.
- Screenshot outside Git: ../.misa-event-report-local/dashboard-target-details-20261017.jpg. Browser viewport override reset after testing. No remote Sheet writes or Git push.

## 17/10/2026 — all-list pagination
- 36/36 tests passed, zero skipped, on isolated QA PostgreSQL. New pagination test verifies 121 records across 20/50/100, last page, empty/filter reset, identical re-render stability and full export view restoring current page. API regression creates >100 audit entries and verifies page sizes, last-page clamp, total, invalid query rejection, event isolation and Viewer denial.
- Final Vite build passed: index-cV6EYopH.js. Local app recreated with original Docker project/database volume; no schema change.
- Browser QA audit: 114 total, default20; last page101–114 has14, switch50 displays50, switch100 displays100. Mobile390px: next21–40,100 rows, document width390 (no root overflow).
- Live target report:31 total,20 first page,11 second page,50 displays31; all four report tables expose only20/50/100. PNG from second page completed renderer (1244×1623), then restored page21–31 (11rows), no console errors. Did not independently inspect downloaded PNG bytes.
- Screenshot outside Git: ../.misa-event-report-local/paging-20-50-100-20261017.jpg.

## 17/10/2026 — target panel cleanup and publication
- Removed the repeated target heading, B:I implementation description, explanatory notices and formula footnote from the panel; retained the tab, data, automatic discovery/sync and pagination. Quality metadata and Excel reconciliation rows remain available.
- Final build index-DlnYPOim.js; 36/36 tests passed again, zero skipped, in isolated QA PostgreSQL. Local Docker updated without changing volume/schema.
- Browser desktop1440 and mobile composition: target tab shows31 total /20 first-page records, no removed annotation blocks. Screenshot ../.misa-event-report-local/targets-clean-20261017.jpg outside Git. No native-host acceptance claim.
- Reviewed tracked/untracked publication scope; credential-pattern scan of149 candidate files found no private key/token/service-account JSON. Runtime configuration, credentials, backups and screenshot evidence stay outside repository.

## 17/10/2026 — compact report toolbar, no export buttons
- Production build passed (index-DpigzaTb.js);36/36 existing tests passed, zero skipped, on isolated QA PostgreSQL. No backend/schema changes.
- Actual local desktop1440×1000: one57px toolbar holds report controls and create/import actions; first KPI row begins at226.5px. Tabs and report selections share a row. Removed Excel/image buttons and the standalone default-filter summary.
- Browser verified filter/metadata toggles, percent toggle via its visible label, and target tab hiding percent control. Mobile390×844: root width390, no overflow, both panels toggle, zero export buttons. Viewport reset afterward.
- Screenshot outside Git: ../.misa-event-report-local/report-toolbar-20261017.jpg. Native MISA AMIS runtime acceptance remains unverified.

## 17/10/2026 — chart and member simplification
- Production Vite build passed (index-BKqhLHW6.js). Isolated QA:38/38 tests passed, zero skipped. Added coverage: no automatic insights request; single-member payload omits role and API defaults to Editor; actual shipped XLSX template loaded, populated and imported successfully.
- Template headers exactly STT/Họ và tên/Email, no sample accounts. Artifact-tool preview inspected; OOXML namespace compatibility fixed for ExcelJS. Served localhost asset bytes match the tested source workbook.
- Desktop1440×1000: donut full outside labels, compact name/value legend, KPI starts171px; no repeated event/latest row or Gemini panel. Add-member dialog has exactly name/email, no role radio. Mobile390×844: full donut labels and wrapped legend, root scrollWidth390. Native host acceptance remains unverified.
- Evidence outside Git: ../.misa-event-report-local/dashboard-member-polish-20261017.jpg and dashboard-member-mobile-20261017.jpg. Original Docker project/database volume retained; no production test records created.

## 17/10/2026 — mobile redesign
- 38/38 regression tests passed, zero skipped, in isolated QA PostgreSQL. Frontend-only subsequent polish covers sheet forms/focus and wrapping chart labels; no backend/schema edits. Final production build passed (index-CLelQVIE.js).
- Browser interaction and six-size matrix detailed in UI-VERIFICATION.md. Live data remains134 registrations; temporary UI filters cleared. Original compose project/database volume retained. Native-host limits unchanged.
