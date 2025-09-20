export function sanitizePicks(raw: string) {
  const splitNumbers = raw
    .split(/(?:,| )+/)
    .map((n) => parseInt(n.trim().replace(/\D/g, "")))
    .filter(Boolean);

  return new Set(splitNumbers.sort((a, b) => (a > b ? 1 : -1)));
}

export function validatePicks({
  picks,
  numPicks,
  maxBallValue,
}: {
  picks: Set<number>;
  numPicks: number;
  maxBallValue: number;
}) {
  if (picks.size !== numPicks) {
    return false;
  }

  for (const pick of picks) {
    if (pick < 1 || pick > maxBallValue) {
      return false;
    }
  }

  return true;
}
