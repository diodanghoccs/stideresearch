# C2-TRIET-001 — Báo cáo kiểm thử ban đầu

- **Thời gian:** 22/10/2026 16:47–16:49 (UTC+7).
- **Người chạy:** trợ lý Claude theo yêu cầu của Trí, trên máy Trí (Windows 11, Node v24.15.0). Đây **không phải lượt chạy độc lập của Triết**: Triết cần chạy lại theo `checks/RUNBOOK.md` và xác nhận trước khi gửi B.
- **Bản kiểm:**
  - `main@aa9fe00` (base);
  - `c2/trieu-app@d96017c` (bản tích hợp: Tide verifier + records/policies + inference của Tuấn).
  - Nhánh chứa checks: `c2/triet-001-fixtures-checks`, tách từ `aa9fe00`.
- **Tide:** realm `stideresearch` trên `tideorg/tidecloak-dev:latest` (Keycloak 26.7.5), adapter có `jwk`. Chỉ admin/Lan đã link tài khoản. Xem C2-TRI-001.
- **AI:** `inference=not-configured` (provider `openai-responses`, chưa có model/key trên máy này).

## 1. Đã chạy

| Lệnh | Bản | Kết quả | Log |
|---|---|---|---|
| `fixture-contract.check.mjs` | aa9fe00 | 4 PASS / 0 FAIL / 0 NOT_RUN | `logs/B2_fixture-contract_main.txt` |
| `fixture-contract.check.mjs` (`SRC_DIR` = src của d96017c) | d96017c | 4 PASS / 0 FAIL | `logs/B2_fixture-contract_trieu-app.txt` |
| ca âm: src giả import `B.synthetic.json` + marker B | — | FAIL đúng, exit 1 | (chạy tay, không lưu) |
| `npm run check:storage` | cả 2 | 8 PASS | `logs/B3_storage_*.txt` |
| `typecheck` + `build` | cả 2 | exit 0 | `logs/C1_build_*.txt` |
| `base-smoke.mjs` | aa9fe00 | 6 PASS | `logs/C4_base-smoke_main.txt` |
| `base-smoke.mjs` | d96017c | 3 FAIL. **Đúng thiết kế:** bài này đòi Tide chưa ready | `logs/C4_base-smoke_trieu-app.txt` |
| `integration-gate.check.mjs` | aa9fe00 | 4 PASS (503 fail-closed), 6 NOT_RUN (route 404) | `logs/C4_integration-gate_main.txt` |
| `integration-gate.check.mjs` | d96017c | **10 PASS, 9/9 route bảo vệ trả 401** (không token, bearer bịa, JWT `alg:none` giả đủ role) | `logs/C4_integration-gate_trieu-app.txt` |

## 2. Kết quả theo tiêu chí

| AC | Trạng thái | Ghi chú |
|---|---|---|
| TRIET-01 fixture/ma trận | **PASS** | `fixtures/*.synthetic.json`, `checks/test-matrix.md` (15 case) |
| TRIET-02 identity | BLOCKED | Mới có 1/4 tài khoản Tide |
| TRIET-03 AI-reader A/B | BLOCKED | Cần I01 + policy + record mã hóa |
| TRIET-04 Lan/Minh/Y | BLOCKED | Cần S01–S02 |
| TRIET-05 AI/API/storage | Một phần | API không danh tính/JWT giả → 401 (PASS). AI thật, sai role với phiên thật, dữ liệu kho runtime: BLOCKED |
| TRIET-06 claim | FAIL (5 điểm, §4) | Video chưa có |
| TRIET-07 handoff | Bản ban đầu | Bản cuối sau lượt runtime |

**Không có case nào chứng minh ORK allow/deny.** Không được ghi S2_VERIFIED từ báo cáo này.

## 3. Lỗi / quan sát cần người phụ trách xử lý

| # | Mức | Hiện tượng | Tái hiện | Owner |
|---|---|---|---|---|
| L1 | Thấp | Sau `npm ci`, `public/silent-check-sso.html` ở d96017c bị thay bằng bản 1 dòng của SDK, nên git báo file đã sửa | `git worktree add … origin/c2/trieu-app && npm ci && git status` | Triệu |
| L2 | Trung bình | README mục "Checks" chỉ đến `check:smoke` (base-smoke). Bài này FAIL trên bản tích hợp đúng thiết kế, dễ khiến người chấm hiểu nhầm | Chạy lệnh README trên d96017c có adapter | Triệu (thêm script `check:gate` → `integration-gate.check.mjs`; package.json thuộc Triệu) |
| L3 | Trung bình | `/api/summarize` chỉ kiểm nhãn `sourceRecordId === "A"`; `text` là bất kỳ chuỗi nào caller gửi. Server không chứng minh được text đến từ A đã giải mã (input.ts tự ghi nhận) | Phiên có `_tide_decryptor` gửi text tùy ý với `sourceRecordId:"A"` | Tuấn + Triệu (nói rõ trong README/video) |
| L4 | Thấp | Evidence `src/inference/evidence/live-smoke.json` dùng fixture `synthetic-water-study-A-v1`, không phải `fixtures/A.synthetic.json`, và có `status: NOT_RUN` | đọc file | Tuấn (S01 nên dùng `A.synthetic.json`) |
| L5 | Thông tin | `read-record`/`read-policy` không đòi role: mọi người đã đăng nhập đều đọc được ciphertext và policy của mọi record. Đây là thiết kế có chủ ý (README Limits đã nêu phần policy), bảo vệ dựa hoàn toàn vào ORK | `src/tide/server.ts` `REQUIRED_ROLE` | B ghi nhận |

## 4. Rà claim (E01) — README.md, report/overview.md, report/demo-script.md @ d96017c

| # | Vị trí | Câu | Vấn đề | Đề xuất |
|---|---|---|---|---|
| C1 | README + overview "Why TideCloak matters" | "Tide's ORK network checks the caller on every encrypt and decrypt, so the app server never holds a key…" | Viết như sự thật đã chạy, trong khi bảng status ghi ORK allow/deny "Not verified yet" | Giữ ở dạng thiết kế ("is designed so that…") cho tới khi A01/B01/S03/S04 PASS |
| C2 | README "Trust constraint insight", sơ đồ "Next.js server (no Tide keys)" | "the server stores only ciphertext" | Đúng với kho, nhưng plaintext A **đi qua app server** ở `/api/summarize` trước khi tới provider. Limits chỉ nói provider thấy | Thêm vào Limits: "decrypted A passes through the app server to the model provider" |
| C3 | demo-script 45–75 s | "A real model drafts the brief from A only" | Server không chứng minh nguồn gốc text (L3); S01 chưa chạy | "…from the text the AI-reader decrypted" + chỉ nói "real model" khi S01 PASS |
| C4 | README "Prototype status" (15:20) | Dòng route 401 | Nay **đã quan sát được** (integration-gate 9/9 401 lúc 16:48 @ d96017c). Có thể ghi verified kèm commit | Cập nhật giờ + commit |
| C5 | README "Checks" | `npm run check:smoke` | Xem L2 | Thêm `integration-gate` |

Video: chưa có, nên chưa rà.

## 5. Case chưa chạy và lý do

I01, A01, B01, B02, S02, S03, S04, P01b, P02b: thiếu 3 tài khoản Tide, policy P1–P5 và record mã hóa (Trí). S01: thiếu model/key (Tuấn). E02 bản cuối: chờ lượt runtime.
