/** Moves keyboard focus to the element with this id, if it exists. Used to jump to the first invalid field. */
export function focusById(id: string | undefined): void {
  if (id) document.getElementById(id)?.focus();
}

/** Reads the current value of an input by id ("" when it does not exist). */
export function valueById(id: string): string {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : "";
}
