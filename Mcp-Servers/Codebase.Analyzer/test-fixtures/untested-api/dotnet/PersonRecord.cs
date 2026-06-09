namespace SampleApp;

// Positional record: Name and Age are public (positional) properties; Display is
// an explicit public property. PersonRecordTests references only Name, so Age and
// Display must appear with reason "no_reference_found".
public record PersonRecord(string Name, int Age)
{
    public string Display => $"{Name} ({Age})";
}
