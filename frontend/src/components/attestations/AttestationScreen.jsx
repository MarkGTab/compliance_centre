import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, FileText } from "lucide-react";

export default function AttestationScreen({ open, campaign, response, policy, user, onSubmitted, onClose }) {
  const [choice, setChoice] = useState("Confirmed");
  const [exception, setException] = useState("");
  const [sig, setSig] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const allowExceptions = campaign?.allow_exceptions === "Yes";
  const locked = response?.locked;

  const submit = async () => {
    setErr("");
    if (!sig.trim()) {
      setErr("Please type your full name to sign.");
      return;
    }
    if (!confirm) {
      setErr("Please tick the confirmation box.");
      return;
    }
    if (choice !== "Confirmed" && !exception.trim()) {
      setErr("Please describe the exception / reason.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("submitAttestation", {
        response_id: response.id,
        response_type: choice,
        exception_detail: exception,
        signature_name: sig,
        confirm,
      });
      onSubmitted();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign?.title || "Attestation"}</DialogTitle>
        </DialogHeader>

        {locked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <ShieldCheck className="h-4 w-4" />
              You completed this attestation on{" "}
              {response?.signed_datetime ? new Date(response.signed_datetime).toLocaleString() : ""}.
            </div>
            <div className="text-xs text-muted-foreground">
              Signed by: {response?.signature_name} · {response?.response_type}
            </div>
            {response?.exception_detail && (
              <div className="text-xs">
                <span className="font-medium">Exception:</span> {response.exception_detail}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {policy && (
              <div className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" /> {policy.policy_name}
                  {policy.version && <span className="text-xs text-muted-foreground">v{policy.version}</span>}
                </div>
                {policy.policy_document && (
                  <a
                    href={policy.policy_document}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Open policy document
                  </a>
                )}
              </div>
            )}

            <div className="rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
              {campaign?.statement || "(no statement provided)"}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={choice === "Confirmed"} onChange={() => setChoice("Confirmed")} /> Confirm
              </label>
              {allowExceptions && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={choice === "Confirmed with Exceptions"}
                    onChange={() => setChoice("Confirmed with Exceptions")}
                  />{" "}
                  Confirm with exceptions
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={choice === "Declined"} onChange={() => setChoice("Declined")} /> Decline
              </label>
            </div>

            {choice !== "Confirmed" && (
              <textarea
                className="w-full rounded-md border border-input p-2 text-sm"
                rows={3}
                placeholder="Describe the exception / reason for decline"
                value={exception}
                onChange={(e) => setException(e.target.value)}
              />
            )}

            <div>
              <label className="text-xs font-medium">Type your full name to sign</label>
              <Input value={sig} onChange={(e) => setSig(e.target.value)} placeholder={user?.full_name || "Full name"} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              I confirm this attestation is true and accurate.
            </label>

            {err && <div className="text-sm text-destructive">{err}</div>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {!locked && (
            <Button disabled={submitting} onClick={submit}>
              {submitting ? "Submitting…" : "Submit & sign"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}