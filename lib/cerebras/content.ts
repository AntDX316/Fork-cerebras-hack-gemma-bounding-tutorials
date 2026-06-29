/** Helpers for building OpenAI-compatible multimodal message content parts. */

export function textContent(text: string) {
  return { type: "text" as const, text };
}

/** Cerebras accepts base64 data URIs only (no hosted URLs). */
export function imageContent(dataURI: string) {
  return { type: "image_url" as const, image_url: { url: dataURI } };
}
