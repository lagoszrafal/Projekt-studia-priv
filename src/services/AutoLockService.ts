export function shouldAutoLock(backgroundedAt: number, now: number, timeoutSeconds: number): boolean {
  return timeoutSeconds === 0 || now - backgroundedAt >= timeoutSeconds * 1000;
}
