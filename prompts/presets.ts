import type { TaskProfile } from "@/schemas/annotation";

/**
 * Presets are just frozen TaskProfiles + a seed goal. They bypass the Planner
 * for demo determinism — but any freeform goal works through the Planner too.
 */
export interface Preset {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  goal: string;
  profile: TaskProfile;
}

export const PRESETS: Preset[] = [
  {
    id: "posture",
    label: "Posture / Fitness",
    emoji: "🧘",
    blurb: "Pose & form coaching with joint markers",
    goal: "Check my exercise / yoga form and show me how to improve",
    profile: {
      title: "Form check",
      targetDescription: "the person's major body joints and limbs relevant to their pose",
      renderStyle: "dots",
      scored: true,
      scoreLabel: "Form",
      sequence: false,
      research: false,
      summaryLabel: "What you're doing well",
    },
  },
  {
    id: "fridge",
    label: "Fridge / Nutrition",
    emoji: "🥗",
    blurb: "Health score per food item",
    goal: "Score how healthy each item is and give nutrition facts",
    profile: {
      title: "Nutrition scan",
      targetDescription: "each distinct food or drink item visible",
      renderStyle: "dots",
      scored: true,
      scoreLabel: "Health",
      sequence: false,
      research: true,
      summaryLabel: "Healthiest picks",
    },
  },
  {
    id: "construction",
    label: "Assembly / Repair",
    emoji: "🔧",
    blurb: "Step-by-step build & repair guide",
    goal: "Show me step by step how to assemble or repair this",
    profile: {
      title: "Assembly guide",
      targetDescription:
        "the parts, components and fasteners involved in assembling or repairing this object",
      renderStyle: "steps",
      scored: false,
      scoreLabel: "",
      sequence: true,
      research: true,
      summaryLabel: "Key points",
    },
  },
  {
    id: "gym",
    label: "Gym Equipment",
    emoji: "🏋️",
    blurb: "What goes where and why",
    goal: "Explain how to set up and use this gym equipment correctly",
    profile: {
      title: "Equipment guide",
      targetDescription: "the adjustable parts, pads, pins and handles of the gym equipment",
      renderStyle: "regions",
      scored: true,
      scoreLabel: "Setup",
      sequence: false,
      research: true,
      summaryLabel: "Setup checklist",
    },
  },
];

export function getPreset(id?: string): Preset | undefined {
  return id ? PRESETS.find((p) => p.id === id) : undefined;
}
