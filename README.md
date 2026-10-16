# MISA Event Report

Tên repository: **MISA-Event-Report**. Bản ứng dụng v1 vẫn dùng tên hiển thị/package/Docker **MISA Event Insights** để giữ nguyên cấu hình và volume dữ liệu hiện tại.

Tài liệu kỹ thuật: [Memory bank](memory-bank/README.md), [quy tắc dự án](memory-bank/11-coding-rules.md), [yêu cầu tiếp theo và trạng thái triển khai](memory-bank/12-active-context.md). Memory bank được đối chiếu với mã nguồn theo [MISA Backend Standard](https://github.com/tuannhh/misa-backend-standard/tree/a940384030f86224a8775b82c4f72ee592104800).

**Trạng thái:** nội dung chức năng bên dưới mô tả v1. Yêu cầu mới về bốn cấp quyền, import thành viên, giới hạn email/IP, đổi mật khẩu lần đầu, sự kiện hybrid và MISA Design System chưa được triển khai trong baseline này. Đích triển khai tiếp theo theo yêu cầu mới là máy chủ MISA; Cloud Run là phương án đã chuẩn bị trước đó, chưa triển khai.

Ứng dụng báo cáo sự kiện chạy Docker, chuẩn bị sẵn cấu hình Cloud Run. UI tiếng Việt, Node.js 24 / Express 5, PostgreSQL 16, Chart.js; không cần frontend build server.

## Bản chạy hiện tại

- URL: **http://localhost:8096** — chỉ truy cập trên máy này.
- Tài khoản bootstrap và mật khẩu ngẫu nhiên được bàn giao riêng trong `../Truy-cap-noi-bo.txt`. Nhấn tên tài khoản ở góc phải để đổi mật khẩu.
- Đã tạo sự kiện **28.10 CEO × AI · Đà Nẵng**, ngày 28/10/2026, kết nối tab **Tổng hợp kết quả** của Google Sheet mẫu. Không sửa Sheet nguồn.
- Bản nhập đã kiểm tra ngày 16/10/2026: **134 dòng, 84 C-Level**, không có dòng thiếu/sai thời gian. Số liệu sẽ thay đổi khi nguồn cập nhật; các ảnh mẫu cũ dùng thời điểm khác nên tổng 107/118 không được dùng để ép dữ liệu mới.
- Mục tiêu sự kiện giữ 1.350 theo ô tổng trong mẫu; 27 mã tracking chi tiết cộng 1.650. UI cảnh báo chênh lệch, không tự sửa nguồn.
- Đã gọi thực tế **gemini-4-argon** qua Google Cloud project cấu hình và nhận phản hồi. Không dùng nội dung giả để thay kết quả AI khi kết nối lỗi.

## Chức năng

Cập nhật tiếp nối: **Xuất Excel** theo báo cáo/bộ lọc/kỳ so sánh, **hiển thị %** trên biểu đồ, **nguồn khách động** nhận diện từ header bằng Gemini (fallback có thông báo và cho chỉnh trước khi nhập), và **URL sự kiện** `/ten-su-kien-123abc/tong-quan` hoặc `/thanh-vien`. Schema v2 backfill slug cho dữ liệu cũ. Bộ lọc nhiều cột nguồn kết hợp đồng thời; biểu đồ nguồn tối đa 20 nhóm, bảng/Excel đủ nhóm.

Theo yêu cầu mới, ô KPI có nhãn “Tỷ lệ C-Level” dùng **tổng lượt đăng ký / tổng mục tiêu** và chú thích tương ứng. Chỉ tiêu `C-Level / đăng ký` trong bảng chi tiết vẫn giữ đúng công thức riêng.

1. **Mỗi sự kiện là một tenant.** Tạo sự kiện, chuyển không gian, thêm thành viên bằng liên kết mời có hạn. Người dùng chỉ thấy sự kiện mình là thành viên.
2. **Owner / Editor / Viewer.** Owner quản lý thành viên, Editor nhập và chỉnh dữ liệu/cấu hình mục tiêu; Viewer xem báo cáo/dữ liệu, xuất ảnh và chạy nhận xét AI. Mọi quyền được kiểm tra tại API.
3. **Excel .xlsx / CSV / Google Sheet.** Chọn tab, dòng tiêu đề, ghép cột thủ công hoặc nhờ Gemini; xem trước số liệu/chất lượng rồi xác nhận. Tối đa 10 MB, 20.000 dòng, 100 cột mỗi phiên. File .xls cần lưu lại thành .xlsx.
4. **Dữ liệu mới nhất và lịch sử.** Nhập thành công tạo snapshot bất biến và đổi con trỏ active trong transaction. Bản cũ vẫn xem được. File mới là bản đầy đủ thay thế, không nối thêm tự động.
5. **Đồng bộ Sheet mỗi 5 phút.** Chỉ tạo phiên khi nội dung đã chuẩn hóa thay đổi; nếu lỗi, giữ dữ liệu cũ và báo lỗi. UI kiểm tra phiên mới mỗi phút. Upload file mới thay nguồn; sửa trực tiếp tạm dừng đồng bộ Sheet để không mất thay đổi.
6. **Báo cáo:** mục tiêu theo khối/đơn vị/tracking, chức vụ, quy mô nhân sự, nguồn Marketing, xu hướng theo ngày. Chọn loại báo cáo hiển thị, chuyển bảng/dashboard, xuất PNG từ đúng bộ lọc đang xem.
7. **So sánh theo thời gian submit:** chọn khoảng ngày hiện tại và kỳ so sánh, hiển thị chênh lệch tổng/C-Level và hai chuỗi thời gian. Kỳ so sánh dùng cùng phiên dữ liệu. Muốn xem một bản nhập cũ, chọn ở “Phiên dữ liệu”.
8. **Gemini Enterprise Agent Platform:** gọi REST GenerateContent với model `gemini-4-argon`, location `global`, ADC/service account. Gemini nhận tên cột để gợi ý mapping và số liệu tổng hợp để diễn giải, không nhận email/số điện thoại khách hàng. Tích hợp model của nền tảng; chưa triển khai một agent riêng vào managed Agent Runtime.
9. Tìm kiếm/phân trang dữ liệu; chỉnh sửa có kiểm tra phiên để tránh ghi đè thay đổi của người khác; nhật ký hoạt động cho Owner.

## Quy tắc số liệu đã chốt

- Mặc định mỗi dòng là một lượt đăng ký; C-Level gồm “CEO/Giám đốc”, “Chủ doanh nghiệp”. Cho phép thay danh sách và cách gộp trùng trong từng sự kiện.
- Mã tracking mặc định `utm_content`, không phân biệt hoa/thường và dấu. Danh mục mục tiêu cần mỗi mã duy nhất. Dòng không khớp tracking vẫn nằm trong tổng và được đếm riêng “chưa khớp”.
- Gộp email/phone (nếu bật) giữ dòng đầu tiên theo thứ tự nguồn **trước** lọc ngày; các giá trị trống không bị gộp.
- Giờ báo cáo là Việt Nam UTC+7. Khoảng ngày bao gồm cả ngày đầu/cuối. Dòng không có ngày hợp lệ chỉ xuất hiện trong tổng không lọc ngày.
- `Hoàn thành = đăng ký / mục tiêu`. `C-Level / đăng ký` và `C-Level / mục tiêu` là hai chỉ số riêng. Mẫu số 0 hiển thị `—`.
- Phần trăm chức vụ/quy mô lấy tổng đăng ký làm mẫu số. Ô trống được đưa vào “Chưa xác định”.
- Bảng số và biểu đồ do code tính xác định, không lấy số đếm từ model. Nhận xét Gemini có thể sai; UI ghi rõ cần đối chiếu số liệu.
- Khi xem snapshot lịch sử, dữ liệu là dữ liệu cũ nhưng quy tắc/mục tiêu lấy cấu hình hiện tại của sự kiện.

## Chạy từ mã nguồn

Yêu cầu Docker Desktop/Engine với Compose v2. Sao chép `.env.example` thành `.env`, điền mật khẩu ngẫu nhiên và đường dẫn tuyệt đối đến JSON service account. Khóa đặt ngoài source và không commit.

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail=50 app
```

Ở máy đã bàn giao, cấu hình nằm ngoài source: `../../work/runtime.env`:

```powershell
docker compose --env-file ../../work/runtime.env up -d --build
docker compose --env-file ../../work/runtime.env stop
docker compose --env-file ../../work/runtime.env start
```

Database dùng named volume `misa-event-insights_event-data`; không publish cổng PostgreSQL. Không chạy `down -v` nếu chưa sao lưu.

Google Sheets API phải bật trên project. Chia sẻ Sheet cần dùng ở quyền Viewer cho service account của key. Đã bật Sheets API trong project được cung cấp để kết nối mẫu. Gemini cần AI Platform API và quyền gọi model. Trên Cloud Run dùng service account runtime, không mount JSON key.

## Kiểm thử

```powershell
npm ci
npm test
npm audit --omit=dev
```

Unit/ingestion tests: ngày Việt Nam, ngày sai, ranh giới nửa đêm, hai mẫu số C-Level, tracking chưa khớp, gộp trùng, XLSX nhiều tab, CSV BOM, URL Sheet allowlist.

Integration test chỉ chạy khi đặt `BASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD`, nên mặc định được skip. Chạy trên DB/container kiểm thử riêng; script tạo sự kiện `QA-*` và người dùng `@example.test`. Các kịch bản gồm auth, tenant isolation, Viewer/Editor, lời mời dùng một lần, import có preview, snapshot cũ, lọc/so sánh ngày, thu hồi thành viên và hai cập nhật đồng thời (một thành công, một nhận 409).

Baseline trước đây đạt 9/9 test. Bản cập nhật đạt **14/14 test** trên Docker kiểm thử tách biệt, bổ sung nguồn động, Excel và slug/deep link. `npm audit` không có lỗ hổng được báo cáo tại thời điểm kiểm tra. Xem VERIFICATION.md cho bằng chứng và giới hạn.

## Cloud Run và giới hạn bản đầu

Xem [deploy/CLOUD-RUN.md](deploy/CLOUD-RUN.md) và [deploy/cloud-run.ps1](deploy/cloud-run.ps1). **Chưa deploy Cloud Run** trong bước Docker này.

- Chưa có SSO MISA, MFA, email xác thực/reset mật khẩu hoặc tự gửi email mời. Liên kết mời cần gửi qua kênh phù hợp.
- Cách ly tenant ở API/SQL scopes, chưa có RLS hoặc database riêng theo tenant.
- Nguồn hiện tại là một bộ đầy đủ/sự kiện. Không có đồng bộ trực tiếp API contact-lead MISA hoặc tự theo dõi thư mục Excel.
- Chưa tối ưu cho hàng triệu contact: snapshot JSONB, báo cáo đọc trong RAM. Giới hạn dữ liệu được kiểm tra khi nhập.
- Kiểm thử chạy local, chưa thay cho đánh giá tải, khôi phục backup và chính sách IAM trước production.

## Cấu trúc

`server/auth.js` — mật khẩu scrypt, session token hash trong DB, phân quyền.

`server/domain.js` — chuẩn hóa, thời gian, KPI và tổng hợp xác định.

`server/ingestion.js` — Excel/CSV, Google Sheets, Gemini, snapshot và đồng bộ.

`server/db.js` — schema v1/v2, transaction, audit; `server/index.js` — API và HTTP lifecycle. `server/source-dimensions.js` — nhóm/lọc nguồn; `server/report-export.js` — Excel; `server/event-slug.js` — slug ổn định.

`public/` — UI, bảng, Chart.js, xuất ảnh; `tests/` — unit và integration; `deploy/` — Cloud Run.
