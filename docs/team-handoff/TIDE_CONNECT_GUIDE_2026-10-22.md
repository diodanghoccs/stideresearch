# Hướng dẫn nối Tide cho STideResearch (S2) — từ máy trống đến A allow/B deny, Minh allow/Y deny

**Viết:** 22/10/2026 ~14:30 (UTC+7), dev hỗ trợ Triệu. **Trạng thái:** hướng dẫn, **CHƯA CHẠY bước nào**, chưa có T0.
**Nguồn chính thức (đọc lúc 14:00–14:27):**

- Tide Agent Pack MCP `https://mcp.tide.org/mcp` (chỉ đọc): playbook `start-tidecloak-dev`, `bootstrap-realm-from-template`, `initialize-admin-and-link-account`, `configure-e2ee-roles-and-policies`, `add-auth-nextjs-fresh`, `verify-jwt-server-side`, `protect-api-nextjs`, `provision-tidecloak-skycloak`.
- Repo pack `https://github.com/tide-foundation/raziel-mcp`: `templates/shared/bootstrap-tidecloak.sh`, `templates/shared/realm.json.template`, `templates/shared/.env.template`, `reference-apps/relationship-attestation/bootstrap-sequence.md`, `templates/relationship-attestation/relationship.ts`.
- Ghi chú workspace `work/tide-relationship-attestation.md`.

Chỗ nào ghi **(giả định)** là suy luận của dev, chưa đo trên máy đội.

---

## 0. Trước khi bắt đầu — 4 việc chỉ người thật quyết được

| # | Việc | Ai | Ghi chú |
|---|---|---|---|
| 0.1 | Chọn **người chạy và máy chạy** | Triệu chốt; theo plan là Trí | Máy cần Docker + bash (Linux/macOS, hoặc Windows có WSL2 + Docker Desktop). **Máy Triệu hiện không có Docker** (kiểm 14:24: `docker: command not found`; có `wsl.exe`) |
| 0.2 | **Email quản lý licence Tide** | chính người chạy | Phải là email thật người đó kiểm soát. Agent không được tự điền hay dùng email mẫu |
| 0.3 | **Đồng ý Điều khoản Tide** `https://tide.org/legal` | chính người chạy | Script dừng (exit 2) nếu thiếu 0.2 hoặc 0.3. Agent không được đồng ý thay |
| 0.4 | Xác nhận mạng ORK có contract `RelationshipAttestation:1` | Trí | Pack ghi: contract có trên ORK `main` từ 16/10/2026; mạng production "ASSUMED" có. Muốn chắc: hỏi Tide (info@tide.org, Discord `https://discord.gg/XBMd9ny2q5`). Nếu ký policy báo "unknown contract" thì dừng, **không** viết custom contract |

**Ghi T0 ngay khi bắt đầu bước 1** (theo khung dự phòng của B: D1 = `min(T0 + 60 phút, 15:00)`; cửa sổ F-B đã đóng lúc 14:15).

---

## 1. Chuẩn bị máy (bỏ qua nếu máy đã có Docker chạy được)

Windows (giả định cách nhanh nhất):

1. Cài Docker Desktop, bật "Use WSL 2 based engine" và WSL integration cho distro Ubuntu. Có thể cần khởi động lại máy.
2. Trong Ubuntu (WSL): `sudo apt update && sudo apt install -y jq lsof curl git`.
3. Kiểm tra: `docker info` chạy được (không lỗi daemon).

Thời gian **ước lượng** 20–40 phút, phụ thuộc mạng và quyền admin máy. Đây là rủi ro lớn nhất về giờ.

Phương án không cần Docker: **Skycloak** (TideCloak hosted). Playbook ghi: cần tài khoản Skycloak, **TideCloak phải được Skycloak bật riêng cho workspace** (mặc định tắt, thiếu thì tạo cluster lỗi 500), trial chỉ 1 cluster. Không khuyến nghị cho hôm nay vì phụ thuộc bên thứ ba bật tính năng.

---

## 2. Lấy pack và đọc script trước khi chạy

```bash
cd ~ && git clone https://github.com/tide-foundation/raziel-mcp tide-pack
less ~/tide-pack/templates/shared/bootstrap-tidecloak.sh   # ĐỌC trước khi chạy (579 dòng)
```

Script làm 10 bước: chạy container `tideorg/tidecloak-dev:latest` cổng 8080 → tạo realm từ `realm.json.template` → `setUpTideRealm` (licence) + bật IGA → duyệt change request → tạo admin + `tide-realm-admin` → **in invite link và chờ người mở trong trình duyệt** → chờ link xong → duyệt CR → đặt CustomAdminUIDomain → xuất adapter JSON.

Realm template của pack đã có sẵn realm role `_tide_encryptor`, `_tide_decryptor` và mapper `groups` (đã kiểm bằng grep file template lúc 14:27).

Lưu ý từ playbook: dùng đúng image `tideorg/tidecloak-dev:latest` (không dùng `-stg`), **không** thêm `start-dev` hay biến ORK/threshold vào `docker run`, không đặt tên realm là `myrealm`.

---

## 3. Chạy TideCloak + tạo realm (bước có invite link)

Chạy trong thư mục WSL riêng (để DB H2 không nằm trên ổ Windows), xuất adapter thẳng vào app **(giả định đường dẫn WSL `/mnt/c/...`)**:

```bash
mkdir -p ~/stide-tide && cd ~/stide-tide
cp ~/tide-pack/templates/shared/.env.template .env     # .env nằm ngoài repo
nano .env      # đặt KC_BOOTSTRAP_ADMIN_PASSWORD (mật khẩu mạnh, KHÔNG commit, KHÔNG dán vào chat)

REALM_NAME=stideresearch \
CLIENT_NAME=stideresearch-client \
CLIENT_APP_URL=http://localhost:3000 \
ADAPTER_OUTPUT=/mnt/c/Users/diosodumb/hackathon/web/stideresearch/data/tidecloak.json \
TIDE_LICENSE_EMAIL='<email người chạy tự nhập>' TIDE_TERMS_ACCEPTED=yes \
bash ~/tide-pack/templates/shared/bootstrap-tidecloak.sh
```

- `CLIENT_APP_URL` phải đúng URL app sẽ chạy (`npm run dev` mặc định cổng 3000).
- Khi script in **invite link**: người chạy (vai **Lan**, cũng là admin/steward) mở link trong trình duyệt và tạo/link tài khoản Tide. Script tự chờ.
- Kết quả: `data/tidecloak.json` trong app (đã nằm trong `.gitignore` của app). Kiểm: file có `jwk`, `vendorId`, `homeOrkUrl`.
- Admin console: `http://localhost:8080` (Tide console), console Keycloak gốc ở `/kc`.

Có thể chạy `~/tide-pack/templates/shared/tide-doctor.sh` để kiểm nhanh (đọc script trước).

Lỗi hay gặp (theo playbook): container thoát ngay → xoá `./data/keycloakdb*`; cổng 8080 bận; adapter thiếu `jwk` → `setUpTideRealm` chưa chạy thành công.

---

## 4. Tạo 4 danh tính và cấp role

Mỗi người dùng phải **đăng nhập một lần** bằng tài khoản Tide của riêng mình thì mới có khoá để đặt vào policy. Dùng **profile trình duyệt riêng** (hoặc trình duyệt khác) cho mỗi vai; các tab cùng profile dùng chung session.

| Vai demo | Tài khoản | Realm role | Ghi chú |
|---|---|---|---|
| Lan (owner + steward) | tài khoản đã link ở bước 3 | `tide-realm-admin`, `_tide_encryptor`, `_tide_decryptor` | Phải công khai trong README/video: Lan kiêm người cấp quyền |
| AI-reader | tài khoản Tide riêng | `_tide_decryptor` | Không `_tide_encryptor`, không admin |
| Minh | tài khoản Tide riêng | `_tide_decryptor` | |
| Y | tài khoản Tide riêng | `_tide_decryptor` | Cấp role để phép từ chối là do **policy/subject**, không phải do thiếu role (đối chứng âm mạnh hơn) |

- **Không** đưa `_tide_encryptor`/`_tide_decryptor` vào default roles (anti-pattern AP-RA04).
- Mỗi lần cấp role là một change request cần admin duyệt; sau khi duyệt người đó phải **đăng nhập lại** (role đọc từ token, trễ tới ~120 giây).
- Tài khoản Tide do từng người tự tạo trong trình duyệt của họ; agent không tạo tài khoản thay.

---

## 5. Ký policy cho từng bản ghi (`RelationshipAttestation:1`)

Ba bản ghi, tag đúng **một** giá trị = record id: `rec-A`, `rec-B`, `rec-S`. Mỗi policy gắn **một subject với một bản ghi**, Lan duyệt trong **enclave** (cửa sổ Tide, chỉ làm trên trình duyệt):

| Policy | Bản ghi | Subject (`User`) | Quyền |
|---|---|---|---|
| P1 | rec-A | Lan | read-write |
| P2 | rec-B | Lan | read-write |
| P3 | rec-A | AI-reader | read |
| P4 | rec-S | Lan | write (hoặc read-write) |
| P5 | rec-S | Minh | read |

**Không có** policy rec-B→AI-reader và rec-S→Y: đó chính là hai phép từ chối cần chứng minh.

- Policy `User` phải dựng bằng `tideuserkey` của **người được cấp**, không phải của admin (AP-RA02).
- Helper chính thức: `templates/relationship-attestation/relationship.ts` (`buildRelationshipPolicy`, `signRelationshipPolicy`, `encryptForRecord`, `decryptForRecord`). Pack ghi đã chạy end-to-end ở revision 2; bản revision 3 hiện tại mới type-check.
- Server chỉ lưu **policy đã ký + ciphertext**, không bao giờ thấy plaintext, không giải mã trên server (AP-RA12).
- Tổng số lần duyệt **ước lượng**: ~5 change request role + 5 lần duyệt enclave cho policy.

---

## 6. Nối vào app `web/stideresearch` (theo owner map của BASE_HANDOFF)

| # | Việc | File | Chủ |
|---|---|---|---|
| 6.1 | Đặt `data/tidecloak.json` (gitignored), kiểm có `jwk` | `data/` | Trí |
| 6.2 | DPoP: `cp node_modules/@tidecloak/js/tide_dpop_auth.html public/`; rewrite `/tide_dpop/:path*` → `/tide_dpop_auth.html` và CSP (rule DPoP đặt **cuối**) trong `next.config.ts`; `public/silent-check-sso.html`; trang xử lý redirect sau đăng nhập — đúng theo playbook `add-auth-nextjs-fresh` bước 4a–6 | `public/`, `next.config.ts` | Trí |
| 6.3 | Khớp phiên bản: app đang có `@tidecloak/nextjs` 0.14.40 nhưng `@tidecloak/js` (phụ thuộc kéo theo) là **0.14.41**. Playbook: SDK phải khớp server TideCloak và file `tide_dpop_auth.html` gắn theo phiên bản. Nếu lỗi `Popup DPoP verification failed to load` → nghi file này trước. Đổi phiên bản thì nhờ Triệu sửa lockfile | `package.json`, lock | Trí → Triệu |
| 6.4 | Bọc `TideCloakProvider config={tcConfig}` trong `src/app/layout.tsx` | layout | Trí (báo Triệu vì đụng UI) |
| 6.5 | Thay `unconfiguredTideVerifier` bằng verifier thật. Helper `verifyTideCloakToken` (export từ `@tidecloak/nextjs/server`, đã kiểm có trong bản cài) **không** tự kiểm lại DPoP và không tách 401/403; contract base yêu cầu tách 401/403 → làm theo phần "Complete Implementation" của `verify-jwt-server-side` (jose + DPoP), assert `tcConfig.jwk` lúc khởi động | `src/tide/server.ts` | Trí |
| 6.6 | Hiện thực `TideSessionPort` bằng `relationship.ts` (encrypt/decrypt theo record + policy), trả `denied` khi ORK từ chối kèm `cause` | `src/tide/session.ts` | Trí |
| 6.7 | Kho policy đã ký + 2 route sau verify: `POST` policy (chỉ admin, kiểm role phía server), `GET` policy áp cho người gọi; route đọc/ghi EncryptedRecord sau `authorize` | `src/storage/`, `src/app/api/` | Triệu |
| 6.8 | Luồng AI-reader: phiên trình duyệt AI-reader giải mã rec-A → gửi text cho `/api/summarize` kèm token → server verify + kiểm role AI-reader → inference. Không giải mã trên server | UI + summarize | Triệu + Tuấn |
| 6.9 | Bổ sung tên biến `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD`, `TIDE_LICENSE_EMAIL`, `TIDE_TERMS_ACCEPTED` (để trống) vào `.env.example` nếu đội giữ script trong repo | `.env.example` | Triệu |

---

## 7. Chứng minh theo thứ tự (bằng chứng cho gate S2)

1. Bốn tài khoản đăng nhập được, mỗi người một profile; `/api/health` báo Tide `ready` chỉ khi verifier thật đã nối.
2. Lan encrypt rec-A bằng P1 rồi decrypt lại: ra đúng nội dung (round-trip).
3. **Đối chứng contract:** encrypt với tag khác hoặc hai tag → **bị từ chối**. Nếu không bị từ chối thì dừng: contract đang dùng không phải `RelationshipAttestation:1`.
4. AI-reader decrypt rec-A bằng P3: **được**.
5. AI-reader decrypt rec-B (dùng P2 của Lan): **bị từ chối**, `cause` dạng `subjectId does not match`.
6. Lan encrypt brief S bằng P4; Minh decrypt bằng P5: **được**.
7. Y decrypt cùng ciphertext S bằng P5: **bị từ chối** do subject.
8. Ghi lại nguyên văn: lỗi ORK hiện thành `TIDE-TIDEJS-NET-THRESHOLD_FAILURE ... got 0 of N` — **đó là lời từ chối, không phải mất mạng**; đọc `cause` và từng dòng ORK. Lưu request/cause, phiên bản server/SDK, giờ, mà **không** lưu token, invite link hay mật khẩu.

Mỗi kết quả ghi vào mẫu `c2/Idea1_Spike_Evidence_Template.md` và handoff của C2-TRI-001.

---

## 8. Ước lượng thời gian (CHƯA ĐO)

| Phần | Ước lượng |
|---|---|
| 1. Cài Docker/WSL (nếu chưa có) | 20–40 phút |
| 2–3. Pack + container + realm + invite link | 15–25 phút |
| 4. Bốn tài khoản + cấp role + đăng nhập lại | 15–20 phút |
| 6. Nối provider/DPoP/verifier/session/policy store | 45–90 phút |
| 5 + 7. Ký 5 policy + 7 phép thử | 20–30 phút |
| **Tổng** | **~2–3,5 giờ** nếu máy chưa có Docker; **~1,5–2,5 giờ** nếu có sẵn |

So với khung của B: bắt đầu sau 14:30 thì D1 là 15:00, nên **không kịp S2_VERIFIED trong spike #1**. Quyết định tiếp theo thuộc Triệu/B, xem report kèm theo.
