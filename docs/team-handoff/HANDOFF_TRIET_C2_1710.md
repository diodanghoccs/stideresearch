# Bàn giao cho Triết — C2-TRIET-001, 22/10 ~17:10 (UTC+7)

Trí nhờ Triết làm tiếp phần kiểm thử. Đọc theo thứ tự: file này → [`C2-TRIET-001.md`](C2-TRIET-001.md) (Dev handoff) → `checks/RUNBOOK.md` → `checks/test-matrix.md` → `checks/verification/C2-TRIET-001-initial.md`.

## 1. Đã xong (trợ lý của Trí chạy trên máy Trí, chưa phải lượt độc lập của Triết)

| Việc | Kết quả | Ở đâu |
|---|---|---|
| Fixtures A/B/S synthetic | Xong. `rec-A`/`A_ONLY_LANTERN_24` (24/18/75%), `rec-B`/`B_ONLY_COBALT_9` (9/4), `S.expected` | `fixtures/` |
| `fixture-contract` (F01, F02) | PASS 4/4 trên `aa9fe00`, `d96017c`, `911ee63`; ca âm FAIL đúng | `checks/verification/logs/` |
| `check:storage` | PASS 8/8 | như trên |
| `integration-gate` (I02, P01a, P02a) | `911ee63`: **9/9 route bảo vệ trả 401** (không token / bearer bịa / JWT `alg:none` giả đủ role) | `logs/R2_integration-gate_911ee63.txt` |
| Rà claim E01 | FAIL 5 điểm C1–C5; README @911ee63 **vẫn chưa sửa** | báo cáo §4 |
| Ma trận 15 case | Đã điền trạng thái thật | `checks/test-matrix.md` |

**Chưa có bằng chứng ORK allow/deny nào.** Không ghi S2_VERIFIED.

## 2. Việc Triết làm tiếp (theo thứ tự)

1. **Lượt độc lập (~5 phút, trên máy Triết):**
   ```powershell
   git clone https://github.com/diodanghoccs/stideresearch.git; cd stideresearch   # hoặc git pull nếu đã có
   git rev-parse --short HEAD      # ghi lại commit
   npm ci; npm run typecheck; npm run build
   node checks/fixture-contract.check.mjs
   npm run check:storage
   ```
   - Ghi kết quả vào `checks/verification/` dưới tên mới, ví dụ `C2-TRIET-001-independent.md`. Không sửa log của lượt trước.
   - Trên máy Triết không có `data/tidecloak.json`, nên `integration-gate` sẽ chỉ ra 503 (fail-closed). Kết quả 401 chỉ tái hiện được trên máy Trí.
2. **Case runtime Tide** (I01, A01, B01, B02, S02–S04, P01b, P02b): **chỉ chạy được trên máy Trí**.
   - Lý do: realm chạy ở `localhost:8080`, và client chỉ cho phép origin `http://localhost:3000`. Không dùng tunnel/public, không tắt TLS.
   - Triết ngồi máy Trí, hoặc hướng dẫn Trí chạy và Triết chứng kiến, ghi kết quả.
   - Điều kiện: AI-reader, Minh, Y có tài khoản Tide (mỗi người một profile trình duyệt), Lan cấp `_tide_decryptor`, ký P1–P5.
   - Ghi theo mẫu trong `test-matrix.md`.
   - Quy tắc chấm: chỉ tính deny khi có **cause của contract** (`subjectId does not match`, `Tags do not contain`…) **và** record đối chứng vẫn mở được. `THRESHOLD_FAILURE` trơn, 401, 403 hay 503 đều không phải ORK deny.
3. **S01** (AI thật): BLOCKED cho tới khi Tuấn cấu hình `INFERENCE_PROVIDER/MODEL/API_KEY` phía server. Khi chạy, dùng `text` của `fixtures/A.synthetic.json`, không dùng fixture riêng của Tuấn (L4).
4. **E01 trước khi quay video:** đưa C1–C5 cho Triệu.
   - C1: README/overview nói "ORK checks every decrypt" như sự thật đã chạy.
   - C2: chưa nói plaintext A đi qua app server khi summarize.
   - C3: "from A only".
   - C4: bảng status 15:20 đã cũ.
   - C5: README "Checks" trỏ tới `check:smoke` (base-smoke). Bài này FAIL đúng thiết kế trên bản tích hợp; nên trỏ tới `integration-gate`.
   - Nếu Triệu chọn Plan C (mô phỏng, xem `HANDOFF_TRI_C2_1655.md` §4): kiểm mọi kết quả mô phỏng có nhãn `SIMULATED`, và video/README không gọi đó là ORK thật.
5. **Bàn giao cuối (E02):** viết `checks/verification/C2-TRIET-001-final.md`: commit đã kiểm, giờ, kết quả từng case, lỗi mở, lý do NOT_RUN/BLOCKED. Gửi B. Không tự đánh PASS review.

## 3. Lỗi mở đã giao người

| # | Nội dung | Owner |
|---|---|---|
| L1 | `npm ci` ghi đè `public/silent-check-sso.html`, làm working tree bẩn | Triệu |
| L2 / C5 | README "Checks" → base-smoke | Triệu |
| L3 / C3 | `/api/summarize` không chứng minh text đến từ A đã giải mã | Tuấn + Triệu |
| L4 | evidence inference dùng fixture khác, `NOT_RUN` | Tuấn |
| L5 | đọc record/policy không đòi role, bảo vệ dựa vào ORK | B ghi nhận |
| C1, C2, C4 | claim README/overview/demo-script | Triệu |

## 4. Lưu ý

- Các commit `cbe06e7` (checks) và `911ee63` (merge) đứng tên `minhtridaoo` vì chạy trên máy Trí.
- Không đưa token, cookie, invite link, mật khẩu, `data/tidecloak.json` vào bằng chứng hay video.
