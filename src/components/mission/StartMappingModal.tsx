import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { MapPin, Navigation, ArrowRight, Flag, Compass } from 'lucide-react';
import { Mission } from '../../types';

interface StartMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission;
  areaName?: string;
  startingPointName?: string;
  startingPointCoords?: { latitude: number; longitude: number };
  onBeginMapping: (choice: 'starting_point' | 'current_location') => void;
  onShowStartingPointOnMap?: () => void;
}

export const StartMappingModal: React.FC<StartMappingModalProps> = ({
  isOpen,
  onClose,
  mission,
  areaName = 'Gate 2 Frontage',
  startingPointName = 'North Gate Junction',
  onBeginMapping,
  onShowStartingPointOnMap,
}) => {
  const [selectedOption, setSelectedOption] = useState<'starting_point' | 'current_location'>('starting_point');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="START MAPPING"
      size="md"
    >
      <div className="space-y-4">
        {/* Mission Details Box */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Mission</span>
            <Badge variant="accent" size="sm">ACTIVE</Badge>
          </div>
          <h3 className="text-base font-black text-zinc-900">{mission.title}</h3>
          <p className="text-xs text-zinc-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{mission.marketName}</span>
          </p>

          <div className="pt-2.5 border-t border-zinc-200/80 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Assigned Area</span>
              <span className="font-bold text-zinc-900">{areaName}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-semibold">Assigned Starting Point</span>
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <Flag className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="truncate">{startingPointName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Operational Guidance Notice (Invariant: Do Not Force Exact Point) */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-0.5">Operational Guidance Notice</p>
          <p className="text-[11px] text-blue-800">
            The assigned starting point is recommended guidance. You are not required to stand on an exact GPS coordinate to begin mapping. Field realities (poor satellite reception, blocked gates, or market crowds) are fully supported.
          </p>
        </div>

        {/* Starting Location Choice */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-700 block">
            Choose Your Map Starting Location:
          </label>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectedOption('starting_point')}
              className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedOption === 'starting_point'
                  ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedOption === 'starting_point' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">Start at Assigned Starting Point</div>
                  <div className="text-[11px] text-zinc-500">{startingPointName}</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'starting_point' ? 'border-emerald-600' : 'border-zinc-300'
              }`}>
                {selectedOption === 'starting_point' && (
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOption('current_location')}
              className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                selectedOption === 'current_location'
                  ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedOption === 'current_location' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">Start Mapping From My Current Location</div>
                  <div className="text-[11px] text-zinc-500">Live GPS position on ground (preserves assignment reference)</div>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedOption === 'current_location' ? 'border-emerald-600' : 'border-zinc-300'
              }`}>
                {selectedOption === 'current_location' && (
                  <div className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Quick Map Preview Action */}
        {onShowStartingPointOnMap && (
          <button
            type="button"
            onClick={onShowStartingPointOnMap}
            className="w-full py-2.5 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>Show Starting Point on Map</span>
          </button>
        )}

        {/* CTAs */}
        <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onBeginMapping(selectedOption)}
            icon={<ArrowRight className="w-4 h-4" />}
            className="min-h-[44px] px-5"
          >
            Begin Mapping
          </Button>
        </div>
      </div>
    </Modal>
  );
};
