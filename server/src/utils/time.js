export function remainingSeconds(expiresAt) {
  if (!expiresAt) return 0;
  const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}
