namespace SampleApp;

// Discriminating fixture (word-boundary class→test association):
// MiscIntegrationTest.cs is a test file (filename contains "Test") but its stem
// does NOT match <WordBoundaryTarget>[Tests|Test|Spec]. Association therefore
// relies solely on WordMatch(code, "WordBoundaryTarget"). A rollback to stem-only
// matching would report Cleanup as "no_test_file" instead of "no_reference_found".
public class WordBoundaryTarget
{
    // Referenced from MiscIntegrationTest → must NOT appear as untested.
    public int Execute() => 1;

    // Never referenced from the associated test file → "no_reference_found".
    public int Cleanup() => 0;
}
