// Report Builder exporters. Excel goes through the shared TAB house-style
// builder (styled .xlsx). PDF is produced by the browser's print pipeline
// (true Calibri + the shared DocPrintLayout) — see ReportBuilder's print view.
import { buildExcelReport } from "@/lib/doc-style";

export function exportExcel({ title, subtitle, filtersSummary, columns, rows, summary }) {
  buildExcelReport({ title, subtitle, filtersSummary, columns, rows, summary });
}

export { buildExcelReport };