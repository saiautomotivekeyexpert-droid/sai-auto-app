"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ParticularItem {
  id: string;
  name: string;
  cost: number;
  partnerPrice: number;
  expense: number;
  isQuickService: boolean;
  category: string;
  hasInventory?: boolean | string;
}

export interface Partner {
  id: string;
  name: string;
}

interface SubCategoryItem {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  mark: string;
  rawId?: string;
  status: "Available" | "Used";
  usedInJobId?: string;
  usedAt?: number;
}

interface InventorySeries {
  id: string;
  name: string;
  vendor: string;
  purchaseRate: number;
  purchaseDate: string;
  totalQuantity?: number;
  items: InventoryItem[];
  createdAt: number;
  isExhausted: boolean;
  type?: "series" | "non-series";
}

export interface CatalogCategory {
  name: string;
  showInPOS: boolean;
}

interface SettingsContextType {
  serviceTypes: string[];
  consentTypes: string[];
  particulars: ParticularItem[];
  subCategories: SubCategoryItem[];
  partners: Partner[];
  partnerPin: string;
  carBrands: string[];
  carModels: Record<string, string[]>;
  estimateTerms: string;
  invoiceTerms: string;
  shopProfile: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  inventorySeries: InventorySeries[];
  catalogCategories: CatalogCategory[];
  addServiceType: (type: string) => void;
  removeServiceType: (type: string) => void;
  addConsentType: (type: string) => void;
  removeConsentType: (type: string) => void;
  addParticular: (name: string, cost: number, partnerPrice: number, expense: number, isQuickService: boolean, category: string) => void;
  updateParticular: (id: string, updates: Partial<ParticularItem>) => void;
  removeParticular: (id: string) => void;
  addSubCategory: (name: string) => void;
  removeSubCategory: (id: string) => void;
  addPartner: (name: string) => void;
  removePartner: (id: string) => void;
  updatePartnerPin: (pin: string) => void;
  updateEstimateTerms: (terms: string) => void;
  updateInvoiceTerms: (terms: string) => void;
  updateShopProfile: (profile: Partial<SettingsContextType["shopProfile"]>) => void;
  addInventorySeries: (name: string, vendor: string, rate: number, date: string, marks: string[], quantity?: number, type?: "series" | "non-series") => void;
  updateInventoryItem: (seriesId: string, itemId: string, rawId: string) => void;
  consumeInventoryItem: (itemId: string, jobId: string) => void;
  removeInventorySeries: (id: string) => void;
  resetParticularsToDefault: () => void;
  addCatalogCategory: (name: string) => void;
  toggleCatalogCategoryPOS: (name: string) => void;
  removeCatalogCategory: (name: string) => void;
  restoreRecommendedDefaults: () => void;
  releaseInventoryItem: (jobId: string) => void;
  consumeByProductName: (productName: string, jobId: string) => { itemId: string, mark: string } | null;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_PARTICULARS: ParticularItem[] = [];

const DEFAULT_SUB_CATEGORIES: SubCategoryItem[] = [
  { id: "sc1", name: "KEY CUTTING" },
  { id: "sc2", name: "PROGRAMING" },
];

const RECOMMENDED_CATALOG_CATEGORIES = [
  "U- TRANSPONDERS", "G- TRANSPONDERS", "U- SMART KEY", "G- SMART KEY", 
  "U- FLIP KEY REMOTE", "REMOTE KEY SHELLS", "KEY SHELLS", 
  "BLADE", "BATTERIES", "OTHERS", "SERVICES"
];

const RECOMMENDED_SERVICE_TYPES = ["ADD KEY", "ALL KEYS LOST", "EMERGENCY CAR UNLOCK"];


export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<string[]>(["ADD KEY", "ALL KEYS LOST", "EMERGENCY CAR UNLOCK"]);
  const [consentTypes, setConsentTypes] = useState<string[]>(["OWNER", "DRIVER", "PARTNER", "OTHER"]);
  const [partners, setPartners] = useState<Partner[]>([
    { id: "p1", name: "RAVI AUTO" },
    { id: "p2", name: "SWADI AUTOMOBILE" },
    { id: "p3", name: "RAJAN LOCK" }
  ]);
  const [partnerPin, setPartnerPin] = useState<string>("1234");

  const [particulars, setParticulars] = useState<ParticularItem[]>([]);
  const [inventorySeries, setInventorySeries] = useState<InventorySeries[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>(DEFAULT_SUB_CATEGORIES);
  const [estimateTerms, setEstimateTerms] = useState<string>(
    "I CONFIRM THAT ALL PROVIDED INFORMATION IS TRUE AND ACCURATE\nI AM THE LEGAL OWNER / AUTHORIZED USER OF THE VEHICLE\nI AUTHORIZE SAI AUTO KEY WORKS TO PROCEED WITH THE REQUESTED SERVICE"
  );
  const [invoiceTerms, setInvoiceTerms] = useState<string>(
    "I CONFIRM THAT ALL PROVIDED INFORMATION IS TRUE AND ACCURATE\nI AM THE LEGAL OWNER / AUTHORIZED USER OF THE VEHICLE\nI AUTHORIZE SAI AUTO KEY WORKS TO PROCEED WITH THE REQUESTED SERVICE"
  );
  const [shopProfile, setShopProfile] = useState({
    name: "SAI AUTO KEY WORKS",
    address: "Bengaluru, Karnataka, India",
    phone: "+91 98765 43210",
    email: "SAIAUTOKEYWORKS@GMAIL.COM"
  });

  const carBrands = [
    "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Toyota", "Kia", "Honda", 
    "Skoda", "Volkswagen", "Renault", "MG", "Nissan", "Mercedes-Benz", "BMW", 
    "Audi", "Ford", "Chevrolet", "Jeep", "Other"
  ];

  const carModels: Record<string, string[]> = {
    "Maruti Suzuki": ["Alto", "Swift", "Dzire", "Wagon R", "Baleno", "Ertiga", "Brezza", "Ciaz", "Grand Vitara", "Ignis", "S-Presso"],
    "Hyundai": ["i10", "i20", "Creta", "Venue", "Verna", "Alcazar", "Tucson", "Santal Fe", "Eon", "Xcent"],
    "Tata": ["Nexon", "Punch", "Altroz", "Tiago", "Tigor", "Harrier", "Safari", "Nano", "Indica", "Indigo"],
    "Mahindra": ["Scorpio", "Thar", "XUV700", "XUV300", "Bolero", "XUV500", "KUV100", "Marazzo"],
    "Toyota": ["Innova", "Fortuner", "Glanza", "Urban Cruiser", "Camry", "Corolla", "Etios", "Qualis"],
    "Kia": ["Seltos", "Sonet", "Carens", "Carnival"],
    "Honda": ["City", "Amaze", "Jazz", "WR-V", "Civic", "CR-V", "Brio"],
    "Skoda": ["Slavia", "Kushaq", "Octavia", "Superb", "Rapid", "Kodiaq"],
    "Volkswagen": ["Virtus", "Taigun", "Polo", "Vento", "Tiguan", "Jetta"],
    "Renault": ["Kwid", "Triber", "Kiger", "Duster", "Lodgy"],
    "MG": ["Hector", "Astor", "ZS EV", "Gloster"],
    "Nissan": ["Magnite", "Kicks", "Sunny", "Micra", "Terrano"],
    "Mercedes-Benz": ["C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE"],
    "BMW": ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5"],
    "Audi": ["A4", "A6", "A8", "Q3", "Q5", "Q7"],
    "Ford": ["EcoSport", "Endeavour", "Figo", "Aspire", "Fiesta"],
    "Chevrolet": ["Beat", "Cruze", "Spark", "Sail", "Tavera"],
    "Jeep": ["Compass", "Meridian", "Wrangler"],
    "Other": ["Custom"]
  };

  // Flatten inventory series into rows for Google Sheets
  const flattenInventory = (series: InventorySeries[]) => {
    const rows: any[][] = [];
    series.forEach(s => {
      s.items.forEach(item => {
        rows.push([
          s.id, s.name, s.vendor, s.purchaseRate, s.purchaseDate,
          item.id, item.mark, item.rawId || '', item.status, 
          item.usedInJobId || '', item.usedAt || ''
        ]);
      });
    });
    return rows;
  };

  // Reconstruct inventory series from spreadsheet rows
  const unflattenInventory = (rows: any[][]) => {
    const seriesMap: Record<string, InventorySeries> = {};
    rows.forEach(row => {
      const sId = row[0];
      if (!seriesMap[sId]) {
        seriesMap[sId] = {
          id: sId,
          name: row[1],
          vendor: row[2],
          purchaseRate: Number(row[3]) || 0,
          purchaseDate: row[4],
          createdAt: Number(sId) || Date.now(),
          items: [],
          isExhausted: false
        };
      }
      seriesMap[sId].items.push({
        id: row[5],
        mark: row[6],
        rawId: row[7],
        status: row[8] as any,
        usedInJobId: row[9] || undefined,
        usedAt: Number(row[10]) || undefined
      });
    });

    return Object.values(seriesMap).map(s => ({
      ...s,
      isExhausted: s.items.length > 0 && s.items.every(i => i.status === "Used")
    })).sort((a, b) => b.createdAt - a.createdAt);
  };

  // Load from Cloud on mount
  useEffect(() => {
    // We strictly use cloud pull on mount. No more localStorage as primary.
    pullFromCloud("").finally(() => {
      setIsInitialized(true);
      setCloudLoaded(true);
    });
  }, []);

  // Cloud Sync Logic
  const syncToCloud = async () => {
    try {
      if (!cloudLoaded) return; 

      setIsSyncing(true);
      const dataToSync = {
        serviceTypes, consentTypes, particulars, subCategories, partners,
        estimateTerms, invoiceTerms, shopProfile,
        catalogCategories, partnerPin
      };

      // 1. Sync Settings Blob
      await fetch('/api/google/sync-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToSync })
      });

      // 2. Sync Stock (Flattened)
      const stockRows = flattenInventory(inventorySeries);
      await fetch('/api/google/sync-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: stockRows })
      });

      setLastSyncTime(new Date());
      setIsSyncing(false);
      console.log("Settings & Stock synced to cloud");
    } catch (err) {
      console.error("Cloud sync failed:", err);
      setIsSyncing(false);
    }
  };

  const pullFromCloud = async (spreadsheetId?: string) => {
    try {
      const sidParam = spreadsheetId ? `?spreadsheetId=${spreadsheetId}` : '';
      
      // 1. Pull Settings
      const settingsRes = await fetch(`/api/google/sync-settings${sidParam}`);
      const { data } = await settingsRes.json();
      if (data) {
        if (data.serviceTypes) setServiceTypes(data.serviceTypes);
        if (data.particulars) setParticulars(data.particulars);
        if (data.catalogCategories) setCatalogCategories(data.catalogCategories);
        if (data.shopProfile) setShopProfile(data.shopProfile);
        if (data.partners) setPartners(data.partners);
        if (data.subCategories) setSubCategories(data.subCategories);
        if (data.partnerPin) setPartnerPin(data.partnerPin);
        if (data.estimateTerms) setEstimateTerms(data.estimateTerms);
        if (data.invoiceTerms) setInvoiceTerms(data.invoiceTerms);
      }

      // 2. Pull Stock
      const stockRes = await fetch(`/api/google/sync-stock${sidParam}`);
      const { data: stockData } = await stockRes.json();
      if (stockData && Array.isArray(stockData)) {
        setInventorySeries(unflattenInventory(stockData));
      }

      return true;
    } catch (err) {
      console.error("Cloud pull failed:", err);
    }
    return false;
  };

  // Trigger auto-sync on any change (debounced)
  useEffect(() => {
    if (!isInitialized || !cloudLoaded) return;
    const timer = setTimeout(() => {
      syncToCloud();
    }, 2000); 
    return () => clearTimeout(timer);
  }, [
    serviceTypes, particulars, inventorySeries, catalogCategories, 
    shopProfile, partners, subCategories, partnerPin, isInitialized, cloudLoaded
  ]);

  const addServiceType = (type: string) => setServiceTypes(prev => [...new Set([...prev, type.toUpperCase()])]);
  const removeServiceType = (type: string) => setServiceTypes(prev => prev.filter(t => t !== type));

  const addConsentType = (type: string) => setConsentTypes(prev => [...new Set([...prev, type])]);
  const removeConsentType = (type: string) => setConsentTypes(prev => prev.filter(t => t !== type));

  const addParticular = (name: string, cost: number, partnerPrice: number, expense: number, isQuickService: boolean, category: string) => {
    setParticulars(prev => [...prev, { id: Date.now().toString(), name, cost, partnerPrice, expense, isQuickService, category }]);
  };

  const updateParticular = (id: string, updates: Partial<ParticularItem>) => {
    setParticulars(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeParticular = (id: string) => setParticulars(prev => prev.filter(p => p.id !== id));

  const addSubCategory = (name: string) => {
    setSubCategories(prev => [...prev, { id: Date.now().toString(), name }]);
  };
  const removeSubCategory = (id: string) => {
    setSubCategories(prev => prev.filter(sc => sc.id !== id));
  };

  const addCatalogCategory = (name: string) => {
    setCatalogCategories(prev => [...prev, { name, showInPOS: true }]);
  };

  const toggleCatalogCategoryPOS = (name: string) => {
    setCatalogCategories(prev => prev.map(c => 
      c.name === name ? { ...c, showInPOS: !c.showInPOS } : c
    ));
  };

  const removeCatalogCategory = (name: string) => {
    setCatalogCategories(prev => prev.filter(c => c.name !== name));
    // Automatically reassign items in this category to "Others" to maintain sync
    setParticulars(prev => prev.map(p => p.category === name ? { ...p, category: "Others" } : p));
  };
  const resetParticularsToDefault = () => {
    setParticulars(DEFAULT_PARTICULARS);
    setSubCategories(DEFAULT_SUB_CATEGORIES);
  };

  const restoreRecommendedDefaults = () => {
    setServiceTypes(RECOMMENDED_SERVICE_TYPES);
    setSubCategories(DEFAULT_SUB_CATEGORIES);
    setCatalogCategories(RECOMMENDED_CATALOG_CATEGORIES.map(c => ({ name: c, showInPOS: true })));
    // Note: We don't reset particulars (catalog items) as they contain user data, 
    // but these navigation lists are safe to reset for terminology alignment.
  };

  const addPartner = (name: string) => {
    setPartners(prev => [...prev, { id: Date.now().toString(), name }]);
  };
  const removePartner = (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
  };

  const updatePartnerPin = (pin: string) => {
    setPartnerPin(pin);
  };

  const updateEstimateTerms = (terms: string) => setEstimateTerms(terms);
  const updateInvoiceTerms = (terms: string) => setInvoiceTerms(terms);

  const updateShopProfile = (profile: Partial<SettingsContextType["shopProfile"]>) => {
    setShopProfile(prev => ({ ...prev, ...profile }));
  };

  const addInventorySeries = (name: string, vendor: string, rate: number, date: string, marks: string[], quantity?: number, type: "series" | "non-series" = "series") => {
    const newSeries: InventorySeries = {
      id: Date.now().toString(),
      name,
      vendor,
      purchaseRate: rate,
      purchaseDate: date,
      totalQuantity: quantity || marks.length,
      createdAt: Date.now(),
      isExhausted: false,
      type,
      items: marks.map((mark, idx) => ({
        id: `${Date.now()}-${idx}`,
        mark,
        status: "Available"
      }))
    };
    setInventorySeries(prev => [newSeries, ...prev]);
  };

  const updateInventoryItem = (seriesId: string, itemId: string, rawId: string) => {
    setInventorySeries(prev => prev.map(s => {
      if (s.id !== seriesId) return s;
      return {
        ...s,
        items: s.items.map(item => item.id === itemId ? { ...item, rawId } : item)
      };
    }));
  };

  const consumeInventoryItem = (itemId: string, jobId: string) => {
    setInventorySeries(prev => prev.map(s => {
      const hasItem = s.items.some(i => i.id === itemId);
      if (!hasItem) return s;
      
      const updatedItems = s.items.map(item => 
        item.id === itemId ? { ...item, status: "Used" as const, usedInJobId: jobId, usedAt: Date.now() } : item
      );
      
      const allUsed = updatedItems.every(i => i.status === "Used");
      return { ...s, items: updatedItems, isExhausted: allUsed };
    }));
  };
  
  const releaseInventoryItem = (jobId: string) => {
    setInventorySeries(prev => prev.map(s => {
      const updatedItems = s.items.map(item => 
        item.usedInJobId === jobId ? { ...item, status: "Available" as const, usedInJobId: undefined, usedAt: undefined } : item
      );
      const allUsed = updatedItems.every(i => i.status === "Used");
      return { ...s, items: updatedItems, isExhausted: allUsed && updatedItems.length > 0 };
    }));
  };

  const consumeByProductName = (productName: string, jobId: string) => {
    let consumedItem = null;
    
    // Find first available item across all series with matching name
    for (const series of inventorySeries) {
      if (series.name.toLowerCase() === productName.toLowerCase()) {
        const availableItem = series.items.find(item => item.status === "Available");
        if (availableItem) {
          consumeInventoryItem(availableItem.id, jobId);
          consumedItem = { itemId: availableItem.id, mark: availableItem.mark };
          break;
        }
      }
    }
    return consumedItem;
  };

  const removeInventorySeries = (id: string) => {
    setInventorySeries(prev => prev.filter(s => s.id !== id));
  };

  return (
    <SettingsContext.Provider value={{
      serviceTypes, consentTypes, particulars, subCategories, partners,
      carBrands, carModels,
      estimateTerms, invoiceTerms, shopProfile,
      inventorySeries,
      addServiceType, removeServiceType,
      addConsentType, removeConsentType,
      addParticular, updateParticular, removeParticular,
      addSubCategory, removeSubCategory,
      addPartner, removePartner,
      updateEstimateTerms, updateInvoiceTerms, updateShopProfile,
      addInventorySeries, updateInventoryItem, consumeInventoryItem, removeInventorySeries,
      partnerPin, updatePartnerPin,
      resetParticularsToDefault,
      catalogCategories,
      addCatalogCategory,
      toggleCatalogCategoryPOS,
      removeCatalogCategory,
      restoreRecommendedDefaults,
      releaseInventoryItem,
      consumeByProductName,
      isSyncing,
      lastSyncTime
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
