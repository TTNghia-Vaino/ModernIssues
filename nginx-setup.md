# Hướng dẫn cấu hình Nginx Reverse Proxy

## Cấu trúc sau khi cấu hình:
- **Frontend**: `http://35.232.61.38/` (port 80)
- **Backend API**: `http://35.232.61.38/v1/` (proxy đến port 5000)
- **Chatbox**: `http://35.232.61.38/chat` (proxy đến port 8000)
- **SignalR**: `http://35.232.61.38/paymentHub` (proxy đến port 5000)

## Các bước cài đặt:

### 1. Cài đặt Nginx (nếu chưa có)
```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Copy file cấu hình
```bash
# Copy file nginx.conf vào thư mục sites-available
sudo cp nginx.conf /etc/nginx/sites-available/modernissues
sudo ln -s /etc/nginx/sites-available/modernissues /etc/nginx/sites-enabled/

# Xóa default config nếu cần
sudo rm /etc/nginx/sites-enabled/default
```

### 3. Tạo thư mục cho frontend build
```bash
sudo mkdir -p /var/www/modernissues/frontend/dist
sudo chown -R $USER:$USER /var/www/modernissues
```

### 4. Build và copy frontend
```bash
# Trên máy dev, build frontend
cd Frontend
npm run build

# Copy build files lên server
scp -r dist/* user@35.232.61.38:/var/www/modernissues/frontend/dist/
```

### 5. Kiểm tra cấu hình Nginx
```bash
sudo nginx -t
```

### 6. Khởi động/reload Nginx
```bash
sudo systemctl restart nginx
# hoặc
sudo systemctl reload nginx
```

### 7. Kiểm tra status
```bash
sudo systemctl status nginx
```

## Cập nhật cấu hình Backend

Sau khi cấu hình reverse proxy, cần cập nhật:
1. Session cookie: Đổi từ `SameSite=None` sang `SameSite=Lax` (vì cùng origin)
2. CORS: Có thể đơn giản hóa vì cùng origin
3. Frontend API config: Đổi từ `http://35.232.61.38:5000` sang relative path `/v1`

## Kiểm tra

1. Truy cập frontend: `http://35.232.61.38/`
2. Kiểm tra API: `http://35.232.61.38/v1/Product/ListProducts`
3. Kiểm tra chat: `http://35.232.61.38/chat`
4. Kiểm tra logs: `sudo tail -f /var/log/nginx/modernissues_error.log`

## Troubleshooting

- Nếu lỗi 502 Bad Gateway: Kiểm tra backend có đang chạy trên port 5000 không
- Nếu lỗi 404: Kiểm tra đường dẫn proxy_pass có đúng không
- Nếu session không hoạt động: Kiểm tra proxy_cookie_path và proxy_cookie_domain

