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
  isCloud?: boolean;
  sheetIndex?: number;
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
  isCloudConnected: boolean;
  refreshCloudData: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const parseCloudRows = (rows: any[]) => {
    const cloudJobMap: Record<string, Job> = {};
    rows.forEach((row: any[], index: number) => {
      const id = row[10];
      if (!id) return;
      const idUpper = id.toString().trim().toUpperCase();
      if (!idUpper.startsWith("JOB-") && !idUpper.startsWith("QS-")) return;
      
      let timeline: any = {};
      try {
        if (row[19] && typeof row[19] === 'string' && (row[19].startsWith('{') || row[19].startsWith('['))) {
          timeline = JSON.parse(row[19]);
        }
      } catch (e) {
        console.warn(`[SYNC-JOBS] Failed to parse timeline for ${idUpper}:`, e);
      }
      
      let estimateSnapshot: any = undefined;
      let invoiceSnapshot: any = undefined;
      if (row[20] && typeof row[20] === 'string' && row[20].startsWith('{')) {
        try {
          const parsed = JSON.parse(row[20]);
          if (parsed.e !== undefined || parsed.i !== undefined) {
            estimateSnapshot = parsed.e || undefined;
            invoiceSnapshot = parsed.i || undefined;
          } else {
            invoiceSnapshot = parsed;
          }
        } catch(e) { /* ignore */ }
      }
      // STABLE CREATED AT: fallback to 0 instead of Date.now() to prevent shuffle
      const createdAt = timeline.estimatedAt || 0;
      
      let particulars: any[] = [];
      const rawParticulars = row[16];
      if (rawParticulars && typeof rawParticulars === 'string' && rawParticulars.trim() !== '') {
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
          } else {
              particulars = rawParticulars.split(',').map(name => ({ name: name.trim(), quantity: 1 }));
          }
      }

      cloudJobMap[idUpper] = {
        id: idUpper,
        customerName: row[0] || '',
        vehicleNumber: row[5] || '',
        serviceType: row[13] || '',
        status: row[12] as any || 'Pending',
        date: row[23] || new Date(createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
        createdAt: createdAt,
        sheetIndex: index, // Preserve Sheet Order
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
          documents: (() => {
            const cellContent = (row[17] || '').toString();
            const docs: any[] = [];
            // Regex to find all HYPERLINK("url", "name") occurrences
            const regex = /HYPERLINK\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/gi;
            let match;
            while ((match = regex.exec(cellContent)) !== null) {
              const url = match[1];
              const name = match[2];
              const type = name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
              docs.push({ preview: url, name: name, type, synced: true });
            }
            
            if (docs.length === 0 && cellContent && !cellContent.includes("HYPERLINK")) {
               cellContent.split(',').forEach((name: string) => {
                  const trimmed = name.trim();
                  if (trimmed) {
                    let url = trimmed;
                    const isUrl = url.startsWith('http') || url.includes('drive.google.com');
                    if (isUrl && url.includes('drive.google.com') && (url.includes('/view') || url.includes('/preview'))) {
                      url = url.replace(/\/(view|preview)(\?.*)?$/, '/view?usp=drivesdk');
                    }
                    docs.push({ 
                      preview: isUrl ? url : undefined, 
                      name: trimmed, 
                      type: trimmed.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                      synced: isUrl
                    });
                  }
               });
            }
            return docs;
          })(),
          afterSales: row[18] || '',
          timeline: timeline,
          ...(invoiceSnapshot ? { invoiceSnapshot } : {}),
          ...(estimateSnapshot ? { estimateSnapshot } : {})
        },
        isCloud: true
      };
    });
    return cloudJobMap;
  };

  const safeFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Expected JSON but received:", text.slice(0, 100));
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error(`Server returned an HTML page instead of data. This usually happens when the server is down or redirected to a login page.`);
      }
      throw new Error(`Invalid response format: ${contentType || 'unknown'}`);
    }

    return res.json();
  };

  const loadInitialData = async () => {
    setSyncError(null);
    
    // 1. Load from Local (Immediate UI response)
    const localData = localStorage.getItem("sai_auto_jobs");
    let localJobs: Job[] = [];
    if (localData) {
      try {
        localJobs = JSON.parse(localData);
        setJobs(localJobs);
      } catch (e) {
        console.error("Local load failed:", e);
      }
    }

    // 2. Load from Cloud (Source of Truth)
    try {
      const data = await safeFetch(`/api/google/sync-jobs?action=fetch&_t=${Date.now()}`);
      
      if (data.success && data.data && Array.isArray(data.data)) {
        const rows = data.data[0]?.[0] === "NAME" ? data.data.slice(1) : data.data;
        const cloudJobMap = parseCloudRows(rows);

        setJobs(prev => {
          const mergedMap: Record<string, Job> = {};
          prev.filter(j => !j.isCloud).forEach(j => { mergedMap[j.id] = j; });
          Object.keys(cloudJobMap).forEach(id => { mergedMap[id] = cloudJobMap[id]; });
          return Object.values(mergedMap).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        });
        setIsCloudConnected(true);
      }
    } catch (err: any) {
      setIsCloudConnected(false);
      console.error("Cloud fetch failed:", err);
      setSyncError(err.message || "Failed to connect to Google Sheets.");
    }
    
    setIsLoaded(true);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshCloudData = async () => {
    setIsLoaded(false);
    setSyncError(null);
    try {
      const data = await safeFetch(`/api/google/sync-jobs?action=fetch&_t=${Date.now()}`);
      
      if (data.success && data.data) {
        setIsCloudConnected(true);
        const rows = data.data[0]?.[0] === "NAME" ? data.data.slice(1) : data.data;
        const cloudJobMap = parseCloudRows(rows);

        setJobs(prev => {
          const mergedMap: Record<string, Job> = {};
          prev.filter(j => !j.isCloud).forEach(j => { mergedMap[j.id] = j; });
          Object.keys(cloudJobMap).forEach(id => { mergedMap[id] = cloudJobMap[id]; });
          return Object.values(mergedMap).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        });
      } else {
        setIsCloudConnected(false);
        setSyncError(data.error || "Server returned failure.");
      }
    } catch (err: any) {
      setIsCloudConnected(false);
      setSyncError(err.message || "Failed to reach server.");
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("sai_auto_jobs", JSON.stringify(jobs));
    }
  }, [jobs, isLoaded]);

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
    const newId = pregeneratedId || `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
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
      isCloud: false,
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
    setJobs(prev => {
      const updated = prev.map(j => {
        if (j.id === id) {
          const updatedJob = { 
            ...j, 
            timeline: { ...j.timeline, [event]: Date.now() } 
          };
          // Sync timeline event to cloud immediately
          syncToCloud(updatedJob);
          return updatedJob;
        }
        return j;
      });
      return updated;
    });
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const clearAllJobs = async () => {
    try {
      const res = await fetch('/api/google/sync-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });
      const data = await res.json();
      if (data.success) {
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
    <JobsContext.Provider value={{ jobs, isLoaded, addJob, updateJobStatus, updateJobDetails, addTimelineEvent, deleteJob, clearAllJobs, syncError, isCloudConnected, refreshCloudData }}>
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
