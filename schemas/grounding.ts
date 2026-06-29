/** Strict JSON schema for the Vision-Grounding agent. Boxes are [y1,x1,y2,x2] in 0..1000. */
export const groundingSchema = {
  type: "json_schema",
  json_schema: {
    name: "grounding_set",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["regions"],
      properties: {
        regions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "box_2d"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              // [y1,x1,y2,x2]. Cerebras strict mode rejects minItems/maxItems,
              // so length is enforced in code (see lib/agents/grounding.ts).
              box_2d: {
                type: "array",
                items: { type: "integer" },
              },
            },
          },
        },
      },
    },
  },
} as const;
