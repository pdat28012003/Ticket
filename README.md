# 🎫 InfraDesk — Ticket Management System

Hệ thống quản lý ticket theo SOP Communication & Collaboration Policy giữa Infrastructure Team và Project Team.

## 📋 Tính năng

- ✅ **Raise Ticket** — Form đầy đủ theo Section 8 & 9 của SOP
- ✅ **Dashboard** — Thống kê real-time: total, active, SLA breached, done
- ✅ **SLA Management** — Tự động tính deadline theo priority, cảnh báo màu sắc
- ✅ **Ticket Lifecycle** — New → In Progress → Waiting for Info → Done/Rejected
- ✅ **Comment System** — Giao tiếp 2 chiều Project Team ↔ Infra Team
- ✅ **Infra Team Actions** — Update status, assign, ghi chú xử lý
- ✅ **Filter & Search** — Lọc theo status, priority, category, từ khóa
- ✅ **Auto Ticket ID** — TKT-CRT-0001, TKT-HGH-0002, v.v.
- ✅ **New Env Setup** — Form đặc biệt theo Section 9 SOP

## ⚙️ Setup

### Yêu cầu
- Node.js >= 16
- MongoDB (local hoặc Atlas)

### Cài đặt

```bash
# 1. Clone / giải nén project
cd ticket-system

# 2. Cài dependencies
npm install

# 3. Cấu hình .env
cp .env.example .env
# Chỉnh sửa MONGO_URI nếu cần

# 4. Chạy MongoDB (nếu dùng local)
mongod

# 5. Khởi động server
npm start
# hoặc: node server.js

# 6. Mở browser
# http://localhost:3000
```

### MongoDB Atlas (Cloud)
Thay `MONGO_URI` trong `.env`:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/infra_tickets
```

## 🗂️ Cấu trúc dự án

```
ticket-system/
├── server.js           # Express server entry point
├── models/
│   └── Ticket.js       # MongoDB schema với SLA logic
├── routes/
│   └── tickets.js      # API endpoints
├── public/
│   └── index.html      # Single-page frontend
├── .env.example
└── package.json
```

## 🔌 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/tickets | Lấy danh sách ticket (có filter) |
| GET | /api/tickets/stats | Dashboard statistics |
| GET | /api/tickets/:id | Chi tiết ticket |
| POST | /api/tickets | Tạo ticket mới |
| PATCH | /api/tickets/:id/status | Cập nhật trạng thái (Infra) |
| POST | /api/tickets/:id/comments | Thêm comment |
| DELETE | /api/tickets/:id | Xóa ticket |

## 📊 SLA Policy

| Priority | Response | Resolution |
|----------|----------|------------|
| Critical | 15 phút | 2 giờ |
| High | 30 phút | 4 giờ |
| Medium | 1 giờ | 8 giờ |
| Standard | 2 giờ | 1-2 ngày |
