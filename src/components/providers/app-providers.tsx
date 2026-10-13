"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/controls";
import { ToastProvider } from "@/components/ui/toast";
import { LibraryProvider } from "./library-provider";

function ClearStaleServiceWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) void caches.delete(key);
      });
    }
  }, []);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={300} skipDelayDuration={200}>
        <ClearStaleServiceWorker />
        <LibraryProvider>{children}</LibraryProvider>
      </TooltipProvider>
    </ToastProvider>
  );
}
