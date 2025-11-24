# PowerShell script to test 2FA Setup API
# Usage: .\test-2fa-api.ps1

$baseUrl = "http://localhost:5273"  # Local backend URL (change to http://35.232.61.38:5000 for server)
$email = "tranvanminhk16@gmail.com"
$password = "123123123"

Write-Host "=== Test 2FA Setup API ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "[1/3] Đang đăng nhập..." -ForegroundColor Yellow
$loginBody = @{
    Email = $email
    Password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/v1/Auth/Login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -SessionVariable session `
        -UseBasicParsing
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    Write-Host "✓ Đăng nhập thành công!" -ForegroundColor Green
    Write-Host "  Username: $($loginData.username)" -ForegroundColor Gray
    Write-Host ""
    
    # Step 2: Setup 2FA
    Write-Host "[2/3] Đang setup 2FA..." -ForegroundColor Yellow
    $setupBody = @{
        Method = "authenticator"
    } | ConvertTo-Json
    
    try {
        $setupResponse = Invoke-WebRequest -Uri "$baseUrl/v1/Auth/2fa/setup" `
            -Method POST `
            -Body $setupBody `
            -ContentType "application/json" `
            -WebSession $session `
            -UseBasicParsing
        
        $setupData = $setupResponse.Content | ConvertFrom-Json
        Write-Host "✓ Setup 2FA thành công!" -ForegroundColor Green
        Write-Host "  Secret: $($setupData.secret)" -ForegroundColor Gray
        Write-Host "  Manual Entry Key: $($setupData.manualEntryKey)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "QR Code đã được tạo (base64 length: $($setupData.qrCodeDataUrl.Length))" -ForegroundColor Gray
        Write-Host ""
        
        # Step 3: Prompt for verification code
        Write-Host "[3/3] Verify 2FA Setup" -ForegroundColor Yellow
        $code = Read-Host "Nhập mã 6 số từ Authenticator app"
        
        if ($code -match '^\d{6}$') {
            $verifyBody = @{
                Code = $code
            } | ConvertTo-Json
            
            try {
                $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/v1/Auth/2fa/verify-setup" `
                    -Method POST `
                    -Body $verifyBody `
                    -ContentType "application/json" `
                    -WebSession $session `
                    -UseBasicParsing
                
                $verifyData = $verifyResponse.Content | ConvertFrom-Json
                Write-Host "✓ Verify thành công! 2FA đã được kích hoạt." -ForegroundColor Green
                Write-Host ""
                Write-Host "Recovery Codes:" -ForegroundColor Cyan
                $verifyData.recoveryCodes | ForEach-Object {
                    Write-Host "  - $_" -ForegroundColor Yellow
                }
            }
            catch {
                Write-Host "✗ Verify thất bại!" -ForegroundColor Red
                Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
                if ($_.Exception.Response) {
                    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                    $responseBody = $reader.ReadToEnd()
                    Write-Host "  Response: $responseBody" -ForegroundColor Red
                }
            }
        }
        else {
            Write-Host "✗ Mã không hợp lệ (phải là 6 số)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "✗ Setup 2FA thất bại!" -ForegroundColor Red
        Write-Host "  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Response: $responseBody" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "✗ Đăng nhập thất bại!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test hoàn tất ===" -ForegroundColor Cyan

