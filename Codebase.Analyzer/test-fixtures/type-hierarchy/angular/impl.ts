import { Named } from "./iface";

export class Speaker implements Named {
  name = "x";
  speak(): void {}
}
