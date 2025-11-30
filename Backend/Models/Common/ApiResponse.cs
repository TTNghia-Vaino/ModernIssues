using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using ModernIssues.Helpers;

namespace ModernIssues.Models.Common
{
    public class ApiResponse<T>
    {
        private static IHttpContextAccessor? _httpContextAccessor;

        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public List<string>? Errors { get; set; }
        public string? RequestId { get; set; }

        /// <summary>
        /// Sets the HttpContextAccessor for retrieving request ID
        /// </summary>
        public static void SetHttpContextAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Gets the current request ID from HttpContext
        /// </summary>
        private static string? GetCurrentRequestId()
        {
            var httpContext = _httpContextAccessor?.HttpContext;
            return httpContext != null ? RequestIdHelper.GetRequestId(httpContext) : null;
        }

        /// <summary>
        /// Creates a success response. HttpContext is optional and will be used to extract request ID.
        /// </summary>
        public static ApiResponse<T> SuccessResponse(T data, string message = "Success", HttpContext? httpContext = null)
        {
            var requestId = httpContext != null 
                ? RequestIdHelper.GetRequestId(httpContext) 
                : GetCurrentRequestId();

            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                Data = data,
                RequestId = requestId
            };
        }

        /// <summary>
        /// Creates an error response. HttpContext is optional and will be used to extract request ID.
        /// </summary>
        public static ApiResponse<T> ErrorResponse(string message, List<string>? errors = null, HttpContext? httpContext = null)
        {
            var requestId = httpContext != null 
                ? RequestIdHelper.GetRequestId(httpContext) 
                : GetCurrentRequestId();

            return new ApiResponse<T>
            {
                Success = false,
                Message = message,
                Errors = errors,
                RequestId = requestId
            };
        }
    }
}