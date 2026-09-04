import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Payload relationship fields are typed as `number | object` depending on the
// query depth. Use as a filter predicate to keep only the populated objects.
export function isPopulated<T>(
  value: T | number | null | undefined,
): value is T {
  return typeof value === "object" && value !== null;
}
