import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Folder, FolderOpen, ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Builds a lookup of folder -> children for the infomarian's folders.
function buildFolderTree(folders) {
  const byParent = {};
  folders.forEach(f => {
    const p = f.parent_id || 'root';
    (byParent[p] = byParent[p] || []).push(f);
  });
  return byParent;
}

export default function MoveItemDialog({ open, onOpenChange, infomarian, itemId, currentFolderId, onMove }) {
  const { t } = useTranslation();
  const [selectedFolder, setSelectedFolder] = useState(null); // null = root
  const [navFolderId, setNavFolderId] = useState(null); // browsing target
  const [path, setPath] = useState([]); // breadcrumb of {id, name}

  const { data: folders = [] } = useQuery({
    queryKey: ['content-folders', infomarian?.infomarian_id],
    queryFn: () => base44.entities.ContentFolder.filter({ infomarian_id: infomarian.infomarian_id }, 'name'),
    enabled: !!infomarian?.infomarian_id && open
  });

  useEffect(() => {
    if (open) {
      setSelectedFolder(null);
      setNavFolderId(null);
      setPath([]);
    }
  }, [open, itemId]);

  const byParent = buildFolderTree(folders);
  const visibleFolders = byParent[navFolderId || 'root'] || [];

  const navigateInto = (folder) => {
    setNavFolderId(folder.id);
    setPath(prev => [...prev, folder]);
  };

  const navigateTo = (index) => {
    if (index < 0) {
      setNavFolderId(null);
      setPath([]);
    } else {
      setNavFolderId(path[index].id);
      setPath(path.slice(0, index + 1));
    }
  };

  const handleMove = () => {
    onMove({ id: itemId, folder_id: selectedFolder });
  };

  const isCurrentLocation = (selectedFolder === (currentFolderId || null));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-indigo-600" />
            {t('contentLibrary.moveTo')}
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label>{t('contentLibrary.moveTo')}</Label>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 flex-wrap text-sm mt-1 mb-2">
            <button
              onClick={() => navigateTo(-1)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 ${navFolderId === null ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}
            >
              <Home className="w-3.5 h-3.5" />
              {t('contentLibrary.rootFolder')}
            </button>
            {path.map((f, i) => (
              <React.Fragment key={f.id}>
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <button
                  onClick={() => navigateTo(i)}
                  className={`px-1.5 py-0.5 rounded hover:bg-slate-100 ${i === path.length - 1 ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Select current location as destination */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${selectedFolder === null ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              <Home className="w-4 h-4" />
              <span className="font-medium">{t('contentLibrary.moveToRoot')}</span>
            </button>
            {visibleFolders.map(f => (
              <div key={f.id} className="flex items-center border-t border-slate-100">
                <button
                  onClick={() => setSelectedFolder(f.id)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left ${selectedFolder === f.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <Folder className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium truncate">{f.name}</span>
                </button>
                <button
                  onClick={() => navigateInto(f)}
                  className="px-2.5 py-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                  title={t('contentLibrary.back')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
            {visibleFolders.length === 0 && navFolderId !== null && (
              <p className="px-3 py-3 text-xs text-slate-400 border-t border-slate-100">{t('contentLibrary.emptyFolder')}</p>
            )}
          </div>
          {isCurrentLocation && (
            <p className="text-xs text-amber-600 mt-2">This is the item's current location.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('contentLibrary.cancel')}</Button>
          <Button onClick={handleMove} disabled={isCurrentLocation} className="bg-indigo-600 hover:bg-indigo-700">
            {t('contentLibrary.move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}