import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, HelpCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function UserSupport({ infomarian }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const sendSupportMessage = useMutation({
    mutationFn: async ({ recipient, content }) => {
      // Route through the backend so the recipient is validated against
      // registered app users — never send to an arbitrary external address.
      await base44.functions.invoke('send-notification-email', {
        recipients: [recipient],
        subject: `Support from ${infomarian.full_name}`,
        message: content,
        context_label: `Support message from ${infomarian.full_name}`
      });
      return { success: true };
    },
    onSuccess: () => {
      setMessage('');
      setUserEmail('');
      alert('Support message sent successfully');
    }
  });

  const handleSendMessage = () => {
    if (!userEmail.trim() || !message.trim()) {
      alert('Please provide recipient email and message');
      return;
    }

    sendSupportMessage.mutate({
      recipient: userEmail,
      content: message
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">User Support Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Respond to user inquiries promptly and professionally</li>
                <li>• Help users understand poll content and voting process</li>
                <li>• Assist with technical issues and account questions</li>
                <li>• Guide users on proper conduct and community standards</li>
                <li>• Escalate complex issues to franchise management when needed</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('userSupport.sendMessage')}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User Email</label>
            <Input
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Support Message</label>
            <Textarea
              placeholder="Type your support message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!userEmail.trim() || !message.trim() || sendSupportMessage.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {sendSupportMessage.isPending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Support Message
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Support Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Account Validation</h4>
              <p className="text-sm text-slate-600">Guide users through the 55c deposit and account verification process.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Voting Process</h4>
              <p className="text-sm text-slate-600">Explain bank transaction format and vote submission steps.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Delegation</h4>
              <p className="text-sm text-slate-600">Help users understand and set up vote delegation.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold text-slate-900 mb-2">Conduct Standards</h4>
              <p className="text-sm text-slate-600">Educate users on community standards and strike system.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}