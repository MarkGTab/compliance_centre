import React from "react";
import { ShieldX } from "lucide-react";

export default function NoAccess({ section }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center">
      <ShieldX className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">No access</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        You don't have permission to view{section ? ` the ${section.id} section` : " this section"}.
        Contact your administrator if you believe this is an error.
      </p>
    </div>
  );
}