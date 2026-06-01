using Generic.Rtk.Models;

namespace Generic.Rtk;

public static class ToolParameterParsing
{
    public static bool TryParseToolType(string? value, out ToolType toolType, out string? error)
    {
        error = null;
        toolType = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            error = "tool_type is required.";
            return false;
        }

        if (Enum.TryParse<ToolType>(value, ignoreCase: true, out var t))
        {
            toolType = t;
            return true;
        }

        error = $"Unknown tool_type '{value}'. Expected one of: {string.Join(", ", Enum.GetNames<ToolType>())}.";
        return false;
    }
}
