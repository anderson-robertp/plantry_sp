/** Escape a user-typed string so it can be used literally inside a RegExp (search boxes, etc.). */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
