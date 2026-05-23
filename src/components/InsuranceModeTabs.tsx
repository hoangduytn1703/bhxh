import { Banknote, Clock, Calculator, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export type InsuranceTab = 'bhxh' | 'pension' | 'unemployment' | 'maternity';

const TABS: {
  id: InsuranceTab;
  label: string;
  icon: typeof Banknote;
  activeClass: string;
  iconActiveClass: string;
}[] = [
  {
    id: 'bhxh',
    label: 'BHXH Một Lần',
    icon: Banknote,
    activeClass: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-200/80',
    iconActiveClass: 'text-white',
  },
  {
    id: 'pension',
    label: 'Hưu Trí Dự Phòng',
    icon: Clock,
    activeClass: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-200/80',
    iconActiveClass: 'text-white',
  },
  {
    id: 'unemployment',
    label: 'Bảo Hiểm Thất Nghiệp',
    icon: Calculator,
    activeClass: 'bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-md shadow-blue-200/80',
    iconActiveClass: 'text-white',
  },
  {
    id: 'maternity',
    label: 'Chế Độ Thai Sản',
    icon: Sparkles,
    activeClass: 'bg-gradient-to-br from-pink-400 to-rose-500 text-white shadow-md shadow-pink-200/80',
    iconActiveClass: 'text-white',
  },
];

type InsuranceModeTabsProps = {
  activeTab: InsuranceTab;
  onChange: (tab: InsuranceTab) => void;
};

export function InsuranceModeTabs({ activeTab, onChange }: InsuranceModeTabsProps) {
  return (
    <div className="px-4 sm:px-6 pt-4 pb-0 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer outline-none border',
                isActive
                  ? cn(tab.activeClass, 'border-transparent scale-[1.02]')
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 shadow-sm'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive ? tab.iconActiveClass : 'text-slate-400'
                )}
              />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
