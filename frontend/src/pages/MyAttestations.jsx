import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import AttestationScreen from "@/components/attestations/AttestationScreen";

const statusBadge = {
  Pending: "bg-slate-100 text-slate-700",
  Completed: "bg-emerald-100 text-emerald-800",
  "Exception Raised": "bg-amber-100 text-amber-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function MyAttestations() {
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [active, setActive] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const [r, c, p] = await Promise.all([
      base44.entities.AttestationResponse.filter({ user: user.id }),
      base44.entities.AttestationCampaign.list(),
      base44.entities.Policy.list(),
    ]);
    setResponses(r);
    setCampaigns(c);
    setPolicies(p);
  }, [user]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const policyMap = Object.fromEntries(policies.map((p) => [p.id, p]));
  const pending = responses.filter((r) => r.status === "Pending" || r.status === "Overdue");
  const history = responses.filter(
    (r) => r.locked || r.status === "Completed" || r.status === "Exception Raised"
  );

  const onSubmitted = () => {
    setActive(null);
    setReloadKey((k) => k + 1);
  };

  const activeCampaign = active ? campMap[active.campaign] : null;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">My Attestations</h1>
        <p className="text-xs text-muted-foreground">Your pending attestations and signed history</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending attestations — you're up to date.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => {
              const c = campMap[r.campaign];
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="font-medium">{c?.title || "Attestation"}</div>
                    <div className="text-xs text-muted-foreground">
                      {c?.type} · Due {c?.due_date || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge[r.status] || ""}`}>
                      {r.status}
                    </span>
                    <Button size="sm" onClick={() => setActive(r)}>Complete</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Signed history ({history.length})</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed attestations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs">
                <tr>
                  <th className="px-2 py-1 text-left">Campaign</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Response</th>
                  <th className="px-2 py-1 text-left">Signed</th>
                  <th className="px-2 py-1 text-left">Signature</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const c = campMap[r.campaign];
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-2 py-1">{c?.title || "—"}</td>
                      <td className="px-2 py-1">{c?.type || "—"}</td>
                      <td className="px-2 py-1">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${statusBadge[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-xs">
                        {r.signed_datetime ? new Date(r.signed_datetime).toLocaleString() : "—"}
                      </td>
                      <td className="px-2 py-1 text-xs">{r.signature_name || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {active && (
        <AttestationScreen
          open={!!active}
          campaign={activeCampaign}
          response={active}
          policy={activeCampaign?.linked_policy ? policyMap[activeCampaign.linked_policy] : null}
          user={user}
          onSubmitted={onSubmitted}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}