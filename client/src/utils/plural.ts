/** "1 check-in", "2 check-ins". Pass `many` for irregular plurals. */
export function plural(count: number, one: string, many: string = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
