import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
  const isSuperAdmin = user?.email === 'ac@acproductiondesign.com';
  const isProfileComplete = isSuperAdmin || (user?.last_name && user?.infomarian_id && user?.date_of_birth);
  const isAccountValidated = isSuperAdmin || user?.account_validated || false;
  const validationInitiatedState = user?.validation_initiated || false;

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
      setValidationError('Please enter a valid amount (less than $0.25 AUD)');
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
      setSuccessMessage(`Account validated! Your Voter ID is: ${voterId}`);
      setValidationError('');
    } else {
      setValidationError('The amount entered does not match our records. Please try again or contact support.');
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Profile</h1>
          <p className="text-slate-500">Manage your account information</p>
        </div>

        <Card className="border-0 shadow-lg mb-8 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">Welcome to Pollee</h3>
            <div className="text-slate-700 space-y-3 leading-relaxed">
              <p>
                We believe in transparent and accountable Democracy built on trust and respect for all. Infomarians are professional users who are paid out of your voting to provide poll discussion content, to moderate discussions to ensure civility and respect are maintained, and to provide real help with using the system.
              </p>
              <p>
                We work on three strikes and your commenting rights are curtailed or removed, depending on the severity of any offense. You will be warned and the issue discussed on each notification of a complaint by another user or your Infomarian.
              </p>
              <p>
                If you appreciate the assistance an Infomarian provides you or applaud the quality of their work, you can "Tip" them by adding any amount to the base 55c vote transaction. You can also rate your interactions to help the community identify Infomarians who consistently deliver you truthful information, maintain a civilised discussion, and assist you when you have problems.
              </p>
              <p className="font-semibold text-indigo-800">
                With a vote, you can change your world, one poll at a time.
              </p>
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

          {!isAccountValidated && !isSuperAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert className="mb-6 bg-amber-50 border-amber-200">
                <BadgeCheck className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <span className="font-semibold">Account Validation Required:</span> Make a $0.55 AUD deposit to Pollee Inc. Once verified, we'll send you a random amount (less than $0.25 AUD) to confirm your account.
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
                  <span className="font-semibold">SuperAdmin Account:</span> Full access to all features without validation requirements.
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    We use banks transactions because they are secure, confidential and fully accountable by both Parties. It is also a serious crime to interfere with financial transactions
                  </p>
                </div>
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
                    <a href="https://pollee.net/code-of-practice" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      Pollee Code of Practice
                    </a>
                    ,{' '}
                    <a href="https://pollee.net/code-of-conduct" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      Code of Conduct
                    </a>
                    {' '}and{' '}
                    <a href="https://pollee.net/model-rules" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 underline">
                      Model Rules
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
          {!isAccountValidated && !isSuperAdmin && (
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
              {!validationInitiatedState ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Step 1: Make Your 0.55 AUD Deposit</h4>
                    <p className="text-slate-700 mb-4">
                      To validate your account and start voting, you must make a <span className="font-bold text-indigo-700">$0.55 AUD deposit</span> to the Pollee Inc bank account.
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                      <p className="font-semibold text-slate-900">Pollee Inc Bank Details:</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">BSB:</span>
                          <span className="font-mono font-semibold">123-456</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Account Name:</span>
                          <span className="font-semibold">Pollee Inc</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                          <span className="text-slate-600">Amount:</span>
                          <span className="font-semibold text-amber-600">$0.55 AUD</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                      <p className="text-sm text-amber-800">
                        <span className="font-semibold">Important:</span> Include your email address ({user?.email}) in the transaction description so we can verify your payment.
                      </p>
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-900 mb-2">Step 2: We'll Confirm Receipt</h4>
                    <p className="text-sm text-emerald-800">
                      Once we verify your $0.55 AUD deposit, Pollee Inc will send a <span className="font-semibold">random amount (less than $0.25 AUD)</span> to your bank account ending in {formData.account_number?.slice(-4) || 'XXXX'}.
                    </p>
                  </div>

                  <Button
                    onClick={handleInitiateValidation}
                    disabled={!formData.bsb || !formData.account_number}
                    className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-lg text-lg disabled:opacity-50"
                  >
                    <BadgeCheck className="w-5 h-5 mr-2" />
                    I've Made the $0.55 AUD Deposit
                  </Button>

                  {(!formData.bsb || !formData.account_number) && (
                    <p className="text-sm text-red-600 text-center">
                      Please complete your bank details above before proceeding
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <BadgeCheck className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Validation In Progress</h3>
                    <p className="text-slate-600 mb-4">
                      Thank you for making your $0.55 AUD deposit. Our admin team is verifying your payment.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Once verified:</span> Pollee Inc will send a random amount (less than $0.25 AUD) to your account ending in {formData.account_number?.slice(-4) || 'XXXX'}.
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800">
                      <span className="font-semibold">Final Step:</span> Once you receive the random deposit, enter the exact amount below to complete validation.
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

          {isAccountValidated && user?.voter_id && (
            <Card className="border-0 shadow-lg mt-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">Account Validated</p>
                    <p className="text-sm text-emerald-700">Your Voter ID: <span className="font-mono font-bold">{user.voter_id}</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                    <CardTitle className="text-2xl">Conduct Strike Register</CardTitle>
                    <p className="text-red-100 text-sm mt-1">
                      {user.strikes.length} strike{user.strikes.length > 1 ? 's' : ''} on record
                    </p>
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
                          Strike {index + 1} - {strike.severity}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {format(new Date(strike.date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>

                      <p className="text-slate-900 font-semibold mb-2">
                        {strike.reason}
                      </p>

                      <div className="text-sm text-slate-600">
                        <p>Issued by: <span className="font-medium">{strike.infomarian_name}</span> (ID: {strike.infomarian_id})</p>
                        {strike.comment_id && (
                          <p className="text-xs text-slate-500 mt-1">Related to comment: {strike.comment_id}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {user.strikes.length >= 3 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You have received 3 or more strikes. Your commenting privileges may be restricted.
                    </AlertDescription>
                  </Alert>
                )}

                {user.commenting_restricted && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <span className="font-semibold">Commenting Restricted:</span> Your ability to comment on polls has been limited due to conduct violations.
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
                  <p className="font-semibold text-purple-900">Administrator Account</p>
                  <p className="text-sm text-purple-600">You have admin access to manage polls and verify votes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Important Documents Section */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-8 border border-indigo-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
              Important Documents & Guidelines
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
                <h3 className="font-semibold text-slate-900 text-center">Code of Conduct</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Community standards and behavior guidelines</p>
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
                <h3 className="font-semibold text-slate-900 text-center">Model Rules</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Platform governance and operational rules</p>
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
                <h3 className="font-semibold text-slate-900 text-center">Code of Practice</h3>
                <p className="text-sm text-slate-600 text-center mt-2">Best practices for voting and participation</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}