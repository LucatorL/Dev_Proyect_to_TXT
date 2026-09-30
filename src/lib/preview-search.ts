export const SEARCH_CHECKPOINT_STRIDE = 2048;

export function escapeSearchTerm(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findMatchByOrdinal(text: string, query: string, checkpoints: number[], ordinal: number) {
  if (ordinal < 0) return null;
  const block = Math.floor(ordinal / SEARCH_CHECKPOINT_STRIDE);
  const offset = checkpoints[block];
  if (offset === undefined) return null;

  const expression = new RegExp(escapeSearchTerm(query), 'gi');
  expression.lastIndex = offset;
  let match: RegExpExecArray | null = null;
  for (let index = block * SEARCH_CHECKPOINT_STRIDE; index <= ordinal; index++) {
    match = expression.exec(text);
    if (!match) return null;
  }
  return match ? { index: match.index, length: match[0].length } : null;
}
