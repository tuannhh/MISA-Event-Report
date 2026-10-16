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
