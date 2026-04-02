"use client";

import { FileText, Clock, CheckCircle, Package, Download, Eye, EyeOff } from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useJobs } from "@/context/JobsContext";
import { useSettings } from "@/context/SettingsContext";

export default function Dashboard() {
  const { jobs } = useJobs();
  const { inventorySeries } = useSettings();
  const recentJobs = [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  const [visibleAmounts, setVisibleAmounts] = useState<Record<string, boolean>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);

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

      // 2. Sync updated Job JSON to Google Sheets
      const syncJob = { ...job, details: { ...job.details, documents: cloudDocs } };
      await fetch('/api/google/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', job: syncJob })
      });
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
    { name: "Active Jobs", count: recentJobs.filter(j => j.status === "Active").length, icon: Clock, color: "var(--accent-primary)" },
    { name: "New E-KYC Today", count: recentJobs.filter(j => new Date(j.createdAt).toDateString() === new Date().toDateString()).length, icon: FileText, color: "var(--warning)" },
    { name: "Completed", count: recentJobs.filter(j => j.status === "Completed").length, icon: CheckCircle, color: "var(--success)" },
    { name: "Inventory Alert", count: inventoryAlertCount, icon: Package, color: "var(--danger)" },
  ];

  const exportToCSV = () => {
    const headers = "Job ID,Customer,Vehicle,Service,Status,Timeline\n";
    const rows = recentJobs.map(j => `${j.id},${j.customerName},${j.vehicleNumber},${j.serviceType},${j.status},${j.date}`).join("\n");
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
      <div className="welcome-section">
        <div className="flex-row">
          <div>
            <h1 className="text-gradient">Shop Dashboard</h1>
            <p className="text-muted">Welcome back! Here's what's happening today at Sai Auto Key Works.</p>
          </div>
          <button className="primary-btn" onClick={exportToCSV}>
            <Download size={18} /> Export CSV
          </button>
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
          <h2>Active Jobs</h2>
          <button className="secondary-btn">View All</button>
        </div>
        <div className="table-responsive">
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
              {recentJobs.map((job) => (
                <tr key={job.id}>
                  <td><span className="job-id-badge">{job.id}</span></td>
                  <td>{job.customerName}</td>
                  <td><span className="plate-badge">{job.vehicleNumber}</span></td>
                  <td>{job.serviceType}</td>
                  <td>
                    <span className={`status-badge ${job.status.toLowerCase().replace(" ", "-")}`}>
                      {job.status}
                    </span>
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
                    <button 
                      className="action-link" 
                      onClick={() => handleForceSync(job)}
                      disabled={syncingId === job.id}
                      style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                      {syncingId === job.id ? 'Syncing...' : 'Force Sync'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .jobs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .jobs-table th {
          padding: 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
        }
        .jobs-table td {
          padding: 1rem;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .job-id-badge {
          font-family: var(--font-mono);
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        .plate-badge {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 700;
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-badge.active { background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); }
        .status-badge.completed { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .status-badge.pending { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .status-badge.waiting-approval { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .status-badge.approved { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .status-badge.rejected { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .status-badge.in-progress { background: rgba(30, 64, 175, 0.2); color: #60a5fa; }
        
        .action-link {
          background: transparent;
          border: 1px solid var(--glass-border);
          color: var(--text-primary);
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
        }
        .action-link:hover {
          background: var(--bg-tertiary);
        }
        
        @media (max-width: 768px) {
          .welcome-section h1 {
            font-size: 1.5rem;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
