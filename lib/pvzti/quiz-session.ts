import type { QuizAnswers, Dimensions } from "./types";

const SESSION_KEY = "pvzti.quiz.session";
const RESULT_KEY = "pvzti.quiz.result";
const SESSION_EVENT = "pvzti:session-change";
const RESULT_EVENT = "pvzti:result-change";

export interface QuizSession {
  answers: QuizAnswers;
  currentIndex: number;
}

export interface QuizResult {
  plantId: string;
  userDimensions: Dimensions;
}

function emitStorageEvent(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

function subscribeStorageEvent(name: string, callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleChange = () => callback();
  window.addEventListener(name, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(name, handleChange);
    window.removeEventListener("storage", handleChange);
  };
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
  emitStorageEvent(SESSION_EVENT);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  emitStorageEvent(SESSION_EVENT);
}

export function clearAll(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(RESULT_KEY);
  emitStorageEvent(SESSION_EVENT);
  emitStorageEvent(RESULT_EVENT);
}

export function createFreshSession(): QuizSession {
  return { answers: {}, currentIndex: 0 };
}

export function saveResult(result: QuizResult): void {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  emitStorageEvent(RESULT_EVENT);
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

export function subscribeSession(callback: () => void): () => void {
  return subscribeStorageEvent(SESSION_EVENT, callback);
}

export function subscribeResult(callback: () => void): () => void {
  return subscribeStorageEvent(RESULT_EVENT, callback);
}
