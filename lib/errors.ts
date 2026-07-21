/** Narrows a caught value to a message safe to put in a JSON response.
 *
 * `catch` binds its parameter as `unknown`, so reading `.message` off it does
 * not type-check — and a thrown non-Error would have produced `undefined` in
 * the response body at runtime. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error interno del servidor";
}
