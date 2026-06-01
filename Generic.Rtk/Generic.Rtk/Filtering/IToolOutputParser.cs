using Generic.Rtk.Models;

namespace Generic.Rtk.Filtering;

public interface IToolOutputParser
{
    ToolType ToolType { get; }

    FilterResult Parse(string normalizedText, FilterLimits limits);
}
