export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const maybe = (err as Record<string, unknown>).message;
    if (typeof maybe === "string") return maybe;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Ocurrió un error";
  }
}
