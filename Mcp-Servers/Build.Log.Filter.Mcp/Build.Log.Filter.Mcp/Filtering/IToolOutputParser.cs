using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Filtering;

public interface IToolOutputParser
{
    ToolType ToolType { get; }

    FilterResult Parse(string normalizedText, FilterLimits limits);
}
