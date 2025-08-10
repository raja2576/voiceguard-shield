import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, ShieldCheck } from "lucide-react";

export type RiskLabel = "Safe" | "Suspicious" | "Scam";

export function FloatingRiskWidget(props: {
  open: boolean;
  score: number;
  label: RiskLabel;
  rationale?: string;
  onHangUp?: () => void;
  onMarkSafe?: () => void;
}) {
  const { open, score, label, rationale, onHangUp, onMarkSafe } = props;
  if (!open) return null;

  const colorByLabel = {
    Safe: "bg-secondary text-secondary-foreground",
    Suspicious: "bg-accent text-accent-foreground",
    Scam: "bg-destructive text-destructive-foreground",
  } as const;

  const Icon = label === "Scam" ? AlertTriangle : label === "Suspicious" ? Shield : ShieldCheck;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className={cn("card-glass w-[320px] p-4", "shadow-xl")}> 
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("size-5", label === "Scam" ? "text-destructive" : "text-primary")} />
            <span className="font-semibold">Live Risk</span>
          </div>
          <Badge className={cn(colorByLabel[label])}>{label}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Score</span>
            <span className="font-medium">{score}/100</span>
          </div>
          <Progress value={score} />
          {rationale ? (
            <p className="text-sm text-muted-foreground">Reason: {rationale}</p>
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="destructive" onClick={onHangUp}>Hang Up</Button>
          <Button variant="secondary" onClick={onMarkSafe}>Mark Safe</Button>
        </div>
      </Card>
    </div>
  );
}
