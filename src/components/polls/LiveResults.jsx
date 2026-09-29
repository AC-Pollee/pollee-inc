import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import ResultsChart from './ResultsChart';
import { useTranslation } from 'react-i18next';

export default function LiveResults({ pollId, poll, isPollClosed }) {
  const { t } = useTranslation();
  const { data: votes = [] } = useQuery({
    queryKey: ['votes', pollId],
    queryFn: () => base44.entities.Vote.filter({ poll_id: pollId }),
    enabled: !!pollId,
    refetchInterval: isPollClosed ? false : 5000
  });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          {isPollClosed ? t('liveResults.finalResults') : t('liveResults.liveResults')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResultsChart poll={poll} votes={votes} />
      </CardContent>
    </Card>
  );
}