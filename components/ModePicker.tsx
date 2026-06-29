"use client";

import { PRESETS } from "@/prompts/presets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ModePicker({
  presetId,
  goal,
  onPreset,
  onGoal,
}: {
  presetId: string | undefined;
  goal: string;
  onPreset: (id: string) => void;
  onGoal: (goal: string) => void;
}) {
  const custom = !!goal && !presetId;
  return (
    <Card>
      <CardHeader>
        <CardTitle>What do you need help with?</CardTitle>
        <CardDescription>Describe anything — the Planner agent designs the overlay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* PRIMARY: free-form goal (the headline of this panel). */}
        <div>
          <Textarea
            value={goal}
            onChange={(e) => onGoal(e.target.value)}
            rows={4}
            placeholder="e.g. “label all my facial features and look up how to improve each one” — or “adjust my bike derailleur”, “is my monstera healthy?”"
            className="min-h-[104px] text-sm leading-relaxed"
          />
          <p className={`mt-1.5 text-[11px] ${custom ? "text-primary" : "text-muted-foreground"}`}>
            {custom
              ? "Custom mode — the Planner agent will design the overlay."
              : "Type any goal above, or start from an example."}
          </p>
        </div>

        {/* SECONDARY: example presets, compact. */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Examples
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const selected = presetId === p.id;
              return (
                <Button
                  key={p.id}
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPreset(p.id)}
                  className="h-auto justify-start gap-1.5 px-2.5 py-1.5 text-left"
                >
                  <span className="text-base leading-none">{p.emoji}</span>
                  <span className="text-xs font-medium">{p.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
