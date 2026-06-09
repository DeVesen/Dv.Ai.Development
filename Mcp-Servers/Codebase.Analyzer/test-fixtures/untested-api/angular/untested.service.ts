import { Injectable } from "@angular/core";

// No spec in the same or any parent directory imports this class → every public
// member must be reported with reason "no_test_file".
@Injectable({ providedIn: "root" })
export class UntestedService {
  doThing(): void {}
  value = 1;
}
