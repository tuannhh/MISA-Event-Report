# 05 — Luồng nghiệp vụ cốt lõi

## Nhập và công bố dữ liệu

1. Editor/Admin/Super admin chọn Excel .xlsx, CSV hoặc Google Sheet; giới hạn vẫn 20.000 dòng/100 cột, upload ≤10 MB, headerRow 1–50, XLSX inflate 80 MB.
2. Giao diện gửi `automatic=true`: nhận diện nguồn/nhân viên từ header, dùng mapping chuẩn; nếu thiếu cột bắt buộc, thử Gemini với header (không gửi raw contact).
3. Khi mapping hợp lệ và có dữ liệu, backend tự công bố snapshot trong transaction, giao diện chuyển Tổng quan, bỏ bộ lọc cũ và chọn bản mới nhất. Không còn bắt người dùng xác nhận lần hai với nguồn đã nhận diện đủ.
4. Nếu chưa đủ mapping hoặc nguồn rỗng: giữ staging, trả needsMapping/notice; chỉ người nhập có quyền sửa ghép cột rồi preview/commit. Không thay active snapshot bằng dữ liệu không hợp lệ.
5. API staging/preview/commit thủ công vẫn tương thích. Sự kiện chưa có snapshot có thể tiếp tục phiên nhập mới nhất của chính người dùng, còn hạn một ngày, khi mở lại.

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
- Mục tiêu chi tiết khác tổng sự kiện chỉ cảnh báo, không tự sửa. Target toàn sự kiện lấy tổng ghi trong bảng mục tiêu của snapshot; nếu chưa có bảng thì dùng settings.target. Không tự thay bằng tổng chi tiết.

**Yêu cầu thay thế ngày 17/10/2026:** KPI “Tỷ lệ C-Level” dùng C-Level / tổng mục tiêu, API `clevel_completion`; khác `completion` và `clevel_share`. Excel và kỳ so sánh dùng cùng công thức. Ví dụ 84 / 1.350 = 6,22%.

## Đồng bộ Sheet và sửa dòng

Ngoài timer 300 giây, Tổng quan tự POST refresh khi mở, khi quay lại tab và mỗi 60 giây khi tab đang hiển thị ở bản mới nhất. Nguồn đã bật autoSync được đọc lại; cooldown 15 giây được kiểm tra dưới row lock để gộp cập nhật đồng thời. Viewer có thể yêu cầu kiểm tra nguồn đã được Editor bật, không được thay URL/mapping hoặc bật đồng bộ. Lỗi trả warning và giữ snapshot cũ; phiên lịch sử không tự nhảy sang mới nhất. Timer nền mỗi batch chọn tối đa 20 nguồn bật và quá 4 phút chưa kiểm tra, cũ trước. syncEvent khóa event xuyên suốt fetch và commit để tránh sync cũ ghi đè file mới. SHA-256 của rows chuẩn hóa không đổi thì không tạo snapshot mới. Lỗi batch ghi sync_error và synced_at, giữ dữ liệu cũ. Manual sync trả lỗi trực tiếp.

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

Gợi ý mapping chỉ nhận header. Theo yêu cầu mới nhất, dashboard không hiển thị hoặc tự gọi nhận xét Gemini. Endpoint/helper nhận xét cũ vẫn giữ tương thích, dùng snapshot và bộ lọc truyền vào. Payload AI chỉ gồm KPI, chức vụ, quy mô, nguồn khách tổng hợp, hình thức, xu hướng và khoảng ngày; không gửi sourceDimensions, giá trị lọc nguồn/nhân viên, targets/groups hoặc tên file. Helper nhận xét legacy có cache trong phiên frontend theo event/snapshot/settings/filter và bỏ phản hồi cũ khi đổi bộ lọc; không còn timer tự gọi sau loadReport. Lỗi AI không làm mất KPI. Raw contact không được chủ động đưa vào prompt. Nhãn group/source vẫn là dữ liệu nguồn, nên cần kiểm soát tránh chứa PII ngoài dự kiến. System instruction coi DATA là dữ liệu, không làm theo lệnh trong ô/nhãn. JSON phản hồi phải đúng schema; lỗi hoặc output thiếu trả lỗi, không bịa kết quả. Đếm số bằng code, không bằng model.

## v3: hình thức và nguồn tự cập nhật

Event mode online/offline/hybrid là cấu hình tổ chức. Mapping attendance_mode nhận Online/Trực tuyến, Offline/Trực tiếp, Cả hai/hybrid, còn lại unknown. Không tự suy từ event mode. Summary.modes gồm 4 nhóm loại trừ nhau, tổng bằng total; filter mode chọn chính xác một nhóm (online không bao gồm both). Dedup trước source/mode/date. Cùng filter áp dụng current/comparison/Excel. UI chọn nguồn tự gọi report, không cần nút Lọc. Member import là luồng riêng, không thay active lead snapshot.

## Mặc định tổng hợp mới nhất (17/10/2026)

Mặc định không giới hạn tháng/ngày: tổng hợp toàn bộ dữ liệu hiện có của active snapshot; ngày sai vẫn tính trong tổng và có cảnh báo, nhưng bị loại khi lọc ngày. Thời điểm tổng hợp và kiểm tra nguồn hiển thị riêng. File chỉ thay đổi khi nhập file mới; Sheet bật đồng bộ được kiểm tra khi mở và trong lúc xem. Không suy diễn dữ liệu chưa có trong nguồn. Người dùng vẫn chọn được khoảng ngày, kỳ so sánh, nguồn, nhân viên và snapshot lịch sử. Danh sách lựa chọn nguồn lấy từ toàn snapshot sau dedup, không biến mất khi khoảng ngày cho kết quả rỗng.

Các cột Tên tiếp nhận/Nhân viên mời/Người phụ trách được nhận diện và lưu vào source_details để lọc như nguồn. Sheet cũ chưa có staffDimensionsVersion được bổ sung cột nhân viên ở lần sync tiếp theo, tối đa 12 chiều, tạo snapshot mới nếu dữ liệu chuẩn hóa thay đổi. File cũ cần nhập lại để bổ sung cột chưa được lưu; không sửa snapshot lịch sử.

## Điều chỉnh dashboard 17/10/2026 theo xác nhận chủ dự án
- Tỷ lệ gọi xác nhận = số đăng ký đã được gọi / tổng đăng ký sau cùng bộ lọc, dedup và phiên dữ liệu. Đếm một lần cho mỗi đăng ký dù nhiều lần gọi. Đã liên hệ/đã gọi và kết quả cuộc gọi rõ ràng như không nghe máy, từ chối, hẹn gọi lại được tính đã gọi. Có cột gọi nhưng trống/chưa gọi → not_called. Không có cột, snapshot cũ hoặc văn bản không nhận diện → unknown; không tự coi mọi ô có chữ là đã gọi. Tử số/mẫu số hiện trên KPI, unknown được ghi chú.
- Nhận diện các cột Gọi xác nhận/Trạng thái gọi/Kết quả gọi/call status và cột được ghép thủ công; không gửi nội dung từng lần gọi vào AI. AI chỉ nhận các tổng called/call_rate/call_unknown.
- Chỉ event hybrid hiện bộ lọc hình thức và hai KPI Online, Offline. Dòng both tính vào cả hai (ghi chú có thể trùng), unknown không tự gán, được ghi chú ngoài KPI. Sự kiện đơn hình thức ẩn phần này.
- Xu hướng: cột số đăng ký/ngày + đường nối cùng số lượng, không dùng tỷ lệ mục tiêu. Lấp ngày không đăng ký giữa ngày đầu/cuối bằng 0 cho chuỗi tối đa 3.660 ngày; khoảng dài hơn giữ dữ liệu rời rạc để hạn chế tài nguyên.
- Chiều nguồn mặc định utm_campaign (không phân biệt hoa thường), chọn chiều khác được giữ khi đổi bộ lọc. Bảng đăng ký dùng đúng utm_content, không thay bằng utm_term.
- Bỏ mô-đun Mục tiêu & tracking trên tổng quan và lựa chọn báo cáo; vẫn giữ thiết lập mục tiêu tổng và dữ liệu mục tiêu cũ để tương thích.

## Mục tiêu tự động, định danh và bộ lọc (17/10/2026)
Đọc tab Mục tiêu/Chỉ tiêu/Target/Goal từ workbook nguồn. Nếu tên không rõ và có cấu hình Gemini, gửi tối đa100 tên tab để gợi ý một tên; validate allowlist, không gửi dòng đăng ký. Cache gợi ý tên tab1giờ/tối đa100 bộ tên. Lỗi AI hiển thị thông báo, không bịa mục tiêu. XLSX dùng cached formula values; Google chỉ đọc B1:I501, max500 dòng, dò header20dòng đầu. B=đơn vị,C=tracking,D=tỷ trọng,E=mục tiêu. F–I tính lại từ dữ liệu đăng ký. Mã trùng, số mục tiêu lỗi, nhiều tab mục tiêu bị từ chối. Cột cuối được ghi rõ C-Level/mục tiêu và tính thống nhất (Sheet mẫu có công thức không đồng nhất ở dòng tổng và dòng con).
Giữ thứ tự/hierarchy: tổng cộng, nhóm không có tracking, các dòng tracking phía dưới. Tổng cộng thực tế cộng mã đã có trong kế hoạch; unmatched được nêu riêng và vẫn có trong KPI toàn sự kiện. Tổng mục tiêu nguồn và cộng chi tiết lệch được giữ trong quality metadata/Excel; không hiện khối giải thích trên bảng theo yêu cầu giao diện mới nhất. Cập nhật registrations+plan cùng transaction/lock; fingerprint gồm cảplan nên sửa mục tiêu cũng tạo phiên. Nguồn lỗi giữ phiên trước. Nhập file không có kế hoạch giữ kế hoạch cũ của event với retained=true để đối soát; nguồn Google không còn tab mục tiêu trả no-plan. Sự kiện mới không có nguồn mục tiêu hiển thị empty state, không tạo số liệu giả.
Không lọc trùng (mặc định) đếm mỗi dòng. Người dùng chọn phone hoặc email nếu cần, giữ dòng đầu trước lọc thời gian/nguồn. Phone chuẩn hóa +84/84/0084 số di động về0 để đối chiếu; dòng thiếu key được tính riêng. Danh sách dữ liệu vẫn giữ tất cả dòng nhập, không xóa dữ liệu do quy tắc báo cáo.
Phone/MST lưuchuỗi: phone di động9số bắt đầu3/5/7/8/9 hoặc cố định10số bắt đầu2 được thêm0; số quốc tế khác giữ nguyên. MST9số hoặc9-3/12số thêm0; độ dài hợp lệ10/13 giữ nguyên. Giữ identifier_original cho giá trị lúc nhập. Không đoán số thiếu nhiều chữ số/scientific notation; giá trị mơ hồ giữ nguyên. GET rows chuẩn hóa legacy khi hiển thị, không sửa snapshot cũ.

## Thành viên — biểu mẫu tối giản (17/10/2026)
Form thêm từng người chỉ gửi name/email; backend mặc định role=editor. File mẫu frontend/assets/member-template.xlsx có STT, Họ và tên, Email; STT không dùng cấp quyền, importer vẫn preview/validate rồi tạo Editor theo sự kiện. Giữ kiểm tra miền email, mật khẩu lần đầu và quyền quản trị hiện có.

## 18/10/2026 — nhiều nguồn và quy trình mời khách
Sự kiện mới có target=null, channelTargets online/offline=null, clevel=[], targets=[], dedup=none; không copy dữ liệu/thiết lập từ event đang mở. Event cũ chưa có nguồn/snapshot và chưa từng lưu settings chỉ được bỏ bộ default1350/C-Level cũ nếu khớp chính xác mẫu mặc định.
Mỗi nguồn Online/Offline nhập riêng; `auto` theo từng dòng. Hybrid thiếu mode giữ unknown theo xác nhận chủ dự án. Một khách tham gia cả hai là hai lượt, kể cả dedup phone/email. Invited chưa tính đăng ký; phản hồi confirmed chuyển registered. Tổng mục tiêu hybrid cộng hai mục tiêu nếu cả hai có dữ liệu; nếu chưa đủ dùng mục tiêu tổng được khai báo hoặc null, không coi thiếu là0. Mục tiêu theo nguồn tự nhận diện; plan cập nhật gần nhất trong cùng mode thắng, không cộng trùng các bản của cùng plan.
Nhận lại dòng bằng lead ID trong nguồn/tab/mode, hoặc dấu vân tay canonical theo lần xuất hiện; khác khóa dùng phone/email hợp lệ không mâu thuẫn và duy nhất trong event+mode. Không ghép chỉ vì trùng tên. Dòng cùng lô lặp vẫn được giữ khi Không lọc trùng; dedup báo cáo là quy tắc độc lập. Danh tính mơ hồ đưa vào đối chiếu, chưa cộng KPI đến khi Admin xử lý. Không xóa khách khi nguồn bỏ dòng. Ô trống nguồn không xóa giá trị đã có; overrides do người dùng lưu luôn thắng nguồn.
Contact log lưu người/thời điểm/kênh/phản hồi/ghi chú/lịch hẹn; cập nhật gọi và phản hồi tách biệt. Đã gọi là bằng chứng lũy tích, không bị nhập lại hoặc phản hồi giấy xóa. Giấy/phiếu xác nhận không tự nhận là gọi điện. Tỷ lệ gọi vẫn = khách đã gọi / tổng đăng ký.
Excel/Sheet nhiều tab phát hiện header từng tab, bỏ dòng chỉ STT và dòng tổng, giữ tên phòng từ tab nếu thiếu cột phòng. Gemini chỉ hỗ trợ ánh xạ các cột tồn tại, không điền nghề/chức vụ/ngày/mục tiêu thiếu. Không coi Payload.confirmation_field_input hoặc ĐÃ UPDATE báo cáo là bằng chứng gọi. Ngày thiếu để null, vẫn tính tổng nhưng không vẽ vào timeline hoặc khớp lọc ngày.
