import React, { useEffect, useState, useCallback } from "react";
import Register from "@/components/registers/Register";
import { formatDate } from "@/lib/risk-helpers";
import { useAccess } from "@/lib/access";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import UploadConflictsDialog from "@/components/conflicts/UploadConflictsDialog";

const STATUS = ["Active", "Mitigated", "Closed"];
const statusBadge = {
  Active: "bg-red-100 text-red-800",
  Mitigated: "bg-amber-100 text-amber-800",
  Closed: "bg-emerald-100 text-emerald-800",
};

export default function Conflicts() {
  const { canCreate, canEdit } = useAccess();
  const [employees, setEmployees] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      const emps = await base44.entities.Employee.list("-created_date", 5000);
      setEmployees(emps);
    } catch (e) {
      console.error("Employee load failed", e);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  return (
    <>
      <Register
        title="Conflicts of Interest Register"
        subtitle="Declared conflicts, mitigations and review status"
        entityName="ConflictOfInterest"
        addLabel="Add Conflict"
        access={{ canCreate: canCreate("ConflictOfInterest"), canEdit: () => canEdit("ConflictOfInterest") }}
        newRow={{ status: "Active" }}
        extraActions={
          canCreate("ConflictOfInterest") ? (
            <Button variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="mr-1 h-4 w-4" /> Upload Existing Register
            </Button>
          ) : null
        }
        columns={[
          { key: "person", label: "Person" },
          { key: "nature_of_conflict", label: "Nature of Conflict" },
          { key: "related_parties", label: "Related Parties" },
          { key: "date_identified", label: "Date Identified", render: (r) => formatDate(r.date_identified) },
          { key: "mitigation", label: "Mitigation" },
          { key: "review_date", label: "Review Date", render: (r) => formatDate(r.review_date) },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge[r.status] || ""}`}>{r.status || "—"}</span>
            ),
          },
        ]}
        fields={[
          { key: "person", label: "Person", required: true },
          { key: "nature_of_conflict", label: "Nature of Conflict", type: "textarea", required: true },
          { key: "related_parties", label: "Related Parties" },
          { key: "date_identified", label: "Date Identified", type: "date" },
          { key: "mitigation", label: "Mitigation", type: "textarea" },
          { key: "review_date", label: "Review Date", type: "date" },
          { key: "status", label: "Status", type: "select", options: STATUS },
        ]}
        filters={[{ key: "status", label: "Status", options: STATUS }]}
      />
      <UploadConflictsDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        employees={employees}
      />
    </>
  );
}