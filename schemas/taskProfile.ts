/** Strict JSON schema for the Planner agent's TaskProfile output. */
export const taskProfileSchema = {
  type: "json_schema",
  json_schema: {
    name: "task_profile",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "targetDescription",
        "renderStyle",
        "scored",
        "scoreLabel",
        "sequence",
        "research",
        "summaryLabel",
      ],
      properties: {
        title: { type: "string" },
        targetDescription: { type: "string" },
        renderStyle: { type: "string", enum: ["dots", "regions", "steps"] },
        scored: { type: "boolean" },
        scoreLabel: { type: "string" },
        sequence: { type: "boolean" },
        research: { type: "boolean" },
        summaryLabel: { type: "string" },
      },
    },
  },
} as const;
