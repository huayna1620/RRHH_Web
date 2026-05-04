# Demo Temporal por Internet (desde tu PC)

Este flujo publica una demo temporal usando Cloudflare Tunnel, sin despliegue formal.

No cambia logica del sistema, no cambia base de datos y no modifica funcionalidad.

## Archivos de automatizacion

- `scripts/demo/start-backend-demo.ps1`
- `scripts/demo/start-backend-tunnel.ps1`
- `scripts/demo/start-frontend-demo.ps1`
- `scripts/demo/start-frontend-tunnel.ps1`

## Requisitos

1. Tener `dotnet` y `npm` funcionando en tu PC.
2. Tener `cloudflared` instalado:

```powershell
winget install --id Cloudflare.cloudflared -e
```

## Orden correcto de ejecucion

Abre 4 terminales PowerShell en la raiz del repo: `c:\Users\huayn\Downloads\RRHH_Web`

### 1) Terminal A: backend local (primera vez, sin FRONTEND_URL)

```powershell
.\scripts\demo\start-backend-demo.ps1
```

### 2) Terminal B: tunel del backend

```powershell
.\scripts\demo\start-backend-tunnel.ps1
```

Cloudflared mostrara una URL tipo:

`https://xxxx.trycloudflare.com`

Esa URL es tu `BACKEND_URL` (copiala).

### 3) Terminal C: frontend local apuntando al backend publico

Pega tu `BACKEND_URL` aqui:

```powershell
.\scripts\demo\start-frontend-demo.ps1 -BackendUrl "https://xxxx.trycloudflare.com"
```

### 4) Terminal D: tunel del frontend

```powershell
.\scripts\demo\start-frontend-tunnel.ps1
```

Cloudflared mostrara otra URL tipo:

`https://yyyy.trycloudflare.com`

Esa URL es tu `FRONTEND_URL` (copiala).

### 5) Reiniciar backend con CORS de demo

Vuelve a la Terminal A, detiene backend con `Ctrl + C`, y ejecuta:

```powershell
.\scripts\demo\start-backend-demo.ps1 -FrontendUrl "https://yyyy.trycloudflare.com"
```

Aqui pegas tu `FRONTEND_URL` para `Cors__AllowedOrigins__0`.

## Como probar desde otro dispositivo

1. Desde otro dispositivo (idealmente con otra red), abre `FRONTEND_URL`.
2. Inicia sesion y navega modulos.
3. Verifica que cargan datos (no solo interfaz).
4. Si algo falla, confirma que:
- frontend sigue corriendo en Terminal C
- backend sigue corriendo en Terminal A
- ambos tuneles siguen activos (Terminales B y D)
- `BackendUrl` y `FrontendUrl` pegados sean los actuales (los URLs cambian si reinicias tunel)

## Como apagar la demo

1. Presiona `Ctrl + C` en las 4 terminales.
2. Con eso se cierran backend, frontend y ambos tuneles.
3. El enlace publico deja de funcionar inmediatamente.

