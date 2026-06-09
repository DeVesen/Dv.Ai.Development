using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Build.Log.Filter.Mcp.Models;

namespace Build.Log.Filter.Mcp.Filtering;

public sealed class FilterResultFormatter
{
    public static JsonSerializerOptions CreateJsonOptions()
    {
        var o = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = false,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
        };
        o.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: false));
        return o;
    }

    public static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();
}
