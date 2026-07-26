export function parseISO(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}
