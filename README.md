# HealthAI Frontend — Chronic Care Management Ecosystem

[![Turborepo](https://img.shields.io/badge/monorepo-Turborepo-0284c7?logo=turborepo)](https://turbo.build/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646cff?logo=vite)](https://vitejs.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo)](https://expo.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-f69220?logo=pnpm)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)

A multi-platform frontend monorepo for the **HealthAI** remote chronic care platform, integrating vital metric tracking, structured care programs, online consultations (WebRTC video & live chat), and clinical guardrailed medical AI assistance.

---

## 🏛️ Monorepo Architecture

This project is built and optimized as a high-performance monorepo using **Turborepo** and **pnpm Workspaces**:

### 📱 Applications (`apps/`)

| Application | Tech Stack | Default Port | Description |
| :--- | :--- | :--- | :--- |
| **`web-client`** | Vite 7, React 19, Tailwind CSS v4, shadcn/ui | `http://localhost:5173` | Interactive web portal for Patients and Doctors (metrics tracking, live chat, video consultations, appointment management). |
| **`web-admin`** | Vite 7, React 19, Tailwind CSS v4, Chart.js | `http://localhost:5174` | Administrative portal for hospital/clinic management (doctor verification, plan management, care rule configuration, revenue statistics). |
| **`mobile`** | Expo SDK 57, React Native 0.86, Expo Router | Metro `8081` | Cross-platform mobile app (Android & iOS) for Patients and Doctors, providing continuous tracking, biometric updates, and push notifications. |

### 📦 Shared Packages (`packages/`)

- **`@healthcare/api-client`**: Standardized HTTP API client and SDK for interacting with the NestJS backend.
- **`@repo/realtime-contracts`**: Shared Socket.IO event declarations, message schemas, and real-time event payloads.
- **`@repo/shared-hooks`**: Reusable custom React hooks (`useAuthStore`, notifications, theme, socket bindings).
- **`@repo/shared-types`**: Shared TypeScript domain models, interfaces, DTOs, and enums synchronized across web and mobile.
- **`@repo/ui`**: Unified design system and reusable component library for web applications.
- **`@repo/typescript-config`**: Shared base `tsconfig.json` configurations.
- **`@repo/eslint-config`**: Standardized ESLint rules across the monorepo.

---

## ✨ Key Features (DA2 Scope)

- 🫀 **Chronic Care Programs:** Dual-program support (Hypertension & Diabetes), onboarding surveys (Baseline Assessment), daily task schedules (Today's Tasks), and adherence tracking.
- 📊 **Health Metrics & Trend Reports:** Seamless logging for Blood Pressure, Blood Glucose, and Heart Rate; 7/30/90-day interactive charts, and clinical alert detection (Care Alerts).
- 🤖 **Guardrailed Medical AI Assistant:** 24/7 conversational health inquiries and automated biometric trend summaries with safety guardrails against clinical hallucinations.
- 📹 **Telehealth & Remote Consultations:** High-definition WebRTC peer-to-peer video calling, real-time messaging, and medical attachment sharing between doctors and patients.
- 📅 **Smart Appointment & Live Queue:** Real-time queue progress tracking and seamless consultation scheduling.
- 💳 **Membership Tiers & VNPAY Payments:** Integrated VNPAY Sandbox payment gateway for plan upgrades (Free, Plus, Care) with audit-ready refund handling.
- 🌐 **Internationalization & Dark Mode:** Native bilingual support for Vietnamese & English (`i18next`), accompanied by smooth dark/light theme switching.

---

## 🚀 Getting Started & Local Development

### 1. Prerequisites
- **Node.js**: `>= 20.x` (Recommended `24.9.0` to match the backend runtime).
- **pnpm**: `>= 9.0.0` or `10.x` (`corepack enable && corepack prepare pnpm@latest --activate`).
- **Android Studio / Xcode**: Required if running the mobile application on emulators/simulators.

### 2. Install Dependencies
From the repository root:
```bash
pnpm install
```

### 3. Environment Variables Configuration
Create a `.env.local` file in the corresponding application folders:
- In `apps/web-client/.env.local`:
  ```env
  VITE_API_BASE_URL=http://localhost:3000/api/v1
  ```
- In `apps/web-admin/.env.local`:
  ```env
  VITE_API_BASE_URL=http://localhost:3000/api/v1
  ```

### 4. Running the Applications

#### Run all apps concurrently (Turborepo):
```bash
pnpm dev
```

#### Or run applications individually:
- **Web Client (Patient & Doctor Portal):**
  ```bash
  pnpm --filter client dev
  # Access at: http://localhost:5173
  ```
- **Web Admin (System Administration):**
  ```bash
  pnpm --filter admin dev
  # Access at: http://localhost:5174
  ```
- **Mobile App (Expo):**
  ```bash
  pnpm --filter mobile start
  # Or run directly on an emulator:
  pnpm --filter mobile android
  pnpm --filter mobile ios
  ```

---

## 🛡️ Quality Gates & Verification

To verify code quality and build integrity prior to committing, use the automated quality scripts:

```bash
# Build the entire monorepo
pnpm build

# Lint all packages and applications
pnpm lint

# Independent TypeScript verification per application
pnpm --filter client build
pnpm --filter admin build
pnpm --filter mobile tsc --noEmit
```

### 📋 Command Reference

| Command | Purpose |
| :--- | :--- |
| `pnpm install` | Install all dependencies across the entire monorepo |
| `pnpm dev` | Run all applications concurrently via Turborepo pipeline |
| `pnpm build` | Compile and build all applications and shared packages |
| `pnpm lint` | Execute ESLint across all projects |

---

## 👥 Authors & Contributors

Developed and maintained by:
- **Khang Do**
- **Huy Vu**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
