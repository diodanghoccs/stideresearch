# C2-TRIET-001 — Ma trận kiểm thử (owner: Triết)

Trạng thái: **PASS** (chạy thật, có bằng chứng, đúng kỳ vọng) · **FAIL** · **BLOCKED** (thiếu phụ thuộc) · **NOT_RUN**.
Giờ Việt Nam (UTC+7). Log trong `checks/verification/logs/`. Không lưu token, cookie, invite link, mật khẩu hay `data/tidecloak.json` vào bằng chứng.

**Lượt chạy hiện tại:** 22/10/2026 16:47–16:49.
- Người chạy: trợ lý của Trí, chạy trên máy Trí. **Triết cần tự chạy lại để giữ tính độc lập.**
- Hai bản được kiểm:
  - `main@aa9fe00` (base);
  - `c2/trieu-app@d96017c` (bản tích hợp, có adapter realm `stideresearch` trên máy Trí).
- Node v24.15.0.

| # | Case | Vai / thao tác | Kỳ vọng | Kết quả thật | Trạng thái | Bằng chứng | Owner nếu lỗi |
|---|---|---|---|---|---|---|---|
| 1 | F01 | `node checks/fixture-contract.check.mjs` | A/B tách biệt, marker riêng, số liệu đúng; S có 24/18/75%, không có dấu vết B | 4 passed, 0 failed trên cả 2 bản. Ca âm (src giả import B) → FAIL, exit 1 | **PASS** | `B2_fixture-contract_*.txt` | Triết |
| 2 | F02 | Quét `src/` không import fixture/marker | Không có hit | 0 hit ở `aa9fe00` và `d96017c` | **PASS** | như trên | Triệu/Tuấn nếu có hit |
| 3 | I02 | `integration-gate.check.mjs`: gọi API không danh tính / bearer bịa / JWT `alg:none` giả đủ role | Tide ready → 401; chưa ready → 503; không bao giờ 2xx, không trả dữ liệu | `d96017c`: tide=ready, **9/9 trả 401**, không lộ marker. `aa9fe00`: 503 fail-closed, routes records/policies 404 (NOT_RUN) | **PASS** (`d96017c`) | `C4_integration-gate_*.txt` | Trí (verifier) |
| 4 | I01 | Lan, AI-reader, Minh, Y đăng nhập, mỗi người 1 profile | 4 `sub` khác nhau do Tide cấp; đổi phiên không thừa hưởng quyền | Chỉ Lan/admin đã link tài khoản Tide (C2-TRI-001). 3 vai còn lại chưa có tài khoản | **BLOCKED** | — | Trí |
| 5 | A01 | AI-reader decrypt `rec-A` với policy A→AI-reader | ORK allow, nội dung = A (24/18/75%) | Cần I01 + policy P3 + A đã mã hóa | **BLOCKED** | — | Trí |
| 6 | B01 | AI-reader decrypt `rec-B` (policy B→Lan) | ORK deny có `cause` (vd. `subjectId does not match`), không lộ B | Cần A01 | **BLOCKED** | — | Trí |
| 7 | B02 | Mở lại A ngay sau B01, cùng phiên/mạng | A vẫn allow | Cần B01 | **BLOCKED** | — | Trí |
| 8 | S01 | AI-reader gửi text A đã giải mã → `/api/summarize` | Model thật, `runId`, `sourceRecordId`=A, bản nháp có 24/18/75%, không có B | Máy này `inference=not-configured` (provider `openai-responses`, thiếu model/key). Evidence của Tuấn `live-smoke.json` cũng `NOT_RUN` và dùng fixture khác | **BLOCKED** | `C4_integration-gate_trieu-app.txt` (dòng health) | Tuấn |
| 9 | S02 | Lan duyệt, encrypt thành `rec-S` cho Minh | Kho chỉ có envelope 6 trường; S là ciphertext thật | Cần S01 + policy P4/P5 | **BLOCKED** | — | Triệu/Trí |
| 10 | S03 | Minh decrypt `rec-S` | ORK allow, khớp nội dung Lan duyệt | Cần S02 | **BLOCKED** | — | Trí |
| 11 | S04 | Y decrypt **cùng** `rec-S` + policy của Minh | ORK deny có `cause` (không phải 401/403 của API) | Cần S03 | **BLOCKED** | — | Trí |
| 12a | P01a | `PUT /api/records/:id` không danh tính / JWT giả có `_tide_encryptor` | 401, không ghi vào kho | `d96017c`: 401 cả 2 | **PASS** | `C4_integration-gate_trieu-app.txt` | Triệu |
| 12b | P01b | `PUT` bằng phiên Tide **thật** không có `_tide_encryptor` (vd. Minh) | 403 `Requires role _tide_encryptor` | Cần I01 | **BLOCKED** | — | Triệu |
| 13a | P02a | `GET /api/records/:id`, `GET /api/policies` không danh tính / JWT giả | 401 | `d96017c`: 401 | **PASS** | như trên | Triệu |
| 13b | P02b | `GET` bằng phiên thật của Y | Theo thiết kế: Y **được** lấy ciphertext + policy (để S04 chứng minh ORK deny). Không lộ plaintext | Cần I01. Lưu ý: `read-record`/`read-policy` không yêu cầu role — bảo vệ dựa hoàn toàn vào ORK | **BLOCKED** | — | Triệu |
| 14 | E01 | Rà claim README / `report/*.md` / video | Claim ≤ bằng chứng; nói rõ giới hạn | Đã rà `d96017c`: 5 điểm cần sửa (xem `verification/C2-TRIET-001-initial.md` §4). Video chưa quay | **FAIL** (5 điểm) | báo cáo §4 | Triệu |
| 15 | E02 | Báo cáo + bàn giao | Đủ commit, giờ, kết quả, lỗi mở | Bản ban đầu đã có; bản cuối cần sau lượt runtime | **NOT_RUN** (bản cuối) | `verification/` | Triết |

## Mẫu ghi một case runtime

```text
Case: B01
Time: <giờ VN thật>
App commit: <mã commit>
Principal: <sub rút gọn, vd. 3f2a…>
Alias: ai-reader
Record: rec-B
Operation: decrypt
Expected: ORK denied, có cause. A vẫn mở được trong cùng phiên, cùng mạng.
Actual: <nguyên văn, vd. TIDE-TIDEJS-NET-THRESHOLD_FAILURE ... got 0 of N + cause từng ORK>
Positive control: <kết quả mở lại A>
Status: PASS / FAIL / BLOCKED / NOT_RUN
Evidence: <đường dẫn ảnh/log đã lược bí mật>
Owner: Trí nếu lỗi Tide/ORK
```

Lưu ý: `THRESHOLD_FAILURE ... got 0 of N` là **lời từ chối**, không phải mất mạng. Phải đọc `cause`. Một lỗi VVK chung chung, hay 401/403/503 trả trước bước decrypt, **không** được tính là ORK deny.
