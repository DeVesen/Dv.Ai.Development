import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SampleService {
  // Referenced from the same-directory spec → must NOT appear as untested.
  getValue(): number {
    return 42;
  }

  // Never referenced from the same/parent-directory spec → must appear with reason "no_reference_found".
  removeValue(id: number): boolean {
    return id > 0;
  }

  // Lifecycle hook → must be excluded from the scan.
  ngOnInit(): void {}
}
