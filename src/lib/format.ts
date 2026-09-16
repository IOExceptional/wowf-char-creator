export function formatDuration(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${+s.toFixed(1)} sec`;
  const m = s / 60;
  if (m < 60) return `${+m.toFixed(1)} min`;
  return `${+(m / 60).toFixed(1)} hr`;
}
