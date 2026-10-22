# Kế hoạch 16:15 → 18:00 (C1 đang chờ 2 notebook, C2 là việc chính)

Căn cứ: `C2-TRI-001.md` (16:12), `BASE_HANDOFF.md`, `TIDE_CONNECT_GUIDE`. **Chưa có brief/rubric C2 trên máy này** → Triệu đối chiếu rubric thật trước 16:25.

## 0. Sự thật lúc 16:15

- C2 base chạy được (build, health, summarize fail-closed). Tide **chưa nối vào app**: realm + licence + IGA + admin(Lan) đạt; login 4 vai, ORK allow/deny, AI-reader **NOT_RUN**.
- **DTide 16:15 đã qua** và H1–H3 chưa đạt → theo plan của chính đội, **phải chọn nhánh ngay**.
- C1: 2 notebook full-train xong khoảng 17:15; bản nộp an toàn đã có (E1 LB 0,97669).

## 1. Quyết định 16:20 (Triệu chốt, Trí tư vấn): cắt phạm vi Tide

| Nhánh | Nội dung | Điều kiện |
|---|---|---|
| **A — Tide mỏng (khuyến nghị thử, có giới hạn giờ)** | Login Tide thật trong app (TideCloakProvider + verify JWT phía server cho `/api/summarize`) + **round-trip encrypt/decrypt của Lan** trên 1 record. Bỏ deny ORK nhiều vai | **Gate 16:50**: login + 1 round-trip chạy thật trên máy Trí. Không đạt → sang B ngay |
| **B — Fallback trung thực** | App chạy end-to-end với AI tóm tắt thật; phần Tide trình bày **đúng trạng thái**: realm/licence/IGA/admin đã dựng (có log), luồng quyền thiết kế + ma trận allow/deny ghi NOT_RUN | Luôn chuẩn bị song song |

**Không** tuyên bố "được Tide bảo vệ" cho phần chưa chạy (invariant của base).

## 2. Việc từng người

| Giờ | Trí | Tuấn | Triệu | Triết |
|---|---|---|---|---|
| 16:15–16:50 | Nhánh A trên máy mình: provider + login + verify server + round-trip Lan (playbook `add-auth-nextjs-fresh`, `verify-jwt-server-side`). File chung đưa Triệu áp | **Inference thật** trong `src/inference/` → `/api/summarize` trả `DraftBrief` (giữ thứ tự auth). Xác nhận provider được phép theo luật C2 | Đối chiếu rubric, chốt nhánh 16:20; ghép UI luồng AI→Lan→Minh; khung README | Fixtures A/B synthetic + `checks/` cho: fail-closed, 401/403/503, không lộ plaintext; ma trận allow/deny với cột "đã chạy/NOT_RUN" |
| **16:50** | **Gate A**: đạt / không đạt → báo Triệu | Summarize thật chạy trên máy demo | Chốt nhánh cuối | Chạy checks trên bản ghép |
| 16:50–17:15 | A đạt: hoàn thiện bằng chứng (log, ảnh). Không đạt: viết mục "Tide: đã làm / chưa làm" + ảnh realm | Sửa lỗi; ghi provider/model vào README | **Đóng băng tính năng 17:00**; README + kịch bản demo 90 giây | Kiểm thử độc lập trên máy demo; chụp ảnh bằng chứng |
| 17:15–17:25 | **C1:** nộp 2 bản full-train (sau khi Tuấn kiểm), chọn 2 final | **C1:** tải 2 `submission.csv`, chạy `compare_subs.py` so với E1 | **Quay video demo** (máy chạy được Tide = máy Trí) | Rà README khớp đúng cái đã chạy |
| 17:25–17:45 | Rà lần cuối, **nộp C2** theo hình thức BTC | Hỗ trợ | Đóng gói nộp (repo/link/video/PDF theo rubric), mở link chế độ ẩn danh | Checklist nộp |
| 17:45–18:00 | **Đệm sự cố** | | | |

## 3. C1 đóng sổ (15 phút, 17:15)

1. Tuấn: tải `submission.csv` của `MB_FULL_len1024` và `_s43`, chạy:
   `python defender/compare_subs.py "outputs/submissions/e2/submission_mb_E1_1024 _ 0.97669.csv" <file mới>` → khớp ≥ khoảng 0,953, phân bố nhãn gần giống.
2. Trí nộp cả hai (còn 4 lượt). Chọn final: 2 bản full-train nếu LB ≥ khoảng 0,970; bản nào lỗi/kém → thay bằng E1.
3. Notebook chưa xong lúc 17:40 → bỏ, final = E1 + MB_FULL (0,97165).

## 4. Luật cuối giờ

- 17:00 đóng băng tính năng C2; sau đó chỉ sửa lỗi làm hỏng demo.
- Mọi câu trong README/video phải khớp cái đã chạy; phần chưa chạy ghi rõ NOT_RUN.
- Không commit `data/tidecloak.json`, `.env`, key API.
- Kẹt quá 15 phút → báo Triệu (C2) / Trí (C1).
