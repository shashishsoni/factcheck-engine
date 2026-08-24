export const MAX_THINKING_LENGTH = 4_000;

export function appendThinking(current: string, chunk: string): string {
  return `${current}${chunk}`.slice(-MAX_THINKING_LENGTH);
}
