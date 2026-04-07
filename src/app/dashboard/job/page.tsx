"use client";

import { useState, useEffect, Suspense } from "react";
import { 
  Lock, Edit3, Printer,
  User, Car, IndianRupee, ClipboardCheck, ArrowLeft, Download,
  ChevronRight, ChevronLeft, Calendar, Check, Camera, UploadCloud, AlertCircle, Package, X
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobs } from "@/context/JobsContext";
import { useSettings } from "@/context/SettingsContext";

function JobDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { jobs, isLoaded, updateJobStatus, updateJobDetails, addTimelineEvent } = useJobs();
  const { 
    serviceTypes, subCategories: subCategoryOptions, particulars: catalogItems, 
    inventorySeries, consumeInventoryItem, releaseInventoryItem
  } = useSettings();

  const [isReadOnly, setIsReadOnly] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showStartWorkModal, setShowStartWorkModal] = useState(false);
  const [showEndWorkModal, setShowEndWorkModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pin, setPin] = useState("");
  const [editData, setEditData] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<{url: string, type: string, name: string} | null>(null);
  const [selectedGradeIdx, setSelectedGradeIdx] = useState<number | null>(null);
  const [commission, setCommission] = useState<number>(0);
  const [particularsStep, setParticularsStep] = useState(1); // 1: Sub-category, 2: Particulars
  const [tempSubCategories, setTempSubCategories] = useState<string[]>([]);
  const [showStockPicker, setShowStockPicker] = useState(false);
  const [pickingParticular, setPickingParticular] = useState<string | null>(null);
  const [manualItems, setManualItems] = useState<any[]>([]);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newManualItem, setNewManualItem] = useState({ serviceType: "", product: "", qty: 1, rate: 0 });

  // File Upload State for late uploads
  const [files, setFiles] = useState<{ documents: any[] }>({
    documents: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Helper: convert a data: URL to a blob: URL for reliable PDF embedding
  const dataurlToBlob = (dataUrl: string): string => {
    try {
      if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
      const parts = dataUrl.split(',');
      if (parts.length < 2) return dataUrl;
      
      const header = parts[0];
      const b64 = parts[1];
      const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf';
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("dataurlToBlob conversion failed:", e);
      return dataUrl; // fallback
    }
  };

  // Open the in-app viewer, converting data: to blob: if needed
  const openDocumentViewer = (doc: { preview?: string; url?: string; type?: string; name: string }) => {
    const raw = doc.preview || doc.url || '';
    if (!raw) return;
    
    const isPdf = doc.type === 'application/pdf' || raw.startsWith('data:application/pdf');
    let viewUrl = raw;
    
    // Only attempt conversion if it's a data URL and a PDF
    if (isPdf && raw.startsWith('data:')) {
      try {
        const converted = dataurlToBlob(raw);
        if (converted) viewUrl = converted;
      } catch (err) {
        console.error("Failed to convert PDF data URL to blob", err);
        // Fallback to raw data URL (iframe might still handle it if not too large)
      }
    }
    
    setPreviewDoc({ 
      url: viewUrl, 
      type: isPdf ? 'application/pdf' : (doc.type || 'image/jpeg'), 
      name: doc.name 
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: "documents") => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const blobUrl = URL.createObjectURL(file);
          setFiles(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), { 
              file,
              // Store both the data URL (for persistence) and the blob URL (for preview)
              preview: reader.result as string,  // data: URL for saving to storage
              blobUrl,                            // blob: URL for viewing
              name: file.name,
              type: file.type
            }]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const job = jobs.find(j => j.id === id);

  // Initialise editData when job loads or edit mode begins
  useEffect(() => {
    if (job) {
      const details = { ...job.details };
      // Migration: Ensure all legacy docs are in the documents array
      if (!details.documents) details.documents = [];
      ['idProof', 'rcBook', 'selfie', 'workEvidence'].forEach(key => {
        if (job.details[key] && !details.documents.some((ad: any) => ad.name === key)) {
          const val = job.details[key];
          const docsToAdd = Array.isArray(val) ? val : [{ preview: val, name: key, type: 'image/jpeg' }];
          details.documents.push(...docsToAdd);
        }
      });
      setEditData(details);
      setManualItems(details.manualItems || []);
    }
  }, [job?.id, job?.details]);

  const handleDeleteDocument = (idx: number) => {
    if (isReadOnly) return;
    const currentDocs = (editData?.documents || job?.details?.documents || []);
    const updatedDocs = currentDocs.filter((_: any, i: number) => i !== idx);
    setEditData({ ...(editData || job?.details || {}), documents: updatedDocs });
  };

  if (!id || !isLoaded) {
    return (
      <div className="job-detail-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p className="text-muted animate-pulse">Loading Job Data...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>Job record not found. It may have been deleted or the link is incorrect.</p>
        <button className="primary-btn" onClick={() => router.push(`/dashboard/job/invoice?id=${id}`)}>
          <Printer size={18} /> View Invoice
        </button>
      </div>
    );
  }

  const d = editData || job.details || {};
  const isEstimate = job.status === "Waiting Approval" || job.status === "Rejected";

  const customerName = d.fullName || job.customerName;
  const customerPhone = d.phone || "";
  const customerAddress = d.address || "";
  const vehicleReg = d.regNumber || job.vehicleNumber;
  const vehicleBrand = d.brand || "";
  const vehicleModel = d.model || "";
  const vehicleCategory = d.category || "4-Wheeler";
  const serviceType = d.serviceType || job.serviceType;
  const subCategoryOptionsSettings = subCategoryOptions || [];
  const particulars: any[] = d.particulars || [];
  const serviceCharge = Number(d.serviceCharge) || 0;
  const itemsCharge = particulars.reduce((s: number, p: any) => s + Number(p.cost || 0), 0);
  const manualItemsCharge = (manualItems || []).reduce((s: number, p: any) => s + (Number(p.rate || 0) * Number(p.qty || 1)), 0);
  const total = Number(d.totalCharge) || (serviceCharge + itemsCharge + manualItemsCharge);
  const needsDocuments = d.uploadChoice === "later" && (!d.documents || d.documents.length === 0);

  const refField = (label: string, val: string, key: string, inputType = "text", options?: string[]) => (
    <div className="ref-info-row">
      <span className="ref-label">{label}</span>
      {isReadOnly
        ? <span className="ref-value">{val || "—"}</span>
        : options ? (
          <select className="display-input editable" style={{ flex: 1.5, textAlign: 'right' }} value={d[key] || ""} onChange={e => setEditData({ ...d, [key]: e.target.value })}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={inputType} className="display-input editable" style={{ flex: 1.5, textAlign: 'right' }} value={d[key] || ""} onChange={e => setEditData({ ...d, [key]: e.target.value })} />
        )
      }
    </div>
  );

  const handleParticularToggle = (item: any) => {
    if (isReadOnly && !showEndWorkModal) return;
    const isSelected = d.particulars?.some((p: any) => p.name === item.name);
    
    let updated;
    if (isSelected) {
      updated = (d.particulars || []).filter((p: any) => p.name !== item.name);
    } else {
      updated = [...(d.particulars || []), { ...item, selectedMarks: [] }];
    }

    setEditData({ ...d, particulars: updated });
  };

  const toggleStockMark = (particularName: string, stockInfo: any) => {
    const updated = [...(d.particulars || [])];
    const pNameNorm = particularName.trim().toUpperCase();
    const pIdx = updated.findIndex(p => p.name.trim().toUpperCase() === pNameNorm);
    if (pIdx === -1) return;

    const p = { ...updated[pIdx] };
    const selectedMarks = p.selectedMarks ? [...p.selectedMarks] : [];
    
    const existingIdx = selectedMarks.findIndex((m: any) => m.itemId === stockInfo.itemId);
    if (existingIdx !== -1) {
      selectedMarks.splice(existingIdx, 1);
    } else {
      selectedMarks.push(stockInfo);
    }

    p.selectedMarks = selectedMarks;
    p.quantity = Math.max(1, selectedMarks.length);
    updated[pIdx] = p;
    setEditData({ ...d, particulars: updated });
  };

  const handleServiceChargeChange = (val: number) => {
    setEditData({ ...d, serviceCharge: val, totalCharge: val });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const finalData = { ...editData };
        // 1. Get all current documents (existing + new)
        const currentDocs = [
          ...(Array.isArray(finalData.documents) ? finalData.documents : []),
          ...files.documents
        ];
        
        // 2. Upload any document that doesn't have a web link yet
        const uploadedDocs = await Promise.all(
          currentDocs.map(async (doc) => {
            // Already synced? Skip.
            if (doc.preview && (doc.preview.startsWith('http') || doc.preview.includes('drive.google.com'))) {
              return doc;
            }

            // Not synced but has file/preview? Upload.
            const fileToUpload = (doc as any).file;
            const previewToUpload = doc.preview;

            if (fileToUpload || (previewToUpload && previewToUpload.startsWith('data:'))) {
              const formData = new FormData();
              
              if (fileToUpload) {
                formData.append('file', fileToUpload);
              } else {
                // Convert base64 preview back to blob
                const res = await fetch(previewToUpload);
                const blob = await res.blob();
                formData.append('file', blob);
              }
              
              formData.append('fileName', doc.name || 'document.jpg');
              
              try {
                const res = await fetch('/api/google/upload-file', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.webViewLink) {
                  return { preview: data.webViewLink, name: doc.name, type: doc.type };
                }
              } catch (err) {
                console.error("Upload failed for doc:", doc.name, err);
              }
            }
            return doc;
          })
        );

        finalData.documents = uploadedDocs;
      
      // Update docsFolderLink for Google Sheets (Column R)
      const allLinks = (finalData.documents || [])
        .map((doc: any) => doc.preview || doc.url)
        .filter((link: string) => link && (link.includes('drive.google.com') || link.startsWith('http')));
      
      finalData.docsFolderLink = allLinks.join(', ');

      // Migration: legacy Individual docs -> documents array
      ['idProof', 'rcBook', 'selfie', 'workEvidence'].forEach(legacyKey => {
        if (job.details[legacyKey] && !finalData.documents?.some((d: any) => d.name === legacyKey)) {
          if (!finalData.documents) finalData.documents = [];
          const legacyItems = Array.isArray(job.details[legacyKey]) ? job.details[legacyKey] : [{ preview: job.details[legacyKey], name: legacyKey, type: 'image/jpeg' }];
          finalData.documents.push(...legacyItems);
        }
      });

      updateJobDetails(job.id, { ...finalData, manualItems });
      setIsReadOnly(true);
      setFiles({ documents: [] });
    } catch (e) {
      console.error(e);
      alert("Failed to save documents.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    if (isReadOnly) { setShowPinModal(true); }
    else { handleSaveChanges(); }
  };

  const verifyPin = () => {
    if (pin === "1234") {
      setIsReadOnly(false);
      setShowPinModal(false);
      setPin("");
    } else {
      setPin("");
      alert("Invalid Admin PIN!");
    }
  };

  const statusBadgeStyle = {
    fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.7rem", borderRadius: "999px",
    background: job.status === "Waiting Approval" ? "rgba(245,158,11,0.15)" : 
                job.status === "Approved" ? "rgba(16,185,129,0.15)" : 
                job.status === "Completed" ? "rgba(16,185,129,0.15)" : 
                job.status === "Rejected" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
    color: job.status === "Waiting Approval" ? "var(--warning)" : 
           job.status === "Approved" || job.status === "Completed" ? "var(--success)" : 
           job.status === "Rejected" ? "var(--danger)" : "var(--accent-primary)",
    border: `1px solid ${
      job.status === "Waiting Approval" ? "rgba(245,158,11,0.3)" : 
      job.status === "Approved" || job.status === "Completed" ? "rgba(16,185,129,0.3)" : 
      job.status === "Rejected" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"
    }`,
  } as React.CSSProperties;

  return (
    <>
      <div className="ref-page-container">
      {/* HEADER */}
      <header className="ref-header">
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="no-print">E-KYC Details</h1>
        {/* PRINT ONLY HEADER */}
        <div style={{ display: 'none' }} className="print-header">
           <h1 style={{ color: '#1e3a8a', margin: 0, fontSize: '24px' }}>SAI AUTO KEY WORKS</h1>
           <div style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>E-KYC TECHNICAL REGISTRY • JOB ID: #{job.id}</div>
        </div>
      </header>

      {/* ADMIN CONTROLS (Top Bar) */}
      <div className="ref-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0' }}>
         <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={statusBadgeStyle}>{job.status}</span>
            <span className="date-tag" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{job.date}</span>
         </div>
         <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary-btn small-btn" onClick={() => window.print()}><Printer size={16} /></button>
            <button className="primary-btn small-btn" onClick={handleEditClick} disabled={isSaving}>
              {isSaving ? <span style={{ fontSize: '0.8rem' }}>Wait...</span> : isReadOnly ? <Lock size={16} /> : <Check size={16} />}
            </button>
            {!isReadOnly && (
              <button className="secondary-btn small-btn" style={{ color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                onClick={() => { setEditData({ ...job.details }); setIsReadOnly(true); }}>
                <X size={16} />
              </button>
            )}
         </div>
      </div>

      {/* END WORK & APPROVAL ACTIONS based on status */}
      {(job.status === "Waiting Approval" || job.status === "Approved" || job.status === "In Progress" || (job.status === "Completed") || job.status === "Rejected") && (
        <div className="ref-card" style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
          {job.status === "Waiting Approval" && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="primary-btn" style={{ flex: 3, background: 'var(--success)' }}
                onClick={() => { setSelectedGradeIdx(null); setShowApproveModal(true); }}>
                <Check size={18} /> Approve Estimate & Proceed
              </button>
              <button className="secondary-btn" style={{ flex: 1, color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                onClick={() => setShowRejectModal(true)}>
                <X size={18} /> Reject
              </button>
            </div>
          )}
          {(job.status === "Approved") && !job.timeline?.workStartedAt && (
            <button className="primary-btn w-full" style={{ background: 'var(--accent-primary)' }}
              onClick={() => { updateJobStatus(job.id, 'In Progress'); addTimelineEvent(job.id, 'workStartedAt'); }}>
              🔧 Start Work Now
            </button>
          )}

           {job.status === "In Progress" && (
            <button className="primary-btn w-full" style={{ background: 'var(--warning)', color: '#000' }}
              onClick={() => {
                setParticularsStep(1);
                setTempSubCategories(Array.isArray(d.subCategories) ? [...d.subCategories] : []);
                setCommission(d.commission || 0);
                setShowEndWorkModal(true);
              }}>
              🏁 Mark as Work Done
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: job.status === "Waiting Approval" || job.status === "Approved" || job.status === "In Progress" ? '0.5rem' : '0' }}>
            {/* Estimate Button - Always available once job exists */}
            <button className="primary-btn" style={{ flex: 1, background: '#3b82f6' }} onClick={() => { 
              router.push(`/dashboard/job/invoice?id=${job.id}&type=estimate`);
            }}>
              {d.hideEstimateTotal ? "View Estimate (Multi-tier)" : "View Estimate"}
            </button>

            {/* Invoice Button - Available after work starts or completes */}
            {/* Invoice Button - Available after work starts or completes */}
            {(job.status === "Completed" || job.status === "Approved" || job.status === "In Progress") && (
              <button className="primary-btn green-btn" style={{ flex: 1 }} onClick={() => { 
                if (!job.timeline?.invoiceGeneratedAt) addTimelineEvent(job.id, 'invoiceGeneratedAt'); 
                router.push(`/dashboard/job/invoice?id=${job.id}`);
              }}>
                {job.status === "Approved" || job.status === "In Progress" ? "Generate Invoice" : "View Invoice"}
              </button>
            )}
          </div>
          {job.status === "Completed" && !job.timeline?.paymentReceivedAt && (
            <button className="secondary-btn w-full" style={{ marginTop: '0.5rem', borderColor: 'var(--success)', color: 'var(--success)' }}
              onClick={() => setShowPaymentModal(true)}>
              💰 Record Payment
            </button>
          )}
        </div>
      )}

      {/* 1. PERSONAL DETAIL */}
      <div className="ref-card animate-fade-in">
        <div className="ref-section-title-wrapper">
          <div className="ref-section-pill"></div>
          <h2 className="ref-section-title">Personal Detail</h2>
        </div>
        {refField("Name", customerName, "fullName")}
        {refField("Address", customerAddress, "address")}
        {refField("Mobile No.", customerPhone, "phone", "tel")}
        {refField("Reference Name", d.referenceName, "referenceName")}
        <div className="ref-info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.5rem' }}>
          <span className="ref-label">Complaint History</span>
          {isReadOnly 
            ? <span className="ref-value" style={{ width: '100%', textAlign: 'left', fontStyle: d.complaintHistory ? 'normal' : 'italic' }}>{d.complaintHistory || "None recorded"}</span>
            : <textarea className="display-input editable" rows={2} value={d.complaintHistory || ""} onChange={e => setEditData({ ...d, complaintHistory: e.target.value })} />
          }
        </div>
      </div>

      {/* 2. VEHICLE DETAIL */}
      <div className="ref-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="ref-section-title-wrapper">
          <div className="ref-section-pill"></div>
          <h2 className="ref-section-title">Vehicle Detail</h2>
        </div>
        {refField("Vehicle No.", vehicleReg, "regNumber")}
        {refField("Vehicle Brand", vehicleBrand, "brand")}
        {refField("Vehicle Model", vehicleModel, "model")}
        {refField("Manufacture Year", d.year || d.manufactureYear || "—", "year")}
        {refField("Vehicle Type", vehicleCategory, "category", "select", ["4-Wheeler", "2-Wheeler", "3-Wheeler", "HCV"])}
      </div>

      {/* 3. STATUS DETAIL */}
      <div className="ref-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="ref-section-title-wrapper">
          <div className="ref-section-pill"></div>
          <h2 className="ref-section-title">Status Detail</h2>
        </div>
        <div className="ref-info-row">
          <span className="ref-label">Estimate Memo No.</span>
          <span className="ref-value">{job.id}</span>
        </div>
        <div className="ref-info-row">
          <span className="ref-label">Vehicle Estimate</span>
          <span className="ref-value" style={{ color: d.hideEstimateTotal ? 'var(--accent-primary)' : 'inherit', fontWeight: d.hideEstimateTotal ? 700 : 'normal' }}>
            {d.hideEstimateTotal ? "MULTI-TIER QUOTE" : `₹ ${total}`}
          </span>
        </div>
        {d.hideEstimateTotal && d.qualityOptions && d.qualityOptions.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(59,130,246,0.05)', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>OPTIONS</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>RATE (₹)</span>
            </div>
            {d.qualityOptions.map((opt: any, idx: number) => (
              <div key={idx} style={{ padding: '0.4rem 0', borderBottom: idx < d.qualityOptions.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>{opt.label}</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{opt.rate ? `₹${opt.rate}` : "TBD"}</span>
                </div>
                {opt.description && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{opt.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="ref-info-row">
          <span className="ref-label">Status</span>
          <span className="ref-value" style={{ color: job.status === "Pending" ? "var(--warning)" : job.status === "Approved" ? "var(--success)" : "#334155" }}>{job.status}</span>
        </div>
        {refField("E-KYC Service", serviceType, "serviceType", "select", serviceTypes)}
        {refField("Consent Type", d.consentType, "consentType")}
        <div className="ref-info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.5rem' }}>
          <span className="ref-label">Sub-categories</span>
          <span className="ref-value" style={{ width: '100%', textAlign: 'left' }}>
            {(Array.isArray(d.subCategories) && d.subCategories.length > 0) ? d.subCategories.join(", ") : d.subCategory || "None"}
          </span>
        </div>
        
        {particulars.length > 0 && (
          <div className="ref-info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
            <span className="ref-label">Job Particulars</span>
            <div className="ref-value" style={{ width: '100%', textAlign: 'left', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {particulars.map((p: any, idx: number) => (
                <span key={idx} style={{ 
                  background: 'rgba(59,130,246,0.1)', 
                  color: 'var(--accent-primary)', 
                  padding: '0.15rem 0.6rem', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  border: '1px solid rgba(59,130,246,0.2)'
                }}>
                  {p.name.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* INVENTORY / RAW ID DISPLAY */}
        {(d.particulars || []).some((p: any) => (p.selectedMarks && p.selectedMarks.length > 0) || p.inventoryInfo) && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Transponder Usage</span>
            {(d.particulars || []).filter((p: any) => (p.selectedMarks && p.selectedMarks.length > 0) || p.inventoryInfo).map((p: any, idx: number) => {
              const marks = p.selectedMarks || (p.inventoryInfo ? [p.inventoryInfo] : []);
              return (
                <div key={idx} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{p.name.toUpperCase()}</div>
                  {marks.map((m: any, mIdx: number) => (
                    <div key={mIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginLeft: '0.5rem', marginBottom: '0.1rem' }}>
                      <span style={{ fontWeight: 600 }}>• {m.mark}</span>
                      <code style={{ background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                        {m.rawId || m.id || "NO RAW ID"}
                      </code>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. DOCUMENT DETAIL */}
      <div className="ref-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="ref-section-title-wrapper" style={{ marginBottom: '0' }}>
          <div className="ref-section-pill"></div>
          <h2 className="ref-section-title">Document Detail</h2>
          {!isReadOnly && (
            <button className="secondary-btn small-btn" style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => document.getElementById(`file-docs-ref`)?.click()}>
               + Add
               <input type="file" id={`file-docs-ref`} accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={e => handleFileChange(e, 'documents')} />
            </button>
          )}
        </div>
        
        {needsDocuments && (
          <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', fontSize: '0.85rem', borderRadius: '8px', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> Documents Pending Upload
          </div>
        )}

        <div className="ref-doc-grid">
          {(() => {
            const existingDocs: any[] = Array.isArray(job.details.documents) ? [...job.details.documents] : [];
            const displayNames: Record<string, string> = {
              'idProof': 'Photo ID Proof',
              'rcBook': 'RC Book Photo',
              'selfie': 'Vehicle with Customer Photo',
              'workEvidence': 'Key Number Photo'
            };

            ['idProof', 'rcBook', 'selfie', 'workEvidence'].forEach(legacyKey => {
              if (job.details[legacyKey] && !existingDocs.some(d => d.name === legacyKey)) {
                const legacyItems = Array.isArray(job.details[legacyKey]) ? job.details[legacyKey] : [{ preview: job.details[legacyKey], name: legacyKey, type: 'image/jpeg' }];
                existingDocs.push(...legacyItems);
              }
            });

            const currentFiles = [...(d.documents || []), ...files.documents];

            if (currentFiles.length === 0) {
              return isReadOnly ? <div style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '1rem 0', gridColumn: '1 / -1', textAlign: 'center' }}>No documents uploaded.</div> : null;
            }

            return currentFiles.map((f, idx) => {
              // Determine display name
              let cardTitle = f.name || `Attached Document ${idx + 1}`;
              if (displayNames[f.name]) cardTitle = displayNames[f.name]; // Map legacy keys to nice titles
              
              const isPdf = f.type === 'application/pdf' || (f.preview && f.preview.startsWith('data:application/pdf'));
              const isNew = idx >= (d.documents?.length || 0);
              
              // For new uploads we have a blobUrl directly; for stored docs we convert on click
              const viewUrl = f.blobUrl || f.preview || '';

              return (
                <div key={idx} className="ref-doc-card" style={{ position: 'relative' }}>
                  <div className="ref-doc-header" title={cardTitle}>{cardTitle}</div>
                  <div className="ref-doc-img-wrapper" onClick={() => openDocumentViewer({ preview: viewUrl, type: isPdf ? 'application/pdf' : (f.type || 'image/jpeg'), name: cardTitle })}>
                    {isPdf ? (
                      <div className="pdf-thumb-placeholder">
                        <ClipboardCheck size={32} className="pdf-icon" />
                        <span className="pdf-text">VIEW PDF</span>
                        <span className="pdf-subtext">Click to open in viewer</span>
                      </div>
                    ) : (
                      <img src={f.blobUrl || f.preview!} alt={cardTitle} className="ref-doc-img" />
                    )}
                    {f.preview && (
                       <a href={f.preview} download={cardTitle} className="ref-download-btn" onClick={e => e.stopPropagation()} title="Download">
                         <Download size={14} />
                       </a>
                    )}
                  </div>
                  {!isReadOnly && (
                    <button 
                      style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 22, height: 22, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 11, fontSize: 14 }} 
                      onClick={() => {
                        if (isNew) {
                          setFiles(prev => ({
                            ...prev,
                            documents: prev.documents.filter((_, i) => i !== (idx - (d.documents?.length || 0)))
                          }));
                        } else {
                          handleDeleteDocument(idx);
                        }
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* AFTER SALES SERVICE COMPLAINT */}
      <div className="ref-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="ref-section-title-wrapper">
          <div className="ref-section-pill" style={{ background: 'var(--danger)' }}></div>
          <h2 className="ref-section-title">After Sales Service</h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Log any post-service complaints or issues reported by the client.</p>
        {isReadOnly 
          ? <div style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', minHeight: '60px', color: d.afterSalesComplaint ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
              {d.afterSalesComplaint || "No after-sales complaints recorded."}
            </div>
          : <textarea 
              className="display-input editable" 
              placeholder="Enter complaint details here..."
              rows={4} 
              value={d.afterSalesComplaint || ""} 
              onChange={e => setEditData({ ...d, afterSalesComplaint: e.target.value })} 
            />
        }
      </div>

      {/* EDIT MODE EXTRA SETTINGS (Particulars trigger) */}
      {!isReadOnly && (
        <div className="ref-card animate-fade-in" style={{ animationDelay: '0.45s' }}>
            <div className="ref-section-title-wrapper">
              <div className="ref-section-pill"></div>
              <h2 className="ref-section-title">Record Adjustments</h2>
            </div>
            <div className="ref-info-row">
              <span className="ref-label">Service Charge (₹)</span>
              <input type="number" className="display-input editable" style={{ flex: 1.5, textAlign: 'right' }} value={d.serviceCharge || 0} onChange={e => handleServiceChargeChange(Number(e.target.value))} />
            </div>
            
            <button 
              className="primary-btn w-full mt-4" 
              style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
              onClick={() => {
                setParticularsStep(1);
                setTempSubCategories(Array.isArray(d.subCategories) ? [...d.subCategories] : []);
                setCommission(d.commission || 0);
                setShowEndWorkModal(true);
              }}
            >
              <Package size={16} /> Manage Sub-Categories & Items
            </button>
        </div>
      )}

      {/* 5. JOB TIMELINE */}
      <div className="ref-card animate-fade-in" style={{ animationDelay: '0.5s', marginBottom: '2rem' }}>
        <div className="ref-section-title-wrapper">
          <div className="ref-section-pill"></div>
          <h2 className="ref-section-title">Job Timeline</h2>
        </div>
        <div style={{ padding: '0 0.5rem' }}>
          {(() => {
            const tl = job.timeline || {};
            const fmt = (ts?: number) => ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
            const events = [
              { key: 'estimatedAt', label: 'Estimate Sent', icon: '📋', done: !!tl.estimatedAt, ts: fmt(tl.estimatedAt) },
              { key: 'approvedAt', label: 'Estimate Approved', icon: '✅', done: !!tl.approvedAt, ts: fmt(tl.approvedAt) },
              { key: 'workStartedAt', label: 'Work Started', icon: '🔧', done: !!tl.workStartedAt, ts: fmt(tl.workStartedAt) },
              { key: 'workEndedAt', label: 'Work Completed', icon: '🏁', done: !!tl.workEndedAt, ts: fmt(tl.workEndedAt) },
              { key: 'invoiceGeneratedAt', label: 'Invoice Generated', icon: '🧾', done: !!tl.invoiceGeneratedAt, ts: fmt(tl.invoiceGeneratedAt) },
              { key: 'paymentReceivedAt', label: 'Payment Received', icon: '💰', done: !!tl.paymentReceivedAt, ts: fmt(tl.paymentReceivedAt) },
            ];
            return events.map((ev, i) => (
              <div key={ev.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.85rem 0', borderBottom: i < events.length - 1 ? '1px dotted #CBD5E1' : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: ev.done ? '#ecfdf5' : '#f8fafc', border: `1px solid ${ev.done ? '#10b981' : '#e2e8f0'}` }}>
                  {ev.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: ev.done ? '#1e293b' : '#94a3b8' }}>{ev.label}</div>
                  <div style={{ fontSize: '0.8rem', color: ev.done ? '#10b981' : '#cbd5e1', marginTop: '0.15rem' }}>
                    {ev.ts || 'Pending'}
                  </div>
                </div>
                {ev.done && <Check size={16} style={{ color: '#10b981', marginTop: '0.25rem', flexShrink: 0 }} />}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* APPROVAL CONFIRMATION MODAL */}
      {showApproveModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel">
            <h3 style={{ marginBottom: '0.5rem' }}>✅ Approve Estimate?</h3>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '1rem', margin: '1rem 0', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer</span>
                <strong>{job.customerName}</strong>
              </div>
              
              {d.hideEstimateTotal && d.qualityOptions && d.qualityOptions.length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                   <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>SELECT CHOSEN QUALITY TO LOCK PRICE:</p>
                   {d.qualityOptions.map((opt: any, idx: number) => (
                     <label key={idx} className={`grade-option ${selectedGradeIdx === idx ? 'active' : ''}`} 
                       onClick={() => setSelectedGradeIdx(idx)}
                       style={{ 
                         display: 'flex', flexDirection: 'column', padding: '0.6rem 0.8rem', 
                         background: selectedGradeIdx === idx ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                         border: `1px solid ${selectedGradeIdx === idx ? 'var(--success)' : 'var(--glass-border)'}`,
                         borderRadius: '6px', marginBottom: '0.4rem', cursor: 'pointer'
                       }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                         <span style={{ fontWeight: 600 }}>{opt.label}</span>
                         <span style={{ fontWeight: 800 }}>₹{opt.rate}</span>
                       </div>
                       {opt.description && (
                         <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.8 }}>{opt.description}</div>
                       )}
                     </label>
                   ))}
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Grand Total</span>
                  <strong style={{ color: 'var(--success)' }}>₹ {total}</strong>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowApproveModal(false)}>Cancel</button>
              <button 
                className="primary-btn" 
                style={{ background: 'var(--success)', opacity: (d.hideEstimateTotal && d.qualityOptions?.length > 0 && selectedGradeIdx === null) ? 0.5 : 1 }} 
                disabled={d.hideEstimateTotal && d.qualityOptions?.length > 0 && selectedGradeIdx === null}
                onClick={() => {
                  let finalDetails = { ...d };
                  if (d.hideEstimateTotal && selectedGradeIdx !== null) {
                    const chosen = d.qualityOptions[selectedGradeIdx];
                    // Instead of turning off hideEstimateTotal, we keep it for HISTORICAL estimate view
                    // but we set a 'approvedGrade' to lock the invoice logic
                    finalDetails.approvedGrade = chosen;
                    finalDetails.totalCharge = chosen.rate;
                    finalDetails.serviceCharge = chosen.rate;
                  }
                  updateJobDetails(job.id, finalDetails);
                  updateJobStatus(job.id, 'Approved');
                  addTimelineEvent(job.id, 'approvedAt');
                  setShowApproveModal(false);
                  setShowStartWorkModal(true);
                }}>
                <Check size={16} /> Yes, Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START WORK MODAL */}
      {showStartWorkModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel">
            <h3 style={{ marginBottom: '0.5rem' }}>🔧 Start Work Now?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Is the technician beginning work on this job right now?</p>
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ℹ️ Selecting <strong> Yes </strong> will record work start time and set status to <strong> In Progress</strong>.
              Selecting <strong> No </strong> keeps it as <strong> Approved</strong> until you're ready.
            </div>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowStartWorkModal(false)}>Not Yet — Keep Approved</button>
              <button className="primary-btn" onClick={() => {
                updateJobStatus(job.id, 'In Progress');
                addTimelineEvent(job.id, 'workStartedAt');
                setShowStartWorkModal(false);
              }}>
                🔧 Yes, Start Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PIN MODAL */}
      {showPinModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel">
            <h3>Admin Verification</h3>
            <p>Enter Master PIN to unlock record for editing.</p>
            <input type="password" className="input-field pin-input" autoFocus placeholder="Enter PIN"
              value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && verifyPin()} />
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowPinModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={verifyPin}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* END WORK MODAL - MULTI-STEP */}
      {showEndWorkModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel" style={{ maxWidth: '500px' }}>
            
            {/* STEP 1: SUB-CATEGORY POP-UP */}
            {particularsStep === 1 && (
              <div className="animate-fade-in">
                <h3 style={{ marginBottom: '0.5rem' }}>🏷️ Select Sub-Categories</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>Choose the service categories applicable to this job.</p>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                  {subCategoryOptionsSettings.map((sc: any) => {
                    const selected = tempSubCategories.includes(sc.name);
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setTempSubCategories(prev => 
                            selected ? prev.filter(s => s !== sc.name) : [...prev, sc.name]
                          );
                        }}
                        style={{
                          padding: '0.6rem 1.2rem',
                          borderRadius: '999px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: selected ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                          background: selected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                          color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {selected && '✓ '}{sc.name}
                      </button>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <button className="secondary-btn" onClick={() => setShowEndWorkModal(false)}>Cancel</button>
                  <button className="primary-btn" onClick={() => setParticularsStep(2)}>
                    Next: Pick Materials <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: JOB PARTICULARS POP-UP */}
            {particularsStep === 2 && (
              <div className="animate-fade-in">
                <h3 style={{ marginBottom: '0.5rem' }}>🏁 Finish & Select Items</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Select the parts used for <strong>{job.vehicleNumber}</strong>.
                </p>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>JOB PARTICULARS:</label>
                  <div className="checkbox-list" style={{ maxHeight: "200px", overflowY: "auto", display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {catalogItems
                      .filter((p: any) => p.category?.toUpperCase() !== "SERVICES")
                      .map((p: any) => {
                        const sel = d.particulars?.some((x: any) => x.name === p.name);
                        const pOptions = catalogItems || [];
                        const pNameNormalized = p.name.trim().toUpperCase();
                        const pDef = pOptions.find((opt: any) => opt.name.trim().toUpperCase() === pNameNormalized);
                        const stockSeries = inventorySeries.find(s => s.name.trim().toUpperCase() === pNameNormalized);
                        const hasInventory = pDef?.hasInventory === true || pDef?.hasInventory === "true" || !!stockSeries;
                        
                        return (
                          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label className={`checkbox-item glass-panel ${sel ? "active" : ""}`} 
                              onClick={() => handleParticularToggle(p)} 
                              style={{ cursor: "pointer", padding: '0.75rem', borderRadius: '8px', border: sel ? '1px solid var(--accent-primary)' : '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: sel ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel ? 'var(--accent-primary)' : 'transparent' }}>
                                {sel && <Check size={14} color="white" />}
                              </div>
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.name}</span>
                              </div>
                            </label>

                            {hasInventory && sel && (
                              <div style={{ marginLeft: '2.5rem', marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                  {d.particulars?.find((x: any) => x.name.trim().toUpperCase() === pNameNormalized)?.selectedMarks?.map((m: any) => (
                                    <div key={m.itemId} style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                                      {m.mark}
                                      <X size={10} style={{ cursor: 'pointer' }} onClick={() => toggleStockMark(p.name, m)} />
                                    </div>
                                  ))}
                                </div>
                                <button 
                                  className="secondary-btn small-btn" 
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
                                  onClick={() => {
                                    setPickingParticular(p.name);
                                    setShowStockPicker(true);
                                  }}
                                >
                                  <Package size={14} /> Link Stock ID
                                </button>
                              </div>
                            )}
                            {inventorySeries.filter(s => s.name === p.name && !s.isExhausted).length === 0 && hasInventory && (
                              <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '0.5rem', marginLeft: '2.5rem' }}>⚠️ ALL OUT OF STOCK</p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
                

                {/* MANUAL ITEMS SECTION */}
                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)' }}>🛠️ Manual Invoice Items</h4>
                    <button className="secondary-btn small-btn" onClick={() => setShowManualAdd(!showManualAdd)}>
                      {showManualAdd ? "Cancel" : "+ Add Manual"}
                    </button>
                  </div>

                  {showManualAdd && (
                    <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input className="display-input" placeholder="Service (e.g. ALL KEY LOST)" value={newManualItem.serviceType} onChange={e => setNewManualItem({...newManualItem, serviceType: e.target.value})} />
                        <input className="display-input" placeholder="Product (e.g. SMART KEY)" value={newManualItem.product} onChange={e => setNewManualItem({...newManualItem, product: e.target.value})} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input type="number" className="display-input" placeholder="Qty" value={newManualItem.qty} onChange={e => setNewManualItem({...newManualItem, qty: Number(e.target.value)})} />
                        <input type="number" className="display-input" placeholder="Rate (₹)" value={newManualItem.rate} onChange={e => setNewManualItem({...newManualItem, rate: Number(e.target.value)})} />
                      </div>
                      <button className="primary-btn w-full" style={{ background: 'var(--success)' }} 
                        onClick={() => {
                          if (!newManualItem.serviceType || !newManualItem.product) return alert("Please fill both Service and Product");
                          setManualItems(prev => [...prev, { ...newManualItem, id: Date.now().toString() }]);
                          setNewManualItem({ serviceType: "", product: "", qty: 1, rate: 0 });
                          setShowManualAdd(false);
                        }}>
                        Add to Invoice
                      </button>
                    </div>
                  )}

                  <div className="manual-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {manualItems.map((mi, idx) => (
                      <div key={mi.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{mi.serviceType.toUpperCase()}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mi.product} — {mi.qty} x ₹{mi.rate}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', marginRight: '1rem' }}>₹{mi.qty * mi.rate}</div>
                        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setManualItems(prev => prev.filter(x => x.id !== mi.id))}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                  <button className="secondary-btn" onClick={() => setParticularsStep(1)}><ChevronLeft size={16} /> Back</button>
                   <button 
                     className="primary-btn" 
                     style={{ 
                       background: 'var(--warning)', 
                       color: '#000',
                       opacity: (d.particulars || []).some((p: any) => {
                         const pNameNorm = p.name.trim().toUpperCase();
                         const pDef = (catalogItems || []).find((opt: any) => opt.name.trim().toUpperCase() === pNameNorm);
                         const hasInv = pDef?.hasInventory === true || pDef?.hasInventory === "true" || inventorySeries.some(s => s.name.trim().toUpperCase() === pNameNorm);
                         return hasInv && (!p.selectedMarks || p.selectedMarks.length === 0);
                       }) ? 0.5 : 1
                     }} 
                     disabled={(d.particulars || []).some((p: any) => {
                        const pNameNorm = p.name.trim().toUpperCase();
                        const pDef = (catalogItems || []).find((opt: any) => opt.name.trim().toUpperCase() === pNameNorm);
                        const hasInv = pDef?.hasInventory === true || pDef?.hasInventory === "true" || inventorySeries.some(s => s.name.trim().toUpperCase() === pNameNorm);
                        return hasInv && (!p.selectedMarks || p.selectedMarks.length === 0);
                      })}
                     onClick={() => {
                       const updatedDetails = { 
                          ...d,
                          subCategories: tempSubCategories,
                          particulars: d.particulars || [],
                          manualItems: manualItems,
                          commission: commission || 0,
                          // Ensure we pass the latest particulars for sync
                          selectedItems: d.particulars || []
                       };
                       
                       
                       
                       if (job.status === "In Progress") {
                         updateJobStatus(job.id, 'Completed', updatedDetails);
                         addTimelineEvent(job.id, 'workEndedAt');
                         
                         // Consume all selected physical stock marks
                         (d.particulars || []).forEach((p: any) => {
                           if (p.selectedMarks && p.selectedMarks.length > 0) {
                             p.selectedMarks.forEach((m: any) => {
                               consumeInventoryItem(m.itemId, job.id);
                             });
                           } else if (p.inventoryInfo) {
                             // Legacy fallback
                             consumeInventoryItem(p.inventoryInfo.itemId, job.id);
                           }
                         });
                       }
                       setShowEndWorkModal(false);
                     }}
                   >
                     Confirm & Finish Work
                   </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel">
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--danger)' }}>⚠️ Reject This Job?</h3>
            <p>Are you sure you want to mark this estimate as <strong>Rejected</strong>? This record will be kept for history but no further work can be done.</p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="primary-btn" style={{ background: 'var(--danger)' }} onClick={() => {
                releaseInventoryItem(job.id);
                updateJobStatus(job.id, 'Rejected');
                setShowRejectModal(false);
              }}>
                <X size={16} /> Yes, Reject Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay no-print">
          <div className="modal-card glass-panel">
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>💰 Record Payment?</h3>
            <p>Confirm that payment of <strong>₹ {total}</strong> has been received from <strong>{job.customerName}</strong>.</p>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setShowPaymentModal(false)}>Cancel</button>
              <button className="primary-btn" style={{ background: 'var(--success)' }} onClick={() => {
                addTimelineEvent(job.id, 'paymentReceivedAt');
                setShowPaymentModal(false);
              }}>
                <Check size={16} /> Yes, Payment Received
              </button>
            </div>
          </div>
        </div>
      )}
      </div> {/* End ref-page-container */}


      {previewDoc && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewDoc(null)}
          style={{ zIndex: 200 }}
        >
          <div
            className="glass-panel"
            style={{ width: '95vw', height: '95vh', maxWidth: 'none', padding: 0, display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Viewer toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--glass-bg)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ClipboardCheck size={18} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem', maxWidth: '60vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewDoc.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <a href={previewDoc.url} download={previewDoc.name} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                  <Download size={14} /> Download
                </a>
                <button className="icon-btn" onClick={() => setPreviewDoc(null)} style={{ fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            {/* Viewer body */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#222' }}>
              {previewDoc.type === 'application/pdf' || previewDoc.url.startsWith('blob:') ? (
                // Defensive check: If it's not a data/blob/http URL, it's likely a broken path
                (!previewDoc.url.startsWith('data:') && !previewDoc.url.startsWith('blob:') && !previewDoc.url.startsWith('http')) ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ backgroundColor: '#f1f5f9', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                      <X size={40} color="#94a3b8" />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Preview Unvailable</h3>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '300px' }}>This document's preview data is missing or corrupted. You can try downloading it directly.</p>
                    <a href={previewDoc.url} download={previewDoc.name} className="primary-btn" style={{ background: '#3b82f6', color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Download size={18} /> Download Original File
                    </a>
                  </div>
                ) : (
                  <iframe
                    key={previewDoc.url}
                    src={previewDoc.url}
                    title={previewDoc.name}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="fullscreen"
                  />
                )
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STOCK PICKER MODAL (CENTRALIZED) */}
      {showStockPicker && pickingParticular && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-card glass-panel" style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>📦 Link {pickingParticular}</h3>
              <button 
                className="secondary-btn small-btn" 
                onClick={() => setShowStockPicker(false)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>Select the specific serial numbers/marks used from inventory.</p>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(() => {
                const pickNorm = pickingParticular.trim().toUpperCase();
                const particularLines = inventorySeries.filter(s => s.name.trim().toUpperCase() === pickNorm);
                const items = particularLines.flatMap(s => 
                  s.items.filter(i => i.status === 'Available').map(i => ({
                    seriesId: s.id,
                    itemId: i.id,
                    mark: i.mark,
                    rawId: i.rawId,
                    rate: s.purchaseRate,
                    seriesName: s.name
                  }))
                );

                if (items.length === 0) {
                  return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--danger)' }}>No available stock found for this item.</div>;
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                    {items.map(item => {
                      const pickNm = pickingParticular.trim().toUpperCase();
                      const isSel = d.particulars?.find((x: any) => x.name.trim().toUpperCase() === pickNm)?.selectedMarks?.some((m: any) => m.itemId === item.itemId);
                      return (
                        <div 
                          key={item.itemId}
                          onClick={() => toggleStockMark(pickingParticular, item)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: isSel ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)',
                            background: isSel ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                        >
                          {isSel && (
                            <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--accent-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={12} strokeWidth={4} />
                            </div>
                          )}
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSel ? 'var(--accent-primary)' : 'inherit' }}>{item.mark}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.rawId || 'No ID'}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button 
                className="primary-btn w-full" 
                onClick={() => setShowStockPicker(false)}
                style={{ background: 'var(--accent-primary)' }}
              >
                Done Selecting
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .job-detail-container { max-width: 1200px; margin: 0 auto; }
        .detail-header { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .header-info h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .date-tag { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.4rem; }
        .header-actions { margin-left: auto; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        .job-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        @media (max-width: 768px) { .job-grid { grid-template-columns: 1fr; } }
        .main-column, .side-column { display: flex; flex-direction: column; gap: 1.5rem; }
        .detail-section { overflow: hidden; }
        .section-head { padding: 1rem 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; }
        .section-head h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--text-secondary); margin: 0; }
        .flex-between { justify-content: space-between; }
        .section-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .section-body.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .section-body.grid { grid-template-columns: 1fr; } }
        .info-row { display: flex; flex-direction: column; gap: 0.3rem; }
        .label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
        .text-val { font-size: 0.95rem; color: var(--text-primary); font-weight: 500; }
        .plate-badge-dark { background: rgba(59,130,246,0.15); color: var(--accent-primary); font-weight: 700; font-size: 1rem; letter-spacing: 0.08em; padding: 0.25rem 0.75rem; border-radius: 6px; border: 1px solid rgba(59,130,246,0.3); display: inline-block; }
        .display-input { background: rgba(15,23,42,0.5); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.95rem; font-family: var(--font-body); width: 100%; }
        .display-input.editable { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.05); }
        .display-input:focus { outline: none; border-color: var(--accent-primary); }
        select.display-input option { background: var(--bg-secondary); color: var(--text-primary); }
        .billing-section .section-body { gap: 0.5rem; }
        .price-item { display: flex; justify-content: space-between; font-size: 0.95rem; padding: 0.25rem 0; }
        .price-sub-item { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); padding: 0.1rem 0 0.1rem 0.75rem; }
        .mt-2 { margin-top: 0.5rem; }
        .divider { height: 1px; background: var(--glass-border); margin: 0.5rem 0; }
        .price-total { display: flex; justify-content: space-between; font-weight: 700; font-size: 1.05rem; padding: 0.25rem 0; }
        .green-val { color: var(--success); }
        .green-btn { background: var(--success) !important; }
        .w-full { width: 100%; }
        .mt-4 { margin-top: 1rem; }
        .pending-docs-notice { display: flex; align-items: center; gap: 0.5rem; color: var(--warning); background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; }
        .doc-upload-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 0.75rem; }
        @media (max-width: 600px) { .doc-upload-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 400px) { .doc-upload-grid { grid-template-columns: 1fr; } }
        .doc-item { aspect-ratio: 1; background: rgba(0,0,0,0.2); border: 2px dashed var(--glass-border); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: var(--transition); color: var(--text-muted); font-size: 0.8rem; }
        .doc-item:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
        .doc-upload-group { margin-bottom: 1rem; }
        .doc-chips-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
        .doc-chip { width: 80px; height: 80px; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid var(--glass-border); cursor: pointer; transition: transform 0.2s; }
        .doc-chip:hover { transform: scale(1.05); z-index: 2; border-color: var(--accent-primary); }
        .doc-chip img { width: 100%; height: 100%; object-fit: cover; }
        .pdf-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); font-size: 0.7rem; font-weight: 700; color: var(--text-muted); }
        .remove-chip-btn { position: absolute; top: 2px; right: 2px; background: rgba(239,68,68,0.9); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; z-index: 3; }
        .remove-chip-btn:hover { background: var(--danger); }
        
        /* Print Report Attachment Styles */
        .print-doc-group { margin-bottom: 2rem; page-break-inside: avoid; }
        .print-docs-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
        .print-img-container { width: 180pt; height: 180pt; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
        .print-img-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .icon-btn-back { background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 0.6rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .icon-btn-back:hover { background: var(--bg-tertiary); }
        .small-btn { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-card { padding: 2rem; max-width: 380px; width: 90%; }
        .modal-card h3 { margin-bottom: 0.5rem; }
        .modal-card p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .pin-input { text-align: center; font-size: 1.5rem; letter-spacing: 0.5rem; margin-bottom: 1.5rem; }
        .modal-actions { display: flex; gap: 1rem; }
        .checkbox-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border-radius: 8px; margin-bottom: 0.4rem; user-select: none; }
        .checkbox-item.active { border-color: var(--success); background: rgba(16,185,129,0.08); }
        .checkmark { width: 18px; height: 18px; border-radius: 4px; border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .checkbox-item.active .checkmark { background: var(--success); border-color: var(--success); color: white; }
        .item-info { display: flex; justify-content: space-between; width: 100%; }
        .item-price { color: var(--text-muted); font-size: 0.85rem; }
        @media print {
          .no-print, .header-actions, .modal-overlay, .ref-header button, .icon-btn, .primary-btn, .secondary-btn { display: none !important; }
          body { background: white !important; color: black !important; padding: 0.25in !important; }
          .ref-page-container { padding: 0 !important; margin: 0 !important; width: 100% !important; border: none !important; background: white !important; }
          .ref-header { display: flex !important; margin-bottom: 2rem !important; border-bottom: 2px solid #1e3377 !important; padding-bottom: 1rem !important; }
          .print-header { display: block !important; }
          .no-print { display: none !important; }
          .ref-card { 
            background: white !important; 
            border: 1px solid #eee !important; 
            box-shadow: none !important; 
            color: black !important; 
            page-break-inside: avoid;
            margin-bottom: 1rem !important;
            padding: 1rem !important;
            border-radius: 12px !important;
          }
          .ref-label { color: #666 !important; font-weight: 700 !important; font-size: 0.75rem !important; }
          .ref-value, .text-val, .text-primary { color: black !important; }
          .glass-panel { background: white !important; border: 1px solid #eee !important; box-shadow: none !important; }
          .plate-badge-dark { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; color: #1e3a8a !important; font-weight: 800 !important; }
          .status-badge { border: 1px solid #ddd !important; color: black !important; background: transparent !important; }
        }
      `}</style>
    </>
  );
}
export default function JobDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Initializing...</div>}>
      <JobDetailPageContent />
    </Suspense>
  );
}
