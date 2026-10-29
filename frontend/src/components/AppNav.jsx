import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  ShieldCheck,
  Gauge,
  ListChecks,
  AlertTriangle,
  FileText,
  Scale,
  Network,
  Eye,
  History,
  BarChart3,
  Gavel,
  CheckCircle2,
  Umbrella,
  Gift,
  Rocket,
  CheckCheck,
  ClipboardCheck,
  KeyRound,
  Users,
  ChevronDown,
  FileSpreadsheet,
  Settings,
} from "lucide-react";
import { usePermissions } from "@/lib/permissions";
import { useAuth } from "@/lib/AuthContext";
import { sectionByPath } from "@/lib/sections";

// Pinned at the very top — always visible, outside the accordion.
const PINNED = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/my-work", label: "My Work", icon: Briefcase },
];

// Collapsible groups (accordion). "Overview" is intentionally absent — its
// items (Dashboard / My Work) are pinned above.
const groups = [
  {
    title: "Registers",
    items: [
      { to: "/risk-register", label: "Risk Register", icon: ClipboardList },
      { to: "/project-change", label: "Project & Change", icon: Rocket },
      { to: "/departments", label: "Departments", icon: Building2 },
      { to: "/controls", label: "Controls", icon: ShieldCheck },
      { to: "/kri-dashboard", label: "KRI Dashboard", icon: Gauge },
      { to: "/actions", label: "Actions Tracker", icon: ListChecks },
      { to: "/incidents", label: "Incidents & Loss", icon: AlertTriangle },
      { to: "/conflicts", label: "Conflicts of Interest", icon: Scale },
      { to: "/gifts-hospitality", label: "Gifts & Hospitality", icon: Gift },
      { to: "/emerging-risks", label: "Emerging Risks", icon: Eye },
    ],
  },
  {
    title: "Governance",
    items: [
      { to: "/appetite", label: "Appetite", icon: FileText },
      { to: "/policy-library", label: "Policy Suite", icon: FileText },
      { to: "/policy-report", label: "Policy Report", icon: FileText },
      { to: "/insurance-library", label: "Insurance", icon: Umbrella },
      { to: "/insurance-report", label: "Insurance Report", icon: Umbrella },
      { to: "/third-parties", label: "Third-Party", icon: Network },
    ],
  },
  {
    title: "Board",
    items: [
      { to: "/board-governance", label: "Meetings", icon: Gavel },
      { to: "/committees", label: "Committees", icon: Users },
      { to: "/board-actions", label: "Board Actions", icon: ListChecks },
      { to: "/my-board-actions", label: "My Board Actions", icon: CheckCircle2 },
      { to: "/attendance-report", label: "Attendance Report", icon: BarChart3 },
    ],
  },
  {
    title: "Oversight",
    items: [
      { to: "/audit-trail", label: "Audit Trail", icon: History },
      { to: "/erc-pack", label: "ERC Pack", icon: BarChart3 },
      { to: "/attestations", label: "Attestations", icon: ClipboardCheck },
      { to: "/my-attestations", label: "My Attestations", icon: CheckCheck },
      { to: "/attestation-report", label: "Attestation Report", icon: ClipboardCheck },
      { to: "/employees", label: "Employees", icon: Users },
      { to: "/reports", label: "Reports", icon: FileSpreadsheet },
      { to: "/permissions", label: "Permissions", icon: KeyRound },
      { to: "/administration", label: "Administration", icon: Settings },
    ],
  },
];

// Which group (if any) contains the page the user is currently on.
function activeGroupFor(pathname) {
  for (const g of groups) {
    for (const it of g.items) {
      if (pathname === it.to || pathname.startsWith(it.to + "/")) return g.title;
    }
  }
  return null;
}

export default function AppNav() {
  const { canView } = usePermissions();
  const { user } = useAuth();
  const location = useLocation();

  const storageKey = `nav-state-${user?.id || "anon"}`;
  const [userState, setUserState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      return saved && typeof saved === "object" ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (userState) localStorage.setItem(storageKey, JSON.stringify(userState));
  }, [userState, storageKey]);

  const activeGroup = useMemo(() => activeGroupFor(location.pathname), [location.pathname]);

  // The group containing the current page is always expanded (so the active
  // item stays visible). Every other group follows the user's persisted choice,
  // defaulting to collapsed.
  const isExpanded = (title) => {
    if (title === activeGroup) return true;
    if (userState && typeof userState[title] === "boolean") return userState[title];
    return false;
  };
  const toggle = (title) => {
    setUserState((s) => ({ ...(s || {}), [title]: !isExpanded(title) }));
  };

  const visible = (it) => {
    const s = sectionByPath(it.to);
    return !s || canView(s.id);
  };

  const linkClass = ({ isActive }) =>
    `flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium ${
      isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
    }`;

  return (
    <aside className="w-full shrink-0 border-b border-border bg-white print:hidden lg:w-60 lg:border-b-0 lg:border-r">
      <nav className="flex w-full gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
        <div className="hidden items-center gap-2 px-2 lg:mb-3 lg:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold">TAB Risk</span>
        </div>

        {/* Pinned items — always visible */}
        <div className="flex gap-1 lg:flex-col">
          {PINNED.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} end={it.to === "/"} className={linkClass}>
                <Icon className="h-4 w-4" /> {it.label}
              </NavLink>
            );
          })}
        </div>

        <div className="mx-1 hidden h-5 self-center border-l border-border lg:block lg:h-auto lg:self-auto lg:my-1 lg:border-l-0 lg:border-t" />

        {/* Collapsible groups */}
        {groups.map((g) => {
          const items = g.items.filter(visible);
          if (!items.length) return null;
          const open = isExpanded(g.title);
          return (
            <div key={g.title} className="lg:mb-1">
              <button
                type="button"
                onClick={() => toggle(g.title)}
                aria-expanded={open}
                className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted lg:w-full"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                />
                {g.title}
              </button>
              {open && (
                <div className="flex gap-1 lg:mt-0.5 lg:flex-col lg:pl-2">
                  {items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <NavLink key={it.to} to={it.to} className={linkClass}>
                        <Icon className="h-4 w-4" /> {it.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}