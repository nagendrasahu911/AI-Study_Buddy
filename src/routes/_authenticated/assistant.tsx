import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/ai.functions";
import { SUBJECTS, type SubjectId } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI tutor — ask anything about C, Python, Maths or AI/ML" },
      { name: "description", content: "Ask your AI study buddy any beginner question and get step-by-step answers." },
      { property: "og:title", content: "AI tutor — AI Study Buddy" },
      { property: "og:description", content: "Step-by-step beginner answers for C, Python, Maths and AI/ML." },
    ],
  }),
  component: Assistant,
});

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What is a pointer in C, with a simple example?",
  "Explain Python lists vs tuples for a beginner",
  "How do I find the derivative of x^3 + 2x?",
  "What is overfitting in machine learning?",
];

function Assistant() {
  const [subject, setSubject] = useState<SubjectId>("Python");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askAssistant);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history = messages.slice(-8);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({ data: { subject, question: text, history } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: "smooth" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="AI tutor" subtitle="Pick a subject and ask anything — answers are made for beginners.">
      <div className="mb-4 flex flex-wrap gap-2">
        {SUBJECTS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubject(item.id)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              subject === item.id
                ? "border-transparent bg-gradient-accent text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="panel flex min-h-[55vh] flex-col p-4 sm:p-6">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto size-6 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Try one of these to get started:</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => send(starter)}
                    className="rounded-xl border border-border p-3 text-left text-sm transition-colors hover:bg-muted"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-gradient-accent text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.content}
              </div>
            ))
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          ) : null}
          <div ref={bottom} />
        </div>

        <form
          className="mt-4 flex items-end gap-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ask about ${subject}…`}
            className="min-h-[52px] resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <Button type="submit" disabled={busy || !input.trim()} size="icon" className="size-11">
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
