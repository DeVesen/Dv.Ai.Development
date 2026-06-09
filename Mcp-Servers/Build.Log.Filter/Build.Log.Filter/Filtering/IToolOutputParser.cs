using Build.Log.Filter.Models;

namespace Build.Log.Filter.Filtering;

public interface IToolOutputParser
{
    ToolType ToolType { get; }

    FilterResult Parse(string normalizedText, FilterLimits limits);
}
