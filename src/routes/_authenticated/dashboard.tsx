import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, Layers, ListChecks, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Progress dashboard — AI Study Buddy" },
      { name: "description", content: "See your quiz scores, study minutes and flashcards mastered." },
      { property: "og:title", content: "Progress dashboard — AI Study Buddy" },
      { property: "og:description", content: "Track quizzes, study time and mastered flashcards." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [attempts, cards, sessions, slots, profile] = await Promise.all([
        supabase.from("quiz_attempts").select("subject, score, total, created_at").order("created_at", { ascending: false }),
        supabase.from("flashcards").select("subject, confidence"),
        supabase.from("study_sessions").select("subject, minutes, created_at"),
        supabase.from("timetable_slots").select("id"),
        supabase.from("profiles").select("display_name").maybeSingle(),
      ]);
      return {
        attempts: attempts.data ?? [],
        cards: cards.data ?? [],
        sessions: sessions.data ?? [],
        slotCount: slots.data?.length ?? 0,
        name: profile.data?.display_name ?? "Learner",
      };
    },
  });

  const attempts = data?.attempts ?? [];
  const cards = data?.cards ?? [];
  const sessions = data?.sessions ?? [];

  const answered = attempts.reduce((sum, a) => sum + (a.total ?? 0), 0);
  const correct = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const minutes = sessions.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const mastered = cards.filter((c) => (c.confidence ?? 0) >= 2).length;

  const chart = SUBJECTS.map((subject) => {
    const subjectAttempts = attempts.filter((a) => a.subject === subject.id);
    const total = subjectAttempts.reduce((s, a) => s + (a.total ?? 0), 0);
    const score = subjectAttempts.reduce((s, a) => s + (a.score ?? 0), 0);
    return { subject: subject.id, accuracy: total ? Math.round((score / total) * 100) : 0 };
  });

  const stats = [
    { icon: ListChecks, label: "Quizzes taken", value: attempts.length },
    { icon: Trophy, label: "Quiz accuracy", value: `${accuracy}%` },
    { icon: Clock, label: "Minutes studied", value: minutes },
    { icon: Layers, label: "Cards mastered", value: `${mastered}/${cards.length}` },
  ];

  return (
    <AppShell
      title={`Hey ${data?.name ?? "there"} 👋`}
      subtitle="Here's how your learning is going this week."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="panel p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4 text-primary" /> {label}
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{isLoading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Accuracy by subject</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="subject" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar dataKey="accuracy" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="font-display text-lg font-semibold">Next steps</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="flex justify-between text-muted-foreground">
                <span>Flashcards mastered</span>
                <span>{cards.length ? Math.round((mastered / cards.length) * 100) : 0}%</span>
              </div>
              <Progress className="mt-2" value={cards.length ? (mastered / cards.length) * 100 : 0} />
            </div>
            <p className="text-muted-foreground">
              {data?.slotCount ? `${data.slotCount} timetable blocks planned.` : "No timetable yet — generate one."}
            </p>
            <div className="grid gap-2">
              <Button asChild size="sm">
                <Link to="/quiz">Take a quiz</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/flashcards">Review flashcards</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/timetable">Build timetable</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="font-display text-lg font-semibold">Recent quizzes</h2>
        {attempts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No quizzes yet. Your first one takes two minutes.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {attempts.slice(0, 6).map((attempt, index) => (
              <li key={index} className="flex items-center justify-between py-3">
                <span className="font-medium">{attempt.subject}</span>
                <span className="text-muted-foreground">
                  {attempt.score}/{attempt.total} · {new Date(attempt.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
