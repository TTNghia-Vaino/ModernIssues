using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using ModernIssues.Models.Configurations;
using ModernIssues.Services;
using ModernIssues.Models.Entities;
using ModernIssues.Repositories; // Cần cho IProductRepository và ProductRepository
using ModernIssues.Repositories.Interface;
using ModernIssues.Repositories.Service;
using ModernIssues.Hubs;
using System.Reflection;
using System.IO;
using Microsoft.OpenApi.Models;
using ModernIssues.Helpers;
using Microsoft.AspNetCore.Http;
using ModernIssues.Models.Common;



var builder = WebApplication.CreateBuilder(args);


// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<SepayConfig>(builder.Configuration.GetSection("SepayConfig"));
builder.Services.Configure<HooksConfig>(builder.Configuration.GetSection("HooksConfig"));
builder.Services.AddDbContext<WebDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IHooksService, HooksService>();
builder.Services.AddScoped<ITwoFactorAuthService, TwoFactorAuthService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.SuppressModelStateInvalidFilter = true;
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache(); 
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30); 
    options.Cookie.HttpOnly = false; // Allow JavaScript access for debugging
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.None; // None for cross-origin requests
    options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Allow HTTP
    options.Cookie.Path = "/"; // Ensure cookie is sent for all paths
    options.Cookie.Domain = null; // Don't set domain restriction
    options.Cookie.Name = "ModernIssues.Session"; // Explicit session name
});

// Add SignalR for real-time notifications
builder.Services.AddSignalR();

// Add CORS to allow SePay webhook and SignalR connections
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSePayWebhook", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:5173",      // Local frontend dev
                  "http://127.0.0.1:5173",
                  "http://35.232.61.38",        // Production frontend (port 80)
                  "http://35.232.61.38:80",     // Explicit port 80
                  "http://35.232.61.38:5000",   // Backend server
                  "https://35.232.61.38",       // HTTPS version
                  "https://35.232.61.38:443")   // HTTPS explicit port
              .AllowAnyMethod()   // Allow POST/PUT/GET etc.
              .AllowAnyHeader()   // Allow Authorization header
              .AllowCredentials() // Allow cookies/session for authentication
              .WithExposedHeaders("Content-Type", "Authorization");
    });
});



// 1. Đăng ký Repository (Tầng Data Access)
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICartRepository, CartRepository>();
builder.Services.AddScoped<ICheckoutRepository, CheckoutRepository>();

// 2. Đăng ký Service (Tầng Business Logic)
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ICartService, CartService>();
builder.Services.AddScoped<ICheckoutService, CheckoutService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddSwaggerGen(c =>
{
    c.SupportNonNullableReferenceTypes();
    c.OperationFilter<FileUploadOperation>();
    
    // Cấu hình OpenApiInfo
    c.SwaggerDoc("v1", new OpenApiInfo
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
        c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
    }
    // =======================================================
});



var app = builder.Build();

// Set HttpContextAccessor for ApiResponse to access request ID
var httpContextAccessor = app.Services.GetRequiredService<IHttpContextAccessor>();
ApiResponse<object>.SetHttpContextAccessor(httpContextAccessor);

// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
//    app.UseSwagger();
//    app.UseSwaggerUI();
//}

app.UseSession();

// Add request ID middleware early in the pipeline
app.UseMiddleware<RequestIdMiddleware>();


app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Modern Issues - API V1");
});

// Xử lý validation errors
app.Use(async (context, next) =>
{
    var requestId = RequestIdHelper.GetRequestId(context);
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[{requestId}] Unhandled exception: {ex.Message}");
        Console.WriteLine($"[{requestId}] StackTrace: {ex.StackTrace}");
        throw;
    }
});

app.UseHttpsRedirection();

// Enable CORS for SePay webhook (must be before UseAuthorization)
app.UseCors("AllowSePayWebhook");

// Cấu hình static files để truy cập ảnh
app.UseStaticFiles();

app.UseAuthorization();

// Map SignalR Hub
app.MapHub<PaymentHub>("/paymentHub");

app.MapControllers();

app.Run();
