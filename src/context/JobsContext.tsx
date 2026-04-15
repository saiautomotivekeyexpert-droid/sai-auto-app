"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface JobTimeline {
  estimatedAt?: number;
  approvedAt?: number;
  workStartedAt?: number;
  workEndedAt?: number;
  invoiceGeneratedAt?: number;
  paymentReceivedAt?: number;
}

export interface Job {
  id: string;
  customerName: string;
  vehicleNumber: string;
  serviceType: string;
  status: "Active" | "Waiting Approval" | "Approved" | "In Progress" | "Completed" | "Pending" | "Rejected";
  date: string;
  createdAt: number;
  details: any;
  timeline: JobTimeline;
}

interface JobsContextType {
  jobs: Job[];
  isLoaded: boolean;
  addJob: (jobData: any, status?: Job["status"], pregeneratedId?: string) => string;
  updateJobStatus: (id: string, status: Job["status"], details?: Partial<Job["details"]>) => void;
  updateJobDetails: (id: string, details: Partial<Job["details"]>) => void;
  addTimelineEvent: (id: string, event: keyof JobTimeline) => void;
  deleteJob: (id: string) => void;
  clearAllJobs: () => Promise<void>;
  syncError: string | null;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setSyncError(null);
      // 2. Load from Cloud (Source of Truth)
      try {
        const res = await fetch(`/api/google/sync-jobs?action=fetch&_t=${Date.now()}`);
        const data = await res.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
          // Use indices from 20-column layout: A(0)=NAME, ..., K(10)=ID, M(12)=STATUS, ...
          // Filter out header row if it exists (check if first item is "NAME")
          const rows = data.data[0]?.[0] === "NAME" ? data.data.slice(1) : data.data;

          const jobMap: Record<string, Job> = {};
          rows.forEach((row: any[]) => {
            const id = row[10]; // ESTIMATE MEMO NO.
            if (!id) return;
            
            const idUpper = id.toString().trim().toUpperCase();
            if (!idUpper.startsWith("JOB-") && !idUpper.startsWith("QS-")) {
              return; 
            }
            
            const timeline = typeof row[19] === 'string' ? JSON.parse(row[19]) : {};
            
            // Parse invoiceSnapshot from column U (index 20) if present
            let invoiceSnapshot: any = undefined;
            if (row[20] && typeof row[20] === 'string' && row[20].startsWith('{')) {
              try { invoiceSnapshot = JSON.parse(row[20]); } catch(e) { invoiceSnapshot = undefined; }
            }
            const createdAt = timeline.estimatedAt || Date.now();
            
            // Robust Particulars Parsing (Handles Cloud-Native Human Readable Format)
            let particulars: any[] = [];
            const rawParticulars = row[16];

            // Priority Parser: Try JSON First (Restores rich metadata)
            if (rawParticulars && typeof rawParticulars === 'string') {
                if (rawParticulars.startsWith('[') || rawParticulars.startsWith('{')) {
                    try { 
                        const parsed = JSON.parse(rawParticulars); 
                        if (Array.isArray(parsed)) {
                            particulars = parsed.map((p: any) => {
                                if (typeof p === 'string') return { name: p, quantity: 1, selectedMarks: [] };
                                const marks = Array.isArray(p.selectedMarks) ? p.selectedMarks : [];
                                return { 
                                    name: p.name || p, 
                                    quantity: p.quantity || marks.length || 1, 
                                    selectedMarks: marks 
                                };
                            });
                        }
                    } catch(e) { particulars = []; }
                } else if (rawParticulars.includes('=') || rawParticulars.includes(';')) {
                    // Legacy Human Readable Parser Fallback
                    particulars = rawParticulars.split(';').map(part => {
                        const [name, marksStr] = part.split('=').map(s => s.trim());
                        if (!marksStr) return { name, quantity: 1 };
                        const marks = marksStr.split(',').map(m => {
                            const mark = m.trim().startsWith('#') ? m.trim() : `#${m.trim()}`;
                            return { 
                                mark, 
                                itemId: `cloud-${mark}`, 
                                status: 'Consumed' 
                            };
                        });
                        return { name, quantity: marks.length, selectedMarks: marks };
                    });
                } else {
                    // Simple CSV fallback
                    particulars = rawParticulars.split(',').map(name => ({ name: name.trim(), quantity: 1 }));
                }
            }

            jobMap[idUpper] = {
              id: idUpper,
              customerName: row[0] || '',
              vehicleNumber: row[5] || '',
              serviceType: row[13] || '',
              status: row[12] as any || 'Pending',
              date: new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
              createdAt: createdAt,
              timeline: timeline,
              details: {
                fullName: row[0] || '',
                address: row[1] || '',
                phone: row[2] || '',
                referenceName: row[3] || '',
                complaintHistory: row[4] || '',
                regNumber: row[5] || '',
                brand: row[6] || '',
                model: row[7] || '',
                year: row[8] || '',
                category: row[9] || '',
                totalCharge: row[11] || 0,
                serviceType: row[13] || '',
                consentType: row[14] || '',
                selectedSubCategories: (row[15] || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean),
                selectedItems: particulars,
                particulars: particulars,
                docsFolderLink: row[17] || '',
                afterSales: row[18] || '',
                timeline: timeline,
                ...(invoiceSnapshot ? { invoiceSnapshot } : {})
              }
            };
          });

          // Sort by createdAt DESC before setting state to ensure newest are on top
          const sortedJobs = Object.values(jobMap).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setJobs(sortedJobs);
        }
      } catch (err: any) {
        console.error("Cloud fetch failed:", err);
        setSyncError(err.message || "Failed to connect to Google Sheets.");
      }
      
      setIsLoaded(true);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    // We strictly use cloud pull on mount. No more localStorage as primary.
    // Fetch logic is already in loadInitialData.
  }, []);

  const syncToCloud = (job: Job) => {
    try {
      fetch('/api/google/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', job })
      }).catch(err => console.error("Cloud sync fetch error:", err));
    } catch (err) {
      console.error("Cloud sync error:", err);
    }
  };

  const addJob = (formData: any, status: Job["status"] = "Active", pregeneratedId?: string): string => {
    const newId = pregeneratedId || `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = Date.now();
    const newJob: Job = {
      id: newId,
      customerName: formData.fullName,
      vehicleNumber: formData.regNumber,
      serviceType: formData.serviceType,
      status,
      date: new Date(now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      createdAt: now,
      details: formData,
      timeline: { ...formData.timeline, estimatedAt: now },
    };
    setJobs(prev => [newJob, ...prev]);
    syncToCloud(newJob);
    return newId;
  };

  const updateJobStatus = (id: string, status: Job["status"], details?: Partial<Job["details"]>) => {
    setJobs(prev => prev.map(j => {
      if (j.id === id) {
        const updatedDetails = details ? { ...j.details, ...details } : j.details;
        const updated: Job = { 
          ...j, 
          status, 
          details: updatedDetails,
          customerName: updatedDetails.fullName || j.customerName,
          vehicleNumber: updatedDetails.regNumber || j.vehicleNumber,
        };
        syncToCloud(updated);

        // Trigger Ledger sync on completion
        if (status === 'Completed') {
          const d = updated.details || {};
          const revenue = Number(d.totalCharge) || 0;
          const baseExp = (d.particulars || d.selectedItems || []).reduce((s: number, p: any) => s + Number(p.expense || 0), 0);
          const commExp = Number(d.commission) || 0;
          const totalExp = baseExp + commExp;
          const profit = revenue - totalExp;

          const ledgerRow = [
            new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
            updated.id,
            updated.customerName,
            updated.vehicleNumber,
            revenue,
            totalExp,
            profit,
            "Job Revenue"
          ];

          fetch('/api/google/sync-ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ row: ledgerRow })
          }).catch(err => console.error("Ledger sync failed:", err));
        }

        return updated;
      }
      return j;
    }));
  };

  const updateJobDetails = (id: string, details: Partial<Job["details"]>) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      const mergedDetails = { ...j.details, ...details };
      const updated = {
        ...j,
        customerName: mergedDetails.fullName || j.customerName,
        vehicleNumber: mergedDetails.regNumber || j.vehicleNumber,
        serviceType: mergedDetails.serviceType || j.serviceType,
        details: mergedDetails,
      };
      syncToCloud(updated);
      return updated;
    }));
  };

  const addTimelineEvent = (id: string, event: keyof JobTimeline) => {
    setJobs(prev => prev.map(j => j.id === id
      ? { ...j, timeline: { ...j.timeline, [event]: Date.now() } }
      : j
    ));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const clearAllJobs = async () => {
    try {
      // 1. Clear Server
      const res = await fetch('/api/google/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      const data = await res.json();
      
      if (data.success) {
        // 2. Clear Local State
        setJobs([]);
        alert("All job data cleared successfully from Cloud.");
      } else {
        alert("Server clear failed: " + data.error);
      }
    } catch (err) {
      console.error("Clear failed:", err);
      alert("An error occurred while clearing data.");
    }
  };

  return (
    <JobsContext.Provider value={{ jobs, isLoaded, addJob, updateJobStatus, updateJobDetails, addTimelineEvent, deleteJob, clearAllJobs, syncError }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (context === undefined) {
    throw new Error("useJobs must be used within a JobsProvider");
  }
  return context;
}
