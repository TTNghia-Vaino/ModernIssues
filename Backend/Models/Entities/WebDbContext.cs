using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ModernIssues.Models.Entities;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace ModernIssues.Models.Entities;

public partial class WebDbContext : DbContext
{
    private readonly IConfiguration _configuration;
    private const int SYSTEM_ADMIN_ID = 1; // ID của system admin để tạo serial tự động

    public WebDbContext(DbContextOptions<WebDbContext> options, IConfiguration configuration)
            : base(options)
        {
            _configuration = configuration;
        }
    public virtual DbSet<BankTransaction> BankTransactions { get; set; }

    public virtual DbSet<cart> carts { get; set; }

    public virtual DbSet<category> categories { get; set; }

    public virtual DbSet<faq> faqs { get; set; }

    public virtual DbSet<log> logs { get; set; }

    public virtual DbSet<order> orders { get; set; }

    public virtual DbSet<order_detail> order_details { get; set; }

    public virtual DbSet<product> products { get; set; }

    public virtual DbSet<product_serial> product_serials { get; set; }

    public virtual DbSet<promotion> promotions { get; set; }

    public virtual DbSet<user> users { get; set; }

    public virtual DbSet<warranty> warranties { get; set; }

    public virtual DbSet<warranty_detail> warranty_details { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                optionsBuilder.UseNpgsql(connectionString);
            }
        }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BankTransaction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("bank_transactions_pkey");

            entity.ToTable("bank_transactions");

            entity.Property(e => e.Id)
                .UseIdentityAlwaysColumn()
                .HasColumnName("id");
            entity.Property(e => e.Accountnumber)
                .HasMaxLength(50)
                .HasColumnName("accountnumber");
            entity.Property(e => e.Accumulated)
                .HasPrecision(18, 2)
                .HasColumnName("accumulated");
            entity.Property(e => e.Code)
                .HasMaxLength(255)
                .HasColumnName("code");
            entity.Property(e => e.Content).HasColumnName("content");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Gateway)
                .HasMaxLength(100)
                .HasColumnName("gateway");
            entity.Property(e => e.Referencecode)
                .HasMaxLength(255)
                .HasColumnName("referencecode");
            entity.Property(e => e.Subaccount)
                .HasMaxLength(50)
                .HasColumnName("subaccount");
            entity.Property(e => e.Transactiondate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("transactiondate");
            entity.Property(e => e.Transferamount)
                .HasPrecision(18, 2)
                .HasColumnName("transferamount");
            entity.Property(e => e.Transfertype)
                .HasMaxLength(10)
                .HasColumnName("transfertype");
        });
        modelBuilder.Entity<category>(entity =>
        {
            entity.HasKey(e => e.category_id).HasName("categories_pkey");

            entity.ToTable(tb => tb.HasComment("Danh mục sản phẩm (ví dụ: Laptop, CPU, RAM, Phụ kiện,...)"));

            entity.Property(e => e.category_name).HasMaxLength(100);
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.parent_id).HasComment("Tham chiếu đến danh mục cha (nếu có)");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.is_disabled).HasDefaultValue(false);

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.categorycreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("categories_created_by_fkey");

            entity.HasOne(d => d.parent).WithMany(p => p.Inverseparent)
                .HasForeignKey(d => d.parent_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("categories_parent_id_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.categoryupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("categories_updated_by_fkey");
        });

        modelBuilder.Entity<faq>(entity =>
        {
            entity.HasKey(e => e.faq_id).HasName("faq_pkey");

            entity.ToTable("faq", tb => tb.HasComment("Câu hỏi thường gặp (FAQ) của khách hàng"));

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.faqcreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("faq_created_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.faqupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("faq_updated_by_fkey");
        });

        modelBuilder.Entity<log>(entity =>
        {
            entity.HasKey(e => e.log_id).HasName("logs_pkey");

            entity.ToTable(tb => tb.HasComment("Lưu lịch sử thao tác của người dùng: xem, thêm giỏ hàng, đăng nhập,..."));

            entity.Property(e => e.action_type).HasMaxLength(100);
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.product).WithMany(p => p.logs)
                .HasForeignKey(d => d.product_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("logs_product_id_fkey");

            entity.HasOne(d => d.user).WithMany(p => p.logs)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("logs_user_id_fkey");
        });

        modelBuilder.Entity<order>(entity =>
        {
            entity.HasKey(e => e.order_id).HasName("orders_pkey");

            entity.ToTable(tb => tb.HasComment("Thông tin đơn hàng của khách hàng"));

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.order_date).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'pending'::character varying");
            entity.Property(e => e.total_amount)
                .HasPrecision(15, 2)
                .HasDefaultValueSql("0");
            entity.Property(e => e.types)
                .HasMaxLength(20)
                .HasDefaultValueSql("'COD'")
                .HasComment("Loại thanh toán: COD, Transfer, ATM");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.ordercreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_created_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.orderupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_updated_by_fkey");

            entity.HasOne(d => d.user).WithMany(p => p.orderusers)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_user_id_fkey");
        });

        modelBuilder.Entity<order_detail>(entity =>
        {
            entity.HasKey(e => new { e.order_id, e.product_id }).HasName("order_details_pkey");

            entity.ToTable(tb => tb.HasComment("Chi tiết các sản phẩm trong mỗi đơn hàng"));

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.image_url).HasComment("Lưu ảnh sản phẩm tại thời điểm mua");
            entity.Property(e => e.price_at_purchase).HasPrecision(15, 2);
            entity.Property(e => e.product_name)
                .HasMaxLength(255)
                .HasComment("Lưu tên sản phẩm tại thời điểm mua để giữ lịch sử");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.order_detailcreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("order_details_created_by_fkey");

            // Configure relationship with order: order_details.order_id -> orders.order_id
            entity.HasOne(d => d.order)
                .WithMany(p => p.order_details)
                .HasForeignKey(d => d.order_id)
                .HasConstraintName("order_details_order_id_fkey");

            // Configure relationship with product: order_details.product_id -> products.product_id
            // IMPORTANT: Foreign key is on order_details.product_id, NOT on products.order_id
            entity.HasOne(d => d.product)
                .WithMany(p => p.order_details)
                .HasForeignKey(d => d.product_id)
                .HasConstraintName("order_details_product_id_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.order_detailupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("order_details_updated_by_fkey");
        });

        modelBuilder.Entity<product>(entity =>
        {
            entity.HasKey(e => e.product_id).HasName("products_pkey");

            entity.ToTable(tb => tb.HasComment("Danh sách sản phẩm bán trong cửa hàng: laptop, linh kiện, phụ kiện..."));

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.is_disabled).HasDefaultValue(false);
            entity.Property(e => e.on_prices)
                .HasPrecision(15, 2)
                .HasDefaultValueSql("0");
            entity.Property(e => e.price).HasPrecision(15, 2);
            entity.Property(e => e.product_name).HasMaxLength(255);
            entity.Property(e => e.stock).HasDefaultValue(0);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.category).WithMany(p => p.products)
                .HasForeignKey(d => d.category_id)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("products_category_id_fkey");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.productcreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("products_created_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.productupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("products_updated_by_fkey");

            entity.HasMany(d => d.promotions).WithMany(p => p.products)
                .UsingEntity<Dictionary<string, object>>(
                    "product_promotion",
                    r => r.HasOne<promotion>().WithMany()
                        .HasForeignKey("promotion_id")
                        .HasConstraintName("product_promotions_promotion_id_fkey"),
                    l => l.HasOne<product>().WithMany()
                        .HasForeignKey("product_id")
                        .HasConstraintName("product_promotions_product_id_fkey"),
                    j =>
                    {
                        j.HasKey("product_id", "promotion_id").HasName("product_promotions_pkey");
                        j.ToTable("product_promotions", tb => tb.HasComment("Liên kết nhiều sản phẩm với nhiều chương trình khuyến mãi"));
                    });
        });

        modelBuilder.Entity<promotion>(entity =>
        {
            entity.HasKey(e => e.promotion_id).HasName("promotions_pkey");

            entity.ToTable(tb => tb.HasComment("Chương trình khuyến mãi, ví dụ: giảm 10%, mua 1 tặng 1..."));

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.discount_type)
                .HasMaxLength(20)
                .HasDefaultValue("percentage")
                .HasComment("Loại khuyến mãi: percentage (phần trăm) hoặc fixed_amount (số tiền trực tiếp)");
            entity.Property(e => e.discount_value).HasPrecision(15, 2).HasComment("Giá trị khuyến mãi: phần trăm (0-100) hoặc số tiền (nếu discount_type = fixed_amount)");
            entity.Property(e => e.is_active).HasDefaultValue(true);
            entity.Property(e => e.promotion_name).HasMaxLength(150);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.banner_url).HasComment("URL banner khuyến mãi (tùy chọn)");
            entity.Property(e => e.local)
                .HasMaxLength(20)
                .HasDefaultValue("hero")
                .HasComment("Vị trí hiển thị promotion: hero (giữa trang chủ), left (bên trái), right (bên phải)");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.promotioncreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("promotions_created_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.promotionupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("promotions_updated_by_fkey");
        });

        modelBuilder.Entity<user>(entity =>
        {
            entity.HasKey(e => e.user_id).HasName("users_pkey");

            entity.ToTable(tb => tb.HasComment("Bảng lưu thông tin tài khoản người dùng (admin và customer)"));

            entity.HasIndex(e => e.email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.username, "users_username_key").IsUnique();

            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.email).HasMaxLength(150);
            entity.Property(e => e.email_confirmed).HasDefaultValue(false);
            entity.Property(e => e.is_disabled).HasDefaultValue(false);
            entity.Property(e => e.password).HasMaxLength(255);
            entity.Property(e => e.phone).HasMaxLength(20);
            entity.Property(e => e.role)
                .HasMaxLength(50)
                .HasDefaultValueSql("'customer'::character varying")
                .HasComment("Phân quyền người dùng: customer hoặc admin");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.username).HasMaxLength(100);

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.Inversecreated_byNavigation)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("users_created_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.Inverseupdated_byNavigation)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("users_updated_by_fkey");
        });

        modelBuilder.Entity<warranty>(entity =>
        {
            // Primary key chỉ là warranty_id (auto-increment)
            // Cho phép nhiều warranty cho cùng (product_id, user_id, order_id) với serial number khác nhau
            entity.HasKey(e => e.warranty_id).HasName("warranty_pkey");

            entity.ToTable("warranty", tb => tb.HasComment("Thông tin bảo hành sản phẩm (thời gian và trạng thái)"));

            // warranty_id tự động tăng bằng sequence (đã tạo trong migration script)
            entity.Property(e => e.warranty_id).ValueGeneratedOnAdd();
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.is_disabled).HasDefaultValue(false);
            
            // Serial number là bắt buộc và phải unique (bảo hành theo serial number)
            entity.Property(e => e.serial_number)
                .IsRequired()
                .HasMaxLength(100);
            
            // Tạo unique index cho serial_number
            entity.HasIndex(e => e.serial_number)
                .IsUnique()
                .HasDatabaseName("warranty_serial_number_unique");
            
            entity.Property(e => e.status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'active'::character varying");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.warrantycreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("warranty_created_by_fkey");

            entity.HasOne(d => d.order).WithMany(p => p.warranties)
                .HasForeignKey(d => d.order_id)
                .HasConstraintName("warranty_order_id_fkey");

            entity.HasOne(d => d.product).WithMany(p => p.warranties)
                .HasForeignKey(d => d.product_id)
                .HasConstraintName("warranty_product_id_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.warrantyupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("warranty_updated_by_fkey");

            entity.HasOne(d => d.user).WithMany(p => p.warrantyusers)
                .HasForeignKey(d => d.user_id)
                .HasConstraintName("warranty_user_id_fkey");

            // Cấu hình quan hệ với product_serial dựa trên serial_number (không phải foreign key ID)
            // warranty liên kết với product_serial thông qua serial_number để truy xuất thông tin về product
            // Lưu ý: Đây không phải là foreign key constraint trong database, chỉ là cách EF join để truy xuất dữ liệu
            entity.HasOne(d => d.product_serial)
                .WithMany() // product_serial không có navigation property về warranty
                .HasForeignKey(d => d.serial_number)
                .HasPrincipalKey(p => p.serial_number)
                .OnDelete(DeleteBehavior.NoAction); // serial_number là required, không thể set null
        });

        modelBuilder.Entity<cart>(entity =>
        {
            // PRIMARY KEY: (user_id, cart_id, product_id) - cho phép user có nhiều entries cho cùng product
            entity.HasKey(e => new { e.user_id, e.cart_id, e.product_id }).HasName("carts_pkey");

            entity.ToTable(tb => tb.HasComment("Giỏ hàng của khách hàng - mỗi dòng là 1 sản phẩm trong giỏ hàng"));

            entity.Property(e => e.cart_id).ValueGeneratedOnAdd();
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.price_at_add).HasPrecision(15, 2);
            entity.Property(e => e.quantity).HasDefaultValue(1);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.user).WithMany(p => p.carts)
                .HasForeignKey(d => d.user_id)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("carts_user_id_fkey");

            entity.HasOne(d => d.product).WithMany(p => p.carts)
                .HasForeignKey(d => d.product_id)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("carts_product_id_fkey");
        });

        modelBuilder.Entity<product_serial>(entity =>
        {
            entity.HasKey(e => e.serial_id).HasName("product_serials_pkey");

            entity.ToTable("product_serials", tb => tb.HasComment("Bảng quản lý serial numbers của sản phẩm trong kho"));

            entity.Property(e => e.serial_id).ValueGeneratedOnAdd();
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.is_disabled).HasDefaultValue(false)
                .HasComment("Trạng thái bảo hành: false = còn bảo hành, true = hết bảo hành");
            entity.Property(e => e.serial_number)
                .IsRequired()
                .HasMaxLength(100);
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Tạo unique index cho serial_number
            entity.HasIndex(e => e.serial_number)
                .IsUnique()
                .HasDatabaseName("product_serials_serial_number_unique");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.product_serialcreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("product_serials_created_by_fkey");

            // Note: Database thực tế KHÔNG có order_id và warranty_id, chỉ có is_sold
            // entity.HasOne(d => d.order).WithMany(p => p.product_serials)
            //     .HasForeignKey(d => d.order_id)
            //     .OnDelete(DeleteBehavior.SetNull)
            //     .HasConstraintName("product_serials_order_id_fkey");

            entity.HasOne(d => d.product).WithMany(p => p.product_serials)
                .HasForeignKey(d => d.product_id)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("product_serials_product_id_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.product_serialupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("product_serials_updated_by_fkey");

            // Note: Database thực tế KHÔNG có warranty_id
            // entity.HasOne(d => d.warranty).WithOne(p => p.product_serial)
            //     .HasForeignKey<product_serial>(d => d.warranty_id)
            //     .OnDelete(DeleteBehavior.SetNull)
            //     .HasConstraintName("product_serials_warranty_id_fkey");
        });

        modelBuilder.Entity<warranty_detail>(entity =>
        {
            entity.HasKey(e => e.detail_id).HasName("warranty_details_pkey");

            entity.ToTable("warranty_details", tb => tb.HasComment("Chi tiết từng lần bảo hành của một warranty (lần 1, 2, 3, 4...)"));

            entity.Property(e => e.detail_id).ValueGeneratedOnAdd();
            entity.Property(e => e.created_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.is_disabled).HasDefaultValue(false);
            entity.Property(e => e.status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'pending'::character varying")
                .HasComment("Trạng thái: pending, approved, processing, completed, rejected, cancelled");
            entity.Property(e => e.request_date).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.updated_at).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.cost)
                .HasPrecision(15, 2);
            entity.Property(e => e.description).HasMaxLength(1000);
            entity.Property(e => e.solution).HasMaxLength(1000);
            entity.Property(e => e.notes).HasMaxLength(500);
            entity.Property(e => e.image_urls).HasComment("Ảnh minh chứng (có thể lưu JSON array)");
            entity.Property(e => e.history_json)
                .HasColumnType("TEXT")
                .HasComment("Lịch sử thay đổi trạng thái và ghi chú (JSON array)");

            // Tạo unique constraint cho (warranty_id, claim_number) để đảm bảo không trùng lặp
            entity.HasIndex(e => new { e.warranty_id, e.claim_number })
                .IsUnique()
                .HasDatabaseName("warranty_details_warranty_claim_unique");

            entity.HasOne(d => d.created_byNavigation).WithMany(p => p.warranty_detailcreated_byNavigations)
                .HasForeignKey(d => d.created_by)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("warranty_details_created_by_fkey");

            entity.HasOne(d => d.handled_byNavigation).WithMany(p => p.warranty_detailhandled_byNavigations)
                .HasForeignKey(d => d.handled_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("warranty_details_handled_by_fkey");

            entity.HasOne(d => d.updated_byNavigation).WithMany(p => p.warranty_detailupdated_byNavigations)
                .HasForeignKey(d => d.updated_by)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("warranty_details_updated_by_fkey");

            entity.HasOne(d => d.warranty).WithMany(p => p.warranty_details)
                .HasForeignKey(d => d.warranty_id)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("warranty_details_warranty_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);

    /// <summary>
    /// Override SaveChangesAsync để tự động tạo serial khi stock tăng
    /// Tự động tạo serial numbers khi stock của sản phẩm thay đổi
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Lấy danh sách các product đã thay đổi và lưu thông tin cần thiết
        var changedProducts = ChangeTracker.Entries<product>()
            .Where(e => (e.State == EntityState.Modified && e.Property(p => p.stock).IsModified) 
                     || e.State == EntityState.Added)
            .Select(e => new 
            { 
                Entry = e, 
                ProductId = e.Entity.product_id, 
                Stock = e.Entity.stock ?? 0,
                IsAdded = e.State == EntityState.Added
            })
            .ToList();

        // Lưu thay đổi của product trước để có product_id (đặc biệt với product mới)
        // Gọi base để tránh recursive call
        var result = await base.SaveChangesAsync(cancellationToken);

        // Sau khi lưu product, kiểm tra và tạo serial cho các sản phẩm cần thiết
        if (changedProducts.Any())
        {
            var productsToCreateSerials = new List<(int productId, int quantity)>();

            foreach (var item in changedProducts)
            {
                // Lấy product_id sau khi save (quan trọng cho product mới)
                var productId = item.IsAdded ? item.Entry.Entity.product_id : item.ProductId;
                var currentStock = item.Stock;

                if (currentStock > 0 && productId > 0)
                {
                    // Đếm số serial hiện có trong database (chưa bán: is_sold = false, còn bảo hành: is_disabled = false)
                    var existingSerialsCount = await product_serials
                        .Where(ps => ps.product_id == productId 
                                  && (ps.is_disabled == null || ps.is_disabled == false)
                                  && (ps.is_sold == null || ps.is_sold == false))
                        .CountAsync(cancellationToken);

                    // Tính số serial cần tạo thêm để đảm bảo số serial = stock
                    var serialsNeeded = currentStock - existingSerialsCount;

                    if (serialsNeeded > 0)
                    {
                        productsToCreateSerials.Add((productId, serialsNeeded));
                    }
                }
            }

            // Tạo serial cho các sản phẩm cần thiết
            if (productsToCreateSerials.Any())
            {
                await CreateProductSerialsForChangedProducts(productsToCreateSerials, cancellationToken);
            }
        }

        return result;
    }

    /// <summary>
    /// Tạo serial numbers cho các sản phẩm có stock tăng
    /// </summary>
    private async Task CreateProductSerialsForChangedProducts(
        List<(int productId, int quantity)> productsToCreate, 
        CancellationToken cancellationToken = default)
    {
        if (!productsToCreate.Any()) return;

        var serialsToAdd = new List<product_serial>();
        var timestamp = DateTime.UtcNow;

        foreach (var (productId, quantity) in productsToCreate)
        {
            if (quantity <= 0) continue;

            var baseTimestamp = timestamp.ToString("yyyyMMddHHmmssfff");

            for (int i = 0; i < quantity; i++)
            {
                // Tạo serial number unique: PRD-{productId}-{timestamp}-{index}
                var serialNumber = $"PRD-{productId}-{baseTimestamp}-{(i + 1):D6}";

                serialsToAdd.Add(new product_serial
                {
                    product_id = productId,
                    serial_number = serialNumber,
                    import_date = timestamp,
                    is_sold = false,
                    is_disabled = false,
                    created_at = timestamp,
                    updated_at = timestamp,
                    created_by = SYSTEM_ADMIN_ID,
                    updated_by = SYSTEM_ADMIN_ID
                });
            }
        }

        if (serialsToAdd.Any())
        {
            product_serials.AddRange(serialsToAdd);
            // Gọi base.SaveChangesAsync để lưu serial, không gọi lại override method
            await base.SaveChangesAsync(cancellationToken);
        }
    }
}
