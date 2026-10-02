import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Library, Plus, Link2, Image as ImageIcon, Video, FileText, Music, FileType, Trash2, Check, X, Search, Inbox, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import ContentEditDialog from './ContentEditDialog';

const TYPE_ICONS = {
  url: Link2,
  image: ImageIcon,
  video: Video,
  text: FileText,
  audio: Music,
  pdf: FileType,
};

export default function ContentLibraryPanel({ infomarian }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data: items = [] } = useQuery({
    queryKey: ['content-library', infomarian?.infomarian_id],
    queryFn: () => base44.entities.ContentLibraryItem.filter({ infomarian_id: infomarian.infomarian_id }, '-created_date'),
    enabled: !!infomarian?.infomarian_id
  });

  const createItem = useMutation({
    mutationFn: (data) => base44.entities.ContentLibraryItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-library', infomarian?.infomarian_id]);
      queryClient.invalidateQueries(['forwarded-content', infomarian?.infomarian_id]);
      setShowAdd(false);
      toast({ title: t('contentLibrary.added') });
    }
  });

  const deleteItem = useMutation({
    mutationFn: (id) => base44.entities.ContentLibraryItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-library', infomarian?.infomarian_id]);
      queryClient.invalidateQueries(['forwarded-content', infomarian?.infomarian_id]);
    }
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContentLibraryItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-library', infomarian?.infomarian_id]);
      queryClient.invalidateQueries(['forwarded-content', infomarian?.infomarian_id]);
      setEditingItem(null);
      toast({ title: t('contentLibrary.updated') });
    }
  });

  const moderateForwarded = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ContentLibraryItem.update(id, { moderation_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['content-library', infomarian?.infomarian_id]);
      queryClient.invalidateQueries(['forwarded-content', infomarian?.infomarian_id]);
    }
  });

  const libraryItems = items.filter(i => i.source !== 'member_forward' || i.moderation_status === 'approved');
  const forwardedItems = items.filter(i => i.source === 'member_forward' && i.moderation_status === 'pending');

  const filtered = libraryItems.filter(item => {
    if (filter !== 'all' && item.content_type !== filter) return false;
    if (search && !item.title?.toLowerCase().includes(search.toLowerCase()) &&
        !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-600" />
            {t('contentLibrary.title')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">{t('contentLibrary.subtitle')}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('contentLibrary.addItem')}
        </Button>
      </div>

      {forwardedItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Inbox className="w-4 h-4" />
              {t('contentLibrary.forwardedPending')} ({forwardedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {forwardedItems.map(item => {
              const Icon = TYPE_ICONS[item.content_type] || FileText;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                  <Icon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('contentLibrary.forwardedBy')}: {item.forwarded_by_name || item.forwarded_by_email}
                    </p>
                    {item.description && <p className="text-xs text-slate-600 mt-1">{item.description}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50"
                      onClick={() => moderateForwarded.mutate({ id: item.id, status: 'approved' })}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => moderateForwarded.mutate({ id: item.id, status: 'rejected' })}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder={t('contentLibrary.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">{t('contentLibrary.all')}</TabsTrigger>
            <TabsTrigger value="url"><Link2 className="w-3 h-3 mr-1" />URL</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="w-3 h-3 mr-1" />{t('contentLibrary.image')}</TabsTrigger>
            <TabsTrigger value="video"><Video className="w-3 h-3 mr-1" />{t('contentLibrary.video')}</TabsTrigger>
            <TabsTrigger value="text"><FileText className="w-3 h-3 mr-1" />{t('contentLibrary.text')}</TabsTrigger>
            <TabsTrigger value="audio"><Music className="w-3 h-3 mr-1" />{t('contentLibrary.audio')}</TabsTrigger>
            <TabsTrigger value="pdf"><FileType className="w-3 h-3 mr-1" />PDF</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Library className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{t('contentLibrary.empty')}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const Icon = TYPE_ICONS[item.content_type] || FileText;
            return (
              <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-indigo-500" />
                      <Badge variant="secondary" className="text-xs capitalize">{item.content_type}</Badge>
                    </div>
                    <div className="flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-500 hover:bg-indigo-50"
                        onClick={() => setEditingItem(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => { if (confirm(t('contentLibrary.confirmDelete'))) deleteItem.mutate(item.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 mb-1">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate block mt-1">{item.url}</a>}
                  {item.text_content && <p className="text-xs text-slate-600 line-clamp-3 mt-1 whitespace-pre-wrap">{item.text_content}</p>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddItemDialog open={showAdd} onOpenChange={setShowAdd} infomarian={infomarian} onCreate={createItem.mutate} />
      <ContentEditDialog item={editingItem} open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)} onSaved={updateItem.mutate} />
    </div>
  );
}

function AddItemDialog({ open, onOpenChange, infomarian, onCreate }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setContentType('url'); setUrl(''); setText(''); setTags('');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setUrl(file_uri);
      if (!title) setTitle(file.name);
      toast({ title: t('contentLibrary.uploaded') });
    } catch {
      toast({ title: t('contentLibrary.uploadFailed'), variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim(),
      content_type: contentType,
      url: contentType === 'url' ? url.trim() : (['image', 'video', 'audio', 'pdf'].includes(contentType) ? url : undefined),
      file_uri: ['image', 'video', 'audio', 'pdf'].includes(contentType) ? url : undefined,
      text_content: contentType === 'text' ? text.trim() : undefined,
      infomarian_id: infomarian.infomarian_id,
      infomarian_name: infomarian.full_name,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      source: 'infomarian',
      moderation_status: 'approved'
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('contentLibrary.addItem')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('contentLibrary.contentType')}</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {['url', 'image', 'video', 'text', 'audio', 'pdf'].map(type => {
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
          {['image', 'video', 'audio', 'pdf'].includes(contentType) && (
            <div>
              <Label>{t('contentLibrary.uploadFile')}</Label>
              <Input type="file" accept={contentType === 'image' ? 'image/*' : contentType === 'video' ? 'video/*' : contentType === 'audio' ? 'audio/*' : 'application/pdf,.pdf'} onChange={handleFile} disabled={uploading} />
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
            {t('contentLibrary.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}