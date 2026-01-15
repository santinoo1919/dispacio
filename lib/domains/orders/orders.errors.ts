/**
 * Orders Domain Error Handling
 */

export interface ConflictError {
  error: string;
  message?: string;
  currentVersion: number;
}

/**
 * Check if error is a version conflict (409)
 */
export function isConflictError(
  error: unknown
): error is Error & { status: 409; data: ConflictError } {
  return (
    error instanceof Error &&
    (error as any).status === 409 &&
    (error as any).data?.error === "Conflict"
  );
}

