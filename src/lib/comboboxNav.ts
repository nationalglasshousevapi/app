/** Pure wrap-around nav helper for combobox lists. */
export function moveActive(active: number, delta: 1 | -1, len: number): number {
  if (len === 0) return -1;
  if (active < 0) return delta === 1 ? 0 : len - 1;
  return (active + delta + len) % len;
}
