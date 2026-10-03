import React, { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

const APP_URL = "https://pollee-app.base44.app";

const EMBED_CODE = `<div style="max-width:800px;margin:0 auto;">
  <iframe src="${APP_URL}/" title="Pollee — live home page" loading="lazy" style="width:100%;height:640px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;"></iframe>
  <p style="text-align:center;margin-top:10px;">
    <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;font-weight:600;text-decoration:none;">Open Pollee &#8594;</a>
  </p>
</div>`;

export default function EmbedCode() {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(EMBED_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pollee Embed Code</h1>
          <p className="text-slate-600">
            A live snapshot of the Pollee home page that links visitors to the app. Paste it into a Squarespace Code Block.
          </p>
        </header>

        {/* Live preview */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Live Preview</h2>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <iframe
                src={`${APP_URL}/`}
                title="Pollee — live home page"
                loading="lazy"
                className="w-full"
                style={{ height: 640, background: "#ffffff" }}
              />
            </div>
            <p className="text-center text-sm text-slate-500 mt-3 flex items-center justify-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">
                Open Pollee
              </a>
            </p>
          </div>
        </section>

        {/* Embed code */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Embed Code</h2>
            <Button size="sm" onClick={copyCode} className="bg-indigo-600 hover:bg-indigo-700">
              {copied ? <><Check className="w-4 h-4 mr-1" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
            </Button>
          </div>
          <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed border border-slate-200">
            <code>{EMBED_CODE}</code>
          </pre>
        </section>

        {/* Instructions */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-900 mb-3">How to add it in Squarespace</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-700 text-sm leading-relaxed">
            <li>Edit the page where you want the Pollee preview to appear.</li>
            <li>Add a new block and choose <strong>Code</strong>.</li>
            <li>Copy the embed code above and paste it into the code field.</li>
            <li>Ensure <strong>Display Source</strong> is on, then save / preview the page.</li>
          </ol>
          <p className="text-xs text-slate-500 mt-4">
            The preview is a live iframe of the Pollee home page. Visitors who aren't signed in will see the login screen inside the frame; signed-in members see the home page directly. The "Open Pollee" link opens the full app in a new tab.
          </p>
        </section>
      </div>
    </div>
  );
}