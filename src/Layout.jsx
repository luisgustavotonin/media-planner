import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from './components/hooks/useAuth';
import { Menu, X, ChevronRight, ChevronDown, LogOut, Briefcase } from 'lucide-react';
import { APP_MODULES } from '@/lib/appModules';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const mainNav = APP_MODULES.filter(m => m.group === 'Operacional');
const adminNav = APP_MODULES.filter(m => m.group === 'Administrativo');

export default function Layout({ children, currentPageName }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user?.role || 'user';

  const filteredMain = mainNav.filter(item => item.roles.includes(role));
  const filteredAdmin = adminNav.filter(item => item.roles.includes(role));
  const [adminOpen, setAdminOpen] = useState(() => filteredAdmin.some(item => item.page === currentPageName));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground tracking-wide">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-sidebar-border">
            <div className="text-base font-semibold text-[#f85d07]">
              Media Planner <span className="inline-flex items-baseline gap-[1px]"><span className="text-[10px] text-[#7e6951] font-medium [font-family:'Albert_Sans',_sans-serif] translate-y-[2px]">by</span><span className="text-[#312b1d]">IDK</span></span>
            </div>
            <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-sidebar-foreground/60" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {filteredMain.map(item => {
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'}`} />
                  {item.label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary" />}
                </Link>
              );
            })}

            {filteredAdmin.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setAdminOpen(o => !o)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-all"
                >
                  <Briefcase className="w-4 h-4 text-sidebar-foreground/50" />
                  Administrativo
                  <ChevronDown className={`w-3.5 h-3.5 ml-auto text-sidebar-foreground/40 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                </button>
                {adminOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-sidebar-border space-y-0.5">
                    {filteredAdmin.map(item => {
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-primary'
                              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/40'}`} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-semibold text-sidebar-foreground">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{role}</p>
              </div>
              <button 
                onClick={() => base44.auth.logout()}
                className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/50" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-sidebar border-b border-sidebar-border">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5">
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          </button>
          <div className="text-sm font-semibold text-[#f85d07] ml-3">
            Media Planner <span className="inline-flex items-baseline gap-[1px]"><span className="text-[9px] text-[#7e6951] font-medium [font-family:'Albert_Sans',_sans-serif] translate-y-[2px]">by</span><span className="text-[#312b1d]">IDK</span></span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}