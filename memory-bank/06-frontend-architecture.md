# 06 — Kiến trúc giao diện

Hiện trạng: vanilla JavaScript, một `public/index.html`, `public/app.js` render qua innerHTML, `public/styles.css` responsive. Không có Vue/Tailwind/MDS component tích hợp trong baseline. Chart.js và html2canvas phục vụ nội bộ từ node_modules, không tải CDN.

State tập trung gồm events/event/tab/mode/charts/filters/report/pagination. `api()` gọi fetch cùng origin; `post()` bọc JSON; `bind()` xử lý lỗi thành toast; `esc()` escape giá trị chèn HTML. Modal dùng native dialog. Khi render lại, Chart instances cũ bị destroy. Luồng API mới phải kiểm tra escape và quyền tại server, không chỉ ẩn nút.

| Trang/tab | Hàm chính | Quyền v1 |
|---|---|---|
| Login/nhận lời mời | login/init | Khách và người đã có tài khoản |
| Shell/chọn sự kiện | loadEvents/renderShell | Đăng nhập, danh sách theo membership |
| Tổng quan | dashboard/renderReport/drawCharts | R |
| Dữ liệu đăng ký | dataPage/editRow | R xem; E sửa |
| Nguồn dữ liệu | sourcesPage/importDialog/mappingDialog | R xem; E nhập/sync |
| Mục tiêu và quy tắc | settingsPage | E |
| Thành viên | membersPage | R xem; O mời/quản lý |
| Nhật ký | auditPage | O |
| Đổi mật khẩu | changePassword | Đăng nhập |

Các tab dùng state trong RAM; History API cập nhật đường dẫn /slug/tính-năng. Truy cập trực tiếp, reload, back/forward chọn đúng event/tab; hash vẫn phục vụ invite v1. Filter/draft chưa lưu vào URL hoặc qua reload. UI poll phiên dữ liệu mỗi 60 giây, tránh render khi modal đang mở.

Tab mapping: dashboard→tong-quan, data→du-lieu, sources→nguon-du-lieu, settings→muc-tieu, members→thanh-vien, audit→nhat-ky. Viewer mở trực tiếp settings/audit thấy thông báo thiếu quyền. Slug không có trong danh sách API trả về hiển thị không thể mở, không tự chọn event khác.

Tổng quan có Xuất Excel, filter nguồn theo sourceDimensions, toggle % và chọn chiều nguồn cho chart/table. Plugin canvas vẽ % trên bar/doughnut, kể cả callout cho miếng nhỏ và nhãn legend. Nhập file/Sheet hiển thị danh sách cột nguồn tự nhận diện để chỉnh, preview lại khi thay đổi. Excel tải qua fetch cùng session; lỗi trả toast.

## Định dạng và KPI

num/pct hiện dùng vi-VN: hàng nghìn dấu chấm, thập phân dấu phẩy. when dùng Asia/Ho_Chi_Minh nhưng chưa bắt buộc zero-padding mọi chỗ. Input type=date có thể hiển thị mm/dd/yyyy theo trình duyệt; yêu cầu dd/mm/yyyy toàn UI còn mở.

Ô KPI “Tỷ lệ C-Level” dùng `c.completion` và chú thích “Tổng lượt đăng ký / tổng mục tiêu”, theo yêu cầu mới. `c.clevel_share` vẫn dùng ở bảng chi tiết với nhãn đúng công thức. Export PNG dùng cùng DOM báo cáo nên nhận thay đổi này.

## Chuyển sang MISA Design System — chưa thực hiện

Repo chuẩn do chủ dự án cung cấp: https://github.com/tuannhh/misa-design-system-skill. Skill đã được cài trong máy phát triển; mã component chưa được copy/tích hợp vào ứng dụng.

Định hướng phải tuân theo skill thực tế: component Vue của MDS, tokens/fonts/icons từ repo; composition desktop và mobile riêng, mobile có top bar/bottom navigation và safe area. Không mô tả responsive CSS hiện tại như native app. Khi triển khai cần đọc lại đúng version skill, ghi provenance và bằng chứng viewport/keyboard. Native iOS/Android chưa kiểm chứng.
