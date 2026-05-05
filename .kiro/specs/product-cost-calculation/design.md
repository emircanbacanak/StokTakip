# Design Document: Product Cost Calculation and Profit Margin Management System

## Overview

The Product Cost Calculation and Profit Margin Management System is a comprehensive feature for a Next.js + Supabase manufacturing/order management application. The system enables dynamic calculation of product costs based on multiple configurable factors (filament weight, electricity, waste, wear/depreciation), provides suggested selling prices with various profit margins, and offers detailed profit/loss analysis for specific orders. The system is designed to be highly configurable with toggleable cost factors, real-time calculations, and integration with the existing Supabase schema.

**Key Capabilities**:
- Dynamic product cost calculation with multiple cost factors
- Suggested selling prices with profit margins (10%, 20%, 30%, 40%, 50%)
- Order-specific profit/loss analysis with real filament costs
- Global settings management for all cost parameters
- Toggleable cost factors for flexible calculations
- Real-time updates and comprehensive testing

## Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        PC[Product Catalog]
        AS[Accounting Screen]
        SS[Settings Screen]
        CC[Cost Calculator Component]
    end
    
    subgraph "Business Logic Layer"
        CCE[Cost Calculation Engine]
        PMC[Profit Margin Calculator]
        OPA[Order Profit Analyzer]
        SM[Settings Manager]
    end
    
    subgraph "Data Layer"
        SB[(Supabase PostgreSQL)]
        RT[Realtime Subscriptions]
    end
    
    PC --> CCE
    AS --> OPA
    SS --> SM
    CC --> CCE
    CC --> PMC
    
    CCE --> SB
    PMC --> SB
    OPA --> SB
    SM --> SB
    
    SB --> RT
    RT --> PC
    RT --> AS
    RT --> SS
    
    style CCE fill:#3b82f6
    style PMC fill:#8b5cf6
    style OPA fill:#10b981
    style SM fill:#f59e0b


## Main Workflow

```mermaid
sequenceDiagram
    participant User
    participant ProductCatalog
    participant CostEngine
    participant Settings
    participant Database
    
    User->>Settings: Configure global parameters
    Settings->>Database: Save settings (filament price, electricity, etc.)
    
    User->>ProductCatalog: Add/Edit product with weight
    ProductCatalog->>CostEngine: Calculate costs(weight, settings)
    CostEngine->>CostEngine: Apply cost factors
    CostEngine->>CostEngine: Calculate profit margins
    CostEngine-->>ProductCatalog: Return cost breakdown + suggested prices
    ProductCatalog->>Database: Save product with cost data
    
    User->>ProductCatalog: Select suggested price
    ProductCatalog->>Database: Update product unit_price
    
    User->>AccountingScreen: Analyze order profit
    AccountingScreen->>Database: Fetch order items + real filament cost
    AccountingScreen->>CostEngine: Calculate real costs
    CostEngine-->>AccountingScreen: Return profit/loss analysis
    AccountingScreen-->>User: Display detailed breakdown
```

## Components and Interfaces

### Component 1: Cost Calculation Engine

**Purpose**: Core calculation engine that computes product costs based on weight and configurable cost factors.

**Interface**:
```typescript
interface CostCalculationEngine {
  calculateProductCost(params: CostCalculationParams): ProductCostBreakdown
  calculateOrderCost(params: OrderCostParams): OrderCostAnalysis
  applyWasteFactor(baseAmount: number, wastePercentage: number): number
  roundToNearestFive(value: number): number
}

interface CostCalculationParams {
  weightGrams: number
  settings: CostSettings
}

interface ProductCostBreakdown {
  weightGrams: number
  pureFilamentCost: number
  electricityCost: number
  wasteCost: number
  wearCost: number
  totalCost: number
  costPerGram: number
}
```

**Responsibilities**:
- Calculate pure filament cost based on weight and price per kg
- Apply electricity cost per gram
- Calculate waste/scrap cost (10% default)
- Apply wear/depreciation cost per gram
- Aggregate total product cost
- Provide cost breakdown for transparency

### Component 2: Profit Margin Calculator

**Purpose**: Generates suggested selling prices with various profit margin percentages.

**Interface**:
```typescript
interface ProfitMarginCalculator {
  calculateSuggestedPrices(baseCost: number, margins: number[]): SuggestedPrice[]
  calculateProfitAmount(sellingPrice: number, cost: number): number
  calculateProfitPercentage(sellingPrice: number, cost: number): number
}

interface SuggestedPrice {
  marginPercentage: number
  sellingPrice: number
  profitAmount: number
  roundedPrice: number
}
```

**Responsibilities**:
- Calculate selling prices for multiple profit margins (10%, 20%, 30%, 40%, 50%)
- Round prices to nearest 0 or 5 (e.g., 125.00, 130.00, 135.00)
- Calculate profit amounts for each margin
- Provide formatted price suggestions

### Component 3: Order Profit Analyzer

**Purpose**: Analyzes profit/loss for specific orders using real filament costs and actual production data.

**Interface**:
```typescript
interface OrderProfitAnalyzer {
  analyzeOrderProfit(orderId: string, realFilamentPrice: number): OrderProfitAnalysis
  calculateRealCosts(items: OrderItem[], settings: CostSettings): RealCostBreakdown
  calculateTotalRevenue(items: OrderItem[]): number
}

interface OrderProfitAnalysis {
  orderId: string
  totalRevenue: number
  totalCost: number
  profitAmount: number
  profitPercentage: number
  itemAnalysis: ItemProfitAnalysis[]
  costBreakdown: RealCostBreakdown
}

interface ItemProfitAnalysis {
  productName: string
  color: string
  quantity: number
  producedQuantity: number
  unitPrice: number
  revenue: number
  cost: number
  profit: number
  profitMargin: number
}

interface RealCostBreakdown {
  totalWeightGrams: number
  totalWeightWithWaste: number
  pureFilamentCost: number
  electricityCost: number
  wasteCost: number
  wearCost: number
  totalCost: number
}
```

**Responsibilities**:
- Fetch order details with all items
- Calculate real costs using actual filament price
- Apply waste factor to total weight
- Calculate revenue from unit prices
- Compute profit/loss for entire order
- Provide per-item profit analysis

### Component 4: Settings Manager

**Purpose**: Manages global cost calculation parameters with persistence and validation.

**Interface**:
```typescript
interface SettingsManager {
  getSettings(): Promise<CostSettings>
  updateSettings(settings: Partial<CostSettings>): Promise<CostSettings>
  resetToDefaults(): Promise<CostSettings>
  validateSettings(settings: CostSettings): ValidationResult
}

interface CostSettings {
  id: string
  filamentPricePerKg: number
  electricityCostPerGram: number
  wearCostPerGram: number
  wastePercentage: number
  enableElectricity: boolean
  enableWear: boolean
  enableWaste: boolean
  updatedAt: string
}

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

interface ValidationError {
  field: string
  message: string
}
```

**Responsibilities**:
- Load settings from database
- Validate setting values (positive numbers, reasonable ranges)
- Save updated settings
- Provide default values
- Handle toggle states for cost factors

## Data Models

### Model 1: Product (Extended)

```typescript
interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  weight_grams: number | null  // NEW: Product weight in grams
  base_cost: number | null     // NEW: Calculated base cost
  created_at: string
}
```

**Validation Rules**:
- `weight_grams` must be positive number (> 0)
- `weight_grams` maximum: 10,000 grams (10 kg) for reasonable product sizes
- `base_cost` must be non-negative
- `base_cost` automatically calculated when weight changes

### Model 2: CostSettings

```typescript
interface CostSettings {
  id: string
  filament_price_per_kg: number
  electricity_cost_per_gram: number
  wear_cost_per_gram: number
  waste_percentage: number
  enable_electricity: boolean
  enable_wear: boolean
  enable_waste: boolean
  created_at: string
  updated_at: string
}
```

**Validation Rules**:
- `filament_price_per_kg`: 0 < value <= 10,000 TL
- `electricity_cost_per_gram`: 0 <= value <= 1 TL
- `wear_cost_per_gram`: 0 <= value <= 1 TL
- `waste_percentage`: 0 <= value <= 50 (percentage)
- All boolean flags default to `true`

### Model 3: OrderCostAnalysis (Computed)

```typescript
interface OrderCostAnalysis {
  order_id: string
  buyer_name: string
  total_items: number
  total_quantity: number
  total_produced_quantity: number
  total_weight_grams: number
  total_weight_with_waste: number
  real_filament_price: number
  cost_breakdown: {
    pure_filament: number
    electricity: number
    waste: number
    wear: number
    total: number
  }
  revenue_breakdown: {
    base_revenue: number
    overproduction_revenue: number
    total_revenue: number
  }
  profit_analysis: {
    profit_amount: number
    profit_percentage: number
    profit_per_item: number
  }
  items: ItemProfitAnalysis[]
}
```

**Validation Rules**:
- `total_weight_grams` must match sum of all item weights
- `total_revenue` must match sum of (quantity * unit_price) for all items
- `profit_percentage` = (profit_amount / total_revenue) * 100
- All monetary values must be non-negative

## Algorithmic Pseudocode

### Main Cost Calculation Algorithm

```typescript
/**
 * Calculate complete product cost breakdown
 * 
 * @param weightGrams - Product weight in grams
 * @param settings - Global cost settings
 * @returns Complete cost breakdown
 */
function calculateProductCost(
  weightGrams: number,
  settings: CostSettings
): ProductCostBreakdown {
  // Precondition: weightGrams > 0
  // Precondition: settings is valid CostSettings object
  
  // Step 1: Calculate pure filament cost
  const weightKg = weightGrams / 1000
  const pureFilamentCost = weightKg * settings.filamentPricePerKg
  
  // Step 2: Calculate electricity cost (if enabled)
  const electricityCost = settings.enableElectricity
    ? weightGrams * settings.electricityCostPerGram
    : 0
  
  // Step 3: Calculate waste cost (if enabled)
  const wasteCost = settings.enableWaste
    ? pureFilamentCost * (settings.wastePercentage / 100)
    : 0
  
  // Step 4: Calculate wear/depreciation cost (if enabled)
  const wearCost = settings.enableWear
    ? weightGrams * settings.wearCostPerGram
    : 0
  
  // Step 5: Sum total cost
  const totalCost = pureFilamentCost + electricityCost + wasteCost + wearCost
  
  // Step 6: Calculate cost per gram
  const costPerGram = totalCost / weightGrams
  
  // Postcondition: totalCost >= pureFilamentCost
  // Postcondition: costPerGram > 0
  
  return {
    weightGrams,
    pureFilamentCost,
    electricityCost,
    wasteCost,
    wearCost,
    totalCost,
    costPerGram
  }
}
```

**Preconditions**:
- `weightGrams` is a positive number (> 0)
- `settings` is a valid CostSettings object with all required fields
- `settings.filamentPricePerKg` is positive
- All cost factors are non-negative

**Postconditions**:
- Returns valid ProductCostBreakdown object
- `totalCost` >= `pureFilamentCost` (total includes all factors)
- `costPerGram` > 0
- All cost values are non-negative
- Sum of individual costs equals totalCost

**Loop Invariants**: N/A (no loops in this function)

### Profit Margin Calculation Algorithm

```typescript
/**
 * Generate suggested selling prices with profit margins
 * 
 * @param baseCost - Total product cost
 * @param margins - Array of profit margin percentages
 * @returns Array of suggested prices with margins
 */
function calculateSuggestedPrices(
  baseCost: number,
  margins: number[]
): SuggestedPrice[] {
  // Precondition: baseCost > 0
  // Precondition: margins is non-empty array
  // Precondition: all margins are positive numbers
  
  const suggestedPrices: SuggestedPrice[] = []
  
  // Loop through each margin percentage
  for (const marginPercentage of margins) {
    // Loop invariant: all previously processed prices are valid
    // Loop invariant: suggestedPrices.length <= margins.length
    
    // Calculate selling price with margin
    const sellingPrice = baseCost * (1 + marginPercentage / 100)
    
    // Calculate profit amount
    const profitAmount = sellingPrice - baseCost
    
    // Round to nearest 0 or 5
    const roundedPrice = roundToNearestFive(sellingPrice)
    
    suggestedPrices.push({
      marginPercentage,
      sellingPrice,
      profitAmount,
      roundedPrice
    })
  }
  
  // Postcondition: suggestedPrices.length === margins.length
  // Postcondition: all prices are >= baseCost
  // Postcondition: all roundedPrice values end in 0 or 5
  
  return suggestedPrices
}

/**
 * Round number to nearest 0 or 5
 * Examples: 127.3 -> 125, 128.9 -> 130, 125.0 -> 125
 */
function roundToNearestFive(value: number): number {
  // Precondition: value >= 0
  
  const rounded = Math.round(value / 5) * 5
  
  // Postcondition: rounded % 5 === 0
  // Postcondition: Math.abs(rounded - value) <= 2.5
  
  return rounded
}
```

**Preconditions**:
- `baseCost` is a positive number
- `margins` is a non-empty array of positive numbers
- All margin values are reasonable (typically 0-100%)

**Postconditions**:
- Returns array with same length as margins input
- All selling prices are greater than or equal to baseCost
- All rounded prices end in 0 or 5
- Profit amounts are correctly calculated (sellingPrice - baseCost)

**Loop Invariants**:
- All previously processed suggested prices are valid
- `suggestedPrices.length` <= `margins.length` at any point in loop
- All prices in suggestedPrices are >= baseCost

### Order Profit Analysis Algorithm

```typescript
/**
 * Analyze profit/loss for a complete order
 * 
 * @param orderId - Order UUID
 * @param realFilamentPrice - Actual filament price used
 * @returns Complete profit analysis
 */
async function analyzeOrderProfit(
  orderId: string,
  realFilamentPrice: number
): Promise<OrderProfitAnalysis> {
  // Precondition: orderId is valid UUID
  // Precondition: realFilamentPrice > 0
  
  // Step 1: Fetch order with all items
  const order = await fetchOrderWithItems(orderId)
  
  // Step 2: Fetch current settings
  const settings = await getSettings()
  
  // Step 3: Override filament price with real price
  const analysisSettings = {
    ...settings,
    filamentPricePerKg: realFilamentPrice
  }
  
  // Step 4: Calculate costs for each item
  const itemAnalyses: ItemProfitAnalysis[] = []
  let totalCost = 0
  let totalRevenue = 0
  let totalWeightGrams = 0
  
  for (const item of order.items) {
    // Loop invariant: totalCost >= 0
    // Loop invariant: totalRevenue >= 0
    // Loop invariant: itemAnalyses.length <= order.items.length
    
    // Get product weight
    const product = await fetchProduct(item.product_name)
    const itemWeight = product.weight_grams || 0
    
    // Calculate quantity (use produced if available, else ordered)
    const quantity = item.produced_quantity || item.quantity
    
    // Calculate total weight for this item
    const itemTotalWeight = itemWeight * quantity
    totalWeightGrams += itemTotalWeight
    
    // Calculate cost for this item
    const itemCostBreakdown = calculateProductCost(
      itemTotalWeight,
      analysisSettings
    )
    
    // Calculate revenue for this item
    const itemRevenue = quantity * item.unit_price
    totalRevenue += itemRevenue
    
    // Calculate profit for this item
    const itemProfit = itemRevenue - itemCostBreakdown.totalCost
    const itemProfitMargin = (itemProfit / itemRevenue) * 100
    
    totalCost += itemCostBreakdown.totalCost
    
    itemAnalyses.push({
      productName: item.product_name,
      color: item.color,
      quantity: item.quantity,
      producedQuantity: item.produced_quantity,
      unitPrice: item.unit_price,
      revenue: itemRevenue,
      cost: itemCostBreakdown.totalCost,
      profit: itemProfit,
      profitMargin: itemProfitMargin
    })
  }
  
  // Step 5: Calculate total weight with waste
  const totalWeightWithWaste = settings.enableWaste
    ? totalWeightGrams * (1 + settings.wastePercentage / 100)
    : totalWeightGrams
  
  // Step 6: Calculate overall profit
  const profitAmount = totalRevenue - totalCost
  const profitPercentage = (profitAmount / totalRevenue) * 100
  
  // Step 7: Build cost breakdown
  const costBreakdown = calculateOrderCostBreakdown(
    totalWeightGrams,
    analysisSettings
  )
  
  // Postcondition: itemAnalyses.length === order.items.length
  // Postcondition: totalRevenue > 0
  // Postcondition: totalCost >= 0
  // Postcondition: profitAmount = totalRevenue - totalCost
  
  return {
    orderId,
    totalRevenue,
    totalCost,
    profitAmount,
    profitPercentage,
    itemAnalysis: itemAnalyses,
    costBreakdown
  }
}
```

**Preconditions**:
- `orderId` is a valid UUID that exists in database
- `realFilamentPrice` is a positive number
- Order has at least one item
- All products referenced in order items exist

**Postconditions**:
- Returns complete OrderProfitAnalysis object
- `itemAnalysis` array length equals number of order items
- `totalRevenue` equals sum of all item revenues
- `totalCost` equals sum of all item costs
- `profitAmount` = `totalRevenue` - `totalCost`
- `profitPercentage` correctly calculated

**Loop Invariants**:
- `totalCost` >= 0 throughout iteration
- `totalRevenue` >= 0 throughout iteration
- `itemAnalyses.length` <= `order.items.length` at any point
- All processed items have valid cost and revenue calculations

## Key Functions with Formal Specifications

### Function 1: applyWasteFactor()

```typescript
function applyWasteFactor(
  baseAmount: number,
  wastePercentage: number
): number
```

**Preconditions:**
- `baseAmount` >= 0
- `wastePercentage` >= 0 and <= 100

**Postconditions:**
- Returns value >= baseAmount
- If wastePercentage = 0, returns baseAmount
- If wastePercentage = 10, returns baseAmount * 1.10
- Result = baseAmount * (1 + wastePercentage / 100)

**Loop Invariants:** N/A

### Function 2: validateSettings()

```typescript
function validateSettings(settings: CostSettings): ValidationResult
```

**Preconditions:**
- `settings` is a defined object (not null/undefined)

**Postconditions:**
- Returns ValidationResult object
- `isValid` = true if and only if all validations pass
- `errors` array contains descriptive messages for each failed validation
- No mutations to input settings parameter

**Loop Invariants:**
- For validation loops: All previously checked fields remain valid or invalid as determined

### Function 3: roundToNearestFive()

```typescript
function roundToNearestFive(value: number): number
```

**Preconditions:**
- `value` >= 0

**Postconditions:**
- Returns number where result % 5 === 0
- Math.abs(result - value) <= 2.5
- Examples: 127.3 -> 125, 128.9 -> 130, 125.0 -> 125

**Loop Invariants:** N/A

### Function 4: calculateProfitPercentage()

```typescript
function calculateProfitPercentage(
  sellingPrice: number,
  cost: number
): number
```

**Preconditions:**
- `sellingPrice` >= 0
- `cost` >= 0
- `sellingPrice` > 0 (to avoid division by zero)

**Postconditions:**
- Returns percentage value
- If sellingPrice = cost, returns 0
- If sellingPrice > cost, returns positive percentage
- If sellingPrice < cost, returns negative percentage (loss)
- Result = ((sellingPrice - cost) / sellingPrice) * 100

**Loop Invariants:** N/A

## Example Usage

### Example 1: Calculate Product Cost

```typescript
// Settings
const settings: CostSettings = {
  filamentPricePerKg: 650, // 650 TL per kg
  electricityCostPerGram: 0.1, // 0.1 TL per gram
  wearCostPerGram: 0.05, // 0.05 TL per gram
  wastePercentage: 10, // 10% waste
  enableElectricity: true,
  enableWear: true,
  enableWaste: true
}

// Product weight
const productWeight = 40 // grams

// Calculate cost
const costBreakdown = calculateProductCost(productWeight, settings)

console.log(costBreakdown)
// Output:
// {
//   weightGrams: 40,
//   pureFilamentCost: 26.00,  // (40/1000) * 650
//   electricityCost: 4.00,     // 40 * 0.1
//   wasteCost: 2.60,           // 26.00 * 0.10
//   wearCost: 2.00,            // 40 * 0.05
//   totalCost: 34.60,
//   costPerGram: 0.865
// }
```

### Example 2: Generate Suggested Prices

```typescript
const baseCost = 34.60
const margins = [10, 20, 30, 40, 50]

const suggestedPrices = calculateSuggestedPrices(baseCost, margins)

console.log(suggestedPrices)
// Output:
// [
//   { marginPercentage: 10, sellingPrice: 38.06, profitAmount: 3.46, roundedPrice: 40.00 },
//   { marginPercentage: 20, sellingPrice: 41.52, profitAmount: 6.92, roundedPrice: 40.00 },
//   { marginPercentage: 30, sellingPrice: 44.98, profitAmount: 10.38, roundedPrice: 45.00 },
//   { marginPercentage: 40, sellingPrice: 48.44, profitAmount: 13.84, roundedPrice: 50.00 },
//   { marginPercentage: 50, sellingPrice: 51.90, profitAmount: 17.30, roundedPrice: 50.00 }
// ]
```

### Example 3: Analyze Order Profit

```typescript
// Order details
const orderId = "123e4567-e89b-12d3-a456-426614174000"
const realFilamentPrice = 680 // TL per kg (actual price paid)

// Analyze profit
const analysis = await analyzeOrderProfit(orderId, realFilamentPrice)

console.log(analysis)
// Output:
// {
//   orderId: "123e4567-e89b-12d3-a456-426614174000",
//   totalRevenue: 42000.00,
//   totalCost: 29120.00,
//   profitAmount: 12880.00,
//   profitPercentage: 30.67,
//   itemAnalysis: [
//     {
//       productName: "Widget A",
//       color: "Red",
//       quantity: 120,
//       producedQuantity: 120,
//       unitPrice: 50.00,
//       revenue: 6000.00,
//       cost: 4152.00,
//       profit: 1848.00,
//       profitMargin: 30.80
//     },
//     // ... more items
//   ],
//   costBreakdown: {
//     totalWeightGrams: 33600,
//     totalWeightWithWaste: 36960,
//     pureFilamentCost: 22848.00,
//     electricityCost: 3360.00,
//     wasteCost: 2284.80,
//     wearCost: 1680.00,
//     totalCost: 30172.80
//   }
// }
```

### Example 4: Settings Management

```typescript
// Load settings
const settings = await settingsManager.getSettings()

// Update filament price
const updated = await settingsManager.updateSettings({
  filamentPricePerKg: 700
})

// Disable electricity cost
const toggled = await settingsManager.updateSettings({
  enableElectricity: false
})

// Validate before saving
const validation = settingsManager.validateSettings({
  filamentPricePerKg: -100, // Invalid: negative
  electricityCostPerGram: 0.1,
  wearCostPerGram: 0.05,
  wastePercentage: 10,
  enableElectricity: true,
  enableWear: true,
  enableWaste: true
})

console.log(validation)
// Output:
// {
//   isValid: false,
//   errors: [
//     { field: "filamentPricePerKg", message: "Must be positive number" }
//   ]
// }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cost Non-Negativity

*For all* valid product weights and cost settings, the Cost_Calculator SHALL produce non-negative values for all cost components (pure filament, electricity, waste, wear) and total cost.

**Validates: Requirements 1.7**

### Property 2: Cost Monotonicity

*For all* pairs of products where weight1 < weight2 and using the same cost settings, the total cost for weight1 SHALL be less than the total cost for weight2.

**Validates: Requirements 20.1, 20.2**

### Property 3: Cost Linearity

*For all* product weights, doubling the weight SHALL double the total cost (assuming linear cost factors and same settings).

**Validates: Requirements 20.3**

### Property 4: Total Cost Composition

*For all* valid inputs, the total cost SHALL equal the sum of pure filament cost, electricity cost, waste cost, and wear cost.

**Validates: Requirements 1.5, 1.8**

### Property 5: Cost Per Gram Calculation

*For all* products with positive weight, the cost per gram SHALL equal total cost divided by weight in grams.

**Validates: Requirements 1.6**

### Property 6: Filament Cost Formula

*For all* product weights and filament prices, the pure filament cost SHALL equal (weight in grams / 1000) * filament price per kg.

**Validates: Requirements 1.1**

### Property 7: Electricity Cost Formula

*For all* product weights, when electricity cost is enabled, the electricity cost SHALL equal weight in grams multiplied by electricity cost per gram.

**Validates: Requirements 1.2**

### Property 8: Waste Cost Formula

*For all* pure filament costs and waste percentages, when waste is enabled, the waste cost SHALL equal pure filament cost multiplied by (waste percentage / 100).

**Validates: Requirements 1.3, 14.1**

### Property 9: Wear Cost Formula

*For all* product weights, when wear cost is enabled, the wear cost SHALL equal weight in grams multiplied by wear cost per gram.

**Validates: Requirements 1.4**

### Property 10: Waste Factor Increase

*For all* non-negative amounts and waste percentages, applying the waste factor SHALL produce a result greater than or equal to the original amount.

**Validates: Requirements 14.2**

### Property 11: Waste Factor Isolation

*For all* cost calculations, the waste factor SHALL only affect pure filament cost and SHALL NOT affect electricity or wear costs.

**Validates: Requirements 14.5**

### Property 12: Cost Factor Toggle Effect

*For all* cost calculations, when a cost factor (electricity, wear, or waste) is disabled, that cost component SHALL equal zero.

**Validates: Requirements 3.6, 18.1, 18.2, 18.3**

### Property 13: All Factors Disabled

*For all* cost calculations, when all cost factors (electricity, wear, waste) are disabled, the total cost SHALL equal only the pure filament cost.

**Validates: Requirements 18.4**

### Property 14: Profit Margin Formula

*For all* base costs and profit margin percentages, the selling price SHALL equal base cost multiplied by (1 + margin percentage / 100).

**Validates: Requirements 2.2**

### Property 15: Profit Amount Calculation

*For all* selling prices and costs, the profit amount SHALL equal selling price minus cost.

**Validates: Requirements 2.3, 5.7**

### Property 16: Profit Margin Ordering

*For all* sorted profit margin percentages m1 < m2 < ... < mn, the corresponding selling prices SHALL also be sorted: price1 < price2 < ... < pricen.

**Validates: Requirements 2.6**

### Property 17: Suggested Prices Above Cost

*For all* base costs and positive profit margins, all suggested selling prices SHALL be greater than or equal to the base cost.

**Validates: Requirements 2.5**

### Property 18: Price Rounding Consistency

*For all* price values, the rounded price SHALL be divisible by 5 (i.e., rounded price % 5 === 0).

**Validates: Requirements 2.4, 2.7, 15.1, 15.2**

### Property 19: Price Rounding Proximity

*For all* price values, the absolute difference between the rounded price and original price SHALL be at most 2.5.

**Validates: Requirements 2.8, 15.3**

### Property 20: Item Revenue Formula

*For all* order items, the item revenue SHALL equal quantity multiplied by unit price.

**Validates: Requirements 5.6, 19.2**

### Property 21: Item Profit Formula

*For all* order items, the item profit SHALL equal item revenue minus item cost.

**Validates: Requirements 5.7**

### Property 22: Item Profit Margin Formula

*For all* order items with non-zero revenue, the profit margin percentage SHALL equal (item profit / item revenue) * 100.

**Validates: Requirements 5.8**

### Property 23: Item Weight Calculation

*For all* order items, the total item weight SHALL equal product weight multiplied by quantity.

**Validates: Requirements 5.3**

### Property 24: Order Weight Conservation

*For all* orders, the total order weight SHALL equal the sum of all item weights.

**Validates: Requirements 5.9**

### Property 25: Order Weight With Waste

*For all* orders, when waste is enabled, the total weight with waste SHALL equal total weight multiplied by (1 + waste percentage / 100).

**Validates: Requirements 5.10**

### Property 26: Order Cost Summation

*For all* orders, the total order cost SHALL equal the sum of all item costs.

**Validates: Requirements 5.11**

### Property 27: Order Revenue Summation

*For all* orders, the total order revenue SHALL equal the sum of all item revenues.

**Validates: Requirements 5.12, 19.1, 19.5**

### Property 28: Order Profit Calculation

*For all* orders, the total profit SHALL equal total revenue minus total cost.

**Validates: Requirements 5.13**

### Property 29: Order Profit Percentage

*For all* orders with non-zero revenue, the profit percentage SHALL equal (total profit / total revenue) * 100.

**Validates: Requirements 5.14**

### Property 30: Quantity Selection Logic

*For all* order items, the system SHALL use produced quantity if available, otherwise SHALL use ordered quantity for calculations.

**Validates: Requirements 5.4, 19.3, 19.4**

### Property 31: Settings Validation - Filament Price Range

*For all* filament price inputs, validation SHALL pass if and only if the price is between 0 and 10,000 TL (exclusive of 0, inclusive of 10,000).

**Validates: Requirements 3.7**

### Property 32: Settings Validation - Electricity Cost Range

*For all* electricity cost inputs, validation SHALL pass if and only if the cost is between 0 and 1 TL (inclusive).

**Validates: Requirements 3.8**

### Property 33: Settings Validation - Wear Cost Range

*For all* wear cost inputs, validation SHALL pass if and only if the cost is between 0 and 1 TL (inclusive).

**Validates: Requirements 3.9**

### Property 34: Settings Validation - Waste Percentage Range

*For all* waste percentage inputs, validation SHALL pass if and only if the percentage is between 0 and 50 (inclusive).

**Validates: Requirements 3.10**

### Property 35: Settings Validation Result Structure

*For all* settings validation attempts, when validation fails, the result SHALL have isValid = false and a non-empty errors array; when validation succeeds, the result SHALL have isValid = true and an empty errors array.

**Validates: Requirements 17.3, 17.4, 17.6, 17.7**

### Property 36: Validation Error Structure

*For all* validation errors, each error SHALL include both a field name and an error message.

**Validates: Requirements 17.5**

### Property 37: Product Weight Validation - Positive

*For all* product weight inputs, validation SHALL reject values that are less than or equal to zero.

**Validates: Requirements 4.2**

### Property 38: Product Weight Validation - Maximum

*For all* product weight inputs, validation SHALL reject values that exceed 10,000 grams.

**Validates: Requirements 4.3**

### Property 39: Settings Persistence Round-Trip

*For all* valid cost settings objects, saving to database then loading from database SHALL produce an equivalent settings object with all values preserved.

**Validates: Requirements 3.12, 12.3**

### Property 40: Settings Timestamp Update

*For all* settings updates, the updated_at timestamp SHALL be modified to reflect the current time.

**Validates: Requirements 3.11**

### Property 41: Toggle State Persistence

*For all* cost factor toggle states, saving to database then loading from database SHALL preserve the toggle states.

**Validates: Requirements 18.6**

### Property 42: Decimal Precision Preservation

*For all* numeric values in cost settings, serialization then deserialization SHALL preserve decimal precision up to 2 decimal places for monetary values.

**Validates: Requirements 12.1, 12.2, 12.4**

### Property 43: Product Weight Precision

*For all* product weights, the stored value SHALL have precision up to 2 decimal places.

**Validates: Requirements 4.7**

### Property 44: Calculation Consistency - Cost Calculator

*For all* products with the same weight and settings, multiple invocations of the Cost_Calculator SHALL produce identical cost calculations.

**Validates: Requirements 13.1**

### Property 45: Calculation Consistency - Profit Analyzer

*For all* orders analyzed with the same parameters, multiple invocations of the Profit_Analyzer SHALL produce identical results.

**Validates: Requirements 13.2**

### Property 46: Calculation Consistency - Suggested Prices

*For all* base costs, when settings are unchanged, multiple invocations SHALL produce identical suggested prices.

**Validates: Requirements 13.3**

### Property 47: Real Filament Price Override

*For all* order profit analyses, when a real filament price is provided, it SHALL be used instead of the default filament price for all cost calculations.

**Validates: Requirements 5.2**

### Property 48: Cost Breakdown Completeness

*For all* cost calculations, the cost breakdown SHALL include all components: pure filament cost, electricity cost, waste cost, wear cost, and total cost.

**Validates: Requirements 1.5, 5.15**


## Error Handling

### Error Scenario 1: Invalid Product Weight

**Condition**: User enters negative or zero weight for product
**Response**: Display validation error message "Ürün ağırlığı pozitif bir sayı olmalıdır"
**Recovery**: Prevent form submission, highlight weight field, allow user to correct

### Error Scenario 2: Settings Out of Range

**Condition**: User enters filament price > 10,000 TL or negative values
**Response**: Display validation error "Filament fiyatı 0 ile 10,000 TL arasında olmalıdır"
**Recovery**: Reset to previous valid value, show error toast, allow correction

### Error Scenario 3: Missing Product Weight

**Condition**: Product doesn't have weight_grams when calculating cost
**Response**: Use default weight of 0, show warning "Bu ürün için ağırlık tanımlanmamış"
**Recovery**: Allow user to edit product and add weight, recalculate costs

### Error Scenario 4: Database Connection Failure

**Condition**: Supabase connection fails during settings load/save
**Response**: Show error toast "Ayarlar yüklenemedi. Lütfen tekrar deneyin."
**Recovery**: Retry with exponential backoff, use cached settings if available, log error

### Error Scenario 5: Order Not Found

**Condition**: User tries to analyze profit for non-existent order
**Response**: Display error message "Sipariş bulunamadı"
**Recovery**: Redirect to orders list, log error for debugging

### Error Scenario 6: Division by Zero

**Condition**: Calculating profit percentage when revenue is zero
**Response**: Return 0% or N/A, prevent division by zero
**Recovery**: Handle gracefully, display "Hesaplanamadı" in UI

### Error Scenario 7: Concurrent Settings Updates

**Condition**: Multiple users update settings simultaneously
**Response**: Use optimistic locking with updated_at timestamp
**Recovery**: Last write wins, show notification "Ayarlar güncellendi", reload latest

## Testing Strategy

### Unit Testing Approach

**Test Framework**: Jest + React Testing Library

**Key Test Cases**:

1. **Cost Calculation Tests**
   - Test pure filament cost calculation with various weights
   - Test electricity cost with enabled/disabled states
   - Test waste factor application (0%, 10%, 20%)
   - Test wear cost calculation
   - Test total cost aggregation
   - Test cost per gram calculation

2. **Profit Margin Tests**
   - Test suggested price generation for all margins
   - Test rounding to nearest 5 (edge cases: 122.4 -> 120, 122.6 -> 125)
   - Test profit amount calculation
   - Test profit percentage calculation

3. **Settings Validation Tests**
   - Test positive number validation
   - Test range validation (min/max values)
   - Test toggle state handling
   - Test default values

4. **Edge Cases**:
   - Zero weight product
   - Maximum weight product (10 kg)
   - All cost factors disabled
   - Zero filament price
   - 100% waste percentage

**Coverage Goals**: 90%+ code coverage for business logic

### Property-Based Testing Approach

**Property Test Library**: fast-check (TypeScript property-based testing)

**Properties to Test**:

1. **Cost Non-Negativity Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.float({ min: 0.1, max: 10000 }), // weight
       fc.float({ min: 1, max: 10000 }),   // filament price
       (weight, price) => {
         const cost = calculateProductCost(weight, { filamentPricePerKg: price, ... })
         return cost.totalCost >= 0
       }
     )
   )
   ```

2. **Cost Monotonicity Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.float({ min: 0.1, max: 5000 }),
       fc.float({ min: 0.1, max: 5000 }),
       (w1, w2) => {
         if (w1 >= w2) return true
         const cost1 = calculateProductCost(w1, settings)
         const cost2 = calculateProductCost(w2, settings)
         return cost1.totalCost < cost2.totalCost
       }
     )
   )
   ```

3. **Rounding Consistency Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.float({ min: 0, max: 100000 }),
       (value) => {
         const rounded = roundToNearestFive(value)
         return rounded % 5 === 0 && Math.abs(rounded - value) <= 2.5
       }
     )
   )
   ```

4. **Profit Margin Ordering Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.float({ min: 1, max: 1000 }), // base cost
       fc.array(fc.float({ min: 1, max: 100 }), { minLength: 2 }), // margins
       (baseCost, margins) => {
         const sorted = [...margins].sort((a, b) => a - b)
         const prices = calculateSuggestedPrices(baseCost, sorted)
         for (let i = 1; i < prices.length; i++) {
           if (prices[i].sellingPrice < prices[i-1].sellingPrice) return false
         }
         return true
       }
     )
   )
   ```

5. **Waste Factor Increase Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.float({ min: 0, max: 10000 }),
       fc.float({ min: 0, max: 50 }),
       (amount, wastePercent) => {
         const result = applyWasteFactor(amount, wastePercent)
         return result >= amount
       }
     )
   )
   ```

6. **Revenue Conservation Property**
   ```typescript
   fc.assert(
     fc.property(
       fc.array(
         fc.record({
           quantity: fc.integer({ min: 1, max: 1000 }),
           unitPrice: fc.float({ min: 0.01, max: 1000 })
         }),
         { minLength: 1, maxLength: 20 }
       ),
       (items) => {
         const manualSum = items.reduce((sum, item) => 
           sum + item.quantity * item.unitPrice, 0
         )
         const calculatedRevenue = calculateTotalRevenue(items)
         return Math.abs(manualSum - calculatedRevenue) < 0.01 // floating point tolerance
       }
     )
   )
   ```

**Test Scenarios**:
- Random weight values (0.1g to 10kg)
- Random filament prices (1 TL to 10,000 TL)
- Random waste percentages (0% to 50%)
- Random profit margins (1% to 100%)
- Random order sizes (1 to 1000 items)
- All combinations of enabled/disabled cost factors

### Integration Testing Approach

**Test Framework**: Playwright for E2E tests

**Integration Test Cases**:

1. **Product Cost Calculation Flow**
   - Navigate to product catalog
   - Add new product with weight
   - Verify cost breakdown displayed
   - Verify suggested prices shown
   - Select a suggested price
   - Verify product saved with correct price

2. **Settings Management Flow**
   - Navigate to settings screen
   - Update filament price
   - Toggle cost factors on/off
   - Save settings
   - Verify settings persisted
   - Navigate to product catalog
   - Verify costs recalculated with new settings

3. **Order Profit Analysis Flow**
   - Navigate to accounting screen
   - Select an order
   - Enter real filament price
   - Verify profit/loss calculation
   - Verify cost breakdown displayed
   - Verify per-item analysis shown

4. **Real-time Updates**
   - Open settings in two browser tabs
   - Update settings in tab 1
   - Verify tab 2 receives update via Supabase Realtime
   - Verify UI updates automatically

5. **Error Handling**
   - Test invalid weight input
   - Test invalid settings values
   - Test network failure scenarios
   - Verify error messages displayed
   - Verify recovery mechanisms work

## Performance Considerations

### Calculation Performance

**Optimization Strategy**:
- Memoize cost calculations for unchanged inputs
- Use React.useMemo for expensive calculations
- Debounce real-time calculations during user input
- Cache settings in memory to avoid repeated database queries

**Performance Targets**:
- Cost calculation: < 10ms for single product
- Suggested prices generation: < 20ms for 5 margins
- Order profit analysis: < 500ms for orders with 100+ items
- Settings load: < 200ms from Supabase

### Database Performance

**Optimization Strategy**:
- Index on products.weight_grams for filtering
- Index on cost_settings.updated_at for versioning
- Use Supabase RPC functions for complex order analysis
- Batch product weight updates

**Query Optimization**:
- Fetch order with items in single query using joins
- Use select() with specific columns to reduce payload
- Implement pagination for large order lists

### UI Performance

**Optimization Strategy**:
- Virtualize long lists of suggested prices
- Lazy load order profit analysis
- Use React.memo for cost breakdown components
- Implement skeleton loading states

## Security Considerations

### Input Validation

**Security Measures**:
- Validate all numeric inputs on both client and server
- Sanitize user input to prevent injection attacks
- Enforce maximum values to prevent overflow
- Use TypeScript strict mode for type safety

### Data Access Control

**Security Measures**:
- Implement Row Level Security (RLS) policies in Supabase
- Restrict settings updates to authorized users only
- Log all settings changes with user ID and timestamp
- Validate user permissions before cost analysis

### Sensitive Data

**Security Measures**:
- Do not expose internal cost calculations to external APIs
- Encrypt sensitive settings in database (if required)
- Implement audit trail for settings changes
- Restrict access to profit analysis screens

### Rate Limiting

**Security Measures**:
- Implement rate limiting for cost calculation API calls
- Prevent abuse of order profit analysis endpoint
- Throttle settings updates to prevent spam

## Dependencies

### External Libraries

1. **@supabase/supabase-js** (v2.47.10)
   - Purpose: Database operations and real-time subscriptions
   - Usage: CRUD operations for products, orders, settings

2. **fast-check** (to be added)
   - Purpose: Property-based testing
   - Usage: Generate random test cases for cost calculations

3. **recharts** (v2.15.0)
   - Purpose: Data visualization
   - Usage: Display cost breakdown charts in accounting screen

4. **lucide-react** (v0.469.0)
   - Purpose: Icons
   - Usage: UI icons for cost factors, settings, profit indicators

### Internal Dependencies

1. **lib/supabase/client.ts**
   - Purpose: Supabase client initialization
   - Usage: All database operations

2. **lib/types/database.ts**
   - Purpose: TypeScript type definitions
   - Usage: Type safety for database operations

3. **lib/utils.ts**
   - Purpose: Utility functions
   - Usage: formatCurrency, formatNumber helpers

4. **components/ui/**
   - Purpose: Reusable UI components
   - Usage: Dialog, Input, Button, Card components

### Database Schema Changes

**New Tables**:

1. **cost_settings**
   ```sql
   CREATE TABLE cost_settings (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     filament_price_per_kg NUMERIC(12, 2) NOT NULL DEFAULT 650,
     electricity_cost_per_gram NUMERIC(12, 4) NOT NULL DEFAULT 0.1,
     wear_cost_per_gram NUMERIC(12, 4) NOT NULL DEFAULT 0.05,
     waste_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10,
     enable_electricity BOOLEAN NOT NULL DEFAULT true,
     enable_wear BOOLEAN NOT NULL DEFAULT true,
     enable_waste BOOLEAN NOT NULL DEFAULT true,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

**Modified Tables**:

1. **products** (add columns)
   ```sql
   ALTER TABLE products
   ADD COLUMN weight_grams NUMERIC(10, 2),
   ADD COLUMN base_cost NUMERIC(12, 2);
   
   CREATE INDEX idx_products_weight ON products(weight_grams);
   ```

**Triggers**:

1. **Update cost_settings.updated_at**
   ```sql
   CREATE OR REPLACE FUNCTION update_cost_settings_timestamp()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;
   
   CREATE TRIGGER trigger_update_cost_settings_timestamp
   BEFORE UPDATE ON cost_settings
   FOR EACH ROW EXECUTE FUNCTION update_cost_settings_timestamp();
   ```

### API Endpoints (Server Actions)

1. **GET /api/cost-settings**
   - Purpose: Fetch current cost settings
   - Returns: CostSettings object

2. **POST /api/cost-settings**
   - Purpose: Update cost settings
   - Body: Partial<CostSettings>
   - Returns: Updated CostSettings

3. **POST /api/calculate-cost**
   - Purpose: Calculate product cost
   - Body: { weightGrams: number }
   - Returns: ProductCostBreakdown

4. **POST /api/analyze-order-profit**
   - Purpose: Analyze order profit/loss
   - Body: { orderId: string, realFilamentPrice: number }
   - Returns: OrderProfitAnalysis

## Implementation Notes

### Phase 1: Database Schema and Settings

1. Create cost_settings table
2. Add weight_grams and base_cost columns to products table
3. Create settings management API
4. Build settings screen UI

### Phase 2: Cost Calculation Engine

1. Implement core calculation functions
2. Add unit tests for all calculations
3. Implement property-based tests
4. Create cost calculator component

### Phase 3: Product Catalog Integration

1. Add weight input to product form
2. Display cost breakdown on product add/edit
3. Show suggested prices with margins
4. Allow price selection from suggestions

### Phase 4: Accounting Screen Enhancement

1. Add new "Maliyet Analizi" tab to accounting screen
2. Implement order profit analyzer
3. Display cost breakdown and profit analysis
4. Add real filament price input

### Phase 5: Testing and Optimization

1. Complete unit test coverage
2. Run property-based tests with 1000+ iterations
3. Perform integration testing
4. Optimize performance
5. Add error handling and validation

### Phase 6: Documentation and Deployment

1. Write user documentation (Turkish)
2. Create admin guide for settings
3. Deploy to production
4. Monitor for issues
