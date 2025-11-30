using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;
using System.Reflection;
using System.Collections.Generic;

namespace ModernIssues.Helpers
{
    public class FileUploadOperation : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            // Kiểm tra xem có IFormFile trong parameters hoặc trong DTO không
            var hasFormFile = context.MethodInfo.GetParameters()
                .Any(p => p.ParameterType == typeof(IFormFile) || 
                         HasFormFileProperty(p.ParameterType));

            if (hasFormFile)
            {
                // Chỉ áp dụng schema cụ thể cho ProductController
                if (context.MethodInfo.DeclaringType?.Name == "ProductController")
                {
                    var methodName = context.MethodInfo.Name;
                    var productSchema = CreateProductSchema(methodName);
                    
                    operation.RequestBody = new OpenApiRequestBody
                    {
                        Content = {
                            ["multipart/form-data"] = new OpenApiMediaType
                            {
                                Schema = productSchema
                            }
                        }
                    };
                }
                // Cho UserController, sử dụng schema động dựa trên DTO
                else if (context.MethodInfo.DeclaringType?.Name == "UserController")
                {
                    var userSchema = CreateUserSchema(context);
                    if (userSchema != null)
                    {
                        operation.RequestBody = new OpenApiRequestBody
                        {
                            Content = {
                                ["multipart/form-data"] = new OpenApiMediaType
                                {
                                    Schema = userSchema
                                }
                            }
                        };
                    }
                }
            }
        }

        private bool HasFormFileProperty(Type type)
        {
            return type.GetProperties()
                .Any(p => p.PropertyType == typeof(IFormFile) || 
                         (p.PropertyType.IsGenericType && p.PropertyType.GetGenericTypeDefinition() == typeof(Nullable<>) && 
                          p.PropertyType.GetGenericArguments()[0] == typeof(IFormFile)));
        }

        private OpenApiSchema CreateUserSchema(OperationFilterContext context)
        {
            var methodName = context.MethodInfo.Name;
            
            // Schema cho Register
            if (methodName == "Register")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["username"] = new OpenApiSchema { Type = "string" },
                        ["password"] = new OpenApiSchema { Type = "string" },
                        ["email"] = new OpenApiSchema { Type = "string" },
                        ["phone"] = new OpenApiSchema { Type = "string" },
                        ["address"] = new OpenApiSchema { Type = "string" },
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" }
                    }
                };
            }
            
            // Schema cho UpdateProfile
            if (methodName == "UpdateProfile")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["phone"] = new OpenApiSchema { Type = "string" },
                        ["address"] = new OpenApiSchema { Type = "string" },
                        ["email"] = new OpenApiSchema { Type = "string" },
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" }
                    }
                };
            }
            
            // Schema cho UploadAvatar
            if (methodName == "UploadAvatar")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["avatarFile"] = new OpenApiSchema { Type = "string", Format = "binary" },
                        ["currentAvatarUrl"] = new OpenApiSchema { Type = "string" }
                    }
                };
            }
            
            return null!;
        }

        private OpenApiSchema CreateProductSchema(string methodName)
        {
            // Schema cho CreateProduct
            if (methodName == "CreateProduct")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["productName"] = new OpenApiSchema { Type = "string", Description = "Tên sản phẩm" },
                        ["description"] = new OpenApiSchema { Type = "string", Description = "Mô tả sản phẩm" },
                        ["price"] = new OpenApiSchema { Type = "number", Format = "decimal", Description = "Giá sản phẩm" },
                        ["categoryId"] = new OpenApiSchema { Type = "integer", Description = "ID danh mục" },
                        ["stock"] = new OpenApiSchema { Type = "integer", Description = "Số lượng tồn kho" },
                        ["warrantyPeriod"] = new OpenApiSchema { Type = "integer", Description = "Thời gian bảo hành (tháng)" },
                        ["specifications"] = new OpenApiSchema { Type = "string", Description = "Thông số kỹ thuật (Format: RAM<bold>: 16GB ; CPU<bold>: Intel Core i7)" },
                        ["imageFile"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ nhất (bắt buộc)" },
                        ["imageFile2"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ hai (bắt buộc)" },
                        ["imageFile3"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ ba (bắt buộc)" }
                    },
                    Required = new HashSet<string> { "productName", "price", "categoryId", "imageFile", "imageFile2", "imageFile3" }
                };
            }
            
            // Schema cho UpdateProduct
            if (methodName == "UpdateProduct")
            {
                return new OpenApiSchema
                {
                    Type = "object",
                    Properties = {
                        ["productName"] = new OpenApiSchema { Type = "string", Description = "Tên sản phẩm" },
                        ["description"] = new OpenApiSchema { Type = "string", Description = "Mô tả sản phẩm" },
                        ["price"] = new OpenApiSchema { Type = "number", Format = "decimal", Description = "Giá sản phẩm" },
                        ["categoryId"] = new OpenApiSchema { Type = "integer", Description = "ID danh mục" },
                        ["stock"] = new OpenApiSchema { Type = "integer", Description = "Số lượng tồn kho" },
                        ["warrantyPeriod"] = new OpenApiSchema { Type = "integer", Description = "Thời gian bảo hành (tháng)" },
                        ["specifications"] = new OpenApiSchema { Type = "string", Description = "Thông số kỹ thuật (Format: RAM<bold>: 16GB ; CPU<bold>: Intel Core i7)" },
                        ["imageFile"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ nhất (tùy chọn - upload mới)" },
                        ["currentImageUrl"] = new OpenApiSchema { Type = "string", Description = "URL ảnh thứ nhất hiện tại (nếu không upload mới)" },
                        ["imageFile2"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ hai (tùy chọn - upload mới)" },
                        ["currentImageUrl2"] = new OpenApiSchema { Type = "string", Description = "URL ảnh thứ hai hiện tại (nếu không upload mới)" },
                        ["imageFile3"] = new OpenApiSchema { Type = "string", Format = "binary", Description = "Ảnh thứ ba (tùy chọn - upload mới)" },
                        ["currentImageUrl3"] = new OpenApiSchema { Type = "string", Description = "URL ảnh thứ ba hiện tại (nếu không upload mới)" }
                    },
                    Required = new HashSet<string> { "productName", "price", "categoryId" }
                };
            }
            
            // Schema mặc định cho các method khác
            return new OpenApiSchema
            {
                Type = "object",
                Properties = {
                    ["productName"] = new OpenApiSchema { Type = "string" },
                    ["description"] = new OpenApiSchema { Type = "string" },
                    ["price"] = new OpenApiSchema { Type = "number", Format = "decimal" },
                    ["categoryId"] = new OpenApiSchema { Type = "integer" },
                    ["stock"] = new OpenApiSchema { Type = "integer" },
                    ["warrantyPeriod"] = new OpenApiSchema { Type = "integer" },
                    ["specifications"] = new OpenApiSchema { Type = "string" },
                    ["imageFile"] = new OpenApiSchema { Type = "string", Format = "binary" },
                    ["imageFile2"] = new OpenApiSchema { Type = "string", Format = "binary" },
                    ["imageFile3"] = new OpenApiSchema { Type = "string", Format = "binary" }
                }
            };
        }
    }
}
