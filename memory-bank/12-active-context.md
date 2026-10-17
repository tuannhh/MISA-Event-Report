# 12 — Ngữ cảnh hiện tại

Cập nhật 17/10/2026, schema v4, UI Vue/MDS. Đã triển khai yêu cầu 1–5 và account policy 7–8: ngày/số Việt Nam, MDS components + mobile composition riêng, import Excel Editor theo event, online/offline/hybrid, Viewer/Editor/Admin/Super admin. Source dropdown tự cập nhật report. Xem VERIFICATION.md cho test và Docker.

Luồng mới: `/log-in` → `/su-kien` để tự chọn sự kiện, không tự mở event đầu tiên. Danh sách desktop/mobile riêng có tìm kiếm, lọc quyền và nhãn Viewer/Editor/Admin/Super admin. Quyền cấp riêng mỗi event; không có membership là Viewer. Deep link hết session đổi về `/log-in`; đăng nhập lại về danh sách. Tài khoản bắt buộc đổi mật khẩu qua `/change-password` trước danh sách. 19/19 tests QA đạt; browser xác nhận một tài khoản Viewer ở event A và Editor ở event B, refresh/back/logout và mobile 320/390px. Không thay schema hay reset mật khẩu người dùng trong lần sửa này.

Bản Docker vẫn dùng project/volume misa-event-insights. Migration v3 thu hồi session cũ; đăng nhập bằng Super admin được yêu cầu và tự đổi mật khẩu lần đầu. Không reset mật khẩu đã đổi khi restart/import. Tài khoản bootstrap ngoài miền bị inactive. DB trước nâng cấp đã backup và restore thử vào database riêng; 1 event/2 snapshots/134 rows trước-sau khớp. Không commit backup hoặc runtime env.

Còn cần thông tin bên ngoài: máy chủ MISA + CIDR/IP allowlist; host MISA AMIS + thiết bị thật để nghiệm thu native mobile. Chưa deploy cloud/managed Agent Runtime. Gemini REST model giữ nguyên.

Còn hardening backend: config JSON theo môi trường, tách thêm routes/services, rate limiter chia sẻ, audit atomic ở một số endpoint legacy, retention/RPO/RTO và load test. Còn UI quality: native host adapter, draft restore sau reload và focus validation từng field. Không gọi bản này production-ready/toàn bộ standard compliant.

Quy tắc giữ nguyên: đếm mỗi dòng, C-Level CEO/Giám đốc + Chủ doanh nghiệp, lọc ngày submit UTC+7, cấu hình riêng event. KPI Tỷ lệ C-Level dùng C-Level / mục tiêu theo yêu cầu mới 17/10; clevel_share vẫn C-Level / đăng ký. Chênh lệch mục tiêu tổng/chi tiết vẫn lưu trong dữ liệu chất lượng và bản Excel; theo yêu cầu mới nhất không hiển thị khối giải thích/cảnh báo trên bảng mục tiêu. Hình thức không rõ là unknown, không đoán từ event.mode.

Yêu cầu mới nhất: nhập dữ liệu hợp lệ phải tự tổng hợp ngay và mở báo cáo toàn bộ active snapshot; filter ngày/nguồn/nhân viên là tùy chọn. Đã triển khai automatic import, pending recovery khi chưa có snapshot, source refresh khi mở/focus/60s, không còn tự gọi/hiển thị nhận xét AI theo yêu cầu UI mới, lọc nhân viên và timestamp/warning. Sheet cũ bổ sung cột nhân viên ở lần sync kế; file cũ phải nhập lại nếu snapshot không lưu cột đó. Không đổi schema hay mục tiêu/KPI riêng đã chốt. Không tuyên bố native production compliance: vẫn cần host/thiết bị thật như mục trước.

Thay đổi tiếp theo 17/10/2026: đã triển khai 7 điều chỉnh dashboard/header. Chủ dự án chốt tỷ lệ gọi = đã gọi/tổng đăng ký, đường xu hướng nối số khách từng ngày (cùng trục với cột). Chỉ hybrid hiện hai ô Online/Offline. Module Mục tiêu & tracking đã bỏ khỏi dashboard; cấu hình mục tiêu và API legacy còn giữ. Xem mục mới trong 03–06 và VERIFICATION cho kiểm chứng; giới hạn native host/thiết bị thật vẫn còn.

17/10/2026 latest: compact dashboard, base64 brand, correct C-Level/target, snapshot-backed automatic B:I goals, optional none/phone/email dedup, normalized phone/MST, multi-select registration filters and20/50/100 paging implemented and deployed locally.35tests passed on separate QA. Final UI/PNG polishing verified in browser. Detailed source totals may disagree: keep explicit grandtotal; the latest UI instruction below supersedes inline warnings. Remaining host/native certification gaps unchanged; read VERIFICATION/UI-VERIFICATION for scope. No pending user approval.

## Cập nhật mới nhất — phân trang toàn ứng dụng
Đã triển khai mặc định20 và lựa chọn20/50/100 cho sự kiện, thành viên, xem trước nhập/lỗi, Chi tiết mục tiêu, Bảng số liệu, nhật ký; dữ liệu đăng ký giữ phân trang máy chủ. Nhật ký không còn giới hạn100bản ghi. Xuất PNG mở toàn bộ dòng rồi khôi phục trang; Excel vẫn toàn bộ theo bộ lọc. Xác minh mới ghi trong VERIFICATION/UI-VERIFICATION; khoảng trống native host MISA AMIS vẫn giữ nguyên.

## 17/10/2026 — bỏ khối chú thích trong tab mục tiêu
Giữ tab Chi tiết mục tiêu và bảng phân trang20/50/100. Bỏ tiêu đề lặp, mô tả cộtB–I, các thông báo giải thích phía trên bảng và chú thích công thức phía dưới. Đây là chỉ dẫn triển khai, không phải nội dung giao diện. Không bỏ cơ chế tự nhận diện Sheet Mục tiêu, snapshot hay tính lại kết quả khi nhập/đồng bộ; người dùng không cần thiết lập mục tiêu tracking thủ công. Tên tab được nhận diện bằng quy tắc trước, Gemini hỗ trợ fallback có kiểm tra; thống kê tính xác định ở backend. Giữ dữ liệu quality và cảnh báo trong Excel để đối soát.

## Yêu cầu UI mới nhất — toolbar báo cáo
Đã bỏ hai nút Xuất ảnh/Xuất Excel trên desktop và mobile theo yêu cầu chủ dự án. Không khôi phục nút từ mô tả cũ về xuất báo cáo. API/helper legacy còn giữ cho tương thích. Các điều khiển bộ lọc, %, thông tin dữ liệu, cập nhật được gom lên trên; bỏ hàng Toàn bộ dữ liệu mới nhất. Tabs và lựa chọn báo cáo cùng hàng khi desktop đủ rộng. Hai panel mở khi bấm nút, tự đóng khi đổi sự kiện; KPI/số liệu/auto sync không đổi.

## Hoàn tất tiếp nối — chart và Thành viên (17/10/2026)
Donut lớn hơn và responsive, số/chữ legend đặt gần nhau. Bỏ event name/latest timestamp lặp dưới tabs và ô nhận xét Gemini; loadReport không còn tạo request insights. Gemini nhận diện header/Sheet Mục tiêu vẫn giữ. Thành viên có form name/email mặc định Editor và mẫu Excel STT/Họ và tên/Email. 38/38 tests QA đạt, đã kiểm tra file mẫu thật qua importer; Docker build và desktop/mobile390px xác nhận. Không đổi schema, volume, dữ liệu hoặc quyền người dùng hiện hữu.
