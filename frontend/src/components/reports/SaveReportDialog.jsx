import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SaveReportDialog({ open, defaultName, users, onClose, onSave }) {
  const [name, setName] = useState("");
  const [freq, setFreq] = useState("None");
  const [format, setFormat] = useState("Excel");
  const [recipients, setRecipients] = useState([]);

  useEffect(() => {
    if (open) {
      setName(defaultName || "");
      setFreq("None");
      setFormat("Excel");
      setRecipients([]);
    }
  }, [open, defaultName]);

  const toggleRec = (email) =>
    setRecipients((rs) => (rs.includes(email) ? rs.filter((x) => x !== email) : [...rs, email]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save report definition</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Report name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              placeholder="e.g. Finance & Sales regulatory risks"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Schedule</label>
              <select value={freq} onChange={(e) => setFreq(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="None">None (run on demand)</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Export format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="Excel">Excel (.xlsx)</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </div>
          {freq !== "None" && (
            <div>
              <label className="text-xs font-medium">Recipients (registered users)</label>
              <div className="mt-1 max-h-36 overflow-y-auto rounded-md border border-input p-2">
                {(users || []).filter((u) => u.email).map((u) => (
                  <label key={u.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <input type="checkbox" checked={recipients.includes(u.email)} onChange={() => toggleRec(u.email)} />
                    <span>{u.email}</span>
                  </label>
                ))}
                {(!users || users.length === 0) && <span className="text-xs text-muted-foreground">No registered users.</span>}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Scheduled delivery runs server-side and emails the generated file to these recipients.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), schedule_frequency: freq, schedule_format: format, schedule_recipients: recipients })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}