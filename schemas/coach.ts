/**
 * Strict JSON schema for the Domain-Coach agent (one call per region).
 * All fields are required (strict mode); unused ones use sentinel values
 * (score 0, empty arrays/strings, manualRef [0,0,0,0]) that the UI ignores
 * based on the TaskProfile flags.
 */
export const coachSchema = {
  type: "json_schema",
  json_schema: {
    name: "coach_item",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["score", "whatGood", "fix", "facts", "stepOrder", "stepAction", "manualRef"],
      properties: {
        score: { type: "number" },
        whatGood: { type: "array", items: { type: "string" } },
        fix: { type: "string" },
        facts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value"],
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
          },
        },
        stepOrder: { type: "integer" },
        stepAction: { type: "string" },
        // [y1,x1,y2,x2] in the reference image, or [0,0,0,0]. Length enforced
        // in code (Cerebras strict mode rejects minItems/maxItems).
        manualRef: {
          type: "array",
          items: { type: "integer" },
        },
      },
    },
  },
} as const;
