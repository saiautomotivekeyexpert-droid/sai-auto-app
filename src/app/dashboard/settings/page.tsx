"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Plus, Trash2, Settings as SettingsIcon, Save, ChevronRight, AlertTriangle, RefreshCcw } from "lucide-react";
import { useJobs } from "@/context/JobsContext";

export default function SettingsPage() {
  const { 
    serviceTypes, consentTypes, particulars, subCategories, partners,
    addConsentType, removeConsentType,
    addPartner, removePartner,
    estimateTerms, invoiceTerms, shopProfile,
    inventorySeries, partnerPin, updatePartnerPin,
    updateEstimateTerms, updateInvoiceTerms, updateShopProfile,
    addInventorySeries, updateInventoryItem, removeInventorySeries
  } = useSettings();

  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);

  const [newConsent, setNewConsent] = useState("");
  const [newPartner, setNewPartner] = useState("");

  const handleAddConsent = () => {
    if (newConsent.trim()) { addConsentType(newConsent.trim()); setNewConsent(""); }
  };
  const handleAddPartner = () => {
    if (newPartner.trim()) { 
      addPartner(newPartner.trim()); 
      setNewPartner(""); 
    }
  };


  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="text-gradient">Admin Settings</h1>
        <p className="text-muted">Manage form options and operational categories</p>
      </div>

      <div className="settings-grid">

        {/* CONSENT TYPES */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="card-header">
            <h3>Consent Types</h3>
          </div>
          <div className="options-list">
            {consentTypes.map(type => (
              <div key={type} className="option-item">
                <span>{type}</span>
                <button className="delete-btn" onClick={() => removeConsentType(type)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option">
            <input 
              type="text" placeholder="Add consent type..." 
              value={newConsent} onChange={e => setNewConsent(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddConsent()}
            />
            <button onClick={handleAddConsent}><Plus size={18} /></button>
          </div>
        </div>



        {/* PARTNER REGISTRY */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="card-header">
            <h3>Partner Registry (OTP Skip List)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Registered businesses that skip OTP verification</p>
          </div>
          <div className="options-list">
            {partners.map(p => (
              <div key={p.id} className="option-item">
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{p.name}</span>
                <button className="delete-btn" onClick={() => removePartner(p.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option" style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" placeholder="Add business name..." 
              value={newPartner} onChange={e => setNewPartner(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddPartner()}
            />
            <button onClick={handleAddPartner}><Plus size={18} /></button>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <label className="terms-label" style={{ marginBottom: '0.5rem' }}>GLOBAL PARTNER LOGIN PIN</label>
            <div className="add-option">
              <input 
                type="text" 
                placeholder="4-digit PIN"
                maxLength={4}
                value={partnerPin}
                onChange={e => updatePartnerPin(e.target.value.replace(/\D/g, ''))}
                style={{ textAlign: 'center', letterSpacing: '0.5rem', fontWeight: 800, fontSize: '1.1rem' }}
              />
            </div>
            <p className="terms-help">This PIN will be used by ALL partners to login to the Quick Service POS.</p>
          </div>
        </div>

        {/* SHOP PROFILE */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="card-header">
            <h3>Profile Context</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Edit business details shown in report header</p>
          </div>
          
          <div className="profile-form">
            <div className="input-group">
              <label className="terms-label">Shop Name</label>
              <input 
                type="text" className="input-field" 
                value={shopProfile.name} 
                onChange={e => updateShopProfile({ name: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="terms-label">Address</label>
              <input 
                type="text" className="input-field" 
                value={shopProfile.address} 
                onChange={e => updateShopProfile({ address: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="terms-label">Phone</label>
              <input 
                type="text" className="input-field" 
                value={shopProfile.phone} 
                onChange={e => updateShopProfile({ phone: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="terms-label">Email</label>
              <input 
                type="text" className="input-field" 
                value={shopProfile.email} 
                onChange={e => updateShopProfile({ email: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* SERVICE TYPES */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.6s", gridColumn: 'span 2' }}>
          <div className="card-header">
            <h3>Report Customization</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Edit the terms, conditions, and declarations shown on printable reports</p>
          </div>
          
          <div className="report-terms-grid">
            <div className="input-group">
              <label className="terms-label">Estimate Terms & Declaration</label>
              <textarea 
                className="terms-textarea"
                value={estimateTerms}
                onChange={e => updateEstimateTerms(e.target.value)}
                placeholder="Enter estimate terms..."
              />
              <p className="terms-help">Shown at the bottom of all Estimate PDFs</p>
            </div>

            <div className="input-group">
              <label className="terms-label">Invoice Terms & Declaration</label>
              <textarea 
                className="terms-textarea"
                value={invoiceTerms}
                onChange={e => updateInvoiceTerms(e.target.value)}
                placeholder="Enter invoice terms..."
              />
              <p className="terms-help">Shown at the bottom of all Invoice/Memo PDFs</p>
            </div>
          </div>
        </div>
        
      </div>

      <style jsx>{`
        .settings-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .settings-header {
          margin-bottom: 2.5rem;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 2rem;
        }
        .settings-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          min-height: 400px;
        }
        .card-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
        }
        .options-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .option-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
        }
        .option-item span {
          font-size: 0.95rem;
          font-weight: 500;
        }
        .item-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .item-details .cost {
          font-size: 0.8rem;
          color: var(--success);
          font-weight: 600;
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--danger);
          opacity: 0.6;
          transition: var(--transition);
        }
        .delete-btn:hover {
          opacity: 1;
          transform: scale(1.1);
        }
        .add-option {
          display: flex;
          gap: 0.75rem;
        }
        .add-option.vertical {
          flex-direction: column;
        }
        .add-option .row {
          display: flex;
          gap: 0.75rem;
        }
        .add-option input {
          flex: 1;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.9rem;
        }
        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          flex: 1;
        }
        .profile-form .input-group label {
          margin-bottom: 0.4rem;
        }
        .report-terms-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          flex: 1;
        }
        .terms-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--accent-primary);
          text-transform: uppercase;
          display: block;
          marginBottom: 0.6rem;
        }
        .terms-textarea {
          width: 100%;
          height: 180px;
          resize: none;
          font-size: 0.85rem;
          line-height: 1.6;
          padding: 1rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: white;
        }
        .terms-textarea:focus {
          border-color: var(--accent-primary);
          outline: none;
          background: rgba(15, 23, 42, 0.8);
        }
        .terms-help {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.5rem;
        }

        /* INVENTORY STYLES */
        .inventory-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 2.5rem;
          margin-top: 1rem;
        }
        .inventory-sidebar h4, .inventory-content h4 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent-primary);
          margin-bottom: 1.25rem;
        }
        .inventory-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .series-generator {
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px dashed var(--glass-border);
          border-radius: 8px;
        }
        .series-generator h5 {
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
          color: var(--text-secondary);
        }
        .small-textarea {
          height: 80px;
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .series-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .series-item {
          border-color: rgba(255,255,255,0.08);
        }
        .series-item.exhausted {
          opacity: 0.6;
          border-color: var(--danger);
        }
        .series-main {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          cursor: pointer;
        }
        .series-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .series-name {
          font-weight: 700;
          font-size: 1.05rem;
        }
        .series-vendor {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .series-stats {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .stock {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--accent-primary);
        }
        .exhausted .stock { color: var(--danger); }
        .del-series {
          background: transparent;
          border: none;
          color: var(--danger);
          padding: 0.5rem;
          opacity: 0.4;
        }
        .del-series:hover { opacity: 1; }
        .series-detail {
          padding: 0 1.25rem 1.25rem;
          border-top: 1px solid var(--glass-border);
        }
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
          margin-top: 1.25rem;
        }
        .stock-unit {
          padding: 0.75rem;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .unit-mark {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--accent-primary);
        }
        .raw-id-input {
          background: rgba(255,255,255,0.05) !important;
          padding: 0.4rem 0.6rem !important;
          font-size: 0.75rem !important;
          border-radius: 4px !important;
        }
        .used {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .unit-used {
          font-size: 0.65rem;
        }
        .job-id {
          color: var(--success);
          font-weight: 700;
          margin-bottom: 0.2rem;
        }
        .raw-id-view {
          opacity: 0.7;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .empty-inventory {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
          background: rgba(0,0,0,0.1);
          border-radius: 12px;
          border: 1px dashed var(--glass-border);
        }

        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .settings-card {
            min-height: auto;
            padding: 1.25rem;
          }
          .report-terms-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .settings-header h1 {
            font-size: 1.75rem;
          }
          .settings-card[style*="grid-column: span 2"] {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
