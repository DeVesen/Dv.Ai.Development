export function add(a: number, b: number): number {
  return a + b;
}

export function broken(): number {
  return add("x", 1);
}
