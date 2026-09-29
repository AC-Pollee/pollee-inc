import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MessageSquare, AlertTriangle, DollarSign, Award, Users, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function InfomarianHelp() {
  const { t } = useTranslation();
  const SECTIONS = [
    { icon: Shield, title: t('helpInfomarian.roleTitle'), body: t('helpInfomarian.roleBody') },
    { icon: MessageSquare, title: t('helpInfomarian.queueTitle'), body: t('helpInfomarian.queueBody') },
    { icon: AlertTriangle, title: t('helpInfomarian.strikesTitle'), body: t('helpInfomarian.strikesBody') },
    { icon: Ban, title: t('helpInfomarian.strikeVsRemoveTitle'), body: t('helpInfomarian.strikeVsRemoveBody') },
    { icon: Users, title: t('helpInfomarian.userSupportTitle'), body: t('helpInfomarian.userSupportBody') },
    { icon: DollarSign, title: t('helpInfomarian.earningsTitle'), body: t('helpInfomarian.earningsBody') },
    { icon: Award, title: t('helpInfomarian.reputationTitle'), body: t('helpInfomarian.reputationBody') },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <CardTitle className="text-2xl">{t('helpInfomarian.title')}</CardTitle>
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