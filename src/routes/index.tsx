import { Link, createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, Calendar, Layers, ListChecks, LineChart, ShieldCheck } from "lucide-react";

import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SUBJECTS } from "@/lib/subjects";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Study Buddy — AI tutor for C, Python, Maths & AI/ML" },
      {
        name: "description",
        content:
          "Create your own account and learn C, Python, Maths and AI/ML with an AI tutor, generated quizzes, flashcards, a study timetable and progress tracking.",
      },
      { property: "og:title", content: "AI Study Buddy — Learn to code with an AI tutor" },
      {
        property: "og:description",
        content: "Every learner gets their own account, AI-generated quizzes, flashcards, timetable and progress.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BrainCircuit, title: "AI question assistant", body: "Ask anything about C, Python, Maths or AI/ML and get beginner-friendly, step-by-step answers." },
  { icon: ListChecks, title: "Quiz generator", body: "Fresh multiple-choice quizzes at beginner, intermediate or advanced level, scored instantly." },
  { icon: Layers, title: "Flashcards", body: "Generate and save flip-cards, then mark how well you know each one." },
  { icon: Calendar, title: "Study timetable", body: "Auto-build a weekly plan around your subjects and available hours." },
  { icon: LineChart, title: "Progress dashboard", body: "Track quiz scores, study minutes, streaks and cards mastered." },
  { icon: ShieldCheck, title: "Private accounts", body: "Sign in from any device — you and your friends each get a separate, private learning space." },
];

function Landing() {
  const { session, loading } = useAuth();

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-accent text-primary-foreground">
            <BrainCircuit className="size-4" />
          </span>
          AI Study Buddy
        </span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : session ? (
            <Button asChild size="sm">
              <Link to="/dashboard">My dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 text-center sm:pt-20">
        <span className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          C · Python · Maths · AI &amp; ML
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your own <span className="text-gradient">AI study buddy</span> for learning to code
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Sign up once and get a private learning space: an AI tutor that explains like you're a beginner,
          auto-generated quizzes and flashcards, a weekly timetable and a progress dashboard. Your friends can
          sign in on their own devices and get their own separate account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to={session ? "/dashboard" : "/auth"}>{session ? "Continue learning" : "Start learning free"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Create an account</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUBJECTS.map((subject) => (
            <div key={subject.id} className="panel p-5 text-left">
              <h3 className="font-display text-base font-semibold">{subject.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{subject.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything in one study space</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="panel p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Built with AI Study Buddy — keep learning, one block at a time.
      </footer>
    </div>
  );
}
