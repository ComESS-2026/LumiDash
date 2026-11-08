import { CalendarDays, GraduationCap, LayoutDashboard, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PageId = 'overview' | 'members' | 'events';

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'events', label: 'Events', icon: CalendarDays },
];

interface SidebarProps {
  activePage: PageId;
  isOpen: boolean;
  onNavigate: (page: PageId) => void;
  onClose: () => void;
}

export default function Sidebar({ activePage, isOpen, onNavigate, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 text-slate-300 transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">LumiDash</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="px-6 pb-2 pt-4 text-xs font-medium uppercase tracking-wider text-slate-500">
          Club workspace
        </p>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition ${
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {item.label}
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
          Manage members and events in one place.
        </div>
      </aside>
    </>
  );
}
