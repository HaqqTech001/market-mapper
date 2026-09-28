import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { Header, Card, Button, Badge, Chip } from '../../components/ui';
import { RotateCcw, MapPin, CheckCircle2, Clock, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { RevisitReason } from '../../types';
import { BusinessRepository } from '../../db';

interface DisplayRevisit {
  id: string;
  entityTitle: string;
  reason: string;
  location: string;
  notes?: string;
  flaggedAt: string;
  status: string;
}

export const RevisitsScreen: React.FC = () => {
  const {
    isOffline,
    toggleOffline,
    syncStatus,
    pendingSyncCount,
    unreadNotifsCount,
    goBack,
    navigateTo,
    refreshDbStats,
  } = useApp();

  const [filter, setFilter] = useState<string>('all');
  const [revisits, setRevisits] = useState<DisplayRevisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRevisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const dbRevisits = await BusinessRepository.getAllRevisits();
      if (dbRevisits.length > 0) {
        setRevisits(
          dbRevisits.map((r) => ({
            id: r.id,
            entityTitle: r.entityTitle,
            reason: r.reason,
            location: 'Alaba International Market',
            notes: r.notes || 'No extra notes provided by mapper.',
            flaggedAt: new Date(r.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: r.status,
          }))
        );
      } else {
        // Fallback default demonstration seed
        setRevisits([
          {
            id: 'rev_01',
            entityTitle: 'Stall 19 — Baba Solar Batteries',
            reason: 'locked_shop',
            location: 'Line B, Alaba International Market',
            notes: 'Shop was padlocked at 10:15 AM. Neighbor states trader usually arrives after Zuhr prayer (~2:30 PM).',
            flaggedAt: 'Today, 10:20 AM',
            status: 'open',
          },
          {
            id: 'rev_02',
            entityTitle: 'Chukwuma Cable Works',
            reason: 'owner_busy',
            location: 'Line A, Stall 04',
            notes: 'Trader was actively offloading a 40ft container. Requested return in the late afternoon.',
            flaggedAt: 'Today, 09:40 AM',
            status: 'open',
          },
          {
            id: 'rev_03',
            entityTitle: 'Junction J4 Corridor Intersection',
            reason: 'poor_gps',
            location: 'Under Heavy Zinc Canopy, Sector 4',
            notes: 'GPS accuracy degraded to ±12.4m under zinc roof. Checkpoint needs re-measuring from open alley.',
            flaggedAt: 'Yesterday',
            status: 'open',
          },
        ]);
      }
    } catch (err) {
      console.warn('Failed to load revisits from SQLite:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevisits();
  }, [loadRevisits]);

  const handleResolve = async (id: string) => {
    try {
      await BusinessRepository.resolveRevisit(id);
      await refreshDbStats();
    } catch (err) {
      console.warn('Failed resolving in SQLite:', err);
    }
    setRevisits((prev) => prev.filter((r) => r.id !== id));
  };

  const filtered =
    filter === 'all' ? revisits : revisits.filter((r) => r.reason === filter);

  return (
    <div className="flex flex-col grow">
      <Header
        title="Revisits Queue"
        subtitle="Field entities flagged for re-inspection"
        showBack
        onBack={goBack}
        isOffline={isOffline}
        onToggleOffline={toggleOffline}
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        unreadNotifsCount={unreadNotifsCount}
      />

      <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-4 grow">
        {/* Reason Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Chip
            label="All Flags"
            selected={filter === 'all'}
            onClick={() => setFilter('all')}
            count={revisits.length}
          />
          <Chip
            label="Locked Stall"
            selected={filter === 'locked_shop'}
            onClick={() => setFilter('locked_shop')}
          />
          <Chip
            label="Owner Busy"
            selected={filter === 'owner_busy'}
            onClick={() => setFilter('owner_busy')}
          />
          <Chip
            label="Poor GPS"
            selected={filter === 'poor_gps'}
            onClick={() => setFilter('poor_gps')}
          />
          <Chip
            label="Consent Needed"
            selected={filter === 'owner_consent_needed'}
            onClick={() => setFilter('owner_consent_needed')}
          />
          <Chip
            label="Details Missing"
            selected={filter === 'details_missing'}
            onClick={() => setFilter('details_missing')}
          />
        </div>

        {/* List of Revisit Items */}
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} padding="md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" size="sm">
                      {item.reason.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-[11px] text-zinc-400">{item.flaggedAt}</span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 mt-1">{item.entityTitle}</h3>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(item.id)}
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigateTo('map')}
                  >
                    Locate on Map
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <p className="mt-3 pt-2.5 border-t border-zinc-100 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl">
                <strong className="text-zinc-800 font-semibold">Mapper Notes: </strong>
                {item.notes}
              </p>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-zinc-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-zinc-900">No Pending Revisits</h4>
              <p className="text-xs text-zinc-500 mt-1">All flagged stalls have been resolved.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
