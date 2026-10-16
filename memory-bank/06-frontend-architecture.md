# 06 — Frontend Vue 3 / MISA Design System

Vite build `frontend/` → `dist/`, Express phục vụ dist. Source vanilla `public/` đã thay thế. `frontend/mds/` copy-in component gốc từ repo skill được chủ dự án chỉ định; tokens/themes/font Inter từ assets chuẩn. Registry MIcon dùng icon đã có. MChart dùng ECharts, html2canvas xuất PNG. Đã chỉnh pagination MDataTable sang vi-VN.

`App.vue`: auth/force-password, dialog, chọn surface theo container <=1024px hoặc query surface=mobile; không suy luận quyền thành surface. `DesktopPage.vue` theo Dashboard/List/Form templates có MHeaderBar48/MSidebar200/64. `MobilePage.vue` là cây page riêng với MMobileTopBar56, bottom nav5, member/data dạng card list, không dựng desktop header/sidebar. Hai page chia sẻ store, control/form fields và từng chart; không reuse desktop page làm mobile.

`store.js`: API/auth/event/route state, load report sequence chống response cũ ghi đè; source/date/mode watch tự gọi report. Khi chờ ẩn số liệu cũ và disable exports. Chọn nguồn tác động current/comparison/Excel/AI. Excel pin snapshot đang xem. ReportStamp ghi tên sự kiện và bộ lọc trên PNG. Snapshot cũ chọn từ MCombobox. Số vi-VN; MDatePicker dd/MM/yyyy; ISO chỉ dùng API. Ô numeric mục tiêu hiển thị vi-VN qua NumberField.

Route slug/history cho 6 trang; refresh/deep link vẫn đi qua login/force password/RBAC. Role action ẩn ở UI và kiểm tra lại backend. Source discovery/mapping preview vẫn giữ trước commit; member import preview riêng không tạo lead. Appearance dùng MSettingsDialog theme/header/density; user account đổi mật khẩu/logout. Không lưu lead/password vào localStorage. Form state nằm store nên giữ khi đổi viewport; reload có thể mất draft chưa lưu.

`navigation.js` quy định `/log-in` → `/su-kien` → `/:slug/tong-quan`. Sau đăng nhập luôn về danh sách, kể cả trước đó mở deep link; tài khoản bắt buộc đổi mật khẩu đi qua `/change-password` rồi về danh sách. Refresh khi còn session giữ route sự kiện hợp lệ. Chưa đăng nhập, hết session hoặc logout thì thay URL bằng `/log-in`; slug lạ về danh sách kèm thông báo, không tự chọn sự kiện khác.

`EventListDesktop.vue` và `EventListMobile.vue` là hai composition danh sách riêng, chia sẻ state/filter trong store. Card hiển thị ngày vi-VN, hình thức và role từ API; có tìm tên, lọc tất cả/được sửa/chỉ xem. Mỗi lần mở sự kiện tải lại quyền từ API. Header/logo và nút Danh sách sự kiện quay về chooser. Viewer xem mọi sự kiện, Editor/Admin chỉ được chỉnh sửa nơi có membership; backend vẫn là nguồn quyết định quyền.

Phạm vi bằng chứng: Docker build + desktop và mobile browser. Chưa có host MISA AMIS, OS Dynamic Type/Display Zoom, gesture/lifecycle/file permission native để test. Không khẳng định native production compliance; ma trận nằm UI-VERIFICATION.md. Các gap tiếp theo: restore draft qua reload, focus lỗi theo field và native host adapter.
