"use client";

import { useState, useEffect, Suspense } from "react";
import { Printer, Share2, ArrowLeft, Edit3, Save, X } from "lucide-react";
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
  const [tempDetails, setTempDetails] = useState<any>(null);
  const [tempCustomerName, setTempCustomerName] = useState("");
  const [tempVehicleNumber, setTempVehicleNumber] = useState("");

  useEffect(() => {
    if (job) {
      setTempDetails(JSON.parse(JSON.stringify(job.details || {})));
      setTempCustomerName(job.customerName);
      setTempVehicleNumber(job.vehicleNumber);
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

  const d = isCustomizing ? tempDetails : (job.details || {});
  const particulars: any[] = d.particulars || [];
  const isEstimate = forceType === "estimate" || job.status === "Waiting Approval" || job.status === "Approved" || job.status === "Rejected";
  
  const isQuickService = job.serviceType === "Quick Service";
  const serviceCharge = Number(d.serviceCharge) || 0;
  // For E-KYC, physical items (particulars) do not add to the price total
  const realItemsTotal = particulars.reduce((sum: number, p: any) => sum + (Number(p.cost || 0) * (p.quantity || 1)), 0);
  const grandTotal = Number(d.totalCharge) || (serviceCharge + (isQuickService ? realItemsTotal : 0));
  
  const handleSaveCustom = () => {
    updateJobDetails(job.id, {
      ...tempDetails,
      fullName: tempCustomerName,
      regNumber: tempVehicleNumber
    });
    setIsCustomizing(false);
  };
  
  const memoNumber = job.id;
  const dateStr = new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  
  const shopName = shopProfile.name;
  const shopAddress = shopProfile.address;
  const shopPhone = shopProfile.phone;
  const shopEmail = shopProfile.email;
  
  const docTitle = isEstimate ? "ESTIMATE" : "INVOICE";
  const hideTotal = isEstimate && (d.hideEstimateTotal === true || grandTotal === 0);

  const tl = job.timeline || {} as any;
  const fmtTime = (ts?: number) => ts ? new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const handleWhatsApp = () => {
    const isQuickService = job.serviceType === "Quick Service";
    const lines = particulars.map((p: any) => {
      const productName = p.category === "Services" ? "SERVICE" : p.name;
      const sType = (p.serviceType || "-").toUpperCase();
      if (!isQuickService) {
        return `  - ${productName} [${sType}]`;
      }
      const isZero = Number(p.cost) === 0 && Number(p.originalPrice) > 0;
      const amountStr = isZero ? `~~₹${Number(p.originalPrice) * (p.quantity || 1)}~~ ₹0` : `₹${Number(p.cost) * (p.quantity || 1)}`;
      return `  - ${productName} [${sType}] (${p.quantity || 1} x ${amountStr})`;
    }).join("\n");
    const text = `*${isEstimate ? "Estimate" : "Invoice"} from ${shopName}*\n\n*${isEstimate ? "Estimate" : "Memo"} #:* ${memoNumber}\n*Date:* ${dateStr}\n\n*Customer:* ${job.customerName}\n*Vehicle:* ${job.vehicleNumber}\n\n*Service:* ${d.serviceType} – ${hideTotal ? 'TBD' : '₹' + serviceCharge}\n*Particulars:*\n${lines || "  - None"}\n\n*${hideTotal ? 'TOTAL TBD' : 'Summary Total: ₹' + (isQuickService ? grandTotal : serviceCharge)}*\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="inv-container">
      {/* Action bar - hidden when printing */}
      <div className="inv-actions no-print">
        <button className="secondary-btn" onClick={() => router.back()}><ArrowLeft size={16} /> Back</button>
        <div style={{ flex: 1 }} />
        {!isCustomizing ? (
          <>
            <button className="secondary-btn" style={{ background: 'var(--glass-bg)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} onClick={() => setIsCustomizing(true)}>
              <Edit3 size={16} /> CUSTOMIZE
            </button>
            <button className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
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

      {/* A4 Paper */}
      <div className="inv-paper animate-fade-in">

        {/* TOP ACCENT BAR */}
        <div className="inv-top-bar" />

        {/* HEADER: Company left, Memo box right */}
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
            <div className="inv-memo-date">{dateStr}</div>
          </div>
        </div>

        <div className="inv-divider" />

        {/* CUSTOMER + VEHICLE - 2 columns */}
        <div className="inv-two-col">
          <div className="inv-info-box">
            <div className="inv-box-title">CUSTOMER DETAILS</div>
            <div className="inv-field">
              <div className="inv-field-label">FULL NAME</div>
              {isCustomizing ? (
                <input className="edit-input" value={tempCustomerName} onChange={(e) => setTempCustomerName(e.target.value)} />
              ) : (
                <div className="inv-field-value">{tempCustomerName}</div>
              )}
            </div>
            <div className="inv-field">
              <div className="inv-field-label">CONTACT NUMBER</div>
              {isCustomizing ? (
                <input className="edit-input" value={d.phone || d.contactNumber || ""} onChange={(e) => setTempDetails({ ...d, phone: e.target.value })} />
              ) : (
                <div className="inv-field-value">{d.phone || d.contactNumber || "—"}</div>
              )}
            </div>
            <div className="inv-field">
              <div className="inv-field-label">ADDRESS</div>
              {isCustomizing ? (
                <textarea className="edit-input" value={d.address || ""} onChange={(e) => setTempDetails({ ...d, address: e.target.value })} style={{ height: '40px' }} />
              ) : (
                <div className="inv-field-value">{d.address || "—"}</div>
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
                <div className="inv-field-value">{tempVehicleNumber}</div>
              )}
            </div>
            <div className="inv-field">
              <div className="inv-field-label">VEHICLE TYPE</div>
              {isCustomizing ? (
                <input className="edit-input" value={d.category || ""} onChange={(e) => setTempDetails({ ...d, category: e.target.value })} />
              ) : (
                <div className="inv-field-value">{d.category || "—"}</div>
              )}
            </div>
            {(d.brand || d.vehicleBrand || isCustomizing) && (
              <div className="inv-field">
                <div className="inv-field-label">MAKE &amp; MODEL</div>
                {isCustomizing ? (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input className="edit-input" value={d.brand || d.vehicleBrand || ""} onChange={(e) => setTempDetails({ ...d, brand: e.target.value })} placeholder="MAKE" />
                    <input className="edit-input" value={d.model || d.vehicleModel || ""} onChange={(e) => setTempDetails({ ...d, model: e.target.value })} placeholder="MODEL" />
                  </div>
                ) : (
                  <div className="inv-field-value">{(d.brand || d.vehicleBrand || "").toUpperCase()} {(d.model || d.vehicleModel || "").toUpperCase()}</div>
                )}
              </div>
            )}
            <div className="inv-field">
              <div className="inv-field-label">MANUFACTURE YEAR</div>
              {isCustomizing ? (
                <input className="edit-input" value={d.year || d.manufactureYear || ""} onChange={(e) => setTempDetails({ ...d, year: e.target.value })} />
              ) : (
                <div className="inv-field-value">{d.year || d.manufactureYear || "—"}</div>
              )}
            </div>
            <div className="inv-field">
              <div className="inv-field-label">REPORT STATUS</div>
              <div className="inv-field-value">
                <span className="inv-status-chip">{job.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SERVICE TABLE */}
        <div className="inv-section-title">PRODUCT &amp; SERVICE DETAILS</div>
        <table className="inv-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th className="center">SERVICE TYPE</th>
              <th className="center">QTY</th>
              <th className="right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {job.serviceType === "Quick Service" ? (
              particulars.map((p: any, idx: number) => (
                <tr key={idx}>
                  <td>
                    {isCustomizing ? (
                      <input className="edit-input" value={p.name} onChange={(e) => {
                        const next = [...particulars];
                        next[idx].name = e.target.value;
                        setTempDetails({...d, particulars: next});
                      }} />
                    ) : (
                      <>
                        <strong>{p.category === "Services" ? "SERVICE" : p.name.toUpperCase()}</strong>
                        {p.stockMark && <div style={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.4)', fontWeight: 700 }}>MARK: {p.stockMark}</div>}
                      </>
                    )}
                  </td>
                  <td className="center" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                    {isCustomizing ? (
                      <input className="edit-input" style={{ textAlign: 'center' }} value={p.serviceType || ""} onChange={(e) => {
                        const next = [...particulars];
                        next[idx].serviceType = e.target.value;
                        setTempDetails({...d, particulars: next});
                      }} />
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 900 }}>
                        {(p.serviceType || "-").toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="center" style={{ verticalAlign: 'top', paddingTop: '0.85rem', fontWeight: 700 }}>
                    {isCustomizing ? (
                      <input className="edit-input" style={{ textAlign: 'center', width: '40px' }} value={p.quantity || 1} onChange={(e) => {
                        const next = [...particulars];
                        next[idx].quantity = Number(e.target.value);
                        setTempDetails({...d, particulars: next});
                      }} />
                    ) : (
                      p.quantity || 1
                    )}
                  </td>
                  <td className="right" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                    {isCustomizing ? (
                      <input className="edit-input" style={{ textAlign: 'right', width: '80px' }} value={p.cost || 0} onChange={(e) => {
                        const next = [...particulars];
                        next[idx].cost = Number(e.target.value);
                        setTempDetails({...d, particulars: next});
                      }} />
                    ) : (
                      Number(p.cost) === 0 && Number(p.originalPrice) > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'rgba(0,0,0,0.3)', fontWeight: 600 }}>
                            ₹ {((p.originalPrice || 0) * (p.quantity || 1)).toLocaleString("en-IN")}
                          </span>
                          <strong style={{ color: 'var(--success)' }}>FREE</strong>
                        </div>
                      ) : (
                        <strong>₹ {((p.cost || 0) * (p.quantity || 1)).toLocaleString("en-IN")}</strong>
                      )
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td>
                  <div style={{ paddingBottom: (!hideTotal && particulars.length > 0) ? '0.5rem' : '0' }}>
                    {isCustomizing ? (
                      <input className="edit-input" value={Array.isArray(d.subCategories) ? d.subCategories.join(' + ') : (d.serviceType || job.serviceType)} onChange={(e) => {
                        setTempDetails({...d, subCategories: e.target.value.split(' + '), serviceType: e.target.value});
                      }} />
                    ) : (
                      !(isEstimate && d.hideEstimateTotal) && job.details?.subCategories && job.details.subCategories.length > 0 ? (
                        <strong>{job.details.subCategories.join(' + ').toUpperCase()}</strong>
                      ) : (
                        <strong>{(d.serviceType || job.serviceType).toUpperCase()}</strong>
                      )
                    )}
                  </div>
                  {(particulars.length > 0) && (
                    <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0, fontSize: '0.82rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600, lineHeight: 1.5 }}>
                      {particulars.map((p: any, idx: number) => (
                        <li key={idx}>
                          {isCustomizing ? (
                            <input className="edit-input" style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', width: 'auto' }} value={p.name} onChange={(e) => {
                              const next = [...particulars];
                              next[idx].name = e.target.value;
                              setTempDetails({...d, particulars: next});
                            }} />
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>{p.name}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="center" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                  {isCustomizing ? (
                    <input className="edit-input" style={{ textAlign: 'center' }} value={d.serviceType || job.serviceType} onChange={(e) => {
                      setTempDetails({...d, serviceType: e.target.value});
                    }} />
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 900 }}>
                      {(d.serviceType || job.serviceType).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="center" style={{ verticalAlign: 'top', paddingTop: '0.85rem', fontWeight: 700 }}>
                  {isCustomizing ? (
                    <input className="edit-input" style={{ textAlign: 'center', width: '40px' }} value={d.serviceQty || 1} onChange={(e) => {
                      setTempDetails({...d, serviceQty: Number(e.target.value)});
                    }} />
                  ) : (
                    d.serviceQty || 1
                  )}
                </td>
                <td className="right" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                  {isCustomizing ? (
                    <input className="edit-input" style={{ textAlign: 'right', width: '100px' }} value={d.totalCharge || grandTotal} onChange={(e) => {
                      setTempDetails({...d, totalCharge: Number(e.target.value), serviceCharge: Number(e.target.value)});
                    }} />
                  ) : (
                    <strong>{hideTotal ? "TBD" : `₹ ${grandTotal.toLocaleString("en-IN")}`}</strong>
                  )}
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
                            textAlign: 'center', 
                            textDecoration: showStrikethrough ? 'line-through' : 'none' 
                          }}>
                            <div>{opt.label}</div>
                            {opt.description && (
                              <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.1rem', fontStyle: 'italic' }}>{opt.description}</div>
                            )}
                          </div>
                          
                          {/* Rate column with optional strikethrough */}
                          <div style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            textDecoration: showStrikethrough ? 'line-through' : 'none',
                            fontWeight: 600
                          }}>
                            {opt.rate || '0'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
            )}

            {(!hideTotal && !isEstimate) && (
              <tr className="inv-total-row">
                <td colSpan={3}><strong>SUMMARY TOTAL</strong></td>
                <td className="right">
                  {isCustomizing ? (
                    <input className="edit-input" style={{ textAlign: 'right', fontStyle: 'bold', width: '100px' }} value={d.totalCharge || grandTotal} onChange={(e) => {
                      setTempDetails({...d, totalCharge: Number(e.target.value)});
                    }} />
                  ) : (
                    <strong>₹ {grandTotal.toLocaleString("en-IN")}</strong>
                  )}
                </td>
              </tr>
            )}
            {(hideTotal || isEstimate) && (
              <tr className="inv-total-row">
                <td colSpan={4} className="center">
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

        {/* FOOTER */}
        <div className="inv-footer">
          This document serves as official authorization for key programming services. {shopName} is not liable for inaccuracies in customer-provided information.
        </div>

      </div>

      <style jsx>{`
        .inv-container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .inv-actions { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 2rem; }
        .inv-paper { background: #ffffff; color: #1e293b; box-shadow: 0 8px 40px rgba(0,0,0,0.45); border-radius: 4px; overflow: hidden; font-family: 'Arial', 'Helvetica', sans-serif; }
        .edit-input { width: 100%; background: #f8fafc; border: 1px solid #1e3a8a50; border-radius: 4px; padding: 0.2rem 0.4rem; font-size: 0.9rem; font-family: inherit; font-weight: 700; color: #1e3a8a; }
        .edit-input:focus { outline: none; border-color: #1e3a8a; background: #fff; }
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
        .inv-table { width: calc(100% - 5rem); margin: 0 2.5rem 1.5rem; border-collapse: collapse; font-size: 0.875rem; }
        .inv-table thead tr { background: #1e3a8a; color: white; }
        .inv-table th { padding: 0.6rem 1rem; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; text-align: left; }
        .inv-table th.center, .inv-table td.center { text-align: center; }
        .inv-table th.right, .inv-table td.right { text-align: right; }
        .inv-table td { padding: 0.65rem 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; }
        .inv-total-row td { background: #f8fafc; border-top: 2px solid #1e3a8a; font-size: 0.95rem; color: #0f172a; }
        .inv-auth-box { margin: 0 2.5rem 1.5rem; border: 1.5px solid #dc2626; border-radius: 6px; padding: 1.25rem 1.5rem; position: relative; background: #fff9f9; }
        .inv-auth-stamp { position: absolute; top: 12px; right: 16px; transform: rotate(15deg); border: 2px solid #dc2626; color: #dc2626; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.12em; padding: 0.2rem 0.5rem; border-radius: 4px; opacity: 0.7; }
        .inv-auth-title { font-size: 0.72rem; font-weight: 900; color: #dc2626; letter-spacing: 0.07em; margin-bottom: 0.75rem; }
        .inv-auth-points p { font-size: 0.8rem; color: #1e293b; margin: 0.3rem 0; font-weight: 500; }
        .inv-signatures { display: flex; justify-content: space-around; padding: 2rem 2.5rem 1.5rem; }
        .inv-sig-block { text-align: center; }
        .inv-sig-line { width: 180px; height: 1px; background: #1e3a8a; margin: 0 auto 0.4rem; }
        .inv-sig-label { font-size: 0.72rem; font-weight: 700; color: #1e3a8a; letter-spacing: 0.05em; margin: 0; }
        .inv-footer { background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 0.72rem; color: #64748b; text-align: center; padding: 0.75rem 2.5rem; line-height: 1.5; }
        @media (max-width: 768px) {
          .inv-container { padding: 0.5rem; }
          .inv-actions { flex-wrap: wrap; padding: 0 1rem; }
          .inv-header { flex-direction: column; padding: 1.5rem 1rem; align-items: center; text-align: center; }
          .inv-company-addr { max-width: none; }
          .inv-memo-box { width: 100%; margin-top: 1rem; }
          .inv-divider { margin: 0 1rem; }
          .inv-two-col { grid-template-columns: 1fr; padding: 1rem; }
          .inv-section-title { padding: 0.5rem 1rem; }
          .inv-table { width: calc(100% - 2rem); margin: 0 1rem 1.5rem; }
          .inv-table th, .inv-table td { padding: 0.5rem 0.4rem; font-size: 0.75rem; }
          .inv-auth-box { margin: 0 1rem 1.5rem; padding: 1rem; }
          .inv-signatures { flex-direction: column; gap: 2rem; padding: 1.5rem 1rem; align-items: center; }
          .inv-sig-line { width: 100%; max-width: 200px; }
          .inv-footer { padding: 0.75rem 1rem; }
        }
        @media print { .no-print { display: none !important; } .inv-container { padding: 0; max-width: 100%; } .inv-paper { box-shadow: none; } body { background: white !important; } }
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
