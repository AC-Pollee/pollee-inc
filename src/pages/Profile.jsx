import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { User, Save, CheckCircle2, AlertCircle, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import DelegationManager from '@/components/profile/DelegationManager';
import DelegationsHeldRegister from '@/components/profile/DelegationsHeldRegister';
import VoteHistory from '@/components/profile/VoteHistory';
import ReputationScore from '@/components/profile/ReputationScore';
import ReputationBadge from '@/components/profile/ReputationBadge';
import UserHelp from '@/components/help/UserHelp';
import AvatarUploader from '@/components/profile/AvatarUploader';
import ConstituencySelector from '@/components/profile/ConstituencySelector';
import DeclarationOfInterest from '@/components/profile/DeclarationOfInterest';
import { useTranslation } from 'react-i18next';

// Temporarily suspend the validation deposit requirement.
// When true, users are auto-validated on profile load and the deposit card is hidden.
// Set back to false to restore the deposit flow.
const VALIDATION_DEPOSIT_SUSPENDED = true;

export default function Profile() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    infomarian_id: '',
    franchise_id: '',
    phone_number: '',
    bsb: '',
    account_number: '',
    account_name: '',
    personal_bio: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [validationInitiated, setValidationInitiated] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [validationError, setValidationError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [bioError, setBioError] = useState('');

  const containsExternalUrl = (text) => {
    return /\b(https?:\/\/|www\.)\S+/i.test(text);
  };

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData;
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        date_of_birth: user.date_of_birth || '',
        infomarian_id: user.infomarian_id || '',
        franchise_id: user.franchise_id || '',
        phone_number: user.phone_number || '',
        bsb: user.bsb || '',
        account_number: user.account_number || '',
        account_name: user.account_name || '',
        personal_bio: user.personal_bio || ''
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      setSuccessMessage(t('profile.profileUpdated'));
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (containsExternalUrl(formData.personal_bio)) {
      setBioError(t('profile.externalUrlsBio'));
      return;
    }
    setBioError('');
    updateProfile.mutate({
      full_name: formData.full_name,
      last_name: formData.last_name,
      date_of_birth: formData.date_of_birth,
      infomarian_id: formData.infomarian_id,
      franchise_id: formData.franchise_id,
      phone_number: formData.phone_number,
      bsb: formData.bsb,
      account_number: formData.account_number,
      account_name: formData.account_name,
      personal_bio: formData.personal_bio
    });
  };

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

  const age = calculateAge(user?.date_of_birth);
  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  const isProfileComplete = isSuperAdmin || (user?.last_name && user?.infomarian_id && user?.date_of_birth);
  const isAccountValidated = VALIDATION_DEPOSIT_SUSPENDED || isSuperAdmin || user?.account_validated || false;
  const validationInitiatedState = user?.validation_initiated || false;

  // Auto-validate users while the deposit requirement is suspended, so they get a
  // voter ID and are treated as validated members app-wide without making a deposit.
  useEffect(() => {
    if (!VALIDATION_DEPOSIT_SUSPENDED || !user || isSuperAdmin || user.account_validated) return;
    const voterId = `V${Date.now()}${Math.floor(Math.random() * 10000)}`;
    base44.auth.updateMe({ account_validated: true, voter_id: voterId }).then(() => {
      queryClient.invalidateQueries(['currentUser']);
    });
  }, [user, isSuperAdmin, queryClient]);

  const handleInitiateValidation = async () => {
    // Mark that user has made the 0.55 AUD deposit
    await base44.auth.updateMe({ validation_initiated: true });
    queryClient.invalidateQueries(['currentUser']);
    setValidationInitiated(true);
    setValidationError('');
  };

  const handleVerifyDeposit = async () => {
    const amount = parseFloat(depositAmount);

    if (!amount || amount <= 0 || amount >= 0.25) {
      setValidationError(t('profile.invalidAmount'));
      return;
    }

    // Check if amount matches the validation deposit
    if (user?.validation_deposit_amount && Math.abs(amount - user.validation_deposit_amount) < 0.01) {
      // Generate unique voter ID (timestamp + random)
      const voterId = `V${Date.now()}${Math.floor(Math.random() * 10000)}`;
      
      await base44.auth.updateMe({ 
        account_validated: true,
        voter_id: voterId
      });
      queryClient.invalidateQueries(['currentUser']);
      setSuccessMessage(`${t('profile.accountValidated')}! ${t('profile.yourVoterId')} ${voterId}`);
      setValidationError('');
    } else {
      setValidationError(t('profile.amountMismatch'));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="space-y-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('profile.title')}</h1>
            <ReputationBadge user={user} />
          </div>
          <p className="text-slate-500">{t('profile.subtitle')}</p>
        </div>

        <Card className="border-0 shadow-lg mb-8">
          <CardContent className="p-6">
            <AvatarUploader user={user} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="space-y-2">
              <Label htmlFor="personal_bio" className="text-base font-semibold">
                {t('profile.personalBiography')}
              </Label>
              <Textarea
                id="personal_bio"
                value={formData.personal_bio}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.length > 350) value = value.slice(0, 350);
                  setFormData({ ...formData, personal_bio: value });
                  setBioError(containsExternalUrl(value) ? t('profile.externalUrlsNotAllowed') : '');
                }}
                placeholder={t('profile.bioPlaceholder')}
                maxLength={350}
                className="rounded-lg min-h-[120px] resize-none"
              />
              <div className="flex items-center justify-between text-xs">
                <p className={bioError ? 'text-red-600 font-medium' : 'text-slate-500'}>
                  {bioError || t('profile.noExternalLinks')}
                </p>
                <p className={formData.personal_bio.length >= 350 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                  {formData.personal_bio.length}/350
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isProfileComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {t('profile.completeProfile')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {age !== null && age < 12 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {t('profile.tooYoung')}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {age !== null && age >= 12 && age < 18 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {t('profile.juniorMember', { age })}
              </AlertDescription>
            </Alert>
          </motion.div>
          )}

          {!isAccountValidated && !isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="mb-6 bg-amber-50 border-amber-200">
                <BadgeCheck className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {t('profile.accountValidationRequired')}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="mb-6 bg-purple-50 border-purple-200">
                <BadgeCheck className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  {t('profile.superAdminAccount')}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6 bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">{t('profile.profileInfo')}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-base font-semibold">
                    {t('profile.firstName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name?.split(' ')[0] || formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder={t('profile.firstNamePlaceholder')}
                    className="h-12 rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-base font-semibold">
                    {t('profile.lastName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder={t('profile.lastNamePlaceholder')}
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  {t('profile.emailAddress')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-12 rounded-lg bg-slate-50"
                />
                <p className="text-xs text-slate-500">{t('profile.emailCannotChange')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-base font-semibold">
                  {t('profile.dateOfBirth')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={(() => {
                    const dob = formData.date_of_birth || '';
                    const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    return m ? `${m[3]}/${m[2]}/${m[1]}` : dob;
                  })()}
                  onChange={(e) => {
                    const input = e.target.value;
                    // Convert DD/MM/YYYY to YYYY-MM-DD for storage
                    if (input.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                      const [day, month, year] = input.split('/');
                      setFormData({...formData, date_of_birth: `${year}-${month}-${day}`});
                    } else {
                      setFormData({...formData, date_of_birth: input});
                    }
                  }}
                  className="h-12 rounded-lg"
                  required
                />
                <p className="text-xs text-slate-500">{t('profile.dobFormat')}</p>
                {formData.date_of_birth && formData.date_of_birth.match(/^\d{4}-\d{2}-\d{2}$/) && (
                  <p className="text-xs text-slate-500">
                    {t('profile.ageLabel', { age: calculateAge(formData.date_of_birth) })}
                    {calculateAge(formData.date_of_birth) >= 18 && t('profile.eligibleToVote')}
                    {calculateAge(formData.date_of_birth) >= 12 && calculateAge(formData.date_of_birth) < 18 && t('profile.juniorMemberLabel')}
                    {calculateAge(formData.date_of_birth) < 12 && t('profile.tooYoungLabel')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="infomarian_id" className="text-base font-semibold">
                  {t('profile.infomarianIdLabel')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="infomarian_id"
                  value={formData.infomarian_id}
                  onChange={(e) => setFormData({...formData, infomarian_id: e.target.value})}
                  placeholder={t('profile.infomarianIdPlaceholder')}
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <ConstituencySelector
                  value={formData.franchise_id}
                  infomarianId={formData.infomarian_id}
                  onChange={(franchiseId) => setFormData({ ...formData, franchise_id: franchiseId })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-base font-semibold">
                  {t('profile.phoneNumber')}
                </Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="+61 400 000 000"
                  className="h-12 rounded-lg"
                />
              </div>

              <div className="border-t border-slate-200 pt-6 mt-6 opacity-60 pointer-events-none">
                <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-500 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t('profile.layerSuspended')}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('profile.bankNote')}
                  </p>
                </div>
                <h3 className="text-lg font-semibold text-slate-400 mb-4">{t('profile.bankDetails')}</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bsb" className="text-base font-semibold">
                      {t('profile.bsbNumber')}
                    </Label>
                    <Input
                      id="bsb"
                      value={formData.bsb}
                      onChange={(e) => setFormData({...formData, bsb: e.target.value})}
                      placeholder="000-000"
                      maxLength={7}
                      disabled
                      className="h-12 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-base font-semibold">
                      {t('profile.accountNumber')}
                    </Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                      placeholder="12345678"
                      disabled
                      className="h-12 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="account_name" className="text-base font-semibold">
                    {t('profile.accountNameLabel')}
                  </Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder={t('profile.accountNamePlaceholder')}
                    disabled
                    className="h-12 rounded-lg bg-slate-100 text-slate-400 cursor-not-allowed"
                  />
                </div>
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
                    {t('profile.agreeToTerms')}{' '}
                    <a href="https://pollee.net/code-of-practice" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      {t('profile.polleeCodeOfPractice')}
                    </a>
                    ,{' '}
                    <a href="https://pollee.net/code-of-conduct" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      {t('profile.codeOfConduct')}
                    </a>
                    {' '}{t('profile.and')}{' '}
                    <a href="https://pollee.net/model-rules" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      {t('profile.modelRules')}
                    </a>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={updateProfile.isPending || !agreedToTerms}
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg text-lg disabled:opacity-50"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Save className="w-5 h-5 mr-2 animate-pulse" />
                      {t('profile.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {t('profile.saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>

          {/* Account Validation Section */}
          {!isAccountValidated && !isSuperAdmin && (
          <Card className="border-0 shadow-xl mt-6">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">{t('profile.accountValidation')}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {!validationInitiatedState ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-3">{t('profile.step1Title')}</h4>
                    <p className="text-slate-700 mb-4">
                      {t('profile.step1Desc')}
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                      <p className="font-semibold text-slate-900">{t('profile.polleeBankDetails')}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">{t('profile.bsbLabel')}</span>
                          <span className="font-mono font-semibold">123-456</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">{t('profile.accountNameLabel2')}</span>
                          <span className="font-semibold">Pollee Inc</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                          <span className="text-slate-600">{t('profile.amountLabel')}</span>
                          <span className="font-semibold text-amber-600">$0.55 AUD</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                      <p className="text-sm text-amber-800">
                        {t('profile.important', { email: user?.email })}
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-900 mb-2">{t('profile.step2Title')}</h4>
                    <p className="text-sm text-emerald-800">
                      {t('profile.step2Desc', { last4: formData.account_number?.slice(-4) || 'XXXX' })}
                    </p>
                  </div>

                  <Button
                    onClick={handleInitiateValidation}
                    disabled={!formData.bsb || !formData.account_number}
                    className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg text-lg disabled:opacity-50"
                  >
                    <BadgeCheck className="w-5 h-5 mr-2" />
                    {t('profile.madeDeposit')}
                  </Button>

                  {(!formData.bsb || !formData.account_number) && (
                    <p className="text-sm text-red-600 text-center">
                      {t('profile.completeBankDetails')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <BadgeCheck className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('profile.validationInProgress')}</h3>
                    <p className="text-slate-600 mb-4">
                      {t('profile.validationInProgressDesc')}
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      {t('profile.onceVerified', { last4: formData.account_number?.slice(-4) || 'XXXX' })}
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800">
                      {t('profile.finalStep')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="depositAmount" className="text-base font-semibold">
                      {t('profile.enterDepositAmount')}
                    </Label>
                    <Input
                      id="depositAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="0.24"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => {
                        setDepositAmount(e.target.value);
                        setValidationError('');
                      }}
                      className="h-12 rounded-lg text-lg font-semibold text-center"
                    />
                    <p className="text-xs text-slate-500 text-center">
                      {t('profile.depositHint')}
                    </p>
                  </div>

                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleVerifyDeposit}
                    disabled={!depositAmount}
                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-lg disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {t('profile.verifyDeposit')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {isAccountValidated && user?.voter_id && (
            <Card className="border-0 shadow-lg mt-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">{t('profile.accountValidated')}</p>
                    <p className="text-sm text-emerald-700">{t('profile.yourVoterId')} <span className="font-mono font-bold">{user.voter_id}</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Declaration of Interest — Infomarians only */}
          {(user?.user_role === 'infomarian' || user?.user_role === 'franchise_manager' || user?.user_role === 'master_franchiser' || isSuperAdmin) && (
            <DeclarationOfInterest user={user} />
          )}

          {/* Reputation Score */}
          <div className="mt-6">
            <ReputationScore user={user} />
          </div>

          {/* User Guide */}
          <div className="mt-6">
            <UserHelp />
          </div>

          {age >= 18 && (
            <div className="mt-6">
              <DelegationManager user={user} />
            </div>
          )}

          {/* Delegations Held Register - Visible to Infomarians and above */}
          {(user?.user_role === 'infomarian' || user?.user_role === 'franchise_manager' || user?.user_role === 'master_franchiser' || isSuperAdmin) && (
            <DelegationsHeldRegister userId={user?.id} />
          )}

          {/* Vote History - visible to all users */}
          {user && (
            <div className="mt-6">
              <VoteHistory userId={user.voter_id} voterEmail={user.email} />
            </div>
          )}

          {/* Strike Register */}
          {user?.strikes && user.strikes.length > 0 && (
            <Card className="border-0 shadow-lg mt-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
              <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{t('profile.conductStrikeRegister')}</CardTitle>
                    <p className="text-red-100 text-sm mt-1">
                      {t('profile.strikesOnRecord', { count: user.strikes.length })}
                    </p>
                    <p className="text-red-100 text-xs mt-1">
                      {user.permanently_banned
                        ? t('profile.commentingSuspended')
                        : user.strikes.length === 2
                        ? t('profile.nextStrikeSuspends')
                        : user.strikes.length === 1
                        ? t('profile.nextStrikeWeek')
                        : t('profile.threeStrikes')}
                    </p>
                    <Link to={createPageUrl('IncidentReport')} className="inline-block mt-2 text-xs underline text-white">
                      {t('profile.appealStrike')}
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-4">
                  {user.strikes.map((strike, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-2 ${
                        strike.severity === 'severe' ? 'bg-red-50 border-red-300' :
                        strike.severity === 'moderate' ? 'bg-orange-50 border-orange-300' :
                        'bg-yellow-50 border-yellow-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={
                          strike.severity === 'severe' ? 'bg-red-600 text-white' :
                          strike.severity === 'moderate' ? 'bg-orange-600 text-white' :
                          'bg-yellow-600 text-white'
                        }>
                          {t('profile.strike')} {index + 1} - {strike.severity}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {format(new Date(strike.date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      <p className="text-slate-900 font-semibold mb-2">
                        {strike.reason}
                      </p>

                      <div className="text-sm text-slate-600">
                        <p>{t('profile.issuedBy')} <span className="font-medium">{strike.infomarian_name}</span> (ID: {strike.infomarian_id})</p>
                        {strike.comment_id && (
                          <p className="text-xs text-slate-500 mt-1">{t('profile.relatedToComment')} {strike.comment_id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {user.strikes.length >= 3 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('profile.strikesWarning')}
                    </AlertDescription>
                  </Alert>
                )}

                {user.commenting_restricted && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('profile.commentingRestricted')}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

        {user?.role === 'admin' && (
          <Card className="border-0 shadow-lg mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">{t('profile.adminAccount')}</p>
                  <p className="text-sm text-purple-600">{t('profile.adminAccountDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg mt-8 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">{t('profile.welcomeToPollee')}</h3>
            <div className="text-slate-700 space-y-3 leading-relaxed">
              <p>
                {t('profile.welcomeDesc1')}
              </p>
              <p>
                {t('profile.welcomeDesc2')}
              </p>
              <p>
                {t('profile.welcomeDesc3')}
              </p>
              <p className="font-semibold text-indigo-800">
                {t('profile.welcomeQuote')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Important Documents Section */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-8 border border-indigo-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
              {t('profile.docsTitle')}
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <a
                href="https://pollee.net/code-of-conduct"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">{t('home.codeOfConduct')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('home.codeOfConductDesc')}</p>
              </a>

              <a
                href="https://pollee.net/model-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">{t('home.modelRules')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('home.modelRulesDesc')}</p>
              </a>

              <a
                href="https://pollee.net/code-of-practice"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-indigo-300"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-center">{t('home.codeOfPractice')}</h3>
                <p className="text-sm text-slate-600 text-center mt-2">{t('home.codeOfPracticeDesc')}</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}