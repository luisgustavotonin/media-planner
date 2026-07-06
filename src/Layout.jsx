import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from './components/hooks/useAuth';
import { 
  LayoutDashboard, Building2, BarChart3, Target, 
  FlaskConical, CalendarDays, Settings, Menu, X, 
  ChevronRight, LogOut, Activity, GitBranch, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'consultant', 'user'] },
  { name: 'Clientes', page: 'Clients', icon: Building2, roles: ['admin', 'consultant', 'user'] },
  { name: 'Planos de Mídia', page: 'MediaPlans', icon: BarChart3, roles: ['admin', 'consultant', 'user', 'client'] },
  { name: 'Planejamento Reverso', page: 'ReversePlan', icon: Target, roles: ['admin', 'consultant', 'user'] },
  { name: 'Cenários', page: 'Scenarios', icon: FlaskConical, roles: ['admin', 'consultant', 'user'] },
  { name: 'Acomp. Semanal', page: 'WeeklyTracking', icon: CalendarDays, roles: ['admin', 'consultant', 'user'] },
  { name: 'Benchmarks', page: 'Benchmarks', icon: Settings, roles: ['admin', 'user', 'consultant'] },
  { name: 'Tipos de Funil', page: 'FunnelTypes', icon: GitBranch, roles: ['admin', 'user', 'consultant'] },
  { name: 'Config. Campanhas', page: 'CampaignSettings', icon: Megaphone, roles: ['admin', 'user', 'consultant'] },
];

export default function Layout({ children, currentPageName }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user?.role || 'user';

  const filteredNav = navItems.filter(item => item.roles.includes(role));

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
            <h1 className="text-base font-bold tracking-tight flex items-baseline gap-1.5">
              <span className="text-primary">Media Planner</span>
              <span className="flex items-baseline gap-[1px]">
                <span className="font-medium text-[6px] lowercase leading-none" style={{ color: '#877F71' }}>by</span>
                <span className="font-black tracking-tighter" style={{ color: '#33322E' }}>IDK</span>
              </span>
            </h1>
            <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-sidebar-foreground/60" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {filteredNav.map(item => {
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
                  {item.name}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-sidebar-primary" />}
                </Link>
              );
            })}
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
          <div className="flex items-baseline gap-1.5 ml-3">
            <span className="text-sm font-bold text-primary">Media Planner</span>
            <span className="flex items-baseline gap-[1px]">
              <span className="font-medium text-[5px] lowercase leading-none" style={{ color: '#877F71' }}>by</span>
              <span className="text-sm font-black tracking-tighter" style={{ color: '#33322E' }}>IDK</span>
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}