"use client";

import { useState, useMemo } from "react";
import { useSettings } from "@/context/SettingsContext";
import { useJobs } from "@/context/JobsContext";
import { 
  ShoppingCart, 
  User, 
  Car, 
  Phone, 
  Zap, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle,
  Check,
  Package,
  Search,
  List,
  Calendar
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function QuickServicePage() {
  const router = useRouter();
  const { 
    particulars, 
    inventorySeries, 
    partners, 
    partnerPin, 
    consumeInventoryItem, 
    catalogCategories,
    carBrands,
    carModels
  } = useSettings();
  const { addJob } = useJobs();

  const [cart, setCart] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState({
    fullName: "",
    regNumber: "",
    phone: "",
    brand: "",
    customerType: "Retail" as "Retail" | "Partner",
    partnerName: "",
    consentType: "OWNER",
    year: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectionMade, setSelectionMade] = useState(false);
  const [stockPicker, setStockPicker] = useState<{ itemId: string, cartIndex: number } | null>(null);
  const [partnerLoginId, setPartnerLoginId] = useState("");
  const [enteredPin, setEnteredPin] = useState("");
  const [loginError, setLoginError] = useState("");


  // Filter particulars based on search and category
  // Split items into Products and Services for separate cards
  const productItems = useMemo(() => {
    return particulars.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      const isProduct = p.category?.toUpperCase() !== "SERVICES";
      
      const categorySettings = catalogCategories.find(c => c.name === p.category);
      const categoryVisible = categorySettings ? categorySettings.showInPOS : true;

      return matchesSearch && matchesCategory && isProduct && p.isQuickService && categoryVisible;
    });
  }, [particulars, searchTerm, activeCategory]);

  const serviceItems = useMemo(() => {
    return particulars
      .filter(p => p.category?.toUpperCase() === "SERVICES" && p.isQuickService)
      .filter(p => {
        const categorySettings = catalogCategories.find(c => c.name === p.category);
        return categorySettings ? categorySettings.showInPOS : true;
      })
      .filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [particulars, searchTerm]);

  const availableServiceTypes = useMemo(() => {
    return particulars
      .filter(p => p.category?.toUpperCase() === "SERVICES")
      .map(p => p.name);
  }, [particulars]);

  const addToCart = (item: any) => {
    const isPartner = customerData.customerType === "Partner";
    const effectivePrice = isPartner ? (item.partnerPrice || item.cost) : item.cost;
    
    // Check if item is already in cart
    const existingIndex = cart.findIndex(c => c.id === item.id && (!c.selectedMarks || c.selectedMarks.length === 0));
    const initialServiceType = item.category === "Services" ? item.name : "";

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        ...item, 
        quantity: 1, 
        price: effectivePrice, 
        selectedMarks: [], // Now an array for multi-pick
        serviceType: initialServiceType 
      }]);
    }
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
      // Also remove last selected mark if any
      if (newCart[index].selectedMarks?.length > 0) {
        newCart[index].selectedMarks.pop();
      }
      setCart(newCart);
    } else {
      newCart.splice(index, 1);
      setCart(newCart);
    }
  };

  const deleteFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItemPrice = (index: number, newPrice: number) => {
    const newCart = [...cart];
    newCart[index].price = newPrice;
    setCart(newCart);
  };

  const updateCartItemServiceType = (index: number, newType: string) => {
    const newCart = [...cart];
    newCart[index].serviceType = newType;
    setCart(newCart);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (!customerData.fullName || !customerData.regNumber || cart.length === 0) {
      alert("Please fill in customer details and add items to cart.");
      return;
    }

    const jobData = {
      ...customerData,
      phone: customerData.phone, // Ensure phone is used
      serviceType: "Quick Service",
      status: "Completed",
      particulars: cart.map(item => {
        const isPartner = customerData.customerType === "Partner";
        const originalPrice = isPartner ? (item.partnerPrice || item.cost) : item.cost;
        
        return {
          id: item.id,
          name: item.name,
          cost: item.price, // Use actual billed price (item.price) instead of catalog cost
          originalPrice: originalPrice,
          partnerPrice: item.partnerPrice,
          expense: item.expense,
          quantity: item.quantity,
          category: item.category,
          serviceType: item.serviceType,
          selectedMarks: item.selectedMarks?.map((m: any) => m.mark) || []
        };
      }),
      totalCharge: totalAmount,
      isQuickService: true,
      timeline: {
        workEndedAt: Date.now(),
        paymentReceivedAt: Date.now()
      }
    };

    const jobId = addJob(jobData, "Completed");
    
    // Consume stock for ALL selected marks
    cart.forEach(item => {
      if (item.selectedMarks && item.selectedMarks.length > 0) {
        item.selectedMarks.forEach((m: any) => {
          consumeInventoryItem(m.itemId, jobId);
        });
      } else if (item.inventoryItemId) {
        // Fallback for single-item logic
        consumeInventoryItem(item.inventoryItemId, jobId);
      }
    });

    setIsSuccess(true);
    setTimeout(() => {
      router.push(`/dashboard/job?id=${jobId}`);
    }, 100);
  };

  const openStockPicker = (itemId: string, cartIndex: number) => {
    setStockPicker({ itemId, cartIndex });
  };

  const selectStockItem = (inventoryItem: any) => {
    if (!stockPicker) return;
    const newCart = [...cart];
    const item = { ...newCart[stockPicker.cartIndex] };
    
    const selectedMarks = item.selectedMarks ? [...item.selectedMarks] : [];
    
    const existingIndex = selectedMarks.findIndex((m: any) => m.itemId === inventoryItem.id);
    if (existingIndex !== -1) {
      selectedMarks.splice(existingIndex, 1);
    } else {
      selectedMarks.push({ itemId: inventoryItem.id, mark: inventoryItem.mark });
    }
    
    item.selectedMarks = selectedMarks;
    // Auto-increment quantity if marks exceed current quantity
    if (selectedMarks.length > (item.quantity || 1)) {
      item.quantity = selectedMarks.length;
    }
    
    newCart[stockPicker.cartIndex] = item;
    setCart(newCart);
    // Note: Modal stays open for multi-selection
  };

  const verifyPartnerLogin = () => {
    const partner = partners.find(p => p.id === partnerLoginId);
    if (partner && enteredPin === partnerPin) {
      setCustomerData({
        ...customerData, 
        customerType: 'Partner', 
        partnerName: partner.name,
        fullName: partner.name,
        consentType: 'PARTNER'
      });
      setCart(prev => prev.map(item => ({...item, price: item.partnerPrice || item.cost})));
      setSelectionMade(true);
      setPartnerLoginId("");
      setEnteredPin("");
      setLoginError("");
    } else if (enteredPin !== partnerPin) {
      setLoginError("Invalid PIN. Please try again.");
    }
  };

  const availableStock = useMemo(() => {
    return inventorySeries.flatMap(s => s.items.filter(i => i.status === 'Available').map(i => ({ ...i, seriesName: s.name })));
  }, [inventorySeries]);

  if (isSuccess) {
    return (
      <div className="pos-container flex-center">
        <div className="glass-panel text-center animate-scale-in" style={{ padding: '3rem' }}>
          <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
          <h2>Transaction Complete!</h2>
          <p className="text-muted">Job record and ledger entry created successfully.</p>
        </div>
      </div>
    );
  }

  if (!selectionMade) {
    return (
      <div className="pos-container flex-center">
        <div className="landing-selection">
          <h1 className="text-gradient text-center" style={{ marginBottom: '3rem' }}>Select Service Mode</h1>
          <div className="selection-grid">
            <div className="selection-card glass-panel retail" onClick={() => {
              setCustomerData({...customerData, customerType: 'Retail', partnerName: ''});
              setCart(prev => prev.map(item => ({...item, price: item.cost})));
              setSelectionMade(true);
            }}>
              <div className="selection-icon"><User size={48} /></div>
              <h2>Retail Customer</h2>
              <button className="primary-btn">Start Retail Service</button>
            </div>

            <div className="selection-card glass-panel partner" onClick={() => {
              setPartnerLoginId("pending");
            }}>
              <div className="selection-icon"><Package size={48} /></div>
              <h2>Partner / Business</h2>
              <button className="primary-btn" style={{ background: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}>Login as Partner</button>
            </div>
          </div>
        </div>

        {/* Partner Login Modal */}
        {partnerLoginId && (
          <div className="modal-overlay" onClick={() => { setPartnerLoginId(""); setEnteredPin(""); setLoginError(""); }}>
            <div className="modal-content glass-panel animate-scale-in" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Partner Login</h2>
                <button className="close-btn" onClick={() => { setPartnerLoginId(""); setEnteredPin(""); setLoginError(""); }}>&times;</button>
              </div>
              <div className="checkout-form">
                <div className="input-group">
                  <label>Select Your Business</label>
                  <select 
                    className="input-field"
                    value={partnerLoginId}
                    onChange={(e) => setPartnerLoginId(e.target.value)}
                  >
                    <option value="">Choose partner...</option>
                    <option value="pending" disabled hidden>Choose partner...</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Enter 4-Digit PIN</label>
                  <input 
                    type="password" 
                    placeholder="****" 
                    maxLength={4}
                    className="input-field text-center"
                    style={{ letterSpacing: '0.5rem', fontSize: '1.5rem' }}
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={e => e.key === 'Enter' && verifyPartnerLogin()}
                  />
                </div>
                {loginError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{loginError}</p>}
                <button 
                  className="primary-btn complete-btn" 
                  style={{ background: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}
                  onClick={verifyPartnerLogin}
                  disabled={!partnerLoginId || partnerLoginId === "pending" || enteredPin.length !== 4}
                >
                  Verify & Access POS
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .landing-selection {
            max-width: 900px;
            width: 100%;
          }
          .selection-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2.5rem;
          }
          .selection-card {
            padding: 3.5rem 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
            cursor: pointer;
            transition: 0.3s;
          }
          .selection-card:hover {
            transform: translateY(-8px);
            border-color: var(--accent-primary);
            background: rgba(255,255,255,0.08);
          }
          .selection-icon {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.05);
            color: var(--accent-primary);
            margin-bottom: 0.5rem;
          }
          .selection-card.partner .selection-icon {
            color: var(--accent-secondary);
          }
          .selection-card h2 {
            font-size: 1.75rem;
            margin: 0;
          }
          .selection-card p {
            color: var(--text-muted);
            font-size: 1rem;
            max-width: 280px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div className="pos-header">
        <div className="header-info" onClick={() => setSelectionMade(false)} style={{ cursor: 'pointer' }}>
          <Zap size={24} color="var(--accent-primary)" />
          <h1 className="text-gradient">Quick Service - {customerData.customerType}</h1>
        </div>
        <div className="header-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="pos-main-layout">
        <div className="items-grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: 'transparent', padding: 0, border: 'none' }}>
          {/* Section 1: Products Catalog */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Package size={20} color="var(--accent-primary)" /> Products Catalog
              </h3>
              <div className="category-tabs" style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', margin: 0 }}>
                {["All", ...catalogCategories.filter(c => c.name !== "Services" && c.showInPOS).map(c => c.name)].map(cat => (
                  <button 
                    key={cat}
                    className={activeCategory === cat ? "active" : ""}
                    onClick={() => setActiveCategory(cat)}
                    style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="items-grid">
              {productItems.map(item => (
                <div key={item.id} className="item-card glass-panel" onClick={() => addToCart(item)}>
                  <div className="item-icon">
                    <Package size={24} />
                  </div>
                  <div className="item-info">
                    <span className="item-name" style={{ fontSize: '0.85rem' }}>{item.name}</span>
                    <span className="item-price">
                      ₹{customerData.customerType === 'Partner' ? (item.partnerPrice || item.cost) : item.cost}
                    </span>
                  </div>
                  <div className="add-indicator">
                    <Plus size={16} />
                  </div>
                </div>
              ))}
              {productItems.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No products found matching filters.
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Services List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Zap size={20} color="var(--accent-secondary)" /> Services List
            </h3>
            <div className="items-grid">
              {serviceItems.map(item => (
                <div key={item.id} className="item-card glass-panel service-item" onClick={() => addToCart(item)} style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <div className="item-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-secondary)' }}>
                    <Zap size={24} />
                  </div>
                  <div className="item-info">
                    <span className="item-name" style={{ fontSize: '0.85rem' }}>{item.name}</span>
                    <span className="item-price">
                      ₹{customerData.customerType === 'Partner' ? (item.partnerPrice || item.cost) : item.cost}
                    </span>
                  </div>
                  <div className="add-indicator" style={{ background: 'var(--accent-secondary)' }}>
                    <Plus size={16} />
                  </div>
                </div>
              ))}
              {serviceItems.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No services found.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="cart-sidebar glass-panel">
          <div className="cart-header">
            <h3 style={{ margin: 0 }}><ShoppingCart size={20} /> Current Cart</h3>
            <span className="cart-count">{cart.length} items</span>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="cart-item">
                  <div className="cart-item-main">
                    <div className="item-meta">
                      <span className="name">{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>₹</span>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => updateCartItemPrice(index, Number(e.target.value))}
                          style={{ 
                            width: '70px', 
                            background: 'transparent', 
                            border: 'none', 
                            borderBottom: '1px solid var(--glass-border)', 
                            color: 'var(--success)', 
                            fontSize: '0.9rem', 
                            fontWeight: 800,
                            padding: '0' 
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '0.25rem' }}>x {item.quantity}</span>
                      </div>
                      
                      {/* Service Type Selection */}
                      <div style={{ marginTop: '0.4rem' }}>
                        {item.category === "Services" ? (
                          <div style={{ fontSize: '0.72rem', color: '#1e3a8a', fontWeight: 800 }}>
                            SERVICE: {item.serviceType.toUpperCase()}
                          </div>
                        ) : (
                          <select 
                            value={item.serviceType} 
                            onChange={(e) => updateCartItemServiceType(index, e.target.value)}
                            style={{ 
                              width: '100%', 
                              fontSize: '0.75rem', 
                              padding: '2px 4px', 
                              borderRadius: '4px', 
                              background: 'rgba(30,58,138,0.05)', 
                              border: '1px solid rgba(30,58,138,0.1)',
                              color: '#1e3a8a',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                          >
                            <option value="">SELECT SERVICE</option>
                            {availableServiceTypes.map((st: string) => (
                              <option key={st} value={st}>{st.toUpperCase()}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="item-controls">
                      <button onClick={() => removeFromCart(index)}><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => addToCart(item)}><Plus size={14} /></button>
                    </div>
                  </div>
                  
                  {/* Stock Link Helper */}
                  <div className="item-stock-link">
                    {item.selectedMarks?.length > 0 ? (
                      <div className="stock-assigned" style={{ flexWrap: 'wrap', gap: '4px' }}>
                        <CheckCircle size={12} color="var(--success)" />
                        <span style={{ fontSize: '0.7rem' }}>Marks: {item.selectedMarks.map((m: any) => `#${m.mark}`).join(', ')}</span>
                        <button className="change-link" onClick={() => openStockPicker(item.id, index)}>+ Add Mark</button>
                      </div>
                    ) : (
                      <button className="link-stock-btn" onClick={() => openStockPicker(item.id, index)}>
                        <Package size={14} /> Link Stock ID
                      </button>
                    )}
                    <button className="delete-item" onClick={() => deleteFromCart(index)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="total-row">
              <span>Total Amount</span>
              <span className="amount">₹{totalAmount}</span>
            </div>
            
            <button 
              className="primary-btn checkout-btn" 
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              Checkout <Zap size={18} />
            </button>
          </div>
        </div>
      </div>


      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-content glass-panel animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Finish Transaction</h2>
              <button className="close-btn" onClick={() => setShowCheckout(false)}>&times;</button>
            </div>
            
            <div className="checkout-form">
              <div className="input-group">
                <label><Car size={14} /> Vehicle Reg Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. KA 01 AB 1234" 
                  className="input-field"
                  value={customerData.regNumber}
                  onChange={(e) => setCustomerData({...customerData, regNumber: e.target.value.toUpperCase()})}
                />
              </div>
              
              <div className="input-group">
                <label><User size={14} /> Customer Name</label>
                {customerData.customerType === 'Partner' ? (
                  <select 
                    className="input-field"
                    value={customerData.partnerName}
                    onChange={(e) => setCustomerData({...customerData, partnerName: e.target.value, fullName: e.target.value})}
                  >
                    <option value="">Select Partner Business</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="input-field"
                    value={customerData.fullName}
                    onChange={(e) => setCustomerData({...customerData, fullName: e.target.value})}
                  />
                )}
              </div>
              
              <div className="input-group">
                <label><Phone size={14} /> Contact Number</label>
                <input 
                  type="text" 
                  placeholder="+91 XXXXX XXXXX" 
                  className="input-field"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label><Car size={14} /> Vehicle Brand</label>
                <select 
                  className="input-field"
                  value={customerData.brand}
                  onChange={(e) => setCustomerData({...customerData, brand: e.target.value})}
                >
                  <option value="">Select Brand</option>
                  {carBrands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              
              <div className="input-group">
                <label><List size={14} /> Consent Type</label>
                <select 
                  className="input-field"
                  value={customerData.consentType}
                  onChange={(e) => setCustomerData({...customerData, consentType: e.target.value})}
                >
                  {useSettings().consentTypes.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label><Calendar size={14} /> Manufacture Year</label>
                <select 
                  className="input-field"
                  value={customerData.year}
                  onChange={(e) => setCustomerData({...customerData, year: e.target.value})}
                >
                  <option value="">Select Year</option>
                  {Array.from({ length: new Date().getFullYear() - 1994 + 1 }, (_, i) => (1994 + i).toString()).reverse().map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="pos-summary">
                <div className="summary-row">
                  <span>Grand Total</span>
                  <span className="total">₹{totalAmount}</span>
                </div>
              </div>

              <button className="primary-btn complete-btn" onClick={handleCheckout}>
                Complete Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Picker Modal */}
      {stockPicker && (
        <div className="modal-overlay" onClick={() => setStockPicker(null)}>
          <div className="modal-content glass-panel animate-scale-in" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Package size={20} /> Select {cart[stockPicker.cartIndex]?.name}
              </h3>
              <button className="close-btn" onClick={() => setStockPicker(null)}>&times;</button>
            </div>
            
            <div className="stock-list" style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem' }}>
              {availableStock.filter(i => i.seriesName === cart[stockPicker.cartIndex]?.name).length === 0 ? (
                <p className="text-muted text-center py-4">No available stock for this product.</p>
              ) : (
                <div className="stock-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                  {availableStock.filter(i => i.seriesName === cart[stockPicker.cartIndex]?.name).map(item => {
                    const isSelected = cart[stockPicker.cartIndex].selectedMarks?.some((m: any) => m.id === item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`stock-card ${isSelected ? 'selected' : ''}`} 
                        style={{ 
                          padding: '1rem', 
                          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)', 
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)', 
                          borderRadius: '12px', 
                          cursor: 'pointer', 
                          textAlign: 'center',
                          position: 'relative',
                          transition: 'all 0.2s'
                        }} 
                        onClick={() => selectStockItem(item)}
                      >
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--accent-primary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                        <div className="stock-mark" style={{ fontWeight: 800, fontSize: '1.1rem', color: isSelected ? 'var(--accent-primary)' : 'inherit' }}>{item.mark}</div>
                        <div className="stock-id" style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '0.25rem' }}>{item.rawId || "ID missing"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <button className="primary-btn" onClick={() => setStockPicker(null)} style={{ width: '100%', padding: '1rem', fontWeight: 800 }}>
                DONE SELECTING
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pos-container {
          height: calc(100vh - 4rem);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .pos-main-layout {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
          flex: 1;
          min-height: 0;
        }
        .items-grid-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .items-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1.25rem;
          padding: 1px; /* prevent focus cut-off */
        }
        .item-card {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
          overflow: hidden;
        }
        .item-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent-primary);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .item-card.service-item:hover {
          border-color: var(--accent-secondary);
          background: rgba(59, 130, 246, 0.08);
        }
        .item-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(59, 130, 246, 0.1);
          color: var(--accent-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .item-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .item-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .item-price {
          font-weight: 800;
          color: var(--success);
          font-size: 1.1rem;
        }
        .add-indicator {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: var(--transition);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .item-card:hover .add-indicator {
          opacity: 1;
        }
        .category-tabs button {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 0.4rem 1rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          transition: var(--transition);
        }
        .category-tabs button:hover {
          background: rgba(255,255,255,0.1);
          border-color: var(--text-muted);
        }
        .category-tabs button.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        .flex-center {
          justify-content: center;
          align-items: center;
        }
        .pos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-search {
          position: relative;
          width: 300px;
        }
        .header-search input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.8rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          color: white;
          font-size: 0.9rem;
          outline: none;
          transition: var(--transition);
          text-transform: uppercase;
        }
        .header-search input:focus {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .cart-count {
          font-size: 0.8rem;
          padding: 0.2rem 0.6rem;
          background: var(--accent-primary);
          border-radius: 50px;
          color: white;
        }
        .cart-items {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding-right: 0.5rem;
        }
        .empty-cart {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-muted);
        }
        .cart-item {
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
        }
        .cart-item-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .item-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .item-meta .name {
          font-weight: 700;
        }
        .item-meta .price {
          color: var(--success);
          font-size: 0.9rem;
          font-weight: 800;
        }
        .item-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(0,0,0,0.2);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
        }
        .item-controls button {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          display: flex;
        }
        .item-stock-link {
          margin-top: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .link-stock-btn {
          font-size: 0.7rem;
          color: var(--accent-primary);
          background: rgba(59, 130, 246, 0.1);
          border: 1px dashed var(--accent-primary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
        }
        .stock-assigned {
          font-size: 0.7rem;
          color: var(--success);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 800;
        }
        .change-link {
          color: var(--accent-primary);
          background: transparent;
          border: none;
          text-decoration: underline;
          margin-left: 0.5rem;
          cursor: pointer;
        }
        .delete-item {
          color: var(--danger);
          opacity: 0.5;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .cart-footer {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
        }
        .total-row .amount {
          font-size: 1.5rem;
          color: var(--accent-primary);
        }
        .checkout-btn {
          width: 100%;
          justify-content: center;
          padding: 1rem;
          font-size: 1.1rem;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          width: 90%;
          max-width: 450px;
          padding: 2.5rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .checkout-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .input-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: var(--text-secondary);
        }
        .pos-summary {
          margin: 1rem 0;
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
        }
        .summary-row .total {
          color: var(--accent-primary);
        }
        .complete-btn {
          width: 100%;
          justify-content: center;
          padding: 1rem;
          font-size: 1.1rem;
          background: var(--success);
          border-color: var(--success);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        }

        .stock-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
          max-height: 400px;
          overflow-y: auto;
          margin-top: 1.5rem;
        }
        .stock-card {
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          text-align: center;
          cursor: pointer;
          transition: 0.2s;
        }
        .stock-card:hover {
          background: rgba(59, 130, 246, 0.1);
          border-color: var(--accent-primary);
        }
        .stock-mark {
          font-weight: 800;
          color: var(--accent-primary);
          margin-bottom: 0.25rem;
        }
        .series-name {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .stock-id {
          font-size: 0.65rem;
          color: var(--text-muted);
          word-break: break-all;
          margin-top: 0.5rem;
        }
        @media (max-width: 900px) {
          .pos-main-layout {
            grid-template-columns: 1fr;
          }
          .cart-sidebar {
            position: relative;
            top: 0;
            width: 100%;
            height: auto;
            max-height: none;
          }
           .pos-container {
            height: auto;
          }
        }

        @media (max-width: 1200px) {
          .selection-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
           .pos-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1.25rem;
          }
          .items-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .item-card {
            padding: 1.5rem;
            flex-direction: row; /* Keep row but wrap better */
            box-sizing: border-box;
          }
          .category-tabs {
            margin-top: 0.5rem;
          }
        }

      `}</style>
    </div>
  );
}
