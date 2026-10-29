import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useAccess } from "@/lib/access";
import { auditCreate, auditUpdate } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CampaignForm from "@/components/attestations/CampaignForm";
import CampaignCard from "@/components/attestations/CampaignCard";
import CampaignDetail from "@/components/attestations/CampaignDetail";
import { buildPersonMap } from "@/lib/people";

export default function Attestations() {
  const { user } = useAuth();
  const { canCreate } = useAccess();
  const canManage = canCreate("AttestationCampaign");

  const [campaigns, setCampaigns] = useState([]);
  const [responses, setResponses] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, r, u, d, p, ctrl, rk, emps] = await Promise.all([
      base44.entities.AttestationCampaign.list("-created_date", 500),
      base44.entities.AttestationResponse.list("-created_date", 2000),
      base44.entities.User.list(),
      base44.entities.Department.list(),
      base44.entities.Policy.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Employee.list(),
    ]);
    setCampaigns(c);
    setResponses(r);
    setUsers(u);
    setDepartments(d);
    setPolicies(p);
    setControls(ctrl);
    setRisks(rk);
    setEmployees(emps);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // live completion rate — refresh as responses are created/submitted
  useEffect(() => {
    const unsub = base44.entities.AttestationResponse.subscribe(() => load());
    return unsub;
  }, [load]);

  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const personMap = buildPersonMap(employees, users);

  const statsFor = (cid) => {
    const rs = responses.filter((x) => x.campaign === cid);
    return {
      total: rs.length,
      completed: rs.filter((x) => x.status === "Completed").length,
      overdue: rs.filter((x) => x.status === "Overdue").length,
      exceptions: rs.filter(
        (x) => x.response_type === "Confirmed with Exceptions" || x.status === "Exception Raised"
      ).length,
    };
  };

  const saveCampaign = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.campaign_ref) payload.campaign_ref = "CAMP-" + Date.now().toString(36).toUpperCase();
      if (!payload.title) {
        alert("Title is required.");
        return;
      }
      if (editing?.id) {
        await auditUpdate(
          "AttestationCampaign",
          editing.id,
          payload,
          campaigns.find((c) => c.id === editing.id),
          user
        );
      } else {
        await auditCreate("AttestationCampaign", payload, user);
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      alert("Save failed: " + (e.message || e));
    }
  };

  const issue = async (c) => {
    if (
      !window.confirm(
        `Issue "${c.title}"? This creates a pending attestation for every audience member and emails them.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("issueAttestationCampaign", { campaign_id: c.id });
      alert(`Issued: ${res.data.issued} responses, ${res.data.notified} notified.`);
      await load();
    } catch (e) {
      alert("Issue failed: " + (e?.response?.data?.error || e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const closeCampaign = async (c) => {
    try {
      await base44.entities.AttestationCampaign.update(c.id, { status: "Closed" });
      await load();
    } catch (e) {
      alert("Close failed: " + (e.message || e));
    }
  };

  const raiseFollowup = async (response, kind) => {
    const camp = campaigns.find((c) => c.id === response.campaign);
    const p = personMap[response.employee] || personMap[response.user];
    // Action.owner still links to a platform User — use the campaign owner's linked account.
    const ownerEmp = employees.find((e) => e.id === camp?.owner);
    const actionOwner = ownerEmp?.linked_user || user.id;
    try {
      if (kind === "action") {
        const a = await auditCreate(
          "Action",
          {
            description: `Follow-up from attestation "${camp?.title || ""}" — ${response.response_type} by ${
              p?.full_name || p?.email || ""
            }: ${response.exception_detail || ""}`,
            linked_risk: camp?.linked_risk || undefined,
            owner: actionOwner,
            status: "Open",
            priority: "High",
          },
          user
        );
        await base44.entities.AttestationResponse.update(response.id, { linked_action: a.id });
      } else {
        const coi = await auditCreate(
          "ConflictOfInterest",
          {
            person: p?.full_name || p?.email || "",
            nature_of_conflict: `From attestation "${camp?.title || ""}": ${response.response_type} — ${
              response.exception_detail || ""
            }`,
            status: "Active",
          },
          user
        );
        await base44.entities.AttestationResponse.update(response.id, { linked_conflict: coi.id });
      }
      await load();
    } catch (e) {
      alert("Raise failed: " + (e.message || e));
    }
  };

  const lookups = { users, departments, policies, controls, risks, employees };
  const active = campaigns.filter((c) => c.status === "Active");

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Attestations</h1>
          <p className="text-xs text-muted-foreground">Issue, track and evidence staff attestations</p>
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Read-only — Compliance / Risk Team manage campaigns</span>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Active campaigns — completion RAG</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.length === 0 && <p className="text-sm text-muted-foreground">No active campaigns.</p>}
          {active.map((c) => {
            const s = statsFor(c.id);
            const rag =
              s.completed === s.total && s.total > 0 ? "green" : s.overdue > 0 ? "red" : "amber";
            const dot = {
              green: "bg-emerald-500",
              amber: "bg-amber-500",
              red: "bg-red-500",
            }[rag];
            return (
              <button
                key={c.id}
                onClick={() => setDetailFor(c)}
                className="block w-full rounded-lg border border-border p-3 text-left hover:bg-muted/40"
                title="Open campaign responses"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <span className="truncate text-sm font-medium">{c.title}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.completed}/{s.total} completed · {s.overdue} overdue · {s.exceptions} exceptions
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.id}
            campaign={c}
            stats={statsFor(c.id)}
            canManage={canManage}
            onOpen={() => setDetailFor(c)}
            onIssue={() => issue(c)}
            onCloseCampaign={() => closeCampaign(c)}
          />
        ))}
        {campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">No campaigns yet. Create one to get started.</p>
        )}
      </div>

      {formOpen && (
        <CampaignForm
          open={formOpen}
          initial={editing}
          lookups={lookups}
          onSave={saveCampaign}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
      {detailFor && (
        <CampaignDetail
          open={!!detailFor}
          campaign={detailFor}
          responses={responses.filter((r) => r.campaign === detailFor.id)}
          personMap={personMap}
          onRaise={raiseFollowup}
          onClose={() => setDetailFor(null)}
        />
      )}
    </div>
  );
}