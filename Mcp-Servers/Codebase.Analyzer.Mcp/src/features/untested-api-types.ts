// Shared contract for the detect_untested_public_api tool.
// Lives in its own module so the .NET runner does not depend on the Angular feature module.

export interface UntestedApiFinding {
  symbol: string;
  file: string;
  line: number;
  /**
   * no_test_file           – no spec references the class at all (Stufe C)
   * rendered_not_asserted  – parent spec renders the component but has no DOM assertions on it (Stufe B)
   * rendered_and_asserted  – parent spec renders AND has DOM assertions on the selector (Stufe A via parent)
   * no_reference_found     – own spec exists but never references this member
   */
  reason: "no_test_file" | "no_reference_found" | "rendered_not_asserted" | "rendered_and_asserted";
  /** Spec files that render this component via a parent (rendered_not_asserted / rendered_and_asserted) */
  indirectSpecs?: string[];
  /** Subset of indirectSpecs that contain DOM assertions on the component's selector */
  assertedBy?: string[];
}
