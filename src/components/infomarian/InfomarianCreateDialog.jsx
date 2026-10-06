import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function InfomarianCreateDialog({ open, onOpenChange, franchises = [] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    user_email: '',
    franchise_id: '',
    bio: '',
    expertise_areas: '',
    assigned_postcodes: '',
    moderation_level: ['local'],
    status: 'active'
  });

  const createInfomarian = useMutation({
    mutationFn: (data) => base44.entities.Infomarian.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['infomarians']);
      onOpenChange(false);
      setFormData({
        full_name: '', user_email: '', franchise_id: '', bio: '',
        expertise_areas: '', assigned_postcodes: '', moderation_level: ['local'], status: 'active'
      });
    }
  });

  const handleSubmit = () => {
    const expertise = formData.expertise_areas.split(',').map(e => e.trim()).filter(Boolean);
    const postcodes = formData.assigned_postcodes.split(',').map(p => p.trim()).filter(Boolean);
    const infomarianId = `INF-${Date.now().toString(36).toUpperCase()}`;

    createInfomarian.mutate({
      full_name: formData.full_name.trim(),
      user_email: formData.user_email.trim(),
      franchise_id: formData.franchise_id,
      infomarian_id: infomarianId,
      bio: formData.bio.trim(),
      expertise_areas: expertise,
      assigned_postcodes: postcodes,
      moderation_level: formData.moderation_level,
      status: formData.status,
      total_earnings: 0
    });
  };

  const selectedFranchise = franchises.find(f => f.id === formData.franchise_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            {t('infomarianCreateDialog.title', { defaultValue: 'Create & Assign Infomarian' })}
          </DialogTitle>
          <DialogDescription>
            {t('infomarianCreateDialog.description', { defaultValue: 'Register a new Infomarian and assign them to a constituency.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inf_full_name">Full Name</Label>
              <Input
                id="inf_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inf_user_email">Email</Label>
              <Input
                id="inf_user_email"
                type="email"
                value={formData.user_email}
                onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_franchise">Assign to Constituency</Label>
            <select
              id="inf_franchise"
              value={formData.franchise_id}
              onChange={(e) => setFormData({ ...formData, franchise_id: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select a constituency...</option>
              {franchises.filter(f => f.status === 'active').map(f => (
                <option key={f.id} value={f.id}>{f.franchise_name} ({f.postcode})</option>
              ))}
            </select>
            {selectedFranchise && (
              <Badge variant="outline" className="mt-1">{selectedFranchise.franchise_name}</Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_bio">Bio</Label>
            <Input
              id="inf_bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Professional background..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_expertise">Expertise Areas (comma-separated)</Label>
            <Input
              id="inf_expertise"
              value={formData.expertise_areas}
              onChange={(e) => setFormData({ ...formData, expertise_areas: e.target.value })}
              placeholder="Politics, Environment, Education"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_postcodes">Assigned Postcodes (comma-separated)</Label>
            <Input
              id="inf_postcodes"
              value={formData.assigned_postcodes}
              onChange={(e) => setFormData({ ...formData, assigned_postcodes: e.target.value })}
              placeholder="2000, 2001, 2002"
            />
          </div>

          <div className="space-y-2">
            <Label>Moderation Level (select one or more)</Label>
            <div className="flex flex-wrap gap-4 p-3 border border-slate-200 rounded-md">
              {['local', 'state', 'federal'].map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.moderation_level.includes(level)}
                    onChange={(e) => {
                      const current = formData.moderation_level;
                      const next = e.target.checked
                        ? [...current, level]
                        : current.filter((l) => l !== level);
                      setFormData({ ...formData, moderation_level: next.length ? next : ['local'] });
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700 capitalize">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inf_status">Status</Label>
            <select
              id="inf_status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createInfomarian.isPending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.full_name || !formData.user_email || !formData.franchise_id || createInfomarian.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {createInfomarian.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.creating', { defaultValue: 'Creating...' })}
              </>
            ) : (
              t('infomarianCreateDialog.create', { defaultValue: 'Create & Assign' })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}