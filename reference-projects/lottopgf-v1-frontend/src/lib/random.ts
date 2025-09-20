function getRandomInt(min: number, max: number) {
  // Create byte array and fill with 1 random number
  const byteArray = new Uint8Array(1);
  global.crypto.getRandomValues(byteArray);

  const num = byteArray[0];

  const range = max - min + 1;
  const max_range = 256;
  if (num! >= Math.floor(max_range / range) * range)
    return getRandomInt(min, max);
  return min + (num! % range);
}

export function getRandomPicks(amount: number, max: number) {
  const picks = new Set<number>();
  while (picks.size < amount) {
    picks.add(getRandomInt(1, max));
  }
  return new Set(Array.from(picks).sort((a, b) => (a > b ? 1 : -1)));
}
