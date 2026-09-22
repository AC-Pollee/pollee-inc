import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { AlertTriangle, Send, Inbox, FileText, Shield, Users, User } from 'lucide-react';

const BOARD_EMAIL = 'ac@acproductiondesign.com';

const LEVEL_META = {
  board: { label: 'Board', icon: Shield, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  infomarian: { label: 'Infomarian', icon: Users, color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  user: { label: 'User', icon: User, color: 'bg-blue-100 text-blue-700 border-blue-300' },
};

const PRIORITY_META = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const STATUS_META = {
  open: { label: 'Open', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
};

export default function IncidentReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomariansActive'],
    queryFn: () => base44.entities.Infomarian.filter({ status: 'active' }),
  });

  const isBoard = currentUser?.email === BOARD_EMAIL || currentUser?.role === 'admin';
  const myInfomarian = infomarians.find(i => i.user_email === currentUser?.email);
  const isInfomarian = !!myInfomarian;

  const { data: allReports = [] } = useQuery({
    queryKey: ['incidentReports'],
    queryFn: () => base44.entities.IncidentReport.list('-created_date'),
  });

  const myReports = allReports.filter(r => r.reporter_email === currentUser?.email);

  const inboxReports = allReports.filter(r => {
    const levels = r.target_levels || [];
    if (isBoard && levels.includes('board')) return true;
    if (isInfomarian && levels.includes('infomarian')) return true;
    if (levels.includes('user') && r.target_user_email === currentUser?.email) return true;
    return false;
  });

  const [targetLevels, setTargetLevels] = useState([]);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');

  const toggleLevel = (level) => {
    setTargetLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const submitReport = useMutation({
    mutationFn: async () => {
      const forwardedTo = [];

      if (targetLevels.includes('board')) forwardedTo.push(BOARD_EMAIL);
      if (targetLevels.includes('infomarian')) {
        infomarians.forEach(i => { if (i.user_email) forwardedTo.push(i.user_email); });
      }
      if (targetLevels.includes('user') && targetUserEmail) forwardedTo.push(targetUserEmail.trim());

      const record = await base44.entities.IncidentReport.create({
        reporter_email: currentUser.email,
        reporter_name: currentUser.full_name || currentUser.email,
        target_levels: targetLevels,
        target_user_email: targetLevels.includes('user') ? targetUserEmail.trim() : '',
        description,
        priority,
        status: 'open',
        forwarded_to: forwardedTo,
      });

      // Forward via email to each recipient
      const subject = `[Pollee Incident Report] ${PRIORITY_META[priority].label} priority — ${LEVEL_META[targetLevels[0]]?.label || 'General'}`;
      const body = `A new incident report has been filed on Pollee Inc.

From: ${currentUser.full_name || currentUser.email} (${currentUser.email})
Priority: ${PRIORITY_META[priority].label}
Forwarded to: ${targetLevels.map(l => LEVEL_META[l].label).join(', ')}

Description:
${description}

You are receiving this because the report was forwarded to your level. Please review it in the Pollee app.`;

      for (const recipient of forwardedTo) {
        try {
          await base44.integrations.Core.SendEmail({
            to: recipient,
            subject,
            body,
          });
        } catch (err) {
          // Non-registered recipients may be refused; continue with others
        }
      }

      return record;
    },
    onSuccess: () => {
      toast({ title: 'Report submitted', description: 'Your incident report has been forwarded.' });
      queryClient.invalidateQueries(['incidentReports']);
      setTargetLevels([]);
      setTargetUserEmail('');
      setPriority('medium');
      setDescription('');
    },
    onError: (err) => {
      toast({ title: 'Submission failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, resolution_notes }) => {
      await base44.entities.IncidentReport.update(id, { status, resolution_notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['incidentReports']);
      toast({ title: 'Report updated' });
    }
  });

  const handleSubmit = () => {
    if (!description.trim()) {
      toast({ title: 'Please describe the incident', variant: 'destructive' });
      return;
    }
    if (targetLevels.length === 0) {
      toast({ title: 'Select at least one level', variant: 'destructive' });
      return;
    }
    if (targetLevels.includes('user') && !targetUserEmail.trim()) {
      toast({ title: 'Enter the target user email', variant: 'destructive' });
      return;
    }
    submitReport.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Report an Incident</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">File a report and forward it to the appropriate level.</p>
          </div>
        </div>

        {/* Form */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
              New Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Level multi-select */}
            <div className="space-y-2">
              <Label>Forward to <span className="text-red-500">*</span></Label>
              <p className="text-xs text-slate-500">Select one or more levels to receive this report.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {Object.entries(LEVEL_META).map(([key, meta]) => {
                  const Icon = meta.icon;
                  const checked = targetLevels.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleLevel(key)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        checked
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <Icon className={`w-5 h-5 ${checked ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className={`text-sm font-medium ${checked ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>
                        {meta.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target user email (conditional) */}
            {targetLevels.includes('user') && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div className="space-y-2">
                  <Label htmlFor="targetUser">Target user email <span className="text-red-500">*</span></Label>
                  <Input
                    id="targetUser"
                    type="email"
                    placeholder="recipient@example.com"
                    value={targetUserEmail}
                    onChange={(e) => setTargetUserEmail(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">The report will be forwarded to this user's email.</p>
                </div>
              </motion.div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Describe the incident <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                rows={6}
                placeholder="Provide a clear description of the incident, including any relevant details, people involved, and context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitReport.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitReport.isPending ? 'Submitting...' : 'Submit & Forward Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Inbox (forwarded to me) */}
        {inboxReports.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Inbox className="w-5 h-5 text-amber-600" />
                Inbox — Reports Forwarded to You
                <Badge className="ml-1">{inboxReports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inboxReports.map(r => (
                <ReportRow key={r.id} report={r} canManage={isBoard || isInfomarian} onUpdate={updateStatus.mutate} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* My Reports */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-slate-600" />
              My Submitted Reports
              <Badge className="ml-1">{myReports.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">You haven't submitted any reports yet.</p>
            ) : (
              <div className="space-y-3">
                {myReports.map(r => <ReportRow key={r.id} report={r} canManage={false} onUpdate={() => {}} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportRow({ report, canManage, onUpdate }) {
  const [showResolve, setShowResolve] = useState(false);
  const [notes, setNotes] = useState('');

  const handleResolve = (status) => {
    onUpdate({ id: report.id, status, resolution_notes: notes });
    setShowResolve(false);
    setNotes('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(report.target_levels || []).map(level => {
            const meta = LEVEL_META[level];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Badge key={level} className={`gap-1 ${meta.color} border`}>
                <Icon className="w-3 h-3" />
                {meta.label}
              </Badge>
            );
          })}
          <Badge className={PRIORITY_META[report.priority]?.color}>{PRIORITY_META[report.priority]?.label}</Badge>
          <Badge className={STATUS_META[report.status]?.color}>{STATUS_META[report.status]?.label}</Badge>
        </div>
        <span className="text-xs text-slate-400">
          {report.created_date ? new Date(report.created_date).toLocaleString() : ''}
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{report.description}</p>
      <div className="text-xs text-slate-500">
        From: {report.reporter_name || 'Unknown'} ({report.reporter_email})
        {report.target_user_email && ` · To user: ${report.target_user_email}`}
      </div>
      {report.resolution_notes && (
        <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded p-2">
          Resolution: {report.resolution_notes}
        </div>
      )}
      {canManage && report.status !== 'closed' && report.status !== 'resolved' && (
        <div className="pt-2">
          {!showResolve ? (
            <Button size="sm" variant="outline" onClick={() => setShowResolve(true)}>
              Update Status
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea
                rows={2}
                placeholder="Resolution notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleResolve('resolved')}>Mark Resolved</Button>
                <Button size="sm" variant="outline" onClick={() => handleResolve('closed')}>Close</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowResolve(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}