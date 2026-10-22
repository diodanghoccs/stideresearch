# C2-TUAN-001 — bàn giao phần Tuấn

Cập nhật ngày 22/10/2026. Baseline: `aa9fe00` (`Initialize STideResearch C2 base`). Nhánh bàn giao: `codex/c2-tuan-inference`; dùng `git log -1` trên nhánh này để xem commit triển khai.

**Trạng thái:** code inference và endpoint đã được kiểm tra; **BLOCKED phần chạy AI thật** vì môi trường chưa có provider/model/key. Luồng decrypt A → AI → Lan **NOT_RUN** trong checkout này. Chưa chuyển task sang IN_REVIEW hoặc DONE.

Tide đã được triển khai trên nhánh `origin/c2/trieu-app` (đã fetch và đối chiếu). `main` và nhánh Tuấn vẫn dựa trên baseline; ghép commit Tuấn vào nhánh ứng dụng trước khi kiểm thử API bằng identity thật. Hợp đồng DraftBrief/InferencePort trên nhánh ứng dụng vẫn tương thích. Test inference dùng các port độc lập để không phụ thuộc Tide stub của baseline.

## Thay đổi đã triển khai

- `index.ts`: adapter OpenAI Responses qua native fetch, không thêm dependency. Prompt yêu cầu ý chính, điểm chưa chắc và nguồn A; không dùng tools, retry hoặc redirect. Timeout 20 giây; trả model thực tế, provider, runId và createdAt theo exports chung.
- `input.ts`: chỉ chấp nhận record A, text tối đa 20.000 ký tự, runId tối đa 128 ký tự; từ chối trường thừa hoặc credential.
- `http.ts` và `src/app/api/summarize/route.ts`: giữ auth-first, giới hạn body 64 KiB kể cả khi không có Content-Length, response no-store; phân biệt lỗi input, upstream, xác thực và integration chưa sẵn sàng.
- `adapter.test.mjs`, `http.test.mjs`, `smoke.mjs`: 35 ca kiểm thử cục bộ. Các port mô phỏng chỉ dùng trong test; route triển khai luôn gọi getter Tide hiện tại.
- `live-smoke.mjs`: một lần gọi model bằng A synthetic viết sẵn; artifact chỉ chứa metadata/hash, không lưu plaintext hoặc secret.
- `.env.example`, `README.md`: mẫu cấu hình riêng cho phần Tuấn và hướng dẫn chạy từ thư mục gốc.

Chỉ sửa module inference và endpoint summarize thuộc phạm vi Tuấn. Không đổi contracts, Tide, UI, storage, checks/fixtures của người khác, manifest hoặc lockfile. Không cần dependency mới để Triệu áp dụng.

## Nghiệm thu

| AC | Kết quả hiện tại | Bằng chứng / phần còn thiếu |
|---|---|---|
| TUAN-01: model thật với A synthetic | NOT_RUN | [live-smoke.json](./evidence/live-smoke.json) ghi thiếu cấu hình; chưa chọn model và chưa xác minh quyền dùng tài khoản |
| TUAN-02: A sau decrypt → draft → Lan | NOT_RUN | Đúng shape DraftBrief qua unit test; chưa có decrypt/session/UI thật để ghép |
| TUAN-03: auth, giới hạn input, lỗi/timeout | PARTIAL | [local-checks.json](./evidence/local-checks.json): 35 ca PASS, gồm 401/403 mô phỏng, chặn đọc body trước auth, input B/oversize, upstream và timeout. HTTP production thật trả 503 với thiếu/sai bearer vì Tide chưa triển khai; chưa chứng minh JWT/DPoP thật |
| TUAN-04: secret và plaintext | IMPLEMENTED, chờ review | Key chỉ đọc từ env server; không log text/token/diagnostic; đường plaintext và retention ghi trong README. Điều khoản/cấu hình tài khoản nhóm chưa được xác minh |
| TUAN-05: không có inference khả dụng | PASS trường hợp thiếu cấu hình | Trả not-ready/NOT_RUN, không có draft mẫu; lỗi provider/timeout trả UPSTREAM_ERROR trong test |

Các gate repo: typecheck PASS, production build PASS, storage 8 ca PASS, HTTP base smoke 6 ca PASS. Xem [repo-checks.json](./evidence/repo-checks.json). Cài dependency/build và HTTP smoke phải chạy ngoài sandbox do DNS/EPERM/EACCES của môi trường; không cần sửa code ứng dụng để vượt các lỗi môi trường này.

## Cấu hình và đường plaintext

Adapter được triển khai cho `INFERENCE_PROVIDER=openai`. Hai biến còn lại: `INFERENCE_MODEL`, `INFERENCE_API_KEY`. Chưa có giá trị trong môi trường; `.env.local` chưa tồn tại khi kiểm tra. Không có model mặc định hoặc dịch vụ mới được mở.

AI-reader giữ plaintext sau decrypt, Next.js server nhận plaintext sau auth và gửi sang OpenAI qua HTTPS. Host/proxy trên đường truyền và provider có thể thấy dữ liệu. Không gửi Tide token, khóa giải mã hoặc runId cho provider. Request đặt `store: false`; không tuyên bố zero retention. Nguồn và giới hạn retention được ghi trong [README](./README.md#plaintext-và-phụ-thuộc-tích-hợp).

Kiểm tra record A là giới hạn input của demo, không phải bằng chứng nguồn gốc mật mã. Trí/Triệu cần đảm bảo payload chỉ lấy từ kết quả decrypt A thành công. Nếu ID record thực tế khác `A`, cần thống nhất mapping trước khi tích hợp, không nới để nhận B.

## Việc cần hoàn tất trước review

1. Nhóm cung cấp model/key của dịch vụ đã được phép dùng, rồi chạy lệnh live smoke trong README; thay artifact NOT_RUN bằng kết quả thật. Không gửi key vào chat hoặc commit.
2. Đồng bộ verifier token/DPoP và quyền summarize từ bản Tide đã sẵn sàng; Triết kiểm caller sai bằng identity thật.
3. Triệu ghép một lần A decrypt → summarize → Lan rà nội dung, cùng một runId; kiểm chứng B không đi vào inference.
4. Planner B review code và dataflow; Triết review input/output. Chỉ chuyển IN_REVIEW khi đủ bàn giao, không tự DONE.

Quỹ thời gian làm song song C1 của Tuấn chưa được cung cấp trong phiên này; bản bàn giao không coi C1 đã được hoàn thành hoặc thay đổi lịch C1.
