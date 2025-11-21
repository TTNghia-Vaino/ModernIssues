# Script to update ApiResponse calls to include HttpContext parameter
$files = @(
    "Controllers\PromotionController.cs",
    "Controllers\ProductController.cs",
    "Controllers\WarrantyController.cs",
    "Controllers\UserController.cs",
    "Controllers\OrderController.cs",
    "Controllers\CheckoutController.cs",
    "Controllers\CategoryController.cs",
    "Controllers\CartController.cs",
    "Controllers\AuthController.cs"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..."
        $content = Get-Content $file -Raw
        
        # Update SuccessResponse with 2 parameters: data, message
        $content = $content -replace 'ApiResponse<([^>]+)>\.SuccessResponse\(([^,]+),\s*([^)]+)\)', 'ApiResponse<$1>.SuccessResponse($2, $3, HttpContext)'
        
        # Update SuccessResponse with 1 parameter: data (default message)
        $content = $content -replace 'ApiResponse<([^>]+)>\.SuccessResponse\(([^)]+)\)(?!\s*,\s*HttpContext)', 'ApiResponse<$1>.SuccessResponse($2, "Success", HttpContext)'
        
        # Update ErrorResponse with 2 parameters: message, errors
        $content = $content -replace 'ApiResponse<([^>]+)>\.ErrorResponse\(([^,]+),\s*([^)]+)\)', 'ApiResponse<$1>.ErrorResponse($2, $3, HttpContext)'
        
        # Update ErrorResponse with 1 parameter: message only
        $content = $content -replace 'ApiResponse<([^>]+)>\.ErrorResponse\(([^)]+)\)(?!\s*,\s*HttpContext)', 'ApiResponse<$1>.ErrorResponse($2, null, HttpContext)'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Updated $file"
    }
}

Write-Host "Done!"


