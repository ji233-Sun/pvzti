import type { QuizAnswers, Dimensions } from "./types";

const SESSION_KEY = "pvzti.quiz.session";
const RESULT_KEY = "pvzti.quiz.result";

export interface QuizSession {
  answers: QuizAnswers;
  currentIndex: number;
}

export interface QuizResult {
  plantId: string;
  userDimensions: Dimensions;
}

export function loadSession(): QuizSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as QuizSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: QuizSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function clearAll(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(RESULT_KEY);
}

export function createFreshSession(): QuizSession {
  return { answers: {}, currentIndex: 0 };
}

export function saveResult(result: QuizResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadResult(): QuizResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    return raw ? (JSON.parse(raw) as QuizResult) : null;
  } catch {
    return null;
  }
}
