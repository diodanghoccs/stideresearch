# RUNBOOK — checks của Triết (C2-TRIET-001)

Chạy từ gốc repo (nơi có `package.json`). Node ≥ 22.18. PowerShell: đặt biến bằng `$env:BASE_URL = "..."`; bash: `BASE_URL=... node ...`.

| Bước | Lệnh | Cần server? | Dùng khi |
|---|---|---|---|
| 1 | `node checks/fixture-contract.check.mjs` | Không | Luôn chạy (F01, F02). Quét build khác: `SRC_DIR=<path>/src` |
| 2 | `npm run check:storage` | Không | Luôn chạy. Chỉ kiểm **shape** envelope, không chứng minh mã hóa thật |
| 3 | `npm ci && npm run typecheck && npm run build` | — | Trước khi start |
| 4 | `npm run start -- -p 3210` (để mở) | — | — |
| 5 | `BASE_URL=http://localhost:3210 node checks/integration-gate.check.mjs` | Có | I02, P01a, P02a. Đúng cho cả base lẫn bản tích hợp |
| 6 | `BASE_URL=http://localhost:3210 node checks/base-smoke.mjs` | Có | **Chỉ cho base.** Trên bản đã nối Tide/AI, bài này FAIL là đúng; không sửa code để nó xanh lại |

Bản tích hợp cần `data/tidecloak.json` (adapter realm, gitignored) thì Tide mới `ready`. Thiếu file này thì mọi route trả 503, không có giá trị kiểm quyền.

## Đọc mã trả về

| Mã | Nghĩa | Có phải bằng chứng ORK? |
|---|---|---|
| 401 | Verifier từ chối token/DPoP | Không: chỉ là kiểm danh tính API |
| 403 | API từ chối vì thiếu role | Không: chỉ là kiểm quyền API |
| 503 | Module chưa sẵn sàng (fail-closed) | Không |
| 404/405 | Route không có | Không. Ghi NOT_RUN |
| ORK `denied` + `cause` trong trình duyệt, khi cùng phiên vẫn mở được record đối chứng | Quyết định giải mã của Tide | **Có** |

## Lượt runtime (khi Trí báo 4 tài khoản + policy đã sẵn sàng)

1. Mỗi vai mở app bằng **một profile trình duyệt riêng**, trên đúng origin mà realm client cho phép. Trên máy Trí origin đó là `http://localhost:3000`.
2. I01: ghi `sub` rút gọn của từng vai. 4 giá trị phải khác nhau. Đăng xuất rồi đổi vai, kiểm lại.
3. Lan: Encrypt & store `rec-A`, `rec-B` bằng trường `text` của `fixtures/A|B.synthetic.json`.
4. Thứ tự chạy: A01 → B01 → B02 → S01 → S02 → S03 → S04. Ghi theo mẫu trong `test-matrix.md`.
5. Sau mỗi lần sửa code, chạy lại trên **commit mới**, ghi giờ mới. Không dùng lại ảnh cũ.
