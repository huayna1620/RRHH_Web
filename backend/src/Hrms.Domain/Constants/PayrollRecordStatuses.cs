namespace Hrms.Domain.Constants;

public static class PayrollRecordStatuses
{
    public const string Draft = "draft";
    public const string Approved = "approved";
    public const string Paid = "paid";

    public static readonly IReadOnlyList<string> All = [Draft, Approved, Paid];
}
