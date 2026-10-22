# Bàn giao Tide C2 của Trí, 22/10 16:55 (UTC+7)

Trả lời [checklist B v2](C2_TRI_Complete_Checklist_B_v2_2026-10-22.md). Không mở thử nghiệm mới sau 16:40: mọi kết quả dưới đây là cái đã có, hoặc đọc từ log/code. **Task giữ IN_PROGRESS**; B quyết định IN_REVIEW/DONE.

## 1. Code: đã đối chiếu và ghép

- Nhánh tích hợp `c2/trieu-app@d96017c` **đã chứa đủ** phần Trí làm lúc 16:12: `next.config.ts` (alias, CSP, rewrite DPoP), `providers.tsx` (DPoP strict ES256), `auth/redirect`, `public/tide_dpop_auth.html`, `public/silent-check-sso.html`. Diff với bản trên máy Trí (`Challenge 2/stideresearch`, chưa commit) **chỉ khác comment**. Vì vậy chỉ còn một implementation, không cần ghép bản của Trí.
- Trên nhánh đó đã có thêm: `src/tide/server.ts` (verifier JWT + DPoP), `verify-dpop.ts`, `session-bridge.tsx` (`TideSessionPort` thật), `relationship.ts` (từ Tide pack), `api/_lib/guard.ts`. Dev của Triệu viết, Trí đã đọc lại.
- **Commit mới của Trí:** `cb8ce55` trên nhánh local `c2/tri-tide-handoff`, tách từ `d96017c`. **Chưa push.**
  - `src/tide/session-bridge.tsx`: trước đây `THRESHOLD_FAILURE` chung bị gán `denied`. Nay chỉ lỗi có cause của contract mới thành `denied`; còn lại là `error/UPSTREAM_ERROR`, có ghi "not concluded as a deny" (checklist §4).
  - `docs/tide-setup.md`: môi trường, lệnh chạy, bản đồ code, bảng trạng thái, giới hạn.
  - `tsc --noEmit` PASS. Chưa chạy `next build`/dev sau thay đổi.
  - File giao: `0001-tri-tide-handoff.patch` và `c2-tri-tide-handoff.bundle` trong thư mục này.
- Không đụng `public/silent-check-sso.html`: file này đang bị `npm ci` sửa trong working tree, là lỗi L1 của Triết, thuộc Triệu.
- Trang chẩn đoán `/tide` chỉ có trên máy Trí, **không đưa vào nhánh**. Login dùng nút ở `/`.

## 2. Môi trường

Chi tiết ở `docs/tide-setup.md`. Tóm tắt:

- Máy: Trí, Windows 11 + WSL2 + Docker 28.4.0.
- Server: `tidecloak-dev` `sha256:3f52d0bc…`, Keycloak 26.7.5.
- Realm `stideresearch`, client `stideresearch-client`; auth `http://localhost:8080/`, ORK `ork1.tideprotocol.com`.
- SDK nextjs 0.14.40 / js 0.14.41. SDK có khớp server không: UNKNOWN.
- Adapter `data/tidecloak.json` giống hệt nhau ở hai bản (`cmp`), đúng realm/client, origin `localhost:3000` và `:8080`.
- ⚠️ **App phải chạy cổng 3000**. README base ghi `-p 3210`: cổng đó không có trong origin của adapter. Triệu sửa README.
- MCP: playbook `add-auth-nextjs-fresh` / `verify-jwt-server-side`, đọc từ `https://mcp.tide.org/mcp`, và pack `raziel-mcp@b0e1e49`. Đây là công cụ dev, không phải API inference.

## 3. Bảng trạng thái (đúng chế độ)

| Khả năng | Chế độ | Kết quả | Bằng chứng |
|---|---|---|---|
| Realm, licence, IGA, admin link, multiAdmin | thật | PASS | log container 15:53–16:04 |
| CR `GRANT_ROLES tide-realm-admin` → Lan | thật | PASS. CR `c7bf608d…`, bypass firstAdmin, ký VVK 16:04:03; threshold 1 | log |
| Lan có `_tide_encryptor`/`_tide_decryptor` | thật | UNKNOWN | — |
| AI-reader, Minh, Y | — | NOT_RUN: chưa có tài khoản; log chỉ có 1 user (`cb41d3e6…`) | log |
| Lan login vào app client | thật | PARTIAL: TideCloak phát token cho `stideresearch-client` lúc 16:14:31. Phía app không có ảnh/log | log |
| API chặn: thiếu token, Bearer bịa, JWT `alg:none` | thật | PASS 9/9 route trả 401 (Triết, 16:40–16:52) | `checks/verification/C2-TRIET-001-initial.md` |
| API nhận token thật + DPoP; sai DPoP bị chặn; non-admin không ghi được policy | thật | NOT_RUN | — |
| Ký policy, round-trip của owner, Minh/Y, AI-reader A/B | thật | NOT_RUN | — |
| Mô phỏng | — | Chưa làm; chờ Triệu quyết (mục 4) | — |

**Không có bằng chứng ORK allow/deny nào. Không gắn S1/S2_VERIFIED.**

## 4. Đề xuất cho Triệu: Plan C mô phỏng (BTC cho phép, chấm ngang)

**Giữ thật:**
- realm/IGA (log);
- Lan login;
- verifier server (bằng chứng 401);
- code `relationship.ts`, `session-bridge.tsx` (dẫn chứng là code tích hợp thật).

**Mô phỏng:** quyết định ORK cho Minh/Y/AI-reader và ciphertext.
- Một `SimulatedTideSession` theo cùng port `TideSessionPort`, bật bằng biến env rõ ràng (ví dụ `NEXT_PUBLIC_TIDE_MODE=simulated`).
- Mỗi kết quả có nhãn `SIMULATED` trên UI. Deny mô phỏng trả cause giả lập ghi rõ "simulated".

**Không làm:**
- Token giả không đi qua verifier thật. Ở chế độ mô phỏng, API phải dùng verifier mô phỏng riêng, có nhãn.
- Decrypt thật bị lỗi không được âm thầm chuyển thành success.

**Câu nói trong README/video:** "Tide realm/IGA và login là thật; ma trận quyền ORK được trình diễn ở chế độ mô phỏng theo Plan C của BTC". Kèm hai giới hạn: owner kiêm admin với threshold 1, và model nhận plaintext A.

→ **Cần Triệu chốt** (sau freeze 17:00 chỉ sửa lỗi; Plan C là quyết định phạm vi của Triệu): duyệt thì Trí làm adapter, Triệu ghép provider/UI; không duyệt thì giữ fallback trung thực (bảng mục 3).

## 5. Việc còn lại theo người

- **Trí:**
  - push `c2/tri-tide-handoff` hoặc gửi bundle cho Triệu;
  - xác nhận/sửa dòng "Lan login PARTIAL" nếu có ảnh từ phiên 16:14;
  - quay video demo trên máy Trí (máy duy nhất chạy được Tide).
- **Triệu:**
  - merge `cb8ce55`;
  - README: cổng 3000, phần Checks (L2), các claim C1–C5 của Triết;
  - chốt Plan C hay fallback.
- **Triết:**
  - chạy lại `checks/RUNBOOK.md` trên `c2/tri-tide-handoff`;
  - các case I01, A01, B01–B02, S02–S04 giữ BLOCKED, thiếu tài khoản.
- **Tuấn:** không có phụ thuộc mới từ Tide; mapping `rec-A` ↔ `sourceRecordId: "A"` giữ nguyên.
