"use client";

import { useState } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Plus, Trash2, Settings as SettingsIcon, Save, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { 
    serviceTypes, consentTypes, particulars, subCategories, partners,
    addServiceType, removeServiceType,
    addConsentType, removeConsentType,
    addParticular, removeParticular,
    addSubCategory, removeSubCategory,
    addPartner, removePartner,
    estimateTerms, invoiceTerms, shopProfile,
    updateEstimateTerms, updateInvoiceTerms, updateShopProfile,
  } = useSettings();

  const [newService, setNewService] = useState("");
  const [newConsent, setNewConsent] = useState("");
  const [newParticular, setNewParticular] = useState("");
  const [newCost, setNewCost] = useState<number>(0);
  const [newExpense, setNewExpense] = useState<number>(0);
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newPartner, setNewPartner] = useState("");

  const handleAddService = () => {
    if (newService.trim()) { addServiceType(newService.trim()); setNewService(""); }
  };
  const handleAddConsent = () => {
    if (newConsent.trim()) { addConsentType(newConsent.trim()); setNewConsent(""); }
  };
  const handleAddParticular = () => {
    if (newParticular.trim()) { 
      addParticular(newParticular.trim(), newCost, newExpense); 
      setNewParticular(""); 
      setNewCost(0); 
      setNewExpense(0);
    }
  };
  const handleAddSubCategory = () => {
    if (newSubCategory.trim()) { addSubCategory(newSubCategory.trim()); setNewSubCategory(""); }
  };
  const handleAddPartner = () => {
    if (newPartner.trim()) { addPartner(newPartner.trim()); setNewPartner(""); }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="text-gradient">Admin Settings</h1>
        <p className="text-muted">Manage form options and operational categories</p>
      </div>

      <div className="settings-grid">
        {/* SERVICE TYPES */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="card-header">
            <h3>Service Types</h3>
          </div>
          <div className="options-list">
            {serviceTypes.map(type => (
              <div key={type} className="option-item">
                <span>{type}</span>
                <button className="delete-btn" onClick={() => removeServiceType(type)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option">
            <input 
              type="text" placeholder="Add service type..." 
              value={newService} onChange={e => setNewService(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddService()}
            />
            <button onClick={handleAddService}><Plus size={18} /></button>
          </div>
        </div>

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

        {/* JOB PARTICULARS */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="card-header">
            <h3>Job Particulars</h3>
          </div>
          <div className="options-list">
            {particulars.map(item => (
              <div key={item.id} className="option-item">
                <div className="item-details">
                  <span className="name">{item.name}</span>
                  <div className="row" style={{ gap: '0.5rem', display: 'flex' }}>
                    <span className="cost" title="Price to Customer">P: ₹{item.cost}</span>
                    <span className="expense" style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }} title="Internal Expense">E: ₹{item.expense}</span>
                  </div>
                </div>
                <button className="delete-btn" onClick={() => removeParticular(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option vertical">
            <input 
              type="text" placeholder="Item name (e.g. Remote Board)..." 
              value={newParticular} onChange={e => setNewParticular(e.target.value)}
            />
            <div className="row">
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Price (₹)</label>
                <input 
                  type="number" placeholder="Price..." 
                  value={newCost || ""} onChange={e => setNewCost(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Expense (₹)</label>
                <input 
                  type="number" placeholder="Cost..." 
                  value={newExpense || ""} onChange={e => setNewExpense(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <button className="add-btn-wide" onClick={handleAddParticular} style={{ marginTop: '0.5rem' }}><Plus size={18} /> Add Item</button>
          </div>
        </div>

        {/* SERVICE SUB-CATEGORIES */}
        <div className="settings-card glass-panel animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="card-header">
            <h3>Service Sub-categories</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>Shown in E-KYC form alongside Particulars</p>
          </div>
          <div className="options-list">
            {subCategories.map(item => (
              <div key={item.id} className="option-item">
                <span>{item.name}</span>
                <button className="delete-btn" onClick={() => removeSubCategory(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option">
            <input 
              type="text" placeholder="Add sub-category..." 
              value={newSubCategory} onChange={e => setNewSubCategory(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddSubCategory()}
            />
            <button onClick={handleAddSubCategory}><Plus size={18} /></button>
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
              <div key={p} className="option-item">
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{p}</span>
                <button className="delete-btn" onClick={() => removePartner(p)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-option">
            <input 
              type="text" placeholder="Add business name..." 
              value={newPartner} onChange={e => setNewPartner(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddPartner()}
            />
            <button onClick={handleAddPartner}><Plus size={18} /></button>
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
      `}</style>
    </div>
  );
}
