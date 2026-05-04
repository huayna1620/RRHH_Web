namespace Hrms.Domain.Constants;

public static class LeaveRequestTypes
{
    public const string Personal = "personal";
    public const string Medical = "medical";
    public const string Study = "study";
    public const string MaternityPaternity = "maternity_paternity";
    public const string Other = "other";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Personal,
        Medical,
        Study,
        MaternityPaternity,
        Other
    };
}
