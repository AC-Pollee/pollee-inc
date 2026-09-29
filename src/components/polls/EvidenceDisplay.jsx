import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, Image as ImageIcon, Video, FileText, Music, Trash2, BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TYPE_ICONS = {
  url: Link2,
  image: ImageIcon,
  video: Video,
  text: FileText,
  audio: Music,
};

function EvidenceCard({ evidence, canRemove, onRemove }) {
  const { t } = useTranslation();
  const Icon = TYPE_ICONS[evidence.content_type] || FileText;

  const { data: signedUrl } = useQuery({
    queryKey: ['signed-url', evidence.file_uri],
    queryFn: async () => {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: evidence.file_uri });
      return res.signed_url;
    },
    enabled: !!evidence.file_uri && (evidence.content_type === 'image' || evidence.content_type === 'video' || evidence.content_type === 'audio'),
  });

  return (
    <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{evidence.title}</p>
            <Badge variant="secondary" className="text-xs capitalize mt-0.5">{evidence.content_type}</Badge>
          </div>
        </div>
        {canRemove && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50 flex-shrink-0"
            onClick={() => { if (confirm(t('evidence.confirmRemove'))) onRemove(evidence.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {evidence.description && <p className="text-xs text-slate-600 mb-2">{evidence.description}</p>}

      {evidence.content_type === 'url' && evidence.url && (
        <a href={evidence.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline">
          <ExternalLink className="w-3 h-3" />
          {evidence.url}
        </a>
      )}

      {evidence.content_type === 'image' && signedUrl && (
        <img src={signedUrl} alt={evidence.title} className="rounded-lg max-h-64 w-auto mt-2" />
      )}

      {evidence.content_type === 'video' && signedUrl && (
        <video src={signedUrl} controls className="rounded-lg w-full max-h-64 mt-2" />
      )}

      {evidence.content_type === 'audio' && signedUrl && (
        <audio src={signedUrl} controls className="w-full mt-2" />
      )}

      {evidence.content_type === 'text' && evidence.text_content && (
        <p className="text-xs text-slate-700 whitespace-pre-wrap mt-2 p-2 bg-slate-50 rounded">{evidence.text_content}</p>
      )}

      {evidence.display_note && (
        <div className="mt-2 p-2 bg-indigo-50 rounded text-xs text-indigo-800">
          <span className="font-semibold">{t('evidence.note')}: </span>{evidence.display_note}
        </div>
      )}

      {evidence.infomarian_name && (
        <p className="text-xs text-slate-400 mt-2">{t('evidence.attachedBy')}: {evidence.infomarian_name}</p>
      )}
    </div>
  );
}

export default function EvidenceDisplay({ pollId, canManage }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: evidence = [] } = useQuery({
    queryKey: ['discussion-evidence', pollId],
    queryFn: () => base44.entities.DiscussionEvidence.filter({ poll_id: pollId }, '-created_date'),
    enabled: !!pollId
  });

  const removeEvidence = useMutation({
    mutationFn: (id) => base44.entities.DiscussionEvidence.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['discussion-evidence', pollId])
  });

  if (evidence.length === 0) return null;

  return (
    <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-900">{t('evidence.supportingEvidence')}</h3>
        <Badge className="bg-indigo-200 text-indigo-800 text-xs">{evidence.length}</Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {evidence.map(ev => (
          <EvidenceCard key={ev.id} evidence={ev} canRemove={canManage} onRemove={removeEvidence.mutate} />
        ))}
      </div>
    </div>
  );
}