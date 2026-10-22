# BASE_HANDOFF — STideResearch C2 (task C2-BASE-001)

Bàn giao base cho Trí / Tuấn / Triệu / Triết. Viết lúc 22/10/2026, giờ Việt Nam (UTC+7). **Trạng thái: chờ Planner B review**; chưa phải BASE_READY cho đến khi B xác nhận.

## 1. Runtime, package, template, cách chạy

| Mục | Giá trị | Nguồn |
|---|---|---|
| Node / npm trên máy dev | v24.12.0 / 11.6.2 | `node -v`, `npm -v` |
| Package manager | npm, một lockfile `package-lock.json` (lockfileVersion 3) | — |
| Next.js | 16.4.2 (App Router, TypeScript) | `npm view next version` lúc 14:01 |
| React / React DOM | 19.3.1 | `npm view react version` |
| Tide SDK | `@tidecloak/nextjs` 0.14.40 (đã cài, **chưa dùng trong code**) | `npm view @tidecloak/nextjs version` (dist-tag latest) |
| TypeScript | 5.9.3 (chọn nhánh 5.x vì `latest` là 7.0.2, chưa kiểm với Next 16) | `npm i -E -D typescript@5` |
| @types/node / react / react-dom | 24.19.2 / 19.3.0 / 19.3.0 | npm |

**Template:** theo playbook chính thức `add-auth-nextjs-fresh` đọc từ Tide MCP công khai `https://mcp.tide.org/mcp` (tool `tide_playbook`, chỉ đọc) lúc 14:00. Playbook khuyên dựng bằng `npm install next react react-dom typescript @types/react @types/node` thay vì `create-next-app`, pin `@tidecloak/nextjs` theo `npm view`, và dùng `--webpack` cho Next 16. Không có commit template riêng (không clone repo template nào).

> Playbook ghi: **phiên bản SDK phải khớp phiên bản server TideCloak**. Trí cần kiểm lại khi có realm; nếu khác, đổi phiên bản qua Triệu (người giữ lockfile).

Lệnh (từ `web/stideresearch/`): `npm ci` → `npm run typecheck` → `npm run build` → `npm run start -- -p 3210`. Dev: `npm run dev`.

## 2. Cây file, exports, ports, endpoint

```text
web/stideresearch/
  package.json, package-lock.json, tsconfig.json, next.config.ts
  .env.example, .gitignore, README.md
  docs/BASE_HANDOFF.md
  src/
    contracts/index.ts        # kiểu và port dùng chung
    tide/server.ts            # TideRequestVerifier (unconfigured) + getTideVerifier()
    tide/session.ts           # TideSessionPort (unconfigured)
    inference/index.ts        # InferencePort (not-implemented) + getInference()
    storage/memory-store.ts   # InMemoryEncryptedRecordStore + validateEncryptedRecord()
    storage/index.ts          # getStorage() singleton phía server
    app/layout.tsx, page.tsx, globals.css
    app/status-panel.tsx      # client: gọi /api/health, nút gọi /api/summarize
    app/api/health/route.ts
    app/api/summarize/route.ts
  checks/storage-boundary.check.mts
  checks/base-smoke.mjs
  fixtures/README.md
```

`scripts/tide/` chưa tạo (không nằm trong scope file của task base; Trí tạo khi cần).

### Kiểu chính (`src/contracts/index.ts`)

| Kiểu | Nội dung |
|---|---|
| `ModuleReadiness` | `module`, `state: ready / not-configured / not-implemented / error`, `implementation`, `detail` (không chứa bí mật), `persistent?` |
| `SessionIdentity` | `not-configured {reason}` / `unauthenticated` / `authenticated {principalId, displayName?, demoAlias?, verifiedBy:"tide"}`. `demoAlias` (lan/ai-reader/minh/y) chỉ là metadata, không làm identity thành đã xác minh |
| `EncryptedRecord` | `recordId, assignmentId, ciphertext (opaque), policyRef (opaque), version, createdAt`. Không có plaintext/private key |
| `DraftBrief` | `sourceRecordId, text, model, provider, runId, createdAt`. Plaintext: không lưu thành EncryptedRecord trước khi Lan encrypt |
| `OperationResult<T>` | `allowed {value}` / `denied {operation, cause}` (chỉ khi có quyết định kiểm quyền thật) / `error {code}` / `not-ready {module, code:"INTEGRATION_NOT_READY"}` |
| `OperationErrorCode` | `INTEGRATION_NOT_READY, UNAUTHENTICATED, FORBIDDEN, INVALID_INPUT, NOT_FOUND, UPSTREAM_ERROR, INTERNAL_ERROR` |
| `HealthResponse`, `ApiErrorBody` | shape HTTP của health và lỗi API |

### Ports

| Port | Hàm | Base trả gì |
|---|---|---|
| `TideSessionPort` (`src/tide/session.ts`) | `readiness()`, `getSession()`, `encrypt({assignmentId, plaintext})`, `decrypt({record})` | `not-implemented`; session `not-configured`; encrypt/decrypt `not-ready`, **không echo input** |
| `TideRequestVerifier` (`src/tide/server.ts`) | `readiness()`, `verify(request)`, `authorize(session, operation)` | `not-implemented`; `verify` không đọc header, trả `not-configured`; `authorize` trả `not-ready` |
| `InferencePort` (`src/inference/index.ts`) | `readiness()`, `summarize({sourceRecordId, text, runId}) → OperationResult<DraftBrief>` | `not-configured` nếu thiếu `INFERENCE_PROVIDER`, `not-implemented` nếu có; summarize luôn `not-ready`, không trả summary mẫu |
| `StoragePort` (`src/storage/memory-store.ts`) | `readiness()`, `put(unknown)`, `get(id)`, `list(assignmentId?)` | in-memory, `persistent:false`; `put` chỉ nhận đúng 6 field envelope, từ chối field lạ (`plaintext`, `text`, `content`, `privateKey`…), ciphertext rỗng, version sai |

### Endpoint (đo thật lúc 14:10 trên `next start -p 3210`)

| Route | Kết quả thực tế |
|---|---|
| `GET /` | 200, trang STideResearch + quy trình A→draft→S + bảng trạng thái |
| `GET /api/health` | 200 `{status:"live", modules:{tide:not-implemented, inference:not-configured, storage:ready (in-memory-dev, persistent:false)}}`, không có giá trị env |
| `POST /api/summarize` | 503 `{code:"INTEGRATION_NOT_READY", module:"tide"}`; có Bearer bịa vẫn 503 |
| `GET /api/summarize` | 405 |
| `POST /api/records`, `/api/storage`, `/api/record` | 404 (không có route ghi công khai) |

Thứ tự trong summarize cố định, fail closed: Tide ready → `verify` (thiếu/sai → 401) → `authorize` (denied → 403, not-ready → 503) → inference ready → đọc body (sai → 400) → gọi provider. Body không bao giờ được log.

## 3. Cấu hình

Xem `.env.example`. Mọi biến chỉ dùng phía server.

| Biến | Base có đọc? | Ghi chú |
|---|---|---|
| `INFERENCE_PROVIDER` | Có, chỉ kiểm có/không để báo readiness | Tuấn quyết định giá trị |
| `INFERENCE_MODEL`, `INFERENCE_API_KEY` | Không | Tên đề xuất cho Tuấn |
| `TIDECLOAK_ADAPTER_PATH` | Không | Theo playbook, provider phía trình duyệt nhận thẳng `data/tidecloak.json` (export từ TideCloak admin, gitignored). Cấu hình verify JWT/DPoP phía server do Trí định nghĩa |

## 4. Đã chạy / chưa nối

- **Đã chạy thật:** install, typecheck, build, start, health, summarize fail-closed, check storage, UI loading/loaded/error/not-ready, màn hình 375px không cuộn ngang.
- **Chưa nối:** Tide (login, verify token, encrypt/decrypt, allow/deny ORK), inference thật, storage bền vững, fixture A/B.
- **Trí cần:** realm TideCloak + client, export `data/tidecloak.json`, phiên bản server để khớp SDK, cấu hình DPoP rewrites/CSP trong `next.config.ts` theo playbook.
- **Tuấn cần:** provider/model và key (server-only), adapter thật trong `src/inference/`, giữ thứ tự auth trong summarize.

## 5. Owner map sau base

| Người | Sở hữu |
|---|---|
| Trí | `src/tide/`, `scripts/tide/`, setup Tide, phần Tide trong `next.config.ts` |
| Tuấn | `src/inference/`, `src/app/api/summarize/route.ts` |
| Triệu | scaffold, `src/contracts/`, `src/storage/`, UI `src/app/` và các route khác, `package.json` + `package-lock.json` |
| Triết | `checks/`, `fixtures/` |

## 6. TODO đầu tiên và invariant

- **Trí:** thay `unconfiguredTideVerifier` bằng verifier thật (playbook `verify-jwt-server-side`, `protect-api-nextjs`); bọc `TideCloakProvider` trong `layout.tsx` (nhờ Triệu nếu đụng UI); hiện thực `TideSessionPort` bằng `useTideCloak`; ghi T0 khi bắt đầu.
- **Tuấn:** adapter inference thật trả `DraftBrief`; giữ không gọi provider trước khi auth; xử lý lỗi upstream → `UPSTREAM_ERROR`.
- **Triệu:** route bảo vệ đọc/ghi EncryptedRecord (sau `verify` + `authorize`), luồng UI AI→Lan→Minh, storage bền vững nếu cần, README/video.
- **Triết:** fixture A/B synthetic (không import vào client), ma trận allow/deny, mở rộng `checks/`.

**Invariant:** không đổi `src/contracts/` hoặc lockfile ngầm. Từ sau bàn giao **Triệu quản lý manifest/lock/contracts**; ai cần đổi thì báo người phụ thuộc. Không thêm route bỏ kiểm quyền, không tạo token giả, không đặt tên `real`/`secure` cho stub, không đưa plaintext vào EncryptedRecord.

## 7. Thời gian, bằng chứng, lỗi đã biết

- **Tbase:** 13:59:48. Checkpoint phút 10 (~14:10): scaffold + typecheck + build xong, không blocker. Kết thúc bàn giao: xem Dev handoff trong task.
- **T0 Tide:** không có (không setup/login/probe Tide; chỉ đọc playbook công khai).
- **Bằng chứng:** `C:\Users\diosodumb\Documents\ChatGPT\RMIT\c2\base\` (log typecheck/check, ảnh trang sau khi gọi summarize).
- **Commit:** chưa commit (không được giao quyền). Toàn bộ là file mới, chưa track, dưới `web/stideresearch/`.
- **Lỗi/cảnh báo đã biết:**
  - `next build` cảnh báo bỏ qua một `package-lock.json` lạ ở `C:\Users\diosodumb` (ngoài repo, trên máy dev này). Vô hại; không có trên máy khác.
  - `npm ls` báo `@emnapi/runtime`, `@img/sharp-wasm32` extraneous (dependency tùy chọn của sharp). Vẫn thấy sau `npm ci` sạch từ lockfile trong thư mục tạm (exit 0, 36 package), nên là đặc điểm của npm, không phải lockfile lệch.
  - Gọi `process.exit()` khi còn socket fetch làm Node trên Windows crash (libuv assert); `base-smoke.mjs` đã dùng `process.exitCode`.
  - Storage không thể kiểm ciphertext có phải mã hóa thật; chỉ kiểm shape.
