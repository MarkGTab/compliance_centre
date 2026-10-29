import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { sectionById } from "@/lib/sections";

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setPerms([]);
      setLoading(false);
      return;
    }
    try {
      const recs = await base44.entities.Permission.filter({ user: user.id });
      setPerms(recs || []);
    } catch {
      setPerms([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // refresh when any permission changes (e.g. an admin adjusts this user's access elsewhere)
  useEffect(() => {
    const unsubscribe = base44.entities.Permission.subscribe(() => load());
    return unsubscribe;
  }, [load]);

  const isAdmin = user?.role === "admin";

  const recFor = useCallback((id) => perms.find((p) => p.section === id), [perms]);

  const canView = useCallback((id) => {
    const s = sectionById(id);
    if (!s) return false;
    if (s.alwaysGranted) return true;
    if (s.adminOnly) return isAdmin;
    if (isAdmin) return true;
    const r = recFor(id);
    return !!(r && r.can_view === "Yes");
  }, [perms, isAdmin]);

  const canEdit = useCallback((id) => {
    const s = sectionById(id);
    if (!s) return false;
    if (s.alwaysGranted) return true;
    if (s.adminOnly) return isAdmin;
    if (isAdmin) return true;
    const r = recFor(id);
    return !!(r && r.can_edit === "Yes" && r.can_view === "Yes");
  }, [perms, isAdmin]);

  const value = { canView, canEdit, loading, reload: load, perms };
  return React.createElement(PermissionsContext.Provider, { value }, children);
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) return { canView: () => false, canEdit: () => false, loading: true, reload: async () => {}, perms: [] };
  return ctx;
}