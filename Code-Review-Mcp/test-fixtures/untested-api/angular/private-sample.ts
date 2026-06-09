export class PrivateSample {
  // ES #private field & method carry no scope modifier (getScope() === "public"),
  // so they are excluded by their leading "#". They must NEVER appear as untested
  // public API — if the "#" exclusion regressed, both would surface as
  // "no_reference_found" and turn the harness red.
  #secret = 1;
  #hide(): number {
    return this.#secret;
  }

  // Public and referenced from the spec → keeps the class "tested" and must NOT
  // appear as untested.
  reveal(): number {
    return this.#hide();
  }
}
