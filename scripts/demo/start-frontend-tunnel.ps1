param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    throw "cloudflared no esta instalado. Instala con: winget install --id Cloudflare.cloudflared -e"
}

$url = "http://localhost:$Port"
Write-Host "Abriendo tunel Cloudflare para frontend: $url" -ForegroundColor Green
Write-Host "Copia la URL https://*.trycloudflare.com que aparezca en pantalla (FRONTEND_URL)." -ForegroundColor Cyan

cloudflared tunnel --url $url
