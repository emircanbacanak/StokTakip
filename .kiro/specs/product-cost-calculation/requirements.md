# Requirements Document: Product Cost Calculation and Profit Margin Management System

## Introduction

This document specifies the functional and non-functional requirements for the Product Cost Calculation and Profit Margin Management System. The system enables dynamic calculation of product costs based on multiple configurable factors (filament weight, electricity, waste, wear/depreciation), provides suggested selling prices with various profit margins, and offers detailed profit/loss analysis for specific orders in a Next.js + Supabase manufacturing/order management application.

## Glossary

- **System**: The Product Cost Calculation and Profit Margin Management System
- **Cost_Calculator**: The component responsible for calculating product costs
- **Profit_Analyzer**: The component responsible for analyzing order profit/loss
- **Settings_Manager**: The component responsible for managing global cost parameters
- **Product**: A manufactured item with weight and cost attributes
- **Order**: A collection of order items with quantities and prices
- **Cost_Settings**: Global configuration parameters for cost calculations
- **Filament_Cost**: The cost of raw material (filament) per kilogram
- **Waste_Factor**: Percentage of material wasted during production
- **Wear_Cost**: Depreciation cost per gram of production
- **Electricity_Cost**: Energy cost per gram of production
- **Profit_Margin**: Percentage markup applied to base cost
- **Suggested_Price**: Calculated selling price based on cost and margin
- **Real_Filament_Price**: Actual filament price paid for a specific order

## Requirements

### Requirement 1: Product Cost Calculation

**User Story:** As a product manager, I want to calculate product costs based on weight and configurable cost factors, so that I can determine accurate base costs for pricing decisions.

#### Acceptance Criteria

1. WHEN a product weight is provided, THE Cost_Calculator SHALL calculate the pure filament cost based on weight and filament price per kilogram
2. WHEN electricity cost is enabled, THE Cost_Calculator SHALL add electricity cost based on weight and electricity cost per gram
3. WHEN waste is enabled, THE Cost_Calculator SHALL add waste cost as a percentage of pure filament cost
4. WHEN wear cost is enabled, THE Cost_Calculator SHALL add wear cost based on weight and wear cost per gram
5. THE Cost_Calculator SHALL return a complete cost breakdown including pure filament, electricity, waste, wear, and total cost
6. THE Cost_Calculator SHALL calculate cost per gram by dividing total cost by weight
7. FOR ALL valid product weights, THE Cost_Calculator SHALL produce non-negative cost values
8. FOR ALL valid inputs, THE Cost_Calculator SHALL ensure total cost is greater than or equal to pure filament cost

### Requirement 2: Profit Margin Calculation

**User Story:** As a product manager, I want to see suggested selling prices with various profit margins, so that I can choose an appropriate price that balances competitiveness and profitability.

#### Acceptance Criteria

1. WHEN a base cost is provided, THE System SHALL generate suggested prices for profit margins of 10%, 20%, 30%, 40%, and 50%
2. FOR EACH profit margin, THE System SHALL calculate the selling price as base cost multiplied by (1 + margin percentage / 100)
3. FOR EACH suggested price, THE System SHALL calculate the profit amount as selling price minus base cost
4. FOR EACH suggested price, THE System SHALL round the price to the nearest 0 or 5
5. THE System SHALL ensure all suggested prices are greater than or equal to the base cost
6. THE System SHALL ensure higher profit margins produce higher selling prices
7. THE System SHALL ensure all rounded prices end in 0 or 5
8. THE System SHALL ensure the absolute difference between rounded and original price is at most 2.5

### Requirement 3: Settings Management

**User Story:** As a system administrator, I want to configure global cost parameters, so that cost calculations reflect current market conditions and business policies.

#### Acceptance Criteria

1. THE Settings_Manager SHALL store filament price per kilogram with a default value of 650 TL
2. THE Settings_Manager SHALL store electricity cost per gram with a default value of 0.1 TL
3. THE Settings_Manager SHALL store wear cost per gram with a default value of 0.05 TL
4. THE Settings_Manager SHALL store waste percentage with a default value of 10%
5. THE Settings_Manager SHALL provide toggle flags for enabling/disabling electricity, wear, and waste costs
6. WHEN a cost factor is disabled, THE Cost_Calculator SHALL exclude that factor from total cost calculation
7. THE Settings_Manager SHALL validate that filament price is between 0 and 10,000 TL
8. THE Settings_Manager SHALL validate that electricity cost per gram is between 0 and 1 TL
9. THE Settings_Manager SHALL validate that wear cost per gram is between 0 and 1 TL
10. THE Settings_Manager SHALL validate that waste percentage is between 0 and 50
11. WHEN settings are updated, THE Settings_Manager SHALL update the timestamp
12. THE Settings_Manager SHALL persist all settings to the database

### Requirement 4: Product Weight Management

**User Story:** As a product manager, I want to specify product weights, so that the system can calculate accurate costs for each product.

#### Acceptance Criteria

1. THE System SHALL allow users to specify product weight in grams
2. THE System SHALL validate that product weight is a positive number greater than 0
3. THE System SHALL validate that product weight does not exceed 10,000 grams
4. WHEN a product weight is saved, THE System SHALL automatically calculate and store the base cost
5. WHEN a product weight is updated, THE System SHALL recalculate the base cost
6. IF a product has no weight specified, THE System SHALL display a warning message
7. THE System SHALL store product weight with precision up to 2 decimal places

### Requirement 5: Order Profit Analysis

**User Story:** As an accountant, I want to analyze profit and loss for specific orders using actual filament costs, so that I can understand the real profitability of each order.

#### Acceptance Criteria

1. WHEN an order is selected for analysis, THE Profit_Analyzer SHALL fetch all order items with quantities and unit prices
2. WHEN a real filament price is provided, THE Profit_Analyzer SHALL use it instead of the default filament price for cost calculations
3. FOR EACH order item, THE Profit_Analyzer SHALL calculate the total weight as product weight multiplied by quantity
4. FOR EACH order item, THE Profit_Analyzer SHALL use produced quantity if available, otherwise use ordered quantity
5. FOR EACH order item, THE Profit_Analyzer SHALL calculate item cost using the cost calculation engine
6. FOR EACH order item, THE Profit_Analyzer SHALL calculate item revenue as quantity multiplied by unit price
7. FOR EACH order item, THE Profit_Analyzer SHALL calculate item profit as revenue minus cost
8. FOR EACH order item, THE Profit_Analyzer SHALL calculate profit margin as (profit / revenue) * 100
9. THE Profit_Analyzer SHALL calculate total order weight as the sum of all item weights
10. WHEN waste is enabled, THE Profit_Analyzer SHALL calculate total weight with waste as total weight multiplied by (1 + waste percentage / 100)
11. THE Profit_Analyzer SHALL calculate total order cost as the sum of all item costs
12. THE Profit_Analyzer SHALL calculate total order revenue as the sum of all item revenues
13. THE Profit_Analyzer SHALL calculate total profit as total revenue minus total cost
14. THE Profit_Analyzer SHALL calculate profit percentage as (total profit / total revenue) * 100
15. THE Profit_Analyzer SHALL provide a detailed cost breakdown showing pure filament, electricity, waste, and wear costs

### Requirement 6: Cost Breakdown Display

**User Story:** As a product manager, I want to see a detailed breakdown of all cost components, so that I understand how the total cost is calculated.

#### Acceptance Criteria

1. THE System SHALL display pure filament cost separately in the cost breakdown
2. THE System SHALL display electricity cost separately in the cost breakdown
3. THE System SHALL display waste cost separately in the cost breakdown
4. THE System SHALL display wear cost separately in the cost breakdown
5. THE System SHALL display total cost as the sum of all cost components
6. THE System SHALL display cost per gram
7. THE System SHALL format all monetary values with 2 decimal places
8. WHEN a cost factor is disabled, THE System SHALL show that cost component as 0.00

### Requirement 7: Price Selection Interface

**User Story:** As a product manager, I want to select a suggested price and apply it to the product, so that I can quickly set competitive prices based on calculated margins.

#### Acceptance Criteria

1. THE System SHALL display all suggested prices with their corresponding profit margins
2. FOR EACH suggested price, THE System SHALL display the margin percentage, selling price, profit amount, and rounded price
3. WHEN a user selects a suggested price, THE System SHALL update the product's unit price with the rounded price
4. WHEN a user selects a suggested price, THE System SHALL save the updated product to the database
5. THE System SHALL provide visual feedback when a price is successfully applied

### Requirement 8: Real-time Settings Updates

**User Story:** As a system administrator, I want settings changes to be reflected immediately across all active sessions, so that all users work with consistent cost parameters.

#### Acceptance Criteria

1. WHEN settings are updated, THE System SHALL broadcast the change via Supabase Realtime
2. WHEN a settings update is received, THE System SHALL refresh the local settings cache
3. WHEN a settings update is received, THE System SHALL recalculate any displayed costs
4. THE System SHALL handle concurrent settings updates using the updated_at timestamp
5. WHEN concurrent updates occur, THE System SHALL apply the last write wins strategy

### Requirement 9: Input Validation and Error Handling

**User Story:** As a user, I want clear error messages when I enter invalid data, so that I can correct my mistakes and proceed with my work.

#### Acceptance Criteria

1. WHEN a user enters a negative product weight, THE System SHALL display the error message "Ürün ağırlığı pozitif bir sayı olmalıdır"
2. WHEN a user enters a product weight exceeding 10,000 grams, THE System SHALL display the error message "Ürün ağırlığı 10,000 gramı geçemez"
3. WHEN a user enters an invalid filament price, THE System SHALL display the error message "Filament fiyatı 0 ile 10,000 TL arasında olmalıdır"
4. WHEN a user enters an invalid electricity cost, THE System SHALL display the error message "Elektrik maliyeti 0 ile 1 TL arasında olmalıdır"
5. WHEN a user enters an invalid wear cost, THE System SHALL display the error message "Aşınma maliyeti 0 ile 1 TL arasında olmalıdır"
6. WHEN a user enters an invalid waste percentage, THE System SHALL display the error message "Fire oranı 0 ile 50 arasında olmalıdır"
7. WHEN validation fails, THE System SHALL prevent form submission
8. WHEN validation fails, THE System SHALL highlight the invalid field
9. WHEN validation fails, THE System SHALL allow the user to correct the input

### Requirement 10: Database Schema Support

**User Story:** As a developer, I want proper database schema support for cost calculations, so that data is stored consistently and efficiently.

#### Acceptance Criteria

1. THE System SHALL create a cost_settings table with columns for all cost parameters
2. THE System SHALL add a weight_grams column to the products table
3. THE System SHALL add a base_cost column to the products table
4. THE System SHALL create an index on products.weight_grams for efficient filtering
5. THE System SHALL create a trigger to automatically update cost_settings.updated_at on changes
6. THE System SHALL use NUMERIC data types with appropriate precision for all monetary values
7. THE System SHALL use BOOLEAN data types for all toggle flags
8. THE System SHALL use TIMESTAMPTZ data types for all timestamp fields

### Requirement 11: Performance Requirements

**User Story:** As a user, I want cost calculations to be fast and responsive, so that I can work efficiently without delays.

#### Acceptance Criteria

1. THE Cost_Calculator SHALL complete single product cost calculation in less than 10 milliseconds
2. THE System SHALL generate suggested prices for 5 margins in less than 20 milliseconds
3. THE Profit_Analyzer SHALL complete order profit analysis for orders with 100 items in less than 500 milliseconds
4. THE Settings_Manager SHALL load settings from the database in less than 200 milliseconds
5. THE System SHALL use memoization to avoid redundant calculations for unchanged inputs
6. THE System SHALL debounce real-time calculations during user input
7. THE System SHALL cache settings in memory to avoid repeated database queries

### Requirement 12: Data Serialization and Persistence

**User Story:** As a developer, I want reliable data serialization for cost settings and calculations, so that data integrity is maintained across the system.

#### Acceptance Criteria

1. WHEN cost settings are saved to the database, THE System SHALL serialize all numeric values with appropriate precision
2. WHEN cost settings are loaded from the database, THE System SHALL deserialize all values to their correct types
3. FOR ALL valid cost settings objects, serializing then deserializing SHALL produce an equivalent object
4. THE System SHALL preserve all decimal precision during serialization and deserialization
5. THE System SHALL handle null values appropriately during serialization

### Requirement 13: Calculation Consistency

**User Story:** As a product manager, I want consistent cost calculations across all parts of the system, so that I can trust the accuracy of the data.

#### Acceptance Criteria

1. FOR ALL products with the same weight and settings, THE Cost_Calculator SHALL produce identical cost calculations
2. FOR ALL orders analyzed with the same parameters, THE Profit_Analyzer SHALL produce identical results
3. WHEN settings are unchanged, THE System SHALL produce identical suggested prices for the same base cost
4. THE System SHALL use the same rounding rules consistently across all price calculations
5. THE System SHALL use the same precision for all monetary calculations

### Requirement 14: Waste Factor Application

**User Story:** As a production manager, I want waste factors to be applied correctly to material costs, so that cost calculations reflect actual material usage including scrap.

#### Acceptance Criteria

1. WHEN waste is enabled, THE System SHALL calculate waste cost as pure filament cost multiplied by (waste percentage / 100)
2. FOR ALL non-negative amounts and waste percentages, applying the waste factor SHALL produce a result greater than or equal to the original amount
3. WHEN waste percentage is 0, THE System SHALL return the original amount unchanged
4. WHEN waste percentage is 10, THE System SHALL return the original amount multiplied by 1.10
5. THE System SHALL apply waste factor only to filament cost, not to electricity or wear costs

### Requirement 15: Price Rounding

**User Story:** As a product manager, I want prices rounded to convenient values, so that pricing is customer-friendly and easy to communicate.

#### Acceptance Criteria

1. THE System SHALL round all suggested prices to the nearest 0 or 5
2. FOR ALL price values, the rounded price SHALL be divisible by 5
3. FOR ALL price values, the absolute difference between rounded and original price SHALL be at most 2.5
4. WHEN a price is exactly divisible by 5, THE System SHALL return it unchanged
5. THE System SHALL round 127.3 to 125, 128.9 to 130, and 125.0 to 125

### Requirement 16: Order Item Analysis

**User Story:** As an accountant, I want detailed profit analysis for each item in an order, so that I can identify which products are most and least profitable.

#### Acceptance Criteria

1. FOR EACH item in an order, THE Profit_Analyzer SHALL display the product name
2. FOR EACH item in an order, THE Profit_Analyzer SHALL display the color
3. FOR EACH item in an order, THE Profit_Analyzer SHALL display the ordered quantity
4. FOR EACH item in an order, THE Profit_Analyzer SHALL display the produced quantity
5. FOR EACH item in an order, THE Profit_Analyzer SHALL display the unit price
6. FOR EACH item in an order, THE Profit_Analyzer SHALL display the item revenue
7. FOR EACH item in an order, THE Profit_Analyzer SHALL display the item cost
8. FOR EACH item in an order, THE Profit_Analyzer SHALL display the item profit
9. FOR EACH item in an order, THE Profit_Analyzer SHALL display the profit margin percentage
10. THE Profit_Analyzer SHALL sort items by profit margin to highlight most and least profitable items

### Requirement 17: Settings Validation

**User Story:** As a system administrator, I want comprehensive validation of settings, so that invalid configurations cannot be saved.

#### Acceptance Criteria

1. WHEN settings are submitted, THE Settings_Manager SHALL validate all numeric fields are positive numbers
2. WHEN settings are submitted, THE Settings_Manager SHALL validate all values are within acceptable ranges
3. WHEN validation fails, THE Settings_Manager SHALL return a validation result with isValid set to false
4. WHEN validation fails, THE Settings_Manager SHALL return an array of validation errors
5. FOR EACH validation error, THE Settings_Manager SHALL include the field name and error message
6. WHEN validation succeeds, THE Settings_Manager SHALL return a validation result with isValid set to true
7. WHEN validation succeeds, THE Settings_Manager SHALL return an empty errors array

### Requirement 18: Cost Factor Toggles

**User Story:** As a system administrator, I want to enable or disable individual cost factors, so that I can customize cost calculations based on business needs.

#### Acceptance Criteria

1. WHEN electricity cost is disabled, THE Cost_Calculator SHALL set electricity cost to 0
2. WHEN wear cost is disabled, THE Cost_Calculator SHALL set wear cost to 0
3. WHEN waste is disabled, THE Cost_Calculator SHALL set waste cost to 0
4. WHEN all cost factors are disabled, THE Cost_Calculator SHALL return only pure filament cost
5. WHEN a cost factor is re-enabled, THE Cost_Calculator SHALL include it in subsequent calculations
6. THE System SHALL persist toggle states to the database
7. THE System SHALL load toggle states from the database on startup

### Requirement 19: Revenue Calculation

**User Story:** As an accountant, I want accurate revenue calculations for orders, so that profit analysis is based on correct financial data.

#### Acceptance Criteria

1. FOR ALL orders, THE System SHALL calculate total revenue as the sum of all item revenues
2. FOR ALL order items, THE System SHALL calculate item revenue as quantity multiplied by unit price
3. THE System SHALL use produced quantity for revenue calculation if available
4. THE System SHALL use ordered quantity for revenue calculation if produced quantity is not available
5. FOR ALL orders, the sum of individual item revenues SHALL equal the total order revenue

### Requirement 20: Cost Monotonicity

**User Story:** As a product manager, I want heavier products to always cost more than lighter products (with the same settings), so that cost calculations are logical and predictable.

#### Acceptance Criteria

1. FOR ALL pairs of products where weight1 < weight2, THE Cost_Calculator SHALL ensure cost1 < cost2 when using the same settings
2. FOR ALL products, increasing weight SHALL increase total cost proportionally
3. FOR ALL products, doubling weight SHALL double the total cost (assuming linear cost factors)

## Non-Functional Requirements

### NFR 1: Usability

1. THE System SHALL provide a user-friendly interface in Turkish language
2. THE System SHALL display all monetary values in Turkish Lira (TL) format
3. THE System SHALL provide clear visual feedback for all user actions
4. THE System SHALL use consistent terminology across all screens
5. THE System SHALL provide tooltips or help text for complex calculations

### NFR 2: Reliability

1. THE System SHALL handle database connection failures gracefully
2. THE System SHALL retry failed operations with exponential backoff
3. THE System SHALL use cached data when database is unavailable
4. THE System SHALL log all errors for debugging purposes
5. THE System SHALL maintain data consistency during concurrent updates

### NFR 3: Maintainability

1. THE System SHALL use TypeScript for type safety
2. THE System SHALL follow consistent coding conventions
3. THE System SHALL include comprehensive unit tests with 90%+ coverage
4. THE System SHALL include property-based tests for core algorithms
5. THE System SHALL include integration tests for critical workflows
6. THE System SHALL provide clear documentation for all public APIs

### NFR 4: Scalability

1. THE System SHALL support orders with up to 1000 items
2. THE System SHALL support products with weights up to 10 kg
3. THE System SHALL handle concurrent settings updates from multiple users
4. THE System SHALL use database indexing for efficient queries
5. THE System SHALL implement pagination for large data sets

### NFR 5: Security

1. THE System SHALL validate all user inputs on both client and server
2. THE System SHALL implement Row Level Security (RLS) policies in Supabase
3. THE System SHALL restrict settings updates to authorized users only
4. THE System SHALL log all settings changes with user ID and timestamp
5. THE System SHALL not expose internal cost calculations to external APIs
6. THE System SHALL implement rate limiting for API endpoints

### NFR 6: Compatibility

1. THE System SHALL work with Next.js 14+
2. THE System SHALL work with Supabase PostgreSQL
3. THE System SHALL work with modern browsers (Chrome, Firefox, Safari, Edge)
4. THE System SHALL be responsive and work on desktop and tablet devices
5. THE System SHALL integrate with existing Supabase schema

### NFR 7: Testability

1. THE System SHALL provide isolated, testable functions for all calculations
2. THE System SHALL support dependency injection for testing
3. THE System SHALL provide mock data generators for testing
4. THE System SHALL support property-based testing with fast-check
5. THE System SHALL provide test utilities for common test scenarios

## Data Requirements

### DR 1: Cost Settings Data

1. THE System SHALL store exactly one active cost settings record
2. THE System SHALL initialize default settings on first use
3. THE System SHALL maintain a history of settings changes via updated_at timestamp
4. THE System SHALL ensure settings are never null or undefined

### DR 2: Product Data

1. THE System SHALL store product weight with precision up to 2 decimal places
2. THE System SHALL store base cost with precision up to 2 decimal places
3. THE System SHALL allow null weight for products not yet configured
4. THE System SHALL automatically calculate base cost when weight is provided

### DR 3: Order Data

1. THE System SHALL fetch order data with all related items in a single query
2. THE System SHALL include product details for each order item
3. THE System SHALL include both ordered and produced quantities
4. THE System SHALL include unit prices for all items

## UI/UX Requirements

### UI 1: Product Catalog Screen

1. THE System SHALL add a weight input field to the product form
2. THE System SHALL display cost breakdown when weight is entered
3. THE System SHALL display suggested prices with profit margins
4. THE System SHALL allow users to select and apply a suggested price
5. THE System SHALL provide visual feedback when price is applied

### UI 2: Settings Screen

1. THE System SHALL provide input fields for all cost parameters
2. THE System SHALL provide toggle switches for enabling/disabling cost factors
3. THE System SHALL display current settings values
4. THE System SHALL provide a save button to persist changes
5. THE System SHALL provide a reset button to restore defaults
6. THE System SHALL display validation errors inline with input fields

### UI 3: Accounting Screen

1. THE System SHALL add a "Maliyet Analizi" (Cost Analysis) tab
2. THE System SHALL provide an order selection interface
3. THE System SHALL provide an input field for real filament price
4. THE System SHALL display total revenue, total cost, and profit/loss
5. THE System SHALL display a detailed cost breakdown
6. THE System SHALL display per-item profit analysis in a table
7. THE System SHALL highlight profitable items in green and loss items in red

### UI 4: Cost Breakdown Component

1. THE System SHALL display cost breakdown in a card or panel
2. THE System SHALL use clear labels for each cost component
3. THE System SHALL format all monetary values consistently
4. THE System SHALL use visual indicators (icons) for each cost type
5. THE System SHALL show disabled cost factors as grayed out or hidden

### UI 5: Suggested Prices Component

1. THE System SHALL display suggested prices in a grid or list
2. THE System SHALL show margin percentage prominently for each price
3. THE System SHALL show both original and rounded prices
4. THE System SHALL show profit amount for each price
5. THE System SHALL provide a button or click action to select a price
6. THE System SHALL highlight the selected price

## Acceptance Testing Scenarios

### Scenario 1: Calculate Product Cost

**Given:** A product with weight 40 grams and default settings (filament: 650 TL/kg, electricity: 0.1 TL/g, wear: 0.05 TL/g, waste: 10%)

**When:** The cost is calculated

**Then:** 
- Pure filament cost = 26.00 TL
- Electricity cost = 4.00 TL
- Waste cost = 2.60 TL
- Wear cost = 2.00 TL
- Total cost = 34.60 TL

### Scenario 2: Generate Suggested Prices

**Given:** A base cost of 34.60 TL

**When:** Suggested prices are generated for margins 10%, 20%, 30%, 40%, 50%

**Then:**
- 10% margin: 38.06 TL → rounded to 40.00 TL
- 20% margin: 41.52 TL → rounded to 40.00 TL
- 30% margin: 44.98 TL → rounded to 45.00 TL
- 40% margin: 48.44 TL → rounded to 50.00 TL
- 50% margin: 51.90 TL → rounded to 50.00 TL

### Scenario 3: Analyze Order Profit

**Given:** An order with 3 items, real filament price 680 TL/kg

**When:** Profit analysis is performed

**Then:**
- Total revenue is calculated from all item quantities and unit prices
- Total cost is calculated using real filament price
- Profit amount = total revenue - total cost
- Profit percentage = (profit amount / total revenue) * 100
- Each item shows individual profit/loss

### Scenario 4: Disable Cost Factor

**Given:** Electricity cost is enabled with value 0.1 TL/g

**When:** Electricity cost is disabled

**Then:**
- Electricity cost in breakdown shows 0.00 TL
- Total cost decreases by the electricity cost amount
- Suggested prices are recalculated with lower base cost

### Scenario 5: Invalid Weight Input

**Given:** User is adding a new product

**When:** User enters weight as -10 grams

**Then:**
- Validation error is displayed: "Ürün ağırlığı pozitif bir sayı olmalıdır"
- Form submission is prevented
- Weight field is highlighted
- User can correct the input

## Traceability Matrix

| Requirement ID | Design Component | Test Coverage |
|---------------|------------------|---------------|
| REQ-1 | Cost Calculation Engine | Unit + Property Tests |
| REQ-2 | Profit Margin Calculator | Unit + Property Tests |
| REQ-3 | Settings Manager | Unit + Integration Tests |
| REQ-4 | Product Weight Management | Unit + Integration Tests |
| REQ-5 | Order Profit Analyzer | Unit + Integration Tests |
| REQ-6 | Cost Breakdown Display | Integration Tests |
| REQ-7 | Price Selection Interface | Integration Tests |
| REQ-8 | Real-time Settings Updates | Integration Tests |
| REQ-9 | Input Validation | Unit Tests |
| REQ-10 | Database Schema | Migration Tests |
| REQ-11 | Performance | Performance Tests |
| REQ-12 | Data Serialization | Property Tests |
| REQ-13 | Calculation Consistency | Property Tests |
| REQ-14 | Waste Factor Application | Unit + Property Tests |
| REQ-15 | Price Rounding | Unit + Property Tests |
| REQ-16 | Order Item Analysis | Integration Tests |
| REQ-17 | Settings Validation | Unit Tests |
| REQ-18 | Cost Factor Toggles | Unit + Integration Tests |
| REQ-19 | Revenue Calculation | Unit + Property Tests |
| REQ-20 | Cost Monotonicity | Property Tests |
