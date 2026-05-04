using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Integrations;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

/// <summary>
/// Gestión de integraciones: API tokens y Webhooks.
/// Permite conectar sistemas externos al HRMS de forma segura.
///
/// **Importante:** este controlador solo acepta autenticación JWT. Los API tokens
/// (hrms_*) no pueden crear, listar ni revocar otros tokens — es una salvaguarda
/// contra escalado de privilegios si un token se filtra.
/// </summary>
[ApiController]
[Route("api/v1/integrations")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Policy = AppPermissions.IntegrationsManage)]
[Produces("application/json")]
public sealed class IntegrationsController(
    IIntegrationService integrationService,
    ICalendarFeedService calendarFeedService,
    IGoogleCalendarOAuthService googleOAuth,
    IMicrosoftCalendarOAuthService microsoftOAuth) : ControllerBase
{
    private string GetUserName() => User.FindFirstValue(ClaimTypes.Name) ?? "system";

    private Guid GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    // ── API Tokens ────────────────────────────────────────────────────────

    /// <summary>Lista todos los tokens de API activos</summary>
    /// <remarks>
    /// Los tokens permiten a sistemas externos autenticarse con la API del HRMS.
    /// El valor del token solo se muestra en el momento de su creación.
    /// </remarks>
    /// <response code="200">Lista de tokens de API</response>
    [HttpGet("tokens")]
    [ProducesResponseType(typeof(IReadOnlyList<ApiTokenDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTokens(CancellationToken cancellationToken)
    {
        var result = await integrationService.GetTokensAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>Crea un nuevo token de API</summary>
    /// <remarks>
    /// El token generado se muestra **solo una vez**. Guárdalo en un lugar seguro.
    ///
    /// **Scopes disponibles:**
    /// - `employees:read` — Leer datos de empleados
    /// - `employees:write` — Crear y editar empleados
    /// - `payroll:read` — Leer planillas
    /// - `attendance:read` — Leer registros de asistencia
    /// - `reports:read` — Generar reportes
    ///
    /// **Ejemplo de uso del token:**
    /// ```
    /// Authorization: Bearer hrms_eyJhbGci...
    /// ```
    /// </remarks>
    /// <response code="201">Token creado. Contiene el valor completo del token.</response>
    [HttpPost("tokens")]
    [ProducesResponseType(typeof(ApiTokenCreatedDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateToken([FromBody] CreateApiTokenRequestDto request, CancellationToken cancellationToken)
    {
        var result = await integrationService.CreateTokenAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/integrations/tokens/{result.Id}", result);
    }

    /// <summary>Revoca un token de API</summary>
    /// <remarks>
    /// Una vez revocado, el token queda inutilizable de forma permanente.
    /// </remarks>
    /// <param name="id">ID del token a revocar</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    /// <response code="204">Token revocado exitosamente</response>
    /// <response code="404">Token no encontrado</response>
    [HttpDelete("tokens/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeToken(Guid id, CancellationToken cancellationToken)
    {
        var revoked = await integrationService.RevokeTokenAsync(id, cancellationToken);
        return revoked ? NoContent() : NotFound();
    }

    /// <summary>Rota el valor de un token manteniendo su Id, scopes y expiración</summary>
    /// <remarks>
    /// Útil cuando sospechas que un token pudo filtrarse: el nuevo valor se devuelve una sola
    /// vez y el valor anterior deja de ser válido inmediatamente.
    ///
    /// A diferencia de revocar + crear, aquí el **Id del token no cambia**, así que los
    /// registros de auditoría y los logs que lo referencian siguen siendo válidos.
    /// </remarks>
    /// <param name="id">ID del token a rotar</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    /// <response code="200">Token rotado. Incluye el nuevo valor (solo se muestra una vez).</response>
    /// <response code="404">Token no encontrado o inactivo</response>
    [HttpPost("tokens/{id:guid}/rotate")]
    [ProducesResponseType(typeof(ApiTokenCreatedDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RotateToken(Guid id, CancellationToken cancellationToken)
    {
        var result = await integrationService.RotateTokenAsync(id, GetUserName(), cancellationToken);
        return result is not null ? Ok(result) : NotFound();
    }

    // ── Webhooks ──────────────────────────────────────────────────────────

    /// <summary>Lista todos los webhook endpoints configurados</summary>
    /// <response code="200">Lista de webhook endpoints</response>
    [HttpGet("webhooks")]
    [ProducesResponseType(typeof(IReadOnlyList<WebhookEndpointDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWebhooks(CancellationToken cancellationToken)
    {
        var result = await integrationService.GetEndpointsAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>Crea un nuevo webhook endpoint</summary>
    /// <remarks>
    /// Los webhooks permiten recibir notificaciones en tiempo real cuando ocurren
    /// eventos en el HRMS. El sistema enviará un `POST` a tu URL con el payload
    /// firmado con HMAC-SHA256.
    ///
    /// **Verificación de firma:**
    /// ```
    /// X-HRMS-Signature: sha256=&lt;hmac-hex&gt;
    /// X-HRMS-Event: employee.created
    /// ```
    ///
    /// **Ejemplo de verificación en Node.js:**
    /// ```js
    /// const signature = crypto
    ///   .createHmac('sha256', secret)
    ///   .update(rawBody)
    ///   .digest('hex');
    /// const valid = `sha256=${signature}` === req.headers['x-hrms-signature'];
    /// ```
    /// </remarks>
    /// <response code="201">Webhook creado. Incluye el secret de firma (solo se muestra una vez).</response>
    [HttpPost("webhooks")]
    [ProducesResponseType(typeof(WebhookEndpointDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateWebhook([FromBody] CreateWebhookRequestDto request, CancellationToken cancellationToken)
    {
        var result = await integrationService.CreateEndpointAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/integrations/webhooks/{result.Id}", result);
    }

    /// <summary>Elimina un webhook endpoint</summary>
    /// <param name="id">ID del endpoint a eliminar</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    [HttpDelete("webhooks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteWebhook(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await integrationService.DeleteEndpointAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>Activa o desactiva un webhook endpoint</summary>
    /// <param name="id">ID del endpoint</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    [HttpPost("webhooks/{id:guid}/toggle")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleWebhook(Guid id, CancellationToken cancellationToken)
    {
        var toggled = await integrationService.ToggleEndpointAsync(id, GetUserName(), cancellationToken);
        return toggled ? NoContent() : NotFound();
    }

    /// <summary>Obtiene el historial de entregas de un webhook con filtros opcionales</summary>
    /// <remarks>
    /// **Filtros:**
    /// - `success=true|false` — solo entregas exitosas o fallidas
    /// - `fromDate`, `toDate` — rango de fechas (ISO 8601)
    /// - `eventType` — filtrar por tipo de evento (ej. `employee.created`)
    /// - `limit` — cantidad máxima de registros (5–200, default 50)
    /// </remarks>
    /// <param name="id">ID del endpoint</param>
    /// <param name="success">Filtra por éxito (true) o fallo (false)</param>
    /// <param name="fromDate">Fecha mínima (inclusiva)</param>
    /// <param name="toDate">Fecha máxima (inclusiva)</param>
    /// <param name="eventType">Tipo de evento exacto</param>
    /// <param name="limit">Cantidad máxima (5-200)</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    [HttpGet("webhooks/{id:guid}/deliveries")]
    [ProducesResponseType(typeof(IReadOnlyList<WebhookDeliveryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDeliveries(
        Guid id,
        [FromQuery] bool? success = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? eventType = null,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var query = new DeliveryQueryDto(success, fromDate, toDate, eventType, limit);
        var result = await integrationService.GetDeliveriesAsync(id, query, cancellationToken);
        return Ok(result);
    }

    /// <summary>Envía un evento de prueba al webhook</summary>
    /// <param name="id">ID del endpoint a probar</param>
    /// <param name="cancellationToken">Token de cancelación</param>
    /// <response code="204">Evento de prueba enviado</response>
    [HttpPost("webhooks/{id:guid}/test")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestWebhook(Guid id, CancellationToken cancellationToken)
    {
        var sent = await integrationService.TestEndpointAsync(id, cancellationToken);
        return sent ? NoContent() : NotFound();
    }

    /// <summary>Lista todos los eventos disponibles para webhooks</summary>
    /// <remarks>
    /// Cada evento incluye su tipo, descripción y un ejemplo del payload que se enviará.
    /// </remarks>
    [HttpGet("webhooks/events")]
    [ProducesResponseType(typeof(IReadOnlyList<WebhookEventDto>), StatusCodes.Status200OK)]
    public IActionResult GetAvailableEvents()
    {
        var events = integrationService.GetAvailableEvents();
        return Ok(events);
    }

    // ── Calendar Feeds ────────────────────────────────────────────────────

    /// <summary>Lista los feeds iCal del usuario autenticado.</summary>
    /// <remarks>
    /// Cada feed representa una URL pública de suscripción. Para crear un feed
    /// usa <c>POST /calendar/feeds</c>. La URL completa solo se devuelve en el
    /// momento de la creación — aquí solo se muestra el prefijo del token.
    /// </remarks>
    [HttpGet("calendar/feeds")]
    [ProducesResponseType(typeof(IReadOnlyList<CalendarFeedDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCalendarFeeds(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var feeds = await calendarFeedService.GetUserFeedsAsync(userId, cancellationToken);
        return Ok(feeds);
    }

    /// <summary>Crea un feed iCal y devuelve la URL pública de suscripción (solo se muestra una vez).</summary>
    /// <remarks>
    /// **Importante:** guarda la URL devuelta de inmediato. Por seguridad, solo se
    /// muestra en este momento — luego se almacena únicamente el hash del token.
    ///
    /// Para suscribirte al feed desde tu cliente de calendario:
    /// - **Google Calendar:** Otros calendarios → Desde URL → pegar la URL.
    /// - **Outlook:** Agregar calendario → Suscribirse desde la web → pegar la URL.
    /// - **Apple Calendar:** Archivo → Nueva suscripción de calendario → pegar la URL.
    /// </remarks>
    [HttpPost("calendar/feeds")]
    [ProducesResponseType(typeof(CalendarFeedCreatedDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCalendarFeed([FromBody] CreateCalendarFeedRequestDto request, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        // La base URL se construye desde el request actual para que el token embebido
        // apunte al mismo host/puerto/protocolo desde el que el admin está viendo la UI.
        var baseUrl = $"{Request.Scheme}://{Request.Host}/api/v1/integrations/calendar/feed";
        try
        {
            var result = await calendarFeedService.CreateFeedAsync(userId, GetUserName(), request, baseUrl, cancellationToken);
            return Created($"/api/v1/integrations/calendar/feeds/{result.Id}", result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Revoca un feed iCal. La URL deja de responder inmediatamente.</summary>
    [HttpDelete("calendar/feeds/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeCalendarFeed(Guid id, CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var revoked = await calendarFeedService.RevokeFeedAsync(userId, id, cancellationToken);
        return revoked ? NoContent() : NotFound();
    }

    /// <summary>Catálogo de scopes disponibles para feeds iCal.</summary>
    [HttpGet("calendar/feeds/scopes")]
    [ProducesResponseType(typeof(IReadOnlyList<CalendarFeedScopeDto>), StatusCodes.Status200OK)]
    public IActionResult GetCalendarFeedScopes()
    {
        return Ok(calendarFeedService.GetAvailableScopes());
    }

    // ── Google Calendar OAuth Push ────────────────────────────────────────

    private const string GoogleOAuthStateCookie = "hrms_google_oauth_state";
    private const string GoogleOAuthUserCookie = "hrms_google_oauth_uid";

    /// <summary>Inicia el flujo OAuth con Google Calendar — devuelve la URL de consentimiento.</summary>
    /// <remarks>
    /// El cliente debe redirigir el navegador a <c>authorizationUrl</c>. La cookie
    /// HttpOnly con el <c>state</c> se setea automáticamente — no se expone al JS.
    /// </remarks>
    [HttpGet("calendar/google/authorize")]
    [ProducesResponseType(typeof(OAuthAuthorizeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public IActionResult GoogleAuthorize()
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        if (!googleOAuth.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Google Calendar no está configurado en el servidor." });

        var (url, state) = googleOAuth.BuildAuthorizationUrl(userId);

        // Cookies HttpOnly short-lived para validar el callback (anti-CSRF).
        var cookieOpts = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10)
        };
        Response.Cookies.Append(GoogleOAuthStateCookie, state, cookieOpts);
        Response.Cookies.Append(GoogleOAuthUserCookie, userId.ToString(), cookieOpts);

        return Ok(new OAuthAuthorizeDto(url));
    }

    /// <summary>Callback de Google — intercambia el código, persiste la conexión y redirige al frontend.</summary>
    /// <remarks>
    /// Este endpoint es invocado por el navegador del usuario (redirect de Google), **no**
    /// desde JS, por lo que usa las cookies sembradas en /authorize para identificar al
    /// usuario y validar el state (anti-CSRF). Se permite anónimo porque el navegador
    /// no lleva JWT en este request.
    /// </remarks>
    [HttpGet("calendar/google/callback")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> GoogleCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        var redirectBase = string.IsNullOrWhiteSpace(googleOAuth.PostCallbackRedirectUrl)
            ? "/integraciones"
            : googleOAuth.PostCallbackRedirectUrl;

        // Anti-CSRF: state del query debe coincidir con cookie.
        Request.Cookies.TryGetValue(GoogleOAuthStateCookie, out var cookieState);
        Request.Cookies.TryGetValue(GoogleOAuthUserCookie, out var cookieUserRaw);
        Response.Cookies.Delete(GoogleOAuthStateCookie);
        Response.Cookies.Delete(GoogleOAuthUserCookie);

        if (!string.IsNullOrEmpty(error))
            return Redirect($"{redirectBase}?googleOAuth=error&reason={Uri.EscapeDataString(error)}");

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) || string.IsNullOrEmpty(cookieState) || state != cookieState)
            return Redirect($"{redirectBase}?googleOAuth=error&reason=state_mismatch");

        if (!Guid.TryParse(cookieUserRaw, out var userId) || userId == Guid.Empty)
            return Redirect($"{redirectBase}?googleOAuth=error&reason=no_user");

        try
        {
            await googleOAuth.ExchangeCodeAsync(userId, userId.ToString(), code, cancellationToken);
            return Redirect($"{redirectBase}?googleOAuth=success");
        }
        catch (Exception)
        {
            return Redirect($"{redirectBase}?googleOAuth=error&reason=exchange_failed");
        }
    }

    /// <summary>Consulta la conexión Google Calendar activa del usuario actual.</summary>
    /// <response code="200">Conexión activa (o null si no hay).</response>
    [HttpGet("calendar/google/connection")]
    [ProducesResponseType(typeof(CalendarConnectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetGoogleConnection(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var conn = await googleOAuth.GetConnectionAsync(userId, cancellationToken);
        return conn is null ? NoContent() : Ok(conn);
    }

    /// <summary>Elimina la conexión con Google Calendar y revoca el refresh token.</summary>
    [HttpDelete("calendar/google/connection")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisconnectGoogle(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var disconnected = await googleOAuth.DisconnectAsync(userId, cancellationToken);
        return disconnected ? NoContent() : NotFound();
    }

    /// <summary>Información sobre los proveedores de calendario soportados (para la UI).</summary>
    [HttpGet("calendar/providers")]
    [ProducesResponseType(typeof(IReadOnlyList<CalendarProviderInfoDto>), StatusCodes.Status200OK)]
    public IActionResult GetCalendarProviders()
    {
        var providers = new List<CalendarProviderInfoDto>
        {
            new("google",    "Google Calendar",   googleOAuth.IsConfigured),
            new("microsoft", "Outlook / Microsoft 365", microsoftOAuth.IsConfigured)
        };
        return Ok(providers);
    }

    // ── Microsoft / Outlook Calendar OAuth Push ───────────────────────────

    private const string MsOAuthStateCookie = "hrms_ms_oauth_state";
    private const string MsOAuthUserCookie = "hrms_ms_oauth_uid";

    /// <summary>Inicia el flujo OAuth con Microsoft Graph — devuelve URL de consentimiento.</summary>
    [HttpGet("calendar/microsoft/authorize")]
    [ProducesResponseType(typeof(OAuthAuthorizeDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public IActionResult MicrosoftAuthorize()
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        if (!microsoftOAuth.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Microsoft Calendar no está configurado en el servidor." });

        var (url, state) = microsoftOAuth.BuildAuthorizationUrl(userId);

        var cookieOpts = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10)
        };
        Response.Cookies.Append(MsOAuthStateCookie, state, cookieOpts);
        Response.Cookies.Append(MsOAuthUserCookie, userId.ToString(), cookieOpts);

        return Ok(new OAuthAuthorizeDto(url));
    }

    /// <summary>Callback de Microsoft — intercambia el código y redirige al frontend.</summary>
    [HttpGet("calendar/microsoft/callback")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> MicrosoftCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken cancellationToken)
    {
        var redirectBase = string.IsNullOrWhiteSpace(microsoftOAuth.PostCallbackRedirectUrl)
            ? "/integraciones"
            : microsoftOAuth.PostCallbackRedirectUrl;

        Request.Cookies.TryGetValue(MsOAuthStateCookie, out var cookieState);
        Request.Cookies.TryGetValue(MsOAuthUserCookie, out var cookieUserRaw);
        Response.Cookies.Delete(MsOAuthStateCookie);
        Response.Cookies.Delete(MsOAuthUserCookie);

        if (!string.IsNullOrEmpty(error))
            return Redirect($"{redirectBase}?microsoftOAuth=error&reason={Uri.EscapeDataString(error)}");

        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state) || string.IsNullOrEmpty(cookieState) || state != cookieState)
            return Redirect($"{redirectBase}?microsoftOAuth=error&reason=state_mismatch");

        if (!Guid.TryParse(cookieUserRaw, out var userId) || userId == Guid.Empty)
            return Redirect($"{redirectBase}?microsoftOAuth=error&reason=no_user");

        try
        {
            await microsoftOAuth.ExchangeCodeAsync(userId, userId.ToString(), code, cancellationToken);
            return Redirect($"{redirectBase}?microsoftOAuth=success");
        }
        catch (Exception)
        {
            return Redirect($"{redirectBase}?microsoftOAuth=error&reason=exchange_failed");
        }
    }

    /// <summary>Consulta la conexión Microsoft Calendar activa del usuario.</summary>
    [HttpGet("calendar/microsoft/connection")]
    [ProducesResponseType(typeof(CalendarConnectionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetMicrosoftConnection(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var conn = await microsoftOAuth.GetConnectionAsync(userId, cancellationToken);
        return conn is null ? NoContent() : Ok(conn);
    }

    /// <summary>Elimina la conexión Microsoft Calendar del usuario.</summary>
    [HttpDelete("calendar/microsoft/connection")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DisconnectMicrosoft(CancellationToken cancellationToken)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var disconnected = await microsoftOAuth.DisconnectAsync(userId, cancellationToken);
        return disconnected ? NoContent() : NotFound();
    }
}
