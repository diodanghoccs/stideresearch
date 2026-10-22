# C2-TRIET-001 — Triết: fixture, kiểm thử quyền và kiểm tra claim

- **Trạng thái: IN_PROGRESS** (16:50) — fixture/ma trận/checks API xong; case runtime Tide/AI BLOCKED (xem Dev handoff).
- **Base dùng chung:** [STIDE-BASE-0.1.0-B20261022](../base/BASELINE_BASE_B_2026-10-22.md), app0.1.0, 23 file chưa commit trên HEAD nền8360e1d; [review PASS](../../reviews/C2-BASE-001.md). Kế thừa `checks/` và `fixtures/README.md` có sẵn; không xóa bằng chứng base hoặc đổi checks chỉ để đánh dấu runtime PASS.
- **Người triển khai dự kiến:** Triết; không tự bỏ việc C1 hiện hữu.
- **Người review:** Planner B; lỗi giao lại đúng người sở hữu module.
- **Căn cứ:** Triệu yêu cầu plan/task C2 cho bốn người; [plan](../Idea1_C2_Plan_4People_B_v1.md), mục 3–9.
- **Nguồn:** [brief](../brief.md), [S2](../Idea1_STideResearch_Team_Brief_v1.md), [fallback](../Idea1_Fallback_Framework_B_v1.md), [mẫu spike](../Idea1_Spike_Evidence_Template.md).
- **Hạn hiện hành:** [timeline B v2](../Idea1_Tide_Timeline_B_v2_2026-10-22.md): chuẩn bị fixture/ma trận ngay; H2 sharing chậm nhất15:50,H3 AI-reader16:05,DTide tối đa16:15; kiểm lại/video/README tới17:00, hỗ trợ kiểm link trước17:40 UTC+7. Các hạn còn bị chặn bởi mốc T0 tương đối trong timeline.
- **Phụ thuộc đã gỡ:** base/checks/contracts được nhận, scope Triết rõ; có thể viết fixture, ma trận và kiểm UI/API base ngay; không đợi realm mới bắt đầu.
- **Phụ thuộc runtime còn mở:** Trí cung cấp realm/identity/policy/cause, Triệu/Tuấn cung cấp luồng cuối. Khi chưa có, ghi NOT_RUN/BLOCKED phần case liên quan, không coi base503 là ORK deny. Ghi khả năng dành thời gian với C1 khi nhận.

## Mục tiêu và luồng chính

Chứng minh các quyền được phép/bị từ chối bằng thao tác thật, tìm lỗi có thể sửa và loại các claim quá bằng chứng khỏi demo. Không đo ASR hay tấn công hệ thống ngoài phạm vi.

## Phạm vi

- Dự kiến được sửa: `C:\Users\diosodumb\hackathon\web\stideresearch\fixtures\`, `checks\`; `C:\Users\diosodumb\hackathon\report\c2\test-matrix.md`, `verification\`.
- Được điền handoff task này và ghi bản run C2 mới trong workspace theo mẫu; không sửa bằng chứng của người khác hoặc kết luận B.
- Không sửa source Tide/inference/UI để làm test qua; báo Trí/Tuấn/Triệu sửa. Không chạy attacker C1 hoặc endpoint bên ngoài bằng task này.
- Fixture: A/B ngắn, synthetic, có nội dung đối chứng phân biệt; một đề nghị đọc B vô hại gắn nhãn mô phỏng nếu không do model thật tạo. Không mặc định model bị prompt injection.

## Tiêu chí nghiệm thu

| ID | Điều kiện/thao tác | Kết quả mong đợi | Cách xác minh |
|---|---|---|---|
| TRIET-01 | Chuẩn bị fixture/ma trận | A/B/S expected rõ, dữ liệu synthetic; mỗi case có identity, thao tác, kết quả mong đợi và actual | File fixture/test matrix |
| TRIET-02 | Kiểm identity | Lan/AI-reader/Minh/Y khác identity thật; không dùng chung session; không log token | Safe principal metadata theo request |
| TRIET-03 | AI-reader A/B | A allow đúng nội dung; B ORK deny có cause và positive control trên cùng mạng | Artifact policy/record/operation/cause |
| TRIET-04 | Lan/Minh/Y | Lan ghi S; Minh mở đúng S, không grant raw A/B; Y có cùng S/policy nhưng ORK deny | Luồng thật + identity/record đối chứng |
| TRIET-05 | AI/API/storage | AI tổng hợp thật từ A; API caller sai bị từ chối; write sai identity bị từ chối; không plaintext runtime/secret ngoài dataflow đã công khai | Các test có ý nghĩa + đọc config/code liên quan |
| TRIET-06 | Review README/video | Claim khớp nhánh/runtime; fixture/manual step/inference plaintext/admin limits được nói rõ | Checklist + lỗi vị trí cụ thể |
| TRIET-07 | Handoff lỗi/bằng chứng | Có timestamp, commit/file, bước tái hiện, actual/expected, owner sửa; chưa chạy ghi NOT_RUN | Verification report + task handoff |

## Hướng triển khai và kiểm tra

Đọc workspace AGENTS/rules/DEV và repo instructions vai Triết, cộng scope C2 trong plan. Chỉ kiểm thử synthetic trên realm/harness đội được giao. Kiểm lại đúng phiên bản sau sửa, không bám screenshot cũ.

Phân biệt 401/token lỗi, 403/API role deny, ORK contract deny và lỗi mạng. Generic VVK error không tự PASS case deny. API chặn Y trước decrypt không thay được phép thử Y có ciphertext/policy. Không đưa URL invite hoặc raw token vào proof/screen recording.

Các test cơ bản ưu tiên hơn coverage: A allow/B deny, Minh allow/Y deny, inference thật, API/write authorization sai, dữ liệu kho và luồng hoàn chỉnh. Thêm kiểm tra khi có lỗi mới, không viết test sao chép implementation hoặc bộ tấn công lớn.

Timeline v2 không mở F-B mới vì cửa sổ14:15 đã đóng và chưa có gate đạt; không dựng ba admin để kiểm thử trong lịch này. S1 chỉ áp dụng khi sharing đạt, AI-reader trượt và Triệu quyết biến thể AI. Nếu nhánh thay đổi, đối chiếu lại claim trước video, không giữ câu S2 trong case S1. Giữ bộ smoke **base** riêng: nó mong Tide/AI chưa ready nên có thể fail đúng khi integration đã nối; viết kiểm integration riêng, không hạ kiểm quyền thật để giữ smoke cũ xanh.

## Dev handoff — người triển khai điền

*Cập nhật 22/10 16:50 (UTC+7). **17:10:** chạy lại trên `main@911ee63`, kết quả giữ nguyên (fixture 4/4, storage 8/8, gate 9/9 trả 401); bàn giao tiếp cho Triết: [`HANDOFF_TRIET_C2_1710.md`](HANDOFF_TRIET_C2_1710.md).*
- **Người chạy:** trợ lý Claude theo yêu cầu của Trí, trên máy Trí. **Triết cần chạy lại độc lập** (`checks/RUNBOOK.md`) trước khi gửi B review.
- **Phiên bản đã kiểm:**
  - `diodanghoccs/stideresearch` `main@aa9fe00` (base);
  - `c2/trieu-app@d96017c` (bản tích hợp, có adapter realm `stideresearch` của Trí).
  - Checks/fixtures nằm trên nhánh `c2/triet-001-fixtures-checks` (tách từ `aa9fe00`). Patch zip `C2-TRIET-001_patch.zip` **không có trên máy**, nên các file được viết lại theo mô tả.
- **File:**
  - `fixtures/A.synthetic.json` (`rec-A`, `A_ONLY_LANTERN_24`, 24/18/75%);
  - `fixtures/B.synthetic.json` (`rec-B`, `B_ONLY_COBALT_9`, 9/4);
  - `fixtures/S.expected.synthetic.json`, `fixtures/README.md`;
  - `checks/fixture-contract.check.mjs`, `checks/integration-gate.check.mjs`, `checks/test-matrix.md`, `checks/RUNBOOK.md`;
  - `checks/verification/C2-TRIET-001-initial.md` + `logs/`.
- **Môi trường:** Windows 11, Node v24.15.0. Tide `tideorg/tidecloak-dev:latest` (Keycloak 26.7.5). Inference: not-configured trên máy này.
- **Thời gian C2:** 16:40–16:52.

| AC | Thao tác đã chạy | Kết quả thật | Artifact |
|---|---|---|---|
| TRIET-01 | `fixture-contract` trên 2 bản + 1 ca âm | **PASS** 4/4 trên cả 2 bản; ca âm FAIL đúng | `logs/B2_*` |
| TRIET-02 | — | **BLOCKED**: mới 1/4 tài khoản Tide (Lan/admin) | — |
| TRIET-03 | — | **BLOCKED**: cần I01 + policy + record mã hóa | — |
| TRIET-04 | — | **BLOCKED** | — |
| TRIET-05 | `integration-gate`, `check:storage`, đọc `server.ts`/`input.ts` | **Một phần.**<br>PASS: d96017c trả 9/9 route 401 khi không token / bearer bịa / JWT `alg:none` giả đủ role; storage 8/8.<br>BLOCKED: AI thật, sai role bằng phiên thật | `logs/C4_*`, `logs/B3_*` |
| TRIET-06 | Rà README, `report/overview.md`, `report/demo-script.md` @ d96017c | **FAIL 5 điểm** (C1–C5). Video chưa có | báo cáo §4 |
| TRIET-07 | Báo cáo ban đầu | Có; bản cuối chờ lượt runtime | `checks/verification/C2-TRIET-001-initial.md` |

- **Lỗi cần sửa:**

  | # | Mức | Nội dung | Người nhận |
  |---|---|---|---|
  | L1 | thấp | `npm ci` ghi đè `public/silent-check-sso.html` | Triệu |
  | L2 | trung bình | README "Checks" trỏ tới base-smoke, bài này FAIL đúng thiết kế trên bản tích hợp | Triệu |
  | L3 | trung bình | `/api/summarize` không chứng minh text đến từ A đã giải mã | Tuấn + Triệu, nói rõ trong README/video |
  | L4 | thấp | evidence inference dùng fixture khác và đang `NOT_RUN` | Tuấn |
  | L5 | thông tin | đọc record/policy không đòi role; bảo vệ dựa vào ORK | B ghi nhận |

  Các claim C1–C5 cần sửa: Triệu.
- **Case chưa chạy/không kết luận:**
  - I01, A01, B01, B02, S02–S04, P01b, P02b: thiếu tài khoản, policy và record (Trí).
  - S01: thiếu model/key (Tuấn).
  - **Không có bằng chứng ORK allow/deny nào. 401/503 không được tính là ORK deny.**
- Review B: CHƯA CÓ. Báo kết quả kiểm thử, không tự đánh dấu các task người khác DONE.

## Quyết định/thay đổi

Task mới chỉ C2; chưa khởi chạy kiểm thử. Thay đổi nhánh phải có căn cứ/giờ và AC được cập nhật đúng, không giữ claim S2 khi đã sang S1/F-B.

22/10/2026: B nhận baseline trên, chuyển READY theo yêu cầu Triệu, áp dụng timeline v2 sau15:00. Các phép kiểm B đã chạy ở review base không phải runtime test Tide của Triết; Dev handoff của Triết vẫn NOT_RUN.
