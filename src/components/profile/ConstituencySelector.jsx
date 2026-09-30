import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ConstituencySelector
 * Lets a user pick the franchise (constituency) they belong to.
 * The "default" constituency — derived from the franchise of the Infomarian
 * whose infomarian_id matches the user's — is highlighted (badged + pre-selected)
 * when the dropdown is activated.
 *
 * Props:
 *  - value: currently saved franchise_id (string | undefined)
 *  - infomarianId: the user's infomarian_id (used to derive the default)
 *  - onChange: (franchiseId: string) => void
 */
export default function ConstituencySelector({ value, infomarianId, onChange }) {
  const { t } = useTranslation();

  const { data: franchises = [], isLoading: franchisesLoading } = useQuery({
    queryKey: ['franchises-active'],
    queryFn: async () => {
      const all = await base44.entities.Franchise.list();
      return all.filter((f) => f.status === 'active');
    },
  });

  const { data: infomarians = [] } = useQuery({
    queryKey: ['infomarians-all'],
    queryFn: () => base44.entities.Infomarian.list(),
  });

  // Derive the default constituency from the user's Infomarian's franchise.
  const defaultFranchiseId = useMemo(() => {
    if (!infomarianId) return null;
    const inf = infomarians.find((i) => i.infomarian_id === infomarianId);
    return inf?.franchise_id || null;
  }, [infomarianId, infomarians]);

  const defaultFranchise = useMemo(
    () => franchises.find((f) => f.id === defaultFranchiseId) || null,
    [franchises, defaultFranchiseId]
  );

  // The effective selection: explicit choice, else the derived default.
  const effectiveValue = value || defaultFranchiseId || undefined;

  if (franchisesLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          {t('profile.constituency', { defaultValue: 'Constituency' })}
        </Label>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="franchise_id" className="text-base font-semibold">
        {t('profile.constituency', { defaultValue: 'Constituency' })}{' '}
        <span className="text-red-500">*</span>
      </Label>

      <Select
        value={effectiveValue || ''}
        onValueChange={(v) => onChange(v === defaultFranchiseId ? '' : v)}
      >
        <SelectTrigger id="franchise_id" className="h-12 rounded-lg">
          <SelectValue
            placeholder={
              defaultFranchise
                ? t('profile.constituencyDefaultPlaceholder', {
                    defaultValue: 'Select… (default: {{name}})',
                    name: defaultFranchise.franchise_name,
                  })
                : t('profile.constituencyPlaceholder', {
                    defaultValue: 'Select your constituency',
                  })
            }
          />
        </SelectTrigger>

        <SelectContent>
          {franchises.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">
              {t('profile.noConstituencies', {
                defaultValue: 'No constituencies available.',
              })}
            </div>
          )}

          {franchises.map((f) => {
            const isDefault = f.id === defaultFranchiseId;
            const isSelected = f.id === effectiveValue;
            return (
              <SelectItem
                key={f.id}
                value={f.id}
                className={
                  isDefault
                    ? 'bg-indigo-50/60 font-semibold data-[state=checked]:bg-indigo-100'
                    : ''
                }
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {f.franchise_name}
                    {f.postcode && (
                      <span className="text-xs text-slate-400">
                        ({f.postcode})
                      </span>
                    )}
                  </span>
                  {isDefault && (
                    <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0">
                      {t('profile.default', { defaultValue: 'Default' })}
                    </Badge>
                  )}
                  {isSelected && !isDefault && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">
                      {t('profile.selected', { defaultValue: 'Selected' })}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <p className="text-xs text-slate-500">
        {defaultFranchise
          ? t('profile.constituencyDefaultHint', {
              defaultValue:
                'Your default constituency is "{{name}}" (from your Infomarian). Pick another only if you belong to a different constituency.',
              name: defaultFranchise.franchise_name,
            })
          : t('profile.constituencyHint', {
              defaultValue:
                'Choose the constituency you belong to. A default appears once you set your Infomarian ID.',
            })}
      </p>
    </div>
  );
}