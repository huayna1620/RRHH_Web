namespace Hrms.Domain.Constants;

public static class JobPostingStatuses
{
    public const string Open = "open";
    public const string Paused = "paused";
    public const string Closed = "closed";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Open, Paused, Closed
    };
}
