"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
let scriptPromise: Promise<TurnstileApi> | undefined;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 20000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = undefined;
      reject(new Error("Challenge unavailable"));
    }
    script.onerror = fail;
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function Turnstile({
  action,
  onToken,
}: {
  action: "admin-login" | "admin-reset" | "registration";
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "loading" | "pending" | "ready" | "failed" | "expired"
  >("loading");
  const [attempt, setAttempt] = useState(0);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    let alive = true;
    let widget: string | undefined;
    let api: TurnstileApi | undefined;
    let observer: ResizeObserver | undefined;
    if (siteKey)
      void loadTurnstile()
        .then((value) => {
          if (!alive || !container.current) return;
          api = value;
          let compact: boolean | undefined;
          const render = () => {
            if (!alive || !container.current || !api) return;
            const nextCompact = container.current.clientWidth < 300;
            if (compact === nextCompact) return;
            compact = nextCompact;
            if (widget) api.remove(widget);
            onToken("");
            setStatus("pending");
            widget = api.render(container.current, {
              sitekey: siteKey,
              action,
              theme: "dark",
              size: nextCompact ? "compact" : "flexible",
              retry: "never",
              "refresh-expired": "manual",
              callback: (token: string) => {
                if (alive) {
                  onToken(token);
                  setStatus("ready");
                }
              },
              "expired-callback": () => {
                if (alive) {
                  onToken("");
                  setStatus("expired");
                }
              },
              "error-callback": () => {
                if (alive) {
                  onToken("");
                  setStatus("failed");
                }
              },
              "timeout-callback": () => {
                if (alive) {
                  onToken("");
                  setStatus("expired");
                }
              },
            });
          };
          render();
          observer = new ResizeObserver(render);
          observer.observe(container.current);
        })
        .catch(() => {
          if (alive) {
            onToken("");
            setStatus("failed");
          }
        });
    return () => {
      alive = false;
      observer?.disconnect();
      if (api && widget) api.remove(widget);
    };
  }, [action, onToken, siteKey, attempt]);
  return (
    <div className="space-y-3">
      <div ref={container} className="min-h-[65px] w-full" />
      <div
        role="status"
        aria-live="polite"
        className="text-xs leading-5 text-muted-foreground"
      >
        {!siteKey ? (
          "Security verification is unavailable. Please try again later."
        ) : status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle
              aria-hidden
              className="size-3 motion-safe:animate-spin"
            />
            Loading security check...
          </span>
        ) : status === "pending" ? (
          "Please complete the security check."
        ) : status === "ready" ? (
          "Security check complete."
        ) : status === "expired" ? (
          "The security check expired. Please try again."
        ) : (
          "Could not load the security check. Check your connection and retry."
        )}
      </div>
      {siteKey && (status === "failed" || status === "expired") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onToken("");
            setStatus("loading");
            setAttempt((v) => v + 1);
          }}
        >
          <RotateCw aria-hidden />
          Retry security check
        </Button>
      )}
    </div>
  );
}
