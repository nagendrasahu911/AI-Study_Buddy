import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — AI Study Buddy" },
      { name: "description", content: "Update your learner profile and log the study time you completed." },
      { property: "og:title", content: "Your profile — AI Study Buddy" },
      { property: "og:description", content: "Manage your learner details and log study sessions." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [favourite, setFavourite] = useState("Python");
  const [session, setSession] = useState({ subject: "Python", minutes: "30", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("*").maybeSingle();
      const { data: sessions } = await supabase
        .from("study_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return { email: userData.user?.email ?? "", profile, sessions: sessions ?? [] };
    },
  });

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.display_name ?? "");
      setFavourite(data.profile.favourite_subject ?? "Python");
    }
  }, [data?.profile]);

  async function saveProfile() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const id = userData.user?.id;
    if (id) {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id, display_name: name || "Learner", favourite_subject: favourite });
      if (error) toast.error("Could not save your profile.");
      else {
        toast.success("Profile saved.");
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    }
    setSaving(false);
  }

  async function logSession() {
    const { data: userData } = await supabase.auth.getUser();
    const id = userData.user?.id;
    if (!id) return;
    const { error } = await supabase.from("study_sessions").insert({
      user_id: id,
      subject: session.subject,
      minutes: Number(session.minutes) || 0,
      notes: session.notes,
    });
    if (error) toast.error("Could not log the session.");
    else {
      toast.success("Study session logged.");
      setSession({ ...session, notes: "" });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  }

  return (
    <AppShell title="Your profile" subtitle="This account is yours alone — progress is never shared with other learners.">
      {isLoading ? (
        <div className="panel grid place-items-center p-10">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Learner details</h2>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={data?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dname">Display name</Label>
              <Input id="dname" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Favourite subject</Label>
              <Select value={favourite} onValueChange={setFavourite}>
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
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
            </Button>
          </div>

          <div className="panel space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Log study time</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={session.subject}
                  onValueChange={(value) => setSession((prev) => ({ ...prev, subject: value }))}
                >
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
                <Label htmlFor="mins">Minutes</Label>
                <Input
                  id="mins"
                  type="number"
                  min={1}
                  value={session.minutes}
                  onChange={(event) => setSession((prev) => ({ ...prev, minutes: event.target.value }))}
                />
              </div>
            </div>
            <Textarea
              placeholder="What did you study?"
              value={session.notes}
              onChange={(event) => setSession((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <Button variant="outline" onClick={logSession}>
              <Timer className="size-4" /> Log session
            </Button>

            {data?.sessions.length ? (
              <ul className="divide-y divide-border border-t border-border pt-2 text-sm">
                {data.sessions.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span className="font-medium">{item.subject}</span>
                    <span className="text-muted-foreground">
                      {item.minutes} min · {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}
