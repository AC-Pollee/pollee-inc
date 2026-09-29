import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AssignInfomariansDialog({ poll, open, onOpenChange }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: infomarians = [], isLoading } = useQuery({
    queryKey: ['infomarians-list'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  useEffect(() => {
    if (open && poll) {
      setSelectedIds(poll.assigned_infomarians || []);
    }
  }, [open, poll]);

  const updatePoll = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Poll.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['polls']);
      onOpenChange(false);
    }
  });

  const activeInfomarians = infomarians.filter(i => i.status !== 'inactive' && i.status !== 'suspended');

  const toggle = (infomarianId) => {
    setSelectedIds(prev =>
      prev.includes(infomarianId)
        ? prev.filter(id => id !== infomarianId)
        : [...prev, infomarianId]
    );
  };

  const handleSave = () => {
    updatePoll.mutate({
      id: poll.id,
      data: { assigned_infomarians: selectedIds }
    });
  };

  const selectedNames = selectedIds
    .map(id => infomarians.find(i => i.infomarian_id === id || i.id === id || i.user_email === id))
    .filter(Boolean)
    .map(i => i.full_name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            {t('assignInfomarians.title')}
          </DialogTitle>
          <DialogDescription>
            {t('assignInfomarians.description', { title: poll?.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : activeInfomarians.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              {t('assignInfomarians.noActive')}
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeInfomarians.map((inf) => {
                const checked = selectedIds.includes(inf.infomarian_id);
                return (
                  <div
                    key={inf.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => toggle(inf.infomarian_id)}
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium cursor-pointer">
                        {inf.full_name}
                      </span>
                      <p className="text-xs text-slate-500 truncate">{inf.user_email}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(Array.isArray(inf.moderation_level) ? inf.moderation_level : inf.moderation_level ? [inf.moderation_level] : []).map(level => (
                        <Badge key={level} variant="outline" className="text-xs capitalize">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedNames.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {selectedNames.length} {selectedNames.length === 1 ? 'Infomarian' : 'Infomarians'} assigned
              </p>
              <p className="text-xs text-emerald-700">{selectedNames.join(', ')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updatePoll.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePoll.isPending || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {updatePoll.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('assignInfomarians.saving')}
                </>
                ) : (
                t('assignInfomarians.saveAssignment')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}