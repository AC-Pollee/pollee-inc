import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Vote, MessageSquare, Award, Users, AlertTriangle, Flag, BadgeCheck } from 'lucide-react';

const SECTIONS = [
  {
    icon: BadgeCheck,
    title: 'Registration & Validation',
    body: 'Complete your profile (name, date of birth, Infomarian ID, bank details). To vote, make a $0.55 AUD deposit to the Pollee Inc account, then enter the small random amount we send back to your bank to validate. You\'ll then receive your Voter ID.'
  },
  {
    icon: Vote,
    title: 'Voting',
    body: 'Each vote is a $0.55 AUD bank transaction directed to the Yes, No, or Undecided account for that poll. You can vote at any time while a poll is open (30 days) and change your vote at any time — only your latest vote counts. Junior members (12–17) can participate in discussions and sentiment polls but their vote isn\'t counted in the deciding total.'
  },
  {
    icon: MessageSquare,
    title: 'Discussions & Commenting',
    body: 'Every poll has a discussion board. You must accept the responsibility agreement before posting. Comments are published immediately; Infomarians moderate to keep things civil. You can edit or delete your own comments, and reply in threads.'
  },
  {
    icon: Award,
    title: 'Reputation & Claps',
    body: 'Reputation grows from verified votes, approved comments, and delegations. Other users can "Clap" your comments, giving you +3 reputation each. Higher reputation unlocks participation, delegation, and leadership benefits.'
  },
  {
    icon: Users,
    title: 'Delegation',
    body: 'Adults (18+) can delegate their vote to another trusted member, either for all polls or a specific poll. Delegated votes carry the combined weight of everyone who delegated to you.'
  },
  {
    icon: AlertTriangle,
    title: 'The 3-Strikes Policy',
    body: 'If a moderator strikes through your comment, you receive a strike and lose 3 reputation. 1st strike = 24-hour commenting suspension, 2nd = 1-week suspension, 3rd = commenting rights suspended. Your voting rights are never affected. You\'re emailed the reason and consequence, and you can appeal from the Report menu.'
  },
  {
    icon: Flag,
    title: 'Report an Incident',
    body: 'Use the Report menu item to file an incident report to the Board, an Infomarian, or a specific user. Describe what happened and set a priority; it\'s routed to the right people for review.'
  },
  {
    icon: User,
    title: 'Your Profile',
    body: 'Manage your name, date of birth, Infomarian ID, phone, bank details, and a 350-character biography (no external links). Your profile shows your reputation, delegations, vote history, and any conduct strikes.'
  }
];

export default function UserHelp() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6" />
          <CardTitle className="text-2xl">User Guide</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-blue-600" />
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