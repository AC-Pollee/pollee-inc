import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';

export default function EditPollBodyDialog({ poll, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');

  useEffect(() => {
    if (open && poll) {
      setBody(poll.description || '');
      const opts = Array.isArray(poll.options) ? poll.options : [];
      setOption1(opts[0]?.label || '');
      setOption2(opts[1]?.label || '');
    }
  }, [open, poll]);

  const save = useMutation({
    mutationFn: () => {
      const opts = Array.isArray(poll.options) ? poll.options : [];
      const updatedOptions = opts.map((o, i) => {
        if (i === 0) return { ...o, label: option1.trim() };
        if (i === 1) return { ...o, label: option2.trim() };
        return o;
      });
      return base44.entities.Poll.update(poll.id, {
        description: body.trim(),
        options: updatedOptions
      });
    },
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
            <FileText className="w-5 h-5" /> Edit poll
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Poll body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Poll description / body…"
            />
          </div>
          <div className="space-y-2">
            <Label>Choice 1</Label>
            <Input value={option1} onChange={(e) => setOption1(e.target.value)} placeholder="Choice 1 text" />
          </div>
          <div className="space-y-2">
            <Label>Choice 2</Label>
            <Input value={option2} onChange={(e) => setOption2(e.target.value)} placeholder="Choice 2 text" />
          </div>
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