import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Vote, ShieldAlert, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';

const SECTIONS = [
  {
    icon: Building2,
    title: 'Constituencies',
    body: 'A Constituency is the local chapter that owns polls and Infomarians for a region. Create constituencies from the Constituencies tab, set their postcodes and state, and assign an owner who becomes its Constituency Manager.'
  },
  {
    icon: Users,
    title: 'Infomarian Management',
    body: 'Add Infomarians under the Infomarians tab by searching registered users. Their Infomarian ID is auto-generated from the Constituency + user + sequence. Set their moderation level (local, state, federal — one or more) and assigned postcodes.'
  },
  {
    icon: Vote,
    title: 'Polls',
    body: 'Create polls from the Admin panel, choosing the Constituency, level (local/state/federal), and voting options. New polls enter "pending" moderation and must be approved before they appear publicly. Polls run for 720 hours (30 days).'
  },
  {
    icon: ShieldAlert,
    title: 'Moderation Alerts',
    body: 'The Moderation item in the menu bar lists pending posts and flagged comments across your constituency. Approve, Strike Through (issues a conduct strike and -3 reputation to the author), or Remove. Strikes trigger the 3-strikes policy: 24h, then 1-week, then permanent commenting suspension.'
  },
  {
    icon: BarChart3,
    title: 'Oversight',
    body: 'The dashboard shows totals across all constituencies, infomarians, polls, and votes, plus a pending-moderation count. Use it to spot backlogs and act.'
  },
  {
    icon: DollarSign,
    title: 'Banking',
    body: 'In the Admin panel Banking tab, configure the Pollee Inc validation account and the Yes / No / Undecided vote destination accounts that vote transactions are directed to.'
  },
  {
    icon: AlertTriangle,
    title: 'Incidents',
    body: 'Users can file Incident Reports (Board, Infomarian, or User) from the Report menu. Review and resolve forwarded reports to keep the community safe.'
  }
];

export default function ConstituencyHelp() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <CardTitle className="text-2xl">Constituency Administrator Guide</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}