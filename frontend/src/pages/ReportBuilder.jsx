import React, { useEffect, useMemo, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePermissions } from "@/lib/permissions";
import NoAccess from "@/components/NoAccess";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Save, Trash2, Play, RotateCcw } from "lucide-react";
import { REPORT_SOURCES } from "@/lib/report-sources";
import { matchesFilters, sortRecords, sortOptions, displayValue, filtersSummary } from "@/lib/report-engine";
import { exportExcel } from "@/lib/report-export";
import FilterControls from "@/components/reports/FilterControls";
import ColumnPicker from "@/components/reports/ColumnPicker";
import ReportPreview from "@/components/reports/ReportPreview";
import SaveReportDialog from "@/components/reports/SaveReportDialog";
import DocPrintLayout, { DocTable } from "@/components/DocPrintLayout";

export default function ReportBuilder() {
  const { canView } = usePermissions();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [sourceKey, setSourceKey] = useState("Risks");
  const [filters, setFilters] = useState({});
  const [columns, setColumns] = useState(() => [...REPORT_SOURCES.Risks.defaultColumns]);
  const [sortField, setSortField] = useState(REPORT_SOURCES.Risks.defaultSort.field);
  const [sortDir, setSortDir] = useState(REPORT_SOURCES.Risks.defaultSort.direction);
  const [reportTitle, setReportTitle] = useState("Risks report");
  const [data, setData] = useState([]);
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const source = REPORT_SOURCES[sourceKey];
  const allowedSources = Object.keys(REPORT_SOURCES).filter((k) => canView(REPORT_SOURCES[k].section));

  const loadSource = useCallback(async (key) => {
    const s = REPORT_SOURCES[key];
    if (!s) return;
    setLoading(true);
    try {
      const [records, lk] = await Promise.all([s.fetch(base44), s.loadLookups(base44)]);
      setData(records);
      setLookups({ ...lk, risks: records });
    } catch (e) {
      console.error("Report source load failed", e);
      setData([]);
      setLookups({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!source || !canView(source.section)) return;
    loadSource(sourceKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const applySource = (key) => {
    const s = REPORT_SOURCES[key];
    if (!s) return;
    setSourceKey(key);
    setFilters({});
    setColumns([...s.defaultColumns]);
    setSortField(s.defaultSort.field);
    setSortDir(s.defaultSort.direction);
    setReportTitle(`${s.label} report`);
  };

  const filtered = useMemo(() => {
    if (!source) return [];
    const matched = data.filter((r) => matchesFilters(source, r, filters));
    return sortRecords(source, matched, sortField, sortDir, lookups);
  }, [source, data, filters, sortField, sortDir, lookups]);

  const display = useCallback((r, key) => displayValue(source, r, key, lookups), [source, lookups]);
  const colMeta = useMemo(() => columns.map((k) => ({ key: k, label: source?.fields[k]?.label || k })), [columns, source]);
  const sOpts = useMemo(() => (source ? sortOptions(source) : []), [source]);

  const doExport = (format) => {
    if (format === "PDF") { window.print(); return; }
    setBusy(true);
    try {
      const rows = filtered.map((r) => Object.fromEntries(columns.map((k) => [k, display(r, k)])));
      const summary = filtersSummary(source, filters, lookups);
      exportExcel({ title: reportTitle, subtitle: source?.label, filtersSummary: summary, columns: colMeta, rows });
    } finally {
      setBusy(false);
    }
  };

  const loadSaved = useCallback(async () => {
    try {
      const recs = await base44.entities.ReportDefinition.list("-created_date", 200);
      setSaved(recs.filter((d) => isAdmin || d.created_by_id === user?.id));
    } catch {
      setSaved([]);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const runSaved = (d) => {
    if (!REPORT_SOURCES[d.source]) return;
    const s = REPORT_SOURCES[d.source];
    setSourceKey(d.source);
    setFilters(() => {
      try { return JSON.parse(d.filters || "{}"); } catch { return {}; }
    });
    setColumns(() => {
      try {
        const c = JSON.parse(d.columns || "[]");
        return Array.isArray(c) && c.length ? c : [...s.defaultColumns];
      } catch { return [...s.defaultColumns]; }
    });
    setSortField(d.sort_field || s.defaultSort.field);
    setSortDir(d.sort_direction || s.defaultSort.direction);
    setReportTitle(d.name || `${s.label} report`);
  };

  const deleteSaved = async (d) => {
    await base44.entities.ReportDefinition.delete(d.id);
    loadSaved();
  };

  const handleSave = async ({ name, schedule_frequency, schedule_format, schedule_recipients }) => {
    await base44.entities.ReportDefinition.create({
      name,
      source: sourceKey,
      filters: JSON.stringify(filters),
      columns: JSON.stringify(columns),
      sort_field: sortField,
      sort_direction: sortDir,
      schedule_frequency,
      schedule_format,
      schedule_recipients,
    });
    setSaveOpen(false);
    loadSaved();
  };

  if (!canView("Reports")) return <NoAccess section={{ id: "Reports" }} />;

  if (allowedSources.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">Report Builder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have view permission on any reportable section yet. Ask an administrator to grant access to a register (e.g. Risk Register).
        </p>
      </div>
    );
  }

  const printRows = filtered.map((r) => Object.fromEntries(columns.map((k) => [k, display(r, k)])));
  const printSummary = filtersSummary(source, filters, lookups);
  const printOrientation = columns.length > 7 ? "landscape" : "portrait";

  return (
    <div>
      <div className="hidden print:block">
        <DocPrintLayout
          title={reportTitle}
          subtitle={source?.label}
          filtersSummary={printSummary}
          orientation={printOrientation}
          showToolbar={false}
        >
          <DocTable columns={colMeta} rows={printRows} />
        </DocPrintLayout>
      </div>

      <div className="space-y-4 p-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Report Builder</h1>
            <p className="text-xs text-muted-foreground">
              Build a filtered, ad-hoc report from any section and export it as Excel or PDF.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
            <Button variant="outline" size="sm" disabled={busy || loading} onClick={() => doExport("Excel")}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => doExport("PDF")}>
              <FileText className="mr-1 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="space-y-3 lg:col-span-1">
            <div className="rounded-md border border-border bg-white p-3">
              <label className="text-xs font-medium text-muted-foreground">Data source</label>
              <select value={sourceKey} onChange={(e) => applySource(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                {allowedSources.map((k) => <option key={k} value={k}>{REPORT_SOURCES[k].label}</option>)}
              </select>
              <label className="mt-3 block text-xs font-medium text-muted-foreground">Report title</label>
              <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" />
            </div>
            <ColumnPicker source={source} columns={columns} onChange={setColumns} />
            <div className="rounded-md border border-border bg-white p-3">
              <div className="mb-2 text-xs font-semibold text-foreground">Sort</div>
              <div className="flex items-center gap-2">
                <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                  {sOpts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Filters</h2>
              <button onClick={() => setFilters({})} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" /> Reset filters
              </button>
            </div>
            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading {source?.label}…</div>
            ) : (
              <FilterControls source={source} lookups={lookups} filters={filters} onChange={setFilters} />
            )}
            <ReportPreview source={source} columns={columns} rows={filtered} display={display} />
          </div>
        </div>

        <div className="rounded-md border border-border bg-white p-3">
          <h2 className="text-sm font-semibold">Saved reports</h2>
          {saved.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">No saved reports yet. Configure a report and click Save.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {saved.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {REPORT_SOURCES[d.source]?.label || d.source}
                      {d.schedule_frequency && d.schedule_frequency !== "None"
                        ? ` · scheduled ${d.schedule_frequency} as ${d.schedule_format}`
                        : " · on demand"}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => runSaved(d)}>
                    <Play className="mr-1 h-3.5 w-3.5" /> Run
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteSaved(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <SaveReportDialog
          open={saveOpen}
          defaultName={reportTitle}
          users={lookups.users}
          onClose={() => setSaveOpen(false)}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}