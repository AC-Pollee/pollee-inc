// manage-poll-budget — per-proposal budget line items and the finalisation gate.
//
// A Budget panel is attached to every new poll proposal by default (Poll.budget_enabled = true).
// An Infomarian or above can switch the budget engine on or off for a proposal, and only an
// Infomarian or above may enter a budget figure on each line. The budget finalises ONLY when
// every line carries a figure entered by an Infomarian or above; editing any line reverts the
// proposal back to draft so the figure can be corrected.
//
// Actions
//   toggle    { pollId, enabled }                      Infomarian+ — switch the budget engine on/off
//   addLine   { pollId, label }                         any signed-in user — add a budget line (no figure yet)
//   updateLine { pollId, lineId, label?, cost?, ci? }  label editable by anyone; cost/ci by Infomarian+ only
//   removeLine { pollId, lineId }                       any signed-in user
//   finalise  { pollId }                                Infomarian+ — only if every line has a figure > 0
//
// "Infomarian or above" = the workspace super-admin, a user whose user_role is infomarian /
// master_franchiser / franchise_manager / admin, or anyone with an Infomarian record.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const SUPERADMIN = "ac@acproductiondesign.com";
const ELEVATED_ROLES = ["infomarian", "master_franchiser", "franchise_manager", "admin"];

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

async function isInfomarianOrAbove(base44: any, user: any): Promise<boolean> {
  if (user?.email === SUPERADMIN) return true;
  if (ELEVATED_ROLES.includes(user?.user_role)) return true;
  if (user?.role === "admin") return true;
  try {
    const records = await base44.entities.Infomarian.filter({ user_email: user.email });
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Sign in to manage the proposal budget." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, pollId } = body ?? {};
    if (!action) return Response.json({ error: "action is required (toggle, addLine, updateLine, removeLine, finalise)." }, { status: 400 });
    if (!pollId) return Response.json({ error: "pollId is required." }, { status: 400 });

    let poll: any;
    try {
      poll = await base44.entities.Poll.get(pollId);
    } catch {
      return Response.json({ error: "Poll not found." }, { status: 404 });
    }
    if (!poll) return Response.json({ error: "Poll not found." }, { status: 404 });

    const elevated = await isInfomarianOrAbove(base44, user);
    const lines: any[] = Array.isArray(poll.budget_lines) ? poll.budget_lines : [];

    switch (action) {
      case "toggle": {
        if (!elevated) return Response.json({ error: "Only an Infomarian or above can switch the budget engine." }, { status: 403 });
        const enabled = !!body.enabled;
        await base44.entities.Poll.update(pollId, { budget_enabled: enabled });
        return Response.json({ ok: true, budget_enabled: enabled });
      }

      case "addLine": {
        const label = (typeof body.label === "string" ? body.label : "").trim();
        if (!label) return Response.json({ error: "label is required for a budget line." }, { status: 400 });
        const line = { id: uid(), label, cost: null, ci: null, entered_by_id: null, entered_by_name: null, entered_at: null };
        await base44.entities.Poll.update(pollId, { budget_lines: [...lines, line], budget_status: "draft" });
        return Response.json({ ok: true, line });
      }

      case "updateLine": {
        const line = lines.find((l) => l.id === body.lineId);
        if (!line) return Response.json({ error: "Budget line not found." }, { status: 404 });
        const next: any = { ...line };
        if (typeof body.label === "string") {
          const label = body.label.trim();
          if (!label) return Response.json({ error: "label cannot be empty." }, { status: 400 });
          next.label = label;
        }
        if (body.cost !== undefined) {
          if (!elevated) return Response.json({ error: "Only an Infomarian or above can enter a budget figure." }, { status: 403 });
          const cost = Number(body.cost);
          if (!Number.isFinite(cost) || cost < 0) return Response.json({ error: "cost must be a non-negative number of dollars." }, { status: 400 });
          next.cost = cost;
          next.entered_by_id = user.id;
          next.entered_by_name = user.full_name || user.email;
          next.entered_at = new Date().toISOString();
        }
        if (body.ci !== undefined) {
          if (!elevated) return Response.json({ error: "Only an Infomarian or above can set the confidence interval." }, { status: 403 });
          const ci = Number(body.ci);
          if (!Number.isFinite(ci) || ci < 0 || ci > 100) return Response.json({ error: "ci is the +/- percentage, 0 to 100." }, { status: 400 });
          next.ci = ci;
        }
        const updatedLines = lines.map((l) => (l.id === line.id ? next : l));
        // Editing any line after finalisation reverts to draft so the figure can be corrected.
        await base44.entities.Poll.update(pollId, { budget_lines: updatedLines, budget_status: "draft" });
        return Response.json({ ok: true, line: next });
      }

      case "removeLine": {
        const updatedLines = lines.filter((l) => l.id !== body.lineId);
        await base44.entities.Poll.update(pollId, { budget_lines: updatedLines, budget_status: "draft" });
        return Response.json({ ok: true });
      }

      case "finalise": {
        if (!elevated) return Response.json({ error: "Only an Infomarian or above can finalise the budget." }, { status: 403 });
        if (lines.length === 0) return Response.json({ error: "Add at least one budget line before finalising." }, { status: 400 });
        const missing = lines.filter((l) => typeof l.cost !== "number" || l.cost <= 0);
        if (missing.length) return Response.json({ error: `${missing.length} line(s) still need a budget figure from an Infomarian or above.` }, { status: 400 });
        const total = lines.reduce((a, l) => a + (l.cost as number), 0);
        await base44.entities.Poll.update(pollId, { budget_status: "finalised" });
        return Response.json({ ok: true, budget_status: "finalised", total });
      }

      default:
        return Response.json({ error: `Unknown action "${action}". Use toggle, addLine, updateLine, removeLine, finalise.` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}