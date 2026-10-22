# fixtures/ — chủ sau base: Triết

Chỉ chứa dữ liệu **synthetic** cho kiểm thử (A/B tổng hợp, envelope mẫu). Kiểm bằng `node checks/fixture-contract.check.mjs`.

| File | recordId | Marker | Nội dung | Ai được mở (theo plan S2) |
|---|---|---|---|---|
| `A.synthetic.json` | `rec-A` | `A_ONLY_LANTERN_24` | 24 sinh viên, 18 hoàn thành, 75% | Lan, AI-reader |
| `B.synthetic.json` | `rec-B` | `B_ONLY_COBALT_9` | 9 thiết bị, 4 cần bảo trì | Lan (AI-reader **không**) |
| `S.expected.synthetic.json` | `rec-S` | — | Bản tóm tắt **kỳ vọng** từ A: phải có 24 / 18 / 75%, không có dấu vết B | Lan, Minh (Y **không**) |

`recordId` khớp hằng `REC` trong `src/app/workflow/workflow.tsx` của nhánh `c2/trieu-app`.

Cách dùng khi kiểm thử thật: Lan dán trường `text` của A/B vào bước "Encrypt & store" của app. `S.expected` chỉ dùng để **đối chiếu** bản nháp AI và bản Lan duyệt.

Quy tắc:

- Không đặt dữ liệu thật hoặc dữ liệu thi vào đây.
- Không import file plaintext (đặc biệt B) từ `src/` hay component client: fixture không được vào bundle trình duyệt để "demo". `fixture-contract` quét `src/` để chặn việc này.
- JSON ở đây là **plaintext giả lập**, không phải bản ghi đã mã hóa. Không lưu `S.expected` thành EncryptedRecord hay dùng nó thay cho S thật.
- Envelope mẫu phải ghi rõ ciphertext là placeholder, không phải kết quả mã hóa Tide.
