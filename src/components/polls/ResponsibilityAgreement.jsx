import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ResponsibilityAgreement({ accepted, onChange, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
        <Checkbox
          id="resp-compact"
          checked={accepted}
          onCheckedChange={onChange}
          className="mt-0.5"
        />
        <label htmlFor="resp-compact" className="text-xs text-amber-800 cursor-pointer leading-snug">
          I take responsibility for my commentary
        </label>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-2 transition-colors ${
      accepted ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          accepted ? 'bg-emerald-100' : 'bg-amber-100'
        }`}>
          {accepted ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="responsibility-agreement"
              checked={accepted}
              onCheckedChange={onChange}
            />
            <label htmlFor="responsibility-agreement" className="text-sm font-medium text-slate-800 cursor-pointer leading-snug">
              I take responsibility for my commentary on this post and agree to abide by the{' '}
              <a
                href="https://pollee.net/code-of-conduct"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
              >
                Code of Conduct
              </a>
            </label>
          </div>
          {!accepted && (
            <p className="text-xs text-amber-700 pl-7">
              You must accept responsibility before posting or replying.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}