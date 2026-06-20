import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from './components/hooks/useAuth';
import { 
  LayoutDashboard, Building2, BarChart3, Target, 
  FlaskConical, CalendarDays, Settings, Menu, X, 
  ChevronRight, LogOut, Activity, GitBranch
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
];

export default function Layout({ children, currentPageName }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user?.role || 'user';
  const isAdmin = role === 'admin';

  const filteredNav = navItems.filter(item => {
    // Admin-only items: only show for admins
    if (item.roles.length === 1 && item.roles[0] === 'admin') return isAdmin;
    // All other items: show for everyone
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 tracking-wide">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900 tracking-tight">Media Planner</h1>
                <p className="text-[10px] text-gray-400 tracking-wider uppercase">LVL Performance</p>
              </div>
            </div>
            <button className="lg:hidden p-1" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-400" />
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
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  {item.name}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-xs font-semibold text-gray-600">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-gray-400 capitalize">{role}</p>
              </div>
              <button 
                onClick={() => base44.auth.logout()}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-gray-900">Media Planner</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}