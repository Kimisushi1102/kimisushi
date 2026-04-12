# 🚀 Hướng Dẫn Triển Khai Sakura Sushi POS (Windows VPS)

Chúc mừng bạn đã sở hữu bộ mã nguồn Sakura Sushi POS chuyên nghiệp. Dưới đây là các bước để đưa hệ thống của bạn lên mạng (Online) trên Windows VPS.

---

## 🏗️ Bước 1: Chuẩn bị trên VPS
1. **Cài đặt Node.js**: Truy cập [nodejs.org](https://nodejs.org/) và tải bản **LTS** cho Windows. Cài đặt như phần mềm bình thường.
2. **Copy mã nguồn**: Copy toàn bộ thư mục `sakura-sushi` vào VPS của bạn (ví dụ để ở `C:\sakura-sushi`).

---

## 🛠️ Bước 2: Khởi chạy Tự động (Khuyên dùng)
1. Vào thư mục dự án trên VPS.
2. Chuột phải vào file `deploy-helper.ps1` và chọn **Run with PowerShell**.
3. Làm theo hướng dẫn trên màn hình. Script sẽ tự động:
   - Cài đặt thư viện (`npm install`).
   - Cài đặt công cụ chạy nền (**PM2**).
   - Cài đặt **Cloudflare Tunnel** (SSL/Tên miền) nếu bạn có Token.
   - Tự khởi động lại hệ thống nếu VPS bị tắt đột ngột.

---

## 🛠️ Bước 2b: Khởi chạy thủ công (Dành cho nhà phát triển)
1. Chuột phải vào file `start-system.bat` và chọn **Run as Administrator**.
2. Hệ thống sẽ tự động cài đặt các thành phần cần thiết (`npm install`) và khởi chạy server.
3. **Kiểm tra**: Mở trình duyệt trên VPS và truy cập: `http://localhost:3000`.

---

## 🌐 Bước 3: Mở Port Tường Lửa (Quan trọng nhất)
Để khách hàng có thể truy cập từ bên ngoài bằng địa chỉ IP của VPS, bạn cần mở **Port 3000**:
1. Vào **Windows Search**, gõ `Windows Defender Firewall with Advanced Security`.
2. Chọn **Inbound Rules** (bên trái) -> **New Rule...** (bên phải).
3. Chọn **Port** -> Next.
4. Chọn **TCP** và điền `3000` vào ô **Specific local ports**.
5. Nhấn Next liên tục cho đến bước đặt tên, đặt là `Sakura-POS`.
6. Nhấn **Finish**.

> [!TIP]
> Bây giờ bạn có thể truy cập từ điện thoại hoặc máy tính khác bằng địa chỉ: `http://[ĐỊA-CHỈ-IP-VPS]:3000`

---

## 🔄 Bước 4: Chạy vĩnh viễn (Sử dụng PM2)
Để hệ thống không bị tắt khi bạn đóng cửa sổ dòng lệnh:
1. Mở **PowerShell** hoặc **Command Prompt** với quyền Admin.
2. Gõ lệnh cài PM2:
   ```bash
   npm install pm2 -g
   ```
3. Sau đó, chạy lệnh khởi động dự án:
   ```bash
   npm run prod
   ```
4. Cuối cùng, gõ lệnh này để hệ thống tự chạy lại khi VPS khởi động lại:
   ```bash
   pm2 save
   ```

---

## 📁 Cấu trúc quan trọng
- `backend/database.json`: Nơi lưu trữ toàn bộ dữ liệu (Menu, Đơn hàng, Cài đặt).
- `backend/backups/`: Nơi lưu trữ các bản sao lưu hàng ngày.
- `pos.html`: Giao diện dành cho bạn (Thu ngân/Bếp).
- `index.html`: Giao diện dành cho khách đặt món.

---
> [!IMPORTANT]
> **Bảo mật**: Sau khi hệ thống ổn định, hãy đổi mật khẩu Admin trong file `backend/db.js` hoặc cấu hình thêm bảo mật nếu cần thiết.

**Chúc Sakura Sushi khai trương hồng phát!** 🍣🌸
