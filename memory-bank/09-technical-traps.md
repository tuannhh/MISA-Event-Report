# 09 — Bẫy kỹ thuật

## Tổng mục tiêu khác tổng dòng chi tiết

Triệu chứng: tỷ lệ tiến độ không khớp khi cộng các đơn vị. Nguồn mẫu có tổng mục tiêu 1.350 nhưng chi tiết 1.650. Cách xử lý: giữ settings.target cho toàn sự kiện, cảnh báo targetSum khác; không tự sửa file nguồn. Bài học: phải nêu rõ mẫu số, không ép số mới theo ảnh báo cáo cũ.

## Ngày Việt Nam và ngày Excel

Triệu chứng: đăng ký gần nửa đêm sang ngày khác nếu lấy UTC date. Domain parseDate/localDay dùng UTC+7; ExcelJS Date được diễn giải là thời gian địa phương từ ô Excel. Ngày không hợp lệ giữ null, không tự chuyển 31/02 sang tháng 3. Không dùng toISOString().slice(0,10) để nhóm ngày nghiệp vụ. Giao diện date input vẫn theo locale browser; việc đổi toàn bộ sang dd/mm/yyyy còn mở.

## Lịch sử dữ liệu không phải lịch sử quy tắc

Snapshot chỉ lưu rows/quality. Khi settings thay đổi, cùng snapshot cũ có thể cho kết quả khác. UI/Excel phải nêu dùng quy tắc hiện tại; muốn tái hiện báo cáo lịch sử tuyệt đối cần version settings riêng, chưa làm.

## Đồng bộ ghi đè chỉnh sửa

Nguồn Sheet và sửa trực tiếp đều có thể tạo snapshot. Khóa event xuyên fetch/commit và đối chiếu active snapshot tránh ghi đè phiên mới; sửa tay tắt autoSync. Đổi lại, Google timeout có thể giữ row lock tới 90 giây. Không bỏ khóa khi tối ưu mà chưa có cơ chế optimistic concurrency thay thế.

## Đổi tên repository không đổi tên volume

Compose project đang là misa-event-insights. Đổi sang MISA-Event-Report mà tạo project mới sẽ dùng volume mới, trông như mất dữ liệu. Giữ nguyên project/volume trừ khi có migration dữ liệu có kiểm chứng.

## Bootstrap chỉ chạy khi users rỗng

Đổi env không cập nhật tài khoản đã có. Super admin mới chưa được provision ở baseline. Không xóa DB để ép bootstrap; phải triển khai migration/provisioning có chủ đích.

## Kết nối Google và nhận diện nguồn

Sheets API từng bị tắt trong project được cung cấp; sau bật API và cấp quyền đã đọc được Sheet. Google 403 có thể là API chưa bật hoặc chưa được share; không coi là file rỗng. Nhận diện nguồn chỉ gửi header; nếu Gemini không khả dụng, dùng gợi ý theo tên cột và thông báo rõ. Các giá trị nguồn chỉ tồn tại trong file trước đây sẽ không tự xuất hiện ở snapshot cũ; cần nhập lại hoặc đồng bộ Sheet tạo phiên mới.

## Kiểu ô Excel

Xuất số dưới dạng number, tỷ lệ dạng fraction với numFmt phần trăm; không xuất chuỗi số định dạng rồi kỳ vọng Excel tính được. Excel hiển thị dấu phân cách theo locale của máy mở file. Nhãn bắt đầu '=' vẫn phải ghi String, không chuyển thành formula/hyperlink.

## Slug ổn định và fallback SPA

Slug được lưu trong DB, không tính lại mỗi lần render. Route browser tải index.html nhưng dữ liệu vẫn cần auth và membership. Assets phải dùng đường dẫn tuyệt đối /app.js, /styles.css để deep link tải lại không lỗi. Thêm slug NOT NULL ảnh hưởng khả năng rollback về code v1 tạo event không có slug; xem deployment notes.

## Selector collection trong handler UI

Kiểm thử API có thể pass trong khi nút lọc không chạy. Khi kiểm tra UI, handler dùng `$()` trả một element rồi gọi filter/map thay vì `$$()` trả mảng. Đã sửa cả lọc nguồn và picker nguồn import. Bài học: phải thao tác UI thật, kiểm tra KPI sau lọc và dữ liệu Excel tải xuống; script sửa source bằng String.replace cần callback nếu replacement có ký tự `$` để tránh bị diễn giải đặc biệt.

## v3

- Không structuredClone Vue reactive proxy; clone settings qua JSON vì payload thuần JSON.
- MButton default secondary: nút chính phải khai báo primary. Registry không có table/history; dùng list/clock.
- Cần rebuild Docker mới thấy UI Vite, Express serve dist không public.
- Hai localhost port dùng chung cookie host; QA login có thể thay session cookie local app, cần đăng nhập lại đúng môi trường.
- Mọi viewer thấy mọi event là yêu cầu sản phẩm, không dùng test isolation v1 để áp đặt membership read. Isolation vẫn áp dụng snapshot/import và quyền ghi.

## 17/10/2026 — Nhập xong nhưng KPI bằng 0

Bằng chứng ban đầu: event có 134 raw rows trong imports nhưng active_snapshot_id null, chưa có snapshots. UI trước đây đọc nguồn xong còn đòi preview/commit, khiến người dùng tưởng đã nhập hoàn tất. Luồng automatic mới tự publish khi hợp lệ, chỉ dừng để sửa mapping nếu cần. Sau import phải xóa bộ lọc cũ và lựa chọn snapshot lịch sử; nếu không số liệu mới có thể vẫn bị che.

MUpload: inputRef.click() nổi lên label @click.prevent sẽ bị hủy default action mở picker. @click.stop ở input chặn vòng này; đã kiểm chứng bằng chọn CSV thật. Không coi thao tác bấm upload không lỗi JS là bằng chứng picker hoạt động.

- Khi bỏ dấu tiếng Việt để nhận diện trạng thái gọi, phải xử lý cả Đ và đ (hoặc lowercase trước); “Đã liên hệ” viết hoa từng làm KPI gọi bị thiếu. Regression tests có tình huống này.
- Không dùng trường tracking làm utm_content vô điều kiện vì mapping legacy có thể lấy utm_term. Snapshot mới lưu riêng utm_content; snapshot cũ chỉ fallback đúng tên cột trong source_details.
- Với hybrid, filter Online/Offline phải bao gồm both giống KPI; nếu dùng phép bằng tuyệt đối sẽ làm tổng sau lọc khác số thẻ.

17/10/2026: normalize tiêu đề phải xử lý cả Đ/đ và xuống dòng. .gitignore có *.sql nên cần ngoại lệ !server/migrations/*.sql cho delta v4. Không gửi dữ liệu mục tiêu nhân viên qua AI diễn giải. Sheet mẫu có tổng mục tiêu khác tổng chi tiết và các công thức tỷ lệ không nhất quán; không suy diễn/bù mục tiêu, hiển thị chênh lệch và ghi rõ mẫu số trongapp.
