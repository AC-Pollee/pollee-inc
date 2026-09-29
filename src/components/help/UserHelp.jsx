import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Vote, MessageSquare, Award, Users, AlertTriangle, Flag, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function UserHelp() {
  const { t } = useTranslation();
  const SECTIONS = [
    { icon: BadgeCheck, title: t('helpUser.regValidationTitle'), body: t('helpUser.regValidationBody') },
    { icon: Vote, title: t('helpUser.votingTitle'), body: t('helpUser.votingBody') },
    { icon: MessageSquare, title: t('helpUser.discussionsTitle'), body: t('helpUser.discussionsBody') },
    { icon: Award, title: t('helpUser.reputationTitle'), body: t('helpUser.reputationBody') },
    { icon: Users, title: t('helpUser.delegationTitle'), body: t('helpUser.delegationBody') },
    { icon: AlertTriangle, title: t('helpUser.strikesTitle'), body: t('helpUser.strikesBody') },
    { icon: Flag, title: t('helpUser.reportTitle'), body: t('helpUser.reportBody') },
    { icon: User, title: t('helpUser.profileTitle'), body: t('helpUser.profileBody') },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <User className="w-6 h-6" />
          <CardTitle className="text-2xl">{t('helpUser.title')}</CardTitle>
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