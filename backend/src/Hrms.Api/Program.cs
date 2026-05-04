using System.Text;
using System.Threading.RateLimiting;
using Asp.Versioning;
using Hrms.Api.Authentication;
using Hrms.Api.Middleware;
using Hrms.Application.Common.Authorization;
using Hrms.Infrastructure;
using Hrms.Infrastructure.Options;
using Hrms.Infrastructure.Persistence.Context;
using Hrms.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──────────────────────────────────────────────────────────
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/hrms-.log", rollingInterval: RollingInterval.Day, retainedFileCountLimit: 30));

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    // ── API Versioning ───────────────────────────────────────────────────
    // Rutas como /api/v1/... ya están en uso. Esto formaliza el esquema para que:
    //   - Swagger muestre la versión explícita
    //   - Respuestas incluyan cabecera 'api-supported-versions'
    //   - Al agregar v2 no rompa clientes existentes
    builder.Services
        .AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1, 0);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
            options.ApiVersionReader = new UrlSegmentApiVersionReader();
        })
        .AddApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });

    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "HRMS API",
            Version = "v1",
            Description = """
                # Sistema de Gestión de Recursos Humanos — API REST

                API completa para gestión de empleados, asistencia, planillas, vacaciones,
                permisos, reclutamiento, onboarding, evaluaciones y documentos.

                ## Autenticación

                La API soporta dos métodos de autenticación:

                ### 1. JWT Bearer (usuarios del sistema)
                Obtén un token con `POST /api/v1/auth/login` y úsalo como:
                ```
                Authorization: Bearer <token>
                ```

                ### 2. API Token (integraciones externas)
                Crea un token en **Integraciones → API Tokens** y úsalo igual:
                ```
                Authorization: Bearer hrms_<token>
                ```

                ## Webhooks
                Configura endpoints en **Integraciones → Webhooks** para recibir
                notificaciones en tiempo real. Cada entrega incluye firma HMAC-SHA256
                en el header `X-HRMS-Signature`.

                ## Rate Limiting
                - Endpoints de autenticación: **5 req/min** por IP
                - API general: **120 req/min** por usuario
                - Endpoints intensivos (analytics/reportes): **40 req/min** por usuario

                ## Paginación
                Los endpoints de listado aceptan `pageNumber` y `pageSize` como query params.
                """,
            Contact = new OpenApiContact
            {
                Name = "Soporte HRMS",
                Email = "soporte@hrms.local"
            },
            License = new OpenApiLicense
            {
                Name = "Licencia comercial"
            }
        });

        // XML documentation
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
            options.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);

        // JWT Bearer auth
        var jwtScheme = new OpenApiSecurityScheme
        {
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Token JWT obtenido desde `POST /api/v1/auth/login`.",
            Reference = new OpenApiReference
            {
                Type = ReferenceType.SecurityScheme,
                Id = JwtBearerDefaults.AuthenticationScheme
            }
        };

        options.AddSecurityDefinition(jwtScheme.Reference.Id, jwtScheme);
        options.AddSecurityRequirement(new OpenApiSecurityRequirement { { jwtScheme, [] } });

        // Group tags with descriptions
        options.TagActionsBy(api => [api.GroupName ?? api.ActionDescriptor.RouteValues["controller"] ?? "Default"]);
        options.DocInclusionPredicate((_, _) => true);

        // Order tags
        options.OrderActionsBy(api => api.RelativePath);
    });

    builder.Services.AddInfrastructure(builder.Configuration);

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
        {
            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            policy.SetIsOriginAllowed(origin =>
                    IsOriginAllowed(origin, allowedOrigins))
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                     ?? throw new InvalidOperationException("Configuración Jwt no encontrada.");

    const string MultiAuthScheme = "MultiAuth";

    builder.Services
        .AddAuthentication(options =>
        {
            // Selector dinámico: JWT para usuarios, ApiToken para integraciones externas.
            options.DefaultScheme = MultiAuthScheme;
            options.DefaultChallengeScheme = MultiAuthScheme;
        })
        .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30),
                ValidIssuer = jwtOptions.Issuer,
                ValidAudience = jwtOptions.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret))
            };
        })
        .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, ApiTokenAuthenticationHandler>(
            ApiTokenAuthenticationHandler.SchemeName, _ => { })
        .AddPolicyScheme(MultiAuthScheme, MultiAuthScheme, options =>
        {
            options.ForwardDefaultSelector = context =>
            {
                var authHeader = context.Request.Headers.Authorization.ToString();
                if (!string.IsNullOrEmpty(authHeader)
                    && authHeader.StartsWith("Bearer hrms_", StringComparison.OrdinalIgnoreCase))
                {
                    return ApiTokenAuthenticationHandler.SchemeName;
                }
                return JwtBearerDefaults.AuthenticationScheme;
            };
        });

    builder.Services.AddAuthorization(options =>
    {
        foreach (var permission in AppPermissions.All)
        {
            options.AddPolicy(permission, policy =>
                policy.RequireClaim(AppClaimTypes.Permission, permission));
        }
    });

    builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, ScopeAuthorizationHandler>();

    // ── Rate Limiting ────────────────────────────────────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        // Login: max 5 intentos por minuto por IP
        options.AddPolicy("login", context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1)
                }));

        // API general: 120 requests por minuto por usuario/IP
        options.AddPolicy("api", context =>
            RateLimitPartition.GetSlidingWindowLimiter(
                context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = 120,
                    Window = TimeSpan.FromMinutes(1),
                    SegmentsPerWindow = 4
                }));

        // Endpoints intensivos (analytics/reportes): límite mayor para dashboards con varias consultas paralelas.
        options.AddPolicy("heavy", context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.User?.Identity?.Name ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 40,
                    Window = TimeSpan.FromMinutes(1)
                }));

        // Global: aplica siempre. Cuando el principal es un API token (hrms_*) particiona
        // por token.Id (NameIdentifier) con un límite propio; si es JWT o anónimo, cae al
        // flujo normal y no se limita aquí (las policies específicas lo hacen).
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var tokenType = context.User?.FindFirst(ApiTokenAuthenticationHandler.TokenTypeClaim)?.Value;
            if (tokenType == ApiTokenAuthenticationHandler.ApiTokenType)
            {
                var tokenId = context.User!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                              ?? "api:unknown";
                return RateLimitPartition.GetFixedWindowLimiter($"apitoken:{tokenId}",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    });
            }

            // No-op para JWT/anónimo: sin partición → sin límite desde el global.
            return RateLimitPartition.GetNoLimiter<string>("global:passthrough");
        });

        // Handler de rechazo: incluir cabeceras útiles para que los clientes reaccionen.
        options.OnRejected = async (context, ct) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.HttpContext.Response.Headers["Retry-After"] = "60";
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            {
                context.HttpContext.Response.Headers["Retry-After"] =
                    ((int)retryAfter.TotalSeconds).ToString();
            }
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                error = "rate_limit_exceeded",
                message = "Demasiadas solicitudes. Vuelve a intentar en unos segundos."
            }, ct);
        };
    });

    // ── Health Checks ────────────────────────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<HrmsDbContext>("database");

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseMiddleware<GlobalExceptionMiddleware>();

    app.UseSwagger(c =>
    {
        c.RouteTemplate = "api-docs/{documentName}/openapi.json";
    });
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/api-docs/v1/openapi.json", "HRMS API v1");
        c.RoutePrefix = "api-docs";
        c.DocumentTitle = "HRMS API Documentation";
        c.DefaultModelsExpandDepth(1);
        c.DefaultModelExpandDepth(2);
        c.DisplayRequestDuration();
        c.EnableFilter();
        c.EnableDeepLinking();
        c.EnablePersistAuthorization();
        c.ShowExtensions();
    });

    app.UseHttpsRedirection();
    app.UseCors("Frontend");
    app.UseAuthentication();
    app.UseAuthorization();
    app.UseRateLimiter();
    app.MapControllers();
    app.MapHealthChecks("/health");

    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();
        await dbContext.Database.MigrateAsync();
        await DatabaseSeeder.SeedAsync(dbContext);
    }

    Log.Information("HRMS API iniciada correctamente");
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "La aplicación falló al iniciar");
}
finally
{
    Log.CloseAndFlush();
}

static bool IsOriginAllowed(string origin, string[] allowedOrigins)
{
    if (string.IsNullOrWhiteSpace(origin))
        return false;

    if (allowedOrigins.Any(x => string.Equals(x, origin, StringComparison.OrdinalIgnoreCase)))
        return true;

    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
        return false;

    return uri.Scheme == Uri.UriSchemeHttps &&
           uri.Host.EndsWith(".trycloudflare.com", StringComparison.OrdinalIgnoreCase);
}
