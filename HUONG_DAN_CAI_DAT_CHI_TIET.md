# 🛠️ Hướng Dẫn Cấu Hình Telegram & Tên Miền (Domain)

Tài liệu này giúp bạn kết nối hệ thống Sakura Sushi với thế giới bên ngoài.

---

## 1. 🤖 Cấu hình Telegram (Thông báo đơn hàng)

Để nhận được thông báo vào điện thoại khi có khách đặt bàn hoặc đặt món:

### Bước 1: Tạo Bot và lấy Token
1. Mở Telegram, tìm kiếm người dùng **@BotFather**.
2. Chat lệnh `/newbot`.
3. Nhập tên cho Bot (ví dụ: `Sakura Sushi Bot`).
4. Nhập username cho Bot (phải kết thúc bằng chữ `bot`, ví dụ: `sakura_sushi_orders_bot`).
5. **@BotFather** sẽ gửi cho bạn một đoạn mã dài. Đó chính là **TELEGRAM_BOT_TOKEN**. Hãy copy nó.

### Bước 2: Lấy Chat ID của bạn
1. Tìm kiếm và chat với **@userinfobot** trên Telegram.
2. Nó sẽ trả về một con số (ví dụ: `123456789`). Đó là **TELEGRAM_CHAT_ID** của bạn.

---

## 2. 🌐 Cấu hình Tên Miền (Domain)

Để khách truy cập vào trang web bằng tên miền (ví dụ: `sakurasushi.de`) thay vì địa chỉ IP.

### Bước 1: Tìm địa chỉ IP của VPS
- Khi bạn mua VPS, nhà cung cấp sẽ cho bạn một địa chỉ IP (ví dụ: `103.45.67.89`).

### Bước 2: Trỏ Tên Miền (DNS)
1. Đăng nhập vào trang quản lý tên miền của bạn (GoDaddy, Namecheap, iNet, v.v.).
2. Tìm phần **DNS Management** hoặc **Quản lý bản ghi**.
3. Thêm một bản ghi mới như sau:
   - **Type (Loại)**: `A`
   - **Name (Tên/Host)**: `@`
   - **Value (Giá trị/Địa chỉ)**: Điền địa chỉ **IP của VPS** vào đây.
   - **TTL**: Để mặc định.
4. (Tùy chọn) Thêm một bản ghi nữa cho `www`:
   - **Type**: `A`
   - **Name**: `www`
   - **Value**: Điền địa chỉ **IP của VPS**.

> [!NOTE]
> Sau khi chỉnh xong, có thể mất từ 15 phút đến vài tiếng để tên miền nhận IP mới.

---

## 3. 📝 Cập nhật thông tin vào hệ thống

Sau khi đã có **Token**, **Chat ID** và **Tên Miền**, bạn làm như sau trên VPS:

1. Tìm file `.env.example` trong thư mục gốc của dự án.
2. Đổi tên nó thành `.env`.
3. Mở file `.env` bằng Notepad và điền thông tin vào:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCDE... (Chuỗi bạn lấy từ BotFather)
   TELEGRAM_CHAT_ID=987654321 (Số bạn lấy từ userinfobot)
   VPS_DOMAIN=https://sakurasushi.de (Tên miền của bạn)
   ```
4. Lưu file lại.
5. Khởi động lại Server (nếu đang chạy) bằng cách tắt đi bật lại file `start-system.bat`.

---

## 🔒 4. Cài đặt SSL (Ổ khóa xanh HTTPS) - Khuyên dùng

Để web chạy chuyên nghiệp và an toàn (có chữ `https`), mình khuyên bạn nên dùng **Cloudflare**:
1. Đăng ký tài khoản miễn phí tại [cloudflare.com](https://www.cloudflare.com/).
2. Thêm tên miền của bạn vào Cloudflare.
3. Thay đổi **Nameservers** của tên miền theo hướng dẫn của Cloudflare.
4. Trong phần **SSL/TLS**, chọn chế độ **Flexible**.
5. Trong phần **DNS**, bật đám mây màu cam (Proxied) cho bản ghi A của bạn.

**Xong! Chúc mừng bạn đã hoàn tất cấu hình chuyên nghiệp cho Sakura Sushi!** 🍣🚀
