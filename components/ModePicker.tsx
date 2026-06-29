"use client";

import { PRESETS } from "@/prompts/presets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>What do you need help with?</CardTitle>
        <CardDescription>Pick an example, or describe anything.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const selected = presetId === p.id;
            return (
              <Button
                key={p.id}
                variant={selected ? "default" : "outline"}
                onClick={() => onPreset(p.id)}
                className="h-auto flex-col items-start gap-0.5 px-3 py-2.5 text-left whitespace-normal"
              >
                <span className="text-lg leading-none">{p.emoji}</span>
                <span className="mt-1 text-xs font-medium">{p.label}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    selected ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {p.blurb}
                </span>
              </Button>
            );
          })}
        </div>

        <div>
          <Input
            value={goal}
            onChange={(e) => onGoal(e.target.value)}
            placeholder="Or describe anything… e.g. 'adjust my bike derailleur'"
          />
          {goal && !presetId && (
            <p className="mt-1 text-[10px] text-cyan-600">
              Custom mode — the Planner agent will design the overlay.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
