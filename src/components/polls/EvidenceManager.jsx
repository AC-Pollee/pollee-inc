import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Link2, Library, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

export default function EvidenceManager({ pollId, infomarian }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('library'); // 'library' or 'url'
  const [selectedItem, setSelectedItem] = useState(null);
  const [urlTitle, setUrlTitle] = useState('');
  const [url, setUrl] = useState('');
  const [urlDesc, setUrlDesc] = useState('');
  const [note, setNote] = useState('');

  const { data: libraryItems = [] } = useQuery({
    queryKey: ['content-library', infomarian?.infomarian_id],
    queryFn: () => base44.entities.ContentLibraryItem.filter({
      infomarian_id: infomarian.infomarian_id,
      moderation_status: 'approved'
    }, '-created_date'),
    enabled: !!infomarian?.infomarian_id && open
  });

  const attachEvidence = useMutation({
    mutationFn: (data) => base44.entities.DiscussionEvidence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['discussion-evidence', pollId]);
      setOpen(false);
      reset();
      toast({ title: t('evidence.attached') });
    }
  });

  const reset = () => {
    setMode('library'); setSelectedItem(null); setUrlTitle(''); setUrl(''); setUrlDesc(''); setNote('');
  };

  const handleAttach = () => {
    if (mode === 'library' && selectedItem) {
      attachEvidence.mutate({
        poll_id: pollId,
        title: selectedItem.title,
        description: selectedItem.description,
        content_type: selectedItem.content_type,
        url: selectedItem.url,
        file_uri: selectedItem.file_uri,
        text_content: selectedItem.text_content,
        content_item_id: selectedItem.id,
        infomarian_id: infomarian.infomarian_id,
        infomarian_name: infomarian.full_name,
        display_note: note.trim() || undefined
      });
    } else if (mode === 'url' && url.trim() && urlTitle.trim()) {
      attachEvidence.mutate({
        poll_id: pollId,
        title: urlTitle.trim(),
        description: urlDesc.trim() || undefined,
        content_type: 'url',
        url: url.trim(),
        infomarian_id: infomarian.infomarian_id,
        infomarian_name: infomarian.full_name,
        display_note: note.trim() || undefined
      });
    }
  };

  const canAttach = (mode === 'library' && !!selectedItem) || (mode === 'url' && url.trim() && urlTitle.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
          <BookOpen className="w-4 h-4 mr-2" />
          {t('evidence.addEvidence')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            {t('evidence.addEvidence')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setMode('library')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'library' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
          >
            <Library className="w-4 h-4" />
            {t('evidence.fromLibrary')}
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'url' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
          >
            <Link2 className="w-4 h-4" />
            {t('evidence.pasteUrl')}
          </button>
        </div>

        {mode === 'library' ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {libraryItems.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">{t('evidence.libraryEmpty')}</p>
            ) : (
              libraryItems.map(item => (
                <div key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 capitalize">{item.content_type}</p>
                    </div>
                    {selectedItem?.id === item.id && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>{t('evidence.title')}</Label>
              <Input value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} placeholder={t('evidence.titlePlaceholder')} />
            </div>
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>{t('evidence.description')}</Label>
              <Input value={urlDesc} onChange={(e) => setUrlDesc(e.target.value)} placeholder={t('evidence.descriptionPlaceholder')} />
            </div>
          </div>
        )}

        <div>
          <Label>{t('evidence.displayNote')}</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={t('evidence.displayNotePlaceholder')}
            className="min-h-[60px] text-sm" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('evidence.cancel')}</Button>
          <Button onClick={handleAttach} disabled={!canAttach || attachEvidence.isPending}
            className="bg-indigo-600 hover:bg-indigo-700">
            {t('evidence.attach')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}