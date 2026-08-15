import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateQuiz, type QuizQuestion } from "@/lib/ai.functions";
import { DIFFICULTIES, SUBJECTS, type Difficulty, type SubjectId } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz generator — AI Study Buddy" },
      { name: "description", content: "Generate fresh multiple-choice quizzes for C, Python, Maths and AI/ML." },
      { property: "og:title", content: "Quiz generator — AI Study Buddy" },
      { property: "og:description", content: "Instantly scored quizzes at your level, saved to your progress." },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const queryClient = useQueryClient();
  const create = useServerFn(generateQuiz);

  const [subject, setSubject] = useState<SubjectId>("Python");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.answerIndex ? 1 : 0), 0);

  async function build() {
    setBusy(true);
    setSubmitted(false);
    setAnswers({});
    setQuestions([]);
    try {
      const result = await create({
        data: { subject, difficulty, count: Number(count), topic: topic || undefined },
      });
      setQuestions(result.questions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the quiz.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setSubmitted(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      subject,
      difficulty,
      score,
      total: questions.length,
      questions,
    });
    if (error) toast.error("Could not save your score.");
    else {
      toast.success(`Saved: ${score}/${questions.length}`);
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }

  return (
    <AppShell title="Quiz generator" subtitle="Fresh questions every time, scored instantly and saved to your progress.">
      <div className="panel grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
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
          <Label>Level</Label>
          <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Questions</Label>
          <Select value={count} onValueChange={setCount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["3", "5", "8", "10"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic">Topic (optional)</Label>
          <Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="loops, arrays…" />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={build} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Generate quiz"}
          </Button>
        </div>
      </div>

      {questions.length > 0 ? (
        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="panel p-6">
              <p className="font-medium">
                {index + 1}. {question.question}
              </p>
              <div className="mt-4 grid gap-2">
                {question.options.map((option, optionIndex) => {
                  const chosen = answers[index] === optionIndex;
                  const isCorrect = question.answerIndex === optionIndex;
                  const state = submitted
                    ? isCorrect
                      ? "border-primary bg-primary/10"
                      : chosen
                        ? "border-destructive bg-destructive/10"
                        : "border-border"
                    : chosen
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted";
                  return (
                    <button
                      key={optionIndex}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition-colors ${state}`}
                    >
                      {submitted && isCorrect ? <CheckCircle2 className="size-4 text-primary" /> : null}
                      {submitted && chosen && !isCorrect ? <XCircle className="size-4 text-destructive" /> : null}
                      {option}
                    </button>
                  );
                })}
              </div>
              {submitted && question.explanation ? (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">{question.explanation}</p>
              ) : null}
            </div>
          ))}

          <div className="panel flex flex-wrap items-center justify-between gap-3 p-6">
            {submitted ? (
              <>
                <p className="font-display text-xl font-bold">
                  You scored {score}/{questions.length}
                </p>
                <Button variant="outline" onClick={build}>
                  <RotateCcw className="size-4" /> New quiz
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(answers).length}/{questions.length} answered
                </p>
                <Button onClick={submit} disabled={Object.keys(answers).length !== questions.length}>
                  Submit answers
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
