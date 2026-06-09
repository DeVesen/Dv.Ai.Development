// Shared contract for the detect_untested_public_api tool.
// Lives in its own module so the .NET runner does not depend on the Angular feature module.

export interface UntestedApiFinding {
  symbol: string;
  file: string;
  line: number;
  reason: "no_test_file" | "no_reference_found";
}
