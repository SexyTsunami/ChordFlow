"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Guitar, Menu, Search, X } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Divider } from "@/components/ui/primitives";
import { useLibrary } from "@/components/providers/library-provider";
import { GlobalSearch } from "@/components/search/global-search";
import { isActivePath, NAV_ITEMS } from "./nav-items";

function Wordmark() {
  return (
    <Link
      href="/"
      suppressHydrationWarning
      className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-90"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-amber/15 text-amber ring-1 ring-amber/25">
        <Guitar className="size-[18px]" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-ink">
          {APP_NAME}
        </span>
        <span className="block text-[11px] text-ink-faint">{APP_TAGLINE}</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { playlists, favorites } = useLibrary();

  const counts: Record<string, number> = {
    "/playlists": playlists.length,
    "/favorites": favorites.size,
  };

  return (
    <nav className="space-y-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const count = counts[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface-2 font-medium text-ink"
                : "text-ink-muted hover:bg-surface-2/60 hover:text-ink",
            )}
          >
            <item.icon
              className={cn("size-4 shrink-0", active ? "text-amber" : "text-ink-faint")}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {count ? (
              <span className="text-[11px] tabular-nums text-ink-faint">{count}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function ContinuePracticing() {
  const { recent, songsById } = useLibrary();
  const last = recent[0];
  const song = last ? songsById.get(last.songId) : undefined;
  if (!song) return null;

  return (
    <Link
      href={`/songs/${song.id}`}
      className="block rounded-xl border border-line bg-surface-2/70 p-3 transition-colors hover:border-amber/30 hover:bg-surface-2"
    >
      <p className="text-[10px] font-medium tracking-[0.12em] text-ink-faint uppercase">
        Continue
      </p>
      <p className="mt-1 truncate text-sm font-medium text-ink">{song.title}</p>
      <p className="truncate text-xs text-ink-muted">{song.artist}</p>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { storeLabel, ready } = useLibrary();

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <Wordmark />

      <NavLinks onNavigate={onNavigate} />

      <Divider />
      <ContinuePracticing />

      <div className="mt-auto space-y-2 text-[11px] text-ink-faint">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              ready ? "bg-sage" : "bg-ink-faint animate-pulse",
            )}
            aria-hidden
          />
          <span>{ready ? `Saved to: ${storeLabel}` : "Loading library…"}</span>
        </div>
        <p className="leading-relaxed">
          Sheets come from the ChordDatabase folder. Heart a song to play it;
          save a singing key on the song page.
        </p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Cmd/Ctrl+K opens search from anywhere.
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative z-10 flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 border-r border-line bg-surface/60 backdrop-blur lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] animate-[rise_0.2s_ease-out] border-r border-line bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-line bg-canvas/85 px-3 py-2.5 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <Wordmark />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search songs"
          >
            <Search />
          </Button>
        </header>

        {/* Desktop top bar */}
        <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-line bg-canvas/75 px-6 py-3 backdrop-blur lg:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2/60 px-3 text-sm text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted"
          >
            <Search className="size-4" />
            <span>Search a title or artist…</span>
            <kbd className="ml-auto rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
              ⌘K
            </kbd>
          </button>
          <Badge tone="outline">Personal songbook</Badge>
        </header>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
          aria-label="Main"
        >
          {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors",
                  active ? "text-amber" : "text-ink-faint hover:text-ink-muted",
                )}
              >
                <item.icon className="size-[18px]" />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
