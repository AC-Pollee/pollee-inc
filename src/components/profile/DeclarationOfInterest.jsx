import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollText, Save, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DeclarationOfInterest({ user }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [declaration, setDeclaration] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const { data: infomarian, isLoading } = useQuery({
    queryKey: ['myInfomarian', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const list = await base44.entities.Infomarian.list();
      return list.find((i) => i.user_email === user.email) || null;
    },
    enabled: !!user?.email
  });

  useEffect(() => {
    if (infomarian) {
      setDeclaration(infomarian.declaration_of_interest || '');
    }
  }, [infomarian]);

  const save = useMutation({
    mutationFn: async (value) => {
      return await base44.entities.Infomarian.update(infomarian.id, {
        declaration_of_interest: value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myInfomarian']);
      setSavedMessage(t('declaration.saved'));
      setTimeout(() => setSavedMessage(''), 3000);
    }
  });

  const handleSave = () => {
    save.mutate(declaration.trim());
  };

  if (isLoading || !infomarian) return null;

  return (
    <Card className="border-0 shadow-lg mt-6">
      <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t('declaration.title')}</CardTitle>
            <p className="text-amber-100 text-sm mt-1">{t('declaration.subtitle')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            {t('declaration.hint')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="declaration_of_interest" className="text-base font-semibold">
            {t('declaration.fieldLabel')}
          </Label>
          <Textarea
            id="declaration_of_interest"
            value={declaration}
            onChange={(e) => {
              let value = e.target.value;
              if (value.length > 2000) value = value.slice(0, 2000);
              setDeclaration(value);
            }}
            placeholder={t('declaration.placeholder')}
            maxLength={2000}
            className="rounded-lg min-h-[140px] resize-y"
          />
          <div className="flex items-center justify-between text-xs">
            <p className="text-slate-500">{t('declaration.examples')}</p>
            <p className={declaration.length >= 2000 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
              {declaration.length}/2000
            </p>
          </div>
        </div>

        {savedMessage && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">{savedMessage}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {save.isPending ? (
            <>
              <Save className="w-4 h-4 mr-2 animate-pulse" />
              {t('declaration.saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t('declaration.save')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}