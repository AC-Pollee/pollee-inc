import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const APP_URL = 'https://pollee-app.base44.app';

const levelStyles = {
  local: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  state: 'bg-blue-50 text-blue-700 border-blue-100',
  federal: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default function ReadOnlyPollCard({ poll }) {
  const level = poll.poll_level || 'local';
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${levelStyles[level] || levelStyles.local}`}>
          {level}
        </span>
        {poll.end_date && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(poll.end_date), 'd MMM yyyy')}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{poll.title}</h3>
      {poll.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-3">{poll.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {(poll.options || []).map((o) => (
          <span
            key={o.id}
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
          >
            {o.label}
          </span>
        ))}
      </div>
      <a
        href={APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
      >
        Open in Pollee <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}