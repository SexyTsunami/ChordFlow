import {
  Disc3,
  Heart,
  Home,
  ListMusic,
  Music4,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown on the mobile bottom bar. */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, mobile: true },
  { href: "/library", label: "Songs", icon: Music4, mobile: true },
  { href: "/collection", label: "Artists", icon: Disc3, mobile: true },
  { href: "/edits", label: "Edits", icon: NotebookPen, mobile: true },
  { href: "/favorites", label: "Favourites", icon: Heart, mobile: true },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
