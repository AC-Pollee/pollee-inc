import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, MessageSquare, Vote, Users, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function ReputationScore({ user }) {
  const { t } = useTranslation();
  const score = user?.reputation_score || 100;
  const breakdown = user?.reputation_breakdown || {};
  const level = user?.reputation_level || 'newcomer';

  const levelConfig = {
    newcomer: { label: 'Newcomer', color: 'bg-slate-500', range: '0-100', icon: Users },
    member: { label: 'Member', color: 'bg-blue-500', range: '101-250', icon: MessageSquare },
    contributor: { label: 'Contributor', color: 'bg-indigo-500', range: '251-500', icon: TrendingUp },
    trusted: { label: 'Trusted', color: 'bg-purple-500', range: '501-750', icon: Award },
    champion: { label: 'Champion', color: 'bg-amber-500', range: '751-1000', icon: Award }
  };

  const currentLevel = levelConfig[level];
  const LevelIcon = currentLevel.icon;
  const progressPercent = Math.min((score / 1000) * 100, 100);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <LevelIcon className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">{t('reputation.title')}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2"
            >
              {score}
            </motion.div>
            <div className="flex items-center justify-center gap-2">
              <Badge className={`${currentLevel.color} text-white px-4 py-1`}>
                <LevelIcon className="w-4 h-4 mr-1" />
                {currentLevel.label}
              </Badge>
              <span className="text-sm text-slate-500">({currentLevel.range} points)</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{t('reputation.progressToNextLevel')}</span>
              <span className="font-semibold">{progressPercent.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Positive Contributions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              {t('reputation.positiveContributions')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Vote className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">{t('reputation.verifiedVotes')}</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{breakdown.verified_votes || 0}</p>
                <p className="text-xs text-green-600">+5 points each</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">{t('reputation.approvedComments')}</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{breakdown.approved_comments || 0}</p>
                <p className="text-xs text-blue-600">+3 points each</p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs text-indigo-700 font-medium">{t('reputation.delegationsGiven')}</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{breakdown.successful_delegations || 0}</p>
                <p className="text-xs text-indigo-600">+10 points each</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span className="text-xs text-purple-700 font-medium">{t('reputation.delegationsReceived')}</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{breakdown.received_delegations || 0}</p>
                <p className="text-xs text-purple-600">+15 points each</p>
              </div>
            </div>
          </div>

          {/* Negative Actions */}
          {breakdown.flagged_content > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {t('reputation.conductIssues')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <span className="text-xs text-red-700 font-medium">Flagged Content</span>
                  <p className="text-2xl font-bold text-red-900">{breakdown.flagged_content}</p>
                  <p className="text-xs text-red-600">-3 points each</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}