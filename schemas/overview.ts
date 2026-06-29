/** Strict JSON schema for the whole-image Overview agent (GoodPanel content). */
export const overviewSchema = {
  type: "json_schema",
  json_schema: {
    name: "overview",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["overallScore", "summary", "tip"],
      properties: {
        overallScore: { type: "number" },
        summary: { type: "array", items: { type: "string" } },
        tip: { type: "string" },
      },
    },
  },
} as const;
