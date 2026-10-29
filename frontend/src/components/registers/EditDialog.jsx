import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Field from "./Field";

export default function EditDialog({ open, title, fields, initial, onSave, onClose }) {
  const [data, setData] = useState(initial || {});
  useEffect(() => {
    setData(initial || {});
  }, [initial, open]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <Field key={f.key} field={f} value={data[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(data)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}