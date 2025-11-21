# Test Webhook Script for SePay Payment Notification
# Usage: .\test-webhook.ps1

$webhookUrl = "http://35.232.61.38:5000/Hooks/transaction"
$apiKey = "Acer-Aspire7-Vaino"

# Test data với gencode từ QR
$gencode = "ORDER_253_20251121225507_1802C241"
$orderId = 253
$amount = 4000.00

$body = @{
    gateway = "sepay"
    transactiondate = "2025-11-21 22:48:30"
    accountnumber = "0886224909"
    code = "TEST123"
    content = "Test payment"
    transfertype = "IN"
    transferamount = $amount
    accumulated = 10000000
    subaccount = $null
    referencecode = "TEST_REF_$(Get-Date -Format 'yyyyMMddHHmmss')"
    description = $gencode
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Apikey $apiKey"
    "Content-Type" = "application/json"
}

Write-Host "Testing webhook với gencode: $gencode" -ForegroundColor Cyan
Write-Host "URL: $webhookUrl" -ForegroundColor Cyan
Write-Host "Body: $body" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Headers $headers -Body $body
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

