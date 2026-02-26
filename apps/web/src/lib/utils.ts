import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract error message from API response
 * Handles both string errors and Zod validation error objects
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  // Handle Zod error object
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: { message: string }[] };
    return zodError.issues[0]?.message || "Validation failed";
  }
  return "Something went wrong";
}
