using Microsoft.AspNetCore.Http;
using System.Diagnostics;

namespace ModernIssues.Helpers
{
    /// <summary>
    /// Middleware to generate and track request IDs for API requests
    /// </summary>
    public class RequestIdMiddleware
    {
        private readonly RequestDelegate _next;
        private const string RequestIdHeader = "X-Request-ID";
        private const string RequestIdItemKey = "RequestId";

        public RequestIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Check if request ID is already provided in headers
            var requestId = context.Request.Headers[RequestIdHeader].FirstOrDefault();

            // If not provided, generate a new GUID
            if (string.IsNullOrEmpty(requestId))
            {
                requestId = Guid.NewGuid().ToString();
            }

            // Store request ID in HttpContext items for easy access
            context.Items[RequestIdItemKey] = requestId;

            // Add request ID to response headers
            context.Response.Headers[RequestIdHeader] = requestId;

            // Add request ID to Activity for distributed tracing
            Activity.Current?.SetTag("request.id", requestId);

            // Log request start
            var method = context.Request.Method;
            var path = context.Request.Path;
            var queryString = context.Request.QueryString;
            Console.WriteLine($"[{requestId}] {method} {path}{queryString} - Request started");

            try
            {
                await _next(context);
                
                // Log request completion
                var statusCode = context.Response.StatusCode;
                Console.WriteLine($"[{requestId}] {method} {path} - Request completed with status {statusCode}");
            }
            catch (Exception ex)
            {
                // Log error with request ID
                Console.WriteLine($"[{requestId}] {method} {path} - Request failed: {ex.Message}");
                Console.WriteLine($"[{requestId}] StackTrace: {ex.StackTrace}");
                throw;
            }
        }
    }

    /// <summary>
    /// Helper class to retrieve request ID from HttpContext
    /// </summary>
    public static class RequestIdHelper
    {
        private const string RequestIdItemKey = "RequestId";

        /// <summary>
        /// Gets the current request ID from HttpContext
        /// </summary>
        /// <param name="httpContext">The HTTP context</param>
        /// <returns>The request ID or null if not available</returns>
        public static string? GetRequestId(HttpContext httpContext)
        {
            return httpContext.Items[RequestIdItemKey]?.ToString();
        }
    }
}


