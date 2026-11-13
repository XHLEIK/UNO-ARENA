// src/lib/server/http.ts
export function errorStatus(message: string | undefined): number {
  if (!message) return 400;
  if (message.startsWith('Unauthorized')) return 403;
  if (message.includes('Version conflict')) return 409;
  if (message.includes('Room not found')) return 404;
  return 400;
}
