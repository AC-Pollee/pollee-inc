import { base44 } from '@/api/base44Client';

const SHARE = { infomarian: 0.3, association: 0.1, infrastructure: 0.1, gst: 0.05 };
const round = (n) => Math.round(n * 100) / 100;

// Loads data for the range and builds the transparency report (Rules cl.18, 32(4), 55; By-law 1, 5, 6, 11).
export async function buildReport(fromIso, toIso) {
  const range = { $gte: fromIso, $lte: toIso };
  const [votes, polls, delegations, comments, infomarians, measures, users] = await Promise.all([
    base44.entities.Vote.filter({ created_date: range }, { sort: '-created_date', limit: 2000 }),
    base44.entities.Poll.list('-created_date', 500),
    base44.entities.Delegation.filter({ created_date: range }, { limit: 1000 }),
    base44.entities.Comment.filter({ created_date: range }, { limit: 2000 }),
    base44.entities.Infomarian.list('-created_date', 500),
    base44.entities.Measure.filter({ created_date: range }, { limit: 1000 }),
    base44.entities.User.list('-created_date', 1000),
  ]);
  const voteItems = votes.items || votes;
  const pollItems = polls.items || polls;
  const delItems = delegations.items || delegations;
  const comItems = comments.items || comments;
  const infItems = infomarians.items || infomarians;
  const meaItems = measures.items || measures;
  const eligible = (users.items || users).length;

  // Only the member's last formal vote per poll is counted (cl.14(4))
  const latest = new Map();
  voteItems.filter(v => v.status !== 'rejected').forEach(v => {
    const key = `${v.poll_id}|${v.voter_id || v.created_by_id || v.id}`;
    const prev = latest.get(key);
    const t = new Date(v.transaction_date || v.created_date).getTime();
    if (!prev || t > prev.t) latest.set(key, { v, t });
  });
  const formal = [...latest.values()].map(x => x.v);

  const pollRows = pollItems.map(p => {
    const pv = formal.filter(v => v.poll_id === p.id);
    const count = (acc) => pv.filter(v => v.account_binding === acc).reduce((s, v) => s + (v.delegated_votes_count || 1), 0);
    const yes = count('yes'), no = count('no'), rts = count('rts');
    const total = yes + no + rts;
    const delegated = pv.filter(v => v.delegation_status === 'delegated').reduce((s, v) => s + (v.delegated_votes_count || 1), 0);
    const informal = voteItems.filter(v => v.poll_id === p.id && v.status === 'rejected').length;
    const changes = voteItems.filter(v => v.poll_id === p.id && v.is_vote_change).length;
    const carried = total > 0 && yes > total / 2;
    const outcome = total === 0 ? '-' : carried ? 'Carried' : rts > no ? 'Returned to proposer' : 'Defeated';
    return { id: p.id, title: p.title, level: p.poll_level, status: p.status, yes, no, rts, total, delegated, informal, changes,
      participation: eligible ? round((total / eligible) * 100) : 0, outcome };
  }).filter(r => r.total > 0 || r.informal > 0);

  const totalVotes = pollRows.reduce((s, r) => s + r.total, 0);
  const money = {
    contributions: round(totalVotes * 0.55),
    infomarian: round(totalVotes * SHARE.infomarian),
    association: round(totalVotes * SHARE.association),
    infrastructure: round(totalVotes * SHARE.infrastructure),
    gst: round(totalVotes * SHARE.gst),
    gratuities: round(formal.reduce((s, v) => s + (v.tip_amount || 0), 0)),
  };

  const infoRows = infItems.map(i => {
    const iv = formal.filter(v => v.infomarian_id === i.infomarian_id);
    const hosted = pollItems.filter(p => (p.assigned_infomarians || []).includes(i.infomarian_id) || (p.assigned_infomarians || []).includes(i.id)).length;
    const gratuity = iv.reduce((s, v) => s + (v.tip_amount || 0), 0);
    return { name: i.full_name, votes: iv.length, hosted, fees: round(iv.length * SHARE.infomarian), gratuity: round(gratuity) };
  }).filter(r => r.votes > 0 || r.hosted > 0);

  const pathCount = (p) => meaItems.filter(m => m.path === p).length;
  const sortedByDate = [...pollRows].sort((a, b) => a.total - b.total);
  const sustained = pollRows.length >= 3 && pollRows.slice(-3).every(r => r.participation > 5);

  return {
    eligible, pollRows, money, infoRows, totalVotes, sortedByDate,
    delegation: {
      created: delItems.length,
      verified: delItems.filter(d => d.status === 'verified').length,
      revoked: delItems.filter(d => d.status === 'revoked').length,
      votesViaDelegation: pollRows.reduce((s, r) => s + r.delegated, 0),
    },
    paths: { constituent: pathCount('constituent'), institutional: pathCount('institutional') },
    moderation: {
      comments: comItems.length,
      approved: comItems.filter(c => c.moderation_status === 'approved').length,
      pending: comItems.filter(c => c.moderation_status === 'pending').length,
      flagged: comItems.filter(c => c.moderation_status === 'flagged').length,
      rejected: comItems.filter(c => c.moderation_status === 'rejected').length,
    },
    evaluation: { sustained, delegationUsed: delItems.length > 0 },
  };
}

export function reportToCsv(r, fromIso, toIso) {
  const rows = [
    ['Pollee transparency report', fromIso, toIso],
    [],
    ['Participation record'],
    ['Poll', 'Level', 'Eligible', 'Formal votes', 'Participation %', 'Yes', 'No', 'Return to Sender', 'Informal', 'Via delegation', 'Vote changes', 'Outcome'],
    ...r.pollRows.map(p => [p.title, p.level, r.eligible, p.total, p.participation, p.yes, p.no, p.rts, p.informal, p.delegated, p.changes, p.outcome]),
    [],
    ['Voting contributions (AUD)', r.money.contributions],
    ['Infomarian share', r.money.infomarian], ['Association share', r.money.association],
    ['Infrastructure share', r.money.infrastructure], ['GST', r.money.gst], ['Gratuities', r.money.gratuities],
    [],
    ['Infomarian', 'Polls hosted', 'Votes facilitated', 'Fees', 'Gratuities'],
    ...r.infoRows.map(i => [i.name, i.hosted, i.votes, i.fees, i.gratuity]),
    [],
    ['Delegations created', r.delegation.created], ['Verified', r.delegation.verified], ['Revoked', r.delegation.revoked],
    ['Questions - constituent path', r.paths.constituent], ['Questions - institutional path', r.paths.institutional],
    ['Comments', r.moderation.comments], ['Flagged', r.moderation.flagged], ['Rejected', r.moderation.rejected],
  ];
  return rows.map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}