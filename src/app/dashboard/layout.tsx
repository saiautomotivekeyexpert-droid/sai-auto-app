"use client";

import Sidebar from "@/components/Sidebar";
import { Search, Bell, User as UserIcon } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-bar">
          <div className="search-box">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search jobs, plates, or customers..." className="search-input" />
          </div>
          <div className="top-bar-right">
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <div className="user-profile">
              <span className="user-name">Admin John</span>
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
          padding: 1.5rem 2rem;
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
          gap: 1.5rem;
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
      `}</style>
    </div>
  );
}
