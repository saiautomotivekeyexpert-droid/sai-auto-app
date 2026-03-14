"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ParticularItem {
  id: string;
  name: string;
  cost: number;
  expense: number;
}

interface SubCategoryItem {
  id: string;
  name: string;
}

interface SettingsContextType {
  serviceTypes: string[];
  consentTypes: string[];
  particulars: ParticularItem[];
  subCategories: SubCategoryItem[];
  partners: string[];
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
  addServiceType: (type: string) => void;
  removeServiceType: (type: string) => void;
  addConsentType: (type: string) => void;
  removeConsentType: (type: string) => void;
  addParticular: (name: string, cost: number, expense: number) => void;
  removeParticular: (id: string) => void;
  addSubCategory: (name: string) => void;
  removeSubCategory: (id: string) => void;
  addPartner: (name: string) => void;
  removePartner: (name: string) => void;
  updateEstimateTerms: (terms: string) => void;
  updateInvoiceTerms: (terms: string) => void;
  updateShopProfile: (profile: Partial<SettingsContextType["shopProfile"]>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [serviceTypes, setServiceTypes] = useState<string[]>(["Add Key", "All Keys Lost", "Remote Programming"]);
  const [consentTypes, setConsentTypes] = useState<string[]>(["OWNER", "DRIVER", "PARTNER", "OTHER"]);
  const [partners, setPartners] = useState<string[]>(["RAVI AUTO", "SWADI AUTOMOBILE", "RAJAN LOCK"]);
  const [particulars, setParticulars] = useState<ParticularItem[]>([
    { id: "1", name: "Key Blade", cost: 500, expense: 150 },
    { id: "2", name: "Remote Board", cost: 1500, expense: 600 },
    { id: "3", name: "Battery", cost: 200, expense: 50 },
    { id: "4", name: "Transponder Chip", cost: 800, expense: 200 },
    { id: "5", name: "Key Shell/Casing", cost: 400, expense: 100 }
  ]);
  const [subCategories, setSubCategories] = useState<SubCategoryItem[]>([
    { id: "sc1", name: "Remote Key" },
    { id: "sc2", name: "Manual Key" },
    { id: "sc3", name: "Smart Key" },
    { id: "sc4", name: "Blade Key" },
  ]);
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

  // Load from localStorage on mount
  useEffect(() => {
    const savedServices = localStorage.getItem("serviceTypes");
    const savedConsent = localStorage.getItem("consentTypes");
    const savedParticulars = localStorage.getItem("particulars");
    const savedSubCategories = localStorage.getItem("subCategories");
    const savedEstTerms = localStorage.getItem("estimateTerms");
    const savedInvTerms = localStorage.getItem("invoiceTerms");
    const savedProfile = localStorage.getItem("shopProfile");

    if (savedServices) setServiceTypes(JSON.parse(savedServices));
    if (savedConsent) {
      const parsed = JSON.parse(savedConsent);
      const normalized = parsed.map((c: string) => {
        if (typeof c !== 'string') return c;
        let val = c.toUpperCase().trim();
        const oldTrusted = ["MECHANIC", "GARAGE", "DEALER", "ASSOCIATED TRAVELS", "KEY MAKER", "PERSONAL SELF", "TRANSPORT", "PERSONALSELF"];
        if (oldTrusted.includes(val)) return "PARTNER";
        return val;
      });
      const unique = Array.from(new Set(normalized)) as string[];
      // Keep only our core UI types
      const coreTypes = ["OWNER", "DRIVER", "PARTNER", "OTHER"];
      setConsentTypes(coreTypes.filter(t => unique.includes(t) || t === "OWNER" || t === "OTHER"));
    }
    const savedPartners = localStorage.getItem("partners");
    if (savedPartners) setPartners(JSON.parse(savedPartners));
    if (savedSubCategories) setSubCategories(JSON.parse(savedSubCategories));
    if (savedEstTerms) setEstimateTerms(savedEstTerms);
    if (savedInvTerms) setInvoiceTerms(savedInvTerms);
    if (savedProfile) setShopProfile(JSON.parse(savedProfile));
    
    if (savedParticulars) {
      const parsed = JSON.parse(savedParticulars);
      const migrated = parsed.map((item: any, index: number) => {
        if (typeof item === 'string') {
          return { id: `migrated-${index}`, name: item, cost: 0, expense: 0 };
        }
        return { expense: 0, ...item }; // Ensure expense exists
      });
      setParticulars(migrated);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => { localStorage.setItem("serviceTypes", JSON.stringify(serviceTypes)); }, [serviceTypes]);
  useEffect(() => { localStorage.setItem("consentTypes", JSON.stringify(consentTypes)); }, [consentTypes]);
  useEffect(() => { localStorage.setItem("partners", JSON.stringify(partners)); }, [partners]);
  useEffect(() => { localStorage.setItem("particulars", JSON.stringify(particulars)); }, [particulars]);
  useEffect(() => { localStorage.setItem("subCategories", JSON.stringify(subCategories)); }, [subCategories]);
  useEffect(() => { localStorage.setItem("estimateTerms", estimateTerms); }, [estimateTerms]);
  useEffect(() => { localStorage.setItem("invoiceTerms", invoiceTerms); }, [invoiceTerms]);
  useEffect(() => { localStorage.setItem("shopProfile", JSON.stringify(shopProfile)); }, [shopProfile]);

  const addServiceType = (type: string) => setServiceTypes(prev => [...new Set([...prev, type])]);
  const removeServiceType = (type: string) => setServiceTypes(prev => prev.filter(t => t !== type));

  const addConsentType = (type: string) => setConsentTypes(prev => [...new Set([...prev, type])]);
  const removeConsentType = (type: string) => setConsentTypes(prev => prev.filter(t => t !== type));

  const addParticular = (name: string, cost: number, expense: number) => {
    setParticulars(prev => [...prev, { id: Date.now().toString(), name, cost, expense }]);
  };
  const removeParticular = (id: string) => setParticulars(prev => prev.filter(p => p.id !== id));

  const addSubCategory = (name: string) => {
    setSubCategories(prev => [...prev, { id: Date.now().toString(), name }]);
  };
  const removeSubCategory = (id: string) => setSubCategories(prev => prev.filter(s => s.id !== id));

  const addPartner = (name: string) => {
    const caps = name.toUpperCase().trim();
    if (caps && !partners.includes(caps)) setPartners(prev => [...prev, caps]);
  };
  const removePartner = (name: string) => setPartners(prev => prev.filter(p => p !== name));

  const updateEstimateTerms = (terms: string) => setEstimateTerms(terms);
  const updateInvoiceTerms = (terms: string) => setInvoiceTerms(terms);

  const updateShopProfile = (profile: Partial<SettingsContextType["shopProfile"]>) => {
    setShopProfile(prev => ({ ...prev, ...profile }));
  };

  return (
    <SettingsContext.Provider value={{
      serviceTypes, consentTypes, particulars, subCategories, partners,
      carBrands, carModels,
      estimateTerms, invoiceTerms, shopProfile,
      addServiceType, removeServiceType,
      addConsentType, removeConsentType,
      addParticular, removeParticular,
      addSubCategory, removeSubCategory,
      addPartner, removePartner,
      updateEstimateTerms, updateInvoiceTerms, updateShopProfile
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
