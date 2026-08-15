import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your account — AI Study Buddy" },
      {
        name: "description",
        content: "Create your own private AI Study Buddy account to track quizzes, flashcards and study time.",
      },
      { property: "og:title", content: "Sign in — AI Study Buddy" },
      { property: "og:description", content: "Every learner gets a separate, private study account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading: sessionLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sessionLoading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, sessionLoading, navigate]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      toast.success("Check your email to confirm your account.");
    } else {
      navigate({ to: "/dashboard", replace: true });
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      return toast.error("Google sign-in failed. Try email instead.");
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-hero lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-accent text-primary-foreground">
            <BrainCircuit className="size-4" />
          </span>
          AI Study Buddy
        </Link>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            One account per learner. <span className="text-gradient">Your progress stays yours.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Sign in from any device and pick up where you left off. Friends who sign in create their own separate
            account and start their own journey.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">C · Python · Maths · AI &amp; ML</p>
      </div>

      <div className="flex flex-col items-center justify-center p-6">
        <div className="mb-4 flex w-full max-w-md items-center justify-between lg:justify-end">
          <Link to="/" className="font-display font-bold lg:hidden">
            AI Study Buddy
          </Link>
          <ThemeToggle />
        </div>

        <div className="panel w-full max-w-md p-6">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-bold">Confirm your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to {email}. Click it, then come back and sign in.
              </p>
              <Button className="mt-6 w-full" variant="outline" onClick={() => setSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="signin">
                  Sign in
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="signup">
                  Create account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form className="mt-4 space-y-4" onSubmit={signIn}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={busy} type="submit">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="mt-4 space-y-4" onSubmit={signUp}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ha" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Email</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password2">Password</Label>
                    <Input
                      id="password2"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" disabled={busy} type="submit">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create my account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {sent ? null : (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
                Continue with Google
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
