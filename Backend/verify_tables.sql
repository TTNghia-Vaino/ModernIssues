-- Script để verify các bảng đã được tạo

-- Kiểm tra bảng support_tickets
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'support_tickets'
        ) THEN '✓ support_tickets EXISTS'
        ELSE '✗ support_tickets NOT FOUND'
    END AS support_tickets_check;

-- Kiểm tra bảng chat_messages
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'chat_messages'
        ) THEN '✓ chat_messages EXISTS'
        ELSE '✗ chat_messages NOT FOUND'
    END AS chat_messages_check;

-- Xem cấu trúc bảng support_tickets (nếu tồn tại)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'support_tickets'
ORDER BY ordinal_position;

-- Xem cấu trúc bảng chat_messages (nếu tồn tại)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
ORDER BY ordinal_position;

