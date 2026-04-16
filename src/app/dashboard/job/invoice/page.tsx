"use client";

import { useState, useEffect, Suspense } from "react";
import { Printer, Share2, ArrowLeft, Edit3, Save, X, ChevronDown, ArrowRight, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobs } from "@/context/JobsContext";
import { useSettings } from "@/context/SettingsContext";

function InvoiceContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { jobs, updateJobDetails } = useJobs();
  const { estimateTerms, invoiceTerms, shopProfile } = useSettings();
  const forceType = searchParams.get("type");

  const job = jobs.find(j => j.id === id);

  // Custom Edit State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tempDetails, setTempDetails] = useState<any>(null);
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [tempVehicleNumber, setTempVehicleNumber] = useState("");
  const [tempParticulars, setTempParticulars] = useState<any[]>([]);
  const [tempManualItems, setTempManualItems] = useState<any[]>([]);
  const [tempServiceCharge, setTempServiceCharge] = useState(0);
  const [tempDate, setTempDate] = useState("");
  const [colWidths, setColWidths] = useState<Record<string, string>>({
    sno: "5%",
    service: "20%",
    product: "35%",
    qty: "10%",
    rate: "15%",
    amount: "15%"
  });

  useEffect(() => {
    if (job) {
      // When entering customize mode, seed from invoiceSnapshot if it exists (so edits start from last saved custom state)
      const snap = job.details?.invoiceSnapshot;
      const base = snap || job.details || {};
      setTempDetails(JSON.parse(JSON.stringify(base)));
      setTempCustomerName(job.details?.fullName || job.customerName);
      setTempVehicleNumber(job.details?.regNumber || job.vehicleNumber);
      setTempParticulars(JSON.parse(JSON.stringify(base.particulars || base.selectedItems || [])));
      setTempManualItems(JSON.parse(JSON.stringify(base.manualItems || [])));
      setTempServiceCharge(Number(base.serviceCharge) || Number(base.approvedGrade?.rate) || Number(base.selectedTotal) || 0);
      setTempDate(base.customDate || new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }));
      if (base.colWidths) setColWidths(base.colWidths);
    }
  }, [job?.id, isCustomizing]);

  if (!job) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <h2>Invoice not found.</h2>
        <button className="secondary-btn" style={{ marginTop: "1rem" }} onClick={() => router.back()}>← Go Back</button>
      </div>
    );
  }

  // In view mode: table data comes from the correct frozen snapshot (if it exists);
  // personal/vehicle details always come from live job.details (never frozen).
  const liveDetails = job.details || {};

  // Determine doc type FIRST so we pick the right snapshot
  const isEstimate = forceType === "estimate" || job.status === "Waiting Approval" || job.status === "Approved" || job.status === "Rejected";
  const snapshotKey = isEstimate ? 'estimateSnapshot' : 'invoiceSnapshot';
  const snap = liveDetails[snapshotKey];

  // dTable = source for table-related fields (items, rates, totals, layout)
  const dTable = isCustomizing ? tempDetails : (snap || liveDetails);
  // dPerson = source for personal/vehicle fields (always live)
  const dPerson = liveDetails;
  // d keeps the old API for template areas that use both
  const d = dTable;

  const particulars: any[] = dTable.particulars || [];
  const manualItems: any[] = dTable.manualItems || [];

  const isQuickService = job.serviceType === "Quick Service";
  const serviceCharge = Number(dTable.serviceCharge) || Number(dTable.approvedGrade?.rate || dTable.selectedTotal || 0);
  const currentParticulars = isCustomizing ? tempParticulars : particulars;
  const currentManualItems = isCustomizing ? tempManualItems : manualItems;
  const currentServiceCharge = isCustomizing ? tempServiceCharge : serviceCharge;

  const realItemsTotal = currentParticulars.reduce((sum: number, p: any) => sum + (Number(p.cost || 0) * (p.quantity || 1)), 0);
  const manualItemsTotal = currentManualItems.reduce((sum: number, p: any) => sum + (Number(p.rate || 0) * (p.qty || 1)), 0);
  const calculatedTotal = currentServiceCharge + manualItemsTotal + (isQuickService ? realItemsTotal : 0);
  const grandTotal = isCustomizing ? calculatedTotal : (Number(dTable.totalCharge) || calculatedTotal);
  
  const handleToggleStyle = (style: 'bold' | 'italic') => {
    // For now, toggle globally for the entire document as a quick fix for "tools not working"
    setTempDetails((prev: any) => ({
      ...prev,
      [style]: !prev?.[style]
    }));
  };
  
  const handleSaveCustom = () => {
    // Any personal/vehicle edits made in customize mode are in tempDetails — extract them
    const personalUpdates: any = {};
    if (tempDetails) {
      ['phone', 'contactNumber', 'address', 'consentType', 'brand', 'model', 'year', 'manufactureYear', 'category'].forEach(k => {
        if (tempDetails[k] !== undefined) personalUpdates[k] = tempDetails[k];
      });
    }
    if (tempCustomerName) personalUpdates.fullName = tempCustomerName;
    if (tempVehicleNumber) personalUpdates.regNumber = tempVehicleNumber;

    // Build the frozen snapshot of all TABLE-related fields only
    const snapshot = {
      ...tempDetails,
      particulars: tempParticulars,
      manualItems: tempManualItems,
      serviceCharge: tempServiceCharge,
      customDate: tempDate,
      colWidths: colWidths,
      totalCharge: calculatedTotal,
    };

    // Save to the correct snapshot key — estimate and invoice are fully independent
    updateJobDetails(job.id, {
      ...liveDetails,
      ...personalUpdates,
      [snapshotKey]: snapshot,
    });
    setIsCustomizing(false);
  };

  const handleMergeDown = (type: 'p' | 'm', idx: number) => {
    if (type === 'p') {
      if (idx >= tempParticulars.length - 1) return;
      const newP = [...tempParticulars];
      const current = newP[idx];
      const next = newP[idx + 1];
      current.serviceType = `${current.serviceType || ""}\n${next.serviceType || ""}`.trim();
      current.name = `${current.name || ""}\n${next.name || ""}`.trim();
      newP.splice(idx + 1, 1);
      setTempParticulars(newP);
    } else {
      if (idx >= tempManualItems.length - 1) return;
      const newM = [...tempManualItems];
      const current = newM[idx];
      const next = newM[idx + 1];
      current.serviceType = `${current.serviceType || ""}\n${next.serviceType || ""}`.trim();
      current.product = `${current.product || ""}\n${next.product || ""}`.trim();
      newM.splice(idx + 1, 1);
      setTempManualItems(newM);
    }
  };

  const handleMergeRight = (type: 'p' | 'm', idx: number, colIdx: number) => {
    const list = type === 'p' ? [...tempParticulars] : [...tempManualItems];
    const row = list[idx];
    if (colIdx === 0 && (row.colSpan || 1) < 2) {
      row.colSpan = 2;
      row.name = `${row.serviceType || ""}\n${row.name || row.product || ""}`.trim();
      if (type === 'm') row.product = row.name;
    }
    type === 'p' ? setTempParticulars(list) : setTempManualItems(list);
  };

  const handleSplit = (type: 'p' | 'm', idx: number) => {
    const list = type === 'p' ? [...tempParticulars] : [...tempManualItems];
    list[idx].colSpan = 1;
    type === 'p' ? setTempParticulars(list) : setTempManualItems(list);
  };

  const TextRenderer = ({ text, bold }: { text: string; bold?: boolean }) => {
    if (!text) return null;
    return (
      <div style={{ whiteSpace: 'pre-wrap', fontWeight: (bold || d?.bold) ? 'bold' : 'normal', fontStyle: d?.italic ? 'italic' : 'normal' }}>
        {text.split('\n').map((line, i) => {
          const isDescription = line.trim().startsWith('*') || line.trim().startsWith('-');
          return (
            <div key={i} className={isDescription ? "light-desc" : ""}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };
  
  const memoNumber = job.id;
  const dateStr = tempDate || new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  
  const shopName = shopProfile.name;
  const shopAddress = shopProfile.address;
  const shopPhone = shopProfile.phone;
  const shopEmail = shopProfile.email;
  
  const docTitle = isEstimate ? "ESTIMATE" : "INVOICE";
  const hideTotal = isEstimate && (d.hideEstimateTotal === true || grandTotal === 0);

  const handleWhatsApp = async () => {
    // 1. Show a quick "Preparing PDF" loading state or just proceed
    const paper = document.querySelector(".inv-paper") as HTMLElement;
    if (!paper) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(paper, {
        scale: 3, // Even higher quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const clonedPaper = clonedDoc.querySelector(".inv-paper") as HTMLElement;
          if (clonedPaper) {
            clonedPaper.style.transform = "none";
            clonedPaper.style.opacity = "1";
            clonedPaper.style.animation = "none";
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const imgProps = (new jsPDF()).getImageProperties(imgData);
      
      // Calculate dimensions for a SINGLE page PDF of any height
      const pdfWidth = 210; // Standard A4 width in mm
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `${docTitle}_${memoNumber}.pdf`;
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: `Here is your ${docTitle.toLowerCase()} from ${shopName}.`
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        
        const waText = `Sending your ${docTitle.toLowerCase()} as a PDF. Please attach the downloaded file.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
      }
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="inv-container">
      <div className="inv-actions no-print">
        <button className="secondary-btn" onClick={() => router.back()}><ArrowLeft size={16} /> Back</button>
        <div style={{ flex: 1 }} />
        {isCustomizing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', marginRight: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '0.5rem' }}>ZOOM:</span>
            <button onClick={() => setZoom((prev: number) => Math.max(0.6, prev - 0.1))} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>-</button>
            <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((prev: number) => Math.min(1.5, prev + 0.1))} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>+</button>
            
            <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 0.75rem' }} />
            
            {/* TEXT TOOLS */}
            <div style={{ display: 'flex', gap: '2px' }}>
              <button disabled style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#f8fafc', opacity: 0.5, cursor: 'not-allowed', fontStyle: 'italic' }}>Arial</button>
              <button onClick={() => handleToggleStyle('bold')} style={{ padding: '4px 8px', borderRadius: '4px', border: tempDetails?.bold ? '1.5px solid #3b82f6' : '1px solid #e2e8f0', background: tempDetails?.bold ? '#eff6ff' : '#f8fafc', fontWeight: 'bold' }}>B</button>
              <button onClick={() => handleToggleStyle('italic')} style={{ padding: '4px 8px', borderRadius: '4px', border: tempDetails?.italic ? '1.5px solid #3b82f6' : '1px solid #e2e8f0', background: tempDetails?.italic ? '#eff6ff' : '#f8fafc', fontStyle: 'italic' }}>I</button>
            </div>
          </div>
        )}
        {!isCustomizing ? (
          <>
            <button className="secondary-btn" style={{ background: 'var(--glass-bg)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} onClick={() => setIsCustomizing(true)}>
              <Edit3 size={16} /> CUSTOMIZE
            </button>
            <button className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print</button>
            <button className="primary-btn" onClick={handleWhatsApp}><Save size={16} /> SAVE PDF (SINGLE PAGE)</button>
            <button className="primary-btn" style={{ background: "#25D366" }} onClick={handleWhatsApp}><Share2 size={16} /> WhatsApp</button>
          </>
        ) : (
          <>
            <button className="secondary-btn" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => setIsCustomizing(false)}>
              <X size={16} /> CANCEL
            </button>
            <button className="primary-btn" style={{ background: 'var(--success)', color: '#fff' }} onClick={handleSaveCustom}>
              <Save size={16} /> SAVE CUSTOM CHANGES
            </button>
          </>
        )}
      </div>

      <div className="inv-paper-wrapper">
        <div className="inv-paper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <div className="inv-top-bar" />

          {/* HEADER */}
          <div className="inv-header">
            <div className="inv-company">
              <h1 className="inv-company-name">{shopName.split(" ")[0]}</h1>
              <p className="inv-company-full">{shopName}</p>
              <p className="inv-company-addr">{shopAddress}</p>
              <p className="inv-company-contact">• {shopPhone} • {shopEmail}</p>
            </div>
            <div className="inv-memo-box">
              <div className="inv-memo-label">{docTitle}</div>
              <div className="inv-memo-number">{memoNumber}</div>
              {isCustomizing ? (
                <input className="edit-input center" value={tempDate} onChange={e => setTempDate(e.target.value)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.85rem' }} />
              ) : (
                <div className="inv-memo-date">{dateStr}</div>
              )}
            </div>
          </div>

          <div className="inv-divider" />

          {/* CUSTOMER + VEHICLE */}
          <div className="inv-two-col">
            <div className="inv-info-box">
              <div className="inv-box-title">CUSTOMER DETAILS</div>
              <div className="inv-field">
                <div className="inv-field-label">FULL NAME</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempCustomerName} onChange={(e) => setTempCustomerName(e.target.value)} />
                ) : (
                  <div className="inv-field-value">{dPerson.fullName || job.customerName || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">CONTACT NUMBER</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempDetails?.phone ?? (dPerson.phone || dPerson.contactNumber || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, phone: e.target.value }))} />
                ) : (
                  <div className="inv-field-value">{dPerson.phone || dPerson.contactNumber || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">ADDRESS</div>
                {isCustomizing ? (
                  <textarea className="edit-input" value={tempDetails?.address ?? (dPerson.address || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, address: e.target.value }))} style={{ height: '40px' }} />
                ) : (
                  <div className="inv-field-value">{dPerson.address || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">CONSENT TYPE</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempDetails?.consentType ?? (dPerson.consentType || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, consentType: e.target.value }))} />
                ) : (
                  <div className="inv-field-value">{(dPerson.consentType || "—").toUpperCase()}</div>
                )}
              </div>
            </div>

            <div className="inv-info-box">
              <div className="inv-box-title">VEHICLE INFORMATION</div>
              <div className="inv-field">
                <div className="inv-field-label">REGISTRATION NO.</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempVehicleNumber} onChange={(e) => setTempVehicleNumber(e.target.value)} />
                ) : (
                  <div className="inv-field-value">{dPerson.regNumber || job.vehicleNumber || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">VEHICLE TYPE</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempDetails?.category ?? (dPerson.category || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, category: e.target.value }))} />
                ) : (
                  <div className="inv-field-value">{dPerson.category || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">MAKE &amp; MODEL</div>
                {isCustomizing ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input className="edit-input" value={tempDetails?.brand ?? (dPerson.brand || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, brand: e.target.value }))} placeholder="MAKE" />
                    <input className="edit-input" value={tempDetails?.model ?? (dPerson.model || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, model: e.target.value }))} placeholder="MODEL" />
                  </div>
                ) : (
                  <div className="inv-field-value">{[dPerson.brand, dPerson.model].filter(Boolean).map(s => s.toUpperCase()).join(" ") || "—"}</div>
                )}
              </div>
              <div className="inv-field">
                <div className="inv-field-label">MANUFACTURE YEAR</div>
                {isCustomizing ? (
                  <input className="edit-input" value={tempDetails?.year ?? (dPerson.year || dPerson.manufactureYear || "")} onChange={(e) => setTempDetails((prev: any) => ({ ...prev, year: e.target.value }))} />
                ) : (
                  <div className="inv-field-value">{dPerson.year || dPerson.manufactureYear || "—"}</div>
                )}
              </div>
            </div>
          </div>

        {/* SERVICE TABLE */}
        <div className="inv-section-title">PRODUCT &amp; SERVICE DETAILS</div>
        <table className="inv-table">
      <thead>
        <tr>
              <th style={{ width: colWidths.sno }}>S.NO</th>
              <th style={{ width: colWidths.service }}>SERVICE TYPE</th>
              <th style={{ width: colWidths.product }}>PRODUCT</th>
              <th style={{ width: colWidths.qty }}>QTY</th>
              <th style={{ width: colWidths.rate }}>RATE</th>
              <th style={{ width: colWidths.amount }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody style={{ fontWeight: d?.bold ? 'bold' : 'normal', fontStyle: d?.italic ? 'italic' : 'normal' }}>
            {/* RENDER ALL ITEMS: Particulars + Manual Items */}
            {(() => {
              let rows: React.ReactElement[] = [];
              let sno = 1;



              // 2. Manual Items
              const activeManual = isCustomizing ? tempManualItems : manualItems;
              activeManual.forEach((m, idx) => {
                const amount = (m.qty || 1) * (m.rate || 0);
                rows.push(
                  <tr key={`m-${idx}`}>
                    <td className="center">{sno++}</td>
                    {(m.colSpan || 1) >= 2 ? (
                      <td colSpan={2}>
                        {isCustomizing ? (
                          <div style={{ position: 'relative' }}>
                            <textarea className="edit-input" rows={m.product?.split('\n').length || 1} value={m.product || ""} onChange={e => {
                              const newM = [...tempManualItems];
                              newM[idx].product = e.target.value;
                              newM[idx].serviceType = e.target.value;
                              setTempManualItems(newM);
                            }} />
                            <button onClick={() => handleSplit('m', idx)} title="Split Cells" style={{ position: 'absolute', right: '5px', top: '5px', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><AlertCircle size={12} /></button>
                          </div>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{(m.product || "").toUpperCase()}</div>
                        )}
                      </td>
                    ) : (
                      <>
                        <td>
                          {isCustomizing ? (
                            <div style={{ position: 'relative' }}>
                              <textarea className="edit-input" rows={m.serviceType?.split('\n').length || 1} value={m.serviceType || ""} onChange={e => {
                                const newM = [...tempManualItems];
                                newM[idx].serviceType = e.target.value;
                                setTempManualItems(newM);
                              }} />
                              <button onClick={() => handleMergeRight('m', idx, 0)} title="Merge Right" style={{ position: 'absolute', right: '5px', top: '5px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ArrowRight size={12} /></button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 900, whiteSpace: 'pre-wrap' }}>{(m.serviceType || "-").toUpperCase()}</div>
                          )}
                        </td>
                        <td>
                          {isCustomizing ? (
                            <textarea className="edit-input" rows={m.product?.split('\n').length || 1} value={m.product || ""} onChange={e => {
                              const newM = [...tempManualItems];
                              newM[idx].product = e.target.value;
                              setTempManualItems(newM);
                            }} />
                          ) : (
                            <strong style={{ whiteSpace: 'pre-wrap' }}>{(m.product || "-").toUpperCase()}</strong>
                          )}
                        </td>
                      </>
                    )}
                    <td className="center">
                      {isCustomizing ? (
                        <input className="edit-input center" type="number" value={m.qty || ""} onChange={e => {
                          const newM = [...tempManualItems];
                          newM[idx].qty = e.target.value === "" ? 0 : Number(e.target.value);
                          setTempManualItems(newM);
                        }} />
                      ) : (
                        m.qty
                      )}
                    </td>
                    <td className="right">
                      {isCustomizing ? (
                        <input className="edit-input right" type="number" value={m.rate || ""} onChange={e => {
                          const newM = [...tempManualItems];
                          newM[idx].rate = e.target.value === "" ? 0 : Number(e.target.value);
                          setTempManualItems(newM);
                        }} />
                      ) : (
                        `₹ ${Number(m.rate || 0).toLocaleString("en-IN")}`
                      )}
                    </td>
                    <td className="right" style={{ position: 'relative' }}>
                      <strong>₹ {amount.toLocaleString("en-IN")}</strong>
                      {isCustomizing && (
                         <div style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                           {idx < activeManual.length - 1 && (
                             <button onClick={() => handleMergeDown('m', idx)} title="Merge Down" style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ChevronDown size={14} /></button>
                           )}
                           <button 
                             onClick={() => setTempManualItems(tempManualItems.filter((_, i) => i !== idx))}
                             style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                           >
                             <X size={14} />
                           </button>
                         </div>
                      )}
                    </td>
                  </tr>
                );
              });
              



              return rows;
            })()}

            {isCustomizing && (
              <tr>
                <td colSpan={6} style={{ padding: '0.5rem' }}>
                  <button 
                    className="secondary-btn small-btn" 
                    style={{ width: '100%', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.05)' }}
                    onClick={() => {
                      setTempManualItems([...tempManualItems, { serviceType: '', product: '', qty: 1, rate: 0 }]);
                    }}
                  >
                    + Add New Custom Item
                  </button>
                </td>
              </tr>
            )}

            {/* TIERED PRICING TABLE - ONLY SHOW IF hideEstimateTotal IS TRUE */}
            {(isEstimate && d.hideEstimateTotal && d.qualityOptions && d.qualityOptions.length > 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '0' }}>
                  <div style={{ background: '#f8fafc', borderTop: '2px solid #1e3a8a', borderBottom: '2px solid #1e3a8a' }}>
                    <div style={{ display: 'flex', background: '#e57373', color: 'black', padding: '0.4rem 0', fontWeight: 700, textTransform: 'lowercase', fontSize: '0.9rem' }}>
                      <div style={{ flex: 1 }}></div>
                      <div style={{ flex: 1.5, textAlign: 'center' }}>options</div>
                      <div style={{ flex: 1, textAlign: 'center' }}>rates</div>
                    </div>
                    
                    {d.qualityOptions.map((opt: any, idx: number) => {
                      const isApproved = d.approvedGrade?.label === opt.label;
                      const showStrikethrough = (d.approvedGrade && !isApproved);
                      
                      return (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          padding: '0.5rem 0',
                          background: isApproved ? '#a5d6a7' : 'transparent',
                          color: 'black',
                          borderBottom: '1px solid #e2e8f0',
                          alignItems: 'center',
                          fontSize: '1rem',
                          fontWeight: isApproved ? 700 : 500,
                          textTransform: 'lowercase'
                        }}>
                          {/* Approved status column */}
                          <div style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
                            {isApproved ? 'approved' : ''}
                          </div>
                          
                          {/* Label column with optional strikethrough */}
                          <div style={{ 
                            flex: 1.5, 
                            textAlign: 'left', 
                            padding: '0 1rem',
                            textDecoration: showStrikethrough ? 'line-through' : 'none' 
                          }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{opt.label}</div>
                            {(opt.service || opt.product) && (
                              <div style={{ fontSize: '0.75rem', marginTop: '0.1rem', color: '#444', textTransform: 'uppercase' }}>
                                {opt.service && <span>{opt.service}</span>}
                                {opt.service && opt.product && <span> | </span>}
                                {opt.product && <span>{opt.product}</span>}
                              </div>
                            )}
                            {opt.description && (
                              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.1rem', fontStyle: 'italic' }}>{opt.description}</div>
                            )}
                          </div>
                          
                          {/* Rate column with optional strikethrough */}
                          <div style={{ 
                            flex: 1, 
                            textAlign: 'right', 
                            padding: '0 1.5rem',
                            textDecoration: showStrikethrough ? 'line-through' : 'none',
                            fontWeight: 800,
                            fontSize: '1.1rem'
                          }}>
                            {Number(opt.qty) > 1 && <span style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.6, marginRight: '0.4rem' }}>{opt.qty} x ₹{opt.rate} =</span>}
                            ₹{((Number(opt.qty) || 1) * (Number(opt.rate) || 0)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {!hideTotal && (
              <tr className="inv-total-row">
                <td colSpan={5}><strong>SUMMARY TOTAL</strong></td>
                <td className="right">
                   <strong>₹ {grandTotal.toLocaleString("en-IN")}</strong>
                </td>
              </tr>
            )}
            {(hideTotal || isEstimate) && (
              <tr className="inv-total-row">
                <td colSpan={6} style={{ padding: '0' }}>
                  <strong style={{ color: '#1e3a8a' }}>{isEstimate ? "ESTIMATE - SELECT PREFERRED GRADE" : `CONFIRMED GRADE: ${d.approvedGrade?.label || d.selectedGrade}`}</strong>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="inv-auth-box">
          <div className="inv-auth-stamp">AUTHORIZED</div>
          <div className="inv-auth-title">CUSTOMER AUTHORIZATION &amp; DECLARATION</div>
          <div className="inv-auth-points">
            {(isEstimate ? estimateTerms : invoiceTerms).split('\n').filter(t => t.trim()).map((point, idx) => (
              <p key={idx}>✓ {point.toUpperCase()}</p>
            ))}
          </div>
        </div>

        {/* SIGNATURES */}
        <div className="inv-signatures" style={{ justifyContent: 'flex-end' }}>
          <div className="inv-sig-block">
            <div className="inv-sig-line" />
            <p className="inv-sig-label">AUTHORIZED SIGNATORY</p>
          </div>
        </div>

          <div className="inv-footer">
            This document serves as official authorization for key programming services. {shopName} is not liable for inaccuracies in customer-provided information.
          </div>
        </div> {/* close inv-paper */}
      </div> {/* close inv-paper-wrapper */}

      <style jsx>{`
        .inv-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .inv-actions { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 2rem; }
        .inv-paper { background: #ffffff; color: #1e293b; box-shadow: 0 8px 40px rgba(0,0,0,0.45); border-radius: 4px; overflow: hidden; font-family: 'Arial', 'Helvetica', sans-serif; height: fit-content; margin: 0 auto; }
        .edit-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 2px 5px; border-radius: 4px; font-family: inherit; font-size: inherit; color: inherit; outline: none; transition: background 0.2s, border-color 0.2s; }
        .edit-input:hover { background: rgba(59,130,246,0.03); border-color: rgba(59,130,246,0.1); }
        .edit-input:focus { border-color: #3b82f6; background: white; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .inv-top-bar { height: 6px; background: linear-gradient(90deg, #1e3a8a 60%, #dc2626 60%); }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 2rem 2.5rem 1.5rem; gap: 1rem; }
        .inv-company-name { font-size: 2rem; font-weight: 900; color: #1e3a8a; margin: 0 0 0.1rem; letter-spacing: -0.02em; }
        .inv-company-full { font-size: 0.85rem; font-weight: 700; color: #1e293b; margin: 0; }
        .inv-company-addr { font-size: 0.8rem; color: #475569; margin: 0.2rem 0 0; max-width: 340px; line-height: 1.5; }
        .inv-company-contact { font-size: 0.8rem; color: #475569; margin: 0.3rem 0 0; }
        .inv-memo-box { background: #1e3a8a; color: white; padding: 1rem 1.5rem; text-align: center; border-radius: 4px; min-width: 160px; flex-shrink: 0; }
        .inv-memo-label { font-size: 0.7rem; letter-spacing: 0.1em; opacity: 0.8; margin-bottom: 0.4rem; }
        .inv-memo-number { font-size: 1.2rem; font-weight: 900; letter-spacing: 0.05em; margin-bottom: 0.3rem; }
        .inv-memo-date { font-size: 0.85rem; font-weight: 600; }
        .inv-divider { height: 1px; background: #e2e8f0; margin: 0 2.5rem; }
        .inv-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem 2.5rem; }
        .inv-info-box { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
        .inv-box-title { background: #e9f0ff; color: #1e3a8a; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; padding: 0.5rem 1rem; border-bottom: 1px solid #c7d8ff; }
        .inv-field { padding: 0.6rem 1rem; border-bottom: 1px dashed #e2e8f0; }
        .inv-field:last-child { border-bottom: none; }
        .inv-field-label { font-size: 0.65rem; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
        .inv-field-value { font-size: 0.95rem; font-weight: 700; color: #0f172a; }
        .inv-status-chip { background: #fefce8; border: 1px solid #fbbf24; color: #92400e; font-size: 0.7rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 4px; letter-spacing: 0.05em; }
        .inv-section-title { font-size: 0.75rem; font-weight: 800; color: #1e3a8a; letter-spacing: 0.08em; padding: 0.5rem 2.5rem; border-left: 4px solid #dc2626; margin: 0.5rem 0; background: #f8fafc; }
        .inv-table { width: calc(100% - 5rem); margin: 0 2.5rem 1.5rem; border-collapse: collapse; font-size: 0.875rem; border: 1.5px solid #1e3a8a; }
        .inv-table thead tr { background: #1e3a8a; color: white; }
        .inv-table th { padding: 0.6rem 1rem; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; text-align: left; border: 1px solid rgba(255,255,255,0.2); }
        .inv-table th.center, .inv-table td.center { text-align: center; }
        .inv-table th.right, .inv-table td.right { text-align: right; }
        .inv-table td { padding: 0.65rem 1rem; border: 1px solid #cbd5e1; color: #334155; }
        .inv-table textarea.edit-input { overflow: auto; min-width: 100px; }
        .inv-total-row td { background: #f8fafc; border-top: 2.5px solid #1e3a8a; font-weight: 700; }
        .inv-auth-box { margin: 0 2.5rem 1.5rem; border: 1.5px solid #dc2626; border-radius: 6px; padding: 1.25rem 1.5rem; position: relative; background: #fff9f9; }
        .inv-auth-stamp { position: absolute; top: 12px; right: 16px; transform: rotate(15deg); border: 2px solid #dc2626; color: #dc2626; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.12em; padding: 0.2rem 0.5rem; border-radius: 4px; opacity: 0.7; }
        .inv-auth-title { font-size: 0.72rem; font-weight: 900; color: #dc2626; letter-spacing: 0.07em; margin-bottom: 0.75rem; }
        .inv-auth-points p { font-size: 0.8rem; color: #1e293b; margin: 0.3rem 0; font-weight: 500; }
        .inv-signatures { display: flex; justify-content: space-around; padding: 2rem 2.5rem 1.5rem; }
        .inv-sig-block { text-align: center; }
        .inv-sig-line { width: 180px; height: 1px; background: #1e3a8a; margin: 0 auto 0.4rem; }
        .inv-sig-label { font-size: 0.72rem; font-weight: 700; color: #1e3a8a; letter-spacing: 0.05em; margin: 0; }
        .inv-footer { background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 0.72rem; color: #64748b; text-align: center; padding: 1rem 2.5rem; line-height: 1.5; }
        .light-desc { font-weight: 300; opacity: 0.7; font-size: 0.9em; }
        .inv-paper-wrapper { overflow: auto; display: flex; justify-content: center; padding: 2rem; background: #f1f5f9; min-height: 100vh; }
        .edit-input.center { text-align: center; }
        .edit-input.right { text-align: right; }
        @media (max-width: 768px) {
          .inv-container { padding: 0.5rem; }
          .inv-actions { flex-wrap: wrap; padding: 0 1rem; }
          .inv-header { flex-direction: column; padding: 1.5rem 1rem; align-items: center; text-align: center; }
          .inv-memo-box { width: 100%; margin-top: 1rem; }
          .inv-two-col { grid-template-columns: 1fr; }
        }
        @media print { 
          @page { size: A4; margin: 10mm; }
          .no-print { display: none !important; } 
          .inv-container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; border: none !important; } 
          .inv-paper { 
            box-shadow: none !important; 
            border: none !important; 
            transform: none !important; 
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          } 
          .inv-paper-wrapper { padding: 0 !important; background: white !important; display: block !important; overflow: visible !important; } 
          body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; }
          
          .inv-header, .inv-two-col, .inv-auth-box, .inv-signatures { break-inside: avoid; }
          .inv-table tr { break-inside: auto; }
          .inv-table th, .inv-table td { break-inside: avoid; }
          
          /* Ensure footer stays at bottom if short, or flows naturally */
          .inv-footer { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center' }}>Loading Invoice...</div>}>
      <InvoicePageContent />
    </Suspense>
  );
}

function InvoicePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <h2>Invalid Job ID.</h2>
      </div>
    );
  }

  return <InvoiceContent id={id} />;
}
