import React, { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";

const IMAGE_URL = "https://media.base44.com/images/public/69415ee66a530550d1e35558/1ea380e0a_generated_image.png";
const APP_URL = "https://pollee-app.base44.app";

const EMBED_CODE = `<a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:100%;text-decoration:none;">
  <img src="${IMAGE_URL}" alt="Pollee — democratic participation" style="display:block;width:100%;max-width:800px;height:auto;border:1px solid #e2e8f0;border-radius:12px;" />
</a>`;

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
            A static preview of the Pollee front page that links visitors to the live app. Paste it into a Squarespace Code Block.
          </p>
        </header>

        {/* Live preview */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Preview</h2>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={IMAGE_URL}
                alt="Pollee — democratic participation"
                className="w-full h-auto rounded-xl border border-slate-200"
              />
            </a>
            <p className="text-center text-sm text-slate-500 mt-3 flex items-center justify-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" />
              Clicking the image opens the Pollee app
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
            The preview is a static image captured at the time it was generated; it does not update automatically when the app changes.
          </p>
        </section>
      </div>
    </div>
  );
}