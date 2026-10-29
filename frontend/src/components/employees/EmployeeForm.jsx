import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobileRe = /^[+]?[\d\s()\-]{7,20}$/;

export default function EmployeeForm({ open, initial, departments, employees, users, onSave, onClose }) {
  const [f, setF] = useState({});

  useEffect(() => {
    setF({ ...(initial || {}) });
  }, [initial, open]);

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const errs = [];
  if (!f.full_name?.trim()) errs.push("Full name is required");
  if (!f.email?.trim()) errs.push("Email is required");
  else if (!emailRe.test(f.email.trim())) errs.push("Email format is invalid");
  if (f.mobile && f.mobile.trim() && !mobileRe.test(f.mobile.trim())) errs.push("Mobile format is invalid");

  const linkedUser = users?.find((u) => u.id === f.linked_user);
  const managerOptions = employees.filter((e) => e.id !== f.id);

  const submit = () => {
    if (errs.length) return;
    onSave({
      ...f,
      full_name: f.full_name.trim(),
      email: f.email.trim().toLowerCase(),
      mobile: f.mobile?.trim() || null,
      job_title: f.job_title?.trim() || null,
      department: f.department || null,
      line_manager: f.line_manager || null,
      requires_login: f.requires_login || "No",
      status: f.status || "Active",
      linked_user: f.linked_user || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{f.id ? "Edit employee" : "Add employee"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Full name *</Label>
            <Input value={f.full_name || ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Jane Smith" />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="jane.smith@tab.co.uk" />
          </div>
          <div>
            <Label>Mobile</Label>
            <Input value={f.mobile || ""} onChange={(e) => set("mobile", e.target.value)} placeholder="07700 900123" />
          </div>
          <div>
            <Label>Department</Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.department || ""} onChange={(e) => set("department", e.target.value)}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Job title / role</Label>
            <Input value={f.job_title || ""} onChange={(e) => set("job_title", e.target.value)} placeholder="Risk Manager" />
          </div>
          <div className="sm:col-span-2">
            <Label>Line manager</Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.line_manager || ""} onChange={(e) => set("line_manager", e.target.value)}>
              <option value="">—</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Requires login</Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.requires_login || "No"} onChange={(e) => set("requires_login", e.target.value)}>
              <option value="No">No — email-only</option>
              <option value="Yes">Yes — platform account</option>
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={f.status || "Active"} onChange={(e) => set("status", e.target.value)}>
              <option value="Active">Active</option>
              <option value="Leaver">Leaver</option>
            </select>
          </div>
          <div className="sm:col-span-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {linkedUser ? (
              <>Linked account: <span className="font-medium text-foreground">{linkedUser.email}</span></>
            ) : f.requires_login === "Yes" ? (
              <>A platform account will be provisioned (invited) for this person on save.</>
            ) : (
              <>No platform account — this person is reachable by email for attestations but cannot log in.</>
            )}
          </div>
        </div>
        {errs.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {errs.join(" · ")}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={errs.length > 0}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}