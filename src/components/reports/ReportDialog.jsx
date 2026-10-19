import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildReport, reportToCsv } from '@/lib/reportBuilder';
import ReportView from '@/components/reports/ReportView';

const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ReportDialog() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(toLocalInput(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(toLocalInput(new Date()));
  const [applied, setApplied] = useState(null);

  const { data, isFetching, error } = useQuery({
    queryKey: ['transparencyReport', applied],
    queryFn: () => buildReport(applied.from, applied.to),
    enabled: !!applied,
  });

  const run = () => setApplied({ from: new Date(from).toISOString(), to: new Date(to).toISOString() });

  const download = () => {
    const blob = new Blob([reportToCsv(data, applied.from, applied.to)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pollee-report-${applied.from.slice(0, 10)}-${applied.to.slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <FileBarChart className="w-4 h-4" /> Reports
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transparency report</DialogTitle></DialogHeader>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>From</Label><Input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} /></div>
            <Button onClick={run} disabled={isFetching || !from || !to}>
              {isFetching && <Loader2 className="w-4 h-4 animate-spin" />} Generate
            </Button>
            {data && <Button variant="outline" onClick={download} className="gap-2"><Download className="w-4 h-4" /> CSV</Button>}
          </div>
          {error && <p className="text-red-600 text-sm">Could not build the report: {error.message}</p>}
          {data && <ReportView r={data} />}
        </DialogContent>
      </Dialog>
    </>
  );
}