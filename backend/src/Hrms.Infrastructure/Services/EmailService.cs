using Hrms.Application.Interfaces.Services;
using Hrms.Infrastructure.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Hrms.Infrastructure.Services;

public sealed class EmailService(IOptions<SmtpOptions> options, ILogger<EmailService> logger) : IEmailService
{
    private readonly SmtpOptions _smtp = options.Value;

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (!_smtp.Enabled)
        {
            logger.LogWarning("Email deshabilitado. Destinatario: {To}, Asunto: {Subject}", to, subject);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromEmail));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();
        try
        {
            var socketOptions = ResolveSocketOptions(_smtp);
            await client.ConnectAsync(_smtp.Host, _smtp.Port, socketOptions, cancellationToken);

            if (!string.IsNullOrWhiteSpace(_smtp.UserName))
            {
                await client.AuthenticateAsync(_smtp.UserName, _smtp.Password, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            logger.LogInformation("Email enviado a {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error enviando email a {To}: {Subject}", to, subject);
            throw;
        }
        finally
        {
            await client.DisconnectAsync(true, cancellationToken);
        }
    }

    private static SecureSocketOptions ResolveSocketOptions(SmtpOptions smtp)
    {
        if (!smtp.UseSsl)
        {
            return SecureSocketOptions.StartTlsWhenAvailable;
        }

        return smtp.Port == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;
    }
}
