// Admin-only renewal simulator.
//
// Mirrors the logic of `supabase/functions/process-renewals/index.ts` so we
// can preview, for any customer, what the daily auto-renewal job *would* do
// today — without writing anything to the database.
//
// Decisions surfaced:
//   - Cycle anchor + next renewal date (calendar-month math, identical to the job).
//   - Resolved broadband base price (broadband_plans.price -> isp_area_plans -> 800).
//   - Cycle cost = base price + sum of scheduled add-on rates.
//   - Wallet credit currently on file, and how much would be applied.
//   - Outcome: "renew", "expire", "reactivate", "skip (not due yet)", or
//     "skip (already expired, still underfunded)".
//
// This page is intentionally read-only. A "Run live now" button is provided
// that invokes the deployed `process-renewals` edge function — useful when
// you want to actually execute the daily job on demand.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ONEVERGE_SUITE_RATES, PRICING_CONFIG } from "@/shared/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Cycle math (mirrors process-renewals/index.ts)
// ---------------------------------------------------------------------------

const DEFAULT_BASE_PRICE = 800;

function nextRenewalDate(activationISO: string, today: Date): Date {
  const activation = new Date(activationISO);
  activation.setHours(0, 0, 0, 0);
  const todayDateOnly = new Date(today);
  todayDateOnly.setHours(0, 0, 0, 0);
  const originalDay = activation.getDate();

  const next = new Date(activation);
  let targetMonth = next.getMonth() + 1;
  next.setDate(1);
  next.setMonth(targetMonth);
  let lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(originalDay, lastDay));

  while (next < todayDateOnly) {
    targetMonth = next.getMonth() + 1;
    next.setDate(1);
    next.setMonth(targetMonth);
    lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(originalDay, lastDay));
  }
  return next;
}

function computeCycleCost(scheduledServices: string[] | null, basePrice: number): number {
  const addons = (scheduledServices || []).filter((id) => id !== "broadband");
  const addonsTotal = addons.reduce(
    (sum, id) => sum + (Number(ONEVERGE_SUITE_RATES[id]) || 0),
    0,
  );
  return basePrice + addonsTotal;
}

async function resolveBasePrice(customer: any): Promise<number> {
  if (customer?.broadband_plan_id) {
    const { data } = await supabase
      .from("broadband_plans")
      .select("price, base_price, is_active")
      .eq("id", customer.broadband_plan_id)
      .maybeSingle();
    if (data) {
      const price = Number((data as any).price ?? (data as any).base_price ?? 0);
      if (price > 0) return price;
    }
  }
  if (customer?.isp_id && customer?.area_id && customer?.speed != null) {
    const { data: links } = await supabase
      .from("isp_area_plans")
      .select("plan_id")
      .eq("isp_id", customer.isp_id)
      .eq("area_id", customer.area_id);
    const planIds = (links || []).map((l: any) => l.plan_id).filter(Boolean);
    if (planIds.length > 0) {
      const { data: plans } = await supabase
        .from("broadband_plans")
        .select("id, price, base_price, speed, is_active")
        .in("id", planIds);
      const speedStr = String(customer.speed);
      const match = (plans || []).find(
        (p: any) => String(p.speed) === speedStr && p.is_active !== false,
      );
      if (match) {
        const price = Number(match.price ?? match.base_price ?? 0);
        if (price > 0) return price;
      }
    }
  }
  return DEFAULT_BASE_PRICE;
}

// ---------------------------------------------------------------------------
// Admin gate.
// In production we require an explicit `oneverge_admin=true` localStorage flag.
// In dev/preview environments (localhost or *.lovable.app preview hosts) we
// auto-grant access so internal operators don't need to flip the flag manually.
// Swap this for a real has_role(auth.uid(), 'admin') check when wiring up
// proper SSO for staff.
// ---------------------------------------------------------------------------

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com")
  );
}

function useIsAdmin(): boolean {
  const [allowed, setAllowed] = useState<boolean>(false);
  useEffect(() => {
    if (isPreviewHost()) {
      // Persist so subsequent visits (and any other admin-gated UI we add)
      // see the same flag without relying on host detection alone.
      try {
        localStorage.setItem("oneverge_admin", "true");
      } catch {
        // Ignore storage failures (private mode etc.) — host check still grants access.
      }
      setAllowed(true);
      return;
    }
    setAllowed(localStorage.getItem("oneverge_admin") === "true");
  }, []);
  return allowed;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const fmtBDT = (n: number) =>
  `${PRICING_CONFIG.CURRENCY}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface CustomerRow {
  id: string;
  display_name: string | null;
  email: string | null;
  user_id: string | null;
  account_status: string | null;
  balance: number | null;
  scheduled_services: string[] | null;
  active_services: string[] | null;
  created_at: string;
  broadband_plan_id: string | null;
  isp_id: string | null;
  area_id: string | null;
  speed: string | null;
}

interface Simulation {
  cycleAnchorISO: string;
  renewalDate: Date;
  isDueToday: boolean;
  isExpired: boolean;
  basePrice: number;
  cycleServices: string[];
  cycleCost: number;
  walletBalance: number;
  walletCreditApplied: number;
  shortfall: number;
  outcome:
    | "would_renew"
    | "would_reactivate"
    | "would_expire"
    | "skip_not_due"
    | "skip_still_underfunded";
}

const OUTCOME_META: Record<
  Simulation["outcome"],
  { label: string; tone: "default" | "secondary" | "destructive" | "outline"; description: string }
> = {
  would_renew: {
    label: "Would renew",
    tone: "default",
    description: "Wallet covers the cycle. Job would debit and write a paid history row.",
  },
  would_reactivate: {
    label: "Would reactivate",
    tone: "default",
    description: "Account is expired but wallet now covers the cycle. Job would re-activate.",
  },
  would_expire: {
    label: "Would expire",
    tone: "destructive",
    description: "Cycle is due and wallet is short. Job would mark the account expired.",
  },
  skip_not_due: {
    label: "Skip (not due)",
    tone: "secondary",
    description: "Today is before the next renewal date. Job would skip this customer.",
  },
  skip_still_underfunded: {
    label: "Skip (expired, underfunded)",
    tone: "outline",
    description: "Already expired and wallet still cannot cover the cycle. Job leaves as-is.",
  },
};

export default function RenewalSimulator() {
  const isAdmin = useIsAdmin();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  // Load customer list (simulator is admin-only; full table read).
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, display_name, email, user_id, created_at, customer_connections!inner(account_status, balance, scheduled_services, active_services, broadband_plan_id, isp_id, area_id, speed)",
        )
        .neq("customer_connections.account_status", "account created")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        toast.error("Failed to load customers", { description: error.message });
      } else {
        const flat = (data as any[] || []).map((c) => {
          const conn = Array.isArray(c.customer_connections) ? c.customer_connections[0] : c.customer_connections;
          return { ...c, ...(conn || {}) };
        });
        setCustomers(flat);
      }
      setLoading(false);
    })();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.display_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.user_id || "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId],
  );

  // Re-simulate whenever the selected customer changes.
  useEffect(() => {
    if (!selected) {
      setSim(null);
      return;
    }
    (async () => {
      const today = new Date();
      const todayDateOnly = new Date(today);
      todayDateOnly.setHours(0, 0, 0, 0);

      // Cycle anchor = latest paid billing_history.created_at, falling back
      // to customers.created_at for accounts that have never renewed yet.
      // This matches process-renewals/index.ts so the simulator stays accurate
      // for accounts that have already been through one or more cycles.
      const { data: lastPaid } = await supabase
        .from("billing_history")
        .select("created_at")
        .eq("customer_id", selected.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const cycleAnchorISO =
        ((lastPaid as any)?.created_at as string | undefined) || selected.created_at;

      const renewal = nextRenewalDate(cycleAnchorISO, today);
      const isDueToday = todayDateOnly >= renewal;
      const isExpired = selected.account_status === "expired";
      const basePrice = await resolveBasePrice(selected);
      const cycleServices =
        (selected.scheduled_services && selected.scheduled_services.length > 0)
          ? selected.scheduled_services
          : ["broadband"];
      const cycleCost = computeCycleCost(cycleServices, basePrice);
      const walletBalance = Number(selected.balance || 0);

      let outcome: Simulation["outcome"];
      let walletCreditApplied = 0;
      let shortfall = 0;

      if (!isExpired && !isDueToday) {
        outcome = "skip_not_due";
      } else if (walletBalance >= cycleCost) {
        outcome = isExpired ? "would_reactivate" : "would_renew";
        walletCreditApplied = cycleCost;
      } else if (isExpired) {
        outcome = "skip_still_underfunded";
        walletCreditApplied = walletBalance;
        shortfall = cycleCost - walletBalance;
      } else {
        outcome = "would_expire";
        walletCreditApplied = walletBalance;
        shortfall = cycleCost - walletBalance;
      }

      setSim({
        cycleAnchorISO,
        renewalDate: renewal,
        isDueToday,
        isExpired,
        basePrice,
        cycleServices,
        cycleCost,
        walletBalance,
        walletCreditApplied,
        shortfall,
        outcome,
      });
    })();
  }, [selected]);

  const runLive = async () => {
    if (!confirm("Run process-renewals live now? This will mutate customer state.")) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-renewals", {});
      if (error) throw error;
      toast.success("process-renewals completed", {
        description: JSON.stringify((data as any)?.summary || data),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("process-renewals failed", { description: msg });
    } finally {
      setRunning(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              The renewal simulator is restricted to internal operators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              To enable dev access on this device, run the following in your browser console
              and reload:
            </p>
            <pre className="bg-muted p-3 rounded text-xs">localStorage.setItem("oneverge_admin", "true")</pre>
            <Link to="/dashboard" className="text-primary underline">
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Renewal Simulator</h1>
            <p className="text-sm text-muted-foreground">
              Preview what the nightly <code>process-renewals</code> job would do for any customer
              today — no writes performed.
            </p>
          </div>
          <Button onClick={runLive} disabled={running} variant="destructive">
            {running ? "Running…" : "Run process-renewals live"}
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a customer</CardTitle>
            <CardDescription>
              {loading ? "Loading customers…" : `${customers.length} provisioned customers loaded`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Name, email, or OneVerge ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer">Customer</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filtered.slice(0, 200).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {(c.display_name || "Unnamed")} — {c.email || c.user_id} ({c.account_status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selected && sim && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">
                    {selected.display_name || "Unnamed"} ·{" "}
                    <span className="text-muted-foreground font-normal">{selected.email || selected.user_id}</span>
                  </CardTitle>
                  <CardDescription>
                    Status: <span className="font-medium">{selected.account_status}</span> · Cycle anchor{" "}
                    {new Date(sim.cycleAnchorISO).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={OUTCOME_META[sim.outcome].tone}>
                  {OUTCOME_META[sim.outcome].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">{OUTCOME_META[sim.outcome].description}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Stat label="Next renewal date" value={sim.renewalDate.toLocaleDateString()} sub={sim.isDueToday ? "Due today or earlier" : "Not due yet"} />
                <Stat label="Resolved base price" value={fmtBDT(sim.basePrice)} sub={selected.broadband_plan_id ? "From broadband_plans.price" : "Fallback (no plan id)"} />
                <Stat label="Cycle cost" value={fmtBDT(sim.cycleCost)} sub={`${sim.cycleServices.length} service(s)`} />
                <Stat label="Wallet balance" value={fmtBDT(sim.walletBalance)} />
                <Stat label="Wallet credit applied" value={fmtBDT(sim.walletCreditApplied)} sub={sim.walletCreditApplied >= sim.cycleCost ? "Fully covers cycle" : "Partial"} />
                <Stat
                  label="Shortfall"
                  value={fmtBDT(sim.shortfall)}
                  tone={sim.shortfall > 0 ? "warn" : "ok"}
                  sub={sim.shortfall > 0 ? "Need to top up to renew" : "None"}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Scheduled services billed this cycle
                </Label>
                <div className="flex flex-wrap gap-2">
                  {sim.cycleServices.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                      {s !== "broadband" && (
                        <span className="ml-1 text-muted-foreground">
                          · {fmtBDT(Number(ONEVERGE_SUITE_RATES[s]) || 0)}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Tips for testing</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>To force a "due today" scenario, backdate <code>customers.created_at</code> by ≥ 1 month.</li>
                  <li>To force expiry, drop <code>customers.balance</code> below the cycle cost shown above.</li>
                  <li>To test reactivation, set status to <code>expired</code>, then top up the wallet.</li>
                  <li>"Run process-renewals live" actually mutates state — only use on test customers.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "ok";
}) {
  const valueClass =
    tone === "warn"
      ? "text-destructive"
      : tone === "ok"
      ? "text-foreground"
      : "text-foreground";
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
