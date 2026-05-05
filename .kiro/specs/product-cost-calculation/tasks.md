# Implementation Plan: Product Cost Calculation and Profit Margin Management System

## Overview

This implementation plan breaks down the Product Cost Calculation and Profit Margin Management System into discrete, actionable coding tasks. The system will enable dynamic product cost calculation based on configurable factors (filament weight, electricity, waste, wear/depreciation), provide suggested selling prices with profit margins, and offer detailed profit/loss analysis for orders.

The implementation follows a bottom-up approach: database schema → core calculation engine → settings management → UI components → integration → testing.

## Tasks

- [ ] 1. Database Schema Setup
  - Create `cost_settings` table with all cost parameters
  - Add `weight_grams` and `base_cost` columns to `products` table
  - Create indexes for performance optimization
  - Create trigger for automatic `updated_at` timestamp updates
  - Write migration SQL file in `supabase/` directory
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 2. Update TypeScript Database Types
  - [ ] 2.1 Add CostSettings interface to database types
    - Define complete CostSettings interface with all fields
    - Include validation constraints as TypeScript types
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 2.2 Extend Product interface with cost fields
    - Add `weight_grams` and `base_cost` to Product type
    - Update type definitions in `lib/types/database.ts`
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3. Core Calculation Engine Implementation
  - [ ] 3.1 Create cost calculation utility file
    - Create `lib/cost-calculator.ts` with core calculation functions
    - Implement `calculateProductCost()` function
    - Implement `applyWasteFactor()` helper function
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 14.1, 14.2, 14.5_
  
  - [ ]* 3.2 Write property tests for cost calculation
    - **Property 1: Cost Non-Negativity**
    - **Property 2: Cost Monotonicity**
    - **Property 3: Cost Linearity**
    - **Property 4: Total Cost Composition**
    - **Property 5: Cost Per Gram Calculation**
    - **Property 6: Filament Cost Formula**
    - **Property 7: Electricity Cost Formula**
    - **Property 8: Waste Cost Formula**
    - **Property 9: Wear Cost Formula**
    - **Property 10: Waste Factor Increase**
    - **Property 11: Waste Factor Isolation**
    - **Validates: Requirements 1.1-1.8, 14.1-14.5, 20.1-20.3**
  
  - [ ]* 3.3 Write unit tests for cost calculation edge cases
    - Test zero weight handling
    - Test maximum weight (10kg)
    - Test all cost factors disabled
    - Test individual cost factor toggles
    - _Requirements: 1.7, 1.8, 18.1, 18.2, 18.3, 18.4_

- [ ] 4. Profit Margin Calculator Implementation
  - [ ] 4.1 Implement profit margin calculation functions
    - Create `calculateSuggestedPrices()` function
    - Implement `roundToNearestFive()` helper function
    - Implement `calculateProfitAmount()` function
    - Implement `calculateProfitPercentage()` function
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ]* 4.2 Write property tests for profit margin calculations
    - **Property 14: Profit Margin Formula**
    - **Property 15: Profit Amount Calculation**
    - **Property 16: Profit Margin Ordering**
    - **Property 17: Suggested Prices Above Cost**
    - **Property 18: Price Rounding Consistency**
    - **Property 19: Price Rounding Proximity**
    - **Validates: Requirements 2.1-2.8, 15.1-15.5**
  
  - [ ]* 4.3 Write unit tests for price rounding edge cases
    - Test rounding examples: 127.3 → 125, 128.9 → 130, 125.0 → 125
    - Test boundary values
    - Test negative margins (loss scenarios)
    - _Requirements: 2.4, 2.7, 2.8, 15.3_

- [ ] 5. Settings Manager Implementation
  - [ ] 5.1 Create settings management module
    - Create `lib/settings-manager.ts`
    - Implement `getSettings()` function with database query
    - Implement `updateSettings()` function with validation
    - Implement `validateSettings()` function
    - Implement `resetToDefaults()` function
    - _Requirements: 3.1-3.12, 17.1-17.7_
  
  - [ ]* 5.2 Write property tests for settings validation
    - **Property 31: Settings Validation - Filament Price Range**
    - **Property 32: Settings Validation - Electricity Cost Range**
    - **Property 33: Settings Validation - Wear Cost Range**
    - **Property 34: Settings Validation - Waste Percentage Range**
    - **Property 35: Settings Validation Result Structure**
    - **Property 36: Validation Error Structure**
    - **Property 39: Settings Persistence Round-Trip**
    - **Property 40: Settings Timestamp Update**
    - **Property 41: Toggle State Persistence**
    - **Validates: Requirements 3.7-3.12, 17.1-17.7, 18.6**
  
  - [ ]* 5.3 Write unit tests for settings management
    - Test default values initialization
    - Test validation error messages in Turkish
    - Test concurrent update handling
    - _Requirements: 3.1-3.5, 9.3, 9.4, 9.5, 9.6_

- [ ] 6. Order Profit Analyzer Implementation
  - [ ] 6.1 Create order profit analysis module
    - Create `lib/order-profit-analyzer.ts`
    - Implement `analyzeOrderProfit()` function
    - Implement `calculateRealCosts()` helper function
    - Implement `calculateTotalRevenue()` helper function
    - Implement `calculateOrderCostBreakdown()` helper function
    - _Requirements: 5.1-5.15, 19.1-19.5_
  
  - [ ]* 6.2 Write property tests for order profit analysis
    - **Property 20: Item Revenue Formula**
    - **Property 21: Item Profit Formula**
    - **Property 22: Item Profit Margin Formula**
    - **Property 23: Item Weight Calculation**
    - **Property 24: Order Weight Conservation**
    - **Property 25: Order Weight With Waste**
    - **Property 26: Order Cost Summation**
    - **Property 27: Order Revenue Summation**
    - **Property 28: Order Profit Calculation**
    - **Property 29: Order Profit Percentage**
    - **Property 30: Quantity Selection Logic**
    - **Property 47: Real Filament Price Override**
    - **Validates: Requirements 5.1-5.15, 19.1-19.5**
  
  - [ ]* 6.3 Write unit tests for order profit analysis edge cases
    - Test orders with no produced quantities
    - Test orders with mixed produced/ordered quantities
    - Test zero revenue scenarios
    - Test large orders (100+ items)
    - _Requirements: 5.4, 11.3_

- [ ] 7. Checkpoint - Core Logic Complete
  - Ensure all tests pass for core calculation engine
  - Verify settings manager works correctly
  - Verify order profit analyzer produces accurate results
  - Ask the user if questions arise

- [ ] 8. Settings Screen UI Implementation
  - [ ] 8.1 Create settings screen component
    - Create `app/dashboard/settings/page.tsx` route
    - Create `components/settings/settings-client.tsx` component
    - Implement form with all cost parameter inputs
    - Implement toggle switches for cost factors
    - Add save and reset buttons
    - _Requirements: UI 2.1, UI 2.2, UI 2.3, UI 2.4, UI 2.5_
  
  - [ ] 8.2 Implement settings form validation
    - Add client-side validation for all numeric inputs
    - Display validation errors inline with Turkish messages
    - Prevent form submission when validation fails
    - Highlight invalid fields
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_
  
  - [ ] 8.3 Implement settings persistence
    - Connect form to settings manager
    - Handle save button click with database update
    - Handle reset button click with default values
    - Show success/error toasts
    - _Requirements: 3.11, 3.12, 8.4_

- [ ] 9. Cost Breakdown Component
  - [ ] 9.1 Create reusable cost breakdown component
    - Create `components/cost/cost-breakdown.tsx`
    - Display all cost components (filament, electricity, waste, wear)
    - Display total cost and cost per gram
    - Format monetary values with 2 decimal places
    - Show disabled cost factors as 0.00 or grayed out
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, UI 4.1-4.5_
  
  - [ ]* 9.2 Write unit tests for cost breakdown component
    - Test rendering with all factors enabled
    - Test rendering with factors disabled
    - Test formatting of monetary values
    - _Requirements: 6.7, 6.8_

- [ ] 10. Suggested Prices Component
  - [ ] 10.1 Create suggested prices component
    - Create `components/cost/suggested-prices.tsx`
    - Display prices in grid/list format
    - Show margin percentage, selling price, profit amount, rounded price
    - Implement price selection functionality
    - Highlight selected price
    - _Requirements: 7.1, 7.2, 7.3, UI 5.1-5.6_
  
  - [ ]* 10.2 Write unit tests for suggested prices component
    - Test rendering of all margin options
    - Test price selection interaction
    - Test highlighting of selected price
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 11. Product Catalog Integration
  - [ ] 11.1 Add weight input to product form
    - Modify `components/products/product-catalog-client.tsx`
    - Add weight input field with validation
    - Add cost breakdown display when weight is entered
    - Add suggested prices display
    - _Requirements: 4.1, 4.2, 4.3, UI 1.1, UI 1.2_
  
  - [ ] 11.2 Implement automatic cost calculation
    - Calculate cost when weight changes
    - Update base_cost in database when product is saved
    - Recalculate when settings change (via Realtime)
    - _Requirements: 4.4, 4.5, 8.2, 8.3_
  
  - [ ] 11.3 Implement price selection from suggestions
    - Add click handler to suggested price items
    - Update product unit_price with rounded price
    - Save updated product to database
    - Show success feedback
    - _Requirements: 7.4, 7.5, UI 1.4, UI 1.5_
  
  - [ ]* 11.4 Write integration tests for product catalog
    - Test adding product with weight
    - Test cost calculation display
    - Test price selection and save
    - Test validation error display
    - _Requirements: 4.1-4.5, 7.4, 7.5, 9.1, 9.2_

- [ ] 12. Checkpoint - Product Catalog Complete
  - Ensure product form works with weight input
  - Verify cost calculations display correctly
  - Verify price selection saves correctly
  - Test with various product weights
  - Ask the user if questions arise

- [ ] 13. Accounting Screen Enhancement
  - [ ] 13.1 Add Cost Analysis tab to accounting screen
    - Modify `app/dashboard/accounting/page.tsx`
    - Add new "Maliyet Analizi" tab
    - Create `components/accounting/cost-analysis-client.tsx`
    - _Requirements: UI 3.1_
  
  - [ ] 13.2 Implement order selection interface
    - Add dropdown/select for order selection
    - Fetch orders from database
    - Display order details when selected
    - _Requirements: 5.1, UI 3.2_
  
  - [ ] 13.3 Implement real filament price input
    - Add input field for real filament price
    - Default to current settings value
    - Validate input (positive number)
    - _Requirements: 5.2, UI 3.3_
  
  - [ ] 13.4 Display order profit analysis
    - Show total revenue, total cost, profit/loss
    - Display detailed cost breakdown using CostBreakdown component
    - Show profit percentage
    - Highlight profit (green) or loss (red)
    - _Requirements: 5.11, 5.12, 5.13, 5.14, 5.15, UI 3.4, UI 3.5_
  
  - [ ] 13.5 Implement per-item profit analysis table
    - Create table with columns: product, color, quantity, produced, unit price, revenue, cost, profit, margin
    - Sort items by profit margin
    - Highlight profitable items in green, loss items in red
    - _Requirements: 16.1-16.10, UI 3.6, UI 3.7_
  
  - [ ]* 13.6 Write integration tests for accounting screen
    - Test order selection
    - Test real filament price input
    - Test profit analysis calculation
    - Test per-item analysis display
    - _Requirements: 5.1-5.15, 16.1-16.10_

- [ ] 14. Real-time Settings Updates
  - [ ] 14.1 Implement Supabase Realtime subscription for settings
    - Subscribe to cost_settings table changes
    - Update local settings cache when changes received
    - Broadcast settings updates after save
    - _Requirements: 8.1, 8.2_
  
  - [ ] 14.2 Implement automatic recalculation on settings change
    - Recalculate displayed costs when settings update received
    - Update product catalog cost displays
    - Update accounting screen analysis
    - _Requirements: 8.3_
  
  - [ ] 14.3 Handle concurrent settings updates
    - Implement last write wins strategy using updated_at
    - Show notification when settings updated by another user
    - _Requirements: 8.4, 8.5_
  
  - [ ]* 14.4 Write integration tests for real-time updates
    - Test settings update propagation
    - Test automatic recalculation
    - Test concurrent update handling
    - _Requirements: 8.1-8.5_

- [ ] 15. Input Validation and Error Handling
  - [ ] 15.1 Implement comprehensive input validation
    - Add validation for product weight (positive, max 10kg)
    - Add validation for all settings fields
    - Display Turkish error messages
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ] 15.2 Implement error handling for database operations
    - Handle connection failures gracefully
    - Implement retry with exponential backoff
    - Use cached data when database unavailable
    - Log errors for debugging
    - _Requirements: NFR 2.1, NFR 2.2, NFR 2.3, NFR 2.4_
  
  - [ ] 15.3 Implement error handling for edge cases
    - Handle missing product weight
    - Handle division by zero in profit calculations
    - Handle order not found scenarios
    - _Requirements: Error Scenarios 3, 5, 6_
  
  - [ ]* 15.4 Write unit tests for error handling
    - Test all validation error messages
    - Test database failure recovery
    - Test edge case handling
    - _Requirements: 9.1-9.9, NFR 2.1-2.4_

- [ ] 16. Performance Optimization
  - [ ] 16.1 Implement calculation memoization
    - Use React.useMemo for cost calculations
    - Cache settings in memory
    - Avoid redundant calculations for unchanged inputs
    - _Requirements: 11.5, 11.6, 11.7_
  
  - [ ] 16.2 Implement debouncing for real-time calculations
    - Debounce weight input changes
    - Debounce settings input changes
    - Prevent excessive recalculations during typing
    - _Requirements: 11.6_
  
  - [ ] 16.3 Optimize database queries
    - Use single query with joins for order analysis
    - Implement pagination for large data sets
    - Use select() with specific columns
    - _Requirements: 11.3, NFR 4.4, NFR 4.5_
  
  - [ ]* 16.4 Write performance tests
    - Test single product cost calculation < 10ms
    - Test suggested prices generation < 20ms
    - Test order analysis for 100 items < 500ms
    - Test settings load < 200ms
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 17. Checkpoint - All Features Complete
  - Ensure all UI components work correctly
  - Verify real-time updates function properly
  - Verify error handling works as expected
  - Test performance meets requirements
  - Ask the user if questions arise

- [ ] 18. Documentation
  - [ ] 18.1 Add inline code documentation
    - Document all public functions with JSDoc comments
    - Add preconditions and postconditions
    - Document all interfaces and types
    - _Requirements: NFR 3.6_
  
  - [ ] 18.2 Create user documentation in Turkish
    - Document settings screen usage
    - Document product cost calculation workflow
    - Document order profit analysis workflow
    - _Requirements: NFR 1.1, NFR 1.5_
  
  - [ ] 18.3 Create admin guide for settings
    - Document all cost parameters
    - Explain cost factor toggles
    - Provide examples and best practices
    - _Requirements: NFR 1.5_

- [ ] 19. Final Integration Testing
  - [ ]* 19.1 Run complete end-to-end test suite
    - Test complete product creation workflow
    - Test complete settings management workflow
    - Test complete order analysis workflow
    - Test real-time updates across multiple sessions
    - _Requirements: All integration requirements_
  
  - [ ]* 19.2 Run property-based tests with 1000+ iterations
    - Execute all property tests with large iteration counts
    - Verify no edge cases cause failures
    - Document any discovered issues
    - _Requirements: All property test requirements_
  
  - [ ]* 19.3 Perform cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Test responsive design on desktop and tablet
    - Verify all features work consistently
    - _Requirements: NFR 6.3, NFR 6.4_

- [ ] 20. Final Checkpoint - Production Ready
  - Ensure all tests pass (unit, property, integration)
  - Verify documentation is complete
  - Verify performance meets all targets
  - Verify error handling is comprehensive
  - Verify UI is polished and user-friendly
  - Ask the user if ready to deploy

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and allow for user feedback
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete workflows
- The implementation follows TypeScript best practices and Next.js patterns
- All UI text is in Turkish as per requirements
- Database operations use Supabase client
- Real-time updates use Supabase Realtime subscriptions
