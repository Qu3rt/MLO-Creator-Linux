// The Windows build used System.Web.Script.Serialization.JavaScriptSerializer (part of the .NET Framework).
// That assembly does not exist on .NET on Linux, and the program uses the class in a lot of places, so this is a
// small drop-in replacement on top of System.Text.Json with the same shape of result:
//   objects -> Dictionary<string, object>, arrays -> List<object>, numbers -> long / decimal / double,
//   strings -> string, true/false -> bool, null -> null.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace System.Web.Script.Serialization
{
    public class JavaScriptSerializer
    {
        // kept for source compatibility; System.Text.Json has no total length limit, the depth is the recursion limit
        public int MaxJsonLength { get; set; } = int.MaxValue;
        public int RecursionLimit { get; set; } = 100;

        static readonly JsonSerializerOptions WriteOptions = new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
            WriteIndented = false,
            MaxDepth = 512,
            NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals
        };

        public string Serialize(object obj)
        {
            return JsonSerializer.Serialize(obj, WriteOptions);
        }

        public object DeserializeObject(string input)
        {
            if (input == null) return null;
            JsonDocumentOptions opt = new JsonDocumentOptions
            {
                MaxDepth = Math.Max(64, RecursionLimit),
                AllowTrailingCommas = false,
                CommentHandling = JsonCommentHandling.Disallow
            };
            using (JsonDocument doc = JsonDocument.Parse(input, opt)) return ToObject(doc.RootElement);
        }

        static object ToObject(JsonElement e)
        {
            switch (e.ValueKind)
            {
                case JsonValueKind.Object:
                    Dictionary<string, object> d = new Dictionary<string, object>(StringComparer.Ordinal);
                    foreach (JsonProperty p in e.EnumerateObject()) d[p.Name] = ToObject(p.Value);
                    return d;
                case JsonValueKind.Array:
                    List<object> l = new List<object>();
                    foreach (JsonElement x in e.EnumerateArray()) l.Add(ToObject(x));
                    return l;
                case JsonValueKind.String:
                    return e.GetString();
                case JsonValueKind.Number:
                    long iv;
                    if (e.TryGetInt64(out iv)) return iv;
                    decimal dv;
                    if (e.TryGetDecimal(out dv)) return dv;
                    return e.GetDouble();
                case JsonValueKind.True: return true;
                case JsonValueKind.False: return false;
                default: return null;
            }
        }
    }
}
