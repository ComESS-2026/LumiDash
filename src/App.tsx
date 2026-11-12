import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Loader2, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import Sidebar, { NAV_ITEMS } from '@/components/layout/Sidebar';
import type { PageId } from '@/components/layout/Sidebar';
import OverviewPage from '@/pages/OverviewPage';
import MembersPage from '@/pages/MembersPage';
import EventsPage from '@/pages/EventsPage';
import AuthPage from '@/pages/AuthPage';
import { useAuth } from '@/contexts/AuthContext';
import ToastStack from '@/components/notifications/ToastStack';
import NotificationBell from '@/components/notifications/NotificationBell';

const PAGES: Record<PageId, ComponentType<{ onNavigate: (page: PageId) => void }>> = {
  overview: OverviewPage,
  members: MembersPage,
  events: EventsPage,
};

function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return <Dashboard userEmail={user.email ?? ''} onSignOut={signOut} />;
}

interface DashboardProps {
  userEmail: string;
  onSignOut: () => void;
}

function Dashboard({ userEmail, onSignOut }: DashboardProps) {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    document.title = `${NAV_ITEMS.find((item) => item.id === activePage)?.label} | ClubHub`;
  }, [activePage]);

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0 });
  };

  const ActivePage = PAGES[activePage];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <ToastStack />
      <Sidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        userEmail={userEmail}
        onNavigate={handleNavigate}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={onSignOut}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-slate-900 dark:text-white lg:hidden">LumiDash</span>
          <span className="hidden text-sm font-semibold text-slate-900 dark:text-white lg:inline">
            {NAV_ITEMS.find((item) => item.id === activePage)?.label}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="lg:hidden">
              <NotificationBell align="right" tone="header" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
          <ActivePage key={activePage} onNavigate={handleNavigate} />
        </main>
      </div>
    </div>
  );
}

export default App;
