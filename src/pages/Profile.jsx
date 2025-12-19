import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Save, CheckCircle2, AlertCircle, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import DelegationManager from '@/components/profile/DelegationManager';

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    email: '',
    date_of_birth: '',
    infomarian_id: '',
    phone_number: '',
    bsb: '',
    account_number: '',
    account_name: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [validationInitiated, setValidationInitiated] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [validationError, setValidationError] = useState('');

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
        phone_number: user.phone_number || '',
        bsb: user.bsb || '',
        account_number: user.account_number || '',
        account_name: user.account_name || ''
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile.mutate({
      full_name: formData.full_name,
      last_name: formData.last_name,
      date_of_birth: formData.date_of_birth,
      infomarian_id: formData.infomarian_id,
      phone_number: formData.phone_number,
      bsb: formData.bsb,
      account_number: formData.account_number,
      account_name: formData.account_name
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
  const isProfileComplete = user?.last_name && user?.infomarian_id && user?.date_of_birth;
  const isAccountValidated = user?.account_validated || false;

  const handleInitiateValidation = async () => {
    // In real implementation, this would call an API to generate and send a random deposit
    // For now, we just mark as initiated
    setValidationInitiated(true);
    setValidationError('');
  };

  const handleVerifyDeposit = async () => {
    const amount = parseFloat(depositAmount);

    if (!amount || amount <= 0 || amount >= 0.25) {
      setValidationError('Please enter a valid amount (less than $0.25 AUD)');
      return;
    }

    // In real implementation, this would verify the amount matches the sent deposit
    // and update the user's account_validated status
    setValidationError('Verification in progress. Please contact admin to complete validation.');
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Profile</h1>
          <p className="text-slate-500">Manage your account information</p>
        </div>

        {!isProfileComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert className="mb-6 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Please complete your profile. Last Name, Date of Birth, and Infomarian ID are required.
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
                You must be at least 12 years old to participate in this platform.
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
                Junior Member (Age {age}) - You can participate in discussions and view running polls, but cannot cast official votes until you turn 18.
              </AlertDescription>
            </Alert>
          </motion.div>
          )}

          {!isAccountValidated && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="mb-6 bg-amber-50 border-amber-200">
                <BadgeCheck className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <span className="font-semibold">Account Validation Required:</span> Request a validation deposit from Pollee Inc (less than $0.25 AUD). Enter the amount you receive to verify your account.
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
              <CardTitle className="text-2xl">Profile Information</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-base font-semibold">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Enter your first name"
                    className="h-12 rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-base font-semibold">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    placeholder="Enter your last name"
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-12 rounded-lg bg-slate-50"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-base font-semibold">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  className="h-12 rounded-lg"
                  required
                />
                {formData.date_of_birth && (
                  <p className="text-xs text-slate-500">
                    Age: {calculateAge(formData.date_of_birth)} years
                    {calculateAge(formData.date_of_birth) >= 18 && ' - Eligible to vote'}
                    {calculateAge(formData.date_of_birth) >= 12 && calculateAge(formData.date_of_birth) < 18 && ' - Junior member'}
                    {calculateAge(formData.date_of_birth) < 12 && ' - Too young to participate'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="infomarian_id" className="text-base font-semibold">
                  Infomarian ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="infomarian_id"
                  value={formData.infomarian_id}
                  onChange={(e) => setFormData({...formData, infomarian_id: e.target.value})}
                  placeholder="Enter your Infomarian ID"
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-base font-semibold">
                  Phone Number
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

              <div className="border-t border-slate-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Australian Bank Details</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="bsb" className="text-base font-semibold">
                      BSB Number
                    </Label>
                    <Input
                      id="bsb"
                      value={formData.bsb}
                      onChange={(e) => setFormData({...formData, bsb: e.target.value})}
                      placeholder="000-000"
                      maxLength={7}
                      className="h-12 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number" className="text-base font-semibold">
                      Account Number
                    </Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                      placeholder="12345678"
                      className="h-12 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  <Label htmlFor="account_name" className="text-base font-semibold">
                    Account Name
                  </Label>
                  <Input
                    id="account_name"
                    value={formData.account_name}
                    onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                    placeholder="Name as it appears on your bank account"
                    className="h-12 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg text-lg"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Save className="w-5 h-5 mr-2 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>

          {/* Account Validation Section */}
          {!isAccountValidated && (
          <Card className="border-0 shadow-xl mt-6">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Account Validation</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              {!validationInitiated ? (
                <div className="space-y-4">
                  <p className="text-slate-700">
                    To validate your account and start voting, request a validation deposit from Pollee Inc. We'll send a <span className="font-bold">random amount (less than $0.25 AUD)</span> to your bank account.
                  </p>

                  <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                    <p className="font-semibold text-slate-900">Your Bank Details Required:</p>
                    <div className="space-y-1 text-slate-600">
                      <p>Make sure you have entered your BSB and Account Number in the profile form above.</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">How it works:</span> Pollee Inc will send a random deposit (less than $0.25 AUD) to your account. You must enter the exact amount you receive to complete validation.
                    </p>
                  </div>

                  <Button
                    onClick={handleInitiateValidation}
                    disabled={!formData.bsb || !formData.account_number}
                    className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg text-lg disabled:opacity-50"
                  >
                    <BadgeCheck className="w-5 h-5 mr-2" />
                    Request Validation Deposit
                  </Button>

                  {(!formData.bsb || !formData.account_number) && (
                    <p className="text-sm text-red-600 text-center">
                      Please complete your bank details above before requesting validation
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <BadgeCheck className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Validation Deposit Sent</h3>
                    <p className="text-slate-600 mb-4">
                      We've sent a random amount (less than $0.25 AUD) to your account ending in {formData.account_number?.slice(-4) || 'XXXX'}.
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Next Step:</span> Check your bank account and enter the exact amount you received from Pollee Inc to complete validation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="depositAmount" className="text-base font-semibold">
                      Enter Deposit Amount Received (AUD)
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
                      Enter the exact amount shown in your bank statement (e.g., 0.18)
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
                    Verify Deposit Amount
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {age >= 18 && (
          <div className="mt-6">
            <DelegationManager user={user} />
          </div>
        )}

        {user?.role === 'admin' && (
          <Card className="border-0 shadow-lg mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Administrator Account</p>
                  <p className="text-sm text-purple-600">You have admin access to manage polls and verify votes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}