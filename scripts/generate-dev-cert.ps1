$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $root "certs"
$pfxPath = Join-Path $certsDir "localhost-dev.pfx"
$infPath = Join-Path $certsDir "localhost-dev.inf"
$cerPath = Join-Path $certsDir "localhost-dev.cer"
$passphrasePlain = if ($env:HTTPS_PFX_PASSPHRASE) { $env:HTTPS_PFX_PASSPHRASE } else { "quickpick-local-dev" }

New-Item -ItemType Directory -Path $certsDir -Force | Out-Null

foreach ($path in @($pfxPath, $infPath, $cerPath)) {
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
    }
}

$infContent = @"
[Version]
Signature="$Windows NT$"

[NewRequest]
Subject = "CN=localhost"
Exportable = TRUE
KeyLength = 2048
KeySpec = 1
KeyUsage = 0xa0
MachineKeySet = FALSE
ProviderName = "Microsoft RSA SChannel Cryptographic Provider"
ProviderType = 12
RequestType = Cert
HashAlgorithm = sha256
SMIME = FALSE
FriendlyName = "Quickpick Local HTTPS"

[Extensions]
2.5.29.17 = "{text}"
_continue_ = "dns=localhost"
2.5.29.37 = "{text}1.3.6.1.5.5.7.3.1"
"@

Set-Content -LiteralPath $infPath -Value $infContent

& certreq -new -user $infPath $cerPath | Out-Null
& certreq -accept -user $cerPath | Out-Null

$thumbprint = (& certutil -user -store My localhost) -match "Cert Hash\(sha1\):" | ForEach-Object {
    ($_ -split ":", 2)[1].Trim().Replace(" ", "")
} | Select-Object -First 1

if (-not $thumbprint) {
    throw "Certificate was created but its thumbprint could not be found."
}

& certutil -user -p $passphrasePlain -exportPFX My $thumbprint $pfxPath | Out-Null

Write-Host "Local HTTPS certificate created at $pfxPath"
Write-Host "Passphrase in use: $passphrasePlain"
