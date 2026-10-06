import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Save, CheckCircle2, AlertCircle, MailCheck, Clipboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function NewUserRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    franchise_id: '',
    phone_number: '',
    bsb: '',
    account_number: '',
    account_name: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [dobDisplay, setDobDisplay] = useState('');
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [codeSending, setCodeSending] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // A returning user who has already filled in their profile but hasn't
  // confirmed their code should land straight on the confirmation step,
  // not the registration form.
  useEffect(() => {
    if (user && user.date_of_birth && user.last_name && !user.confirmation_verified) {
      setConfirmationStep(true);
    }
  }, [user]);

  const { data: franchises = [] } = useQuery({
    queryKey: ['activeFranchises'],
    queryFn: async () => {
      const all = await base44.entities.Franchise.list();
      return all.filter(f => f.status === 'active');
    }
  });

  const { data: allInfomarians = [] } = useQuery({
    queryKey: ['allInfomarians'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  const register = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
      // Notify this constituency's Infomarians that a new constituent has
      // registered. This is a notification only — a supporting Infomarian is
      // assigned to the user by the constituency administrator or above, not
      // by the Infomarians receiving this notice.
      const constituencyInfomarians = allInfomarians.filter(
        i => i.franchise_id === data.franchise_id && i.status === 'active'
      );
      if (constituencyInfomarians.length > 0) {
        const constituentName = `${data.first_name} ${data.last_name}`.trim();
        const description = `New constituent ${constituentName} (${user?.email}) has registered and selected your constituency. A supporting Infomarian will be assigned to their account by the constituency administrator.`;
        await base44.entities.InfomarianTask.bulkCreate(
          constituencyInfomarians.map(i => ({
            assigned_to_id: i.infomarian_id,
            assigned_to_name: i.full_name,
            assigned_by_id: 'system',
            assigned_by_name: 'Pollee System',
            task_type: 'user_support',
            title: 'New constituent registration',
            description,
            priority: 'low',
            status: 'pending',
            related_entity_type: 'user',
            related_entity_id: user?.id || ''
          }))
        );
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(['currentUser']);
      try {
        setCodeSending(true);
        await base44.functions.invoke('member-confirmation', { action: 'send' });
      } catch (e) {
        // code send failed; user can resend
      } finally {
        setCodeSending(false);
      }
      setConfirmationStep(true);
    }
  });

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(formData.date_of_birth);
  const tooYoung = age !== null && age < 12;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tooYoung) return;
    register.mutate(formData);
  };

  const handleVerify = async () => {
    setConfirmError('');
    setConfirming(true);
    try {
      const res = await base44.functions.invoke('member-confirmation', { action: 'verify', code: codeInput });
      if (res.data?.verified) {
        await queryClient.refetchQueries({ queryKey: ['currentUser'] });
        navigate('/Profile');
      }
    } catch (e) {
      setConfirmError(e.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleResend = async () => {
    setConfirmError('');
    setCodeSending(true);
    try {
      await base44.functions.invoke('member-confirmation', { action: 'send' });
    } catch (e) {
      setConfirmError('Could not resend code. Please try again.');
    } finally {
      setCodeSending(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCodeInput(text.trim());
    } catch (e) {
      // clipboard not available
    }
  };

  const handleDobChange = (e) => {
    const input = e.target.value;
    setDobDisplay(input);
    if (input.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = input.split('/');
      setFormData({ ...formData, date_of_birth: `${year}-${month}-${day}` });
    } else {
      setFormData({ ...formData, date_of_birth: input });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="bg-white rounded-2xl p-8 shadow-xl space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('newUserReg.title')}</h1>
          </div>
          <p className="text-slate-500">{t('newUserReg.welcome', { email: user?.email })}</p>
        </div>

        <Card className="border-0 shadow-lg mb-8 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">{t('newUserReg.welcomeToPollee')}</h3>
            <div className="text-slate-700 space-y-3 leading-relaxed">
              <p>
                We believe in transparent and accountable Democracy built on trust and respect for all. Infomarians are professional users who are paid out of your voting to provide poll discussion content, to moderate discussions to ensure civility and respect are maintained, and to provide real help with using the system.
              </p>
              <p className="font-semibold text-indigo-800">
                {t('newUserReg.welcomeQuote')}
              </p>
            </div>
          </CardContent>
        </Card>

        {tooYoung && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {t('newUserReg.tooYoung')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {register.isError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Alert className="mb-6 bg-red-50 border-red-200" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('newUserReg.registrationFailed')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {confirmationStep && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <MailCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">{t('newUserReg.confirmTitle')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <p className="text-slate-700">
                {t('newUserReg.confirmSent', { email: user?.email })}
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirmation_code" className="text-base font-semibold">
                  {t('newUserReg.enterCode')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="confirmation_code"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="h-12 rounded-lg text-lg tracking-widest"
                  />
                  <Button type="button" variant="outline" onClick={handlePaste} className="h-12 px-4">
                    <Clipboard className="w-4 h-4 mr-1" /> {t('newUserReg.paste')}
                  </Button>
                </div>
              </div>
              {confirmError && (
                <Alert className="bg-red-50 border-red-200" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{confirmError}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                onClick={handleVerify}
                disabled={confirming || !codeInput}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg text-lg disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <Save className="w-5 h-5 mr-2 animate-pulse" />
                    {t('newUserReg.confirming')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {t('newUserReg.confirmAccount')}
                  </>
                )}
              </Button>
              <button
                type="button"
                onClick={handleResend}
                disabled={codeSending}
                className="w-full text-sm text-indigo-600 hover:text-indigo-700 underline disabled:opacity-50"
              >
                {codeSending ? t('newUserReg.sending') : t('newUserReg.resendCode')}
              </button>
            </CardContent>
          </Card>
        )}

        {!confirmationStep && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">{t('newUserReg.yourDetails')}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">{t('newUserReg.emailAddress')}</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="h-12 rounded-lg bg-slate-50" />
                <p className="text-xs text-slate-500">{t('newUserReg.emailCannotChange')}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-base font-semibold">
                    {t('newUserReg.firstName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Enter your first name"
                    className="h-12 rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-base font-semibold">
                    {t('newUserReg.lastName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Enter your last name"
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-base font-semibold">
                  {t('newUserReg.dateOfBirth')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={dobDisplay}
                  onChange={handleDobChange}
                  className="h-12 rounded-lg"
                  required
                />
                <p className="text-xs text-slate-500">Format: DD/MM/YYYY (e.g., 25/12/1990)</p>
                {age !== null && (
                  <p className="text-xs text-slate-500">
                    Age: {age} years
                    {age >= 18 && ' - Eligible to vote'}
                    {age >= 12 && age < 18 && ' - Junior member'}
                    {age < 12 && ' - Too young to participate'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="franchise_id" className="text-base font-semibold">
                  {t('newUserReg.constituency')} <span className="text-red-500">*</span>
                </Label>
                <select
                  id="franchise_id"
                  value={formData.franchise_id}
                  onChange={(e) => setFormData({ ...formData, franchise_id: e.target.value })}
                  className="w-full h-12 rounded-lg border border-slate-200 bg-white px-3 text-slate-900"
                  required
                >
                  <option value="">{t('newUserReg.selectConstituency')}</option>
                  {franchises.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.franchise_name} ({f.postcode})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{t('newUserReg.constituencyHelp')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-base font-semibold">{t('newUserReg.phoneNumber')}</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+61 400 000 000"
                  className="h-12 rounded-lg"
                />
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="terms-agreement"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <label htmlFor="terms-agreement" className="text-sm text-slate-700 cursor-pointer">
                    I agree to the{' '}
                    <a href="https://pollee.net/code-of-practice" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">Pollee Code of Practice</a>
                    ,{' '}
                    <a href="https://pollee.net/code-of-conduct" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">Code of Conduct</a>
                    {' '}and{' '}
                    <a href="https://pollee.net/model-rules" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">Model Rules</a>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={register.isPending || !agreedToTerms || tooYoung}
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg text-lg disabled:opacity-50"
                >
                  {register.isPending ? (
                    <>
                      <Save className="w-5 h-5 mr-2 animate-pulse" />
                      {t('newUserReg.registering')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      {t('newUserReg.completeRegistration')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}