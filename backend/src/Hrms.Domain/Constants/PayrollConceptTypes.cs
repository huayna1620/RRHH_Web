namespace Hrms.Domain.Constants;

public static class PayrollConceptTypes
{
    public const string Earning = "earning";
    public const string Deduction = "deduction";

    public static readonly IReadOnlyList<string> All = [Earning, Deduction];
}
