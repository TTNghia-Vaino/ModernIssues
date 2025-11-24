#!/bin/bash
# Script setup SSL cho backend .NET trên Ubuntu/Debian server

echo "=== Setup SSL cho ModernIssues Backend ==="

# 1. Cài đặt Nginx và Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Tạo Nginx config cho backend
sudo tee /etc/nginx/sites-available/modernissues-backend << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN.com;  # Thay bằng domain của bạn (vd: api.modernissues.com)

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (cho SignalR PaymentHub)
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
EOF

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/modernissues-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Lấy SSL certificate (Let's Encrypt - miễn phí)
# Thay YOUR_DOMAIN.com và YOUR_EMAIL
sudo certbot --nginx -d YOUR_DOMAIN.com --non-interactive --agree-tos -m YOUR_EMAIL

# 5. Auto-renew SSL
sudo certbot renew --dry-run

echo "=== Hoàn tất! ==="
echo "Backend sẽ chạy tại: https://YOUR_DOMAIN.com"
echo "Certbot sẽ tự động renew SSL mỗi 90 ngày"
