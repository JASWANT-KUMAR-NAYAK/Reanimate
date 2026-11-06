"use client";

import { useCallback, useRef, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { Header } from "@/components/Header";
import { HowItWorks } from "@/components/HowItWorks";
import { LoadingState } from "@/components/LoadingState";
import { RepoForm } from "@/components/RepoForm";
import { ReportView } from "@/components/ReportView";
import { analyzeRepository } from "@/lib/api";
import type { AnalysisReport } from "@/lib/types";

type State =
  | { phase: "idle" }
  | { phase: "loading"; url: string }
  | { phase: "error"; url: string; error: Error }
  | { phase: "success"; report: AnalysisReport };

const repoName = (url: string) => url.replace("https://github.com/", "");

export default function Home() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [input, setInput] = useState("");
  const controller = useRef<AbortController | null>(null);

  const analyze = useCallback(async (url: string) => {
    controller.current?.abort();
    const ctl = new AbortController();
    controller.current = ctl;
    setState({ phase: "loading", url });
    try {
      const report = await analyzeRepository(url, ctl.signal);
      setState({ phase: "success", report });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (ctl.signal.aborted) return;
      setState({ phase: "error", url, error: err instanceof Error ? err : new Error("Unexpected error") });
    }
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setInput("");
    setState({ phase: "idle" });
    window.scrollTo({ top: 0 });
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ phase: "idle" });
  }, []);

  const loading = state.phase === "loading";

  return (
    <>
      <Header hasReport={state.phase === "success"} onReset={reset} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {state.phase === "success" ? (
          <ReportView report={state.report} />
        ) : (
          <>
            <div className="mx-auto max-w-3xl pt-6 text-center sm:pt-12">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Find out why a repository went quiet, and how to revive it.</h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted sm:text-lg">
                Reanimate analyzes a public GitHub repository&apos;s activity, scores its maintenance health with transparent rules, and turns the evidence into a prioritized
                revival roadmap.
              </p>
            </div>
            <div className="mx-auto mt-8 max-w-2xl text-left">
              <RepoForm value={input} onChange={setInput} onSubmit={analyze} loading={loading} />
              {state.phase === "loading" && <LoadingState repo={repoName(state.url)} onCancel={cancel} />}
              {state.phase === "error" && <ErrorState error={state.error} onRetry={() => analyze(state.url)} />}
            </div>
            <HowItWorks />
          </>
        )}
      </main>
    </>
  );
}
