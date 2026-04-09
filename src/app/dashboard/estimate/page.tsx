"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Calculator, Plus, Minus, ArrowRight, Share2, Download, Check, ChevronDown, AlertCircle, ZoomIn, ZoomOut, Type, Bold, Italic, Underline } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EstimatorPage() {
  const { serviceTypes, particulars } = useSettings();
  const router = useRouter();

  const [isCustomizing, setIsCustomizing] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [baseFontSize, setBaseFontSize] = useState(12);
  const [tempManualItems, setTempManualItems] = useState<any[]>([{ serviceType: 'ADD KEY', product: 'XT27A-SC', qty: 1, rate: 0, colSpan: 1 }]);
  const [colWidths, setColWidths] = useState<Record<string, string>>({
    sno: "5%",
    service: "20%",
    product: "35%",
    qty: "10%",
    rate: "15%",
    amount: "15%"
  });

  const handleMergeRight = (idx: number) => {
    setTempManualItems(prev => {
      const list = [...prev];
      list[idx].colSpan = 2;
      list[idx].product = `${list[idx].serviceType}\n${list[idx].product}`.trim();
      return list;
    });
  };

  const handleSplit = (idx: number) => {
    setTempManualItems(prev => {
      const list = [...prev];
      list[idx].colSpan = 1;
      return list;
    });
  };

  const DocsToolbar = () => (
    <div className="docs-toolbar no-print">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} title="Zoom Out"><ZoomOut size={16} /></button>
        <span className="toolbar-label">{zoomLevel}%</span>
        <button className="toolbar-btn" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} title="Zoom In"><ZoomIn size={16} /></button>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={() => setBaseFontSize(Math.max(8, baseFontSize - 1))} title="Font Smaller"><Type size={14} style={{ transform: 'scale(0.8)' }} /></button>
        <span className="toolbar-label">{baseFontSize} pt</span>
        <button className="toolbar-btn" onClick={() => setBaseFontSize(Math.min(32, baseFontSize + 1))} title="Font Larger"><Type size={18} /></button>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <button className="toolbar-btn active" title="Bold"><Bold size={16} /></button>
        <button className="toolbar-btn" title="Italic"><Italic size={16} /></button>
        <button className="toolbar-btn" title="Underline"><Underline size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="estimator-container">
      <div className="estimator-header">
        <h1 className="text-gradient">Quick Estimator</h1>
        <p className="text-muted">Calculate project costs instantly for the client</p>
      </div>

      <DocsToolbar />

      <div className="estimator-grid" style={{ 
        gridTemplateColumns: '1fr',
        transform: `scale(${zoomLevel / 100})`,
        transformOrigin: 'top center',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* ADVANCED DOCS-STYLE EDITOR */}
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
          <div className="section-header">
            <h3><Calculator size={20} /> Build Custom Estimate</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
               <button className={`secondary-btn small-btn ${isCustomizing ? 'active' : ''}`} onClick={() => setIsCustomizing(!isCustomizing)}>{isCustomizing ? 'Finish Customizing' : 'Customize Table'}</button>
               {isCustomizing && <button className="secondary-btn small-btn" onClick={() => setTempManualItems(prev => [...prev, { serviceType: '', product: '', qty: 1, rate: 0 }])}>+ Add Row</button>}
            </div>
          </div>

          <table className="inv-table animate-fade-in" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: `${baseFontSize}pt` }}>
            <thead>
              {isCustomizing && (
                <tr className="no-print" style={{ background: 'rgba(59,130,246,0.05)' }}>
                  <th style={{ width: colWidths.sno }}><input className="edit-input center" value={colWidths.sno} onChange={e => setColWidths({...colWidths, sno: e.target.value})} /></th>
                  <th style={{ width: colWidths.service }}><input className="edit-input center" value={colWidths.service} onChange={e => setColWidths({...colWidths, service: e.target.value})} /></th>
                  <th style={{ width: colWidths.product }}><input className="edit-input center" value={colWidths.product} onChange={e => setColWidths({...colWidths, product: e.target.value})} /></th>
                  <th style={{ width: colWidths.qty }}><input className="edit-input center" value={colWidths.qty} onChange={e => setColWidths({...colWidths, qty: e.target.value})} /></th>
                  <th style={{ width: colWidths.rate }}><input className="edit-input center" value={colWidths.rate} onChange={e => setColWidths({...colWidths, rate: e.target.value})} /></th>
                  <th style={{ width: colWidths.amount }}><input className="edit-input center" value={colWidths.amount} onChange={e => setColWidths({...colWidths, amount: e.target.value})} /></th>
                </tr>
              )}
              <tr>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.sno }}>S.NO</th>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.service }}>SERVICE TYPE</th>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.product }}>PRODUCT</th>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.qty }}>QTY</th>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.rate }}>RATE</th>
                <th style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem', width: colWidths.amount }}>AMOUNT</th>
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
                            setTempManualItems(prev => {
                              const newM = [...prev];
                              newM[idx].product = e.target.value;
                              newM[idx].serviceType = e.target.value;
                              return newM;
                            });
                          }} />
                          {isCustomizing && <button onClick={() => handleSplit(idx)} title="Split Cells" style={{ position: 'absolute', right: '5px', top: '5px', background: 'rgba(59,130,246,0.1)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}><AlertCircle size={12} /></button>}
                       </div>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <textarea className="edit-input" rows={m.serviceType?.split('\n').length || 1} value={m.serviceType} onChange={e => {
                            setTempManualItems(prev => {
                              const newM = [...prev];
                              newM[idx].serviceType = e.target.value;
                              return newM;
                            });
                          }} />
                          {isCustomizing && <button onClick={() => handleMergeRight(idx)} title="Merge Right" style={{ position: 'absolute', right: '5px', top: '5px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ArrowRight size={12} /></button>}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <textarea className="edit-input" rows={m.product?.split('\n').length || 1} value={m.product} onChange={e => {
                          setTempManualItems(prev => {
                            const newM = [...prev];
                            newM[idx].product = e.target.value;
                            return newM;
                          });
                        }} />
                      </td>
                    </>
                  )}
                  <td style={{ padding: '0.5rem' }}>
                    <input className="edit-input center" type="number" value={m.qty} onChange={e => {
                      setTempManualItems(prev => {
                        const newM = [...prev];
                        newM[idx].qty = Number(e.target.value);
                        return newM;
                      });
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input className="edit-input right" type="number" value={m.rate} onChange={e => {
                      setTempManualItems(prev => {
                        const newM = [...prev];
                        newM[idx].rate = Number(e.target.value);
                        return newM;
                      });
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', position: 'relative' }}>
                    <div style={{ padding: '5px', fontWeight: 'bold' }}>₹{(m.qty * m.rate).toLocaleString("en-IN")}</div>
                    {isCustomizing && (
                      <div style={{ position: 'absolute', right: '-45px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                        {idx < tempManualItems.length - 1 && (
                          <button onClick={() => {
                            setTempManualItems(prev => {
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
                    )}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(59,130,246,0.05)', fontWeight: 'bold' }}>
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'right' }}>SUMMARY TOTAL</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)', fontSize: '1.25rem' }}>
                  ₹{tempManualItems.reduce((sum, m) => sum + (m.qty * m.rate), 0).toLocaleString("en-IN")}
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
        textarea.edit-input { resize: none; overflow: hidden; }
        
        .docs-toolbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
          border: 1px solid var(--glass-border);
          position: sticky;
          top: 1rem;
          z-index: 100;
        }
        .toolbar-group { display: flex; align-items: center; gap: 0.5rem; }
        .toolbar-btn {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          color: #4b5563;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .toolbar-btn:hover { background: #f3f4f6; color: var(--accent-primary); }
        .toolbar-btn.active { background: rgba(59,130,246,0.1); color: var(--accent-primary); }
        .toolbar-label { font-size: 0.85rem; font-weight: 600; min-width: 45px; text-align: center; }
        .toolbar-divider { width: 1px; height: 24px; background: #e5e7eb; margin: 0 0.25rem; }
      `}</style>
    </div>
  );
}
