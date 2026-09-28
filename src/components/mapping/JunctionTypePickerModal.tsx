import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Sliders, GitBranch, ArrowUpRight } from 'lucide-react';
import { JunctionType, LocationCoordinates } from '../../types';
import { JunctionSchematic } from './JunctionSchematic';
import { generateDefaultBranchesForType } from '../../lib/junctions/branchManager';

export interface JunctionTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (junctionData: {
    junctionType: JunctionType;
    operationalLabel: string;
    name?: string;
    latitude: number;
    longitude: number;
  }) => void;
  currentLocation: LocationCoordinates | null;
  isRecordingActive?: boolean;
}

interface JunctionOption {
  type: JunctionType;
  label: string;
  description: string;
}

const JUNCTION_OPTIONS: JunctionOption[] = [
  {
    type: 't_junction',
    label: 'T-Junction',
    description: 'Perpendicular T-split (3 branches)',
  },
  {
    type: 'cross_4way',
    label: 'Cross / 4-Way',
    description: '4-way intersection (4 branches)',
  },
  {
    type: 'y_fork',
    label: 'Y / Fork',
    description: 'Angled bifurcation (3 branches)',
  },
  {
    type: 'irregular_3way',
    label: 'Irregular 3-Way',
    description: 'Asymmetric 3-way split (3 branches)',
  },
  {
    type: 'multi_way',
    label: 'Multi-Way',
    description: '5+ way complex plaza/hub',
  },
  {
    type: 'corner_bend',
    label: 'Corner / Bend',
    description: 'Sharp angle or corridor bend (2 branches)',
  },
  {
    type: 'dead_end',
    label: 'Dead End',
    description: 'Terminal corridor or cul-de-sac (1 branch)',
  },
  {
    type: 'unknown',
    label: 'Custom Node',
    description: 'General node or unclassified branch',
  },
];

export const JunctionTypePickerModal: React.FC<JunctionTypePickerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentLocation,
  isRecordingActive,
}) => {
  const [selectedType, setSelectedType] = useState<JunctionType>('t_junction');
  const [displayName, setDisplayName] = useState<string>('');
  const [latitude, setLatitude] = useState<number>(currentLocation?.latitude || 6.4698);
  const [longitude, setLongitude] = useState<number>(currentLocation?.longitude || 3.1925);
  const [showAdjustCoords, setShowAdjustCoords] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && currentLocation) {
      setLatitude(currentLocation.latitude);
      setLongitude(currentLocation.longitude);
    }
  }, [isOpen, currentLocation]);

  if (!isOpen) return null;

  const predictedBranches = generateDefaultBranchesForType('temp_junc', selectedType);

  const handleSave = () => {
    const defaultLabel = `Junction J${Math.floor(Math.random() * 899 + 100)}`;
    onSave({
      junctionType: selectedType,
      operationalLabel: defaultLabel,
      name: displayName.trim() || undefined,
      latitude,
      longitude,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - High contrast daylight styled */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-slate-900">
                Mark Junction Node
              </h2>
              {isRecordingActive && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Active Path
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Schematic geometry and branch corridors for daylight readability
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 bg-white">
          {/* Visual Schematic Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Junction Schematic (Select Geometry)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {JUNCTION_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={`flex flex-col items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer text-center min-h-[118px] ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-md ring-2 ring-emerald-500/30'
                        : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 text-slate-900 shadow-xs'
                    }`}
                  >
                    <div className="my-auto p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <JunctionSchematic type={opt.type} size="md" isSelected={isSelected} />
                    </div>
                    <span className="text-xs font-bold tracking-tight leading-tight mt-1">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Branch Breakdown Preview */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                Branch Tracking Plan ({predictedBranches.length} corridors)
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2.5">
              Arrival corridor is marked mapped; onward corridors are registered for field tracking:
            </p>
            <div className="space-y-1.5">
              {predictedBranches.map((br) => (
                <div
                  key={br.id}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-white rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        br.status === 'mapped' ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-bold text-slate-900">{br.label}</span>
                    {br.relativeSide && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold">
                        {br.relativeSide}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      br.status === 'mapped'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {br.status === 'mapped' ? 'Arrival (Mapped)' : 'To Explore'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">
                  GPS Position Proposed
                </span>
                {currentLocation?.accuracy && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                    ±{Math.round(currentLocation.accuracy)}m
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustCoords(!showAdjustCoords)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showAdjustCoords ? 'Hide Nudge' : 'Adjust Coordinates'}
              </button>
            </div>

            <div className="mt-2 text-xs font-mono text-slate-700 flex gap-4 font-bold">
              <span>Lat: {latitude.toFixed(6)}</span>
              <span>Lng: {longitude.toFixed(6)}</span>
            </div>

            {showAdjustCoords && (
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || latitude)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || longitude)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Name / Local Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Junction Name / Local Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. North Gate Corridor Turn, Central Square Junction"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 text-sm font-black text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Confirm Junction & Record Node
          </button>
        </div>
      </div>
    </div>
  );
};

