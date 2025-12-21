import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, ChevronRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PollCard({ poll, voteCount }) {
  const isActive = poll.status === 'active';
  
  const { data: comments = [] } = useQuery({
    queryKey: ['poll-comments', poll.id],
    queryFn: async () => {
      const allComments = await base44.entities.Comment.list();
      return allComments.filter(c => c.poll_id === poll.id && c.moderation_status === 'approved');
    }
  });
  
  const commentCount = comments.length;
  
  return (
    <Card className="group relative overflow-hidden border-0 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <Badge 
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isActive ? 'Active' : 'Closed'}
          </Badge>
          
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{voteCount || 0}</span>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {poll.title}
        </h3>
        
        {poll.description && (
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">{poll.description}</p>
        )}
        
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            {poll.end_date && (
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Ends {format(new Date(poll.end_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            
            <Link to={createPageUrl(`Vote?pollId=${poll.id}`)}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 -mr-2"
              >
                Vote Now
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <Link to={createPageUrl(`Vote?pollId=${poll.id}`)}>
            <div className="flex items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {commentCount === 0 ? 'Start Discussion' : `${commentCount} ${commentCount === 1 ? 'Comment' : 'Comments'}`}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}