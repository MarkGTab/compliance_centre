import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppNav from "./AppNav";
import TopBar from "./TopBar";
import NoAccess from "./NoAccess";
import { usePermissions } from "@/lib/permissions";
import { sectionByPath } from "@/lib/sections";

export default function Layout() {
  const location = useLocation();
  const { canView, loading } = usePermissions();
  const section = sectionByPath(location.pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  const allowed = !section || canView(section.id);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 lg:flex-row">
      <AppNav />
      <main className="min-w-0 flex-1">
        <TopBar />
        {allowed ? <Outlet /> : <NoAccess section={section} />}
      </main>
    </div>
  );
}