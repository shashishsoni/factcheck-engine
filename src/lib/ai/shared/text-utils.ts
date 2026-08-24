export function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function optionalText(value: unknown): string | undefined {
  const text = textValue(value).trim();
  return text || undefined;
}
