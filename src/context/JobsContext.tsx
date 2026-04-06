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
  updateJobStatus: (id: string, status: Job["status"]) => void;
  updateJobDetails: (id: string, details: Partial<Job["details"]>) => void;
  addTimelineEvent: (id: string, event: keyof JobTimeline) => void;
  deleteJob: (id: string) => void;
  clearAllJobs: () => Promise<void>;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load from localStorage (Local Cache)
      const savedJobs = localStorage.getItem("kyc_jobs_v3");
      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          setJobs(parsed.map((j: any) => ({ timeline: {}, ...j })));
        } catch {
          setJobs([]);
        }
      }

      // 2. Load from Cloud (Source of Truth)
      try {
        const res = await fetch('/api/google/sync-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fetch' })
        });
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
            const particulars = typeof row[16] === 'string' ? JSON.parse(row[16]) : [];

            jobMap[idUpper] = {
              id: idUpper,
              customerName: row[0] || '',
              vehicleNumber: row[5] || '',
              serviceType: row[13] || '',
              status: row[12] as any || 'Pending',
              date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(), // Fallback
              createdAt: Date.now(),
              timeline: timeline,
              details: {
                customerAddress: row[1] || '',
                customerPhone: row[2] || '',
                referenceName: row[3] || '',
                complaintHistory: row[4] || '',
                vehicleBrand: row[6] || '',
                vehicleModel: row[7] || '',
                manufactureYear: row[8] || '',
                vehicleType: row[9] || '',
                totalCharge: row[11] || 0,
                consentType: row[14] || '',
                selectedSubCategories: (row[15] || '').split(',').map((s: string) => s.trim()).filter(Boolean),
                selectedItems: particulars,
                docsFolderLink: row[17] || '',
                afterSales: row[18] || ''
              }
            };
          });

          setJobs(Object.values(jobMap).reverse());
        }
      } catch (err) {
        console.error("Cloud fetch failed:", err);
      }
      
      setIsLoaded(true);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      // Try to save normally; if localStorage quota exceeded, strip base64 previews and retry
      const trySave = (data: Job[]) => {
        try {
          localStorage.setItem("kyc_jobs_v3", JSON.stringify(data));
        } catch (e: any) {
          if (e?.name === 'QuotaExceededError' || e?.code === 22) {
            // Strip large base64 previews from documents to free space
            const stripped = data.map(job => ({
              ...job,
              details: {
                ...job.details,
                documents: (job.details?.documents || []).map((doc: any) => ({
                  name: doc.name,
                  type: doc.type,
                  preview: doc.preview?.startsWith('data:') ? '[large-file]' : doc.preview,
                })),
              },
            }));
            try {
              localStorage.setItem("kyc_jobs_v3", JSON.stringify(stripped));
              console.warn('Storage quota exceeded — document previews stripped to save space. Re-upload files to view them.');
            } catch {
              console.error('Storage critically full. Cannot save job data.');
            }
          }
        }
      };
      trySave(jobs);
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
    const newId = pregeneratedId || `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = Date.now();
    const newJob: Job = {
      id: newId,
      customerName: formData.fullName,
      vehicleNumber: formData.regNumber,
      serviceType: formData.serviceType,
      status,
      date: "Just now",
      createdAt: now,
      details: formData,
      timeline: status === "Waiting Approval" ? { estimatedAt: now } : {},
    };
    setJobs(prev => [newJob, ...prev]);
    syncToCloud(newJob);
    return newId;
  };

  const updateJobStatus = (id: string, status: Job["status"]) => {
    setJobs(prev => prev.map(j => {
      if (j.id === id) {
        const updated = { ...j, status };
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
        // 3. Clear Local Storage
        localStorage.removeItem("kyc_jobs_v3");
        alert("All job data cleared successfully from Server and Local device.");
      } else {
        alert("Server clear failed: " + data.error);
      }
    } catch (err) {
      console.error("Clear failed:", err);
      alert("An error occurred while clearing data.");
    }
  };

  return (
    <JobsContext.Provider value={{ jobs, isLoaded, addJob, updateJobStatus, updateJobDetails, addTimelineEvent, deleteJob, clearAllJobs }}>
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
