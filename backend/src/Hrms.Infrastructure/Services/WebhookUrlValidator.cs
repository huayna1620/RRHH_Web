using System.Net;
using System.Net.Sockets;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// Valida URLs de webhook para prevenir SSRF (Server-Side Request Forgery).
/// Bloquea loopback, link-local, redes privadas RFC1918, metadata endpoints
/// de cloud providers y esquemas no-HTTP.
/// </summary>
internal static class WebhookUrlValidator
{
    public static void Validate(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            throw new InvalidOperationException("La URL del webhook no puede estar vacía.");

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("La URL del webhook no es válida.");

        // Solo HTTP/HTTPS
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            throw new InvalidOperationException("Solo se permiten URLs HTTP o HTTPS.");

        // Rechazar credenciales embebidas (http://user:pass@host)
        if (!string.IsNullOrEmpty(uri.UserInfo))
            throw new InvalidOperationException("Las URLs con credenciales embebidas no están permitidas.");

        var host = uri.Host;

        // Rechazar hostnames de loopback explícitos
        if (IsBlockedHostname(host))
            throw new InvalidOperationException($"El host '{host}' no está permitido para webhooks.");

        // Resolver a IP y validar
        IPAddress[] addresses;
        try
        {
            addresses = IPAddress.TryParse(host, out var direct)
                ? [direct]
                : Dns.GetHostAddresses(host);
        }
        catch (SocketException)
        {
            throw new InvalidOperationException($"No se pudo resolver el host '{host}'.");
        }

        if (addresses.Length == 0)
            throw new InvalidOperationException($"No se pudo resolver el host '{host}'.");

        foreach (var addr in addresses)
        {
            if (IsBlockedAddress(addr))
                throw new InvalidOperationException(
                    $"La URL apunta a una dirección interna o reservada ({addr}) y no está permitida.");
        }
    }

    private static bool IsBlockedHostname(string host)
    {
        if (string.IsNullOrEmpty(host)) return true;

        var lower = host.ToLowerInvariant();
        return lower is "localhost"
            || lower.EndsWith(".localhost", StringComparison.Ordinal)
            || lower.EndsWith(".internal", StringComparison.Ordinal)
            || lower.EndsWith(".local", StringComparison.Ordinal)
            || lower == "metadata.google.internal";
    }

    private static bool IsBlockedAddress(IPAddress addr)
    {
        // IPv4
        if (addr.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = addr.GetAddressBytes();

            // Loopback 127.0.0.0/8
            if (bytes[0] == 127) return true;

            // Private 10.0.0.0/8
            if (bytes[0] == 10) return true;

            // Private 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;

            // Private 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168) return true;

            // Link-local 169.254.0.0/16 (incluye metadata AWS/Azure/GCP en 169.254.169.254)
            if (bytes[0] == 169 && bytes[1] == 254) return true;

            // "This network" 0.0.0.0/8
            if (bytes[0] == 0) return true;

            // Carrier-grade NAT 100.64.0.0/10
            if (bytes[0] == 100 && bytes[1] >= 64 && bytes[1] <= 127) return true;

            // Multicast 224.0.0.0/4 y reservadas 240.0.0.0/4
            if (bytes[0] >= 224) return true;
        }
        // IPv6
        else if (addr.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (IPAddress.IsLoopback(addr)) return true;           // ::1
            if (addr.IsIPv6LinkLocal) return true;                 // fe80::/10
            if (addr.IsIPv6SiteLocal) return true;                 // fec0::/10
            if (addr.IsIPv6UniqueLocal) return true;               // fc00::/7

            var bytes = addr.GetAddressBytes();
            // IPv4-mapped IPv6 (::ffff:0:0/96) — re-evaluar la IPv4
            if (bytes[0] == 0 && bytes[1] == 0 && bytes[2] == 0 && bytes[3] == 0
                && bytes[4] == 0 && bytes[5] == 0 && bytes[6] == 0 && bytes[7] == 0
                && bytes[8] == 0 && bytes[9] == 0 && bytes[10] == 0xff && bytes[11] == 0xff)
            {
                var mapped = new IPAddress([bytes[12], bytes[13], bytes[14], bytes[15]]);
                return IsBlockedAddress(mapped);
            }
        }

        return false;
    }
}
