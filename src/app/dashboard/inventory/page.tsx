"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSettings } from "@/context/SettingsContext";
import {
  Search,
  Package,
  Trash2,
  Plus,
  Hash,
  List,
  ChevronRight,
  Zap,
  RefreshCcw
} from "lucide-react";

export default function InventoryPage() {
  const {
    inventorySeries,
    addInventorySeries,
    updateInventoryItem, 
    removeInventorySeries,
    particulars,
    addParticular,
    updateParticular,
    removeParticular,
    resetParticularsToDefault,
    catalogCategories,
    addCatalogCategory,
    toggleCatalogCategoryPOS,
    removeCatalogCategory,
    serviceTypes,
    addServiceType,
    removeServiceType,
    subCategories,
    addSubCategory,
    removeSubCategory,
    restoreRecommendedDefaults
  } = useSettings();

  const [batchType, setBatchType] = useState<"series" | "non-series">("series");
  const [inventoryForm, setInventoryForm] = useState({
    name: "",
    vendor: "",
    quantity: "",
    rate: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    prefix: "",
    start: "",
    end: "",
    marksText: "",
    category: "Transponder",
    partnerPrice: 0,
    isQuickService: true
  });
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null);
  
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("All");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newServiceTypeName, setNewServiceTypeName] = useState("");
  const [newSubCategoryName, setNewSubCategoryName] = useState("");
  const [newServiceItemName, setNewServiceItemName] = useState("");
  const [posServiceSearchTerm, setPosServiceSearchTerm] = useState("");
  
  const formRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<"All" | "Active" | "Exhausted">("All");

  const handleQuickAdd = (productName: string) => {
    setInventoryForm(prev => ({ ...prev, name: productName }));
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Minor delay to allow state update/animation to finish before focus
      setTimeout(() => nameInputRef.current?.focus(), 500);
    }
  };
  
  // Update form category if existing one is deleted
  useEffect(() => {
    if (catalogCategories.length > 0 && !catalogCategories.some(c => c.name === inventoryForm.category)) {
      setInventoryForm(prev => ({ ...prev, category: catalogCategories[0].name }));
    }
  }, [catalogCategories, inventoryForm.category]);


  const handleCreateBatch = () => {
    let finalMarks: string[] = [];

    if (batchType === "non-series") {
      const gty = Number(inventoryForm.quantity) || 1;
      for (let i = 1; i <= gty; i++) {
        finalMarks.push(`${inventoryForm.name} #${i}`);
      }
    } else {
      // Series Logic (Sequential)
      if (inventoryForm.marksText.trim()) {
        finalMarks = inventoryForm.marksText.split(',').map(m => m.trim()).filter(Boolean);
      } else if (inventoryForm.start) {
        const sRaw = (inventoryForm.prefix || "") + inventoryForm.start.trim();
        const eRaw = inventoryForm.end ? (inventoryForm.prefix || "") + inventoryForm.end.trim() : "";
        
        // Calculate common prefix
        let prefLen = 0;
        while (prefLen < sRaw.length && eRaw && prefLen < eRaw.length && sRaw[prefLen] === eRaw[prefLen]) {
          prefLen++;
        }
        const prefix = sRaw.substring(0, prefLen);

        // Calculate common suffix
        let sSuffixIdx = sRaw.length - 1;
        let eSuffixIdx = eRaw ? eRaw.length - 1 : -1;
        while (eRaw && sSuffixIdx >= prefLen && eSuffixIdx >= prefLen && sRaw[sSuffixIdx] === eRaw[eSuffixIdx]) {
          sSuffixIdx--;
          eSuffixIdx--;
        }
        const suffix = eRaw ? sRaw.substring(sSuffixIdx + 1) : "";

        // Extract parts that change
        const sMid = sRaw.substring(prefLen, sSuffixIdx + 1);
        const eMid = eRaw ? eRaw.substring(prefLen, eSuffixIdx + 1) : "";

        const sNum = parseInt(sMid);
        let eNum = parseInt(eMid);

        if (isNaN(eNum) && inventoryForm.quantity) {
          eNum = sNum + Number(inventoryForm.quantity) - 1;
        }

        if (!isNaN(sNum) && !isNaN(eNum)) {
          const start = Math.min(sNum, eNum);
          const end = Math.max(sNum, eNum);
          const padding = Math.max(sMid.length, eMid.length);
          for (let i = start; i <= end; i++) {
            finalMarks.push(`${prefix}${i.toString().padStart(padding, '0')}${suffix}`);
          }
        } else if (sMid.length === 1 && eMid.length === 1) {
          const start = sMid.charCodeAt(0);
          const end = eMid.charCodeAt(0);
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let i = min; i <= max; i++) {
            finalMarks.push(`${prefix}${String.fromCharCode(i)}${suffix}`);
          }
        }
      }
    }

    if (finalMarks.length > 0 && inventoryForm.name && inventoryForm.vendor) {
      // Ensure item is in catalog
      const existing = particulars.find(p => p.name.toLowerCase() === inventoryForm.name.toLowerCase());
      if (existing) {
        updateParticular(existing.id, { 
          category: inventoryForm.category, 
          isQuickService: inventoryForm.isQuickService,
          expense: inventoryForm.rate,
          partnerPrice: inventoryForm.partnerPrice || existing.partnerPrice
        });
      } else {
        // Automatically add to catalog if new
        addParticular(
          inventoryForm.name, 
          inventoryForm.rate * 1.5, // Default sales price 50% markup
          inventoryForm.partnerPrice || inventoryForm.rate, 
          inventoryForm.rate, 
          inventoryForm.isQuickService, 
          inventoryForm.category
        );
      }

      addInventorySeries(
        inventoryForm.name, 
        inventoryForm.vendor, 
        inventoryForm.rate, 
        inventoryForm.purchaseDate, 
        finalMarks,
        Number(inventoryForm.quantity) || finalMarks.length,
        batchType
      );
      setInventoryForm({ 
        name: "", 
        vendor: "", 
        quantity: "",
        rate: 0, 
        purchaseDate: new Date().toISOString().split('T')[0], 
        prefix: "", 
        start: "", 
        end: "", 
        marksText: "",
        category: catalogCategories[0]?.name || "Others",
        partnerPrice: 0,
        isQuickService: true
      });
    }
  };

  const groupedInventory = useMemo(() => {
    return inventorySeries
      .filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) || 
                             s.vendor.toLowerCase().includes(inventorySearchTerm.toLowerCase());
        const matchesStatus = inventoryStatusFilter === "All" || 
                             (inventoryStatusFilter === "Active" && !s.isExhausted) || 
                             (inventoryStatusFilter === "Exhausted" && s.isExhausted);
        return matchesSearch && matchesStatus;
      })
      .reduce((acc, series) => {
        if (!acc[series.name]) acc[series.name] = [];
        acc[series.name].push(series);
        return acc;
      }, {} as Record<string, typeof inventorySeries>);
  }, [inventorySeries, inventorySearchTerm, inventoryStatusFilter]);

  // Pre-calculate categories for efficiency during render
  const productCategories = useMemo(() => {
    const map: Record<string, string> = {};
    particulars.forEach(p => {
      map[p.name.toLowerCase()] = p.category;
    });
    return map;
  }, [particulars]);

  // Derive the Services List directly from particulars (SERVICES category)
  // This is now independent of the main catalog search for management clarity
  const inventoryServiceItems = useMemo(() => {
    return particulars
      .filter(p => p.category?.toUpperCase() === "SERVICES")
      .filter(item => item.name.toLowerCase().includes(posServiceSearchTerm.toLowerCase()));
  }, [particulars, posServiceSearchTerm]);

  // Helper to update a catalog record for a service
  const handleServicePriceUpdate = (item: any, updates: any) => {
    updateParticular(item.id, updates);
  };

  return (
    <div className="inventory-page-container">
      <div className="inventory-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <h1 className="text-gradient">Manage Stock & Item Catalog</h1>
            <p className="text-muted">Manage stock, track purchase history and assign raw IDs</p>
          </div>
        </div>
      </div>

      <div className="inventory-content-layout">
        <div className="inventory-form-column">
          {/* ITEM CATALOG (Formerly Job Particulars) */}
          <div className="glass-panel catalog-section" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} color="var(--accent-primary)" /> Products Catalog
              </div>
            </h3>

            <div className="catalog-filters" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="search-wrapper" style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search Products & Services..." 
                  value={catalogSearchTerm} 
                  onChange={e => setCatalogSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem 0.75rem 0.4rem 2.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
              </div>
              <div className="category-tabs" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
                {["All", ...catalogCategories.filter(cat => cat.name !== "SERVICES").map(cat => cat.name)].map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCatalogCategoryFilter(cat)}
                    style={{ 
                      padding: '0.3rem 0.75rem', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem', 
                      whiteSpace: 'nowrap',
                      background: catalogCategoryFilter === cat ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                      color: catalogCategoryFilter === cat ? 'white' : 'var(--text-muted)',
                      border: '1px solid ' + (catalogCategoryFilter === cat ? 'var(--accent-primary)' : 'var(--glass-border)')
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="catalog-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '0.5rem' }}>
              {particulars
                .filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(catalogSearchTerm.toLowerCase());
                  const isProduct = p.category?.toUpperCase() !== "SERVICES";
                  const matchesCat = catalogCategoryFilter === "All" || p.category === catalogCategoryFilter;
                  return matchesSearch && isProduct && matchesCat;
                })
                .map(item => (
                <div key={item.id} className="catalog-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => updateParticular(item.id, { name: e.target.value })}
                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, padding: 0, width: '200px', cursor: 'text' }}
                      />
                      <select 
                        value={item.category} 
                        onChange={(e) => updateParticular(item.id, { category: e.target.value })}
                        style={{ 
                          fontSize: '0.65rem', 
                          padding: '0.1rem 0.4rem', 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          color: 'var(--accent-primary)', 
                          borderRadius: '4px', 
                          border: 'none',
                          textTransform: 'uppercase', 
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {catalogCategories.filter(cat => cat.name !== "SERVICES").map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={item.isQuickService} 
                          onChange={(e) => updateParticular(item.id, { isQuickService: e.target.checked })}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        QS
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: 'var(--success)' }}>SELL: ₹</span>
                        <input 
                          type="number" 
                          value={item.cost} 
                          onChange={(e) => updateParticular(item.id, { cost: Number(e.target.value) })}
                          style={{ width: '60px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: 'var(--accent-secondary)' }}>PARTNER: ₹</span>
                        <input 
                          type="number" 
                          value={item.partnerPrice || 0} 
                          onChange={(e) => updateParticular(item.id, { partnerPrice: Number(e.target.value) })}
                          style={{ width: '60px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: 'var(--danger)', opacity: 0.8 }}>EXP: ₹</span>
                        <input 
                          type="number" 
                          value={item.expense} 
                          onChange={(e) => updateParticular(item.id, { expense: Number(e.target.value) })}
                          style={{ width: '60px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0' }}
                        />
                      </div>
                    </div>
                  </div>
                  <button className="delete-btn" onClick={() => removeParticular(item.id)} style={{ padding: '0.4rem', color: 'var(--danger)', opacity: 0.5, background: 'transparent', border: 'none' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {particulars.filter(p => p.category !== "SERVICES").length === 0 && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem' }}>No products in catalog.</p>}
            </div>

            
          </div>

          <div className="glass-panel batch-creator" ref={formRef}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
              <Plus size={20} color="var(--accent-primary)" /> Add New Stock
            </h3>

            <div className="batch-type-toggle">
              <button 
                className={batchType === 'series' ? 'active' : ''} 
                onClick={() => setBatchType('series')}
              >
                <List size={16} /> Series
              </button>
              <button 
                className={batchType === 'non-series' ? 'active' : ''} 
                onClick={() => setBatchType('non-series')}
              >
                <Hash size={16} /> Non-Series
              </button>
            </div>
            <div className="inventory-form">
              <div className="input-group">
                <label>Product Name (e.g. "XT27A")</label>
                  <input 
                    ref={nameInputRef}
                    type="text" 
                    list="product-names"
                    className="input-field" 
                    placeholder="Enter product name"
                    value={inventoryForm.name} 
                    onChange={e => setInventoryForm({...inventoryForm, name: e.target.value})} 
                  />
                  <datalist id="product-names">
                    {Array.from(new Set(inventorySeries.map(s => s.name))).map((name: any) => (
                      <option key={String(name)} value={String(name)} />
                    ))}
                  </datalist>
              </div>

              <div className="row">
                <div className="input-group">
                  <label>Vendor</label>
                  <input 
                    type="text" 
                    placeholder="e.g. S.K. Keys" 
                    className="input-field" 
                    value={inventoryForm.vendor} 
                    onChange={e => setInventoryForm({...inventoryForm, vendor: e.target.value})} 
                  />
                </div>
                <div className="input-group">
                  <label>Category</label>
                  <select 
                    className="input-field" 
                    value={inventoryForm.category}
                    onChange={e => setInventoryForm({...inventoryForm, category: e.target.value})}
                  >
                    {catalogCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={inventoryForm.isQuickService} 
                    onChange={e => setInventoryForm({...inventoryForm, isQuickService: e.target.checked})}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  Quick Service Item (Sync to POS)
                </label>
              </div>

              <div className="row">
                <div className="input-group">
                  <label>Purchase Rate (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={inventoryForm.rate || ""} 
                    onChange={e => setInventoryForm({...inventoryForm, rate: Number(e.target.value)})} 
                  />
                </div>
                <div className="input-group">
                  <label>Partner Seller Price (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="B2B Rate"
                    value={inventoryForm.partnerPrice || ""} 
                    onChange={e => setInventoryForm({...inventoryForm, partnerPrice: Number(e.target.value)})} 
                  />
                </div>
                {batchType === 'non-series' && (
                  <div className="input-group">
                    <label>Quantity</label>
                    <input 
                      type="number" 
                      placeholder="Total units" 
                      className="input-field" 
                      value={inventoryForm.quantity} 
                      onChange={e => setInventoryForm({...inventoryForm, quantity: e.target.value})} 
                    />
                  </div>
                )}
              </div>
              
              <div className="input-group">
                <label>Purchase Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={inventoryForm.purchaseDate} 
                  onChange={e => setInventoryForm({...inventoryForm, purchaseDate: e.target.value})} 
                />
              </div>

              {batchType === 'series' && (
                <div className="series-generator glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderStyle: 'dashed' }}>
                  <h5 style={{ fontSize: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Range Generation Logic</h5>
                  <div className="quick-presets" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button className="secondary-btn small-btn" onClick={() => setInventoryForm({...inventoryForm, prefix: "J", start: "A26", end: "Z26"})}>JA26-JZ26</button>
                    <button className="secondary-btn small-btn" onClick={() => setInventoryForm({...inventoryForm, prefix: "F", start: "1.26", end: "15.26"})}>F1.26-F15.26</button>
                    <button className="secondary-btn small-btn" onClick={() => setInventoryForm({...inventoryForm, prefix: "NJ6", start: "1", end: "12"})}>NJ61-12</button>
                  </div>
                  <div className="row">
                    <input type="text" placeholder="Prefix" className="input-field" value={inventoryForm.prefix} onChange={e => setInventoryForm({...inventoryForm, prefix: e.target.value})} />
                    <input type="text" placeholder="Start" className="input-field" value={inventoryForm.start} onChange={e => setInventoryForm({...inventoryForm, start: e.target.value})} />
                    <input type="text" placeholder="End" className="input-field" value={inventoryForm.end} onChange={e => setInventoryForm({...inventoryForm, end: e.target.value})} />
                  </div>
                  <div className="or-divider">OR CUSTOM MARKS</div>
                  <textarea 
                    placeholder="Comma separated marks (JA26, JZ26, F1.26)..." 
                    className="input-field small-textarea"
                    value={inventoryForm.marksText}
                    onChange={e => setInventoryForm({...inventoryForm, marksText: e.target.value})}
                  />
                </div>
              )}

              <button className="add-btn-wide primary-btn" onClick={handleCreateBatch} style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                <Plus size={18} /> Add Stock
              </button>
            </div>
          </div>

          <div className="glass-panel manage-categories" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={20} color="var(--accent-primary)" /> Product Categories (E-KYC & POS)
            </h3>
            <div className="category-management-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {catalogCategories.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '0.5rem', marginRight: '0.2rem' }}>
                    <input 
                      type="checkbox" 
                      checked={cat.showInPOS} 
                      onChange={() => toggleCatalogCategoryPOS(cat.name)}
                      style={{ width: '12px', height: '12px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                      title="Show in Quick Service POS"
                    />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: cat.showInPOS ? 'var(--accent-primary)' : 'var(--text-muted)' }}>POS</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{cat.name}</span>
                  <button 
                    onClick={() => removeCatalogCategory(cat.name)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', opacity: 0.6, cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="New Category (e.g. BLADE)" 
                className="input-field" 
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              />
              <button 
                className="primary-btn" 
                onClick={() => { if(newCategoryName.trim()) { addCatalogCategory(newCategoryName.trim()); setNewCategoryName(""); } }}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="glass-panel manage-services" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="var(--accent-primary)" /> E-KYC Main Service List
            </h3>
            <div className="service-management-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {serviceTypes.map(st => (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem' }}>{st}</span>
                  <button 
                    onClick={() => removeServiceType(st)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', opacity: 0.6, cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="New E-KYC Main Service" 
                className="input-field" 
                value={newServiceTypeName}
                onChange={e => setNewServiceTypeName(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              />
              <button 
                className="primary-btn" 
                onClick={() => { if(newServiceTypeName.trim()) { addServiceType(newServiceTypeName.trim()); setNewServiceTypeName(""); } }}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="glass-panel manage-subcategories" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <List size={20} color="var(--accent-primary)" /> E-KYC Sub-Category Service List
            </h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Used in E-KYC form alongside Particulars</p>
            <div className="subcategory-management-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {subCategories.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '0.75rem' }}>{item.name}</span>
                  <button 
                    onClick={() => removeSubCategory(item.id)}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', opacity: 0.6, cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                placeholder="New Sub-category..." 
                className="input-field" 
                value={newSubCategoryName}
                onChange={e => setNewSubCategoryName(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
              />
              <button 
                className="primary-btn" 
                onClick={() => { if(newSubCategoryName.trim()) { addSubCategory(newSubCategoryName.trim()); setNewSubCategoryName(""); } }}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="glass-panel manage-pos-services" style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} color="var(--accent-secondary)" /> Quick Service POS Service List
              </div>
              <div className="search-wrapper" style={{ position: 'relative', width: '200px' }}>
                <Search size={12} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search services..." 
                  value={posServiceSearchTerm} 
                  onChange={e => setPosServiceSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.3rem 0.5rem 0.3rem 1.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.7rem' }}
                />
              </div>
            </h3>

            <div className="pos-service-management-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {inventoryServiceItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleServicePriceUpdate(item, { name: e.target.value })}
                        style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, padding: 0, width: '240px' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-muted)', cursor: 'pointer', background: item.isQuickService ? 'rgba(59, 130, 246, 0.1)' : 'transparent', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid ' + (item.isQuickService ? 'rgba(59, 130, 246, 0.2)' : 'transparent') }}>
                        <input 
                          type="checkbox" 
                          checked={item.isQuickService} 
                          onChange={(e) => handleServicePriceUpdate(item, { isQuickService: e.target.checked })}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ color: item.isQuickService ? 'var(--accent-primary)' : 'inherit', fontWeight: item.isQuickService ? 700 : 400 }}>SHOW IN POS</span>
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.7rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span style={{ color: 'var(--success)', fontSize: '0.6rem', fontWeight: 700 }}>SELL</span>
                        <input 
                          type="number" 
                          value={item.cost} 
                          onChange={(e) => handleServicePriceUpdate(item, { cost: Number(e.target.value) })}
                          style={{ width: '55px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0 0 0 0.2rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span style={{ color: 'var(--accent-secondary)', fontSize: '0.6rem', fontWeight: 700 }}>PARTNER</span>
                        <input 
                          type="number" 
                          value={item.partnerPrice || 0} 
                          onChange={(e) => handleServicePriceUpdate(item, { partnerPrice: Number(e.target.value) })}
                          style={{ width: '55px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0 0 0 0.2rem' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span style={{ color: 'var(--danger)', fontSize: '0.6rem', fontWeight: 700, opacity: 0.8 }}>EXP</span>
                        <input 
                          type="number" 
                          value={item.expense} 
                          onChange={(e) => handleServicePriceUpdate(item, { expense: Number(e.target.value) })}
                          style={{ width: '55px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: '0.75rem', padding: '0 0 0 0.2rem' }}
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeParticular(item.id)}
                    style={{ background: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.1)', color: '#f87171', cursor: 'pointer', display: 'flex', padding: '0.4rem', borderRadius: '6px' }}
                    title="Delete Service"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {inventoryServiceItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No services found.</p>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <input 
                type="text" 
                placeholder="Add New Service Name..." 
                className="input-field" 
                value={newServiceItemName}
                onChange={e => setNewServiceItemName(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.5rem', flex: 1 }}
              />
               <button 
                className="primary-btn" 
                onClick={() => { if(newServiceItemName.trim()) { addParticular(newServiceItemName.trim(), 0, 0, 0, true, "SERVICES"); setNewServiceItemName(""); } }}
                style={{ padding: '0.5rem 1.25rem', background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} /> <span>ADD</span>
              </button>
            </div>
          </div>
        </div>

        <div className="inventory-list-column">
          <div className="glass-panel list-container">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Active Inventory</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setInventoryStatusFilter("All")}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: inventoryStatusFilter === 'All' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: inventoryStatusFilter === 'All' ? 'white' : 'var(--text-muted)', border: '1px solid var(--glass-border)' }}
                >
                  All
                </button>
                <button 
                  onClick={() => setInventoryStatusFilter("Active")}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: inventoryStatusFilter === 'Active' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: inventoryStatusFilter === 'Active' ? 'white' : 'var(--text-muted)', border: '1px solid var(--glass-border)' }}
                >
                  In Stock
                </button>
              </div>
            </h3>

            <div className="search-wrapper" style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search inventory (e.g. XT27A)..." 
                value={inventorySearchTerm} 
                onChange={e => setInventorySearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.4rem 0.75rem 0.4rem 2.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
              />
            </div>

            <div className="series-list">
              {Object.keys(groupedInventory).length === 0 ? (
                <div className="empty-inventory">
                  <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>{inventorySearchTerm ? "No matching inventory found." : "No stock entries tracked yet."}</p>
                </div>
              ) : (
                Object.entries(groupedInventory).map(([productName, seriesList]) => {
                  const itemCategory = productCategories[productName.toLowerCase()] || "Others";
                  const typedSeriesList = seriesList as any[];
                  return (
                    <div key={productName} className="product-bag glass-panel" style={{ padding: '1rem', border: '1px solid var(--accent-primary)', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.03)', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '0.75rem' }}>
                        <Package size={20} color="var(--accent-primary)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>{productName.toUpperCase()}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{itemCategory.toUpperCase()}</span>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button 
                            className="primary-btn" 
                            onClick={() => handleQuickAdd(productName)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'var(--accent-primary)' }}
                          >
                            <Plus size={14} /> Add Stock
                          </button>
                          <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                            {typedSeriesList.length} {typedSeriesList.length === 1 ? 'BATCH' : 'BATCHES'}
                          </span>
                        </div>
                      </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {typedSeriesList.map((series: any) => (
                        <div key={series.id} className={`series-item glass-panel ${series.isExhausted ? 'exhausted' : ''}`} style={{ background: 'rgba(0,0,0,0.2)' }}>
                          <div className="series-main" onClick={() => setExpandedSeries(expandedSeries === series.id ? null : series.id)} style={{ padding: '0.75rem 1rem' }}>
                            <div className="series-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ 
                                  fontSize: '0.6rem', 
                                  padding: '0.1rem 0.4rem', 
                                  borderRadius: '4px', 
                                  background: series.type === 'non-series' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                  color: series.type === 'non-series' ? 'var(--success)' : 'var(--accent-primary)', 
                                  border: '1px solid ' + (series.type === 'non-series' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)'),
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}>
                                  {series.type || 'series'}
                                </span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{series.items.length} Units</span>
                              </div>
                            </div>
                            <div className="series-stats">
                              <span className="stock" style={{ fontSize: '0.75rem' }}>{series.items.filter((i: any) => i.status === 'Available').length} IN STOCK</span>
                              <ChevronRight size={16} style={{ transform: expandedSeries === series.id ? 'rotate(90deg)' : 'none', transition: '0.2s', opacity: 0.5 }} />
                            </div>
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); removeInventorySeries(series.id); }} style={{ marginLeft: '0.5rem' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
 
                          {expandedSeries === series.id && (
                            <div className="series-detail" style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="items-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                                {series.items.map((item: any) => (
                                  <div key={item.id} className={`stock-unit ${item.status.toLowerCase()}`} style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                      <div className="unit-mark" style={{ fontSize: '0.75rem' }}>{item.mark}</div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{series.vendor.toUpperCase()}</div>
                                        <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{new Date(series.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.5rem' }}>₹{series.purchaseRate}</div>
                                    
                                    {item.status === 'Available' ? (
                                      <input 
                                        type="text" 
                                        placeholder="Raw ID..." 
                                        className="raw-id-input"
                                        value={item.rawId || ""}
                                        onChange={(e) => updateInventoryItem(series.id, item.id, e.target.value)}
                                        style={{ fontSize: '0.7rem', width: '100%' }}
                                      />
                                    ) : (
                                      <div className="unit-used">
                                        <div className="job-id">#{item.usedInJobId}</div>
                                        <div className="raw-id-view">{item.rawId || "NONE"}</div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .inventory-page-container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .inventory-header {
          margin-bottom: 2.5rem;
        }
        .inventory-content-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
          align-items: start;
        }
        .batch-creator, .list-container {
          padding: 2rem;
        }
        .batch-type-toggle {
          display: flex;
          background: rgba(0,0,0,0.2);
          padding: 0.25rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }
        .batch-type-toggle button {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.2s;
        }
        .batch-type-toggle button.active {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .inventory-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .row {
          display: flex;
          gap: 1rem;
        }
        .input-group {
          flex: 1;
        }
        .input-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .or-divider {
          text-align: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin: 1.25rem 0;
          position: relative;
        }
        .or-divider::before, .or-divider::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 30%;
          height: 1px;
          background: var(--glass-border);
        }
        .or-divider::before { left: 0; }
        .or-divider::after { right: 0; }
        
        .small-textarea {
          height: 80px;
          font-size: 0.8rem;
          resize: none;
        }
        .small-btn {
          font-size: 0.7rem;
          padding: 0.4rem 0.6rem;
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
          font-size: 1.1rem;
          color: var(--accent-primary);
        }
        .series-vendor {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .series-stats {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .stock {
          font-size: 0.85rem;
          font-weight: 700;
        }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--danger);
          opacity: 0.4;
          transition: 0.2s;
        }
        .delete-btn:hover { opacity: 1; transform: scale(1.1); }
        
        .series-detail {
          padding: 0 1.5rem 1.5rem;
          border-top: 1px solid var(--glass-border);
        }
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .stock-unit {
          padding: 1rem;
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .unit-mark {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--accent-primary);
        }
        .raw-id-input {
          background: rgba(255,255,255,0.05) !important;
          padding: 0.5rem !important;
          font-size: 0.8rem !important;
          border-radius: 6px !important;
          border: 1px solid var(--glass-border) !important;
        }
        .used {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .unit-used {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .job-id {
          color: var(--success);
          font-size: 0.7rem;
          font-weight: 800;
        }
        .raw-id-view {
          font-size: 0.7rem;
          color: var(--text-muted);
          word-break: break-all;
        }
        .empty-inventory {
          padding: 5rem 2rem;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media (max-width: 1100px) {
          .inventory-content-layout {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .inventory-header h1 {
            font-size: 1.5rem;
          }
          .row {
            flex-direction: column;
            gap: 1rem;
          }
          .catalog-item {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          .catalog-item input[type="text"] {
            width: 100% !important;
          }
          .series-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
