import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, FileText, AlertTriangle, Lock } from "lucide-react";

// Public, no-login attestation completion page. Reached via a tokenised magic link
// (/attest/:token). Renders ONLY this one attestation — no app navigation, no other
// records. Token is single-use and expires at the campaign due date.
export default function PublicAttestation({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [choice, setChoice] = useState("Confirmed");
  const [exception, setException] = useState("");
  const [sig, setSig] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await base44.functions.invoke("getPublicAttestation", { token });
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || "Unable to load this attestation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      setErr("Please describe the exception.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("submitPublicAttestation", {
        token,
        response_type: choice,
        exception_detail: exception,
        signature_name: sig,
        confirm,
      });
      setDone(true);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Submit failed";
      setErr(msg);
      if (e?.response?.status === 409 || e?.response?.status === 410) {
        setTimeout(load, 900);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold">TAB Risk Management</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
      <footer className="px-4 py-4 text-center text-xs text-muted-foreground">
        TAB Risk Management — secure attestation
      </footer>
    </div>
  );

  if (loading) {
    return (
      <Shell>
        <div className="text-sm text-muted-foreground">Loading attestation…</div>
      </Shell>
    );
  }

  if (err && !data) {
    return (
      <Shell>
        <div className="space-y-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="font-medium">This link is not valid.</div>
          <div className="text-sm text-muted-foreground">{err}</div>
        </div>
      </Shell>
    );
  }

  const state = data?.state;

  if (state === "invalid") {
    return (
      <Shell>
        <div className="space-y-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="font-medium">This link is not valid.</div>
          <div className="text-sm text-muted-foreground">
            The attestation link may be incomplete or incorrect. Please contact Compliance.
          </div>
        </div>
      </Shell>
    );
  }

  if (state === "expired") {
    return (
      <Shell>
        <div className="space-y-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="font-medium">This attestation link has expired.</div>
          <div className="text-sm text-muted-foreground">
            It was due {data.due_date || ""}.
            {data.contact_email ? ` Please contact Compliance (${data.contact_email}) to complete it.` : ""}
          </div>
        </div>
      </Shell>
    );
  }

  if (state === "completed" || done) {
    return (
      <Shell>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> This attestation has already been completed.
          </div>
          {data?.signed_datetime && (
            <div className="text-xs text-muted-foreground">
              Signed {new Date(data.signed_datetime).toLocaleString()} by {data.signature_name || "—"} ·{" "}
              {data.response_type || "—"}
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // state === "open"
  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">{data.title || "Attestation"}</h1>
          {data.due_date && <div className="text-xs text-muted-foreground">Due {data.due_date}</div>}
          {data.recipient_email && (
            <div className="text-xs text-muted-foreground">Sent to {data.recipient_email}</div>
          )}
        </div>

        {data.policy && (
          <div className="rounded-md border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" /> {data.policy.policy_name}
              {data.policy.version ? (
                <span className="text-xs text-muted-foreground">v{data.policy.version}</span>
              ) : null}
            </div>
            {data.policy.policy_document && (
              <a
                href={data.policy.policy_document}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                Open policy document
              </a>
            )}
          </div>
        )}

        <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
          {data.statement || "(no statement provided)"}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={choice === "Confirmed"}
              onChange={() => setChoice("Confirmed")}
            />{" "}
            Confirm
          </label>
          {data.allow_exceptions && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={choice === "Confirmed with Exceptions"}
                onChange={() => setChoice("Confirmed with Exceptions")}
              />{" "}
              Confirm with exceptions
            </label>
          )}
        </div>

        {choice !== "Confirmed" && (
          <textarea
            className="w-full rounded-md border border-input p-2 text-sm"
            rows={4}
            placeholder="Describe the exception / conflict"
            value={exception}
            onChange={(e) => setException(e.target.value)}
          />
        )}

        <div>
          <label className="text-xs font-medium">Type your full name to sign</label>
          <Input value={sig} onChange={(e) => setSig(e.target.value)} placeholder="Full name" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
          />{" "}
          I confirm this attestation is true and accurate.
        </label>

        {err && <div className="text-sm text-destructive">{err}</div>}

        <Button disabled={submitting} onClick={submit} className="w-full">
          {submitting ? "Submitting…" : "Submit & sign"}
        </Button>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Your response is recorded and locked once submitted.
        </div>
      </div>
    </Shell>
  );
}