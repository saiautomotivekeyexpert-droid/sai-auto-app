# SAI AUTO KEY WORKS - E-KYC & Job Registry

A premium, high-fidelity web application and mobile app wrapper for car key programming and locksmithing business management. Built for security, efficiency, and professional documentation.

![App Icon](/Users/user/.gemini/antigravity/brain/1f51f642-6831-4c06-b2ee-20ff59376492/app_icon_design_1773510583382.png)

## 🏗 Architecture
This project is a **hybrid mobile application**:
- **Frontend**: Next.js (TypeScript) with Tailwind-inspired styling.
- **Mobile Wrapper**: [Capacitor](https://capacitorjs.com/) is used to wrap the static web export into a native Android project.
- **Backend/Storage**: Client-side state management with persistent `localStorage` for offline-first capability.

## 📱 Mobile APK Generation
This app is designed for **Direct APK distribution** (bypassing App Stores).

### Prerequisites
- Node.js & npm
- Android Studio (for APK building)

### Build Instructions
1.  **Build the Web Assets**:
    ```bash
    npm run build
    ```
    This generates a static `out` directory.

2.  **Sync with Android**:
    ```bash
    npx cap copy android
    ```
    This moves the web assets into the `android/` project.

3.  **Generate APK**:
    - Open the `android/` folder in **Android Studio**.
    - Go to `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
    - Once finished, click "Locate" to find your `.apk` file.

## 🛠 Features
- **Smart Job Management**: Tiered pricing, particulars tracking, and live status updates.
- **E-KYC Documentation**: Professional Estimate and Invoice PDF generation.
- **Configurable Settings**: Admins can edit Service Types, Shop Profiles, and Legal Declarations directly.
- **Business Ledger**: Real-time gross earning and net margin calculation.

## 🚀 Development
```bash
npm install
npm run dev
```

---
*Created and maintained by Sai Auto Key Works.*
