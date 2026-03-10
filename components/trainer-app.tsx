"use client";

import { useEffect, useMemo, useState } from "react";
import { Lang, dictionaries } from "@/lib/i18n";

type MePayload = {
  user: {
    id: string;
    username: string;
  };
  stats: {
    totalAttempts: number;
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    activeMistakes: number;
    variantStats: Array<{
      variant: number;
      total: number;
      correct: number;
      accuracy: number;
    }>;
    recentAttempts: Array<{
      id: string;
      mode: "VARIANT" | "MIXED";
      variantNumber: number | null;
      startedAt: string;
      finishedAt: string;
      totalQuestions: number;
      correctCount: number;
      elapsedSec: number | null;
    }>;
  };
};

type QuizQuestion = {
  id: string;
  text: string;
  order: number;
  variantId: number;
  options: Array<{
    id: string;
    label: string;
    text: string;
    order: number;
  }>;
};

type QuizAttempt = {
  id: string;
  mode: "VARIANT" | "MIXED";
  variantNumber: number | null;
  totalQuestions: number;
  startedAt: string;
};

type QuizSession = {
  attempt: QuizAttempt;
  questions: QuizQuestion[];
  startedAtMs: number;
  index: number;
  answers: Record<
    string,
    {
      selectedOptionId: string;
      isCorrect: boolean;
      correctOptionLabel: string;
    }
  >;
};

type MistakeSession = {
  questions: MistakeQuestion[];
  index: number;
  answers: Record<
    string,
    {
      selectedOptionId: string;
      isCorrect: boolean;
      correctOptionLabel: string;
      streak: number;
      isActive: boolean;
    }
  >;
  startedAtMs: number;
};

type MistakeQuestion = {
  questionId: string;
  text: string;
  variantId: number;
  order: number;
  streak: number;
  timesWrong: number;
  options: Array<{ id: string; label: string; text: string }>;
};

const LANG_STORAGE_KEY = "podgotovka_lang";

type AuthMode = "login" | "register";

function formatSec(total: number): string {
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(total % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${sec}`;
}

export function TrainerApp() {
  const [lang, setLang] = useState<Lang>("ru");
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MePayload | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [quizMode, setQuizMode] = useState<"variant" | "mixed">("variant");
  const [variantNumber, setVariantNumber] = useState(1);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [quizSummary, setQuizSummary] = useState<{
    totalQuestions: number;
    answeredCount: number;
    correctCount: number;
    accuracy: number;
  } | null>(null);
  const [quizBusy, setQuizBusy] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [mistakeSession, setMistakeSession] = useState<MistakeSession | null>(null);
  const [mistakeSummary, setMistakeSummary] = useState<{
    totalQuestions: number;
    answeredCount: number;
    correctCount: number;
    resolvedCount: number;
  } | null>(null);
  const [mistakeBusy, setMistakeBusy] = useState(false);

  const t = dictionaries[lang];

  const currentQuizQuestion = useMemo(() => {
    if (!quizSession) {
      return null;
    }

    return quizSession.questions[quizSession.index] ?? null;
  }, [quizSession]);

  const currentMistakeQuestion = useMemo(() => {
    if (!mistakeSession) {
      return null;
    }

    return mistakeSession.questions[mistakeSession.index] ?? null;
  }, [mistakeSession]);

  useEffect(() => {
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
    if (savedLang === "ru" || savedLang === "kz") {
      setLang(savedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    if (!quizSession) {
      setElapsedSec(0);
      return;
    }

    const update = () => {
      setElapsedSec(Math.floor((Date.now() - quizSession.startedAtMs) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [quizSession]);

  useEffect(() => {
    void loadMe();
  }, []);

  async function loadMe() {
    setLoading(true);
    try {
      const response = await fetch("/api/me");
      if (response.status === 401) {
        setMe(null);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const payload = (await response.json()) as MePayload;
      setMe(payload);
    } catch (error) {
      console.error(error);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setAuthError(payload.error ?? "Auth failed");
        return;
      }

      setUsername("");
      setPassword("");
      await loadMe();
    } catch (error) {
      console.error(error);
      setAuthError("Network error");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    setMe(null);
    setQuizSession(null);
    setQuizSummary(null);
    setMistakeSession(null);
    setMistakeSummary(null);
  }

  async function startQuiz() {
    setQuizBusy(true);
    setQuizSummary(null);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: quizMode,
          variantNumber: quizMode === "variant" ? variantNumber : undefined
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Quiz start failed");
      }

      const payload = (await response.json()) as {
        attempt: QuizAttempt;
        questions: QuizQuestion[];
      };

      setQuizSession({
        attempt: payload.attempt,
        questions: payload.questions,
        startedAtMs: Date.now(),
        index: 0,
        answers: {}
      });
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setQuizBusy(false);
    }
  }

  async function answerQuiz(optionId: string) {
    if (!quizSession || !currentQuizQuestion) {
      return;
    }

    const already = quizSession.answers[currentQuizQuestion.id];
    if (already) {
      return;
    }

    setQuizBusy(true);

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attemptId: quizSession.attempt.id,
          questionId: currentQuizQuestion.id,
          optionId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Answer failed");
      }

      const payload = (await response.json()) as {
        isCorrect: boolean;
        correctOptionLabel: string;
      };

      setQuizSession((prev) => {
        if (!prev || !currentQuizQuestion) {
          return prev;
        }

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [currentQuizQuestion.id]: {
              selectedOptionId: optionId,
              isCorrect: payload.isCorrect,
              correctOptionLabel: payload.correctOptionLabel
            }
          }
        };
      });
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setQuizBusy(false);
    }
  }

  function goNextQuizQuestion() {
    setQuizSession((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        index: Math.min(prev.index + 1, prev.questions.length - 1)
      };
    });
  }

  async function finishQuiz() {
    if (!quizSession) {
      return;
    }

    setQuizBusy(true);

    try {
      const response = await fetch("/api/quiz/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attemptId: quizSession.attempt.id,
          elapsedSec
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Finish failed");
      }

      const payload = (await response.json()) as {
        totalQuestions: number;
        answeredCount: number;
        correctCount: number;
        accuracy: number;
      };

      setQuizSummary(payload);
      setQuizSession(null);
      await loadMe();
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setQuizBusy(false);
    }
  }

  async function loadMistakeQueue(): Promise<MistakeQuestion[]> {
    const response = await fetch("/api/mistakes");
    if (!response.ok) {
      throw new Error("Failed to load mistakes");
    }

    const payload = (await response.json()) as {
      count: number;
      questions: MistakeQuestion[];
    };

    return payload.questions;
  }

  async function startMistakeSession() {
    setMistakeBusy(true);
    setMistakeSummary(null);

    try {
      const questions = await loadMistakeQueue();
      if (questions.length === 0) {
        alert(t.noMistakes);
        return;
      }

      setMistakeSession({
        questions,
        index: 0,
        answers: {},
        startedAtMs: Date.now()
      });
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setMistakeBusy(false);
    }
  }

  async function answerMistake(optionId: string) {
    if (!mistakeSession || !currentMistakeQuestion) {
      return;
    }

    const already = mistakeSession.answers[currentMistakeQuestion.questionId];
    if (already) {
      return;
    }

    setMistakeBusy(true);

    try {
      const response = await fetch("/api/mistakes/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          questionId: currentMistakeQuestion.questionId,
          optionId
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Mistake answer failed");
      }

      const payload = (await response.json()) as {
        isCorrect: boolean;
        correctOptionLabel: string;
        streak: number;
        isActive: boolean;
      };

      setMistakeSession((prev) => {
        if (!prev || !currentMistakeQuestion) {
          return prev;
        }

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [currentMistakeQuestion.questionId]: {
              selectedOptionId: optionId,
              isCorrect: payload.isCorrect,
              correctOptionLabel: payload.correctOptionLabel,
              streak: payload.streak,
              isActive: payload.isActive
            }
          }
        };
      });
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setMistakeBusy(false);
    }
  }

  function goNextMistakeQuestion() {
    setMistakeSession((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        index: Math.min(prev.index + 1, prev.questions.length - 1)
      };
    });
  }

  async function finishMistakeSession() {
    if (!mistakeSession) {
      return;
    }

    const answers = Object.values(mistakeSession.answers);
    const answeredCount = answers.length;
    const correctCount = answers.filter((answer) => answer.isCorrect).length;
    const resolvedCount = answers.filter((answer) => !answer.isActive).length;

    setMistakeSummary({
      totalQuestions: mistakeSession.questions.length,
      answeredCount,
      correctCount,
      resolvedCount
    });
    setMistakeSession(null);
    await loadMe();
  }

  const quizAnsweredCount = quizSession
    ? Object.keys(quizSession.answers).length
    : 0;
  const mistakeAnsweredCount = mistakeSession
    ? Object.keys(mistakeSession.answers).length
    : 0;

  if (loading) {
    return <main className="card center-text">{t.loading}</main>;
  }

  if (!me) {
    return (
      <main className="grid-auth">
        <section className="card">
          <header className="title-wrap">
            <h1>{t.appTitle}</h1>
            <p>{t.appSubtitle}</p>
          </header>

          <div className="lang-switch">
            <button
              className={lang === "ru" ? "lang active" : "lang"}
              onClick={() => setLang("ru")}
              type="button"
            >
              RU
            </button>
            <button
              className={lang === "kz" ? "lang active" : "lang"}
              onClick={() => setLang("kz")}
              type="button"
            >
              KZ
            </button>
          </div>

          <div className="auth-switch">
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              {t.login}
            </button>
            <button
              className={authMode === "register" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              {t.register}
            </button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            <label>
              {t.username}
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label>
              {t.password}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {authError ? <p className="error-text">{authError}</p> : null}
            <button type="submit" className="primary">
              {t.authSubmit}
            </button>
          </form>
          <p className="author-line">{t.author}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="stack-large">
      <section className="card topbar">
        <div>
          <h1>{t.appTitle}</h1>
          <p>
            {me.user.username} · {t.appSubtitle}
          </p>
        </div>
        <div className="topbar-actions">
          <div className="lang-switch">
            <button
              className={lang === "ru" ? "lang active" : "lang"}
              onClick={() => setLang("ru")}
              type="button"
            >
              RU
            </button>
            <button
              className={lang === "kz" ? "lang active" : "lang"}
              onClick={() => setLang("kz")}
              type="button"
            >
              KZ
            </button>
          </div>
          <button type="button" className="ghost" onClick={handleLogout}>
            {t.logout}
          </button>
        </div>
      </section>

      {quizSession && currentQuizQuestion ? (
        <section className="card stack">
          <div className="row-between">
            <strong>
              {t.question} {quizSession.index + 1}/{quizSession.questions.length}
            </strong>
            <span>
              {t.timer}: {formatSec(elapsedSec)}
            </span>
          </div>
          <p className="question-text">{currentQuizQuestion.text}</p>
          <div className="stack">
            {currentQuizQuestion.options.map((option) => {
              const answer = quizSession.answers[currentQuizQuestion.id];
              const selected = answer?.selectedOptionId === option.id;
              const correctChoice = answer?.correctOptionLabel === option.label;
              const className = [
                "option",
                selected ? "selected" : "",
                answer && correctChoice ? "correct" : "",
                answer && selected && !answer.isCorrect ? "incorrect" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={option.id}
                  className={className}
                  onClick={() => answerQuiz(option.id)}
                  type="button"
                  disabled={quizBusy || Boolean(answer)}
                >
                  <span>{option.label})</span>
                  <span>{option.text}</span>
                </button>
              );
            })}
          </div>

          {quizSession.answers[currentQuizQuestion.id] ? (
            <p
              className={
                quizSession.answers[currentQuizQuestion.id].isCorrect
                  ? "ok-text"
                  : "error-text"
              }
            >
              {quizSession.answers[currentQuizQuestion.id].isCorrect
                ? t.correct
                : `${t.incorrect}. ${t.correctAnswer}: ${quizSession.answers[currentQuizQuestion.id].correctOptionLabel}`}
            </p>
          ) : null}

          <div className="row-between">
            <button type="button" className="ghost" onClick={finishQuiz}>
              {t.finishQuiz}
            </button>
            {quizSession.index < quizSession.questions.length - 1 ? (
              <button
                type="button"
                className="primary"
                onClick={goNextQuizQuestion}
                disabled={!quizSession.answers[currentQuizQuestion.id]}
              >
                {t.nextQuestion}
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={finishQuiz}
                disabled={quizBusy}
              >
                {t.completed}
              </button>
            )}
          </div>
          <p>
            {quizAnsweredCount}/{quizSession.questions.length}
          </p>
        </section>
      ) : null}

      {!quizSession && !mistakeSession && quizSummary ? (
        <section className="card stack">
          <h2>{t.completed}</h2>
          <p>
            {t.totalAnswered}: {quizSummary.answeredCount}/{quizSummary.totalQuestions}
          </p>
          <p>
            {t.accuracy}: {quizSummary.accuracy}%
          </p>
          <button className="primary" type="button" onClick={() => setQuizSummary(null)}>
            {t.dashboard}
          </button>
        </section>
      ) : null}

      {!quizSession && !quizSummary && mistakeSession && currentMistakeQuestion ? (
        <section className="card stack">
          <div className="row-between">
            <strong>
              {t.mistakesWork}: {mistakeSession.index + 1}/{mistakeSession.questions.length}
            </strong>
            <span>
              {t.totalAnswered}: {mistakeAnsweredCount}/{mistakeSession.questions.length}
            </span>
          </div>

          <p>
            {t.question}: V{currentMistakeQuestion.variantId} #{currentMistakeQuestion.order}
          </p>
          <p className="question-text">{currentMistakeQuestion.text}</p>

          <div className="stack">
            {currentMistakeQuestion.options.map((option) => {
              const answer = mistakeSession.answers[currentMistakeQuestion.questionId];
              const selected = answer?.selectedOptionId === option.id;
              const correctChoice = answer?.correctOptionLabel === option.label;
              const className = [
                "option",
                selected ? "selected" : "",
                answer && correctChoice ? "correct" : "",
                answer && selected && !answer.isCorrect ? "incorrect" : ""
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={option.id}
                  className={className}
                  onClick={() => answerMistake(option.id)}
                  type="button"
                  disabled={mistakeBusy || Boolean(answer)}
                >
                  <span>{option.label})</span>
                  <span>{option.text}</span>
                </button>
              );
            })}
          </div>

          {mistakeSession.answers[currentMistakeQuestion.questionId] ? (
            <p
              className={
                mistakeSession.answers[currentMistakeQuestion.questionId].isCorrect
                  ? "ok-text"
                  : "error-text"
              }
            >
              {mistakeSession.answers[currentMistakeQuestion.questionId].isCorrect
                ? `${t.correct}. ${t.streak}: ${mistakeSession.answers[currentMistakeQuestion.questionId].streak}/3`
                : `${t.incorrect}. ${t.correctAnswer}: ${mistakeSession.answers[currentMistakeQuestion.questionId].correctOptionLabel}`}
            </p>
          ) : null}

          <div className="row-between">
            <button type="button" className="ghost" onClick={finishMistakeSession}>
              {t.finishQuiz}
            </button>
            {mistakeSession.index < mistakeSession.questions.length - 1 ? (
              <button
                type="button"
                className="primary"
                onClick={goNextMistakeQuestion}
                disabled={!mistakeSession.answers[currentMistakeQuestion.questionId]}
              >
                {t.nextQuestion}
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={finishMistakeSession}
                disabled={mistakeBusy}
              >
                {t.completed}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {!quizSession && !quizSummary && !mistakeSession && mistakeSummary ? (
        <section className="card stack">
          <h2>{t.mistakesWork}</h2>
          <p>
            {t.totalAnswered}: {mistakeSummary.answeredCount}/{mistakeSummary.totalQuestions}
          </p>
          <p>
            {t.correct}: {mistakeSummary.correctCount}
          </p>
          <p>
            Закрыто в этой сессии: {mistakeSummary.resolvedCount}
          </p>
          <button className="primary" type="button" onClick={() => setMistakeSummary(null)}>
            {t.dashboard}
          </button>
        </section>
      ) : null}

      {!quizSession && !quizSummary && !mistakeSession && !mistakeSummary ? (
        <>
          <section className="card stack">
            <h2>{t.dashboard}</h2>
            <div className="stats-grid">
              <article>
                <h3>{t.totalAttempts}</h3>
                <p>{me.stats.totalAttempts}</p>
              </article>
              <article>
                <h3>{t.totalAnswered}</h3>
                <p>{me.stats.totalAnswered}</p>
              </article>
              <article>
                <h3>{t.accuracy}</h3>
                <p>{me.stats.accuracy}%</p>
              </article>
              <article>
                <h3>{t.activeMistakes}</h3>
                <p>{me.stats.activeMistakes}</p>
              </article>
            </div>

            <div className="quiz-controls">
              <div className="auth-switch">
                <button
                  type="button"
                  className={quizMode === "variant" ? "tab active" : "tab"}
                  onClick={() => setQuizMode("variant")}
                >
                  {t.modeVariant}
                </button>
                <button
                  type="button"
                  className={quizMode === "mixed" ? "tab active" : "tab"}
                  onClick={() => setQuizMode("mixed")}
                >
                  {t.modeMixed}
                </button>
              </div>

              {quizMode === "variant" ? (
                <label>
                  {t.variantLabel}
                  <select
                    value={variantNumber}
                    onChange={(event) => setVariantNumber(Number(event.target.value))}
                  >
                    {Array.from({ length: 9 }).map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button className="primary" type="button" onClick={startQuiz} disabled={quizBusy}>
                {t.startQuiz}
              </button>
            </div>
          </section>

          <section className="card stack">
            <h2>{t.mistakesWork}</h2>
            <p>
              {t.activeMistakes}: {me.stats.activeMistakes}
            </p>
            <button
              className="primary"
              type="button"
              onClick={startMistakeSession}
              disabled={mistakeBusy}
            >
              {t.startMistakeSession}
            </button>
          </section>

          <section className="card stack">
            <h2>{t.stats}</h2>
            <div className="stack">
              {me.stats.variantStats.map((variantRow) => (
                <div key={variantRow.variant} className="variant-row">
                  <span>
                    {t.variantLabel} {variantRow.variant}
                  </span>
                  <div className="bar-wrap">
                    <div className="bar-fill" style={{ width: `${variantRow.accuracy}%` }} />
                  </div>
                  <span>{variantRow.accuracy}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card stack">
            <h2>{t.history}</h2>
            {me.stats.recentAttempts.length === 0 ? (
              <p>{t.totalAttempts}: 0</p>
            ) : (
              <div className="history-list">
                {me.stats.recentAttempts.map((attempt) => (
                  <article key={attempt.id} className="history-item">
                    <p>
                      {attempt.mode === "VARIANT"
                        ? `${t.modeVariant} ${attempt.variantNumber}`
                        : t.modeMixed}
                    </p>
                    <p>
                      {attempt.correctCount}/{attempt.totalQuestions} · {attempt.elapsedSec ?? 0}s
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <footer className="footer-line">{t.author}</footer>
    </main>
  );
}
