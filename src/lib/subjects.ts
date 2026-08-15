export const SUBJECTS = [
  { id: "C", label: "C Programming", blurb: "Pointers, memory, loops, structs" },
  { id: "Python", label: "Python", blurb: "Syntax, data structures, OOP, libraries" },
  { id: "Maths", label: "Maths", blurb: "Algebra, calculus, probability, linear algebra" },
  { id: "AIML", label: "AI & ML", blurb: "Models, training, evaluation, neural nets" },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
