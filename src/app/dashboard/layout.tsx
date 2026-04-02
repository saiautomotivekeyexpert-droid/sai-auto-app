"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, Bell, User as UserIcon, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('sai_auto_auth');
    if (!auth) {
      router.push('/login');
    }
  }, [router]);

  if (typeof window !== 'undefined' && !localStorage.getItem('sai_auto_auth')) {
    return null; // Prevent flash of content
  }
  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <div className={`sidebar-wrapper ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="main-content">
        <header className="top-bar">
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <div className="search-box">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
          
          <div className="top-bar-right">
            <button className="icon-btn hide-mobile">
              <Bell size={20} />
            </button>
            <div className="user-profile">
              <span className="user-name hide-mobile">Sai Auto Key Expert</span>
              <div className="avatar">
                <UserIcon size={16} />
              </div>
            </div>
          </div>
        </header>
        <main className="content-inner animate-fade-in">
          {children}
        </main>
      </div>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          gap: 1rem;
        }
        .mobile-menu-btn {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 0.5rem;
        }
        .sidebar-wrapper {
          display: block;
        }
        .mobile-overlay {
          display: none;
        }
        
        @media (max-width: 1200px) {
          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: -280px;
            bottom: 0;
            width: 280px;
            z-index: 1000;
            transition: left 0.3s ease;
            background: var(--bg-primary);
          }
          .sidebar-wrapper.open {
            left: 0;
          }
          .mobile-menu-btn {
            display: block;
          }
          .mobile-overlay {
            display: block;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 999;
          }
          .top-bar {
            padding: 1rem;
          }
          .search-box {
            max-width: none;
            flex: 1;
          }
          .hide-mobile {
            display: none;
          }
          .user-profile {
            padding-left: 0;
            border-left: none;
          }
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--glass-border);
          padding: 0.5rem 1.25rem;
          border-radius: 2rem;
          width: 100%;
          max-width: 400px;
        }
        .search-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          width: 100%;
          font-size: 0.9rem;
        }
        .search-input:focus {
          outline: none;
        }
        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1.5rem;
          border-left: 1px solid var(--glass-border);
        }
        .user-name {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .avatar {
          width: 32px;
          height: 32px;
          background: var(--bg-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--glass-border);
        }
        .content-inner {
          padding: 0 2rem 2rem;
          flex: 1;
        }
        @media (max-width: 768px) {
          .content-inner {
            padding: 0 1rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
