// Source lives one level BELOW its spec — exercises specCandidatesUpward in
// depth="file" mode (spec sits in the PARENT directory).
export class UpwardWidget {
  // Referenced from the parent-directory spec → must NOT appear.
  render(): string {
    return "x";
  }

  // Never referenced from the spec → reason "no_reference_found".
  untestedRender(): string {
    return "y";
  }
}
