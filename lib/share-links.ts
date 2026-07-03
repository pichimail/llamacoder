export function buildShareToken(chatId: string, messageId: string) {
  return `${chatId}-${messageId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
}
