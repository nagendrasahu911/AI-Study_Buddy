import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { generateFlashcards } from "@/lib/ai.functions";
import { SUBJECTS, type SubjectId } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — AI Study Buddy" },
      { name: "description", content: "Generate and review flashcards for C, Python, Maths and AI/ML." },
      { property: "og:title", content: "Flashcards — AI Study Buddy" },
      { property: "og:description", content: "AI-generated flip cards you can save and rate as you learn." },
    ],
  }),
  component: FlashcardsPage,
});

const CONFIDENCE = ["Learning", "Almost", "Mastered"];

function FlashcardsPage() {
  const queryClient = useQueryClient();
  const create = useServerFn(generateFlashcards);

  const [subject, setSubject] = useState<SubjectId>("C");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [manual, setManual] = useState({ question: "", answer: "" });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["flashcards"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveCards = useMutation({
    mutationFn: async (rows: Array<{ question: string; answer: string }>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Please sign in again.");
      const { error } = await supabase
        .from("flashcards")
        .insert(rows.map((row) => ({ ...row, subject, user_id: userId })));
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Flashcards saved.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function generate() {
    setBusy(true);
    try {
      const result = await create({ data: { subject, topic: topic || undefined, count: 6 } });
      await saveCards.mutateAsync(result.cards);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate flashcards.");
    } finally {
      setBusy(false);
    }
  }

  async function setConfidence(id: string, value: number) {
    const { error } = await supabase.from("flashcards").update({ confidence: value }).eq("id", id);
    if (error) toast.error("Could not update the card.");
    else refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) toast.error("Could not delete the card.");
    else refresh();
  }

  return (
    <AppShell title="Flashcards" subtitle="Generate a deck with AI or add your own, then rate how well you know each card.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-4 p-6">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={(value) => setSubject(value as SubjectId)}>
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
          <div className="space-y-2">
            <Label htmlFor="ftopic">Topic (optional)</Label>
            <Input id="ftopic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="pointers, numpy…" />
          </div>
          <Button className="w-full" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate 6 cards
          </Button>

          <div className="space-y-2 border-t border-border pt-4">
            <Label>Add your own</Label>
            <Input
              placeholder="Question"
              value={manual.question}
              onChange={(event) => setManual((prev) => ({ ...prev, question: event.target.value }))}
            />
            <Textarea
              placeholder="Answer"
              value={manual.answer}
              onChange={(event) => setManual((prev) => ({ ...prev, answer: event.target.value }))}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={!manual.question.trim() || !manual.answer.trim()}
              onClick={async () => {
                await saveCards.mutateAsync([manual]);
                setManual({ question: "", answer: "" });
              }}
            >
              <Plus className="size-4" /> Add card
            </Button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="panel grid place-items-center p-10">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : cards.length === 0 ? (
            <div className="panel p-10 text-center text-sm text-muted-foreground">
              No cards yet. Generate your first deck on the left.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {cards.map((card) => (
                <div key={card.id} className="panel flex flex-col p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">{card.subject}</span>
                    <button onClick={() => remove(card.id)} aria-label="Delete card">
                      <Trash2 className="size-4 hover:text-destructive" />
                    </button>
                  </div>
                  <button
                    className="mt-3 flex-1 text-left"
                    onClick={() => setFlipped((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                  >
                    <p className="font-medium">{card.question}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {flipped[card.id] ? card.answer : "Tap to reveal the answer"}
                    </p>
                  </button>
                  <div className="mt-4 flex gap-1">
                    {CONFIDENCE.map((label, index) => (
                      <button
                        key={label}
                        onClick={() => setConfidence(card.id, index)}
                        className={`flex-1 rounded-lg border px-2 py-1 text-xs transition-colors ${
                          card.confidence === index
                            ? "border-transparent bg-gradient-accent text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
