-- Script để kiểm tra các bảng đã tồn tại chưa

-- Kiểm tra bảng support_tickets
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'support_tickets'
) AS support_tickets_exists;

-- Kiểm tra bảng chat_messages
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages'
) AS chat_messages_exists;

-- Xem tất cả tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

