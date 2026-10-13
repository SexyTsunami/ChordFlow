"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn, createId } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: {
    title: string;
    description?: string;
    tone?: ToastTone;
  }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: React.ReactNode; ring: string }> =
  {
    success: {
      icon: <CheckCircle2 className="size-4 text-sage" />,
      ring: "border-sage/35",
    },
    error: {
      icon: <AlertTriangle className="size-4 text-rose" />,
      ring: "border-rose/40",
    },
    info: {
      icon: <Info className="size-4 text-amber" />,
      ring: "border-amber/35",
    },
  };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      const id = createId("toast");
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4200),
      );
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-[rise_0.25s_cubic-bezier(0.2,0.8,0.2,1)] items-start gap-3 rounded-xl border bg-surface-2 px-4 py-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.95)]",
              TONE_STYLES[t.tone].ring,
            )}
          >
            <div className="mt-0.5">{TONE_STYLES[t.tone].icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{t.title}</p>
              {t.description ? (
                <p className="mt-0.5 text-xs break-words text-ink-muted">
                  {t.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Keep call sites simple: outside a provider (e.g. in tests) toasts no-op.
    return { toast: () => {} };
  }
  return ctx;
}
