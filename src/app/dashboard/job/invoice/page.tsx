"use client";

import { use, Suspense } from "react";
import { Printer, Share2, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useJobs } from "@/context/JobsContext";
import { useSettings } from "@/context/SettingsContext";

function InvoiceContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { jobs } = useJobs();
  const { estimateTerms, invoiceTerms, shopProfile } = useSettings();
  const forceType = searchParams.get("type");

  const job = jobs.find(j => j.id === id);

  if (!job) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <h2>Invoice not found.</h2>
        <button className="secondary-btn" style={{ marginTop: "1rem" }} onClick={() => router.back()}>← Go Back</button>
      </div>
    );
  }

  const d = job.details || {};
  const particulars: any[] = d.particulars || [];
  const isEstimate = forceType === "estimate" || job.status === "Waiting Approval" || job.status === "Approved" || job.status === "Rejected";
  
  const serviceCharge = Number(d.serviceCharge) || 0;
  const itemsTotal = isEstimate ? 0 : particulars.reduce((sum: number, p: any) => sum + Number(p.cost || 0), 0);
  const grandTotal = isEstimate ? serviceCharge : (Number(d.totalCharge) || (serviceCharge + itemsTotal));
  
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
    const lines = particulars.map((p: any) => `  - ${p.name}`).join("\n");
    const text = `*${isEstimate ? "Estimate" : "Invoice"} from ${shopName}*\n\n*${isEstimate ? "Estimate" : "Memo"} #:* ${memoNumber}\n*Date:* ${dateStr}\n\n*Customer:* ${job.customerName}\n*Vehicle:* ${job.vehicleNumber}\n\n*Service:* ${d.serviceType} – ${hideTotal ? 'TBD' : '₹' + serviceCharge}\n*Particulars:*\n${lines || "  - None"}\n\n*${hideTotal ? 'TOTAL TBD' : 'Summary Total: ₹' + grandTotal}*\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="inv-container">
      {/* Action bar - hidden when printing */}
      <div className="inv-actions no-print">
        <button className="secondary-btn" onClick={() => router.back()}><ArrowLeft size={16} /> Back</button>
        <div style={{ flex: 1 }} />
        <button className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        <button className="primary-btn" style={{ background: "#25D366" }} onClick={handleWhatsApp}><Share2 size={16} /> WhatsApp</button>
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
              <div className="inv-field-value">{job.customerName}</div>
            </div>
            <div className="inv-field">
              <div className="inv-field-label">CONTACT NUMBER</div>
              <div className="inv-field-value">{d.phone || "—"}</div>
            </div>
            <div className="inv-field">
              <div className="inv-field-label">ADDRESS</div>
              <div className="inv-field-value">{d.address || "—"}</div>
            </div>
          </div>

          <div className="inv-info-box">
            <div className="inv-box-title">VEHICLE INFORMATION</div>
            <div className="inv-field">
              <div className="inv-field-label">REGISTRATION NO.</div>
              <div className="inv-field-value">{job.vehicleNumber}</div>
            </div>
            <div className="inv-field">
              <div className="inv-field-label">VEHICLE TYPE</div>
              <div className="inv-field-value">{d.category || "—"}</div>
            </div>
            {(d.brand || d.vehicleBrand) && (
              <div className="inv-field">
                <div className="inv-field-label">MAKE &amp; MODEL</div>
                <div className="inv-field-value">{(d.brand || d.vehicleBrand || "").toUpperCase()} {(d.model || d.vehicleModel || "").toUpperCase()}</div>
              </div>
            )}
            <div className="inv-field">
              <div className="inv-field-label">REPORT STATUS</div>
              <div className="inv-field-value">
                <span className="inv-status-chip">{job.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SERVICE TABLE */}
        <div className="inv-section-title">SERVICE DETAILS</div>
        <table className="inv-table">
          <thead>
            <tr>
              <th>SERVICE DESCRIPTION</th>
              <th className="center">TYPE</th>
              <th className="right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style={{ paddingBottom: (!hideTotal && particulars.length > 0) ? '0.5rem' : '0' }}>
                   {/* NO NEED OF SUB CATEGORY SERVICE DETAILS IN ESTIMATE WHEN IT MULTI TIER */}
                  {!(isEstimate && d.hideEstimateTotal) && job.details?.subCategories && job.details.subCategories.length > 0 ? (
                    <strong>{job.details.subCategories.join(' + ').toUpperCase()}</strong>
                  ) : (
                    <strong>{(d.serviceType || job.serviceType).toUpperCase()}</strong>
                  )}
                </div>
                {(!isEstimate && particulars.length > 0) && (
                  <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0, fontSize: '0.82rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600, lineHeight: 1.5 }}>
                    {particulars.map((p: any, idx: number) => (
                      <li key={idx}>{p.name}</li>
                    ))}
                  </ul>
                )}
                {isEstimate && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic', fontWeight: 700, color: 'var(--danger)' }}>* ESTIMATED PRICE - SUBJECT TO CHANGE</p>}
              </td>
              <td className="center" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 900 }}>
                  {(d.serviceType || job.serviceType).toUpperCase()}
                </div>
              </td>
              <td className="right" style={{ verticalAlign: 'top', paddingTop: '0.85rem' }}>
                <strong>{hideTotal ? "TBD" : `₹ ${grandTotal.toLocaleString("en-IN")}`}</strong>
              </td>
            </tr>

            {/* TIERED PRICING TABLE - ONLY SHOW IF hideEstimateTotal IS TRUE */}
            {(isEstimate && d.hideEstimateTotal && d.qualityOptions && d.qualityOptions.length > 0) && (
              <tr>
                <td colSpan={3} style={{ padding: '0' }}>
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
                <td colSpan={2}><strong>SUMMARY TOTAL</strong></td>
                <td className="right"><strong>₹ {grandTotal.toLocaleString("en-IN")}</strong></td>
              </tr>
            )}
            {(hideTotal || isEstimate) && (
              <tr className="inv-total-row">
                <td colSpan={3} className="center">
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
