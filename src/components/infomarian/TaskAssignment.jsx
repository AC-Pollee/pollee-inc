import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function TaskAssignment({ infomarian }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('assigned');
  const [taskData, setTaskData] = useState({
    assigned_to_id: '',
    title: '',
    description: '',
    task_type: 'moderation',
    priority: 'medium',
    due_date: ''
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['allInfomarians'],
    queryFn: () => base44.entities.Infomarian.list()
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', infomarian.infomarian_id],
    queryFn: async () => {
      const tasks = await base44.entities.InfomarianTask.list('-created_date');
      return tasks.filter(t => t.assigned_to_id === infomarian.infomarian_id);
    }
  });

  const { data: assignedByMe = [] } = useQuery({
    queryKey: ['assignedByMe', infomarian.infomarian_id],
    queryFn: async () => {
      const tasks = await base44.entities.InfomarianTask.list('-created_date');
      return tasks.filter(t => t.assigned_by_id === infomarian.infomarian_id);
    }
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.InfomarianTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['assignedByMe']);
      setTaskData({
        assigned_to_id: '',
        title: '',
        description: '',
        task_type: 'moderation',
        priority: 'medium',
        due_date: ''
      });
    }
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.InfomarianTask.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['assignedByMe']);
    }
  });

  const handleCreateTask = () => {
    if (!taskData.assigned_to_id || !taskData.title.trim()) {
      alert('Please select an Infomarian and provide a task title');
      return;
    }

    const selectedInfomarian = infomarians.find(i => i.infomarian_id === taskData.assigned_to_id);
    
    createTask.mutate({
      ...taskData,
      assigned_to_name: selectedInfomarian?.full_name || '',
      assigned_by_id: infomarian.infomarian_id,
      assigned_by_name: infomarian.full_name,
      status: 'pending'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default: return <ClipboardList className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t('taskAssignment.assignNewTask')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <select
                value={taskData.assigned_to_id}
                onChange={(e) => setTaskData({...taskData, assigned_to_id: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
              >
                <option value="">Select Infomarian</option>
                {infomarians.filter(i => i.infomarian_id !== infomarian.infomarian_id).map(i => (
                  <option key={i.id} value={i.infomarian_id}>
                    {i.full_name} ({i.infomarian_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Task Type</Label>
              <select
                value={taskData.task_type}
                onChange={(e) => setTaskData({...taskData, task_type: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
              >
                <option value="moderation">Moderation</option>
                <option value="user_support">User Support</option>
                <option value="content_creation">Content Creation</option>
                <option value="poll_management">Poll Management</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              placeholder="Brief task description"
              value={taskData.title}
              onChange={(e) => setTaskData({...taskData, title: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Detailed task instructions..."
              value={taskData.description}
              onChange={(e) => setTaskData({...taskData, description: e.target.value})}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <select
                value={taskData.priority}
                onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                className="w-full h-10 px-3 rounded-md border border-slate-200"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={taskData.due_date}
                onChange={(e) => setTaskData({...taskData, due_date: e.target.value})}
              />
            </div>
          </div>

          <Button
            onClick={handleCreateTask}
            disabled={!taskData.assigned_to_id || !taskData.title.trim() || createTask.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Task
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
          <TabsTrigger value="assigned">My Tasks ({myTasks.filter(t => t.status !== 'completed').length})</TabsTrigger>
          <TabsTrigger value="created">Assigned by Me ({assignedByMe.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6 space-y-4">
          {myTasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-slate-500">
                No tasks assigned to you
              </CardContent>
            </Card>
          ) : (
            myTasks.map(task => (
              <Card key={task.id} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge className="capitalize">{task.task_type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 mb-3">{task.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Assigned by: {task.assigned_by_name}</span>
                    {task.due_date && (
                      <span className="text-slate-500">Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}</span>
                    )}
                  </div>

                  {task.status !== 'completed' && (
                    <div className="flex gap-2 mt-4">
                      {task.status === 'pending' && (
                        <Button size="sm" onClick={() => updateTaskStatus.mutate({ id: task.id, status: 'in_progress' })}>
                          Start Task
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => updateTaskStatus.mutate({ id: task.id, status: 'completed' })}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="created" className="mt-6 space-y-4">
          {assignedByMe.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-slate-500">
                You haven't assigned any tasks yet
              </CardContent>
            </Card>
          ) : (
            assignedByMe.map(task => (
              <Card key={task.id} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge className={
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 mb-3">{task.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Assigned to: {task.assigned_to_name}</span>
                    {task.due_date && (
                      <span className="text-slate-500">Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}