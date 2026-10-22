# C2 — phần inference của Tuấn

Nhận văn bản A sau khi AI-reader giải mã, gọi OpenAI Responses API một lần, trả `DraftBrief` cho Lan rà soát. Module không đọc storage, không nhận khóa giải mã và không có công cụ tìm kiếm/email. Phạm vi hiện tại chỉ nhận `sourceRecordId: "A"`.

Trạng thái nghiệm thu và các phụ thuộc: xem [HANDOFF.md](./HANDOFF.md).

## Kiểm tra code

Từ thư mục gốc repo, dùng Node.js >=22.18:

```powershell
npm ci
npm run typecheck
node src/inference/smoke.mjs
npm run build
```

`smoke.mjs` chạy các ca kiểm thử adapter và handler bằng port/transport mô phỏng, rồi ghi metadata kết quả vào `evidence/local-checks.json`. Các ca này không gọi model và không chứng minh token/DPoP Tide thật. Test handler dùng port được truyền trực tiếp vào hàm; endpoint triển khai chỉ dùng `getTideVerifier()` và `getInference()`, không có cờ bỏ xác thực.

## Chạy một lần với model thật

Cần khóa từ **dịch vụ đã được nhóm cho phép dùng**. Nếu chưa có, báo nhóm cấp khóa; không cần mua hay mở dịch vụ mới. Khóa là thông tin bí mật, không dán vào chat hoặc commit.

Nếu chưa có `.env.local`, tạo file từ mẫu:

```powershell
if (-not (Test-Path -LiteralPath .env.local)) {
  Copy-Item -LiteralPath src/inference/.env.example -Destination .env.local
}
```

Điền ba biến **chỉ dùng ở server** trong `.env.local`:

```dotenv
INFERENCE_PROVIDER=openai
INFERENCE_MODEL=<tên model mà dự án của nhóm được phép dùng>
INFERENCE_API_KEY=<khóa do nhóm cấp>
```

Sau đó chạy:

```powershell
node --env-file-if-exists=.env.local src/inference/live-smoke.mjs
```

Lệnh này chỉ gửi **A synthetic được viết sẵn trong script**, không đọc dữ liệu từ storage hoặc file bên ngoài. Nó ghi `evidence/live-smoke.json` với kết quả `PASS`, `FAIL` hoặc `NOT_RUN`, mã lần chạy, model/provider, thời điểm và hash của input/output. Artifact và console không chứa khóa, token hoặc plaintext A/draft. Mã thoát tương ứng là 0/1/2. Lan vẫn cần xem và rà nội dung draft khi UI được tích hợp.

Module dùng đủ trường của `DraftBrief`: `sourceRecordId`, `text`, `model` thực tế do provider trả về, `provider`, `runId`, `createdAt`. Thiếu cấu hình trả `not-ready`; không có bản tóm tắt mẫu thay thế. `readiness: ready` chỉ xác nhận adapter có cấu hình; quyền truy cập model phải được kiểm chứng bằng lần gọi thành công.

## API và giới hạn

`POST /api/summarize` giữ thứ tự: Tide readiness → verify token/DPoP → authorize summarize → inference readiness → đọc body → gọi model. Tide chưa triển khai thì endpoint trả 503; caller chưa xác thực trả 401, bị từ chối quyền trả 403. Exception xác thực trả 500 và không gọi model.

Body phải là JSON có đúng ba trường:

```json
{"sourceRecordId":"A","text":"văn bản sau decrypt","runId":"mã lần chạy"}
```

- Chỉ nhận A; từ chối B và các trường thừa như token/credential.
- Body tối đa 64 KiB; text không rỗng, tối đa 20.000 ký tự; runId không rỗng, tối đa 128 ký tự.
- Input sai trả 400; body quá lớn trả 413. Kiểm tra độ lớn cả khi không có `Content-Length`.
- Gọi provider tối đa 20 giây, không retry, không theo redirect và không dùng tools.
- HTTP upstream thất bại, timeout, JSON lỗi, refusal, output rỗng hoặc chưa hoàn tất đều trả `UPSTREAM_ERROR` / HTTP 502.
- Các response đều đặt `Cache-Control: no-store`; không log body hoặc diagnostic của provider.

## Plaintext và phụ thuộc tích hợp

Luồng dự kiến: AI-reader decrypt A qua Tide → gửi A tới Next.js server đã xác thực → server gửi A qua HTTPS tới OpenAI → draft trả cho Lan. Next.js host, proxy được cấu hình trên đường truyền và provider có thể thấy plaintext. Module không gửi token Tide, runId hay credential giải mã cho provider; API key chỉ dùng trong header server → OpenAI.

Request đặt `store: false`. Điều này không đồng nghĩa với không lưu dữ liệu ở mọi lớp: retention cho abuse monitoring và prompt caching vẫn phụ thuộc điều khoản/cấu hình tài khoản. Chưa xác minh quyền hoặc retention riêng của tài khoản nhóm. Nguồn: [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) và [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses).

Kiểm tra `sourceRecordId === "A"` ngăn truyền nhầm record B, nhưng không chứng minh text thật sự đến từ A. Trí/Triệu cần đảm bảo chỉ gọi endpoint sau decrypt A thành công và kiểm thử bằng identity thật. Module không tự sửa hợp đồng Tide để thực hiện phần này.
