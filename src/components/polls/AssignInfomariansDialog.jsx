import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AssignInfomariansDialog({ poll, open, onOpenChange }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [scanResults, setScanResults] = useState({});
  const [detailsFor, setDetailsFor] = useState(null);

  const { data: infomarians = [], isLoading } = useQuery({
    queryKey: ['infomarians-list'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  useEffect(() => {
    if (open && poll) {
      setSelectedIds(poll.assigned_infomarians || []);
      setScanResults({});
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

  const runScan = async (infomarianId) => {
    setScanResults(prev => ({ ...prev, [infomarianId]: { loading: true } }));
    try {
      const res = await base44.functions.invoke('conflict-of-interest-scan', {
        infomarian_id: infomarianId,
        poll_id: poll.id
      });
      setScanResults(prev => ({ ...prev, [infomarianId]: { data: res.data } }));
    } catch (error) {
      setScanResults(prev => ({ ...prev, [infomarianId]: { error: error.message || 'failed' } }));
    }
  };

  const toggle = (infomarianId) => {
    setSelectedIds(prev => {
      if (prev.includes(infomarianId)) {
        return prev.filter(id => id !== infomarianId);
      }
      // Newly selected — run the conflict-of-interest scan
      if (!scanResults[infomarianId]) {
        runScan(infomarianId);
      }
      return [...prev, infomarianId];
    });
  };

  const handleSave = async () => {
    const previouslyAssigned = poll.assigned_infomarians || [];
    const newlyAssignedIds = selectedIds.filter(id => !previouslyAssigned.includes(id));
    const newlyAssigned = newlyAssignedIds
      .map(id => infomarians.find(i => i.infomarian_id === id || i.id === id || i.user_email === id))
      .filter(Boolean);

    await updatePoll.mutateAsync({
      id: poll.id,
      data: { assigned_infomarians: selectedIds }
    });

    newlyAssigned.forEach((inf) => {
      base44.integrations.Core.SendEmail({
        to: inf.user_email,
        subject: 'You have been assigned to a new poll',
        html: `<p>Dear ${inf.full_name},</p>
          <p>You have been assigned to moderate the following poll:</p>
          <p><strong>${poll.title}</strong></p>
          ${poll.description ? `<p>${poll.description}</p>` : ''}
          <p>Please visit the Infomarian Dashboard to begin your moderation duties for this poll.</p>
          <p>— Pollee Inc</p>`
      }).catch(() => {});
    });
  };

  const selectedNames = selectedIds
    .map(id => infomarians.find(i => i.infomarian_id === id || i.id === id || i.user_email === id))
    .filter(Boolean)
    .map(i => i.full_name);

  const renderScanBadge = (infomarianId) => {
    const scan = scanResults[infomarianId];
    if (!scan) return null;

    if (scan.loading) {
      return (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{t('conflictScan.scanning')}</span>
        </div>
      );
    }
    if (scan.error) {
      return <span className="text-xs text-slate-400">{t('conflictScan.scanFailed')}</span>;
    }
    const d = scan.data;
    if (!d) return null;

    if (!d.has_conflict && d.severity === 'none' && d.summary && d.summary.toLowerCase().includes('no declaration')) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailsFor(infomarianId); }}
          className="flex items-center gap-1 text-xs text-amber-600 hover:underline"
        >
          <AlertTriangle className="w-3 h-3" />
          {t('conflictScan.noDeclaration')}
        </button>
      );
    }
    if (!d.has_conflict) {
      return (
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="w-3 h-3" />
          {t('conflictScan.noConflict')}
        </div>
      );
    }

    const tone = d.severity === 'high' ? 'text-red-600' : d.severity === 'medium' ? 'text-orange-600' : 'text-amber-600';
    const label = d.severity === 'high' ? t('conflictScan.conflictHigh')
      : d.severity === 'medium' ? t('conflictScan.conflictMedium')
      : t('conflictScan.conflictLow');
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setDetailsFor(infomarianId); }}
        className={`flex items-center gap-1 text-xs ${tone} hover:underline`}
      >
        <AlertTriangle className="w-3 h-3" />
        {label}
      </button>
    );
  };

  const detailsScan = detailsFor ? scanResults[detailsFor] : null;
  const detailsData = detailsScan?.data;

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
                      {checked && renderScanBadge(inf.infomarian_id)}
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

      {/* Conflict of interest assessment details */}
      <Dialog open={!!detailsFor} onOpenChange={() => setDetailsFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {t('conflictScan.detailsTitle')}
            </DialogTitle>
          </DialogHeader>
          {detailsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">{t('conflictScan.infomarian')}</p>
                  <p className="font-medium">{detailsData.infomarian_name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">{t('conflictScan.severity')}</p>
                  <p className={`font-medium capitalize ${
                    detailsData.severity === 'high' ? 'text-red-600' :
                    detailsData.severity === 'medium' ? 'text-orange-600' :
                    detailsData.severity === 'low' ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{detailsData.severity}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('conflictScan.summary')}</p>
                <p className="text-sm text-slate-800">{detailsData.summary}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('conflictScan.flaggedInterests')}</p>
                {detailsData.flagged_interests && detailsData.flagged_interests.length > 0 ? (
                  <ul className="list-disc list-inside text-sm text-slate-800 space-y-1">
                    {detailsData.flagged_interests.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{t('conflictScan.none')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsFor(null)}>
              {t('conflictScan.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}