using System.Security.Cryptography;
using System.Text;

namespace Build.Log.Filter.Mcp.Models;

public sealed record FilterCallRecord(
    DateTime Timestamp,
    string ToolType,
    string InputValue,
    string OutputValue)
{
    public string Id { get; } = ComputeId(Timestamp, ToolType, InputValue);
    public int InputChars => InputValue.Length;
    public int OutputChars => OutputValue.Length;
    public int SavedChars => InputChars - OutputChars;
    public double SavedPercent => InputChars == 0 ? 0 : Math.Round(SavedChars * 100.0 / InputChars, 1);

    private static string ComputeId(DateTime timestamp, string toolType, string inputValue)
    {
        var raw = $"{timestamp:o}|{toolType}|{inputValue}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexStringLower(hash)[..10];
    }
}
