import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/permissions";
import { SECTIONS } from "@/lib/sections";
import { ROLE_TEMPLATES, roleToTemplate } from "@/lib/roleTemplates";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PermissionMatrix from "@/components/permissions/PermissionMatrix";
import UserDepartmentAssignment from "@/components/permissions/UserDepartmentAssignment";
import { ShieldCheck, Users, Sparkles } from "lucide-react";

const emptyMatrix = () =>
  Object.fromEntries(SECTIONS.map((s) => [s.id, { view: false, edit: false }]));

export default function Permissions() {
  const { user } = useAuth();
  const { reload } = usePermissions();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [matrix, setMatrix] = useState(emptyMatrix());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [initMsg, setInitMsg] = useState(null);
  const [totalPerms, setTotalPerms] = useState(null);
  const [initialising, setInitialising] = useState(false);

  useEffect(() => {
    base44.entities.User.list().then(setUsers).catch(() => {});
    base44.entities.Permission.list().then((p) => setTotalPerms(p.length)).catch(() => {});
  }, []);

  const selected = users.find((u) => u.id === selectedId);
  const isAdminTarget = selected?.role === "admin";

  useEffect(() => {
    if (!selectedId) return;
    setMatrix(emptyMatrix());
    base44.entities.Permission
      .filter({ user: selectedId })
      .then((recs) => {
        const m = emptyMatrix();
        for (const r of recs || []) {
          if (m[r.section]) m[r.section] = { view: r.can_view === "Yes", edit: r.can_edit === "Yes" };
        }
        setMatrix(m);
      })
      .catch(() => {});
  }, [selectedId]);

  const applyTemplate = (label) => {
    const t = ROLE_TEMPLATES[label]();
    const m = emptyMatrix();
    for (const [sec, val] of Object.entries(t)) {
      if (m[sec]) m[sec] = { view: !!val.view, edit: !!val.edit };
    }
    setMatrix(m);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const permissions = Object.entries(matrix)
        .filter(([, val]) => val.view)
        .map(([section, val]) => ({ section, can_view: "Yes", can_edit: val.edit ? "Yes" : "No" }));
      const res = await base44.functions.invoke("savePermissions", {
        target_user: selectedId,
        permissions,
      });
      setMsg({ ok: true, text: `Saved — ${res.data?.changes ?? 0} change(s) applied.` });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.error || e.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const initialiseAll = async () => {
    setInitialising(true);
    setInitMsg(null);
    let n = 0;
    for (const u of users) {
      if (u.role === "admin") continue;
      const tmpl = roleToTemplate(u.role);
      if (!tmpl) continue;
      const t = ROLE_TEMPLATES[tmpl]();
      const permissions = Object.entries(t)
        .filter(([, val]) => val.view)
        .map(([section, val]) => ({ section, can_view: "Yes", can_edit: val.edit ? "Yes" : "No" }));
      try {
        await base44.functions.invoke("savePermissions", { target_user: u.id, permissions });
        n++;
      } catch {}
    }
    setInitMsg({ ok: true, text: `Initialised permissions for ${n} user(s) from role templates.` });
    setInitialising(false);
    reload();
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Permissions</h1>
          <p className="text-xs text-muted-foreground">Granular per-user access control across every section.</p>
        </div>
        {totalPerms === 0 && (
          <Button variant="outline" onClick={initialiseAll} disabled={initialising}>
            <Sparkles className="h-4 w-4" /> {initialising ? "Initialising…" : "Initialise all users from role templates"}
          </Button>
        )}
      </div>

      {initMsg && (
        <div className={`rounded-md border px-3 py-2 text-sm ${initMsg.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {initMsg.text}
        </div>
      )}

      <UserDepartmentAssignment />

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4" /> Select user
            </div>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a user…" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.id !== user.id)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} · {u.role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">You can't edit your own permissions.</p>
          </div>

          {selectedId && !isAdminTarget && (
            <div className="rounded-md border border-border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Apply role template</div>
              <Select value="" onValueChange={applyTemplate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a template…" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_TEMPLATES).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">Bulk-fills the matrix — fine-tune afterwards.</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {!selectedId ? (
            <div className="rounded-md border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">
              Select a user to manage their section access.
            </div>
          ) : isAdminTarget ? (
            <div className="rounded-md border border-border bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Administrator / CRO
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                This user retains full access to every section by role — it cannot be adjusted here.
                This guarantees the platform always has at least one administrator.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_64px_64px] items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>{selected?.full_name || selected?.email} — {selected?.role}</span>
                <span className="text-center">View</span>
                <span className="text-center">Edit</span>
              </div>
              <PermissionMatrix
                matrix={matrix}
                onChange={(sec, val) => setMatrix((m) => ({ ...m, [sec]: val }))}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save permissions"}
                </Button>
                {msg && (
                  <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}