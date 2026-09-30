import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from 'lucide-react';

export default function InfomarianEditDialog({ infomarian, open, onOpenChange, franchises = [] }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (infomarian) {
      setFormData({
        full_name: infomarian.full_name || '',
        user_email: infomarian.user_email || '',
        bio: infomarian.bio || '',
        expertise_areas: Array.isArray(infomarian.expertise_areas) ? infomarian.expertise_areas.join(', ') : '',
        assigned_postcodes: Array.isArray(infomarian.assigned_postcodes) ? infomarian.assigned_postcodes.join(', ') : '',
        moderation_level: Array.isArray(infomarian.moderation_level) ? infomarian.moderation_level : (infomarian.moderation_level ? [infomarian.moderation_level] : ['local']),
        status: infomarian.status || 'active'
      });
    }
  }, [infomarian]);

  const updateInfomarian = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Infomarian.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['infomarians']);
      onOpenChange(false);
    }
  });

  if (!infomarian || !formData) return null;

  const franchise = franchises.find(f => f.id === infomarian.franchise_id);

  const handleSave = () => {
    const expertise = formData.expertise_areas
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    const postcodes = formData.assigned_postcodes
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    updateInfomarian.mutate({
      id: infomarian.id,
      data: {
        full_name: formData.full_name,
        user_email: formData.user_email,
        bio: formData.bio,
        expertise_areas: expertise,
        assigned_postcodes: postcodes,
        moderation_level: formData.moderation_level,
        status: formData.status
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-indigo-600" />
            Edit Infomarian
          </DialogTitle>
          <DialogDescription>
            Update the details for <strong>{infomarian.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-purple-100 text-purple-700">{infomarian.infomarian_id}</Badge>
            {franchise && <Badge variant="outline">{franchise.franchise_name}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_user_email">Email</Label>
              <Input
                id="edit_user_email"
                type="email"
                value={formData.user_email}
                onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_bio">Bio</Label>
            <Input
              id="edit_bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Professional background..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_expertise">Expertise Areas (comma-separated)</Label>
            <Input
              id="edit_expertise"
              value={formData.expertise_areas}
              onChange={(e) => setFormData({ ...formData, expertise_areas: e.target.value })}
              placeholder="Politics, Environment, Education"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_postcodes">Assigned Postcodes (comma-separated)</Label>
            <Input
              id="edit_postcodes"
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
            <Label htmlFor="edit_status">Status</Label>
            <select
              id="edit_status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-slate-200"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateInfomarian.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateInfomarian.isPending || !formData.full_name || !formData.user_email}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {updateInfomarian.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}