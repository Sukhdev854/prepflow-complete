import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, ClipboardList, TrendingUp,
  Settings, LogOut, ChevronLeft, ChevronRight, Zap, Trophy
} from 'lucide-react';

export type Page = 'dashboard' | 'record' | 'pending' | 'grades' | 'achievements' | 'settings';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  onSignOut: () => void;
  username: string;
  streak?: number;
}

const navItems: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'record',    label: 'Record Paper',     icon: BookOpen },
  { id: 'pending',   label: 'Pending Papers',   icon: ClipboardList },
  { id: 'grades',    label: 'Predicted Grades', icon: TrendingUp },
  { id: 'achievements', label: 'Achievements',   icon: Trophy },
  { id: 'settings',  label: 'Settings',         icon: Settings },
];

export function Sidebar({ currentPage, onPageChange, onSignOut, username, streak = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon animate-glow">
          <Zap size={18} color="#fff" />
        </div>
        <span className="sidebar-logo-text">PrepFlow</span>
      </div>

      {/* Nav Items */}
      <div className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <div key={item.id} className="tooltip">
              <button
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => onPageChange(item.id)}
              >
                <Icon size={18} />
                <span className="sidebar-item-label">{item.label}</span>
              </button>
              {collapsed && (
                <span className="tooltip-text">{item.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Streak */}
        {streak > 0 && (
          <div className="tooltip" style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              marginBottom: 8
            }}>
              <Trophy size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span className="sidebar-item-label" style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                {streak} day streak 🔥
              </span>
            </div>
            {collapsed && <span className="tooltip-text">{streak} day streak 🔥</span>}
          </div>
        )}

        {/* User row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 4px', marginBottom: 8
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            flexShrink: 0
          }}>
            {initials}
          </div>
          <div className="sidebar-item-label" style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              @{username}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="tooltip">
          <button className="sidebar-item" onClick={onSignOut} style={{ color: 'var(--accent-red)' }}>
            <LogOut size={18} />
            <span className="sidebar-item-label">Sign Out</span>
          </button>
          {collapsed && <span className="tooltip-text">Sign Out</span>}
        </div>

        {/* Collapse toggle */}
        <button
          className="btn-ghost"
          onClick={() => setCollapsed(!collapsed)}
          style={{ width: '100%', marginTop: 8, justifyContent: collapsed ? 'center' : 'flex-start', padding: '8px 12px' }}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse</span></>
          }
        </button>
      </div>
    </nav>
  );
}
