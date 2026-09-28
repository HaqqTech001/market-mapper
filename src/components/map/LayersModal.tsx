import React from 'react';
import {
  X,
  Layers,
  Store,
  Navigation,
  GitBranch,
  MapPin,
  Flag,
  Wrench,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { LayerVisibilityState } from '../../types';

interface LayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  mapType: 'standard' | 'satellite' | 'offline_vector';
  onChangeMapType: (type: 'standard' | 'satellite' | 'offline_vector') => void;
}

export const LayersModal: React.FC<LayersModalProps> = ({
  isOpen,
  onClose,
  layers,
  onToggleLayer,
  mapType,
  onChangeMapType,
}) => {
  if (!isOpen) return null;

  const layerItems: Array<{
    key: keyof LayerVisibilityState;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'showPaths',
      label: 'Recorded Corridors & Paths',
      description: 'Footpaths, lines, and alleyways',
      icon: <Navigation className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'showJunctions',
      label: 'Junctions & Nodes',
      description: 'Intersection nodes and reference points',
      icon: <GitBranch className="w-4 h-4 text-amber-400" />,
    },
    {
      key: 'showBusinesses',
      label: 'Mapped Businesses & Stalls',
      description: 'Verified shops, stalls, and traders',
      icon: <Store className="w-4 h-4 text-sky-400" />,
    },
    {
      key: 'showGates',
      label: 'Market Gates & Entrances',
      description: 'Main gates, pedestrian gates, cargo points',
      icon: <Compass className="w-4 h-4 text-indigo-400" />,
    },
    {
      key: 'showAreas',
      label: 'Market & Area Boundaries',
      description: 'Section polygons and assigned boundaries',
      icon: <MapPin className="w-4 h-4 text-purple-400" />,
    },
    {
      key: 'showLandmarks',
      label: 'Landmarks & Key Points',
      description: 'Transformers, mosques, water points',
      icon: <Flag className="w-4 h-4 text-rose-400" />,
    },
    {
      key: 'showFacilities',
      label: 'Facilities & Utilities',
      description: 'Toilets, loading bays, security posts',
      icon: <Wrench className="w-4 h-4 text-teal-400" />,
    },
    {
      key: 'showRevisits',
      label: 'Revisits & Data Issues',
      description: 'Flagged pins requiring re-survey',
      icon: <AlertCircle className="w-4 h-4 text-orange-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-slate-900">
      <div
        id="layers-modal"
        className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-black text-slate-900">Map Layers & Basemap</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Basemap Styles */}
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Basemap Presentation
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'standard', label: 'Standard Field' },
                { id: 'satellite', label: 'Satellite Hybrid' },
                { id: 'offline_vector', label: 'Offline Vector' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => onChangeMapType(style.id as any)}
                  className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer min-h-[44px] ${
                    mapType === style.id
                      ? 'bg-emerald-100 border-emerald-600 text-emerald-950 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Field Workspace Layers
            </span>

            {layerItems.map((item) => {
              const isChecked = layers[item.key];
              return (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200">
                      {item.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-900">{item.label}</span>
                      <span className="text-[10px] text-slate-600 block font-medium">{item.description}</span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleLayer(item.key)}
                    className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer min-h-[44px]"
        >
          Close Layers
        </button>
      </div>
    </div>
  );
};
