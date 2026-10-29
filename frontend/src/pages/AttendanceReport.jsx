import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import DocPrintLayout from "@/components/DocPrintLayout";
import NoAccess from "@/components/NoAccess";
import { usePermissions } from "@/lib/permissions";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];

export default function AttendanceReport() {
  const { canView } = usePermissions();
  const [attendance, setAttendance] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, m, e] = await Promise.all([
          base44.entities.Attendance.list(),
          base44.entities.Meeting.list(),
          base44.entities.Employee.list(),
        ]);
        setAttendance(a); setMeetings(m); setEmployees(e);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    })();
  }, []);

  const empName = (id) => {
    const e = employees.find((x) => x.id === id);
    return e?.full_name || e?.email || "—";
  };

  const meetingMap = useMemo(() => Object.fromEntries(meetings.map((m) => [m.id, m])), [meetings]);

  const rows = useMemo(() => {
    const map = {};
    for (const a of attendance) {
      const m = meetingMap[a.meeting];
      if (!m) continue;
      const key = a.invitee + "||" + (m.committee || "Other");
      if (!map[key]) map[key] = { employee: a.invitee, committee: m.committee || "Other", invited: 0, present: 0, apologies: 0, absent: 0, recused: 0 };
      const r = map[key];
      r.invited++;
      if (a.attendance_status === "Present") r.present++;
      else if (a.attendance_status === "Apologies") r.apologies++;
      else if (a.attendance_status === "Absent") r.absent++;
      else if (a.attendance_status === "Recused") r.recused++;
    }
    let arr = Object.values(map);
    if (filter) arr = arr.filter((r) => r.committee === filter);
    arr.sort((a, b) => empName(a.employee).localeCompare(empName(b.employee)) || a.committee.localeCompare(b.committee));
    return arr;
  }, [attendance, meetingMap, filter, employees]);

  if (!canView("Attendance Report")) return <NoAccess section={{ id: "Attendance Report" }} />;

  const asAt = new Date().toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <DocPrintLayout
      title="Attendance Report"
      subtitle="TAB · Member attendance rate by committee — board-effectiveness & SMCR evidence"
      asAt={asAt}
      orientation="landscape"
      toolbar={
        <>
          <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All committees</option>
            {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{rows.length} rows</span>
        </>
      }
    >
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-white">
          <table className="w-full border-collapse text-sm">
            <thead style={{ background: "#DD5115" }} className="text-white">
              <tr>
                <th className="px-3 py-2 text-left">Member</th>
                <th className="px-3 py-2 text-left">Committee</th>
                <th className="px-3 py-2 text-right">Invited</th>
                <th className="px-3 py-2 text-right">Present</th>
                <th className="px-3 py-2 text-right">Apologies</th>
                <th className="px-3 py-2 text-right">Absent</th>
                <th className="px-3 py-2 text-right">Recused</th>
                <th className="px-3 py-2 text-right">Attendance rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rate = r.invited ? Math.round((r.present / r.invited) * 100) : 0;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{empName(r.employee)}</td>
                    <td className="px-3 py-2">{r.committee}</td>
                    <td className="px-3 py-2 text-right">{r.invited}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-700">{r.present}</td>
                    <td className="px-3 py-2 text-right">{r.apologies}</td>
                    <td className="px-3 py-2 text-right">{r.absent}</td>
                    <td className="px-3 py-2 text-right">{r.recused}</td>
                    <td className="px-3 py-2 text-right">{rate}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No attendance records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </DocPrintLayout>
  );
}