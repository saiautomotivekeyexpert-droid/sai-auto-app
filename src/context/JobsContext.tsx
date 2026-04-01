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
  addJob: (jobData: any, status?: Job["status"]) => string;
  updateJobStatus: (id: string, status: Job["status"]) => void;
  updateJobDetails: (id: string, details: Partial<Job["details"]>) => void;
  addTimelineEvent: (id: string, event: keyof JobTimeline) => void;
  deleteJob: (id: string) => void;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedJobs = localStorage.getItem("kyc_jobs_v3");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        // Ensure every job has a timeline object (backward compat)
        setJobs(parsed.map((j: any) => ({ timeline: {}, ...j })));
      } catch {
        setJobs([]);
      }
    } else {
      setJobs([]);
    }
    setIsLoaded(true);
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

  const addJob = (formData: any, status: Job["status"] = "Active"): string => {
    const newId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`;
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

  return (
    <JobsContext.Provider value={{ jobs, isLoaded, addJob, updateJobStatus, updateJobDetails, addTimelineEvent, deleteJob }}>
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
