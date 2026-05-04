namespace Hrms.Domain.Constants;

public static class AttendanceIncidentStatuses
{
    public const string Open = "open";
    public const string Justified = "justified";
    public const string Rejected = "rejected";
    public const string Expired = "expired";

    public static readonly IReadOnlyList<string> All =
    [
        Open,
        Justified,
        Rejected,
        Expired
    ];
}
