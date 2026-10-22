# fixtures/ — chủ sau base: Triết

Chỉ chứa dữ liệu **synthetic** cho kiểm thử (A/B tổng hợp, envelope mẫu). Base chưa tạo fixture A/B; việc đó thuộc task C2-TRIET-001.

Quy tắc:

- Không đặt dữ liệu thật hoặc dữ liệu thi vào đây.
- Không import file plaintext (đặc biệt B) từ `src/app/` hay component client: fixture không được vào bundle trình duyệt để "demo".
- Envelope mẫu phải ghi rõ ciphertext là placeholder, không phải kết quả mã hóa Tide.
