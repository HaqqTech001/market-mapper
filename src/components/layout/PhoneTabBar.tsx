import React from 'react';
import { Home, MapPin, Flag, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppRoute } from '../../types';

export const PhoneTabBar: React.FC = () => {
  const { currentRoute, navigateTo, unreadNotifsCount } = useApp();

  const tabs: { route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { route: 'home', label: 'Home', icon: Home },
    { route: 'map', label: 'Map', icon: MapPin },
    { route: 'missions', label: 'Missions', icon: Flag },
    { route: 'chat', label: 'Chat', icon: MessageSquare },
    { route: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav
      id="phone-tab-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 py-1 px-2 safe-area-bottom shadow-lg select-none"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentRoute === tab.route ||
            (tab.route === 'more' &&
              ['offline', 'revisits', 'guide', 'profile', 'admin'].includes(currentRoute));

          return (
            <button
              key={tab.route}
              id={`tab-${tab.route}`}
              onClick={() => navigateTo(tab.route)}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[58px] min-h-[44px] rounded-xl transition-all cursor-pointer relative ${
                isActive ? 'text-emerald-800 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-emerald-700' : 'text-zinc-500'
                  }`}
                />
                {tab.route === 'more' && unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-orange-600" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
