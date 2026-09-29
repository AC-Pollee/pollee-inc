import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Link2, Image as ImageIcon, Video, FileText, Music, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

const TYPE_ICONS = { url: Link2, image: ImageIcon, video: Video, text: FileText, audio: Music };

export default function MemberForwardContent({ poll, currentUser }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Get assigned infomarians for this poll
  const { data: infomarians = [] } = useQuery({
    queryKey: ['poll-infomarians', poll?.assigned_infomarians],
    queryFn: async () => {
      if (!poll?.assigned_infomarians?.length) return [];
      const all = await base44.entities.Infomarian.list();
      return all.filter(i => poll.assigned_infomarians.includes(i.infomarian_id));
    },
    enabled: !!poll?.assigned_infomarians?.length && open
  });

  const forward = useMutation({
    mutationFn: (data) => base44.entities.ContentLibraryItem.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-library']);
      setOpen(false);
      reset();
      toast({ title: t('forwardContent.success') });
    },
    onError: () => {
      toast({ title: t('forwardContent.failed'), variant: 'destructive' });
    }
  });

  const reset = () => {
    setTitle(''); setDescription(''); setContentType('url'); setUrl(''); setText('');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setUrl(res.file_uri);
      if (!title) setTitle(file.name);
      toast({ title: t('forwardContent.uploaded') });
    } catch {
      toast({ title: t('forwardContent.uploadFailed'), variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (infomarians.length === 0) {
      toast({ title: t('forwardContent.noInfomarian'), variant: 'destructive' });
      return;
    }

    const baseData = {
      title: title.trim(),
      description: description.trim(),
      content_type: contentType,
      url: contentType === 'url' ? url.trim() : (['image', 'video', 'audio'].includes(contentType) ? url : undefined),
      file_uri: ['image', 'video', 'audio'].includes(contentType) ? url : undefined,
      text_content: contentType === 'text' ? text.trim() : undefined,
      tags: [],
      source: 'member_forward',
      forwarded_by_name: currentUser?.full_name || currentUser?.email,
      forwarded_by_email: currentUser?.email,
      forwarded_poll_id: poll?.id,
      moderation_status: 'pending'
    };

    // Create one item per assigned infomarian
    const items = infomarians.map(inf => ({
      ...baseData,
      infomarian_id: inf.infomarian_id,
      infomarian_name: inf.full_name
    }));

    forward.mutate(items);
  };

  const canSubmit = title.trim() && !uploading && (
    contentType === 'text' ? text.trim() :
    contentType === 'url' ? url.trim() :
    !!url
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {t('forwardContent.forward')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('forwardContent.title')}</DialogTitle>
        </DialogHeader>

        {infomarians.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">{t('forwardContent.noInfomarianAssigned')}</p>
        ) : (
          <p className="text-xs text-slate-500">
            {t('forwardContent.forwardTo')}: {infomarians.map(i => i.full_name).join(', ')}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <Label>{t('forwardContent.contentType')}</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {['url', 'image', 'video', 'text', 'audio'].map(type => {
                const Icon = TYPE_ICONS[type];
                return (
                  <Button key={type} type="button" variant={contentType === type ? 'default' : 'outline'}
                    size="sm" onClick={() => { setContentType(type); setUrl(''); }}
                    className={`flex flex-col items-center gap-1 h-auto py-2 ${contentType === type ? 'bg-blue-600 text-white' : ''}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs capitalize">{type}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>{t('forwardContent.title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('forwardContent.titlePlaceholder')} />
          </div>
          <div>
            <Label>{t('forwardContent.description')}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('forwardContent.descriptionPlaceholder')} />
          </div>

          {contentType === 'url' && (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          {['image', 'video', 'audio'].includes(contentType) && (
            <div>
              <Label>{t('forwardContent.uploadFile')}</Label>
              <Input type="file" accept={contentType === 'image' ? 'image/*' : contentType === 'video' ? 'video/*' : 'audio/*'}
                onChange={handleFile} disabled={uploading} />
              {uploading && <p className="text-xs text-slate-500 mt-1">{t('forwardContent.uploading')}</p>}
              {url && !uploading && <p className="text-xs text-green-600 mt-1">{t('forwardContent.uploaded')}</p>}
            </div>
          )}
          {contentType === 'text' && (
            <div>
              <Label>{t('forwardContent.textContent')}</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('forwardContent.textPlaceholder')} className="min-h-[100px]" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('forwardContent.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || forward.isPending}
            className="bg-blue-600 hover:bg-blue-700">
            {t('forwardContent.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}