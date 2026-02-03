import React from 'react';
import { ShoppingCart, History, Cloud, Settings, LogOut } from 'lucide-react';
import { Screen } from '../App';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export default function Navigation({ currentScreen, onNavigate, onLogout }: NavigationProps) {
  const navItems = [
    { id: 'sales' as Screen, label: 'Sales', icon: ShoppingCart },
    { id: 'history' as Screen, label: 'History', icon: History },
    { id: 'sync' as Screen, label: 'Sync', icon: Cloud },
    { id: 'settings' as Screen, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="bg-white border-b-2 border-gray-100 px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl p-3">
              <ShoppingCart className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-gray-800">Sika Ventures POS</h2>
          </div>
          
          <div className="flex gap-2 ml-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-6 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-5 h-5" strokeWidth={2.5} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
