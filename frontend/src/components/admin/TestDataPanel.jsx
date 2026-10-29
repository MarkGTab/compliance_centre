import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getTestDataCounts, deleteAllTestData, TEST_DATA_LABELS } from "@/lib/test-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { FlaskConical, RefreshCw, Trash2, AlertTriangle } from "lucide-react";

export default function TestDataPanel() {
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getTestDataCounts();
      setCounts(c.counts || {});
      setTotal(c.total || 0);
    } catch (e) {
      setCounts({});
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runDelete = async () => {
    setDeleting(true);
    setResult(null);
    try {
      const r = await deleteAllTestData();
      setResult(r);
      setConfirmOpen(false);
      setConfirmText("");
      await load();
    } catch (e) {
      setResult({ error: e?.response?.data?.error || e.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const rows = counts
    ? Object.entries(TEST_DATA_LABELS)
        .map(([entity, label]) => ({ entity, label, n: counts[entity] || 0 }))
        .sort((a, b) => b.n - a.n)
    : [];

  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold">Test Data</h2>
          <span className="text-xs text-muted-foreground">
            Records flagged <code className="rounded bg-muted px-1">is_test_data = Yes</code> — never part of go-live data.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={loading || total === 0}>
            <Trash2 className="h-4 w-4" /> Delete All Test Data
          </Button>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><b>{total}</b> test record(s) present across the app. Wipe before go-live.</span>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Entity</th>
              <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">Test records</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">Counting…</td></tr>
            ) : total === 0 ? (
              <tr><td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">No test data found — the app is clean.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.entity} className={`border-t border-border ${r.n > 0 ? "bg-amber-50/50" : ""}`}>
                  <td className="px-3 py-1.5">{r.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{r.n > 0 ? r.n : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
          {!loading && total > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="px-3 py-1.5">Total</td>
                <td className="px-3 py-1.5 text-right font-mono">{total}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {result && (
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${result.error ? "border-red-300 bg-red-50 text-red-800" : "border-green-300 bg-green-50 text-green-800"}`}>
          {result.error ? (
            <span>{result.error}</span>
          ) : (
            <div>
              <div className="font-semibold">Deleted {result.total} test record(s).</div>
              {Object.entries(result.deleted || {}).length > 0 && (
                <ul className="mt-1 text-xs">
                  {Object.entries(result.deleted).map(([e, n]) => (
                    <li key={e}>{TEST_DATA_LABELS[e] || e}: {n}</li>
                  ))}
                </ul>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-1 text-xs">
                  <span className="font-semibold">Errors:</span>
                  <ul>{result.errors.map((er, i) => <li key={i}>{TEST_DATA_LABELS[er.entity] || er.entity}: {er.error}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => { setConfirmOpen(o); if (!o) setConfirmText(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all test data?</DialogTitle>
            <DialogDescription>
              This permanently removes every record where <code>is_test_data = Yes</code> across all entities
              ({rows.filter((r) => r.n > 0).length} entities, {total} records). Real data (<code>is_test_data = No</code> or unset) is never touched.
              Deletion runs in dependency order to avoid broken links.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">Type <span className="font-mono font-semibold">DELETE</span> to confirm:</p>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmText(""); }} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={runDelete} disabled={deleting || confirmText !== "DELETE"}>
              {deleting ? "Deleting…" : "Delete all test data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}