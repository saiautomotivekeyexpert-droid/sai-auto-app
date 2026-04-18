"use client";

import { useJobs } from "@/context/JobsContext";
import { 
  TrendingUp, TrendingDown, DollarSign, 
  ArrowLeft, FileText, Calendar, IndianRupee,
  Briefcase, User, Car, Search
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LedgerPage() {
  const { jobs, isLoaded, updateJobDetails } = useJobs();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, jobId: string } | null>(null);
  const [editingCommissionJobId, setEditingCommissionJobId] = useState<string | null>(null);
  const [newCommission, setNewCommission] = useState<number>(0);

  if (!isLoaded) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <p>Loading ledger data...</p>
      </div>
    );
  }

  // Filter completed jobs for a clear financial history, though we might show all approved/completed
  const filteredJobs = jobs
    .filter(j => (j.status === "Completed" || j.status === "Approved" || j.status === "In Progress") && (
      j.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.id.toLowerCase().includes(searchTerm.toLowerCase())
    ))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = filteredJobs.reduce((acc, job) => {
    const d = job.details || {};
    const isQS = job.serviceType === "Quick Service";
    const serviceCharge = Number(d.serviceCharge) || 0;
    const itemsTotal = (d.particulars || []).reduce((sum: number, p: any) => sum + (Number(p.cost || 0) * (Number(p.quantity) || 1)), 0);
    
    const revenue = Number(d.totalCharge) || (serviceCharge + (isQS ? itemsTotal : 0));
    const baseExpense = (d.particulars || []).reduce((sum: number, p: any) => sum + Number(p.expense || 0), 0);
    const commissionExpense = Number(d.commission) || 0;
    const totalJobExpense = baseExpense + commissionExpense;
    
    acc.totalRevenue += revenue;
    acc.totalExpense += totalJobExpense;
    acc.totalProfit += (revenue - totalJobExpense);
    return acc;
  }, { totalRevenue: 0, totalExpense: 0, totalProfit: 0 });

  return (
    <div className="ledger-container">
      <div className="ledger-header">
        <h1 className="text-gradient">Business Ledger</h1>
        <p className="text-muted">Track your job-wise earnings, base expenses, and net profitability.</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="stats-grid animate-fade-in">
        <div className="stat-card glass-panel orange-glow">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Gross Revenue</span>
            <span className="stat-value">₹{stats.totalRevenue.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="stat-card glass-panel red-glow">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <TrendingDown size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Expense</span>
            <span className="stat-value">₹{stats.totalExpense.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="stat-card glass-panel green-glow">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Net Profit</span>
            <span className="stat-value">₹{stats.totalProfit.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="ledger-card glass-panel animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 'none', marginBottom: '1rem' }}>
          <h3>Profitability Breakdown</h3>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search vehicle or client..." 
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem', color: 'white' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Client / Vehicle</th>
                <th>Gross Earning</th>
                <th>Direct Expense</th>
                <th>Net Margin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No completed jobs found for ledger calculation.
                  </td>
                </tr>
              ) : (
                  filteredJobs.map((job) => {
                    const d = job.details || {};
                    const rev = Number(d.totalCharge) || 0;
                    const baseExp = (d.particulars || []).reduce((sum: number, p: any) => sum + Number(p.expense || 0), 0);
                    const commExp = Number(d.commission) || 0;
                    const totalExp = baseExp + commExp;
                    const net = rev - totalExp;
                    const marginPercent = rev > 0 ? Math.round((net / rev) * 100) : 0;

                    const handleContextMenu = (e: React.MouseEvent) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, jobId: job.id });
                    };

                    const handleTouchStart = (e: React.TouchEvent) => {
                      const timer = setTimeout(() => {
                        const touch = e.touches[0];
                        setContextMenu({ x: touch.clientX, y: touch.clientY, jobId: job.id });
                      }, 100);
                      const clearTimer = () => clearTimeout(timer);
                      e.currentTarget.addEventListener('touchend', clearTimer, { once: true });
                    };

                  return (
                    <tr key={job.id}>
                      <td className="job-id-cell">
                        <span className="id-badge">{job.id}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                          {new Date(job.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                          {new Date(job.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <div className="customer-info">
                          <span className="cust-name"><User size={12} /> {job.customerName}</span>
                          <span className="veh-plate"><Car size={12} /> {job.vehicleNumber}</span>
                        </div>
                      </td>
                      <td className="amount-col revenue">₹{rev.toLocaleString("en-IN")}</td>
                      <td className="amount-col expense" 
                          onContextMenu={handleContextMenu}
                          onTouchStart={handleTouchStart}
                          style={{ cursor: 'context-menu' }}
                      >
                        <div className="expense-stack">
                          <span className="total-exp">₹{totalExp.toLocaleString("en-IN")}</span>
                          <div className="exp-breakup">
                            {(d.particulars || []).map((p: any, idx: number) => (
                              <div key={idx} className="exp-item">
                                <span>{p.name}</span>
                                <span>₹{Number(p.expense || 0).toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                            {commExp > 0 && (
                              <div className="exp-item" style={{ color: 'var(--accent-primary)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px', marginTop: '2px' }}>
                                <span>COMMISSION</span>
                                <span>₹{commExp.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="amount-col profit">
                        <div className="profit-stack">
                          <span className="profit-val">₹{net.toLocaleString("en-IN")}</span>
                          <span className="margin-pill">{marginPercent}% Margin</span>
                        </div>
                      </td>
                      <td>
                        <button className="view-btn" onClick={() => router.push(`/dashboard/job?id=${job.id}`)}>
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <>
          <div className="context-menu-backdrop" onClick={() => setContextMenu(null)} />
          <div className="context-menu glass-panel" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button className="menu-item" onClick={() => {
              const job = jobs.find(j => j.id === contextMenu.jobId);
              setNewCommission(job?.details.commission || 0);
              setEditingCommissionJobId(contextMenu.jobId);
              setContextMenu(null);
            }}>
              <IndianRupee size={14} /> Edit Commission
            </button>
            <button className="menu-item" onClick={() => {
              router.push(`/dashboard/job?id=${contextMenu.jobId}`);
              setContextMenu(null);
            }}>
              <FileText size={14} /> View Full Detail
            </button>
          </div>
        </>
      )}

      {/* EDIT COMMISSION MODAL */}
      {editingCommissionJobId && (() => {
        const job = jobs.find(j => j.id === editingCommissionJobId);
        if (!job) return null;
        const currentRev = Number(job.details.totalCharge) || 0;
        const currentBaseExp = (job.details.particulars || []).reduce((s: number, p: any) => s + Number(p.expense || 0), 0);
        const projectedProfit = currentRev - (currentBaseExp + newCommission);

        return (
          <div className="modal-overlay">
            <div className="modal-card glass-panel orange-glow">
              <h3 style={{ marginBottom: '0.5rem' }}>Edit Commission</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Update commission expense for job <strong>#{job.id}</strong>.</p>
              
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.6rem' }}>Commission Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-muted)' }}>₹</span>
                  <input 
                    type="number" 
                    className="input-field" 
                    style={{ paddingLeft: '2rem' }}
                    value={newCommission || ""}
                    onChange={e => setNewCommission(Number(e.target.value))}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--glass-border)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>PROJECTED PROFIT:</span>
                    <strong style={{ color: projectedProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>₹{projectedProfit.toLocaleString("en-IN")}</strong>
                 </div>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {projectedProfit < 0 ? "⚠️ WARNING: Expense exceeds revenue!" : "Calculated after base expenses."}
                 </div>
              </div>

              <div className="modal-actions">
                <button className="secondary-btn" onClick={() => setEditingCommissionJobId(null)}>Cancel</button>
                <button className="primary-btn" style={{ background: 'var(--accent-primary)' }} onClick={() => {
                  updateJobDetails(editingCommissionJobId, { commission: newCommission });
                  setEditingCommissionJobId(null);
                }}>Update Ledger</button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        .ledger-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ledger-header {
          margin-bottom: 2rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .stat-icon {
          width: 54px;
          height: 54px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          margin-top: 0.2rem;
        }
        .ledger-card {
          padding: 1.5rem;
        }
        .card-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        .ledger-table th {
          text-align: left;
          padding: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
        }
        .ledger-table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.95rem;
        }
        .job-id-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .id-badge {
          font-weight: 700;
          color: var(--accent-primary);
        }
        .date-small {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .customer-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .cust-name {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .veh-plate {
          font-size: 0.8rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .amount-col {
          font-weight: 700;
          font-family: 'Inter', sans-serif;
        }
        .revenue { color: #f59e0b; }
        .expense { color: #ef4444; }
        .expense-stack {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .total-exp {
          font-weight: 700;
        }
        .exp-breakup {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding-left: 0.5rem;
          border-left: 1px solid rgba(239, 68, 68, 0.2);
        }
        .exp-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 500;
          gap: 1rem;
        }
        .profit-stack {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .profit-val { color: var(--success); }
        .margin-pill {
          font-size: 0.7rem;
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          display: inline-block;
          width: fit-content;
        }
        .view-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition);
        }
        .view-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        /* CONTEXT MENU STYLES */
        .context-menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
        }
        .context-menu {
          position: fixed;
          z-index: 1001;
          min-width: 180px;
          padding: 0.5rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          animation: scale-up 0.15s ease-out;
          transform-origin: top left;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }
        .menu-item:hover {
          background: rgba(59,130,246,0.15);
          color: var(--accent-primary);
        }
        @keyframes scale-up {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          animation: fade-in 0.2s ease-out;
        }
        .modal-card {
          padding: 2rem;
          max-width: 400px;
          width: 90%;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
