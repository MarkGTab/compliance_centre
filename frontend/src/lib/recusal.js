import { base44 } from "@/api/base44Client";

// Create a Conflicts of Interest register entry from a meeting recusal and
// return its id so it can be linked to the Attendance / DecisionRecusal row.
export async function createConflictForRecusal({ employeeId, employeeName, reason }) {
  const rec = await base44.entities.ConflictOfInterest.create({
    person: employeeName || "Unknown",
    nature_of_conflict: reason || "Conflict of interest declared via meeting recusal",
    status: "Active",
    raised_by: employeeId || null,
  });
  return rec.id;
}