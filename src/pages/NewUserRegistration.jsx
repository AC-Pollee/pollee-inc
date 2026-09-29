import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewUserRegistration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    last_name: '',
    date_of_birth: '',
    infomarian_id: '',
    phone_number: '',
    bsb: '',
    account_number: '',
    account_name: ''
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [dobDisplay, setDobDisplay] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const register = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      navigate('/Profile');
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">New User Registration</h1>
          </div>
          <p className="text-slate-500">Welcome, {user?.email}. Complete your details to join Pollee.</p>
        </div>

        <Card className="border-0 shadow-lg mb-8 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">Welcome to Pollee</h3>
            <div className="text-slate-700 space-y-3 leading-relaxed">
              <p>
                We believe in transparent and accountable Democracy built on trust and respect for all. Infomarians are professional users who are paid out of your voting to provide poll discussion content, to moderate discussions to ensure civility and respect are maintained, and to provide real help with using the system.
              </p>
              <p className="font-semibold text-indigo-800">
                With a vote, you can change your world, one poll at a time.
              </p>
            </div>
          </CardContent>
        </Card>

        {tooYoung && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You must be at least 12 years old to participate in this platform.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {register.isError && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Alert className="mb-6 bg-red-50 border-red-200" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Registration failed. Please try again.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <CardTitle className="text-2xl">Your Details</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email Address</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="h-12 rounded-lg bg-slate-50" />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-base font-semibold">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Enter your last name"
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-base font-semibold">
                  Date of Birth <span className="text-red-500">*</span>
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
                <Label htmlFor="infomarian_id" className="text-base font-semibold">
                  Infomarian ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="infomarian_id"
                  value={formData.infomarian_id}
                  onChange={(e) => setFormData({ ...formData, infomarian_id: e.target.value })}
                  placeholder="Enter your Infomarian ID"
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-base font-semibold">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+61 400 000 000"
                  className="h-12 rounded-lg"
                />
              </div>

              <div className="border-t border-slate-200 pt-6 mt-6">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <span className="font-semibold">Bank details suspended.</span> This site is in development and the
                    transaction layer is currently suspended, so bank account details are not required to register.
                    You can vote directly without a transaction.
                  </AlertDescription>
                </Alert>
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
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}