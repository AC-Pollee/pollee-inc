import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MessageSquare, AlertTriangle, DollarSign, Award, Users, Ban } from 'lucide-react';

const SECTIONS = [
  {
    icon: Shield,
    title: 'Your Role',
    body: 'Infomarians are paid professionals who guide poll discussions, keep conversations civil, and help users. You earn from each verified vote on polls you moderate and from user tips.'
  },
  {
    icon: MessageSquare,
    title: 'Moderation Queue & Poll Review',
    body: 'The Queue and Poll Review tabs list comments and polls awaiting action. Approve content to publish it, or use Strike Through to moderate it. The Moderation item in the menu bar (Moderation Alerts) gives the same controls across all your assigned polls.'
  },
  {
    icon: AlertTriangle,
    title: 'The 3-Strikes Policy',
    body: 'When you Strike Through a comment, the author receives a conduct strike and loses 3 reputation. Penalties escalate: 1st strike = 24-hour commenting suspension, 2nd strike = 1-week commenting suspension, 3rd strike = commenting rights suspended (voting rights are never affected). The user is emailed the reason, the consequence, and how to appeal.'
  },
  {
    icon: Ban,
    title: 'Striking vs Removing',
    body: 'Strike Through keeps the comment visible with a line through it and issues a strike. Remove deletes the comment entirely with no strike. Use Remove for spam/illegal content; use Strike Through for conduct violations that should be on the public record.'
  },
  {
    icon: Users,
    title: 'User Support & Tasks',
    body: 'The Support tab lets you message users and walk them through validation, voting, and delegation. Tasks let you assign work to other Infomarians (moderation, support, content).'
  },
  {
    icon: DollarSign,
    title: 'Earnings',
    body: 'You receive $0.30 AUD from each $0.55 vote on your polls, plus any tip the voter adds. Track totals in the Earnings tab.'
  },
  {
    icon: Award,
    title: 'Reputation',
    body: 'Your own reputation grows with approved comments, votes, and delegations, and drops with strikes. Higher reputation unlocks priority visibility and leadership eligibility.'
  }
];

export default function InfomarianHelp() {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <CardTitle className="text-2xl">Infomarian Guide</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
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