"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, Settings, LogOut, Key, Calculator, Zap, X, Cloud, CheckCircle, RefreshCcw } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { isSyncing, lastSyncTime } = useSettings();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New E-KYC", href: "/new-job", icon: PlusCircle },
    { name: "Quick Service", href: "/dashboard/quick-service", icon: Zap },
    { name: "Manage Stock", href: "/dashboard/inventory", icon: Key },
    { name: "Ledger", href: "/dashboard/ledger", icon: Calculator },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-header">
        <div className="logo">
          <Key size={24} color="var(--accent-primary)" />
          <span>Sai Auto</span>
        </div>
        <button className="mobile-close-btn" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sync-status">
          {isSyncing ? (
            <div className="status-item syncing">
              <RefreshCcw size={14} className="spin" />
              <span>Syncing catalog...</span>
            </div>
          ) : lastSyncTime ? (
            <div className="status-item synced">
              <CheckCircle size={14} />
              <span>Backed up {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ) : (
            <div className="status-item idle">
              <Cloud size={14} />
              <span>Cloud ready</span>
            </div>
          )}
        </div>
        <Link href="/login" className="nav-item logout">
          <LogOut size={20} />
          <span>Logout</span>
        </Link>
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          height: calc(100vh - 2rem);
          margin: 1rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 1rem;
        }
        .sidebar-header {
          margin-bottom: 2.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .mobile-close-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-muted);
        }
        @media (max-width: 1024px) {
          .mobile-close-btn {
            display: block;
          }
           .sidebar {
             margin: 0;
             border-radius: 0;
             border: none;
             height: 100vh;
           }
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: var(--transition);
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .nav-item.active {
          background: rgba(59, 130, 246, 0.15);
          color: var(--accent-primary);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid var(--glass-border);
          padding-top: 1rem;
        }
        .logout {
          color: var(--danger);
          opacity: 0.8;
        }
        .logout:hover {
          opacity: 1;
          color: var(--danger);
        }
        .sync-status {
          margin-bottom: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
        }
        .status-item.syncing {
          color: var(--accent-primary);
        }
        .status-item.synced {
          color: var(--success);
        }
        .spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
           /* Mobile behavior can be handled later with a toggle */
        }
      `}</style>
    </aside>
  );
}
