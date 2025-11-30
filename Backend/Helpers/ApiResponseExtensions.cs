using Microsoft.AspNetCore.Mvc;
using ModernIssues.Models.Common;

namespace ModernIssues.Helpers
{
    /// <summary>
    /// Extension methods for ControllerBase to easily create ApiResponse with request ID
    /// </summary>
    public static class ApiResponseExtensions
    {
        /// <summary>
        /// Creates a success ApiResponse with request ID from the current HttpContext
        /// </summary>
        public static ApiResponse<T> SuccessResponse<T>(this ControllerBase controller, T data, string message = "Success")
        {
            return ApiResponse<T>.SuccessResponse(data, message, controller.HttpContext);
        }

        /// <summary>
        /// Creates an error ApiResponse with request ID from the current HttpContext
        /// </summary>
        public static ApiResponse<T> ErrorResponse<T>(this ControllerBase controller, string message, List<string>? errors = null)
        {
            return ApiResponse<T>.ErrorResponse(message, errors, controller.HttpContext);
        }
    }
}


