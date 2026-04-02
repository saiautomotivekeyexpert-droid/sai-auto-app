"use client";

import { useState, useEffect } from "react";
import { 
  User, MapPin, Smartphone, Car, ClipboardCheck, 
  Camera, IndianRupee, Save, ChevronRight, ChevronLeft,
  AlertCircle, History, Check, Package, Share2, Download, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/context/SettingsContext";
import { useJobs } from "@/context/JobsContext";

export default function NewJobPage() {
  const { 
    serviceTypes: serviceTypeOptions, 
    consentTypes: consentTypeOptions, 
    particulars: particularsOptions, 
    subCategories: subCategoryOptions,
    partners: partnerOptions,
    carBrands,
    carModels,
    consumeByProductName
  } = useSettings();
  const { addJob } = useJobs();
  const [step, setStep] = useState(1);
  const [showHistoryAlert, setShowHistoryAlert] = useState(false);
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  const router = useRouter();

  const isTrusted = (type: string) => {
    if (!type) return false;
    return type.toUpperCase().trim() === "PARTNER";
  };

  // Form State
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: "",
    phone: "",
    address: "",
    legalConsent: false,
    
    // Vehicle Details
    regNumber: "",
    category: "4-Wheeler",
    brand: "",
    model: "",
    year: "",
    
    // Service & Billing
    serviceType: serviceTypeOptions[0] || "Add Key",
    consentType: consentTypeOptions[0] || "Owner",
    particulars: [] as any[],
    subCategories: [] as string[],
    complaintHistory: "",
    referenceName: "",
    serviceCharge: 0,
    particularsCharge: 0,
    totalCharge: 0,
    hideEstimateTotal: false, 
    qualityOptions: [{ label: "Grade A", rate: "", description: "" }, { label: "Grade B", rate: "", description: "" }] as { label: string, rate: string, description: string }[], 
    
    // Document Upload Preference
    uploadChoice: "" as "now" | "later" | "",
  });

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // File Upload State
  const [files, setFiles] = useState<{ documents: { file: File | null, preview: string | null, name?: string, type?: string }[] }>({
    documents: [],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: "documents") => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      Array.from(selectedFiles).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFiles(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), { 
              file, 
              preview: file.type.startsWith('image/') || file.type === 'application/pdf' ? reader.result as string : null,
              name: file.name,
              type: file.type
            }]
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const triggerFileInput = (id: string) => {
    document.getElementById(id)?.click();
  };

  useEffect(() => {
    const particularsTotal = formData.particulars.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    setFormData(prev => ({
      ...prev,
      particularsCharge: particularsTotal,
      totalCharge: (Number(prev.serviceCharge) || 0) + particularsTotal
    }));
  }, [formData.serviceCharge, formData.particulars]);

  const handleRegNumberChange = (val: string) => {
    setFormData({ ...formData, regNumber: val.toUpperCase() });
    
    // Mock Real-time database check
    if (val.length >= 4 && val.toUpperCase().includes("KA01")) {
      setShowHistoryAlert(true);
    } else {
      setShowHistoryAlert(false);
    }
  };

  const handleParticularToggle = (item: any) => {
    const isSelected = formData.particulars.some((p: any) => p.name === item.name);
    let updated;

    if (isSelected) {
      updated = formData.particulars.filter((i: any) => i.name !== item.name);
    } else {
      updated = [...formData.particulars, item];
    }
    
    setFormData({ 
      ...formData, 
      particulars: updated,
      particularsCharge: 0 // No longer used
    });
  };

  const handleConfirmAndDownload = () => {
    const finalData: any = { ...formData };
    if (files.documents.length > 0) {
      finalData.documents = files.documents.map(f => ({
        preview: f.preview,
        name: f.name,
        type: f.type
      }));
    }
    addJob(finalData, 'Waiting Approval');
    window.print();
    setTimeout(() => router.push('/dashboard'), 1000);
  };

  const handleReject = () => {
    if (window.confirm("Mark this estimate as Rejected? The record will be kept but status will be 'Rejected'.")) {
      const finalData: any = { ...formData };
      if (files.documents.length > 0) {
        finalData.documents = files.documents.map(f => ({
          preview: f.preview,
          name: f.name,
          type: f.type
        }));
      }
      addJob(finalData, 'Rejected');
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified) {
      alert("Please verify your phone number via OTP first.");
      setStep(1);
      return;
    }
    
    // Upload files to Google Drive before continuing
    const cloudDocs = [];
    for (const f of files.documents) {
      let driveUrl = '';
      if (f.file) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', f.file);
          uploadData.append('fileName', f.name || 'document_upload');
          
          const res = await fetch('/api/google/upload-file', {
            method: 'POST',
            body: uploadData
          });
          const jsonRes = await res.json();
          if (jsonRes.success) driveUrl = jsonRes.url;
        } catch (err) {
          console.error("Cloud upload error:", err);
        }
      }
      
      cloudDocs.push({
        preview: f.preview, // retain offline preview
        name: f.name,
        type: f.type,
        cloudUrl: driveUrl // The Google Drive view link!
      });
    }

    // Inventory Auto-Deduction logic
    const jobId = `JOB-${Math.floor(1000 + Math.random() * 9000)}`; // Pre-generate ID for linking
    const inventoryUsage: any[] = [];
    
    formData.particulars.forEach(p => {
      // Try to consume from stock
      const result = consumeByProductName(p.name, jobId);
      if (result) {
        inventoryUsage.push({
          productName: p.name,
          itemId: result.itemId,
          mark: result.mark
        });
      }
    });

    // Merge files and inventory usage into formData
    const finalData = {
      ...formData,
      documents: cloudDocs,
      inventoryUsage // Link specific serial numbers used
    };

    addJob(finalData, 'Waiting Approval', jobId);
    router.push('/dashboard');
  };

  const handleSendOTP = async () => {
    if (formData.phone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (isTrusted(formData.consentType)) {
      setOtpVerified(true);
      return;
    }

    setOtpSent(true);
    setShowOtpModal(true);
    
    try {
      // Simulate real OTP SMS
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone })
      });
      const data = await res.json();
      console.log("Requested OTP from server for:", formData.phone);
      
      // Real OTP call completed
    } catch (e) {
      console.error("Failed to call OTP API", e);
    }
  };

  const handleVerifyOTP = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, code: otpInput })
      });
      
      const data = await res.json();
      
      if (data.success || otpInput === "9999") { // Emergency bypass for testing (DND block fix)
        setOtpVerified(true);
        setShowOtpModal(false);
      } else {
        alert(data.error || "Invalid OTP! Please check the server console for the real code.");
      }
    } catch (e) {
       alert("Error validating OTP.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h1 className="text-gradient">New E-KYC Entry</h1>
        <div className="stepper">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`step-dot ${step >= i ? 'active' : ''}`}>
              {step > i ? <Check size={12} /> : i}
            </div>
          ))}
        </div>
      </div>

      <div className="form-card glass-panel animate-fade-in">
        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Personal Details */}
          {step === 1 && (
            <div className="step-content">
              <h3><User size={20} /> Personal Details</h3>
              <div className="grid">
                <div className="form-group full-width">
                  <label className="label">Type of Consent</label>
                  <div className="toggle-group" style={{ marginBottom: '1.5rem' }}>
                    {consentTypeOptions.map(ct => (
                      <button 
                        key={ct} type="button" 
                        className={formData.consentType === ct ? 'active' : ''}
                        onClick={() => {
                          setFormData({...formData, consentType: ct});
                          // Reset partner/verification if switching away from Partner or to a non-B2B type
                          if (ct !== "PARTNER") {
                            setOtpVerified(false);
                            setFormData(prev => ({ ...prev, consentType: ct, referenceName: "" }));
                          }
                        }}
                      >{ct}</button>
                    ))}
                  </div>

                  {formData.consentType === "PARTNER" && (
                    <div className="partner-selection animate-fade-in" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                      <label className="label" style={{ fontSize: '0.75rem', opacity: 0.7 }}>SELECT REGISTERED PARTNER</label>
                      <div className="chips-container" style={{ marginTop: '0.5rem' }}>
                        {partnerOptions.map(p => (
                          <button 
                            key={p.id} type="button" 
                            className={`chip ${formData.referenceName === p.name ? 'active' : ''}`}
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                referenceName: p.name,
                                fullName: p.name // USE PARTNER NAME AS CUSTOMER NAME
                              });
                              setOtpVerified(true);
                            }}
                          >{p.name}</button>
                        ))}
                      </div>
                      <p style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>
                        {formData.referenceName ? `✓ PARTNER ACCOUNT "${formData.referenceName}" IDENTIFIED - OTP SKIPPED` : "ⓘ PLEASE SELECT A PARTNER TO SKIP OTP"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input 
                    type="text" className="input-field" placeholder="Enter customer name"
                    value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Contact Number</label>
                  <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="tel" className="input-field" placeholder="+91 XXXXX XXXXX"
                      style={{ flex: 1 }}
                      value={formData.phone} onChange={e => {
                        setFormData({...formData, phone: e.target.value});
                        if (otpVerified) setOtpVerified(false); // Reset if changed
                      }}
                      disabled={otpVerified}
                    />
                    {otpVerified ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <Check size={14} /> VERIFIED
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={handleSendOTP}
                        style={{ padding: '0 1rem', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)' }}
                        onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseOut={e => e.currentTarget.style.filter = 'none'}
                      >
                        VERIFY
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group full-width">
                  <label className="label">Complete Address</label>
                  <textarea 
                    className="input-field" rows={3} placeholder="Building, Street, Area..."
                    value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="form-group full-width consent-check">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={formData.legalConsent} 
                      onChange={e => setFormData({...formData, legalConsent: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    <span className="consent-text">I hereby authorize Sai Auto Key Works to perform locksmithing services and confirm I am the legal owner of this vehicle.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Vehicle Details */}
          {step === 2 && (
            <div className="step-content">
              <h3><Car size={20} /> Vehicle Details</h3>
              <div className="grid">
                <div className="form-group">
                  <label className="label">Registration Number</label>
                  <input 
                    type="text" className="input-field" placeholder="KA 03 MG 1234"
                    value={formData.regNumber} onChange={e => handleRegNumberChange(e.target.value)}
                  />
                  {showHistoryAlert && (
                    <div className="history-alert">
                      <div className="alert-top">
                        <AlertCircle size={16} color="var(--warning)" />
                        <span>Existing Car/Client Found</span>
                      </div>
                      <button type="button" className="history-btn">
                        <History size={14} /> View Past History
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Category</label>
                  <div className="toggle-group">
                    <button 
                      type="button" className={formData.category === '2-Wheeler' ? 'active' : ''}
                      onClick={() => setFormData({...formData, category: '2-Wheeler'})}
                    >2-Wheeler</button>
                    <button 
                      type="button" className={formData.category === '4-Wheeler' ? 'active' : ''}
                      onClick={() => setFormData({...formData, category: '4-Wheeler'})}
                    >4-Wheeler</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Brand</label>
                  <select 
                    className="input-field"
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value, model: ""})}
                  >
                    <option value="">Select Brand</option>
                    {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Model Name</label>
                  <select 
                    className="input-field"
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    disabled={!formData.brand || !carModels[formData.brand]}
                  >
                    <option value="">Select Model</option>
                    {formData.brand && carModels[formData.brand]?.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Manufacturing Year</label>
                  <select 
                    className="input-field"
                    value={formData.year}
                    onChange={e => setFormData({...formData, year: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: new Date().getFullYear() - 1994 + 1 }, (_, i) => (1994 + i).toString()).reverse().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Document Uploads */}
          {step === 3 && (
            <div className="step-content">
              <h3><Camera size={20} /> Document Verification</h3>
              <p className="text-muted mb-4">Would you like to upload documents now or later?</p>
              
              {!formData.uploadChoice && (
                <div className="upload-choice-buttons">
                  <button type="button" className="choice-btn primary" onClick={() => setFormData({...formData, uploadChoice: 'now'})}>
                    <Camera size={20} /> Upload Now
                  </button>
                  <button type="button" className="choice-btn secondary" onClick={() => setFormData({...formData, uploadChoice: 'later'})}>
                    Skip & Upload Later
                  </button>
                </div>
              )}

              {formData.uploadChoice === 'now' && (
                <>
                  <div className="upload-grid" style={{ display: 'block' }}>
                    <div className="upload-box-container">
                      <input 
                        type="file" id="documentsInput" className="hidden" accept="image/*,application/pdf"
                        multiple
                        onChange={(e) => handleFileChange(e, 'documents')}
                      />
                      <div className="upload-box-top">
                        <div className={`upload-box minor ${files.documents.length > 0 ? 'has-files' : ''}`} style={{ height: '160px', flexDirection: 'column', gap: '0.5rem' }} onClick={() => triggerFileInput('documentsInput')}>
                          <Camera size={36} color="var(--accent-primary)" />
                          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Click to Upload Documents</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>(ID Proof, RC Book, Selfies, Work Evidence - Images & PDFs)</span>
                        </div>
                      </div>

                      <div className="uploaded-files-list">
                        {files.documents.map((f, idx) => (
                          <div key={idx} className="file-chip">
                            {f.type?.startsWith('image/') || (f.preview && f.preview.startsWith('data:image/')) ? (
                              <img src={f.preview!} alt="preview" className="chip-preview" />
                            ) : (
                              <div className="pdf-icon">📄</div>
                            )}
                            <span className="file-name">{f.name}</span>
                            <button type="button" className="remove-chip" onClick={() => setFiles(prev => ({
                              ...prev,
                              documents: prev.documents.filter((_, i) => i !== idx)
                            }))}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <button type="button" className="text-muted text-sm px-4 py-2 hover:bg-slate-800 rounded-md transition-colors" onClick={() => setFormData({...formData, uploadChoice: ''})}>
                      ← Change Choice
                    </button>
                  </div>
                </>
              )}

              {formData.uploadChoice === 'later' && (
                <div className="later-notice glass-panel">
                  <AlertCircle size={24} color="var(--warning)" />
                  <div>
                    <h4>Documents Pending</h4>
                    <p className="text-sm text-muted">You have elected to upload documents later. You can complete this from the Job Details page anytime before generating the invoice.</p>
                  </div>
                  <button type="button" className="text-accent text-sm ml-auto" onClick={() => setFormData({...formData, uploadChoice: ''})}>
                    Upload Now Instead
                  </button>
                </div>
              )}
            </div>
          )}


          {/* STEP 4: Service & Consent Type */}
          {step === 4 && (
            <div className="step-content">
              <h3><ClipboardCheck size={20} /> Service & Consent</h3>
              <div className="grid">
                <div className="form-group full-width">
                  <label className="label">Select Service Type</label>
                  <div className="chips-container">
                    {serviceTypeOptions.map(s => (
                      <button 
                        key={s} type="button"
                        className={`chip ${formData.serviceType === s ? 'active' : ''}`}
                        onClick={() => setFormData({...formData, serviceType: s})}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Sub-category & Job Particulars */}
          {step === 5 && (
            <div className="step-content">
              <h3><Package size={20} /> Additional Info</h3>
              <p className="text-muted mb-4">Provide any complaint history or reference details for this job.</p>

              {/* COMPLAINT & REFERENCE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Complaint History (Optional)</label>
                  <textarea 
                    className="input-field" 
                    placeholder="Describe previous issues..."
                    rows={3}
                    style={{ resize: 'none' }}
                    value={formData.complaintHistory}
                    onChange={e => setFormData({...formData, complaintHistory: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Reference Name (Optional)</label>
                  <input 
                    type="text" className="input-field" 
                    placeholder="Referred by..."
                    value={formData.referenceName}
                    onChange={e => setFormData({...formData, referenceName: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="step-content">
              <h3><IndianRupee size={20} /> Estimation &amp; Billing</h3>
              <p className="text-muted mb-4">Review the total estimate. One-click to save and download for the client.</p>
              
              <div className="estimate-summary-box glass-panel">
                <div className="print-only-header" style={{ display: 'none' }}>
                  <h2>SAI AUTO KEY WORKS - OFFICIAL ESTIMATE</h2>
                  <div className="print-info-grid">
                    <div><strong>Customer Name:</strong> {formData.fullName || "N/A"}</div>
                    <div><strong>Vehicle Reg:</strong> {formData.regNumber || "N/A"}</div>
                    <div><strong>Contact:</strong> {formData.phone || "N/A"}</div>
                    <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                  </div>
                  <hr style={{ margin: '1rem 0', borderColor: '#e2e8f0' }} />
                </div>
                
                <div className="summary-item">
                  <span>Service ({formData.serviceType})</span>
                  <input 
                    type="number" className="inline-input no-print" 
                    value={formData.serviceCharge} onChange={e => setFormData({...formData, serviceCharge: Number(e.target.value)})}
                  />
                </div>
                
                <div className="summary-items-list">
                  {formData.subCategories.length > 0 && (
                    <div className="summary-item sub-item" style={{ borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{formData.subCategories.join(' + ')}</span>
                    </div>
                  )}
                  {formData.particulars.length > 0 ? (
                    formData.particulars.map((p: any) => (
                      <div key={p.name} className="summary-item sub-item">
                        <span>• {p.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="summary-item sub-item text-muted">No particulars selected</div>
                  )}
                </div>

                <div className="total-panel-inline" style={{ borderBottom: formData.hideEstimateTotal ? '1px dashed var(--glass-border)' : 'none', paddingBottom: formData.hideEstimateTotal ? '1rem' : '0' }}>
                  <span className="total-label">{formData.hideEstimateTotal ? "Multiple Quality Options" : "Summary Total Quote"}</span>
                  <span className="total-value">{formData.hideEstimateTotal ? "See Table" : `₹ ${formData.totalCharge}`}</span>
                </div>

                {formData.hideEstimateTotal && (
                  <div style={{ marginTop: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>QUALITY OPTIONS</th>
                          <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>RATES (₹)</th>
                          <th style={{ width: '40px' }} className="no-print"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.qualityOptions.map((opt, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <input 
                                type="text" className="inline-input" style={{ width: '100%', textAlign: 'left', fontWeight: 600 }} 
                                value={opt.label} onChange={e => {
                                  const newOpts = [...formData.qualityOptions];
                                  newOpts[idx].label = e.target.value;
                                  setFormData({...formData, qualityOptions: newOpts});
                                }}
                                placeholder="Label (e.g. Premium)"
                              />
                              <textarea 
                                className="inline-input" style={{ width: '100%', textAlign: 'left', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.8, color: 'var(--text-muted)' }} 
                                value={opt.description} onChange={e => {
                                  const newOpts = [...formData.qualityOptions];
                                  newOpts[idx].description = e.target.value;
                                  setFormData({...formData, qualityOptions: newOpts});
                                }}
                                placeholder="Add description..."
                                rows={1}
                              />
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem', verticalAlign: 'top' }}>
                              <input 
                                type="text" className="inline-input" style={{ width: '100%', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }} 
                                value={opt.rate} onChange={e => {
                                  const newOpts = [...formData.qualityOptions];
                                  newOpts[idx].rate = e.target.value;
                                  setFormData({...formData, qualityOptions: newOpts});
                                }}
                                placeholder="Rate..."
                              />
                            </td>
                            <td className="no-print" style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '0.5rem' }}>
                              <button type="button" onClick={() => {
                                setFormData({...formData, qualityOptions: formData.qualityOptions.filter((_, i) => i !== idx)});
                              }} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      <button type="button" className="no-print" onClick={() => {
                      setFormData({...formData, qualityOptions: [...formData.qualityOptions, { label: "", rate: "", description: "" }]});
                    }} style={{ marginTop: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>
                      + Add Grade Option
                    </button>
                  </div>
                )}

                <div className="form-group full-width" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={formData.hideEstimateTotal} 
                      onChange={e => setFormData({...formData, hideEstimateTotal: e.target.checked})}
                    />
                    <span className="checkmark"></span>
                    <span className="consent-text" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Provide Multiple Quality/Price Options to Client</span>
                  </label>
                </div>
              </div>

              <div className="estimate-actions" style={{ marginTop: '2.5rem' }}>
                <button type="button" className="primary-btn w-full" onClick={handleSubmit} style={{ fontWeight: 800 }}>
                  📂 FINISH & SUBMIT RECORD
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            {step > 1 && (
              <button type="button" className="secondary-btn" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={18} /> Back
              </button>
            )}
            {step < 6 && (
              <button 
                type="button" 
                className="primary-btn" 
                disabled={step === 1 && !otpVerified}
                style={{ opacity: (step === 1 && !otpVerified) ? 0.5 : 1, cursor: (step === 1 && !otpVerified) ? 'not-allowed' : 'pointer' }}
                onClick={(e) => { 
                  if (step === 1 && !otpVerified) {
                    alert("Please verify phone number with OTP first.");
                    return;
                  }
                  e.preventDefault(); 
                  setStep(step + 1); 
                }}
              >
                Next Step <ChevronRight size={18} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* OTP MODAL */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Smartphone size={32} color="var(--accent-primary)" />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Phone Verification</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              A 4-digit verification code has been sent to <br/>
              <strong style={{ color: 'var(--text-primary)' }}>+91 {formData.phone}</strong>
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
               <input 
                 type="text" 
                 maxLength={4} 
                 className="input-field" 
                 style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 800, padding: '1rem' }}
                 placeholder="0000"
                 value={otpInput}
                 onChange={e => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                 autoFocus
               />
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                 Didn't receive code? <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', padding: 0, fontWeight: 700, cursor: 'pointer' }}>Resend</button>
               </p>
               <div className="dnd-notice" style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                   🛡️ Carrier-side DND block active? <br/>
                   Use <strong>9999</strong> to verify immediately.
                 </p>
               </div>
            </div>

            <div className="modal-actions" style={{ flexDirection: 'column', gap: '0.75rem' }}>
              <button className="primary-btn w-full" onClick={handleVerifyOTP} disabled={isVerifying || otpInput.length < 4}>
                {isVerifying ? "Verifying..." : "Verify & Proceed"}
              </button>
              <button className="secondary-btn w-full" onClick={() => setShowOtpModal(false)}>Cancel</button>
            </div>
            
            <div style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
              SAI AUTO • SECURE VERIFICATION
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .form-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
        }
        .stepper {
          display: flex;
          gap: 0.75rem;
        }
        .step-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: var(--text-muted);
          transition: var(--transition);
        }
        .step-dot.active {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .form-card {
          padding: 2.5rem;
        }
        .step-content h3 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          color: var(--text-primary);
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .full-width {
          grid-column: 1 / -1;
        }
        .consent-check {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
        }
        .checkbox-container {
          display: flex;
          gap: 1rem;
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .history-alert {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .alert-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--warning);
        }
        .history-btn {
          background: var(--warning);
          color: #000;
          border: none;
          padding: 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .toggle-group {
          display: flex;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          padding: 0.25rem;
          border-radius: var(--radius-md);
        }
        .toggle-group button {
          flex: 1;
          padding: 0.5rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          border-radius: 4px;
        }
        .toggle-group button.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .upload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .upload-box-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .upload-box-top {
           width: 100%;
        }
        .upload-box {
          height: 100px;
          border: 1px dashed var(--glass-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: var(--text-muted);
          transition: var(--transition);
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
        }
        .upload-box:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: rgba(59, 130, 246, 0.05);
        }
        .upload-box.has-files {
          border-style: solid;
          border-color: var(--success);
          background: rgba(16, 185, 129, 0.05);
        }
        .uploaded-files-list { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 0.5rem; 
        }
        .file-chip { 
          background: rgba(255,255,255,0.05); 
          border: 1px solid var(--glass-border); 
          border-radius: 8px; 
          padding: 0.4rem 0.6rem; 
          display: flex; 
          align-items: center; 
          gap: 0.6rem; 
          font-size: 0.8rem; 
          transition: var(--transition);
          max-width: 100%;
          position: relative;
        }
        .file-chip:hover { 
          background: rgba(255,255,255,0.1); 
          border-color: var(--accent-primary); 
        }
        .chip-preview { 
          width: 24px; 
          height: 24px; 
          object-fit: cover; 
          border-radius: 4px; 
        }
        .pdf-icon { font-size: 1.2rem; }
        .file-name { 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          max-width: 100px; 
          color: var(--text-secondary); 
        }
        .remove-chip { 
          background: rgba(239,68,68,0.2); 
          color: var(--danger); 
          border: none; 
          width: 20px; 
          height: 20px; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 14px; 
          cursor: pointer; 
        }
        .remove-chip:hover { 
          background: var(--danger); 
          color: white; 
        }
        .hidden {
          display: none;
        }
        .remove-file:hover {
          text-decoration: underline;
        }
        .chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          font-size: 0.85rem;
        }
        .chip.active {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }
        .total-panel {
          margin-top: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
          border-radius: var(--radius-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid var(--glass-border);
        }
        .total-label {
          font-weight: 600;
          color: var(--text-secondary);
        }
        .total-value {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--success);
          font-family: var(--font-heading);
        }
        .form-actions {
          margin-top: 3rem;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .checkbox-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .checkbox-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .checkbox-item input {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .estimate-summary-box {
          padding: 1.5rem;
          margin-bottom: 2rem;
          background: rgba(15, 23, 42, 0.4);
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .summary-item.sub-item {
          font-weight: 400;
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
        }
        .inline-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--success);
          text-align: right;
          padding: 0.4rem 0.75rem;
          border-radius: 4px;
          width: 100px;
          font-weight: 700;
        }
        .total-panel-inline {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 2px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .estimate-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }
        .estimate-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.8rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid var(--glass-border);
          background: transparent;
          color: var(--text-primary);
          transition: var(--transition);
        }
        .estimate-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .estimate-btn.share {
          color: #25D366;
          border-color: #25D36644;
        }
        .estimate-btn.share:hover {
          background: #25D36611;
        }
        @media (max-width: 768px) {
          .form-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .form-card { padding: 1.5rem 1rem; }
          .grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
          .stepper { gap: 0.4rem; }
          .step-dot { width: 24px; height: 24px; font-size: 0.7rem; }
          .upload-choice-buttons { flex-direction: column; }
          .estimate-actions { flex-direction: column; }
          .total-panel { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
          .total-value { font-size: 1.5rem; }
        }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}
