import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, MapPin, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ConstituencyFilter({ selected, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list()
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange(franchises.map((f) => f.id));

  const selectedNames = franchises
    .filter((f) => selected.includes(f.id))
    .map((f) => f.franchise_name);

  const summary =
    selected.length === 0
      ? t('home.filterAllConstituencies', { defaultValue: 'All constituencies' })
      : selected.length === 1
      ? selectedNames[0]
      : t('home.filterCount', { count: selected.length, defaultValue: `${selected.length} constituencies` });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-sm font-medium text-slate-700 min-w-[200px]"
      >
        <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="truncate flex-1 text-left">{summary}</span>
        {selected.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            className="ml-1 p-0.5 rounded hover:bg-slate-200"
            title={t('home.filterClear', { defaultValue: 'Clear' })}
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              {t('home.filterByConstituency', { defaultValue: 'Filter by constituency' })}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                {t('home.filterSelectAll', { defaultValue: 'All' })}
              </button>
              <span className="text-slate-300">|</span>
              <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                {t('home.filterClear', { defaultValue: 'Clear' })}
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : franchises.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">
                {t('home.filterNoConstituencies', { defaultValue: 'No constituencies found' })}
              </div>
            ) : (
              franchises.map((f) => {
                const checked = selected.includes(f.id);
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm transition-colors ${
                      checked ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                      checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="flex-1 truncate">{f.franchise_name}</span>
                    {f.state && (
                      <span className="text-xs text-slate-400 shrink-0">{f.state}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}