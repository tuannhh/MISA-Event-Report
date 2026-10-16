# 10 — Lịch sử phát triển

## 16/10/2026 — Baseline Docker v1

Yêu cầu: thay công việc Excel thủ công bằng báo cáo sự kiện có phân quyền. Đã triển khai import/preview, snapshot, Sheet sync, bảng/chart, khoảng ngày, PNG và Gemini. Schema v1 gồm 9 bảng. Bằng chứng kiểm tra thời điểm đó ở VERIFICATION.md; không suy rộng thành xác nhận production.

## 16/10/2026 — Ghi nhận yêu cầu MISA v2

Chủ dự án yêu cầu MISA Design System/mobile, bốn cấp quyền, import thành viên, email nội bộ, đổi mật khẩu lần đầu, IP allowlist, sự kiện online/offline. Skill design system đã cài trên máy; các chức năng này chưa có trong baseline. Ghi đầy đủ vào 12-active-context để tiếp tục mà không mất yêu cầu. Quy tắc C-Level mặc định và dedup được chủ dự án xác nhận giữ, cho phép cấu hình sự kiện.

## 16/10/2026 — Memory bank và repository

Theo yêu cầu trực tiếp, đọc MISA Backend Standard commit a940384, lập memory bank 01–11 và active context, thêm AGENTS.md, liên kết README, quy tắc ignore secrets và CI kiểm thử. Tài liệu phản ánh code thực tế, chỉ rõ khoảng trống thay vì mô tả kiến trúc mong muốn như đã có. Repository đích MISA-Event-Report private, vẫn giữ tên Compose để bảo toàn volume.

## 16/10/2026 — KPI, Excel, phần trăm và nguồn khách động

Chủ dự án chỉ định ô “Tỷ lệ C-Level” phải bằng tổng lượt đăng ký / tổng mục tiêu; frontend dùng completion và chú thích tương ứng, API clevel_share không đổi. Bổ sung export.xlsx theo quyền đọc, bộ lọc, snapshot, kỳ so sánh và báo cáo đã chọn; ô số thật và kiểm tra chuỗi công thức độc hại. Biểu đồ có toggle hiện %.

Để không giới hạn nguồn ở Marketing, thêm nhận diện cột nguồn bằng Gemini từ headers, fallback có thông báo, cho phép người nhập chỉnh danh sách; lưu source_details trong JSONB row và metadata source. Bộ lọc nhiều cột kết hợp AND áp dụng cùng cách cho báo cáo/AI/Excel. Không đổi schema cho các field JSONB này; hỗ trợ đọc snapshot cũ.

Tài liệu đồng bộ: API, schema JSONB, business logic, frontend, security, traps và active context. Test bổ sung nguồn, filter, Excel, zero denominator và quyền export.

## 16/10/2026 — URL riêng từng sự kiện

Theo yêu cầu `/tên-sự-kiện-dãy-6-ký-tự/tính-năng`, migration v2 thêm slug duy nhất và backfill sự kiện có sẵn; không đổi UUID/snapshot. UI dùng History API, hỗ trợ deep link và back/forward; server SPA fallback cho các trang hợp lệ. Tài liệu đồng bộ: schema, API, frontend, deployment, traps. Slug không phải thông tin xác thực; API vẫn kiểm tra quyền bằng session và event ID.

## 16/10/2026 — Hoàn thiện yêu cầu 1–5 và account policy

Sau phản hồi chưa thấy thay đổi ở bản chạy: thay frontend vanilla bằng Vue/MDS thật, desktop/mobile riêng; source onchange load report; dd/MM/yyyy + vi-VN; roles v3, member Excel, no invite, forced password/domain, event mode + attendance breakdown. Backup/restore drill trước migration, giữ 134 rows/2 snapshots. Đổi Dockerfile multi-stage Vite; cập nhật CI tests và docs. Không deploy MISA server/IP/native host vì chưa có thông tin tương ứng.

## 16/10/2026 — Đăng nhập và chọn sự kiện

Tách URL đăng nhập `/log-in` khỏi route sự kiện, thêm danh sách `/su-kien` sau đăng nhập và `/change-password` cho tài khoản cần đổi mật khẩu. Không tự chọn sự kiện đầu tiên; người dùng chọn card có nhãn quyền riêng sự kiện, tìm kiếm và lọc được chỉnh sửa/chỉ xem. Thêm composition MDS desktop/mobile riêng. API giữ Viewer mặc định toàn ứng dụng và membership Editor/Admin từng event. Thêm test route policy, SPA entrypoints và role sau thu hồi quyền ở một event; 19/19 QA tests đạt. Browser xác nhận URL, quyền giữa hai event, refresh, Back sau logout và mobile không tràn ngang ở 320px. Cập nhật Docker giữ nguyên volume, không migration hay reset mật khẩu.
