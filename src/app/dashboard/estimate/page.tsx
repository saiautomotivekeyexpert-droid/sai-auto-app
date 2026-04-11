"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Calculator, Plus, Minus, ArrowRight, Share2, Download, Check, ChevronDown, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EstimatorPage() {
  const { serviceTypes, particulars } = useSettings();
  const router = useRouter();

  const [tempManualItems, setTempManualItems] = useState<any[]>([{ serviceType: 'ADD KEY', product: 'XT27A-SC', qty: 1, rate: 0, colSpan: 1 }]);
  const [tempDetails, setTempDetails] = useState<any>({});
  const [colWidths, setColWidths] = useState<Record<string, string>>({
    sno: "5%",
    service: "20%",
    product: "35%",
    qty: "10%",
    rate: "15%",
    amount: "15%"
  });

  const handleMergeRight = (idx: number) => {
    setTempManualItems((prev: any[]) => {
      const list = [...prev];
      const row = list[idx];
      row.colSpan = 2;
      row.product = `${row.serviceType}\n${row.product}`.trim();
      return list;
    });
  };

  const handleSplit = (idx: number) => {
    setTempManualItems((prev: any[]) => {
      const list = [...prev];
      list[idx].colSpan = 1;
      return list;
    });
  };

  return (
    <div className="estimator-container">
      <div className="estimator-header">
        <h1 className="text-gradient">Quick Estimator</h1>
        <p className="text-muted">Calculate project costs instantly for the client</p>
      </div>

      <div className="estimator-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* ADVANCED DOCS-STYLE EDITOR */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <div className="section-header">
            <h3><Calculator size={20} /> Build Custom Estimate</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
               <button className="secondary-btn small-btn" onClick={() => setTempManualItems(prev => [...prev, { serviceType: '', product: '', qty: 1, rate: 0 }])}>+ Add Row</button>
            </div>
          </div>

          <table className="inv-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr>
                <th style={{ width: colWidths.sno, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>S.NO</th>
                <th style={{ width: colWidths.service, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>SERVICE TYPE</th>
                <th style={{ width: colWidths.product, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>PRODUCT</th>
                <th style={{ width: colWidths.qty, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>QTY</th>
                <th style={{ width: colWidths.rate, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>RATE</th>
                <th style={{ width: colWidths.amount, background: 'var(--accent-primary)', color: 'white', padding: '0.75rem' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {tempManualItems.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td className="center" style={{ padding: '0.5rem' }}>{idx + 1}</td>
                  {(m.colSpan || 1) >= 2 ? (
                    <td colSpan={2} style={{ padding: '0.5rem' }}>
                       <div style={{ position: 'relative' }}>
                          <textarea className="edit-input" rows={m.product?.split('\n').length || 1} value={m.product} onChange={e => {
                            setTempManualItems((prev: any[]) => {
                              const newM = [...prev];
                              newM[idx].product = e.target.value;
                              newM[idx].serviceType = e.target.value;
                              return newM;
                            });
                          }} />
                          <button onClick={() => handleSplit(idx)} title="Split Cells" style={{ position: 'absolute', right: '5px', top: '5px', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><AlertCircle size={12} /></button>
                       </div>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <textarea className="edit-input" rows={m.serviceType?.split('\n').length || 1} value={m.serviceType} onChange={e => {
                            setTempManualItems((prev: any[]) => {
                              const newM = [...prev];
                              newM[idx].serviceType = e.target.value;
                              return newM;
                            });
                          }} />
                          <button onClick={() => handleMergeRight(idx)} title="Merge Right" style={{ position: 'absolute', right: '5px', top: '5px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ArrowRight size={12} /></button>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <textarea className="edit-input" rows={m.product?.split('\n').length || 1} value={m.product} onChange={e => {
                          setTempManualItems((prev: any[]) => {
                            const newM = [...prev];
                            newM[idx].product = e.target.value;
                            return newM;
                          });
                        }} />
                      </td>
                    </>
                  )}
                  <td style={{ padding: '0.5rem' }}>
                    <input className="edit-input center" type="number" value={m.qty || ""} onChange={e => {
                      setTempManualItems((prev: any[]) => {
                        const newM = [...prev];
                        newM[idx].qty = e.target.value === "" ? 0 : Number(e.target.value);
                        return newM;
                      });
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input className="edit-input right" type="number" value={m.rate || ""} onChange={e => {
                      setTempManualItems((prev: any[]) => {
                        const newM = [...prev];
                        newM[idx].rate = e.target.value === "" ? 0 : Number(e.target.value);
                        return newM;
                      });
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', position: 'relative' }}>
                    <strong>₹{(Number(m.qty || 0) * Number(m.rate || 0)).toLocaleString("en-IN")}</strong>
                    <div style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                       {idx < tempManualItems.length - 1 && (
                         <button onClick={() => {
                           setTempManualItems((prev: any[]) => {
                             const newM = [...prev];
                             newM[idx].serviceType = `${newM[idx].serviceType}\n${newM[idx+1].serviceType}`.trim();
                             newM[idx].product = `${newM[idx].product}\n${newM[idx+1].product}`.trim();
                             newM.splice(idx+1, 1);
                             return newM;
                           });
                         }} title="Merge Down" style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ChevronDown size={14} /></button>
                       )}
                       <button onClick={() => setTempManualItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Plus size={14} style={{ transform: 'rotate(45deg)' }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(59,130,246,0.05)', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'right' }}>SUMMARY TOTAL</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
                  ₹{tempManualItems.reduce((sum, m) => sum + (Number(m.qty || 0) * Number(m.rate || 0)), 0).toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
             <button className="secondary-btn" onClick={() => router.back()}>Cancel</button>
             <button className="primary-btn" onClick={() => {
                alert("Estimate Prepared! Ready to Share.");
             }}>Prepare for Share <Share2 size={18} /></button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .estimator-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border); }
        .edit-input { 
          width: 100%; 
          border: 1px solid transparent; 
          background: transparent; 
          padding: 5px; 
          border-radius: 4px; 
          font-family: inherit; 
          outline: none; 
          transition: background 0.2s, border-color 0.2s; 
        }
        .edit-input:hover {
          background: rgba(59,130,246,0.03);
          border-color: rgba(59,130,246,0.1);
        }
        .edit-input:focus { border-color: var(--accent-primary); background: white; }
        .edit-input.center { text-align: center; }
        .edit-input.right { text-align: right; }
        .center { text-align: center; }
        .inv-table { border: 1.5px solid var(--accent-primary); border-collapse: collapse; }
        .inv-table th, .inv-table td { border: 1px solid var(--glass-border); }
        textarea.edit-input { resize: none; overflow: hidden; }
      `}</style>
    </div>
  );
}
