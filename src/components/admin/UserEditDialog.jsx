import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from 'react-i18next';

// Edit dialog for basic user details only. Bank account details are never
// shown — only the bank-verification flag is displayed.
export default function UserEditDialog({ user, open, onOpenChange, franchises, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || user.full_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        language: user.language || 'en',
        franchise_id: user.franchise_id || '',
        infomarian_id: user.infomarian_id || ''
      });
      setReason('');
      setError('');
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await base44.functions.invoke('update-user-record', {
        target_user_id: user.id,
        updates: form,
        reason
      });
      const updated = res.data?.user;
      if (onSaved) onSaved({ ...user, ...form, ...(updated || {}) });
      onOpenChange(false);
    } catch (e) {
      setError(e.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('userDirectory.editUser')}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
          {user.account_validated ? (
            <>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">{t('userDirectory.verified')}</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">{t('userDirectory.notVerified')}</span>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('userDirectory.firstName')}</Label>
            <Input value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('userDirectory.lastName')}</Label>
            <Input value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('userDirectory.phoneNumber')}</Label>
            <Input value={form.phone_number || ''} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t('userDirectory.language')}</Label>
            <select
              value={form.language || 'en'}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-background text-foreground"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="nl">Dutch</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">{t('userDirectory.constituencyAssignment')}</Label>
            <select
              value={form.franchise_id || ''}
              onChange={(e) => setForm({ ...form, franchise_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-background text-foreground"
            >
              <option value="">{t('userDirectory.noConstituency')}</option>
              {franchises.map((f) => (
                <option key={f.id} value={f.id}>{f.franchise_name} ({f.postcode})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">{t('userDirectory.infomarianId')}</Label>
            <Input value={form.infomarian_id || ''} onChange={(e) => setForm({ ...form, infomarian_id: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">{t('userDirectory.changeReason')}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('userDirectory.changeReasonPlaceholder')} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? t('userDirectory.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}