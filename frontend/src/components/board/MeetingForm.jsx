import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RichText from "./RichText";

const COMMITTEES = ["Board", "Board Risk Committee", "ERC", "Credit Committee", "Other"];

export default function MeetingForm({ open, onClose, onSave, users, defaultCommittee }) {
  const [form, setForm] = useState({
    title: "",
    committee: defaultCommittee || "Board",
    date: "",
    location: "",
    chair: "",
    next_meeting_date: "",
    agenda: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onSave(form);
  };
  const input = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Meeting</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium">Title*</Label>
            <input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Board Risk Committee — July 2026" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium">Committee</Label>
              <select className={input} value={form.committee} onChange={(e) => set("committee", e.target.value)}>
                {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Date</Label>
              <input type="date" className={input} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium">Location</Label>
              <input className={input} value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Chair</Label>
              <select className={input} value={form.chair} onChange={(e) => set("chair", e.target.value)}>
                <option value="">—</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium">Next meeting date</Label>
            <input type="date" className={input} value={form.next_meeting_date} onChange={(e) => set("next_meeting_date", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium">Agenda</Label>
            <RichText value={form.agenda} onChange={(v) => set("agenda", v)} placeholder="Agenda items…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Meeting</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}