-- =============================================
-- ModernIssues Database Script
-- PostgreSQL Database Schema
-- =============================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS product_promotions CASCADE;
DROP TABLE IF EXISTS warranty CASCADE;
DROP TABLE IF EXISTS order_details CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS faq CASCADE;
DROP TABLE IF EXISTS product_serials CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- Table: users
-- Bảng lưu thông tin tài khoản người dùng (admin và customer)
-- =============================================
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_disabled BOOLEAN DEFAULT FALSE,
    email_confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE users IS 'Bảng lưu thông tin tài khoản người dùng (admin và customer)';
COMMENT ON COLUMN users.role IS 'Phân quyền người dùng: customer hoặc admin';
COMMENT ON COLUMN users.avatar_url IS 'Đường dẫn ảnh đại diện của người dùng';

CREATE UNIQUE INDEX users_username_key ON users(username);
CREATE UNIQUE INDEX users_email_key ON users(email);

-- =============================================
-- Table: categories
-- Danh mục sản phẩm (ví dụ: Laptop, CPU, RAM, Phụ kiện,...)
-- =============================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    parent_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE categories IS 'Danh mục sản phẩm (ví dụ: Laptop, CPU, RAM, Phụ kiện,...)';
COMMENT ON COLUMN categories.parent_id IS 'Tham chiếu đến danh mục cha (nếu có)';

-- =============================================
-- Table: products
-- Danh sách sản phẩm bán trong cửa hàng: laptop, linh kiện, phụ kiện...
-- =============================================
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    category_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    on_prices DECIMAL(15, 2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    warranty_period INTEGER,
    image_url TEXT,
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT products_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE products IS 'Danh sách sản phẩm bán trong cửa hàng: laptop, linh kiện, phụ kiện...';

-- =============================================
-- Table: promotions
-- Chương trình khuyến mãi, ví dụ: giảm 10%, mua 1 tặng 1...
-- =============================================
CREATE TABLE promotions (
    promotion_id SERIAL PRIMARY KEY,
    promotion_name VARCHAR(150) NOT NULL,
    description TEXT,
    discount_percent DECIMAL(5, 2),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT promotions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE promotions IS 'Chương trình khuyến mãi, ví dụ: giảm 10%, mua 1 tặng 1...';

-- =============================================
-- Table: product_promotions
-- Liên kết nhiều sản phẩm với nhiều chương trình khuyến mãi
-- =============================================
CREATE TABLE product_promotions (
    product_id INTEGER NOT NULL,
    promotion_id INTEGER NOT NULL,
    PRIMARY KEY (product_id, promotion_id),
    CONSTRAINT product_promotions_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT product_promotions_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE CASCADE
);

COMMENT ON TABLE product_promotions IS 'Liên kết nhiều sản phẩm với nhiều chương trình khuyến mãi';

-- =============================================
-- Table: product_serials
-- Mỗi đơn vị hàng hóa trong kho có một serial riêng biệt
-- =============================================
CREATE TABLE product_serials (
    serial_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_sold BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT product_serials_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT product_serials_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT product_serials_updated_by_fkey FOREIGN KEY (updated_by)
        REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE product_serials IS 'Mỗi đơn vị hàng hóa trong kho có một serial riêng biệt';
COMMENT ON COLUMN product_serials.serial_number IS 'Mã serial duy nhất cho từng sản phẩm vật lý';

CREATE UNIQUE INDEX product_serials_serial_number_key ON product_serials(serial_number);

-- =============================================
-- Table: carts
-- Giỏ hàng của khách hàng - mỗi dòng là 1 sản phẩm trong giỏ hàng
-- PRIMARY KEY: (user_id, cart_id, product_id)
-- =============================================
CREATE TABLE carts (
    cart_id SERIAL,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price_at_add DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, cart_id, product_id),
    CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT carts_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

COMMENT ON TABLE carts IS 'Giỏ hàng của khách hàng - mỗi dòng là 1 sản phẩm trong giỏ hàng';

-- =============================================
-- Table: orders
-- Thông tin đơn hàng của khách hàng
-- =============================================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(15, 2) DEFAULT 0,
    types VARCHAR(20) DEFAULT 'COD' CHECK (types IN ('COD', 'Transfer', 'ATM')),
    gencode VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE orders IS 'Thông tin đơn hàng của khách hàng';
COMMENT ON COLUMN orders.types IS 'Loại thanh toán: COD, Transfer, ATM';
COMMENT ON COLUMN orders.gencode IS 'Mã QR code cho thanh toán Transfer (chỉ dùng cho Transfer)';

-- =============================================
-- Table: order_details
-- Chi tiết các sản phẩm trong mỗi đơn hàng
-- =============================================
CREATE TABLE order_details (
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price_at_purchase DECIMAL(15, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    PRIMARY KEY (order_id, product_id),
    CONSTRAINT order_details_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT order_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT order_details_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT order_details_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE order_details IS 'Chi tiết các sản phẩm trong mỗi đơn hàng';
COMMENT ON COLUMN order_details.product_name IS 'Lưu tên sản phẩm tại thời điểm mua để giữ lịch sử';
COMMENT ON COLUMN order_details.image_url IS 'Lưu ảnh sản phẩm tại thời điểm mua';

-- =============================================
-- Table: warranty
-- Thông tin bảo hành sản phẩm (thời gian và trạng thái)
-- =============================================
CREATE TABLE warranty (
    warranty_id SERIAL,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    serial_number VARCHAR(100),
    serial_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    PRIMARY KEY (warranty_id, product_id, user_id, order_id),
    CONSTRAINT warranty_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT warranty_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT warranty_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT warranty_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES product_serials(serial_id) ON DELETE SET NULL,
    CONSTRAINT warranty_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT warranty_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE warranty IS 'Thông tin bảo hành sản phẩm (thời gian và trạng thái)';
COMMENT ON COLUMN warranty.serial_number IS 'Số serial của sản phẩm (deprecated - sử dụng serial_id thay thế)';
COMMENT ON COLUMN warranty.serial_id IS 'Tham chiếu tới serial của sản phẩm';

-- =============================================
-- Table: faq
-- Câu hỏi thường gặp (FAQ) của khách hàng
-- =============================================
CREATE TABLE faq (
    faq_id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT faq_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT faq_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE faq IS 'Câu hỏi thường gặp (FAQ) của khách hàng';

-- =============================================
-- Table: logs
-- Lưu lịch sử thao tác của người dùng: xem, thêm giỏ hàng, đăng nhập,...
-- =============================================
CREATE TABLE logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    product_id INTEGER,
    action_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

COMMENT ON TABLE logs IS 'Lưu lịch sử thao tác của người dùng: xem, thêm giỏ hàng, đăng nhập,...';

-- =============================================
-- Create indexes for better performance
-- =============================================
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_disabled ON products(is_disabled);
CREATE INDEX idx_product_serials_product_id ON product_serials(product_id);
CREATE INDEX idx_product_serials_is_sold ON product_serials(is_sold);
CREATE INDEX idx_product_serials_is_disabled ON product_serials(is_disabled);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_gencode ON orders(gencode);
CREATE INDEX idx_order_details_order_id ON order_details(order_id);
CREATE INDEX idx_order_details_product_id ON order_details(product_id);
CREATE INDEX idx_warranty_user_id ON warranty(user_id);
CREATE INDEX idx_warranty_product_id ON warranty(product_id);
CREATE INDEX idx_warranty_order_id ON warranty(order_id);
CREATE INDEX idx_warranty_serial_id ON warranty(serial_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_product_id ON logs(product_id);
CREATE INDEX idx_logs_created_at ON logs(created_at);

-- =============================================
-- Insert sample data (optional)
-- =============================================

-- Insert admin user (password should be hashed in production)
-- Default password: admin123 (should be hashed using your authentication system)
INSERT INTO users (username, password, email, role, email_confirmed, is_disabled) 
VALUES ('admin', '$2a$11$YourHashedPasswordHere', 'admin@modernissues.com', 'admin', TRUE, FALSE);

-- =============================================
-- End of Script
-- =============================================

