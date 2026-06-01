using System.Text.Json;
using Generic.Rtk.Filtering;
using Generic.Rtk.Models;

namespace Generic.Rtk.Tests;

public class FilterResultFormatterTests
{
    [Fact]
    public void JsonOptions_Uses_CamelCase_And_String_Enums()
    {
        var obj = new { status = "Passed", errorCount = 0 };
        var json = JsonSerializer.Serialize(obj, FilterResultFormatter.JsonOptions);
        using var doc = JsonDocument.Parse(json);
        Assert.Equal("Passed", doc.RootElement.GetProperty("status").GetString());
    }
}
