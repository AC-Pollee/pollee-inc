import React from 'react';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      {children}
    </div>
  );
}

export default function ReportView({ r }) {
  const m = r.money;
  return (
    <div className="text-sm">
      <Section title="Participation record (Rule 18)">
        <p className="text-slate-500 mb-2">Members eligible to vote: {r.eligible}. Only each member's last formal vote is counted.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-xs text-slate-500 border-b">
              <th className="py-1 pr-2">Poll</th><th>Formal</th><th>Part. %</th><th>Yes</th><th>No</th><th>RTS</th><th>Informal</th><th>Delegated</th><th>Changed</th><th>Outcome</th>
            </tr></thead>
            <tbody>
              {r.pollRows.map(p => (
                <tr key={p.id} className="border-b">
                  <td className="py-1 pr-2 max-w-[220px] truncate">{p.title}</td><td>{p.total}</td><td>{p.participation}</td>
                  <td>{p.yes}</td><td>{p.no}</td><td>{p.rts}</td><td>{p.informal}</td><td>{p.delegated}</td><td>{p.changes}</td><td>{p.outcome}</td>
                </tr>
              ))}
              {r.pollRows.length === 0 && <tr><td colSpan={10} className="py-3 text-slate-400">No votes in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Voting contributions (By-law 1)">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Stat label="Total contributions" value={`$${m.contributions.toFixed(2)}`} />
          <Stat label="Infomarians (30c)" value={`$${m.infomarian.toFixed(2)}`} />
          <Stat label="Association (10c)" value={`$${m.association.toFixed(2)}`} />
          <Stat label="Infrastructure (10c)" value={`$${m.infrastructure.toFixed(2)}`} />
          <Stat label="GST (5c)" value={`$${m.gst.toFixed(2)}`} />
          <Stat label="Gratuities" value={`$${m.gratuities.toFixed(2)}`} />
        </div>
      </Section>

      <Section title="Infomarian remuneration and load (Rules 47, 55(e))">
        <table className="w-full text-left">
          <thead><tr className="text-xs text-slate-500 border-b"><th className="py-1">Infomarian</th><th>Polls hosted</th><th>Votes</th><th>Fees</th><th>Gratuities</th></tr></thead>
          <tbody>
            {r.infoRows.map((i, idx) => (
              <tr key={idx} className="border-b"><td className="py-1">{i.name}</td><td>{i.hosted}</td><td>{i.votes}</td><td>${i.fees.toFixed(2)}</td><td>${i.gratuity.toFixed(2)}</td></tr>
            ))}
            {r.infoRows.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-400">No Infomarian activity in this period.</td></tr>}
          </tbody>
        </table>
      </Section>

      <Section title="Delegation and paths of origination (Rules 32(4), 55(b)(c))">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Delegations created" value={r.delegation.created} />
          <Stat label="Verified / revoked" value={`${r.delegation.verified} / ${r.delegation.revoked}`} />
          <Stat label="Constituent path questions" value={r.paths.constituent} />
          <Stat label="Institutional path questions" value={r.paths.institutional} />
        </div>
      </Section>

      <Section title="Moderation (By-law 6)">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat label="Comments" value={r.moderation.comments} />
          <Stat label="Approved" value={r.moderation.approved} />
          <Stat label="Pending" value={r.moderation.pending} />
          <Stat label="Flagged" value={r.moderation.flagged} />
          <Stat label="Rejected" value={r.moderation.rejected} />
        </div>
      </Section>

      <Section title="Evaluation measures (By-law 11)">
        <ul className="list-disc pl-5 text-slate-700">
          <li>Participation above 5% across three successive questions: <b>{r.evaluation.sustained ? 'Yes' : 'No'}</b></li>
          <li>Delegation in use: <b>{r.evaluation.delegationUsed ? 'Yes' : 'Falling into disuse / none'}</b></li>
        </ul>
      </Section>
    </div>
  );
}