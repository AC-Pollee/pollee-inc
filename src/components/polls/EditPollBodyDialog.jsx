import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';

export default function EditPollBodyDialog({ poll, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open && poll) setBody(poll.description || '');
  }, [open, poll]);

  const save = useMutation({
    mutationFn: () => base44.entities.Poll.update(poll.id, { description: body.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['assignedPolls']);
      queryClient.invalidateQueries(['activeBudgets']);
      queryClient.invalidateQueries(['polls']);
      onOpenChange(false);
    }
  });

  if (!poll) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Edit poll body
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">{poll.title}</p>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Poll description / body…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}