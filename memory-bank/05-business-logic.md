# 05 — Luồng nghiệp vụ cốt lõi

## Nhập và công bố dữ liệu

1. Editor/owner chọn Excel .xlsx, CSV hoặc Google Sheet; server đọc tối đa 20.000 dòng/100 cột, upload ≤10 MB. headerRow 1–50. XLSX giới hạn kích thước giải nén khai báo 80 MB.
2. Server lưu staging theo event và người nhập. Header trùng bị từ chối. Ô trống có tên cột dự phòng; dòng hoàn toàn trống bị bỏ.
3. Người dùng ghép 10 trường; submitted_at và position phải có cột. Có thể nhờ Gemini đề xuất từ header, không gửi cả file cho AI.
4. Preview trả 5 dòng mẫu, chất lượng và số liệu dự kiến. Không đổi dữ liệu đang xem.
5. Commit khóa event, đọc staging còn hiệu lực, chuẩn hóa, tạo snapshot, đổi active_snapshot_id và source trong transaction. Staging bị xóa; không dùng lại được.

File mới là bản đầy đủ thay thế, không nối thêm. Nhập file xóa cấu hình nguồn Sheet. Nhập Sheet lưu mapping và autoSync do người dùng chọn. Lỗi parse/permission/Google giữ nguyên snapshot cũ. Snapshot lưu rows, không lưu bản sao settings; xem lịch sử vẫn tính theo quy tắc/mục tiêu hiện tại.

## Chuẩn hóa và công thức

Nguồn: `server/domain.js`.

- Chuỗi trim; so khớp C-Level/tracking dùng NFD, bỏ dấu, chữ thường, đ→d.
- Thời gian dd/mm/yyyy hoặc ISO chuyển về ISO timestamp; báo cáo tính ngày UTC+7. Ngày thiếu/sai giữ null, tính quality. Không lọc ngày thì dòng sai ngày vẫn vào tổng; có lọc thì loại.
- Mặc định đếm mọi dòng. Chọn dedup email/phone giữ dòng đầu theo thứ tự nguồn trước khi lọc ngày; giá trị trống không bị gộp.
- C-Level mặc định CEO/Giám đốc và Chủ doanh nghiệp; cấu hình từng sự kiện.
- completion = tổng đăng ký / target ×100; clevel_share = C-Level / tổng đăng ký ×100.
- Target row có completion = count/target, clevel_share = clevel/count, clevel_completion = clevel/target. Mẫu số 0 trả null, UI hiển thị “—”. Backend làm tròn hai chữ số thập phân.
- Chức vụ/quy mô/nguồn lấy tổng đăng ký đã lọc làm mẫu số, trống là “Chưa xác định”. Tracking không khớp vẫn tính tổng và nằm trong unmapped.
- Mục tiêu chi tiết khác tổng sự kiện chỉ cảnh báo, không tự sửa. Target toàn sự kiện lấy settings.target, không lấy targetSum.

**Quyết định riêng ngày 16/10/2026:** ô KPI trên tổng quan mang nhãn “Tỷ lệ C-Level” dùng tổng đăng ký / tổng mục tiêu theo yêu cầu trực tiếp của chủ dự án. Chú thích được đổi cùng công thức; 134/1.350 = 9,93%. Ô này có cùng giá trị với “Hoàn thành mục tiêu”. Chỉ đổi ô được chỉ định; không đổi nghĩa clevel_share ở API/bảng tracking. Tổng đăng ký và C-Level là hai số đếm khác nhau.

## Đồng bộ Sheet và sửa dòng

Timer mặc định 300 giây; mỗi batch chọn tối đa 20 nguồn bật và quá 4 phút chưa kiểm tra, cũ trước. syncEvent khóa event xuyên suốt fetch và commit để tránh sync cũ ghi đè file mới. SHA-256 của rows chuẩn hóa không đổi thì không tạo snapshot mới. Lỗi batch ghi sync_error và synced_at, giữ dữ liệu cũ. Manual sync trả lỗi trực tiếp.

Sửa dòng yêu cầu snapshot client đang thấy. Backend khóa event; nếu active đã đổi trả 409, yêu cầu tải lại. Nếu hợp lệ tạo snapshot mới, giữ bản cũ và tắt autoSync để tránh Sheet ghi đè thay đổi. Bật lại đồng bộ có thể thay dữ liệu sửa tay; UI cần giải thích rõ điều này.

## So sánh và xuất ảnh

Hai kỳ lọc cùng snapshot, cùng settings và cùng quy tắc dedup. Kỳ so sánh phải đủ ngày đầu/cuối. Biểu đồ trend chỉ chứa ngày có đăng ký, chưa điền ngày 0. PNG lấy đúng phần report đang hiển thị, gồm KPI và những báo cáo được chọn. Xuất bằng html2canvas, mở preview/download; không gửi báo cáo qua email trong ứng dụng.

Backend trend chỉ chứa ngày có đăng ký; UI fillDays điền ngày 0 tối đa 730 ngày. Excel xuất những ngày có dữ liệu, không tự tạo thêm dòng 0.

## Nguồn khách động và Excel

Stage tự gọi Gemini với tên cột để nhận diện nguồn/kênh/chiến dịch/đối tác/giới thiệu/UTM. Kết hợp quy tắc tên header và cho người nhập chọn lại trước preview/commit. Khi Gemini lỗi hoặc chưa cấu hình, trả notice rõ ràng, không gọi nhận diện bằng quy tắc là AI. Tối đa 12 cột; cột liên hệ cá nhân bị loại khỏi lựa chọn nguồn. Giá trị nguồn lưu theo nhãn gốc trong source_details; không gửi mẫu contact để khám phá cột.

Sync giữ danh sách đã chọn nếu headers không đổi; khi header thay đổi nhận diện lại. Nguồn Sheet cũ chưa có metadata nhận diện tại sync tiếp theo, tạo snapshot mới nếu rows thay đổi. Dữ liệu file cũ phải nhập lại để có các cột đã bị bỏ trước đây. Sửa trường chuẩn hóa không tự sửa nội dung cột source_details gốc; cần nhập nguồn mới nếu muốn đổi chiều nguồn.

Filter nhiều cột là AND và chạy sau dedup, cùng date range. Group và % tính từ tập đã lọc; mục tiêu toàn sự kiện không tự phân bổ lại theo nguồn. Biểu đồ nguồn hiển thị tối đa 20 nhóm, có chú thích; bảng/Excel giữ tất cả. Toggle % áp dụng cột/doughnut, tooltip vẫn có giá trị.

Export Excel lấy cùng hàm report với bảng/AI, luôn có Tổng quan chứa tên event, snapshot, khoảng ngày, filter nguồn, quy tắc và KPI; thêm sheet theo report được chọn và kỳ so sánh. Số ghi numeric, tỷ lệ fraction với 0.00%, nhãn ghi String để không chạy công thức từ dữ liệu. Dấu hiển thị Excel theo locale máy mở file.

## AI

Gợi ý mapping chỉ nhận header; nhận xét nhận báo cáo tổng hợp, bỏ targets chi tiết trước khi gửi. Raw contact không được chủ động đưa vào prompt. Nhãn group/source vẫn là dữ liệu nguồn, nên cần kiểm soát tránh chứa PII ngoài dự kiến. System instruction coi DATA là dữ liệu, không làm theo lệnh trong ô/nhãn. JSON phản hồi phải đúng schema; lỗi hoặc output thiếu trả lỗi, không bịa kết quả. Đếm số bằng code, không bằng model.

## v3: hình thức và nguồn tự cập nhật

Event mode online/offline/hybrid là cấu hình tổ chức. Mapping attendance_mode nhận Online/Trực tuyến, Offline/Trực tiếp, Cả hai/hybrid, còn lại unknown. Không tự suy từ event mode. Summary.modes gồm 4 nhóm loại trừ nhau, tổng bằng total; filter mode chọn chính xác một nhóm (online không bao gồm both). Dedup trước source/mode/date. Cùng filter áp dụng current/comparison/Excel. UI chọn nguồn tự gọi report, không cần nút Lọc. Member import là luồng riêng, không thay active lead snapshot.
