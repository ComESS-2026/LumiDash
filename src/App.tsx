import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Menu } from 'lucide-react';
import Sidebar, { NAV_ITEMS } from '@/components/layout/Sidebar';
import type { PageId } from '@/components/layout/Sidebar';
import OverviewPage from '@/pages/OverviewPage';
import MembersPage from '@/pages/MembersPage';
import EventsPage from '@/pages/EventsPage';

const PAGES: Record<PageId, ComponentType<{ onNavigate: (page: PageId) => void }>> = {
  overview: OverviewPage,
  members: MembersPage,
  events: EventsPage,
};

function App() {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        onNavigate={handleNavigate}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-slate-900 dark:text-white">LumiDash</span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
          <ActivePage key={activePage} onNavigate={handleNavigate} />
        </main>
      </div>
    </div>
  );
}

export default App;
