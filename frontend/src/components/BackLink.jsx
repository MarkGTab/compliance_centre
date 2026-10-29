import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDeeplink } from "@/lib/deeplink";

// Shown only when the page was reached via a deep link (query params present),
// giving the user a clear way back to wherever they came from.
export default function BackLink({ label = "Back to previous" }) {
  const navigate = useNavigate();
  const dl = useDeeplink();
  if (!dl || Object.keys(dl).length === 0) return null;
  return (
    <button
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  );
}