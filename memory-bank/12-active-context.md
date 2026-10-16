# 12 — Ngữ cảnh hiện tại

Cập nhật 16/10/2026, schema v3, UI Vue/MDS. Đã triển khai yêu cầu 1–5 và account policy 7–8: ngày/số Việt Nam, MDS components + mobile composition riêng, import Excel Editor theo event, online/offline/hybrid, Viewer/Editor/Admin/Super admin. Source dropdown tự cập nhật report. Xem VERIFICATION.md cho test và Docker.

Bản Docker vẫn dùng project/volume misa-event-insights. Migration v3 thu hồi session cũ; đăng nhập bằng Super admin được yêu cầu và tự đổi mật khẩu lần đầu. Không reset mật khẩu đã đổi khi restart/import. Tài khoản bootstrap ngoài miền bị inactive. DB trước nâng cấp đã backup và restore thử vào database riêng; 1 event/2 snapshots/134 rows trước-sau khớp. Không commit backup hoặc runtime env.

Còn cần thông tin bên ngoài: máy chủ MISA + CIDR/IP allowlist; host MISA AMIS + thiết bị thật để nghiệm thu native mobile. Chưa deploy cloud/managed Agent Runtime. Gemini REST model giữ nguyên.

Còn hardening backend: config JSON theo môi trường, tách thêm routes/services, rate limiter chia sẻ, audit atomic ở một số endpoint legacy, retention/RPO/RTO và load test. Còn UI quality: native host adapter, draft restore sau reload và focus validation từng field. Không gọi bản này production-ready/toàn bộ standard compliant.

Quy tắc giữ nguyên: đếm mỗi dòng, C-Level CEO/Giám đốc + Chủ doanh nghiệp, lọc ngày submit UTC+7, cấu hình riêng event. KPI nhãn Tỷ lệ C-Level dùng đăng ký / mục tiêu theo chỉ định; clevel_share vẫn C-Level / đăng ký. Số mục tiêu tổng/chi tiết khác nhau phải cảnh báo. Hình thức không rõ là unknown, không đoán từ event.mode.
