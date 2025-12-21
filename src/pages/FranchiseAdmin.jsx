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
import { ArrowLeft, Building2, Users, Plus, Trash2, Search } from 'lucide-react';

export default function FranchiseAdmin() {
  const queryClient = useQueryClient();
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  
  const isSuperAdmin = currentUser?.email === 'ac@acproductiondesign.com';
  const hasAccess = isSuperAdmin || currentUser?.user_role === 'master_franchiser' || currentUser?.user_role === 'franchise_manager';
  const [activeTab, setActiveTab] = useState('franchises');

  // Franchise state
  const [franchiseData, setFranchiseData] = useState({
    franchise_name: '',
    postcode: '',
    postcodes_served: '',
    state: '',
    owner_email: '',
    contact_phone: '',
    owner_user_id: null
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
    moderation_level: 'local',
    selected_user_id: null
  });

  const [userSearchResults, setUserSearchResults] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [ownerSearchResults, setOwnerSearchResults] = useState([]);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerDetailsConfirmed, setOwnerDetailsConfirmed] = useState(false);

  // Fetch all users for lookup
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch {
        return [];
      }
    }
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

  const updateUserRecord = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await base44.entities.User.update(userId, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
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

  const handleCreateFranchise = async () => {
    const postcodes = franchiseData.postcodes_served
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    // Update User record if email or phone was modified
    if (franchiseData.owner_user_id) {
      const originalUser = allUsers.find(u => u.id === franchiseData.owner_user_id);
      if (originalUser && (originalUser.email !== franchiseData.owner_email || originalUser.phone_number !== franchiseData.contact_phone)) {
        await updateUserRecord.mutateAsync({
          userId: franchiseData.owner_user_id,
          userData: {
            email: franchiseData.owner_email,
            phone_number: franchiseData.contact_phone
          }
        });
      }
    }

    createFranchise.mutate({
      ...franchiseData,
      postcodes_served: postcodes,
      status: 'active'
    });
  };

  const handleUserEmailSearch = (email) => {
    setInfomarianData({...infomarianData, user_email: email});
    
    if (email.length >= 2) {
      const matches = allUsers.filter(user => 
        user.email.toLowerCase().includes(email.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(email.toLowerCase())
      ).slice(0, 5);
      setUserSearchResults(matches);
      setShowUserDropdown(matches.length > 0);
    } else {
      setUserSearchResults([]);
      setShowUserDropdown(false);
    }
  };

  const handleSelectUser = (user) => {
    const generatedId = generateInfomarianId(infomarianData.franchise_id, user.id);
    setInfomarianData({
      ...infomarianData, 
      user_email: user.email,
      full_name: user.full_name || '',
      infomarian_id: generatedId,
      selected_user_id: user.id
    });
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  const handleNameSearch = (name) => {
    setInfomarianData({...infomarianData, full_name: name});
    
    if (name.length >= 2) {
      const matches = allUsers.filter(user => 
        user.full_name?.toLowerCase().includes(name.toLowerCase()) ||
        user.email.toLowerCase().includes(name.toLowerCase())
      ).slice(0, 5);
      setNameSearchResults(matches);
      setShowNameDropdown(matches.length > 0);
    } else {
      setNameSearchResults([]);
      setShowNameDropdown(false);
    }
  };

  const handleSelectUserByName = (user) => {
    const generatedId = generateInfomarianId(infomarianData.franchise_id, user.id);
    setInfomarianData({
      ...infomarianData, 
      user_email: user.email,
      full_name: user.full_name || '',
      infomarian_id: generatedId,
      selected_user_id: user.id
    });
    setShowNameDropdown(false);
    setNameSearchResults([]);
  };

  const generateInfomarianId = (franchiseId, userId) => {
    if (!franchiseId || !userId) return '';
    
    // Count existing infomarians for this franchise
    const franchiseInfomarians = infomarians.filter(i => i.franchise_id === franchiseId);
    const nextSeq = (franchiseInfomarians.length + 1).toString().padStart(3, '0');
    
    return `${franchiseId}-${userId}-${nextSeq}`;
  };

  const handleOwnerSearch = (search) => {
    setFranchiseData({...franchiseData, owner_email: search});
    setSelectedOwner(null);
    
    if (search.length >= 2) {
      const matches = allUsers.filter(user => 
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 5);
      setOwnerSearchResults(matches);
      setShowOwnerDropdown(matches.length > 0);
    } else {
      setOwnerSearchResults([]);
      setShowOwnerDropdown(false);
    }
  };

  const handleSelectOwner = (user) => {
    setSelectedOwner(user);
    setFranchiseData({
      ...franchiseData, 
      owner_email: user.email,
      contact_phone: user.phone_number || franchiseData.contact_phone,
      owner_user_id: user.id
    });
    setShowOwnerDropdown(false);
    setOwnerSearchResults([]);
  };

  const handleCreateInfomarian = async () => {
    const expertise = infomarianData.expertise_areas
      .split(',')
      .map(e => e.trim())
      .filter(e => e);
    
    const postcodes = infomarianData.assigned_postcodes
      .split(',')
      .map(p => p.trim())
      .filter(p => p);

    // Update User record if email or name was modified
    if (infomarianData.selected_user_id) {
      const originalUser = allUsers.find(u => u.id === infomarianData.selected_user_id);
      if (originalUser && (originalUser.email !== infomarianData.user_email || originalUser.full_name !== infomarianData.full_name)) {
        await updateUserRecord.mutateAsync({
          userId: infomarianData.selected_user_id,
          userData: {
            email: infomarianData.user_email,
            full_name: infomarianData.full_name
          }
        });
      }
    }

    createInfomarian.mutate({
      ...infomarianData,
      expertise_areas: expertise,
      assigned_postcodes: postcodes,
      status: 'active',
      total_earnings: 0
    });
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 p-8">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500">You don't have permission to manage franchises.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

                <div className="space-y-2">
                  <Label htmlFor="state">State/Territory</Label>
                  <Input
                    id="state"
                    value={franchiseData.state}
                    onChange={(e) => setFranchiseData({...franchiseData, state: e.target.value})}
                    placeholder="e.g., NSW"
                  />
                </div>

                {/* Owner Search Section */}
                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-semibold text-slate-900">Search & Select Franchise Owner</h4>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="owner_email">Search Registered User</Label>
                    <div className="relative">
                      <Input
                        id="owner_email"
                        type="text"
                        value={franchiseData.owner_email}
                        onChange={(e) => handleOwnerSearch(e.target.value)}
                        onFocus={() => {
                          if (ownerSearchResults.length > 0) setShowOwnerDropdown(true);
                        }}
                        placeholder="Search by name or email..."
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                    
                    {showOwnerDropdown && ownerSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                        {ownerSearchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectOwner(user)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            {user.phone_number && (
                              <p className="text-xs text-slate-400">{user.phone_number}</p>
                            )}
                            {user.user_role && (
                              <Badge className="mt-1 text-xs bg-slate-100 text-slate-600">
                                {user.user_role}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedOwner && (
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                      <CardContent className="p-4">
                        <h5 className="font-semibold text-indigo-900 mb-3">Selected Owner - Confirm Details</h5>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-indigo-600 font-medium">Full Name</p>
                            <p className="text-indigo-900 font-semibold">{selectedOwner.full_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-indigo-600 font-medium">Email</p>
                            <p className="text-indigo-900 font-semibold">{selectedOwner.email}</p>
                          </div>
                          <div>
                            <p className="text-indigo-600 font-medium">Phone</p>
                            <p className="text-indigo-900 font-semibold">{selectedOwner.phone_number || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-indigo-600 font-medium">User Role</p>
                            <p className="text-indigo-900 font-semibold">{selectedOwner.user_role || 'voter'}</p>
                          </div>
                          {selectedOwner.date_of_birth && (
                            <div>
                              <p className="text-indigo-600 font-medium">Date of Birth</p>
                              <p className="text-indigo-900 font-semibold">{selectedOwner.date_of_birth}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4 p-3 bg-white rounded-lg border border-slate-200">
                          <input
                            type="checkbox"
                            id="confirm-owner-details"
                            checked={ownerDetailsConfirmed}
                            onChange={(e) => setOwnerDetailsConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <label htmlFor="confirm-owner-details" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Are these details correct?
                          </label>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOwner(null);
                            setOwnerDetailsConfirmed(false);
                            setFranchiseData({...franchiseData, owner_email: '', contact_phone: '', owner_user_id: null});
                          }}
                          className="mt-3 text-red-600 hover:text-red-700"
                        >
                          Clear Selection
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {franchiseData.owner_user_id && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Registered User Email</Label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">{franchiseData.owner_email}</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Any changes to email or contact phone will update the master user record
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          // Commit owner selection - this locks in the owner
                          alert('Owner confirmed and saved to franchise data');
                        }}
                        disabled={!ownerDetailsConfirmed}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Commit Owner Selection
                      </Button>
                    </div>
                  )}
                </div>

                {/* Create Franchise Section */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-slate-900 mb-4">Create Franchise</h4>
                  <Button
                    onClick={handleCreateFranchise}
                    disabled={!franchiseData.franchise_name || !franchiseData.postcode || !franchiseData.state || !franchiseData.owner_email}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Franchise
                  </Button>
                </div>
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
                  <div className="space-y-2 relative">
                    <Label htmlFor="full_name">Full Name</Label>
                    <div className="relative">
                      <Input
                        id="full_name"
                        value={infomarianData.full_name}
                        onChange={(e) => handleNameSearch(e.target.value)}
                        onFocus={() => {
                          if (nameSearchResults.length > 0) setShowNameDropdown(true);
                        }}
                        placeholder="Search registered users..."
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                    
                    {showNameDropdown && nameSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                        {nameSearchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUserByName(user)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            {user.user_role && (
                              <Badge className="mt-1 text-xs bg-slate-100 text-slate-600">
                                {user.user_role}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="user_email">Email</Label>
                    <div className="relative">
                      <Input
                        id="user_email"
                        type="email"
                        value={infomarianData.user_email}
                        onChange={(e) => handleUserEmailSearch(e.target.value)}
                        onFocus={() => {
                          if (userSearchResults.length > 0) setShowUserDropdown(true);
                        }}
                        placeholder="Search registered users..."
                        className="pr-10"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                    
                    {showUserDropdown && userSearchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelectUser(user)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <p className="font-medium text-slate-900">{user.full_name || 'No name'}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                            {user.user_role && (
                              <Badge className="mt-1 text-xs bg-slate-100 text-slate-600">
                                {user.user_role}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {infomarianData.selected_user_id && (
                    <div className="space-y-2">
                      <Label>Registered User Email</Label>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">{infomarianData.user_email}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Any changes to email or name will update the master user record
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="infomarian_id">Infomarian ID</Label>
                    <Input
                      id="infomarian_id"
                      value={infomarianData.infomarian_id}
                      disabled
                      placeholder="Auto-generated"
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">Auto-generated from Franchise + User + Sequential</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="franchise_id">Franchise ID</Label>
                    <select
                      id="franchise_id"
                      value={infomarianData.franchise_id}
                      onChange={(e) => {
                        const franchiseId = e.target.value;
                        const userId = allUsers.find(u => u.email === infomarianData.user_email)?.id;
                        const generatedId = generateInfomarianId(franchiseId, userId);
                        setInfomarianData({
                          ...infomarianData, 
                          franchise_id: franchiseId,
                          infomarian_id: generatedId
                        });
                      }}
                      className="w-full h-10 px-3 rounded-md border border-slate-200"
                    >
                      <option value="">Select franchise...</option>
                      {franchises.map(f => (
                        <option key={f.id} value={f.id}>{f.franchise_name} ({f.id})</option>
                      ))}
                    </select>
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
                    <option value="all">All Levels</option>
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