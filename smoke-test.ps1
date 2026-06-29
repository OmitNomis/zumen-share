# Smoke test: upload -> save-as-copy (ko) -> edit -> cascade delete, all audit-logged.
# Usage: ./smoke-test.ps1 -Email you@example.com -Password yourpass
param(
    [Parameter(Mandatory)] [string]$Email,
    [Parameter(Mandatory)] [string]$Password,
    [string]$BaseUrl = "http://127.0.0.1:8090"
)
$ErrorActionPreference = "Stop"
function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }

$auth = Invoke-RestMethod "$BaseUrl/api/collections/users/auth-with-password" -Method Post `
    -Body (@{ identity = $Email; password = $Password } | ConvertTo-Json) -ContentType "application/json"
$h = @{ Authorization = $auth.token }
$uid = $auth.record.id

# 1x1 png
$png = Join-Path ([IO.Path]::GetTempPath()) "zumen-smoke.png"
[IO.File]::WriteAllBytes($png, [Convert]::FromBase64String(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="))

$oya = Invoke-RestMethod "$BaseUrl/api/collections/zumen/records" -Method Post -Headers $h `
    -Form @{ name = "smoke-test.png"; file = Get-Item $png; uploaded_by = $uid }
$ko = Invoke-RestMethod "$BaseUrl/api/collections/zumen/records" -Method Post -Headers $h `
    -Form @{ name = "smoke-test.png (copy 1)"; file = Get-Item $png; oya = $oya.id; uploaded_by = $uid }
Invoke-RestMethod "$BaseUrl/api/collections/zumen/records/$($ko.id)" -Method Patch -Headers $h `
    -Body (@{ name = "smoke-test renamed" } | ConvertTo-Json) -ContentType "application/json" | Out-Null
Invoke-RestMethod "$BaseUrl/api/collections/zumen/records/$($oya.id)" -Method Delete -Headers $h | Out-Null

# ko must be gone with its oya (cascade)
try {
    Invoke-RestMethod "$BaseUrl/api/collections/zumen/records/$($ko.id)" -Headers $h | Out-Null
    Fail "cascade delete did not remove the ko"
} catch [Microsoft.PowerShell.Commands.HttpResponseException] {}

# every action must be in the audit log, attributed to this user
$filter = [uri]::EscapeDataString("zumen_id='$($oya.id)' || zumen_id='$($ko.id)'")
$logs = (Invoke-RestMethod "$BaseUrl/api/collections/audit_logs/records?filter=$filter&perPage=50" -Headers $h).items
foreach ($a in "upload", "copy", "edit", "delete") {
    if ($logs.action -notcontains $a) { Fail "missing audit action: $a" }
}
if ($logs | Where-Object { $_.user_email -ne $Email }) { Fail "audit rows attributed to wrong user" }

Write-Host "OK: upload/copy/edit/cascade-delete all work and are audited for $Email" -ForegroundColor Green
