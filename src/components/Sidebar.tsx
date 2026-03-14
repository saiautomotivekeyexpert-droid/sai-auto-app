"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, History, Settings, LogOut, Key, Calculator } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "New E-KYC", href: "/new-job", icon: PlusCircle },
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
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
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
        @media (max-width: 768px) {
           /* Mobile behavior can be handled later with a toggle */
        }
      `}</style>
    </aside>
  );
}
