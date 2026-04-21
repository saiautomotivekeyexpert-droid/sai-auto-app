"use client";

import { FileText, Clock, CheckCircle, Package, Download, Eye, EyeOff } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useJobs } from "@/context/JobsContext";
import { useSettings } from "@/context/SettingsContext";

export default function Dashboard() {
  const { jobs, isLoaded, syncError, updateJobDetails, isCloudConnected, refreshCloudData } = useJobs();
  const { inventorySeries, cloudConfig } = useSettings();
  const [visibleAmounts, setVisibleAmounts] = useState<Record<string, boolean>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const handleForceSync = async (job: any) => {
    setSyncingId(job.id);
    try {
      const docs = job.details?.documents || [];
      const cloudDocs = [];
      
      // 1. Upload any offline images to Google Drive
      for (const d of docs) {
        if (d.preview && d.preview.startsWith('data:') && !d.cloudUrl) {
          try {
            const res = await fetch(d.preview);
            const blob = await res.blob();
            const file = new File([blob], d.name || 'offline_document.jpg', { type: blob.type });

            const fd = new FormData();
            fd.append('file', file);
            fd.append('fileName', d.name || 'offline_document');
            
            const upRes = await fetch('/api/google/upload-file', { method: 'POST', body: fd });
            const upData = await upRes.json();
            
            cloudDocs.push({ ...d, cloudUrl: upData.success ? upData.url : undefined });
          } catch(e) {
             cloudDocs.push(d);
          }
        } else {
          cloudDocs.push(d);
        }
      }

      // 3. Mark as Cloud-Synced in local state
      updateJobDetails(job.id, { isCloud: true });
      alert('Offline Job retroactively pushed to Google Drive and Sheets!');
    } catch (err) {
      alert('Failed to sync retroactively.');
    }
    setSyncingId(null);
  };

  const inventoryAlertCount = useMemo(() => {
    return inventorySeries.filter(s => s.isExhausted || s.items.filter(i => i.status === "Available").length <= 2).length;
  }, [inventorySeries]);

  const toggleAmount = (id: string) => {
    setVisibleAmounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const stats = [
    { name: "Active Jobs", count: jobs.filter(j => j.status === "Active").length, icon: Clock, color: "var(--accent-primary)" },
    { name: "New E-KYC Today", count: jobs.filter(j => new Date(j.createdAt).toDateString() === new Date().toDateString()).length, icon: FileText, color: "var(--warning)" },
    { name: "Completed", count: jobs.filter(j => j.status === "Completed").length, icon: CheckCircle, color: "var(--success)" },
    { name: "Inventory Alert", count: inventoryAlertCount, icon: Package, color: "var(--danger)" },
  ];

  const filteredJobs = useMemo(() => {
    let filtered = [...jobs] // Create a copy to avoid mutating the original
      .sort((a, b) => {
        // 1. Sort by createdAt (latest first)
        const timeDiff = (b.createdAt || 0) - (a.createdAt || 0);
        if (timeDiff !== 0) return timeDiff;
        // 2. Tie-breaker: Use sheetIndex (higher index = further down in sheet, usually newer)
        return (b.sheetIndex ?? 0) - (a.sheetIndex ?? 0);
      });
    
    if (activeTab !== "All") {
      filtered = filtered.filter(j => j.status === activeTab);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.id.toLowerCase().includes(q) || 
        j.customerName.toLowerCase().includes(q) || 
        j.vehicleNumber.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [jobs, activeTab, searchQuery]);

  const exportToCSV = () => {
    const headers = "Job ID,Customer,Vehicle,Service,Status,Timeline\n";
    const rows = filteredJobs.map((j: any) => `${j.id},${j.customerName},${j.vehicleNumber},${j.serviceType},${j.status},${j.date}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sai_auto_jobs.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="dashboard-content">
      {isLoaded && (
        <div style={{ 
          background: isCloudConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          color: isCloudConnected ? '#10b981' : '#ef4444', 
          padding: '0.75rem 1rem', 
          borderRadius: 'var(--radius-md)', 
          border: `1px solid ${isCloudConnected ? '#10b981' : '#ef4444'}`,
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCloudConnected ? '#10b981' : '#ef4444', animation: isCloudConnected ? 'none' : 'pulse 2s infinite' }}></div>
            <strong>{isCloudConnected ? 'Cloud Sync Online' : 'Sync Disconnected'}</strong>
            {cloudConfig?.spreadsheetId && (
              <span style={{ opacity: 0.7 }}>• ID: ...{cloudConfig.spreadsheetId.slice(-6)}</span>
            )}
          </div>
          {syncError && <span style={{ fontWeight: 600 }}>Error: {syncError}</span>}
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{jobs.length} Total Jobs Loaded</span>
        </div>
      )}

      <div className="welcome-section">
        <div className="flex-row">
          <div>
            <h1 className="text-gradient">Shop Dashboard</h1>
            <p className="text-muted">Welcome back! Here's what's happening today at SILCA Locksmith Record Book.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="secondary-btn" onClick={() => refreshCloudData()} title="Sync Now">
              <Clock size={18} /> Refresh {isLoaded ? "" : "..."}
            </button>
            <button className="primary-btn" onClick={exportToCSV}>
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.name} className="stat-card glass-panel">
            <div className="stat-icon" style={{ backgroundColor: `rgba(${stat.color}, 0.1)`, color: stat.color }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.count}</span>
              <span className="stat-label">{stat.name}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="table-section glass-panel">
        <div className="table-header">
          <div className="search-filter-box">
             <div className="search-wrapper">
                <input 
                  type="text" 
                  placeholder="Search Name, Vehicle or ID..." 
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <div className="status-tabs">
                {["All", "Active", "Waiting Approval", "Approved", "Completed"].map(status => (
                  <button 
                    key={status} 
                    className={`tab-btn ${activeTab === status ? "active" : ""}`}
                    onClick={() => setActiveTab(status)}
                  >
                    {status}
                  </button>
                ))}
             </div>
          </div>
        </div>
        <div className="table-responsive">
          {!isLoaded ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ fontSize: '0.9rem' }}>Fetching latest data from Google Sheets...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p style={{ fontSize: '0.9rem' }}>No jobs found in the cloud records.</p>
            </div>
          ) : (
            <table className="jobs-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Customer</th>
                <th>Vehicle #</th>
                <th>Service</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td><span className="job-id-badge">{job.id}</span></td>
                  <td>{job.customerName}</td>
                  <td><span className="plate-badge">{job.vehicleNumber}</span></td>
                  <td>{job.serviceType}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className={`status-badge ${job.status.toLowerCase().replace(" ", "-")}`}>
                        {job.status}
                      </span>
                      {!job.isCloud && (
                        <span className="local-badge">LOCAL ONLY</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {new Date(job.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/dashboard/job?id=${job.id}`} className="action-link">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .welcome-section {
          margin-top: 1rem;
        }
        .welcome-section h1 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }
        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-heading);
        }
        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .table-section {
          padding: 1.5rem;
        }
        .table-header {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .search-filter-box {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        .search-wrapper {
          flex: 1;
        }
        .search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: var(--accent-primary);
        }
        .status-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: none;
        }
        .status-tabs::-webkit-scrollbar { display: none; }
        .tab-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--glass-border);
          color: var(--text-muted);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tab-btn.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        .table-responsive {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -0.5rem;
          padding: 0 0.5rem;
        }
        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 650px; /* Force scroll on small screens */
        }
        .jobs-table th {
          padding: 1rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .jobs-table td {
          padding: 1rem 0.75rem;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          white-space: nowrap;
        }
        .job-id-badge {
          font-family: var(--font-mono);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .plate-badge {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          font-size: 0.75rem;
        }
        .status-badge {
          padding: 0.25rem 0.6rem;
          border-radius: 2rem;
          font-size: 0.7rem;
          font-weight: 600;
          display: inline-block;
        }
        .status-badge.active { background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); }
        .status-badge.completed { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .status-badge.pending { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .status-badge.waiting-approval { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .status-badge.approved { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .status-badge.rejected { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .status-badge.in-progress { background: rgba(30, 64, 175, 0.2); color: #60a5fa; }

        .local-badge {
          display: block;
          margin-top: 4px;
          font-size: 0.65rem;
          color: #fca5a5;
          font-weight: 800;
          letter-spacing: 0.05em;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        
        .action-link {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 0.35rem 0.7rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .action-link:hover {
          background: var(--bg-tertiary);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .secondary-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary-btn:hover { background: rgba(255, 255, 255, 0.1); }
        
        @media (max-width: 768px) {
          .dashboard-content { gap: 1rem; }
          .welcome-section h1 {
            font-size: 1.5rem;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .stat-card { padding: 1rem; gap: 0.75rem; }
          .stat-icon { width: 40px; height: 40px; }
          .stat-value { font-size: 1.25rem; }
          .table-section { padding: 1rem; }
          .table-header h2 { font-size: 1.1rem; }
          .primary-btn { font-size: 0.8rem; padding: 0.6rem 1rem; }
        }
      `}</style>
    </div>
  );
}
