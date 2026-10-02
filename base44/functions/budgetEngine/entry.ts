// budgetEngine — the §3.12.3 budget cycle rules for pollee-app.org (Base44 backend function)
//
// One function, called with { action, ... }. Both the pages and the agent call it, so the rules
// live in one place. Every action is read-only except "saveCosting", which only an Infomarian
// can call, and only before the ballot opens.
//
// Actions
//   envelope      { cycleId }                          envelope breakdown
//   checkMeasure  { cycleId, measureId }               pre-ballot (lint) checks for one measure
//   agenda        { cycleId }                          every measure with its checks and status
//   direction     { cycleId }                          ballot result per measure, against the constitutional thresholds
//   cut           { cycleId, fill? }                   the published funding line
//   whatIf        { cycleId, envelope?, passThreshold?, fill?, consent?, borrowApproved? }
//                                                      same as cut with overrides; never writes anything
//   saveCosting   { cycleId, measureId, cost, ci, cost2?, source? }
//                                                      Infomarian only; frozen once the ballot opens
//
// Privacy: this function never reads or stores an individual's direction or priority points.
// It only sees the totals the constituency node publishes into the Result entity.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

// ---------------------------------------------------------------- settings
// Fixed design rules (§3.12.3, §3.12.4) and the rulings of 1 Oct 2026.
// Pass thresholds are NOT here: they are constitutional figures read from ConstitutionalSettings.
const RULES = {
  reserveShare: 0.08,       // §3.12.4(1) contingency reserve
  pointsPerElector: 100,    // §3.12.3 stage 2
  capPerMeasure: 20,        // §3.12.3 stage 2
  sunsetCycles: 2,          // §3.12.4(2)
  ciTolerance: 0.25,        // widest acceptable ± on a costing
  disagreeTolerance: 0.2,   // gap between adversarial estimates that needs a published note
  deficitShare: 0.08,       // borrowing needs at least 8% of all points cast
};
const DEFAULT_THRESHOLDS: Thresholds = { ordinary: 0.5, borrowing: 0.5, reserve: 0.5, envelope: 2 / 3 };
const INFOMARIAN_ROLES = ["infomarian", "admin"]; // values of User.role allowed to save a costing

// ---------------------------------------------------------------- types
type Track = "budget" | "declaratory" | "procedural" | "negotiator";
type QuestionClass = "ordinary" | "borrowing" | "reserve" | "envelope";
type Thresholds = Record<QuestionClass, number>;

interface Cycle {
  id: string; name: string; envelope: number;
  committed?: { title: string; amount: number; sunset?: string }[];
  deficit_charges?: { title: string; amount: number }[];
  ballot_opens_at?: string;   // ISO date; costings freeze from this moment
}
interface Measure {
  id: string; cycle_id: string; title: string; proposer: string; path: "constituent" | "institutional";
  topic?: string; track: Track; status?: string; question_class?: QuestionClass;
  rough_cost?: number;        // proposer's own idea, never used in the cut
  cost?: number; ci?: number; cost2?: number; cost_source?: string;
  partial_consent?: boolean;
  borrow?: { amount: number; cycle: string; approved?: boolean } | null;
}
interface Result { measure_id: string; yes: number; no: number; rts: number; points: number }
interface Check { level: "block" | "warn" | "info"; code: string; text: string }

// ---------------------------------------------------------------- engine (pure functions)
const money = (v: number) => "$" + Math.round(v).toLocaleString("en-AU");

function envelopeOf(c: Cycle, override?: number) {
  const total = override ?? c.envelope;
  const reserve = Math.round(total * RULES.reserveShare);
  const committed = (c.committed ?? []).reduce((a, x) => a + x.amount, 0);
  const charges = (c.deficit_charges ?? []).reduce((a, x) => a + x.amount, 0);
  return { total, reserve, committed, charges, allocable: total - reserve - committed - charges };
}

function lint(m: Measure, all: Measure[]): Check[] {
  const out: Check[] = [];
  if (m.track !== "budget") return out;
  if (!m.cost) {
    out.push({ level: "block", code: "no-cost", text: "No cost estimate. A measure cannot go to the ballot until it is priced; if it cannot be priced within tolerance, route it to a declaratory, procedural or negotiator track." });
    return out;
  }
  if ((m.ci ?? 0) > RULES.ciTolerance)
    out.push({ level: "block", code: "ci-wide", text: `The confidence interval (±${Math.round((m.ci ?? 0) * 100)}%) is wider than the ±${Math.round(RULES.ciTolerance * 100)}% tolerance. Narrow the costing or move the measure to a non-budgetary track.` });
  if (!m.cost2) out.push({ level: "warn", code: "single-estimate", text: "Only one estimate. Adversarial costing asks for a second estimate from a party with the opposite interest (§3.12.5)." });
  else {
    const gap = Math.abs(m.cost2 - m.cost) / Math.min(m.cost, m.cost2);
    if (gap > RULES.disagreeTolerance)
      out.push({ level: "warn", code: "estimates-disagree", text: `The two estimates differ by ${Math.round(gap * 100)}% (${money(m.cost)} and ${money(m.cost2)}). Publish both and record why they differ.` });
  }
  const siblings = all.filter(x => x.id !== m.id && x.track === "budget" && x.proposer === m.proposer && x.topic && x.topic === m.topic);
  if (siblings.length) {
    const total = siblings.reduce((a, x) => a + (x.cost ?? 0), m.cost);
    out.push({ level: "warn", code: "possible-split", text: `${siblings.length + 1} measures on "${m.topic}" from the same proposer, ${money(total)} together. Check this is not one measure divided to pass more easily (§3.12.1).` });
  }
  if (m.borrow)
    out.push({ level: "info", code: "borrowing", text: `Asks to borrow ${money(m.borrow.amount)}, charged to the ${m.borrow.cycle} envelope. Needs priority above the deficit threshold, and the charge goes to its own ballot (§3.12.4).` });
  return out;
}
const qualified = (m: Measure, all: Measure[]) => m.track === "budget" && !lint(m, all).some(c => c.level === "block");

function direction(m: Measure, r: Result | undefined, thr: Thresholds): string {
  if (!r) return m.track === "budget" ? "not balloted" : "declaratory";
  const total = r.yes + r.no + r.rts;
  if (!total) return "not balloted";
  if (m.track !== "budget") return r.yes / total > thr.ordinary ? "carried" : "not carried";
  if (r.rts > r.yes && r.rts > r.no) return "returned";
  const t = thr[m.question_class ?? "ordinary"] ?? thr.ordinary;
  return r.yes / total > t ? "passed" : "defeated";
}

interface CutOpts {
  envelope?: number; fill?: "strict" | "skip";
  consent?: Record<string, boolean>; borrowApproved?: Record<string, boolean>;
}
function cut(c: Cycle, all: Measure[], results: Map<string, Result>, thr: Thresholds, o: CutOpts = {}) {
  const env = envelopeOf(c, o.envelope);
  const pts = (m: Measure) => results.get(m.id)?.points ?? 0;
  const totalPoints = all.reduce((a, m) => a + pts(m), 0) || 1;
  const passing = all
    .filter(m => qualified(m, all) && direction(m, results.get(m.id), thr) === "passed")
    .sort((a, b) => pts(b) - pts(a) || (a.cost! - b.cost!) || a.id.localeCompare(b.id)); // fixed tie-break
  let left = env.allocable, stopped = false;
  const rows = passing.map(m => {
    const share = pts(m) / totalPoints;
    const canBorrow = !!m.borrow && share >= RULES.deficitShare;
    const borrow = canBorrow && (o.borrowApproved?.[m.id] ?? m.borrow!.approved) ? m.borrow!.amount : 0;
    const need = m.cost! - borrow;
    let status: "funded" | "partial" | "deferred", funded = 0;
    if (!stopped && need <= left) { status = "funded"; funded = need; left -= need; }
    else if (!stopped && left > 0 && (o.consent?.[m.id] ?? m.partial_consent)) {
      status = "partial"; funded = left; left = 0; if (o.fill !== "skip") stopped = true;
    } else { status = "deferred"; if (o.fill !== "skip") stopped = true; }
    return { id: m.id, title: m.title, points: pts(m), share, cost: m.cost!, borrow: status === "deferred" ? 0 : borrow, funded, status, canBorrow };
  });
  const marginal = rows.find(r => r.status !== "funded") ?? null;
  return {
    envelope: env, rows, unallocated: left, totalPoints, marginal,
    summary: {
      funded: rows.filter(r => r.status === "funded").length,
      partial: rows.filter(r => r.status === "partial").length,
      deferred: rows.filter(r => r.status === "deferred").length,
      fundedAmount: rows.reduce((a, r) => a + r.funded, 0),
    },
  };
}

// ---------------------------------------------------------------- data access
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const isFrozen = (c: Cycle) => !!c.ballot_opens_at && Date.now() >= Date.parse(c.ballot_opens_at);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

async function load(base44: any, cycleId: string) {
  let cycle: Cycle;
  try {
    cycle = await base44.entities.Cycle.get(cycleId);
  } catch {
    throw new HttpError(404, "Cycle not found");
  }
  if (!cycle) throw new HttpError(404, "Cycle not found");
  const measures: Measure[] = await base44.entities.Measure.filter({ cycle_id: cycleId });
  const results: Result[] = await base44.entities.Result.filter({ cycle_id: cycleId });
  // Latest constitutional settings in force; each record should cite the ballot that set it.
  const settings = await base44.entities.ConstitutionalSettings.list("-effective_from", 1);
  const thr: Thresholds = { ...DEFAULT_THRESHOLDS, ...(settings?.[0]?.thresholds ?? {}) };
  return { cycle, measures, results: new Map(results.map(r => [r.measure_id, r])), thr, thresholdsSource: settings?.[0]?.source_ballot ?? "default" };
}

// ---------------------------------------------------------------- handler
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Sign in to use the budget tools." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, cycleId } = body ?? {};
    if (!cycleId) throw new HttpError(400, "cycleId is required");
    const { cycle, measures, results, thr, thresholdsSource } = await load(base44, cycleId);

    switch (action) {
      case "envelope":
        return Response.json({ envelope: envelopeOf(cycle), committed: cycle.committed ?? [], deficitCharges: cycle.deficit_charges ?? [] });

      case "checkMeasure": {
        const m = measures.find(x => x.id === body.measureId);
        if (!m) throw new HttpError(404, "Measure not found in this cycle");
        return Response.json({ id: m.id, title: m.title, qualified: qualified(m, measures), checks: lint(m, measures), frozen: isFrozen(cycle) });
      }

      case "agenda":
        return Response.json({
          frozen: isFrozen(cycle),
          measures: measures.map(m => ({
            id: m.id, title: m.title, proposer: m.proposer, path: m.path, track: m.track, status: m.status ?? null,
            rough_cost: m.rough_cost ?? null, cost: m.cost ?? null, ci: m.ci ?? null, cost2: m.cost2 ?? null,
            qualified: qualified(m, measures), checks: lint(m, measures),
          })),
        });

      case "direction":
        return Response.json({
          thresholds: thr, thresholdsSource,
          measures: measures.map(m => {
            const r = results.get(m.id);
            return { id: m.id, title: m.title, yes: r?.yes ?? null, no: r?.no ?? null, rts: r?.rts ?? null, result: direction(m, r, thr) };
          }),
        });

      case "cut":
        return Response.json({ thresholds: thr, ...cut(cycle, measures, results, thr, { fill: body.fill }) });

      case "whatIf": {
        const t = { ...thr };
        const p = num(body.passThreshold);
        if (p !== undefined) {
          if (p <= 0 || p >= 1) throw new HttpError(400, "passThreshold is a fraction between 0 and 1, e.g. 0.6");
          t.ordinary = p;
        }
        const env = num(body.envelope);
        if (env !== undefined && env < 0) throw new HttpError(400, "envelope cannot be negative");
        return Response.json({
          whatIf: true, note: "Scenario only. Nothing has been changed.", thresholds: t,
          ...cut(cycle, measures, results, t, { envelope: env, fill: body.fill, consent: body.consent, borrowApproved: body.borrowApproved }),
        });
      }

      case "saveCosting": {
        if (!INFOMARIAN_ROLES.includes(user.role)) throw new HttpError(403, "Only an Infomarian can save a costing.");
        if (isFrozen(cycle)) throw new HttpError(409, "The ballot has opened, so costings are frozen. A changed cost needs a new measure or a deferral.");
        const m = measures.find(x => x.id === body.measureId);
        if (!m) throw new HttpError(404, "Measure not found in this cycle");
        if (m.track !== "budget") throw new HttpError(409, "This measure is on a non-budgetary track. Return it to the budget track first.");
        const cost = num(body.cost), ciPct = num(body.ci), cost2 = num(body.cost2);
        if (!cost || cost <= 0) throw new HttpError(400, "cost must be a positive number of dollars");
        if (ciPct === undefined || ciPct < 0 || ciPct > 100) throw new HttpError(400, "ci is the ± percentage, 0 to 100");
        const source = typeof body.source === "string" ? body.source.slice(0, 500) : "";

        // Keep every version: the costing record is part of the archive (§3.4).
        const previous = await base44.entities.Costing.filter({ measure_id: m.id }, "-version", 1);
        const version = (previous?.[0]?.version ?? 0) + 1;
        await base44.entities.Costing.create({
          measure_id: m.id, cycle_id: cycleId, version, cost, ci: ciPct / 100, cost2: cost2 ?? null, source,
          infomarian_id: user.id, infomarian_name: user.full_name,
        });
        const update = { cost, ci: ciPct / 100, cost2: cost2 ?? null, cost_source: source, status: m.status === "cultivating" ? "costed" : m.status };
        await base44.entities.Measure.update(m.id, update);
        const after = { ...m, ...update } as Measure;
        return Response.json({ saved: true, version, qualified: qualified(after, measures.map(x => x.id === m.id ? after : x)), checks: lint(after, measures.map(x => x.id === m.id ? after : x)) });
      }

      default:
        throw new HttpError(400, `Unknown action "${action}". Use envelope, checkMeasure, agenda, direction, cut, whatIf or saveCosting.`);
    }
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: (error as Error).message }, { status });
  }
}