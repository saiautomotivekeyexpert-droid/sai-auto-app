"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { Calculator, Plus, Minus, ArrowRight, Share2, Download, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EstimatorPage() {
  const { serviceTypes, particulars } = useSettings();
  const router = useRouter();

  const [selectedService, setSelectedService] = useState(serviceTypes[0] || "Add Key");
  const [selectedItems, setSelectedItems] = useState<{ id: string, name: string, cost: number, quantity: number }[]>([]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [total, setTotal] = useState(0);

  // Auto-calculate total
  useEffect(() => {
    const itemsTotal = selectedItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
    setTotal(serviceCharge + itemsTotal);
  }, [serviceCharge, selectedItems]);

  const toggleItem = (item: any) => {
    const exists = selectedItems.find(i => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleProceed = () => {
    // In a real app, we'd pass this via state or URL params
    // For now, we'll just navigate to the new job page
    router.push("/new-job");
  };

  return (
    <div className="estimator-container">
      <div className="estimator-header">
        <h1 className="text-gradient">Quick Estimator</h1>
        <p className="text-muted">Calculate project costs instantly for the client</p>
      </div>

      <div className="estimator-grid">
        {/* CONFIGURATION */}
        <div className="config-section glass-panel animate-fade-in">
          <div className="section-header">
            <h3><Calculator size={20} /> Build Estimate</h3>
          </div>

          <div className="form-group">
            <label className="label">Service Type</label>
            <div className="chips-container">
              {serviceTypes.map(s => (
                <button 
                  key={s} className={`chip ${selectedService === s ? 'active' : ''}`}
                  onClick={() => setSelectedService(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Service Charge (₹)</label>
            <input 
              type="number" className="input-field" placeholder="Enter base charge" 
              value={serviceCharge || ""} onChange={e => setServiceCharge(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="label">Select Particulars</label>
            <div className="items-grid">
              {particulars.map(item => {
                const isSelected = selectedItems.find(i => i.id === item.id);
                return (
                  <button 
                    key={item.id} 
                    className={`item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <span className="name">{item.name}</span>
                    <span className="price">₹{item.cost}</span>
                    {isSelected && <div className="check-badge"><Check size={12} /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="summary-section">
          <div className="summary-card glass-panel animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h3>Estimate Summary</h3>
            <div className="summary-details">
              <div className="summary-row">
                <span>Service: {selectedService}</span>
                <span>₹{serviceCharge}</span>
              </div>
              
              <div className="items-summary-list">
                {selectedItems.map(item => (
                  <div key={item.id} className="summary-row item-row">
                    <div className="item-name-qty">
                      <span>{item.name}</span>
                      <div className="qty-controls">
                        <button onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)}><Plus size={12} /></button>
                      </div>
                    </div>
                    <span>₹{item.cost * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="total-row">
                <span>Total Amount</span>
                <span className="total-value">₹{total}</span>
              </div>
            </div>

            <div className="summary-actions">
              <button className="secondary-btn"><Share2 size={18} /> Share</button>
              <button className="primary-btn" onClick={handleProceed}>
                Proceed to E-KYC <ArrowRight size={18} />
              </button>
            </div>
          </div>
          
          <p className="disclaimer">
            * This is an approximate estimate. Final billing may vary based on actual work performed.
          </p>
        </div>
      </div>

      <style jsx>{`
        .estimator-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .estimator-header {
          margin-bottom: 2.5rem;
        }
        .estimator-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
        }
        .config-section {
          padding: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
        }
        .section-header h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .form-group {
          margin-bottom: 2rem;
        }
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .item-card {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: left;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }
        .item-card:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .item-card.selected {
          background: rgba(59, 130, 246, 0.1);
          border-color: var(--accent-primary);
        }
        .item-card .name {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .item-card .price {
          font-size: 0.85rem;
          color: var(--success);
          font-weight: 600;
        }
        .check-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--accent-primary);
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-primary);
        }

        /* Summary styles */
        .summary-card {
          padding: 2rem;
          position: sticky;
          top: 2rem;
        }
        .summary-card h3 {
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
        }
        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--text-secondary);
        }
        .item-row {
          padding-top: 0.75rem;
          border-top: 1px solid var(--glass-border);
        }
        .item-name-qty {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .qty-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.4);
          padding: 0.25rem 0.5rem;
          border-radius: 1rem;
          width: fit-content;
        }
        .qty-controls button {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .qty-controls span {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          min-width: 15px;
          text-align: center;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 2px solid var(--glass-border);
          margin-top: 1rem;
        }
        .total-row span {
          font-weight: 700;
          font-size: 1.1rem;
          color: var(--text-primary);
        }
        .total-value {
          color: var(--accent-primary) !important;
          font-size: 1.5rem !important;
        }
        .summary-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }
        .disclaimer {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 1.5rem;
          line-height: 1.4;
        }

        @media (max-width: 1024px) {
          .estimator-grid {
            grid-template-columns: 1fr;
          }
          .summary-card {
            position: relative;
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
