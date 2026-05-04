param(
    [int]$Port = 7177,
    [ValidateSet("http", "https")]
    [string]$Scheme = "https"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw "cloudflared no esta instalado. Instala con: winget install --id Cloudflare.cloudflared -e"
}

$url = "${Scheme}://localhost:$Port"
Write-Host "Abriendo tunel Cloudflare para backend: $url" -ForegroundColor Green
Write-Host "Copia la URL https://*.trycloudflare.com que aparezca en pantalla (BACKEND_URL)." -ForegroundColor Cyan

cloudflared tunnel --url $url --no-tls-verify
