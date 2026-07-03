export function getShareScreenshotUrl(domain: string, messageId: string): string {
  const shareUrl = `${domain}/share/v2/${messageId}`;
  return `https://image.thum.io/get/width/560/crop/600/noanimate/${encodeURIComponent(shareUrl)}`;
}

export function buildOgImagePath(params: {
  prompt: string;
  messageId?: string;
}): string {
  const search = new URLSearchParams();
  search.set("prompt", params.prompt);
  if (params.messageId) search.set("messageId", params.messageId);
  return `/api/og?${search.toString()}`;
}
