// TAB document house style — ONE shared definition used by every generated
// document (PDF/printed reports, the Report Builder output, board minutes,
// the ERC pack, and the Policy / Insurance / Gifts / Attestation / Attendance
// reports).
//
// Company name is always "TAB" (never "TAB plc" or any suffix).
// Brand:      #DD5115 orange, Calibri, teardrop logo + tabhq.com
// PDF path:   browser print (true Calibri) via DocPrintLayout
// Excel path: styled .xlsx via xlsx-js-style (Calibri, orange header, RAG fills)
// Minutes:    standalone HTML via wrapDocHtml (same house style)

import * as XLSX from "xlsx-js-style";

export const TAB = {
  company: "TAB",
  site: "tabhq.com",
  orange: "#DD5115",
  orangeRGB: [221, 81, 21],
  font: "Calibri",
  logoUrl:
    "https://media.base44.com/images/public/6a5bceb04582bd1d88c1db4b/7f448c016_Screenshot2026-07-19at185645.png",
};

// --- RAG -----------------------------------------------------------------

const RAG = {
  green: { screen: "bg-emerald-100 text-emerald-800", bg: "D1F5E0", text: "0A6B3A" },
  amber: { screen: "bg-amber-100 text-amber-800", bg: "FFF1D6", text: "9A6A00" },
  red:   { screen: "bg-red-100 text-red-800",     bg: "FADBD8", text: "B91C1C" },
};

const TOKENS = {
  green: ["green", "within policy", "current", "active", "completed", "met", "present"],
  amber: ["amber", "yellow", "due for review", "due for renewal", "requires review", "exception raised"],
  red:   ["red", "breach", "overdue", "lapsed"],
};

export function ragGroup(v) {
  const s = String(v ?? "").toLowerCase().trim();
  for (const g of ["green", "amber", "red"]) if (TOKENS[g].includes(s)) return g;
  return null;
}

// A column is RAG-rated only when every non-empty value is a RAG token, so
// generic status fields (Open/Monitoring/Closed) are not mis-coloured.
export function isRagColumn(key, rows) {
  let any = false;
  for (const r of rows) {
    const v = r[key];
    if (v == null || v === "") continue;
    any = true;
    if (!ragGroup(v)) return false;
  }
  return any;
}

export function ragColor(v) {
  const g = ragGroup(v);
  return g ? RAG[g] : null;
}

// --- Excel ---------------------------------------------------------------

const thin = (side) => ({ style: "thin", color: { rgb: "E2E2E2" }, ...({ side }) });
const BORDER = {
  top: { style: "thin", color: { rgb: "E2E2E2" } },
  bottom: { style: "thin", color: { rgb: "E2E2E2" } },
  left: { style: "thin", color: { rgb: "E2E2E2" } },
  right: { style: "thin", color: { rgb: "E2E2E2" } },
};

export function buildExcelReport({ title, subtitle, filtersSummary, columns, rows, summary }) {
  const gen = new Date().toLocaleString("en-GB");
  const nc = Math.max(columns.length, 1);
  const headerRow = 4;
  const dataStart = headerRow + 1;

  const aoa = [
    [title || "Report"],
    ["Generated", gen],
    ["Filters applied", filtersSummary || "All records"],
    [],
    columns.map((c) => c.label),
  ];
  for (const r of rows) aoa.push(columns.map((c) => (r[c.key] == null ? "" : r[c.key])));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const set = (ref, s) => { if (ws[ref]) ws[ref].s = s; };
  const cell = (r, c) => XLSX.utils.encode_cell({ r, c });

  // Title
  set(cell(0, 0), { font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "DD5115" } }, alignment: { vertical: "center" } });
  // Generated / Filters meta
  for (const r of [1, 2]) {
    set(cell(r, 0), { font: { name: "Calibri", sz: 11, bold: true } });
    set(cell(r, 1), { font: { name: "Calibri", sz: 11 } });
  }
  if (subtitle) set(cell(1, 2), { font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "666666" } } });

  // Header row — #DD5115 fill, white bold Calibri
  columns.forEach((c, i) => {
    set(cell(headerRow, i), {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "DD5115" } },
      alignment: { vertical: "center", horizontal: "left" },
      border: BORDER,
    });
  });

  // Data rows — Calibri, RAG cells colour-coded
  const ragCols = columns.map((c) => isRagColumn(c.key, rows));
  rows.forEach((row, ri) => {
    columns.forEach((c, ci) => {
      const rag = ragCols[ci] ? ragColor(row[c.key]) : null;
      const s = {
        font: { name: "Calibri", sz: 11 },
        alignment: { vertical: "top", horizontal: typeof row[c.key] === "number" ? "right" : "left" },
        border: BORDER,
      };
      if (rag) {
        s.fill = { fgColor: { rgb: rag.bg } };
        s.font = { name: "Calibri", sz: 11, color: { rgb: rag.text }, bold: true };
      }
      set(cell(dataStart + ri, ci), s);
    });
  });

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } },
    { s: { r: 1, c: 1 }, e: { r: 1, c: nc - 1 } },
    { s: { r: 2, c: 1 }, e: { r: 2, c: nc - 1 } },
  ];
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(String(c.label || "").length + 3, 12) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: dataStart + Math.max(rows.length - 1, 0), c: nc - 1 } }) };
  ws["!panes"] = [{ state: "frozen", ySplit: dataStart, topLeftCell: cell(dataStart, 0), activePane: "bottomLeft", xSplit: 0 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  if (summary) {
    const saoa = [
      ["Summary"],
      ["Generated", gen],
      ["Filters applied", filtersSummary || "All records"],
      [],
      ["Metric", "Value"],
      ...summary,
    ];
    const sws = XLSX.utils.aoa_to_sheet(saoa);
    sws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 2, c: 1 }, e: { r: 2, c: 1 } }];
    sws["!cols"] = [{ wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, sws, "Summary");
  }

  XLSX.writeFile(wb, `${(title || "report").replace(/[^\w\- ]+/g, "_")}.xlsx`);
}

// --- Minutes / standalone HTML ------------------------------------------

export function wrapDocHtml({ title, subtitle, metaHtml = "", bodyHtml = "", generated, orientation = "portrait" }) {
  const gen = generated || new Date().toLocaleString("en-GB");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 14mm 12mm 18mm 12mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Calibri, "Segoe UI", system-ui, sans-serif; color:#1a1a1a; margin:0; }
  .doc-band { display:flex; align-items:center; justify-content:space-between; background:#DD5115; color:#fff; padding:10px 16px; border-radius:4px; }
  .doc-band .t { font-size:16px; font-weight:bold; }
  .doc-band .r { display:flex; align-items:center; gap:8px; }
  .doc-band .r .site { color:#fff; font-size:12px; }
  .doc-band .r .chip { background:#fff; border-radius:4px; padding:2px 6px; line-height:0; }
  .doc-band .r .chip img { height:26px; display:block; }
  .doc-tb { margin:14px 0 6px; }
  .doc-tb h1 { font-size:18px; color:#DD5115; margin:0; }
  .doc-tb .sub { font-size:12px; color:#666; margin-top:2px; }
  .doc-tb .meta { font-size:11px; color:#666; margin-top:4px; }
  .doc-tb .meta b { color:#444; }
  h2 { font-size:13px; color:#DD5115; border-bottom:1px solid #e0e0e0; padding-bottom:3px; margin:18px 0 6px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-top:6px; }
  th { background:#DD5115; color:#fff; text-align:left; padding:5px 7px; border:1px solid #e2e2e2; }
  td { padding:4px 7px; border:1px solid #e2e2e2; vertical-align:top; }
  tr:nth-child(even) td { background:#f7f7f7; }
  .meta-foot { color:#666; font-size:11px; margin-top:18px; }
  thead { display:table-header-group; }
  tr { page-break-inside:avoid; }
  .doc-footer { position:fixed; bottom:0; left:0; right:0; display:flex; justify-content:space-between; padding:6px 12mm; font-size:10px; color:#666; border-top:1px solid #e5e5e5; background:#fff; }
  .doc-footer .pg::after { content:"Page " counter(page) " of " counter(pages); }
</style></head><body>
  <div class="doc-band">
    <div class="t">${esc(title)}</div>
    <div class="r"><span class="site">tabhq.com</span><span class="chip"><img src="${TAB.logoUrl}" alt="TAB"/></span></div>
  </div>
  <div class="doc-tb">
    <h1>${esc(title)}</h1>
    ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
    <div class="meta">${metaHtml}<b>Generated:</b> ${esc(gen)}</div>
  </div>
  ${bodyHtml}
  <div class="doc-footer"><span>TAB · Private &amp; Confidential</span><span class="pg"></span><span>${esc(gen)}</span></div>
</body></html>`;
}