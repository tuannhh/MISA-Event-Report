# Kết quả kiểm tra — 16/10/2026 (UTC+7)

## Cập nhật báo cáo và URL sự kiện

- Full suite **14/14 pass** trên Docker QA cổng 8097, DB riêng: nguồn động, filter nhiều cột/ngày/giá trị trống, Excel numeric cells/không thực thi công thức trong nhãn, KPI 134/1.350=9,93%, mẫu số 0, slug collision retry, API deep link, Viewer export và chặn export trái tenant, cộng các kiểm tra v1.
- Syntax check server/frontend đạt. `npm audit --omit=dev`: 0 vulnerabilities tại lần kiểm tra mới.
- Trước migration đã sao lưu PostgreSQL local ra file ngoài source; chưa restore drill. Schema v2 giữ event ID và snapshot cũ, thêm slug ổn định.
- Gemini đã nhận diện thật 8 cột nguồn từ Sheet mẫu: Đường dẫn truy cập trước đó, Trang submit, Nguồn Marketing và 5 cột UTM. Sync tạo snapshot mới với 134 đăng ký, 84 C-Level; giữ snapshot trước đó.
- UI đã mở và reload trực tiếp trang `/28.10-ceo-x-ai-da-nang-f98ed7/thanh-vien`, hiển thị đúng trang thành viên. Tổng quan hiển thị KPI mới 9,93%, các filter nguồn và toggle %.
- Kiểm tra UI phát hiện selector collection sai ở handler lọc nguồn/import; đã sửa dùng querySelectorAll wrapper, không chỉ dựa vào kiểm thử API.
- Sau sửa, thao tác filter `utm_content=DVH_Fbads` trên UI cho 16 đăng ký, 7 C-Level, KPI 1,19%. Excel tải qua nút Xuất Excel được mở lại bằng ExcelJS: B8=16, B10=7, B12=0,0119 và metadata đúng filter, đủ 6 sheet khi chọn tất cả báo cáo.
- Screenshot toàn trang đã xác minh % hiện trực tiếp trên từng nhóm chức vụ/quy mô; bỏ filter trở về 134/84 và 9,93%. Ảnh kiểm tra lưu ngoài repo tại outputs/MISA-Event-Report-cap-nhat.png để không đưa dữ liệu vận hành vào Git.
- Bộ memory bank có 13 tệp, đủ các chủ đề chuẩn và active context. Liên kết tương đối trong memory bank được kiểm tra; quét source không thấy runtime secrets/private keys/token theo các mẫu kiểm tra. Đây không phải chứng nhận audit bảo mật toàn diện.
- Chưa triển khai yêu cầu MISA UI/bốn cấp quyền/import thành viên/hybrid/email policy/password lần đầu/IP MISA; theo dõi cụ thể tại memory-bank/12-active-context.md. Chưa deploy máy chủ MISA/Cloud Run, chưa kiểm chứng native host.

## Bằng chứng baseline trước cập nhật

- Docker app và PostgreSQL đều `healthy`; app bind `127.0.0.1:8096`, DB không publish host port.
- Đọc trực tiếp Google Sheet mẫu bằng service account được cung cấp: 134 đăng ký, 84 C-Level; 0 dòng thiếu/sai ngày, 0 dòng trùng toàn bộ các trường chuẩn hóa.
- Gemini `gemini-4-argon`: gọi thật thành công cho nhận diện 10 cột và nhận xét báo cáo. Sau khi cung cấp sẵn tổng từng khối, nhận xét đối soát đúng các nhóm 200/400/300/750. Nhận xét AI vẫn cần người dùng đối chiếu; bảng/dashboard không phụ thuộc model tính toán.
- Đồng bộ hai lần liên tiếp với Sheet không đổi: `changed: false`, số snapshot không tăng.
- 8 bài test unit/ingestion và 1 bài integration tổng hợp đã chạy đạt trên môi trường Docker kiểm thử riêng (cổng 8097, DB riêng). Môi trường kiểm thử đã dọn sau khi chạy.
- Integration bao gồm: chưa đăng nhập nhận 401; snapshot/import trái tenant nhận 404; Viewer sửa dữ liệu/cấu hình hoặc mời thành viên nhận 403; nâng Editor được sửa; invitation chỉ nhận một lần; thu hồi thành viên có hiệu lực; bản cũ không đổi sau chỉnh sửa; hai cập nhật cùng snapshot cho một 200 và một 409.
- Giao diện: đăng nhập, chọn báo cáo, bảng chức vụ/quy mô, biểu đồ, lọc ngày và so sánh đã thao tác trực tiếp trong browser.
- Ngày 16/10 so với 15/10: 49 so với 43 đăng ký; 25 so với 30 C-Level, theo dữ liệu đọc tại thời điểm kiểm tra.
- PNG bảng chức vụ/quy mô đã tạo, xem trước và tải thành file **1950 × 1908 px**. Ảnh mẫu ở `../Bao-cao-chuc-vu-quy-mo.png`; ảnh dashboard ở `../MISA-Event-Insights.png`.
- `npm audit --omit=dev`: 0 vulnerabilities được báo cáo. Phụ thuộc có lockfile; override `uuid=11.1.1` để thay bản cũ trong ExcelJS, luồng đọc XLSX đã được test sau thay đổi.
- Chưa kiểm chứng trên Cloud Run/Cloud SQL, chưa load test sản xuất, chưa khôi phục backup thực tế hoặc tích hợp SSO. Đây là các việc của bước cloud tiếp theo, được mô tả trong `deploy/CLOUD-RUN.md`.
