/** Formats a Date as YYYY-MM-DD using its local calendar date (never converts through UTC). */
export function toLocalISODate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
