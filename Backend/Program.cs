using Microsoft.EntityFrameworkCore;
using ModernIssues.Models.Configurations;
using ModernIssues.Services;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories; // Cần cho IProductRepository và ProductRepository
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using System.Reflection;
using System.IO;
using Microsoft.OpenApi.Models;



var builder = WebApplication.CreateBuilder(args);


builder.Services.AddHttpContextAccessor();
// Add services to the container.

builder.Services.AddHttpContextAccessor();
builder.Services.Configure<SepayConfig>(builder.Configuration.GetSection("SepayConfig"));
builder.Services.AddDbContext<WebDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDistributedMemoryCache(); 
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); 
    options.Cookie.HttpOnly = true; 
    options.Cookie.IsEssential = true; 
});


// 1. Đăng ký Repository (Tầng Data Access)
builder.Services.AddScoped<IProductRepository, ProductRepository>();

// 2. Đăng ký Service (Tầng Business Logic)
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddSwaggerGen(options =>
{
    // Cấu hình OpenApiInfo (đã đúng, giữ nguyên)
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Modern Issues E-commerce API",
        Version = "v1",
        Description = "Hệ thống API Backend cho quản lý sản phẩm, đơn hàng, và người dùng."
    });
    
    // === FIX CUỐI CÙNG: Đường dẫn tuyệt đối an toàn hơn ===
    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    
    // Sử dụng AppDomain.CurrentDomain.BaseDirectory để đảm bảo độ chính xác cao
    var xmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, xmlFilename); 
    
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
    }
    // =======================================================
});



var app = builder.Build();

// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
//    app.UseSwagger();
//    app.UseSwaggerUI();
//}



app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Modern Issues - API V1");
});

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
