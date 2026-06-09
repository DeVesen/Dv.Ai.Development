using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Dev.Filesystem.Mcp.Models;

namespace Dev.Filesystem.Mcp.Json;

public static class JsonResultFormatter
{
    public static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = false,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver(),
        };
        return options;
    }

    public static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    public static string Error(string message) =>
        JsonSerializer.Serialize(new ErrorResult(message), JsonOptions);

    public static string Success<T>(T value) =>
        JsonSerializer.Serialize(value, JsonOptions);
}
