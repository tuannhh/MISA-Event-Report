# 10 — Lịch sử phát triển

## 17/10/2026 — Cài đặt trên máy macOS

Theo yêu cầu kéo project và mở local: clone revision `6436c18`, đọc toàn bộ memory bank, cấu hình runtime ngoài repository và mount read-only JSON Google do chủ dự án cung cấp. Build/chạy Docker tại localhost:8096, giữ tên Compose/volume. Đây là database mới trên máy này (schema v3, một Super admin, chưa có sự kiện); không có dữ liệu vận hành cũ trong Git. Gemini mapping đã kiểm tra bằng header tổng hợp thành công; health/login/forced password/logout đạt; 19/19 tests đạt trên stack QA cách ly. Không sửa mã ứng dụng, không đổi mật khẩu sau bootstrap, không triển khai cloud/managed Agent Runtime. Chi tiết vận hành ở mục 07.

## 16/10/2026 — Baseline Docker v1

Yêu cầu: thay công việc Excel thủ công bằng báo cáo sự kiện có phân quyền. Đã triển khai import/preview, snapshot, Sheet sync, bảng/chart, khoảng ngày, PNG và Gemini. Schema v1 gồm 9 bảng. Bằng chứng kiểm tra thời điểm đó ở VERIFICATION.md; không suy rộng thành xác nhận production.

## 16/10/2026 — Ghi nhận yêu cầu MISA v2

Chủ dự án yêu cầu MISA Design System/mobile, bốn cấp quyền, import thành viên, email nội bộ, đổi mật khẩu lần đầu, IP allowlist, sự kiện online/offline. Skill design system đã cài trên máy; các chức năng này chưa có trong baseline. Ghi đầy đủ vào 12-active-context để tiếp tục mà không mất yêu cầu. Quy tắc C-Level mặc định và dedup được chủ dự án xác nhận giữ, cho phép cấu hình sự kiện.

## 16/10/2026 — Memory bank và repository

Theo yêu cầu trực tiếp, đọc MISA Backend Standard commit a940384, lập memory bank 01–11 và active context, thêm AGENTS.md, liên kết README, quy tắc ignore secrets và CI kiểm thử. Tài liệu phản ánh code thực tế, chỉ rõ khoảng trống thay vì mô tả kiến trúc mong muốn như đã có. Repository đích MISA-Event-Report private, vẫn giữ tên Compose để bảo toàn volume.

## 16/10/2026 — KPI, Excel, phần trăm và nguồn khách động

Chủ dự án chỉ định ô “Tỷ lệ C-Level” phải bằng tổng lượt đăng ký / tổng mục tiêu; frontend dùng completion và chú thích tương ứng, API clevel_share không đổi. Bổ sung export.xlsx theo quyền đọc, bộ lọc, snapshot, kỳ so sánh và báo cáo đã chọn; ô số thật và kiểm tra chuỗi công thức độc hại. Biểu đồ có toggle hiện %.

Để không giới hạn nguồn ở Marketing, thêm nhận diện cột nguồn bằng Gemini từ headers, fallback có thông báo, cho phép người nhập chỉnh danh sách; lưu source_details trong JSONB row và metadata source. Bộ lọc nhiều cột kết hợp AND áp dụng cùng cách cho báo cáo/AI/Excel. Không đổi schema cho các field JSONB này; hỗ trợ đọc snapshot cũ.

Tài liệu đồng bộ: API, schema JSONB, business logic, frontend, security, traps và active context. Test bổ sung nguồn, filter, Excel, zero denominator và quyền export.

## 16/10/2026 — URL riêng từng sự kiện

Theo yêu cầu `/tên-sự-kiện-dãy-6-ký-tự/tính-năng`, migration v2 thêm slug duy nhất và backfill sự kiện có sẵn; không đổi UUID/snapshot. UI dùng History API, hỗ trợ deep link và back/forward; server SPA fallback cho các trang hợp lệ. Tài liệu đồng bộ: schema, API, frontend, deployment, traps. Slug không phải thông tin xác thực; API vẫn kiểm tra quyền bằng session và event ID.

## 16/10/2026 — Hoàn thiện yêu cầu 1–5 và account policy

Sau phản hồi chưa thấy thay đổi ở bản chạy: thay frontend vanilla bằng Vue/MDS thật, desktop/mobile riêng; source onchange load report; dd/MM/yyyy + vi-VN; roles v3, member Excel, no invite, forced password/domain, event mode + attendance breakdown. Backup/restore drill trước migration, giữ 134 rows/2 snapshots. Đổi Dockerfile multi-stage Vite; cập nhật CI tests và docs. Không deploy MISA server/IP/native host vì chưa có thông tin tương ứng.

## 16/10/2026 — Đăng nhập và chọn sự kiện

Tách URL đăng nhập `/log-in` khỏi route sự kiện, thêm danh sách `/su-kien` sau đăng nhập và `/change-password` cho tài khoản cần đổi mật khẩu. Không tự chọn sự kiện đầu tiên; người dùng chọn card có nhãn quyền riêng sự kiện, tìm kiếm và lọc được chỉnh sửa/chỉ xem. Thêm composition MDS desktop/mobile riêng. API giữ Viewer mặc định toàn ứng dụng và membership Editor/Admin từng event. Thêm test route policy, SPA entrypoints và role sau thu hồi quyền ở một event; 19/19 QA tests đạt. Browser xác nhận URL, quyền giữa hai event, refresh, Back sau logout và mobile không tràn ngang ở 320px. Cập nhật Docker giữ nguyên volume, không migration hay reset mật khẩu.

## 17/10/2026 — Tự tổng hợp dữ liệu mới nhất

Theo yêu cầu tổng hợp ngay sau nhập và khi mở ứng dụng: thêm automatic import, tiếp tục staging của chính user khi chưa có snapshot, reset filter sau import, auto-refresh nguồn Sheet và report, timestamp/warning, nhận xét Gemini tự động gắn với snapshot/filter, nhận diện chiều nhân viên. API/staging thủ công giữ tương thích; không đổi schema, không xóa lịch sử. Sửa MUpload chặn file chooser do bubbling. Số liệu vẫn tính bằng code; AI chỉ nhận diện/diễn giải. Các thay đổi này thay thế bước xác nhận nhập lần hai ở luồng UI mặc định trước đây.

## 17/10/2026 — Gọi xác nhận, biểu đồ và header
Theo 7 yêu cầu cùng xác nhận của chủ dự án: bổ sung trạng thái gọi qua nhiều lần, KPI đã gọi/tổng đăng ký, cột utm_content; hybrid có hai ô Online/Offline; donut màu phân biệt/chú giải dọc/nhãn ngoài; trend cột và đường cùng số lượng; nguồn mặc định utm_campaign có số và %; bỏ mô-đun mục tiêu trên dashboard; picker lên header, logo về danh sách, tạo sự kiện về toolbar. Cập nhật export, mobile composition, tests và tương thích snapshot cũ. Dữ liệu Google Sheet được bổ sung ở lần sync mới, không sửa lịch sử.

## 17/10/2026 — dashboard gọn, mục tiêu tự động và lọc đăng ký
Theo 9 yêu cầu bổ sung: thu gọn bộlọc/metadata, cặp chart xu hướng/nguồn, sửa C-Level/mục tiêu, logo base64+Event Report, tab Chi tiết mục tiêu B:I tựnhận diện/đồngbộ/lịch sử; không cần nhập mục tiêu tracking trongsettings. User chốt giữ Không lọc trùng và lựa chọnphone/email. Bổ sungphone/tax_id dạngchuỗi, bộlọc nhiều giátrị và paging20/50/100. Thêm migration v4 và test parser/identifier/filter/import/snapshot/export/AIallowlist. Không đổi tên Dockerproject hay volume đang chạy.

## 17/10/2026 — phân trang thống nhất
Mở rộng lựa chọn20/50/100 từ đăng ký sang mọi danh sách và bảng, cả desktop/mobile web. Thêm pager dùng chung; nhật ký có API count+page thay giới hạn100 cũ. Bản xuất báo cáo giữ toàn bộ dòng. Không thay schema, quyền hay volume.

## 17/10/2026 — làm gọn tab Chi tiết mục tiêu
Theo khung đỏ chủ dự án chỉ định: bỏ khối tiêu đề/mô tả/cảnh báo giải thích và chú thích công thức; tab mở thẳng bảng kết quả với phân trang20/50/100. Giữ tab, dữ liệu, tự nhận diện Sheet Mục tiêu và cập nhật theo snapshot. Empty state chỉ hướng dẫn tổng quát; chi tiết kỹ thuậtB–I nằm trong memory bank, không áp đặt trên giao diện. Quality metadata và cảnh báo xuất Excel giữ nguyên.

## 17/10/2026 — tối ưu vùng trên dashboard
Theo ảnh chú thích mới: bỏ cả nút xuất ảnh và Excel; gom bộ lọc, hiển thị %, thông tin dữ liệu, cập nhật ngay vào hàng thao tác trên. Loại dòng mô tả toàn bộ dữ liệu mới nhất, gộp tabs/lựa chọn báo cáo trên desktop để đưa KPI lên sớm. Không đổi phép tính hoặc dữ liệu.

## 17/10/2026 — chart và thành viên tối giản
Theo phản hồi ảnh: tăng donut, đưa số/% sát tên legend, bỏ tên sự kiện/timestamp lặp và nhận xét Gemini trên cả desktop/mobile. Ngừng request nhận xét tự động. Đổi nhãn Thành viên; form chỉ name/email mặc định Editor, thêm Excel mẫu ba cột STT/Họ và tên/Email. Kiểm chứng 38 tests QA, file mẫu qua importer, UI desktop/mobile; không thay schema hay dữ liệu đang phục vụ.

## 17/10/2026 — mobile ưu tiên số liệu
Phản hồi chủ dự án: toolbar/filter quá dài và chart thiếu cân đối. Thiết kế lại riêng mobile: menu/panel theo chạm, KPI lên đầu, donut/legend gọn và bố cục tablet, bộ lọc đăng ký ẩn mặc định, thẻ dữ liệu hai cột. Form mobile dùng sheet và vùng chạm dropdown48px. Chỉ thay frontend; giữ API/quyền/dữ liệu.
