import React, { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MAX_SIZE_MB = 2;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUploader({ user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('avatarUploader.invalidType'));
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t('avatarUploader.tooLarge', { size: MAX_SIZE_MB }));
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.auth.updateMe({ avatar_url: file_url });
      queryClient.invalidateQueries(['currentUser']);
    } catch (err) {
      setError(t('avatarUploader.uploadFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const initial = (user?.full_name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Avatar className="w-24 h-24 border-2 border-slate-200 shadow-sm">
          {user?.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user?.full_name || 'Avatar'} />
          ) : null}
          <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            {initial}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
          title={t('avatarUploader.uploadAvatar')}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('avatarUploader.uploading')}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {user?.avatar_url ? t('avatarUploader.changeAvatar') : t('avatarUploader.uploadAvatar')}
          </>
        )}
      </Button>

      <p className="text-xs text-slate-500 text-center max-w-xs">
        {t('avatarUploader.hint', { size: MAX_SIZE_MB })}
      </p>

      {error && <p className="text-xs text-red-600 text-center">{error}</p>}
    </div>
  );
}