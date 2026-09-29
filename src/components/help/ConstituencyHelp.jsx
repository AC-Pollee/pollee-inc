import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Vote, ShieldAlert, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ConstituencyHelp() {
  const { t } = useTranslation();
  const SECTIONS = [
    { icon: Building2, title: t('helpConstituency.constituenciesTitle'), body: t('helpConstituency.constituenciesBody') },
    { icon: Users, title: t('helpConstituency.infomarianMgmtTitle'), body: t('helpConstituency.infomarianMgmtBody') },
    { icon: Vote, title: t('helpConstituency.pollsTitle'), body: t('helpConstituency.pollsBody') },
    { icon: ShieldAlert, title: t('helpConstituency.modAlertsTitle'), body: t('helpConstituency.modAlertsBody') },
    { icon: BarChart3, title: t('helpConstituency.oversightTitle'), body: t('helpConstituency.oversightBody') },
    { icon: DollarSign, title: t('helpConstituency.bankingTitle'), body: t('helpConstituency.bankingBody') },
    { icon: AlertTriangle, title: t('helpConstituency.incidentsTitle'), body: t('helpConstituency.incidentsBody') },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <CardTitle className="text-2xl">{t('helpConstituency.title')}</CardTitle>
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