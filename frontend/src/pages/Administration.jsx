import React from "react";
import { useAuth } from "@/lib/AuthContext";
import NoAccess from "@/components/NoAccess";
import TestDataPanel from "@/components/admin/TestDataPanel";

export default function Administration() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <NoAccess />;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">Administration</h1>
        <p className="text-xs text-muted-foreground">Platform administration — test data management for pre-go-live.</p>
      </div>
      <TestDataPanel />
    </div>
  );
}