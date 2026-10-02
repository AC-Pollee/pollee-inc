import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileIcon, Download, Loader2 } from 'lucide-react';

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AttachmentLink({ attachment, mine }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!attachment?.file_uri) return;
    setLoading(true);
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: attachment.file_uri });
      if (res?.signed_url) window.open(res.signed_url, '_blank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors max-w-full ${
        mine
          ? 'bg-indigo-500/30 text-white hover:bg-indigo-500/40'
          : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : <FileIcon className="w-4 h-4 flex-shrink-0" />}
      <span className="truncate max-w-[180px]">{attachment?.name || 'Attachment'}</span>
      {attachment?.size ? <span className="text-xs opacity-70 flex-shrink-0">{fmtSize(attachment.size)}</span> : null}
      <Download className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
    </button>
  );
}