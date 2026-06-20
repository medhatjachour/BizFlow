# BizFlow Feature Implementation Plan

> **Status:** Partially outdated — written November 2025. Many Phase 1 features are now implemented (Email Reports, Barcode Scanning, Keyboard Shortcuts). Use `ARCHITECTURE.md` and `CODEBASE_MAP.md` for current state.
> **Last Updated:** November 22, 2025
> **Version:** 2.0 Roadmap

This document outlines the strategic plan for implementing new features in BizFlow. Features are prioritized by business impact, implementation complexity, and user value.

---

## 📊 Implementation Strategy

### Phase Categorization

| Phase | Timeline | Focus | Features |
|-------|----------|-------|----------|
| **Phase 1** | Weeks 1-3 | Quick Wins & Foundation | 4 features |
| **Phase 2** | Weeks 4-7 | Core Business Logic | 5 features |
| **Phase 3** | Weeks 8-11 | Advanced Analytics | 4 features |
| **Phase 4** | Weeks 12-16 | Integrations & Mobile | 4 features |

### Priority Matrix

```
High Impact, Low Effort (DO FIRST) │ High Impact, High Effort (PLAN CAREFULLY)
─────────────────────────────────────┼──────────────────────────────────────────
• Daily Email Reports               │ • Smart Reorder Alerts
• Barcode Scanner                   │ • Cashier Performance Analytics
• Profit Margin Display             │ • Multi-Store Sync
• Keyboard Shortcuts                │ • Customer Predictions & Marketing
─────────────────────────────────────┼──────────────────────────────────────────
Low Impact, Low Effort (FILL TIME) │ Low Impact, High Effort (AVOID)
• Dark mode improvements            │ • Complex AI features
• Quick actions panel               │ • Enterprise integrations
```

---

## 🎯 Phase 1: Quick Wins & Foundation (Weeks 1-3)

**Goal:** Deliver immediate value with minimal complexity. Build foundation for advanced features.

### 1.1 Daily Email Reports (Week 1)
**Priority:** 🔥 HIGH  
**Complexity:** 🟢 Low  
**Impact:** Keeps owners informed without app access

#### Database Changes
```prisma
// prisma/schema.prisma
model EmailReport {
  id          String   @id @default(uuid())
  userId      String
  email       String
  frequency   String   @default("daily") // daily, weekly, monthly
  enabled     Boolean  @default(true)
  lastSent    DateTime?
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId, enabled])
}
```

#### Implementation Tasks
- [ ] Create email report settings in Settings page
- [ ] Build email template with HTML/CSS
- [ ] Implement Nodemailer integration
- [ ] Create scheduled task (node-cron) for daily sending at 11 PM
- [ ] Add IPC handlers: `email:configure`, `email:testSend`
- [ ] Create service: `EmailReportService.ts`
- [ ] Add report preview in UI

#### Files to Create/Modify
```
src/main/services/EmailReportService.ts          [NEW]
src/main/ipc/handlers/email.handlers.ts          [NEW]
src/renderer/src/pages/Settings/EmailSettings.tsx [NEW]
package.json                                      [MODIFY] Add nodemailer
```

#### Testing Checklist
- [ ] Report generates with correct data
- [ ] Email sends successfully
- [ ] Scheduling works at 11 PM
- [ ] User can preview before enabling
- [ ] Unsubscribe link works

---

### 1.2 Barcode Scanner Integration (Week 1-2)
**Priority:** 🔥 HIGH  
**Complexity:** 🟡 Medium  
**Impact:** Speeds up POS checkout 3-5x

#### Dependencies
```json
{
  "quagga": "^0.12.1",           // Barcode scanning
  "react-webcam": "^7.1.1"       // Camera access
}
```

#### Implementation Tasks
- [ ] Install Quagga.js for barcode scanning
- [ ] Create `BarcodeScanner` component with webcam
- [ ] Add barcode field to product form
- [ ] Generate barcodes for existing products (Code128)
- [ ] Add "Scan" button in POS interface
- [ ] Implement keyboard input for USB barcode scanners
- [ ] Create barcode lookup IPC handler

#### Files to Create/Modify
```
src/renderer/src/components/BarcodeScanner.tsx   [NEW]
src/renderer/src/pages/POS/index.tsx             [MODIFY]
src/renderer/src/pages/Products/ProductForm.tsx  [MODIFY]
src/main/ipc/handlers/product.handlers.ts        [MODIFY] Add barcode lookup
```

#### UI Flow
```
POS Page → Click "Scan" → Camera Opens → Scan Barcode → 
Product Found → Add to Cart → Close Camera
```

#### Testing Checklist
- [ ] Camera permission requested
- [ ] Barcode scans successfully
- [ ] Product added to cart automatically
- [ ] Handles invalid/unknown barcodes
- [ ] Works with USB barcode scanners
- [ ] Mobile camera support

---

### 1.3 Profit Margin Display (Week 2)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟢 Low  
**Impact:** Helps owners understand profitability

#### Implementation Tasks
- [ ] Calculate profit per sale item: `profit = sellingPrice - cost`
- [ ] Display profit margin % in POS checkout
- [ ] Add profit column to Sales page
- [ ] Create profit summary in Dashboard
- [ ] Add profit filtering/sorting in reports

#### Files to Create/Modify
```
src/renderer/src/pages/POS/components/Cart.tsx         [MODIFY]
src/renderer/src/pages/Sales.tsx                       [MODIFY]
src/renderer/src/pages/Dashboard.tsx                   [MODIFY]
src/renderer/src/utils/calculations.ts                 [NEW]
```

#### Calculation Logic
```typescript
// utils/calculations.ts
export const calculateProfit = (sellingPrice: number, cost: number, quantity: number = 1) => {
  const profit = (sellingPrice - cost) * quantity
  const margin = ((sellingPrice - cost) / sellingPrice) * 100
  return { profit, margin }
}

export const calculateSaleProfit = (items: SaleItem[]) => {
  return items.reduce((total, item) => {
    const { profit } = calculateProfit(item.price, item.product.baseCost, item.quantity)
    return total + profit
  }, 0)
}
```

#### UI Components
```tsx
// Display in POS Cart
<div className="flex justify-between text-sm">
  <span>Profit:</span>
  <span className="text-green-600 font-semibold">
    ${profit.toFixed(2)} ({margin.toFixed(1)}%)
  </span>
</div>
```

---

### 1.4 Keyboard Shortcuts (Week 3)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟢 Low  
**Impact:** Power users become 2x faster

#### Shortcuts Map
```typescript
interface ShortcutMap {
  'ctrl+n': () => void          // New product
  'ctrl+f': () => void          // Global search
  'ctrl+p': () => void          // Print receipt
  'ctrl+s': () => void          // Save form
  'ctrl+k': () => void          // Command palette
  'f2': () => void              // Go to POS
  'f3': () => void              // Go to Products
  'f4': () => void              // Go to Sales
  'esc': () => void             // Close modal/cancel
}
```

#### Implementation Tasks
- [ ] Install `react-hotkeys-hook` or create custom hook
- [ ] Create `useKeyboardShortcuts` hook
- [ ] Add shortcuts to all pages
- [ ] Create keyboard shortcuts help modal (`Ctrl+/`)
- [ ] Add visual indicators (tooltips showing shortcuts)

#### Files to Create/Modify
```
src/renderer/src/hooks/useKeyboardShortcuts.ts   [NEW]
src/renderer/src/components/ShortcutsHelp.tsx    [NEW]
src/renderer/src/App.tsx                         [MODIFY]
```

#### Example Implementation
```typescript
// hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        // Open command palette
      }
      if (e.key === 'F2') {
        e.preventDefault()
        navigate('/pos')
      }
      // ... more shortcuts
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [navigate])
}
```

---

## 🚀 Phase 2: Core Business Logic (Weeks 4-7)

**Goal:** Implement features that solve critical business problems.

### 2.1 Smart Reorder Alerts System (Week 4-5)
**Priority:** 🔥 CRITICAL  
**Complexity:** 🔴 High  
**Impact:** Prevents stockouts, optimizes cash flow

#### Database Schema
```prisma
// prisma/schema.prisma
model Supplier {
  id            String   @id @default(uuid())
  name          String
  email         String?
  phone         String
  leadTimeDays  Int      @default(7)   // Days to deliver
  minOrderValue Float    @default(0)   // Minimum order amount
  products      ProductSupplier[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model ProductSupplier {
  id          String   @id @default(uuid())
  productId   String
  supplierId  String
  cost        Float
  sku         String?  // Supplier's SKU
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier    Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([productId, supplierId])
  @@index([productId])
  @@index([supplierId])
}

model ReorderAlert {
  id              String   @id @default(uuid())
  productId       String
  currentStock    Int
  reorderPoint    Int
  suggestedQty    Int
  status          String   @default("pending") // pending, ordered, dismissed
  priority        String   // high, medium, low
  estimatedCost   Float
  product         Product  @relation(fields: [productId], references: [id])
  createdAt       DateTime @default(now())
  dismissedAt     DateTime?
  
  @@index([status, priority])
  @@index([productId])
}

model PurchaseOrder {
  id            String   @id @default(uuid())
  supplierId    String
  orderNumber   String   @unique
  status        String   @default("draft") // draft, sent, received, cancelled
  totalAmount   Float
  notes         String?
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  items         PurchaseOrderItem[]
  orderedAt     DateTime?
  receivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([status])
  @@index([supplierId])
}

model PurchaseOrderItem {
  id              String        @id @default(uuid())
  purchaseOrderId String
  productId       String
  quantity        Int
  cost            Float         // Cost per unit
  receivedQty     Int           @default(0)
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product         Product       @relation(fields: [productId], references: [id])
  
  @@index([purchaseOrderId])
  @@index([productId])
}
```

#### Analytics Logic
```typescript
// src/main/services/ReorderAnalysisService.ts
interface ReorderAnalysis {
  productId: string
  currentStock: number
  salesVelocity: number        // Units sold per day
  leadTimeDays: number
  safetyStock: number          // Buffer stock
  reorderPoint: number         // When to reorder
  suggestedOrderQty: number    // How much to order
  priority: 'high' | 'medium' | 'low'
}

class ReorderAnalysisService {
  async analyzeProduct(productId: string): Promise<ReorderAnalysis> {
    // 1. Calculate sales velocity (last 30 days)
    const salesVelocity = await this.calculateSalesVelocity(productId, 30)
    
    // 2. Get supplier lead time
    const leadTimeDays = await this.getSupplierLeadTime(productId)
    
    // 3. Calculate safety stock (buffer for unexpected demand)
    const safetyStock = Math.ceil(salesVelocity * 7) // 1 week buffer
    
    // 4. Calculate reorder point
    const reorderPoint = Math.ceil(
      (salesVelocity * leadTimeDays) + safetyStock
    )
    
    // 5. Get current stock
    const currentStock = await this.getCurrentStock(productId)
    
    // 6. Calculate suggested order quantity
    const suggestedOrderQty = this.calculateOrderQty(
      salesVelocity,
      currentStock,
      reorderPoint
    )
    
    // 7. Determine priority
    const priority = this.determinePriority(
      currentStock,
      reorderPoint,
      salesVelocity
    )
    
    return {
      productId,
      currentStock,
      salesVelocity,
      leadTimeDays,
      safetyStock,
      reorderPoint,
      suggestedOrderQty,
      priority
    }
  }
  
  private calculateSalesVelocity(productId: string, days: number): number {
    // Query sales from last N days
    // Return average units sold per day
  }
  
  private determinePriority(
    currentStock: number,
    reorderPoint: number,
    velocity: number
  ): 'high' | 'medium' | 'low' {
    const daysUntilStockout = currentStock / velocity
    
    if (daysUntilStockout <= 3) return 'high'
    if (daysUntilStockout <= 7) return 'medium'
    return 'low'
  }
}
```

#### Implementation Tasks
- [ ] Create Supplier management page
- [ ] Add supplier relationship to products
- [ ] Build `ReorderAnalysisService`
- [ ] Create scheduled job (runs daily at 6 AM)
- [ ] Build Reorder Alerts dashboard
- [ ] Implement Purchase Order creation
- [ ] Add "Mark as Ordered" / "Dismiss" actions
- [ ] Create notification system for alerts
- [ ] Build PO receiving workflow

#### Files to Create/Modify
```
prisma/schema.prisma                                      [MODIFY]
src/main/services/ReorderAnalysisService.ts               [NEW]
src/main/ipc/handlers/supplier.handlers.ts                [NEW]
src/main/ipc/handlers/purchaseOrder.handlers.ts           [NEW]
src/renderer/src/pages/Suppliers/                         [NEW]
src/renderer/src/pages/PurchaseOrders/                    [NEW]
src/renderer/src/pages/Inventory/ReorderAlerts.tsx       [NEW]
```

#### UI Components
- Suppliers page (CRUD)
- Reorder Alerts dashboard with priority badges
- Purchase Order form
- PO receiving interface
- Notification bell icon with alert count

---

### 2.2 Cashier Performance & Theft Detection (Week 5-6)
**Priority:** 🔥 HIGH  
**Complexity:** 🔴 High  
**Impact:** Reduces theft, improves service quality

#### Database Schema
```prisma
model CashierShift {
  id                String    @id @default(uuid())
  userId            String
  startTime         DateTime
  endTime           DateTime?
  startingCash      Float     @default(0)
  endingCash        Float?
  expectedCash      Float?
  cashDifference    Float?    // endingCash - expectedCash
  totalSales        Float     @default(0)
  totalVoids        Int       @default(0)
  totalRefunds      Float     @default(0)
  totalDiscounts    Float     @default(0)
  transactionCount  Int       @default(0)
  user              User      @relation(fields: [userId], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([userId, startTime])
  @@index([startTime])
}

model VoidedTransaction {
  id            String   @id @default(uuid())
  transactionId String
  userId        String
  reason        String
  amount        Float
  user          User     @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}

model Discount {
  id            String          @id @default(uuid())
  transactionId String
  userId        String
  type          String          // percentage, fixed
  value         Float
  reason        String?
  transaction   SaleTransaction @relation(fields: [transactionId], references: [id])
  user          User            @relation(fields: [userId], references: [id])
  createdAt     DateTime        @default(now())
  
  @@index([userId])
  @@index([transactionId])
}
```

#### Analytics Implementation
```typescript
// src/main/services/CashierAnalyticsService.ts
interface CashierMetrics {
  userId: string
  userName: string
  period: { start: Date; end: Date }
  
  // Performance
  totalSales: number
  transactionCount: number
  avgTransactionValue: number
  avgTransactionTime: number  // seconds
  salesPerHour: number
  
  // Red flags
  voidCount: number
  voidPercentage: number      // % of transactions voided
  totalDiscounts: number
  avgDiscountPercentage: number
  cashShortages: number       // Number of shifts with discrepancies
  totalCashShortage: number   // Total $ missing
  
  // Comparisons
  rankAmongPeers: number      // 1st, 2nd, 3rd...
  vsAverageSales: number      // +15% or -10%
  
  // Alerts
  alerts: Array<{
    type: 'high_voids' | 'cash_shortage' | 'excessive_discounts' | 'slow_service'
    severity: 'high' | 'medium' | 'low'
    message: string
  }>
}

class CashierAnalyticsService {
  async getCashierMetrics(userId: string, days: number = 30): Promise<CashierMetrics> {
    // Gather all metrics
    // Compare to team average
    // Generate alerts if anomalies detected
  }
  
  async getTeamLeaderboard(period: 'today' | 'week' | 'month') {
    // Rank cashiers by sales, speed, accuracy
  }
  
  async detectAnomalies(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = []
    
    // Check void rate
    const voidRate = await this.getVoidRate(userId)
    if (voidRate > 5) { // More than 5% voids
      alerts.push({
        type: 'high_voids',
        severity: 'high',
        message: `${voidRate.toFixed(1)}% of transactions voided (threshold: 5%)`
      })
    }
    
    // Check discount rate
    const avgDiscount = await this.getAvgDiscountRate(userId)
    if (avgDiscount > 15) {
      alerts.push({
        type: 'excessive_discounts',
        severity: 'medium',
        message: `Average discount of ${avgDiscount.toFixed(1)}% (threshold: 15%)`
      })
    }
    
    // Check cash shortages
    const shortages = await this.getCashShortages(userId, 30)
    if (shortages.count > 3) {
      alerts.push({
        type: 'cash_shortage',
        severity: 'high',
        message: `${shortages.count} cash shortages in last 30 days ($${shortages.total.toFixed(2)} total)`
      })
    }
    
    return alerts
  }
}
```

#### Implementation Tasks
- [ ] Add shift clock-in/clock-out to POS
- [ ] Track void reasons and approvals
- [ ] Build CashierAnalyticsService
- [ ] Create Cashier Performance dashboard
- [ ] Add team leaderboard
- [ ] Implement anomaly detection alerts
- [ ] Build end-of-shift cash reconciliation
- [ ] Create manager alert notifications

#### Files to Create/Modify
```
prisma/schema.prisma                                      [MODIFY]
src/main/services/CashierAnalyticsService.ts              [NEW]
src/main/ipc/handlers/cashier.handlers.ts                 [NEW]
src/renderer/src/pages/Employees/Performance.tsx         [NEW]
src/renderer/src/pages/POS/ShiftManager.tsx               [NEW]
src/renderer/src/components/CashierLeaderboard.tsx       [NEW]
```

#### UI Components
- Clock in/out modal in POS
- Shift summary at end of day
- Performance dashboard with charts
- Leaderboard (gamification)
- Alert notifications for managers
- Cash reconciliation form

---

### 2.3 Customer Purchase Predictions & Marketing (Week 6-7)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🔴 High  
**Impact:** Increases customer retention 20-30%

#### Database Schema
```prisma
model CustomerSegment {
  id          String   @id @default(uuid())
  name        String   // VIP, At-Risk, Frequent, New, Dormant
  description String?
  criteria    String   // JSON: {minSpend: 1000, minVisits: 10}
  customers   CustomerInSegment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CustomerInSegment {
  id         String          @id @default(uuid())
  customerId String
  segmentId  String
  customer   Customer        @relation(fields: [customerId], references: [id])
  segment    CustomerSegment @relation(fields: [segmentId], references: [id])
  addedAt    DateTime        @default(now())
  
  @@unique([customerId, segmentId])
  @@index([customerId])
  @@index([segmentId])
}

model MarketingCampaign {
  id             String   @id @default(uuid())
  name           String
  type           String   // email, sms, in-app
  segmentId      String?
  subject        String
  message        String
  discountCode   String?
  discountValue  Float?
  status         String   @default("draft") // draft, scheduled, sent, completed
  scheduledFor   DateTime?
  sentAt         DateTime?
  recipientCount Int      @default(0)
  openCount      Int      @default(0)
  clickCount     Int      @default(0)
  conversionCount Int     @default(0)
  segment        CustomerSegment? @relation(fields: [segmentId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  @@index([status])
  @@index([segmentId])
}

model CustomerPrediction {
  id                  String   @id @default(uuid())
  customerId          String
  nextPurchaseDate    DateTime
  confidence          Float    // 0-1 probability
  suggestedProducts   String   // JSON array of product IDs
  churnRisk           Float    // 0-1 probability of not returning
  lifetimeValueEst    Float
  customer            Customer @relation(fields: [customerId], references: [id])
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([customerId])
  @@index([nextPurchaseDate])
  @@index([churnRisk])
}
```

#### Prediction Algorithm
```typescript
// src/main/services/CustomerPredictionService.ts
interface CustomerBehavior {
  avgDaysBetweenPurchases: number
  lastPurchaseDate: Date
  purchaseFrequency: number
  avgOrderValue: number
  totalSpent: number
  favoriteCategory: string
  churnRisk: number
}

class CustomerPredictionService {
  async predictNextPurchase(customerId: string): Promise<CustomerPrediction> {
    // 1. Get purchase history
    const purchases = await this.getPurchaseHistory(customerId)
    
    // 2. Calculate average days between purchases
    const avgGap = this.calculateAvgGap(purchases)
    
    // 3. Predict next purchase date
    const lastPurchase = purchases[0].createdAt
    const nextPurchaseDate = new Date(lastPurchase)
    nextPurchaseDate.setDate(nextPurchaseDate.getDate() + avgGap)
    
    // 4. Calculate confidence
    const confidence = this.calculateConfidence(purchases)
    
    // 5. Calculate churn risk
    const daysSinceLastPurchase = this.getDaysSince(lastPurchase)
    const churnRisk = daysSinceLastPurchase > (avgGap * 1.5) ? 
      Math.min((daysSinceLastPurchase / avgGap) / 2, 0.95) : 0.2
    
    // 6. Suggest products (frequently bought items)
    const suggestedProducts = await this.getSuggestedProducts(customerId)
    
    return {
      customerId,
      nextPurchaseDate,
      confidence,
      suggestedProducts,
      churnRisk,
      lifetimeValueEst: this.estimateLTV(purchases)
    }
  }
  
  async segmentCustomers(): Promise<void> {
    // VIP: Top 20% by revenue
    const vips = await this.getTopCustomers(0.2)
    
    // At-Risk: Haven't purchased in 2x their avg gap
    const atRisk = await this.getAtRiskCustomers()
    
    // Frequent: 10+ purchases
    const frequent = await this.getFrequentBuyers()
    
    // New: First purchase < 30 days ago
    const newCustomers = await this.getNewCustomers(30)
    
    // Dormant: No purchase in 90+ days
    const dormant = await this.getDormantCustomers(90)
    
    // Update segments
    await this.updateSegments({ vips, atRisk, frequent, newCustomers, dormant })
  }
}
```

#### Implementation Tasks
- [ ] Build CustomerPredictionService
- [ ] Create scheduled job for daily predictions
- [ ] Implement customer segmentation logic
- [ ] Build marketing campaign creator
- [ ] Integrate email service (Nodemailer/SendGrid)
- [ ] Integrate SMS service (Twilio)
- [ ] Create campaign tracking system
- [ ] Build customer insights dashboard
- [ ] Add "At Risk" customer alerts

#### Files to Create/Modify
```
prisma/schema.prisma                                      [MODIFY]
src/main/services/CustomerPredictionService.ts            [NEW]
src/main/services/MarketingService.ts                     [NEW]
src/main/ipc/handlers/marketing.handlers.ts               [NEW]
src/renderer/src/pages/Customers/Segments.tsx             [NEW]
src/renderer/src/pages/Marketing/                         [NEW]
```

#### UI Components
- Customer segments dashboard
- Campaign creator with templates
- Customer insights (churn risk, LTV)
- "Win-back" campaign suggestions
- Campaign performance metrics

---

### 2.4 Expense Photo Capture & OCR (Week 7)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟡 Medium  
**Impact:** Simplifies bookkeeping, tax prep

#### Dependencies
```json
{
  "tesseract.js": "^5.0.0",      // OCR
  "sharp": "^0.33.0"              // Image processing
}
```

#### Database Schema
```prisma
model Expense {
  id          String   @id @default(uuid())
  amount      Float
  category    String   // Rent, Utilities, Supplies, etc.
  vendor      String
  description String?
  receiptImage String? // Base64 or file path
  date        DateTime
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([category])
  @@index([date])
  @@index([userId])
}

model ExpenseCategory {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  taxDeductible Boolean @default(true)
  createdAt   DateTime @default(now())
}
```

#### OCR Implementation
```typescript
// src/main/services/OCRService.ts
import Tesseract from 'tesseract.js'

interface OCRResult {
  vendor?: string
  amount?: number
  date?: Date
  confidence: number
}

class OCRService {
  async processReceipt(imagePath: string): Promise<OCRResult> {
    // 1. Recognize text from image
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng')
    
    // 2. Extract amount (look for $ or currency symbols)
    const amountMatch = text.match(/\$?\s*(\d+\.?\d{0,2})/)
    const amount = amountMatch ? parseFloat(amountMatch[1]) : undefined
    
    // 3. Extract date (various formats)
    const dateMatch = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/)
    const date = dateMatch ? new Date(dateMatch[1]) : undefined
    
    // 4. Extract vendor (usually at top of receipt)
    const lines = text.split('\n').filter(l => l.trim())
    const vendor = lines[0]?.substring(0, 50)
    
    return {
      vendor,
      amount,
      date,
      confidence: 0.8 // Simplified
    }
  }
}
```

#### Implementation Tasks
- [ ] Install Tesseract.js
- [ ] Create expense categories
- [ ] Build OCR processing service
- [ ] Create expense form with camera capture
- [ ] Add image preview and editing
- [ ] Implement manual corrections
- [ ] Build expense reports page
- [ ] Add tax report generation

#### Files to Create/Modify
```
src/main/services/OCRService.ts                          [NEW]
src/main/ipc/handlers/expense.handlers.ts                [NEW]
src/renderer/src/pages/Finance/Expenses.tsx              [NEW]
src/renderer/src/components/ReceiptCapture.tsx           [NEW]
```

---

### 2.5 Role-Based Access Control (RBAC) (Week 7)
**Priority:** 🔥 HIGH  
**Complexity:** 🟡 Medium  
**Impact:** Security, multi-user support

#### Database Schema
```prisma
model Permission {
  id          String   @id @default(uuid())
  name        String   @unique // users:read, products:write, reports:delete
  description String?
  roles       RolePermission[]
  createdAt   DateTime @default(now())
}

model Role {
  id          String   @id @default(uuid())
  name        String   @unique // Owner, Manager, Cashier, Stock Clerk
  description String?
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model RolePermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}

// Modify User model
model User {
  // ... existing fields
  roleId      String?
  role        Role?    @relation(fields: [roleId], references: [id])
}
```

#### Permission System
```typescript
// src/main/middleware/permissions.ts
const PERMISSIONS = {
  // Products
  'products:read': 'View products',
  'products:write': 'Create/edit products',
  'products:delete': 'Delete products',
  
  // Sales
  'sales:create': 'Process sales',
  'sales:read': 'View sales history',
  'sales:void': 'Void transactions',
  'sales:refund': 'Issue refunds',
  
  // Reports
  'reports:view': 'View reports',
  'reports:export': 'Export reports',
  
  // Finance
  'finance:read': 'View financial data',
  'finance:write': 'Manage expenses',
  
  // Employees
  'employees:read': 'View employees',
  'employees:write': 'Manage employees',
  'employees:payroll': 'Access salary info',
  
  // Settings
  'settings:read': 'View settings',
  'settings:write': 'Change settings',
  
  // Users
  'users:read': 'View users',
  'users:write': 'Manage users',
}

const ROLES = {
  Owner: [/* ALL PERMISSIONS */],
  Manager: [
    'products:read', 'products:write',
    'sales:create', 'sales:read', 'sales:void',
    'reports:view', 'reports:export',
    'employees:read', 'employees:write',
    'finance:read'
  ],
  Cashier: [
    'products:read',
    'sales:create', 'sales:read',
  ],
  StockClerk: [
    'products:read', 'products:write',
  ]
}
```

#### Implementation Tasks
- [ ] Create permissions and roles tables
- [ ] Seed default roles and permissions
- [ ] Build authorization middleware
- [ ] Update all IPC handlers with permission checks
- [ ] Add UI permission guards
- [ ] Create role management page
- [ ] Build permission assignment UI
- [ ] Add audit log for permission changes

#### Files to Create/Modify
```
prisma/schema.prisma                                      [MODIFY]
src/main/middleware/permissions.ts                        [NEW]
src/main/ipc/handlers/*.handlers.ts                       [MODIFY ALL]
src/renderer/src/pages/Settings/Roles.tsx                 [NEW]
src/renderer/src/components/PermissionGuard.tsx           [NEW]
```

---

## 📈 Phase 3: Advanced Analytics (Weeks 8-11)

### 3.1 Multi-Store Inventory Sync (Week 8-9)
**Priority:** 🟡 MEDIUM (if multi-store)  
**Complexity:** 🔴 High

#### Database Schema
```prisma
model InventoryTransfer {
  id            String   @id @default(uuid())
  fromStoreId   String
  toStoreId     String
  status        String   @default("pending") // pending, approved, in_transit, completed
  requestedBy   String
  approvedBy    String?
  fromStore     Store    @relation("TransfersFrom", fields: [fromStoreId], references: [id])
  toStore       Store    @relation("TransfersTo", fields: [toStoreId], references: [id])
  items         TransferItem[]
  notes         String?
  requestedAt   DateTime @default(now())
  approvedAt    DateTime?
  completedAt   DateTime?
  
  @@index([fromStoreId])
  @@index([toStoreId])
  @@index([status])
}

model TransferItem {
  id         String            @id @default(uuid())
  transferId String
  productId  String
  variantId  String?
  quantity   Int
  transfer   InventoryTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  product    Product           @relation(fields: [productId], references: [id])
  
  @@index([transferId])
}

model StoreInventory {
  id        String   @id @default(uuid())
  storeId   String
  productId String
  variantId String?
  quantity  Int      @default(0)
  store     Store    @relation(fields: [storeId], references: [id])
  product   Product  @relation(fields: [productId], references: [id])
  updatedAt DateTime @updatedAt
  
  @@unique([storeId, productId, variantId])
  @@index([storeId])
  @@index([productId])
}
```

#### Implementation Tasks
- [ ] Create per-store inventory tracking
- [ ] Build transfer request workflow
- [ ] Add approval system
- [ ] Implement real-time sync (WebSockets or polling)
- [ ] Create consolidated inventory view
- [ ] Build transfer history
- [ ] Add email notifications for transfers

---

### 3.2 Warranty & Return Management (Week 9-10)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟡 Medium

#### Database Schema
```prisma
model Warranty {
  id              String   @id @default(uuid())
  saleItemId      String
  durationDays    Int
  expiresAt       DateTime
  terms           String
  status          String   @default("active") // active, claimed, expired
  saleItem        SaleItem @relation(fields: [saleItemId], references: [id])
  createdAt       DateTime @default(now())
  
  @@index([saleItemId])
  @@index([expiresAt])
}

model Return {
  id              String          @id @default(uuid())
  transactionId   String
  reason          String          // defective, wrong_item, changed_mind
  refundAmount    Float
  refundMethod    String          // cash, card, store_credit
  processedBy     String
  transaction     SaleTransaction @relation(fields: [transactionId], references: [id])
  items           ReturnItem[]
  createdAt       DateTime        @default(now())
  
  @@index([transactionId])
  @@index([createdAt])
}

model ReturnItem {
  id         String   @id @default(uuid())
  returnId   String
  saleItemId String
  quantity   Int
  reason     String?
  return     Return   @relation(fields: [returnId], references: [id], onDelete: Cascade)
  saleItem   SaleItem @relation(fields: [saleItemId], references: [id])
  
  @@index([returnId])
}
```

---

### 3.3 Shift Management & Time Clock (Week 10)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟡 Medium

(See CashierShift schema in 2.2)

#### Additional Features
- [ ] PIN-based clock in/out
- [ ] Break time tracking
- [ ] Late/absence alerts
- [ ] Overtime calculations
- [ ] Export to payroll CSV
- [ ] Geolocation verification (prevent remote clock-ins)

---

### 3.4 Advanced Analytics Dashboard (Week 11)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟡 Medium

#### Features to Build
- [ ] Hourly sales heatmap
- [ ] Product pair analysis (frequently bought together)
- [ ] Profitability by category
- [ ] Seasonal trend charts
- [ ] Customer cohort analysis
- [ ] Revenue forecasting

---

## 🔌 Phase 4: Integrations & Mobile (Weeks 12-16)

### 4.1 QuickBooks Integration (Week 12-13)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🔴 High

#### Implementation
- [ ] OAuth integration with QuickBooks
- [ ] Daily sales sync
- [ ] Expense sync
- [ ] Chart of accounts mapping
- [ ] Invoice generation

---

### 4.2 Mobile Companion App (Week 14-15)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🔴 High

#### Tech Stack
- React Native + Expo
- Shared API with desktop app
- Push notifications

#### Features
- [ ] Real-time dashboard
- [ ] Sales notifications
- [ ] Expense photo capture
- [ ] Inventory checks
- [ ] Employee clock-in

---

### 4.3 Receipt Printer Integration (Week 15)
**Priority:** 🟡 MEDIUM  
**Complexity:** 🟡 Medium

#### Implementation
- [ ] ESC/POS printer support
- [ ] Receipt template designer
- [ ] Auto-print on sale completion
- [ ] Reprint functionality

---

### 4.4 Barcode Label Printing (Week 16)
**Priority:** 🟢 LOW  
**Complexity:** 🟡 Medium

#### Implementation
- [ ] Zebra/Dymo printer support
- [ ] Label template designer
- [ ] Bulk label printing
- [ ] Product barcode generation

---

## 📋 Implementation Checklist Template

For each feature, follow this workflow:

### Planning Phase
- [ ] Review requirements and user stories
- [ ] Design database schema
- [ ] Create mockups/wireframes (optional)
- [ ] Estimate development time
- [ ] Identify dependencies

### Development Phase
- [ ] Create database migration
- [ ] Build service layer (business logic)
- [ ] Create IPC handlers
- [ ] Build UI components
- [ ] Add form validation
- [ ] Implement error handling
- [ ] Add loading states

### Testing Phase
- [ ] Unit tests for services
- [ ] Integration tests for IPC
- [ ] UI/UX testing
- [ ] Edge case testing
- [ ] Performance testing (if needed)

### Documentation Phase
- [ ] Update API documentation
- [ ] Add inline code comments
- [ ] Update user guide
- [ ] Create demo video (optional)

### Deployment Phase
- [ ] Create feature branch
- [ ] Code review
- [ ] Merge to main
- [ ] Update CHANGELOG
- [ ] Tag release version

---

## 🎯 Success Metrics

Track these KPIs for each feature:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **User Adoption** | 80% of users | Track feature usage in analytics |
| **Time Savings** | 30% reduction | Compare before/after workflows |
| **Error Rate** | < 2% | Monitor error logs |
| **User Satisfaction** | 4.5/5 stars | In-app feedback surveys |
| **ROI** | Measurable benefit | Track prevented losses (stockouts, theft) |

---

## 🚧 Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Database performance** | High | Add indexes, implement caching |
| **OCR accuracy** | Medium | Manual correction UI, confidence thresholds |
| **Email deliverability** | Medium | Use reputable service (SendGrid), SPF/DKIM |
| **Data loss** | High | Implement backup system first |
| **Security vulnerabilities** | High | Regular security audits, dependency updates |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Feature creep** | High | Strict scope management, phased approach |
| **User confusion** | Medium | Comprehensive onboarding, tooltips |
| **Performance degradation** | High | Load testing, optimization sprints |

---

## 📚 Resources Needed

### Development Tools
- [ ] QuickBooks developer account
- [ ] Twilio account (SMS)
- [ ] SendGrid account (Email)
- [ ] AWS Textract (OCR) OR use Tesseract (free)
- [ ] Testing devices (Windows, macOS, Linux)

### Documentation
- [ ] API documentation tool (Swagger/Stoplight)
- [ ] User manual
- [ ] Video tutorials
- [ ] Developer onboarding guide

---

## 🎓 Learning Resources

### For New Technologies
- **OCR:** Tesseract.js documentation
- **Email:** Nodemailer guides
- **SMS:** Twilio quickstart
- **Analytics:** Time-series analysis tutorials
- **Mobile:** React Native docs

---

## 📞 Support & Questions

For implementation questions or blockers:
1. Check existing documentation
2. Review similar features in codebase
3. Consult architecture docs
4. Ask team for guidance

---

**Next Steps:**
1. Review this plan with stakeholders
2. Adjust priorities based on feedback
3. Begin Phase 1, Week 1 implementation
4. Update this document as you progress

---

*Last Updated: November 22, 2025*
*Version: 1.0*
