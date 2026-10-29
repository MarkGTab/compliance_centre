import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Field({ field, value, onChange }) {
  const { label, type = "text", options = [], rows, placeholder } = field;
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}
        {field.required && <span className="text-destructive"> *</span>}
      </Label>
      {type === "select" ? (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => {
              const v = typeof o === "string" ? o : o.value;
              const l = typeof o === "string" ? o : o.label;
              return <SelectItem key={v} value={v}>{l}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      ) : type === "textarea" ? (
        <Textarea
          rows={rows || 3}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === "multiselect" ? (
        <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border p-2">
          {options.map((o) => {
            const v = typeof o === "string" ? o : o.value;
            const l = typeof o === "string" ? o : o.label;
            const checked = Array.isArray(value) && value.includes(v);
            return (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...(value || []), v]
                      : (value || []).filter((x) => x !== v);
                    onChange(next);
                  }}
                />
                {l}
              </label>
            );
          })}
        </div>
      ) : (
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) =>
            onChange(
              type === "number"
                ? (e.target.value === "" ? null : Number(e.target.value))
                : e.target.value
            )
          }
          placeholder={placeholder}
        />
      )}
    </div>
  );
}