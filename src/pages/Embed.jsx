import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';
import { Shield, Vote, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ReadOnlyPollCard from '@/components/polls/ReadOnlyPollCard';

const APP_URL = 'https://pollee-app.base44.app';

export default function Embed() {
  const { t } = useTranslation();
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['publicPolls'],
    queryFn: () => base44.entities.Poll.list('-created_date'),
    retry: false,
  });

  const activePolls = polls.filter(
    (p) => p.status === 'active' && (p.moderation_status === 'approved' || !p.moderation_status)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://media.base44.com/images/public/69415ee66a530550d1e35558/2b39b1f81_generated_image.png"
              alt="Pollee"
              className="h-8 w-auto rounded-full"
            />
            <span className="font-bold text-slate-900">Pollee</span>
          </div>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Open Pollee <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">{t('home.verifiedBadge')}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {t('home.title1')}
            <span className="block mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent text-2xl md:text-4xl">
              {t('home.title2')}
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">{t('home.subtitle')}</p>
        </div>
      </div>

      {/* Active polls */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('home.activePolls')}</h2>
            <p className="text-slate-500 mt-1">{t('home.activePollsSub')}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100">
            <Vote className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              {t('home.activeCount', { count: activePolls.length })}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : activePolls.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Vote className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('home.noPolls')}</h3>
            <p className="text-slate-500">{t('home.noPollsSub')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePolls.map((poll) => (
              <ReadOnlyPollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </div>

      {/* CTA footer */}
      <div className="max-w-6xl mx-auto px-4 pb-16 text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('home.howWorks')}</h3>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto">{t('home.premises')}</p>
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            {t('home.createPoll')} <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}