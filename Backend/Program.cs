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
builder.Services.AddControllers()
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
    options.Cookie.HttpOnly = true; 
    options.Cookie.IsEssential = true; 
});

// Add SignalR for real-time notifications
builder.Services.AddSignalR();

// Add CORS to allow SePay webhook and SignalR connections
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSePayWebhook", policy =>
    {
        policy.AllowAnyOrigin()  // SePay webhook and SignalR can come from any origin
              .AllowAnyMethod()   // Allow POST for webhook, GET/POST for SignalR
              .AllowAnyHeader()   // Allow Authorization header
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
