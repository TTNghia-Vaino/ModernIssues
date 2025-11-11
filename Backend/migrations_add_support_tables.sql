-- Migration: Thêm bảng support_tickets và chat_messages

-- 1. Tạo bảng support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ticket_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    assigned_to INTEGER,
    email VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 2. Tạo bảng chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    admin_id INTEGER,
    message TEXT NOT NULL,
    sender_type VARCHAR(20) DEFAULT 'user',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT chat_messages_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 3. Tạo indexes
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON support_tickets(created_at);

CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_admin_id_idx ON chat_messages(admin_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS chat_messages_is_read_idx ON chat_messages(is_read);

-- 4. Comments
COMMENT ON TABLE support_tickets IS 'Bảng lưu tickets hỗ trợ khách hàng';
COMMENT ON TABLE chat_messages IS 'Bảng lưu tin nhắn chat hỗ trợ';

COMMENT ON COLUMN support_tickets.ticket_type IS 'Loại ticket: technical, billing, order, general';
COMMENT ON COLUMN support_tickets.status IS 'Trạng thái: open, in_progress, resolved, closed';
COMMENT ON COLUMN chat_messages.sender_type IS 'Loại người gửi: user hoặc admin';

