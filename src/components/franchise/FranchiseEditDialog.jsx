import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

export default function FranchiseEditDialog({ franchise, open, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    franchise_name: '',
    postcode: '',
    postcodes_served: '',
    state: '',
    owner_email: '',
    contact_phone: '',
    status: 'active'
  });

  useEffect(() => {
    if (franchise) {
      setFormData({
        franchise_name: franchise.franchise_name || '',
        postcode: franchise.postcode || '',
        postcodes_served: Array.isArray(franchise.postcodes_served)
          ? franchise.postcodes_served.join(', ')
          : (franchise.postcodes_served || ''),
        state: franchise.state || '',
        owner_email: franchise.owner_email || '',
        contact_phone: franchise.contact_phone || '',
        status: franchise.status || 'active'
      });
    }
  }, [franchise]);

  const handleSubmit = () => {
    const postcodes = formData.postcodes_served
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    onSave({
      franchise_name: formData.franchise_name.trim(),
      postcode: formData.postcode.trim(),
      postcodes_served: postcodes,
      state: formData.state.trim(),
      owner_email: formData.owner_email.trim(),
      contact_phone: formData.contact_phone.trim(),
      status: formData.status
    });
  };

  if (!franchise) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Constituency</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-franchise_name">Constituency Name</Label>
            <Input
              id="edit-franchise_name"
              value={formData.franchise_name}
              onChange={(e) => setFormData({ ...formData, franchise_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-postcode">Primary Postcode</Label>
              <Input
                id="edit-postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-state">State/Territory</Label>
              <Input
                id="edit-state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-postcodes_served">Postcodes Served (comma-separated)</Label>
            <Input
              id="edit-postcodes_served"
              value={formData.postcodes_served}
              onChange={(e) => setFormData({ ...formData, postcodes_served: e.target.value })}
              placeholder="e.g., 2000, 2001, 2002"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-owner_email">Owner Email</Label>
            <Input
              id="edit-owner_email"
              type="email"
              value={formData.owner_email}
              onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-contact_phone">Contact Phone</Label>
              <Input
                id="edit-contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.franchise_name || !formData.postcode || !formData.state || !formData.owner_email || saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}