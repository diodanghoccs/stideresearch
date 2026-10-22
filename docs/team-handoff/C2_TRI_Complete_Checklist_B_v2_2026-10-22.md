# Trí — checklist đầy đủ cho tích hợp và bàn giao Tide C2

**Planner B, 22/10/2026, UTC+7.** Theo yêu cầu Triệu kiểm tra danh sách công việc đã đủ chưa. Đây là bản bổ sung để giao và nghiệm thu; không ghi đè handoff của Trí, không xác nhận đã hoàn thành.

Đọc cùng [task Trí](tasks/C2-TRI-001.md), [chỉ dẫn B sau handoff 16:12](C2_TRI_Next_Steps_B_2026-10-22.md) và [cập nhật chính thức về MCP/mô phỏng](C2_Official_Update_MCP_and_Simulation_B_2026-10-22.md). Khi mâu thuẫn, quyết định mới nhất của Triệu và nguồn BTC hiện hành được ưu tiên.

## Mục tiêu và ranh giới

Trí chịu trách nhiệm phần Tide mà app cần sử dụng: cấu hình, identity/role, phiên browser, xác thực API server, policy/crypto và bằng chứng. **Login thành công chưa phải hoàn thành tích hợp Tide.**

- Repo: https://github.com/diodanghoccs/stideresearch . Snapshot B gần nhất: `c2/trieu-app`, commit `d96017cbe0a8143ef82c963517ee2a248d788bd5`; Tuấn đã merge vào nhánh này. Main lúc kiểm còn base. Khi nhận việc, ghi commit thực tế mới hơn nếu có.
- Trí sửa `src/tide/`, tài liệu setup và assets Tide trong phạm vi đã giao. Contracts, package/lock, provider/layout/config chung: gửi patch/yêu cầu để Triệu ghép. Không viết chồng inference/summarize của Tuấn.
- Giữ thay đổi cũ; không dựng lại realm, không đổi remote C1 hoặc ghi đè repo đồng đội. File adapter local không phải API key model.
- Cửa sổ kiểm chứng thật đã duyệt kết thúc 16:40. Checklist này **không gia hạn** hay mở lại thử nghiệm mới. Báo kết quả đã có, bàn giao và sửa lỗi đã xác định trong phạm vi/lịch được duyệt. Tiếp tục thử nghiệm hoặc chuyển cơ chế cần quyết định Triệu tương ứng.

## 1. Code và cấu hình chạy

- [ ] Đối chiếu provider/DPoP/verifier/crypto đã có trên nhánh app với patch Trí; ghép phần còn thiếu, tránh hai implementation khác nhau.
- [ ] Ghi máy integration, commit, Node/SDK, server image digest/build, realm/client, URL app/auth và mạng ORK; dùng UNKNOWN nếu chưa xác minh.
- [ ] Kiểm adapter local `data/tidecloak.json` thuộc đúng realm/client, URL/origin/redirect phù hợp. Với config hiện có, app/Tide/trình duyệt thử ưu tiên cùng máy Trí.
- [ ] Ghi route login đúng build. Snapshot B đọc chưa có `/tide`; UI `/` đã có nút login. Nếu giữ trang diagnostics cũ, bàn giao patch riêng cho Triệu, không yêu cầu team mở route chưa tồn tại.
- [ ] Hướng dẫn coding agent dùng Tide MCP/playbook phù hợp hoặc nguồn chính thức đã đọc; ghi nguồn/phiên bản. MCP là công cụ phát triển, không thay API inference.

## 2. Identity và IGA/role

- [ ] Nhận diện các account thật và session/profile riêng; không dùng label UI để giả đổi danh tính.
- [ ] Lan/owner có realm roles `_tide_encryptor`, `_tide_decryptor`, cùng client role `realm-management/tide-realm-admin` để ký grant theo thiết kế hiện tại.
- [ ] Minh và Y có `_tide_decryptor`; Y không có grant S. AI-reader có `_tide_decryptor` và chỉ grant A khi kiểm nhánh S2.
- [ ] Với S2: đủ bốn identity Lan, AI-reader, Minh, Y. Nếu Triệu chọn phạm vi khác thì ghi identity thực sự dùng và bỏ claim tương ứng; không gọi ba identity là đủ kiểm S2.
- [ ] Role CR đã approve **và apply**, login/refresh lại rồi kiểm actual claims. Ghi HTTP code/state/caller/subject/count/threshold và `iga.attestor`; không chỉ ảnh pending/202.
- [ ] Tách cấp role IGA khỏi ký relationship policy; không ghi chúng là cùng một phép kiểm chứng.

Người vận hành giữ mật khẩu/invite và ký enclave. Trí hướng dẫn, kiểm cấu hình và thu kết quả an toàn, không yêu cầu gửi credential qua chat.

## 3. Browser session và API app — bắt buộc có trong bàn giao

- [ ] `TideSessionPort` trả identity/roles đúng session, hỗ trợ login/logout và authenticated fetch có token + DPoP.
- [ ] `TideRequestVerifier` kiểm chữ ký, issuer/client và DPoP binding của request; quyền lấy từ claims đã kiểm, không từ body/header tự khai của client.
- [ ] Một request thật được phép tới API app thành công; thiếu token, token giả, thiếu/sai DPoP bị chặn; caller không phải admin không được ghi policy.
- [ ] Đối chiếu cùng Triệu các route `GET/PUT /api/records/:recordId`, `GET/POST /api/policies` và cùng Tuấn `POST /api/summarize`: verify + authorize trước thao tác bảo vệ/gọi model.
- [ ] Không bỏ auth để test model, không dùng token master/admin cho AI-reader. Lỗi cấu hình/nội bộ giữ là error/not-ready, không biến thành quyền đã xác minh.

Trí làm và chứng minh **auth/authorization**; Triệu giữ code routes records/policies và UI, Tuấn giữ adapter/route inference. Phát hiện lỗi ngoài scope thì bàn giao patch hoặc lỗi tái hiện cho đúng chủ file.

## 4. Policy, mã hóa và đối chứng

- [ ] Policy ký đúng subject: User dùng `tideuserkey`; record/tag khớp A/B/S và đúng access. Không thay crypto bằng chuỗi giả mà ghi là mã hóa thật.
- [ ] Owner encrypt/decrypt round-trip một record synthetic thành công bằng grant phù hợp, có đối chiếu kết quả.
- [ ] Owner ghi S; Minh dùng grant đọc của Minh mở đúng S. Y dùng cùng ciphertext và policy Minh, bị ORK từ chối đúng nguyên nhân.
- [ ] Nếu giữ S2: AI-reader mở A thành công; dùng policy B của owner để thử B và nhận ORK deny đúng cause; không dùng credential owner thay AI-reader.
- [ ] Sửa phân loại lỗi trong bridge nếu còn dùng baseline: generic `THRESHOLD_FAILURE` không tự đủ chứng minh denied. Cần cause contract/quyền và positive control; lỗi mạng/không rõ cause giữ là error/chưa kết luận.
- [ ] Phân biệt quyền giải mã do ORK với HTTP 403/ẩn policy của backend. Đường đối chứng outsider phải thực sự đến phép decrypt cần kiểm.

Đối với inference, **record tag Tide là `rec-A`, nhưng payload API model hiện dùng `sourceRecordId: "A"`** theo commit sửa sau merge. Trí không đổi mapping này một phía.

## 5. Nhánh thật hoặc mô phỏng

BTC hiện cho phép mô phỏng Tide khi mạng quá tải, chấm ngang với tích hợp thật. Đây là Plan C chính thức, khác fallback F-B nội bộ.

- [ ] Lập bảng từng khả năng: login, role/IGA, policy, crypto, API verification — đã chạy thật, chưa chạy, lỗi, hay mô phỏng.
- [ ] Nếu phần Tide bị chặn: gửi Triệu đề xuất cụ thể phần cần mô phỏng, phần thật giữ lại và hành vi demo dự kiến. Chưa tự chuyển app sang mock vì B chưa nhận quyết định đó.
- [ ] Nếu Triệu duyệt mô phỏng: Trí chuẩn bị adapter theo port hiện có, Triệu ghép provider/UI; gắn nhãn rõ và giữ bằng chứng mô phỏng riêng. Không để token giả đi qua verifier thật hoặc âm thầm fallback một phép decrypt thật bị lỗi thành success giả.
- [ ] README/video nói đúng chế độ. Không gắn `S2_VERIFIED`/`S1_VERIFIED` cho test giả lập; ghi prototype mô phỏng theo Plan C khi đúng quyết định.

Không tuyên bố chống mọi admin: owner hiện kiêm admin, threshold đang là 1 theo handoff Trí. Việc model nhận plaintext A cũng phải được mô tả đúng, dù storage chỉ lưu ciphertext.

## 6. Gói bàn giao để B/Triết kiểm

- [ ] Commit/branch hoặc patch, danh sách file; không chỉ nói đã chạy trên máy mình.
- [ ] Lệnh setup/start, cấu hình cần thiết và vị trí adapter local; không raw token/password/API key/invite URL.
- [ ] Metadata môi trường + IGA/CR; ảnh diagnostics an toàn và log/HTTP code cho test đã chạy.
- [ ] Bảng PASS/FAIL/NOT_RUN/MÔ PHỎNG cho auth, role, owner round-trip, Minh/Y, AI-reader A/B; cause và đối chứng.
- [ ] Triệu dùng được ports để ghép UI; Triết có hướng dẫn tái chạy; ghi blocker và phần còn thiếu cho từng người.

**Tiêu chí đóng phần Trí:** phạm vi được Triệu chọn có code tích hợp, hướng dẫn tái chạy và bằng chứng đúng chế độ. Task giữ IN_PROGRESS; đủ gói bàn giao mới IN_REVIEW, B mới quyết định DONE. Không yêu cầu Trí hoàn thành API model của Tuấn, video/README toàn dự án của Triệu hay tự nộp bài.

**Thứ tự ưu tiên:** báo kết quả hiện có → đồng bộ đúng code/config → xử lý lỗi auth/crypto đã biết → chốt chế độ với Triệu → bàn giao bản demo và bằng chứng. Các checkbox là tiêu chí đối chiếu, không phải hứa hoàn thành mọi mục trước freeze hay quyền mở một lượt tích hợp mới.
