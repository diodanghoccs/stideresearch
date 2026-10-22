# STideResearch — C2 base scaffold

Trợ lý nghiên cứu: AI-reader chỉ giải mã bộ dữ liệu được cấp (A, bị từ chối B), soạn draft, Lan rà rồi mã hóa brief S vào kênh của Minh (Minh mở được, Y bị từ chối). TideCloak thực thi quyền giải mã.

> **Trạng thái hiện tại: chỉ là base.** Tide và AI **chưa nối**. Trang web và API báo đúng `not-implemented` / `not-configured`; không có gì ở đây đang được Tide bảo vệ. Chi tiết bàn giao: [docs/BASE_HANDOFF.md](docs/BASE_HANDOFF.md).

## Yêu cầu

- Node.js ≥ 22.18 (đã kiểm trên Node 24.12.0, npm 11.6.2). Cần Node có type stripping để chạy `check:storage`.
- npm (lockfile duy nhất: `package-lock.json`). Không dùng pnpm/yarn để tránh lockfile thứ hai.

## Chạy (từ thư mục này)

```bash
npm ci                 # cài đúng phiên bản trong package-lock.json
npm run typecheck      # tsc --noEmit
npm run build          # next build --webpack
npm run start -- -p 3210
```

Dev mode: `npm run dev` (dùng `--webpack` vì Tide SDK cần webpack trên Next 16, theo playbook chính thức của Tide).

## Kiểm tra

```bash
npm run check:storage                              # không cần server
BASE_URL=http://localhost:3210 npm run check:smoke  # cần server đang chạy
```

Trên PowerShell: `$env:BASE_URL="http://localhost:3210"; npm run check:smoke`.

## Cấu hình

Xem `.env.example`. Mọi biến đều chỉ dùng phía server; không đặt bí mật vào biến `NEXT_PUBLIC_*`. File adapter Tide `data/tidecloak.json` bị gitignore và không được commit.

## Ai sở hữu gì

| Thư mục | Chủ sau base |
|---|---|
| `src/contracts/`, `package.json`, `package-lock.json`, `src/storage/`, `src/app/` (trừ summarize) | Triệu |
| `src/tide/`, `scripts/tide/` (chưa tạo), cấu hình Tide | Trí |
| `src/inference/`, `src/app/api/summarize/` | Tuấn |
| `checks/`, `fixtures/` | Triết |
