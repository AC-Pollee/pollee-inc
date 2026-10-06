import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FranchiseCreateDialog({ open, onOpenChange }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    franchise_name: '',
    postcode: '',
    postcodes_served: '',
    state: '',
    owner_email: '',
    contact_phone: '',
    status: 'active'
  });

  const createFranchise = useMutation({
    mutationFn: (data) => base44.entities.Franchise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['franchises']);
      onOpenChange(false);
      setFormData({
        franchise_name: '', postcode: '', postcodes_served: '', state: '',
        owner_email: '', contact_phone: '', status: 'active'
      });
    }
  });

  const handleSubmit = () => {
    const postcodes = formData.postcodes_served
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    createFranchise.mutate({
      franchise_name: formData.franchise_name.trim(),
      postcode: formData.postcode.trim(),
      postcodes_served: postcodes,
      state: formData.state.trim(),
      owner_email: formData.owner_email.trim(),
      contact_phone: formData.contact_phone.trim(),
      status: formData.status
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            {t('franchiseCreateDialog.title', { defaultValue: 'Create Constituency' })}
          </DialogTitle>
          <DialogDescription>
            {t('franchiseCreateDialog.description', { defaultValue: 'Add a new franchise (constituency) to the platform.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="franchise_name">{t('franchiseEditDialog.constituencyName')}</Label>
            <Input
              id="franchise_name"
              value={formData.franchise_name}
              onChange={(e) => setFormData({ ...formData, franchise_name: e.target.value })}
              placeholder={t('franchiseCreateDialog.namePlaceholder', { defaultValue: 'e.g., Sydney North' })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postcode">{t('franchiseEditDialog.primaryPostcode')}</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="2000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">{t('franchiseEditDialog.stateTerritory')}</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="NSW"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postcodes_served">{t('franchiseEditDialog.postcodesServed')}</Label>
            <Input
              id="postcodes_served"
              value={formData.postcodes_served}
              onChange={(e) => setFormData({ ...formData, postcodes_served: e.target.value })}
              placeholder="e.g., 2000, 2001, 2002"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_email">{t('franchiseEditDialog.ownerEmail')}</Label>
            <Input
              id="owner_email"
              type="email"
              value={formData.owner_email}
              onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
              placeholder="owner@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">{t('franchiseEditDialog.contactPhone')}</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="04xx xxx xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('franchiseEditDialog.status')}</Label>
              <select
                id="status"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createFranchise.isPending}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.franchise_name || !formData.postcode || !formData.state || !formData.owner_email || createFranchise.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {createFranchise.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.creating', { defaultValue: 'Creating...' })}
              </>
            ) : (
              t('franchiseCreateDialog.create', { defaultValue: 'Create Constituency' })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}