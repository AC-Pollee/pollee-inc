import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link2, Image as ImageIcon, Video, FileText, Music } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

const TYPE_ICONS = {
  url: Link2,
  image: ImageIcon,
  video: Video,
  text: FileText,
  audio: Music,
};

export default function ContentEditDialog({ item, open, onOpenChange, onSaved }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setContentType(item.content_type || 'url');
      setUrl(item.url || item.file_uri || '');
      setText(item.text_content || '');
      setTags((item.tags || []).join(', '));
    }
  }, [item]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setUrl(file_uri);
      toast({ title: t('contentLibrary.uploaded') });
    } catch {
      toast({ title: t('contentLibrary.uploadFailed'), variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSaved({
      id: item.id,
      data: {
        title: title.trim(),
        description: description.trim(),
        content_type: contentType,
        url: contentType === 'url' ? url.trim() : (['image', 'video', 'audio'].includes(contentType) ? url : undefined),
        file_uri: ['image', 'video', 'audio'].includes(contentType) ? url : undefined,
        text_content: contentType === 'text' ? text.trim() : undefined,
        tags: tags ? tags.split(',').map(tg => tg.trim()).filter(Boolean) : [],
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('contentLibrary.editItem')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('contentLibrary.contentType')}</Label>
            <div className="grid grid-cols-5 gap-2 mt-1">
              {['url', 'image', 'video', 'text', 'audio'].map(type => {
                const Icon = TYPE_ICONS[type];
                return (
                  <Button key={type} type="button" variant={contentType === type ? 'default' : 'outline'}
                    size="sm" onClick={() => { setContentType(type); setUrl(''); }}
                    className={`flex flex-col items-center gap-1 h-auto py-2 ${contentType === type ? 'bg-indigo-600 text-white' : ''}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs capitalize">{type}</span>
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>{t('contentLibrary.title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('contentLibrary.titlePlaceholder')} />
          </div>
          <div>
            <Label>{t('contentLibrary.description')}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('contentLibrary.descriptionPlaceholder')} />
          </div>
          {contentType === 'url' && (
            <div>
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          {['image', 'video', 'audio'].includes(contentType) && (
            <div>
              <Label>{t('contentLibrary.uploadFile')}</Label>
              <Input type="file" accept={contentType === 'image' ? 'image/*' : contentType === 'video' ? 'video/*' : 'audio/*'} onChange={handleFile} disabled={uploading} />
              {uploading && <p className="text-xs text-slate-500 mt-1">{t('contentLibrary.uploading')}</p>}
              {url && <p className="text-xs text-green-600 mt-1">{t('contentLibrary.uploaded')}</p>}
            </div>
          )}
          {contentType === 'text' && (
            <div>
              <Label>{t('contentLibrary.textContent')}</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('contentLibrary.textPlaceholder')} className="min-h-[100px]" />
            </div>
          )}
          <div>
            <Label>{t('contentLibrary.tags')}</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('contentLibrary.tagsPlaceholder')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('contentLibrary.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || uploading} className="bg-indigo-600 hover:bg-indigo-700">
            {t('contentLibrary.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}