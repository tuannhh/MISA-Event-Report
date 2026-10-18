# Memory Bank — MISA Event Report

Cập nhật: 18/10/2026, UTC+7. Package 1.0.0, schema v6. Đây là tri thức dự án đối chiếu với source, không chứa dữ liệu vận hành hoặc secrets.

Áp dụng cấu trúc 01–11 của [MISA Backend Standard, commit a940384](https://github.com/tuannhh/misa-backend-standard/tree/a940384030f86224a8775b82c4f72ee592104800/references/21-memory-bank-template), bổ sung active context để giữ các yêu cầu chưa triển khai. Các thay đổi tiếp nối về báo cáo và URL đã cập nhật trong tài liệu. Việc chuẩn hóa tài liệu không đồng nghĩa code đã tuân thủ toàn bộ standard.

Trước khi code, đọc 11 và 12. Lần đầu tiếp nhận đọc tuần tự toàn bộ. Khi thay đổi, sửa tài liệu liên quan và thêm mục lịch sử có lý do.

| Tệp | Nội dung |
|---|---|
| [01-project-overview.md](01-project-overview.md) | Mục tiêu, người dùng, môi trường |
| [02-technology-stack.md](02-technology-stack.md) | Công nghệ và kiến trúc thực tế |
| [03-database-schema.md](03-database-schema.md) | Toàn bộ bảng, cột, ràng buộc, migration |
| [04-api-reference.md](04-api-reference.md) | API đang có, payload, quyền, lỗi |
| [05-business-logic.md](05-business-logic.md) | Import, snapshot, số liệu, đồng bộ, AI |
| [06-frontend-architecture.md](06-frontend-architecture.md) | Vue 3 MDS, desktop/mobile |
| [07-deployment-infrastructure.md](07-deployment-infrastructure.md) | Docker, cấu hình, vận hành |
| [08-security-model.md](08-security-model.md) | Auth, quyền, tenant, giới hạn |
| [09-technical-traps.md](09-technical-traps.md) | Các bẫy đã xác minh |
| [10-development-history.md](10-development-history.md) | Lịch sử và lý do thay đổi |
| [11-coding-rules.md](11-coding-rules.md) | Quy tắc riêng của dự án |
| [12-active-context.md](12-active-context.md) | Yêu cầu tiếp theo, khoảng trống, thứ tự thực hiện |

Nguồn xác thực: `server/`, `frontend/`, `tests/`, `compose.yaml`, `Dockerfile`, yêu cầu trực tiếp của chủ dự án. [VERIFICATION.md](../VERIFICATION.md) ghi kiểm tra theo phiên bản và giới hạn bằng chứng.

Cập nhật18/10/2026: schema v5 với nguồn độc lập Online/Offline, hồ sơ khách bền vững, lịch sử liên hệ và phân công. Đọc mục mới nhất của03–06/08–09/12; các default1350/C-Level trong lịch sử không áp dụng cho sự kiện mới.
