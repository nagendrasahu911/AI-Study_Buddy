import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { callGateway, parseJson } from "./ai.server";

const askSchema = z.object({
  subject: z.string().min(1),
  question: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }) => {
    const answer = await callGateway([
      {
        role: "system",
        content: `You are AI Study Buddy, a patient tutor for absolute beginners studying ${data.subject}. Explain step by step in simple language, use short code examples where useful (C or Python as relevant), and end with one tiny practice task. Use markdown-free plain text with clear line breaks and simple lists.`,
      },
      ...data.history,
      { role: "user", content: data.question },
    ]);
    return { answer: answer || "I could not generate an answer, please try rephrasing." };
  });

const quizSchema = z.object({
  subject: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  count: z.number().int().min(3).max(10).default(5),
  topic: z.string().max(200).optional(),
});

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quizSchema.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            'Return ONLY JSON: {"questions":[{"question":string,"options":[4 strings],"answerIndex":0-3,"explanation":string}]}',
        },
        {
          role: "user",
          content: `Create ${data.count} ${data.difficulty} multiple-choice questions about ${data.subject}${
            data.topic ? ` focused on ${data.topic}` : ""
          }. Exactly 4 options each, one correct.`,
        },
      ],
      true,
    );
    const parsed = parseJson<{ questions: QuizQuestion[] }>(raw, { questions: [] });
    const questions = (parsed.questions ?? [])
      .filter((q) => q?.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        question: q.question,
        options: q.options.slice(0, 4),
        answerIndex: Math.min(Math.max(Number(q.answerIndex) || 0, 0), 3),
        explanation: q.explanation ?? "",
      }));
    if (questions.length === 0) throw new Error("Quiz generation failed, please retry.");
    return { questions };
  });

const flashSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().max(200).optional(),
  count: z.number().int().min(3).max(12).default(6),
});

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => flashSchema.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content: 'Return ONLY JSON: {"cards":[{"question":string,"answer":string}]}',
        },
        {
          role: "user",
          content: `Create ${data.count} beginner-friendly flashcards for ${data.subject}${
            data.topic ? ` on ${data.topic}` : ""
          }. Keep answers under 40 words.`,
        },
      ],
      true,
    );
    const parsed = parseJson<{ cards: Array<{ question: string; answer: string }> }>(raw, { cards: [] });
    const cards = (parsed.cards ?? []).filter((c) => c?.question && c?.answer);
    if (cards.length === 0) throw new Error("Flashcard generation failed, please retry.");
    return { cards };
  });

const timetableSchema = z.object({
  subjects: z.array(z.string().min(1)).min(1).max(4),
  hoursPerDay: z.number().int().min(1).max(8).default(2),
  goal: z.string().max(300).optional(),
});

export type PlanSlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  topic: string;
};

export const generateTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => timetableSchema.parse(input))
  .handler(async ({ data }) => {
    const raw = await callGateway(
      [
        {
          role: "system",
          content:
            'Return ONLY JSON: {"slots":[{"day_of_week":0-6 (0=Sunday),"start_time":"HH:MM","end_time":"HH:MM","subject":string,"topic":string}]}',
        },
        {
          role: "user",
          content: `Build a realistic weekly study timetable covering ${data.subjects.join(", ")}, about ${
            data.hoursPerDay
          } hours per day, evenings preferred, with a lighter weekend and revision blocks.${
            data.goal ? ` Goal: ${data.goal}.` : ""
          }`,
        },
      ],
      true,
    );
    const parsed = parseJson<{ slots: PlanSlot[] }>(raw, { slots: [] });
    const slots = (parsed.slots ?? [])
      .filter((s) => s?.subject && s?.start_time && s?.end_time)
      .map((s) => ({
        day_of_week: Math.min(Math.max(Number(s.day_of_week) || 0, 0), 6),
        start_time: s.start_time,
        end_time: s.end_time,
        subject: s.subject,
        topic: s.topic ?? "",
      }));
    if (slots.length === 0) throw new Error("Timetable generation failed, please retry.");
    return { slots };
  });
