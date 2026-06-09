namespace SampleApp;

// No test file references this class → every public member must appear with
// reason "no_test_file".
public class OrphanService
{
    public void Run() {}

    public int Count { get; set; }

    // Excluded member (ToString) → must NOT appear even without a test file.
    public override string ToString() => "orphan";
}
