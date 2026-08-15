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
  component: QuizPage;
});

function QuizPage() {
  return null;
}
