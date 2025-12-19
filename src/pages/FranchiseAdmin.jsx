import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Users, Plus, Trash2 } from 'lucide-react';

export default function FranchiseAdmin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('franchises');

  // Franchise state
  const [franchiseData, setFranchiseData] = useState({
    franchise_name: '',
    postcode: '',
    postcodes_served: '',
    state: '',
    owner_email: '',
    contact_phone: ''
  });

  // Infomarian state
  const [infomarianData, setInfomarianData] = useState({
    user_email: '',
    full_name: '',
    infomarian_id: '',
    franchise_id: '',
    bio: '',
    expertise_areas: '',
    assigned_postcodes: '',
    moderation_level: 'local'
  });

  const { data: franchises = [] } = useQuery({
    queryKey: ['franchises'],
    queryFn: () => base44.entities.Franchise.list('-created_date')
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomarians'],
    queryFn: () => base44.entities.Infomarian.list('-created_date')
  });

  const createFranchise = useMutation({
    mutationFn: (data) => base44.entities.Franchise.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['franchises']);
      setFranchiseData({
        franchise_name: '',
        postcode: '',
        postcodes_served: '',
        state: '',
        owner_email: '',
        contact_phone: ''
      });
    }
  });

  const createInfomarian = useMutation({
    mutationFn: (data) => base44.entities.Infomarian.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['infomarians']);
      setInfomarianData({
        user_email: '',
        full_name: '',
        infomarian_id: '',
        franchise_id: '',
        bio: '',
        expertise_areas: '',
        assigned_postcodes: '',
        moderation_level: 'local'
      });
    }
  });

  const deleteFranchise = useMutation({
    mutationFn: (id) => base44.entities.Franchise.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['franchises'])
  });

  const deleteInfomarian = useMutation({
    mutationFn: (id) => base44.entities.Infomarian.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['infomarians'])
  });

  const handleCreateFranchise = () => {
    const postcodes = franchiseData.postcodes_served
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    createFranchise.mutate({
      ...franchiseData,
      postcodes_served: postcodes,
      status: 'active'
    });
  };

  const handleCreateInfomarian = () => {
    const expertise = infomarianData.expertise_areas
      .split(',')
      .map(e => e.trim())
      .filter(e => e);
    
    const postcodes = infomarianData.assigned_postcodes
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    createInfomarian.mutate({
      ...infomarianData,
      expertise_areas: expertise,
      assigned_postcodes: postcodes,
      status: 'active',
      total_earnings: 0
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl('Admin')}>
          <Button variant="ghost" className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Franchise Management</h1>
          <p className="text-slate-500">Manage franchises and Infomarians</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="franchises" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6">
              <Building2 className="w-4 h-4 mr-2" />
              Franchises
            </TabsTrigger>
            <TabsTrigger value="infomarians" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-6">
              <Users className="w-4 h-4 mr-2" />
              Infomarians
            </TabsTrigger>
          </TabsList>

          {/* Franchises Tab */}
          <TabsContent value="franchises" className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Create New Franchise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="franchise_name">Franchise Name</Label>
                    <Input
                      id="franchise_name"
                      value={franchiseData.franchise_name}
                      onChange={(e) => setFranchiseData({...franchiseData, franchise_name: e.target.value})}
                      placeholder="e.g., Pollee Sydney Central"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Primary Postcode</Label>
                    <Input
                      id="postcode"
                      value={franchiseData.postcode}
                      onChange={(e) => setFranchiseData({...franchiseData, postcode: e.target.value})}
                      placeholder="e.g., 2000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postcodes_served">Postcodes Served (comma-separated)</Label>
                  <Input
                    id="postcodes_served"
                    value={franchiseData.postcodes_served}
                    onChange={(e) => setFranchiseData({...franchiseData, postcodes_served: e.target.value})}
                    placeholder="e.g., 2000, 2001, 2002"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Territory</Label>
                    <Input
                      id="state"
                      value={franchiseData.state}
                      onChange={(e) => setFranchiseData({...franchiseData, state: e.target.value})}
                      placeholder="e.g., NSW"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner_email">Owner Email</Label>
                    <Input
                      id="owner_email"
                      type="email"
                      value={franchiseData.owner_email}
                      onChange={(e) => setFranchiseData({...franchiseData, owner_email: e.target.value})}
                      placeholder="owner@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={franchiseData.contact_phone}
                    onChange={(e) => setFranchiseData({...franchiseData, contact_phone: e.target.value})}
                    placeholder="+61 400 000 000"
                  />
                </div>

                <Button
                  onClick={handleCreateFranchise}
                  disabled={!franchiseData.franchise_name || !franchiseData.postcode || !franchiseData.state || !franchiseData.owner_email}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Franchise
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Existing Franchises</h3>
              {franchises.map((franchise) => (
                <Card key={franchise.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{franchise.franchise_name}</h3>
                          <Badge className={franchise.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                            {franchise.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          {franchise.state} • Primary: {franchise.postcode} • Serves: {franchise.postcodes_served?.join(', ')}
                        </p>
                        <p className="text-sm text-slate-500">Owner: {franchise.owner_email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this franchise?')) {
                            deleteFranchise.mutate(franchise.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Infomarians Tab */}
          <TabsContent value="infomarians" className="space-y-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Add New Infomarian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={infomarianData.full_name}
                      onChange={(e) => setInfomarianData({...infomarianData, full_name: e.target.value})}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      value={infomarianData.user_email}
                      onChange={(e) => setInfomarianData({...infomarianData, user_email: e.target.value})}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="infomarian_id">Infomarian ID</Label>
                    <Input
                      id="infomarian_id"
                      value={infomarianData.infomarian_id}
                      onChange={(e) => setInfomarianData({...infomarianData, infomarian_id: e.target.value})}
                      placeholder="INFO001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="franchise_id">Franchise ID</Label>
                    <Input
                      id="franchise_id"
                      value={infomarianData.franchise_id}
                      onChange={(e) => setInfomarianData({...infomarianData, franchise_id: e.target.value})}
                      placeholder="Select from franchises above"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={infomarianData.bio}
                    onChange={(e) => setInfomarianData({...infomarianData, bio: e.target.value})}
                    placeholder="Professional background..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise_areas">Expertise Areas (comma-separated)</Label>
                  <Input
                    id="expertise_areas"
                    value={infomarianData.expertise_areas}
                    onChange={(e) => setInfomarianData({...infomarianData, expertise_areas: e.target.value})}
                    placeholder="Politics, Environment, Education"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_postcodes">Assigned Postcodes (comma-separated)</Label>
                  <Input
                    id="assigned_postcodes"
                    value={infomarianData.assigned_postcodes}
                    onChange={(e) => setInfomarianData({...infomarianData, assigned_postcodes: e.target.value})}
                    placeholder="2000, 2001, 2002"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moderation_level">Moderation Level</Label>
                  <select
                    id="moderation_level"
                    value={infomarianData.moderation_level}
                    onChange={(e) => setInfomarianData({...infomarianData, moderation_level: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-slate-200"
                  >
                    <option value="local">Local</option>
                    <option value="state">State</option>
                    <option value="federal">Federal</option>
                  </select>
                </div>

                <Button
                  onClick={handleCreateInfomarian}
                  disabled={!infomarianData.full_name || !infomarianData.user_email || !infomarianData.infomarian_id || !infomarianData.franchise_id}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Infomarian
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Infomarians</h3>
              {infomarians.map((info) => (
                <Card key={info.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{info.full_name}</h3>
                          <Badge className="bg-purple-100 text-purple-700">
                            {info.infomarian_id}
                          </Badge>
                          <Badge className={info.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                            {info.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{info.user_email}</p>
                        <p className="text-sm text-slate-500">
                          Level: {info.moderation_level} • Postcodes: {info.assigned_postcodes?.join(', ')}
                        </p>
                        <p className="text-sm text-emerald-600 font-semibold">
                          Earnings: ${(info.total_earnings || 0).toFixed(2)} AUD
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Remove this Infomarian?')) {
                            deleteInfomarian.mutate(info.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}