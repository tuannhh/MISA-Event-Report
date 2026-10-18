# MDS UI — phạm vi bằng chứng 16/10/2026

Nguồn: repo misa-design-system-skill do chủ dự án chỉ định; copy-in component/token/font. DesktopPage và MobilePage theo cặp template MDS, không reuse desktop shell trên mobile. Header brand48, sidebar200/64, mobile topbar56/nav5, input/touch48 và safe area.

| Route | Desktop browser | Mobile browser | Quyền |
|---|---|---|---|
| log-in | Deep link chưa đăng nhập và logout đổi về URL này | Form mobile | Public shell; API bảo vệ dữ liệu |
| su-kien | Sau login, tìm tên, card ngày/quyền, chọn event | Composition riêng; 390px và 320px không overflow ngang, lọc Được sửa | Mọi tài khoản đã đổi mật khẩu; role riêng từng event |
| tong-quan | KPI, source onchange, date controls, chart/table | Composition riêng; 320/360/390/430/768 không overflow ngang | Viewer+ |
| du-lieu | MDataTable, edit | Card list, ngày dd/mm/yyyy, edit dialog | Viewer đọc, Editor+ sửa |
| nguon-du-lieu | Upload/Sheet/mapping | Control cùng API trong mobile shell | Viewer trạng thái chỉ xem, Editor+ nhập |
| muc-tieu | Form + footer | Form một cột + footer | Viewer đọc, Editor+ sửa |
| thanh-vien | Member preview + table | Preview + card list | Viewer/Editor đọc, Admin quản lý Editor, Super cấp Admin |
| nhat-ky | Admin/Super | Admin/Super trong mobile shell | Viewer/Editor thông báo không quyền |

API integration bao phủ bốn quyền, quyền đổi tức thì sau revoke, tài khoản nhiều event, domain, forced password và session invalidation. Browser thao tác nguồn a làm total4→2 và completion40→20; không cần nút áp dụng. Form/date và mobile navigation đã kiểm tra. Không có lỗi console trong lượt kiểm tra.

Chưa có bằng chứng host MISA AMIS hoặc thiết bị thật: Dynamic Type/Display Zoom iOS, Android Font/Display size, hardware/swipe Back, native file/share permission, lifecycle/interruption và deep-link host. Browser viewport không thay thế các kiểm tra này. Chưa chứng nhận native production/full MDS compliance. Draft giữ trong memory khi đổi viewport, chưa restore sau reload. File/download hiện dùng browser adapter.

## 17/10/2026 — Phạm vi lượt sửa tự tổng hợp

| Luồng | Quyền | Desktop | Mobile browser | Giới hạn native |
|---|---|---|---|---|
| Tổng quan/bộ lọc/refresh | Viewer/Editor/Admin/Super admin | QA Super admin: tổng 3→2→3; API giữ phân quyền bốn cấp, Viewer refresh không sửa nguồn | Composition riêng, 320/360/390/430/768 đo không tràn root; mở bộ lọc | Chưa kiểm chứng OS font/display, native host, Back/lifecycle |
| Chọn file → tổng hợp | Editor/Admin/Super admin; Viewer bị chặn | QA chọn CSV thật, tự về dashboard; sửa bubbling chặn picker | Control dùng chung trong MobilePage; chưa thao tác picker trên thiết bị thật | File permission/native picker chưa kiểm chứng |
| AI đang chạy/lỗi | Mọi user được xem report | Loading progress, lỗi QA không che KPI, stale-response test | InsightPanel nằm trong mobile composition | Không thêm quyền thiết bị/notification/gesture mới |

Bằng chứng chỉ xác nhận phạm vi browser/API nêu trên. Không đánh dấu nghiệm thu toàn bộ native hoặc toàn bộ role trên thiết bị thật.

## 17/10/2026 — KPI gọi và biểu đồ mới
Desktop thực chạy 1440px: header combobox sự kiện, logo về /su-kien, toolbar tạo/xuất/import; role header và nút danh sách phụ đã bỏ. Bảng có utm_content và Gọi xác nhận. KPI local 119/134 = 88,81%; không có thẻ/bộ lọc tham dự ở event offline. QA hybrid thấy Online/Offline, both được tính đúng ở cả thẻ và filter. Donut có 6 hue phân biệt, chú giải dọc HTML, phần trăm ngoài; đã giảm bán kính để tránh cắt nhãn ở card hẹp. Cột trend và đường cùng số khách; nguồn utm_campaign có count trong cột, % ngoài. Mục tiêu & tracking không còn trong dashboard/lựa chọn.
Mobile composition riêng: kiểm tra root/card overflow ở 320, 360, 390, 430, 768px đều 0; screenshot 390px đã đối chiếu legend/card. Quyền backend hồi quy suite 29/29. Chưa kiểm chứng native host, OS font/display và runtime phục hồi quyền trên thiết bị thật; không tuyên bố native production compliance.

## 17/10/2026 — dashboard/target/registration update
Desktop tested at1440×1000: collapsed filters+metadata, KPI formula, supplied embeddedlogo, paired trend/source, pie outside labels,8-column target table using MDS group/total colors, registration multi-select and20/50/100paging. Desktop target table fits1176px available. Source/target screenshots checked; no functional console errors. Empty-target/no-data and role authorization covered by isolated automated tests.
Mobile browser composition tested at390×844 (registration filters) and320×740 (dashboard/goal cards); separate native-style shell, no page horizontal overflow at320. This is browser evidence only. MISA AMIS host, actual iOS/Android OS font/display settings, gestures/lifecycle and full mobile route×role matrix remain unverified; NOT a full MDS/native production certification.

## 17/10/2026 — pagination across lists
Desktop1440px: shared pager on event list, audit and all report tables. Target31 records tested20→page2(11)→50(31); screenshot confirms range and controls. QA audit114 tested20/50/100 and oldest page, default20 restored on remount. Mobile web390×844 uses separate composition; audit pagination and100 rows work, no root overflow. Shared component covers members/import previews/event chooser; these additional lists rely on shared component/build/unit verification rather than separate exhaustive browser walkthroughs. Automated API role/isolation checks remain intact. Native MISA AMIS host and real OS accessibility/lifecycle matrix remain unverified, as documented above.

## 17/10/2026 — target panel annotations removed
Verified actual local app in desktop1440×1000 and mobile composition: retained target tab, automatic data and20/50/100 pager; removed heading/implementation notes and highlighted explanatory blocks.31 total/20 visible records unchanged. Screenshot outside Git: ../.misa-event-report-local/targets-clean-20261017.jpg. Temporary viewport reset. Native-host verification gaps remain unchanged.

## 17/10/2026 — compact toolbar
Desktop1440×1000: report controls promoted beside page title, exports removed, tabs/selections share row, KPI starts226.5px. Filters and metadata hidden without empty spacer when closed; open/close and percentage-label toggle verified. Mobile390×844: separate composition retains controls, zero export buttons and no root overflow. Target tab hides percentage control. Screenshot ../.misa-event-report-local/report-toolbar-20261017.jpg. This is browser verification; existing native-host/OS accessibility gaps remain.

## 17/10/2026 — mobile redesign
- Browser dashboard Super admin:320×568,360×640,390×844,430×932,768×1024,1024×768 đều root scrollWidth=clientWidth, không card overflow. KPI top189px; chart donut224px. Desktop/mobile composition vẫn riêng, không phụ thuộc role.
- Chạm More mở sheet; chuyển sang filter trong cùng dialog; date picker mở và Escape chỉ đóng calendar. Đóng sheet phục hồi focus và bỏ inert nền. Tạo sự kiện mở form sau khi đóng menu, không tạo bản ghi trong QA UI.
- Registration: chọn cả Đã gọi/Chưa gọi và2chức vụ CEO/Giám đốc/Chủ doanh nghiệp →84kết quả,2nhóm lọc; Xóa lọc →134. Bộ lọc dùng multi-select như desktop; footer nằm riêng khỏi nội dung cuộn.
- Tablet768px: donut/legend song song, KPI4cột sau total, các chart còn lại chia2cột. Phone390px: donut/legend dọc, số trong tâm và legend; không lặp nhãn phần trăm quanh donut.
- Evidence ngoài Git: mobile-redesign-dashboard.jpg, mobile-redesign-chart.jpg, mobile-redesign-filters.jpg, mobile-redesign-tablet.jpg trong ../.misa-event-report-local/.
- Đây là bằng chứng browser; chưa có native host/thiết bị iOS/Android để kiểm chứng OS font/display, keyboard/lifecycle/gesture và toàn bộ route×role trên host. Không gọi đây là chứng nhận native production. Không thêm quyền thiết bị hay notification.

Final checks:320×568 filter sheet body scrolls, footer bottom568px and no panel overflow. Mobile popup option heights48–56px. Create-event form opens as one sheet, focus on Đóng; closed without saving. Desktop1440px: no root/card overflow, retained toolbar and outside donut labels. Temporary viewport override reset.

## 18/10/2026 — quy trình khách và liên hệ
Đã kiểm tra browser QA riêng desktop1280/mobile390/320. Các tab Online/Offline/Chưa rõ nằm gọn; toolbar320 dùng hai nút cùng hàng; form liên hệ mở bottom sheet và lưu phản hồi giấy thành công, lịch sử có người/thời điểm. Dashboard theo kênh, field mode/phòng/người phụ trách/phản hồi trong dữ liệu đăng ký. Không coi browser viewport là chứng nhận native host MISA AMIS; vẫn cần thiết bị thật.
