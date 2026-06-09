export class AccessorSample {
  // Public property referenced from the spec → must NOT appear as untested.
  public label = "x";

  // get + set of the same name → must collapse to ONE finding, not two (dedup).
  // Never referenced from the spec → reason "no_reference_found".
  get total(): number {
    return this._t;
  }
  set total(v: number) {
    this._t = v;
  }

  // private → excluded from the scan.
  private _t = 0;
}
