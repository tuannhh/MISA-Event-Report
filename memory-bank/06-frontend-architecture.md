# 06 — Frontend Vue 3 / MISA Design System

Vite build `frontend/` → `dist/`, Express phục vụ dist. Source vanilla `public/` đã thay thế. `frontend/mds/` copy-in component gốc từ repo skill được chủ dự án chỉ định; tokens/themes/font Inter từ assets chuẩn. Registry MIcon dùng icon đã có. MChart dùng ECharts, html2canvas xuất PNG. Đã chỉnh pagination MDataTable sang vi-VN.

`App.vue`: auth/force-password, dialog, chọn surface theo container <=1024px hoặc query surface=mobile; không suy luận quyền thành surface. `DesktopPage.vue` theo Dashboard/List/Form templates có MHeaderBar48/MSidebar200/64. `MobilePage.vue` là cây page riêng với MMobileTopBar56, bottom nav5, member/data dạng card list, không dựng desktop header/sidebar. Hai page chia sẻ store, control/form fields và từng chart; không reuse desktop page làm mobile.

`store.js`: API/auth/event/route state, load report sequence chống response cũ ghi đè; source/date/mode watch tự gọi report. Khi chờ ẩn số liệu cũ và disable exports. Chọn nguồn tác động current/comparison/Excel/AI. Excel pin snapshot đang xem. ReportStamp ghi tên sự kiện và bộ lọc trên PNG. Snapshot cũ chọn từ MCombobox. Số vi-VN; MDatePicker dd/MM/yyyy; ISO chỉ dùng API. Ô numeric mục tiêu hiển thị vi-VN qua NumberField.

Route slug/history cho 6 trang; refresh/deep link vẫn đi qua login/force password/RBAC. Role action ẩn ở UI và kiểm tra lại backend. Source discovery/mapping preview vẫn giữ trước commit; member import preview riêng không tạo lead. Appearance dùng MSettingsDialog theme/header/density; user account đổi mật khẩu/logout. Không lưu lead/password vào localStorage. Form state nằm store nên giữ khi đổi viewport; reload có thể mất draft chưa lưu.

`navigation.js` quy định `/log-in` → `/su-kien` → `/:slug/tong-quan`. Sau đăng nhập luôn về danh sách, kể cả trước đó mở deep link; tài khoản bắt buộc đổi mật khẩu đi qua `/change-password` rồi về danh sách. Refresh khi còn session giữ route sự kiện hợp lệ. Chưa đăng nhập, hết session hoặc logout thì thay URL bằng `/log-in`; slug lạ về danh sách kèm thông báo, không tự chọn sự kiện khác.

`EventListDesktop.vue` và `EventListMobile.vue` là hai composition danh sách riêng, chia sẻ state/filter trong store. Card hiển thị ngày vi-VN, hình thức và role từ API; có tìm tên, lọc tất cả/được sửa/chỉ xem. Mỗi lần mở sự kiện tải lại quyền từ API. Header/logo và nút Danh sách sự kiện quay về chooser. Viewer xem mọi sự kiện, Editor/Admin chỉ được chỉnh sửa nơi có membership; backend vẫn là nguồn quyết định quyền.

Phạm vi bằng chứng: Docker build + desktop và mobile browser. Chưa có host MISA AMIS, OS Dynamic Type/Display Zoom, gesture/lifecycle/file permission native để test. Không khẳng định native production compliance; ma trận nằm UI-VERIFICATION.md. Các gap tiếp theo: restore draft qua reload, focus lỗi theo field và native host adapter.

## 17/10/2026 — Tự tổng hợp

Store gửi automatic khi chọn nguồn; import thành công reset date/source/mode/snapshot về toàn bộ mới nhất và mở Tổng quan. Sự kiện chưa có snapshot lấy pending thuộc user để hoàn tất hoặc dẫn về ghép cột. ReportStamp hiển thị thời điểm tổng hợp, kiểm tra nguồn, lỗi sync và nút cập nhật; frontend refresh khi mở/focus/visible và mỗi 60 giây, giữ filter người dùng. Chọn lịch sử dừng auto refresh. InsightPanel dùng chung control trong hai composition, tự gọi AI sau khi số liệu hiện, pin snapshot, cache và loại phản hồi lỗi thời. AI lỗi có notice riêng, KPI không phụ thuộc AI. Filter nhân viên dùng các chiều source_details thực có.

MUpload bổ sung @click.stop trên input file để sự kiện không nổi lên label @click.prevent làm hủy file picker; label có role/button và keyboard Enter/Space. Đã kiểm tra chọn CSV thật trong QA.

## Dashboard và header mới — 17/10/2026
Desktop header dùng slot search của MHeaderBar để đặt combobox sự kiện; logo/tên app về /su-kien, bỏ toolbar phụ và role header, nút Tạo sự kiện cùng toolbar xuất/import (quyền Super admin). EventListDesktop dùng cùng picker. Desktop/Mobile có KPI tỷ lệ gọi và hai KPI tham dự chỉ với hybrid; bảng/card đăng ký thay hình thức bằng utm_content và trạng thái gọi. Donut dùng màu khác hue từ token MDS, phần trăm ngoài có đường nối, chú giải HTML dọc có xuống dòng (mobile xếp dưới để dễ đọc). Trend có cột đứng và đường cùng số khách; nguồn khách số trong cột và % ngoài. MChart resolve token runtime và cập nhật theo theme. Native host/OS vẫn chưa kiểm chứng, browser viewport không thay thế nghiệm thu native.

## Bổ sung UI 17/10/2026
BrandLogo dùng PNG người dùng cung cấp, base64 trong brand-logo.js; tên hiển thị Event Report. Desktop headerlogo về /su-kien. ReportFilters và ReportStamp thu gọn mặc định bằng nút có aria-expanded. Trend/source nằm trong cặp carddesktop, source có selector trongheader và zoom dọc khi>8nhóm; mobilecomposition riêng vẫn xếp dọc. Tab thứ3 Chi tiết mục tiêu dùng TargetsPanel bảng8cột desktop và card nhóm mobile; màu nhóm/tổng theo tokenMDS. Xuất ảnh theo tab đang chọn, Excel targets xuất bảng mục tiêu.
RegistrationFilters dùng MCombobox multiple4trường + date range + tìmkiếm. Store debounce180ms, sequence/eventguard chống phản hồi cũ. Phân trang20/50/100 desktop/mobile, mặc định20. Phone luôn hiển thị; tax_id chỉ thêmcột khi nguồn cógiátrị. Settings bỏformnhậpmụctiêutracking thủcông, giữ fallback tổng khi chưa có kếhoạch; lọctrùnggiữ3lựa chọn theo yêu cầu cuối.

## Phân trang mọi danh sách — 17/10/2026
`PagedRecords` + `pagination.js` phân trang dữ liệu đã tải, mặc định20, chọn20/50/100; `ListPager` dùng chung cho danh sách thẻ và mobile. Áp dụng danh sách/chọn sự kiện, thành viên, xem trước thành viên và lỗi nhập, Chi tiết mục tiêu và mọi bảng số liệu. MDataTable nhận `pagination=false` khi wrapper quản lý pager. Dữ liệu đăng ký và nhật ký phân trang máy chủ; AuditList hủy kết quả cũ khi đổi sự kiện/unmount. Dữ liệu/bộ lọc thay đổi reset trang, render lại dữ liệu tương đương giữ trang. `exportingImage` mở toàn bộ dòng báo cáo khi chụp PNG và phục hồi trong finally; Excel không phụ thuộc trang. KPI/biểu đồ vẫn dùng toàn bộ tập dữ liệu theo bộ lọc. Dropdown lựa chọn, cấu hình và chú giải biểu đồ không phải danh sách bản ghi để phân trang.

## 17/10/2026 — làm gọn tab Chi tiết mục tiêu
Theo khung đỏ chủ dự án chỉ định: bỏ khối tiêu đề/mô tả/cảnh báo giải thích và chú thích công thức; tab mở thẳng bảng kết quả với phân trang20/50/100. Giữ tab, dữ liệu, tự nhận diện Sheet Mục tiêu và cập nhật theo snapshot. Empty state chỉ hướng dẫn tổng quát; chi tiết kỹ thuậtB–I nằm trong memory bank, không áp đặt trên giao diện. Quality metadata và cảnh báo xuất Excel giữ nguyên.
