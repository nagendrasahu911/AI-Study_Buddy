import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateTimetable } from "@/lib/ai.functions";
import { DAYS, SUBJECTS, type SubjectId } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "Study timetable — AI Study Buddy" },
      { name: "description", content: "Auto-generate a weekly study timetable around your subjects and free hours." },
      { property: "og:title", content: "Study timetable — AI Study Buddy" },
      { property: "og:description", content: "A realistic weekly plan with revision blocks, saved to your account." },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const queryClient = useQueryClient();
  const create = useServerFn(generateTimetable);

  const [picked, setPicked] = useState<SubjectId[]>(["C", "Python"]);
  const [hours, setHours] = useState("2");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState({ day_of_week: "1", start_time: "18:00", end_time: "19:00", subject: "Python", topic: "" });

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_slots")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["timetable"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  async function userId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  }

  async function generate() {
    if (picked.length === 0) {
      toast.error("Pick at least one subject.");
      return;
    }
    setBusy(true);
    try {
      const result = await create({ data: { subjects: picked, hoursPerDay: Number(hours), goal: goal || undefined } });
      const id = await userId();
      if (!id) throw new Error("Please sign in again.");
      await supabase.from("timetable_slots").delete().eq("user_id", id);
      const { error } = await supabase
        .from("timetable_slots")
        .insert(result.slots.map((item) => ({ ...item, user_id: id })));
      if (error) throw error;
      refresh();
      toast.success("Your weekly timetable is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the timetable.");
    } finally {
      setBusy(false);
    }
  }

  async function addSlot() {
    const id = await userId();
    if (!id) return;
    const { error } = await supabase.from("timetable_slots").insert({
      user_id: id,
      day_of_week: Number(slot.day_of_week),
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject: slot.subject,
      topic: slot.topic,
    });
    if (error) toast.error("Could not add the block.");
    else {
      refresh();
      toast.success("Block added.");
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
    if (error) toast.error("Could not remove the block.");
    else refresh();
  }

  return (
    <AppShell title="Study timetable" subtitle="Generate a realistic weekly plan, then tweak it block by block.">
      <div className="panel grid gap-4 p-6 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-2">
          <Label>Subjects</Label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((item) => {
              const active = picked.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setPicked((prev) => (active ? prev.filter((value) => value !== item.id) : [...prev, item.id]))
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-transparent bg-gradient-accent text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Hours per day</Label>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1", "2", "3", "4", "5", "6"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item} h
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal (optional)</Label>
          <Input id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="exam in 6 weeks" />
        </div>
        <div className="lg:col-span-4">
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate weekly timetable
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">Generating replaces your current plan.</p>
        </div>
      </div>

      <div className="panel mt-6 grid gap-3 p-6 sm:grid-cols-5">
        <div className="space-y-2">
          <Label>Day</Label>
          <Select value={slot.day_of_week} onValueChange={(value) => setSlot((prev) => ({ ...prev, day_of_week: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((day, index) => (
                <SelectItem key={day} value={String(index)}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Start</Label>
          <Input
            type="time"
            value={slot.start_time}
            onChange={(event) => setSlot((prev) => ({ ...prev, start_time: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>End</Label>
          <Input
            type="time"
            value={slot.end_time}
            onChange={(event) => setSlot((prev) => ({ ...prev, end_time: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <Select value={slot.subject} onValueChange={(value) => setSlot((prev) => ({ ...prev, subject: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" onClick={addSlot}>
            <CalendarPlus className="size-4" /> Add block
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="panel mt-6 grid place-items-center p-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DAYS.map((day, index) => {
            const daySlots = slots.filter((item) => item.day_of_week === index);
            return (
              <div key={day} className="panel p-5">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </h3>
                {daySlots.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Rest day</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {daySlots.map((item) => (
                      <li key={item.id} className="rounded-xl border border-border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.start_time}–{item.end_time}
                            </p>
                            {item.topic ? <p className="mt-1 text-xs text-muted-foreground">{item.topic}</p> : null}
                          </div>
                          <button onClick={() => remove(item.id)} aria-label="Remove block">
                            <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
