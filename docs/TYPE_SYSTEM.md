# Type System Documentation

> **Status:** Complete and in use. Updated April 2026.
> **AI INSTRUCTION:** Always import shared types from `src/shared/types.ts`. Plugin-local types (e.g., `Patient` interface) are defined inline in their respective plugin `index.tsx` or component file.

## Overview

This application uses a **centralized type system** to eliminate duplication and ensure consistency across the codebase. All shared types are defined in `src/shared/types.ts` and imported where needed.

## Architecture

```
src/
├── shared/
│   ├── types.ts           # Core type definitions (shared between main & renderer)
│   └── types/
│       ├── index.ts       # Type exports
│       └── utils.ts       # Type utilities and helpers
├── main/
│   └── services/          # Uses shared types directly
└── renderer/
    └── src/
        └── pages/
            └── [Page]/
                └── types.ts  # Page-specific types (extends shared types)
```

## Core Types

### User & Authentication

```typescript
- User
- Role (enum: admin, manager, sales, inventory, finance)
- Employee (extends User)
```

### Products & Inventory

```typescript
- Product              # Base product entity
- ProductVariant       # Product variations (color, size, etc.)
- ProductImage         # Product images
- InventoryItem        # Extended product with calculated fields
- InventoryMetrics     # Analytics data
- StockMovement        # Stock history tracking
- StockStatus          # Type: 'out' | 'low' | 'normal' | 'high'
- StockMovementType    # Type: 'sale' | 'restock' | 'adjustment' | 'return'
```

### Sales & Financial

```typescript
- Sale                 # Sales transaction
- SaleItem             # Individual sale line items
- Transaction          # Financial transactions
- TransactionType      # Enum: income, expense
- FinancialMetrics     # Financial analytics
- TopProduct           # Top selling products data
```

### Utilities

```typescript
- SortDirection        # 'asc' | 'desc'
- DateRange            # Date range object
- DateRangeType        # Predefined ranges
- DateRangeFilter      # Date filtering
```

## Type Utilities (`types/utils.ts`)

### Serialized<T>
Converts Date types to strings (useful for IPC communication):
```typescript
type UserData = Serialized<User> // Dates become strings
```

### PartialBy<T, K>
Makes specific fields optional:
```typescript
type UserUpdate = PartialBy<User, 'createdAt' | 'updatedAt'>
```

### RequiredBy<T, K>
Makes specific fields required:
```typescript
type UserCreate = RequiredBy<Partial<User>, 'username' | 'role'>
```

### DeepPartial<T>
Makes all nested properties optional:
```typescript
type ProductUpdate = DeepPartial<Product>
```

### Helper Interfaces
- `PaginationParams` - Pagination parameters
- `PaginatedResponse<T>` - Paginated API response
- `ApiResponse<T>` - Standard API response wrapper
- `FormState<T>` - Form state management

## Usage Guidelines

### ✅ DO

1. **Import from shared types:**
   ```typescript
   import type { Product, ProductVariant } from '../../../../shared/types'
   ```

2. **Extend shared types for page-specific needs:**
   ```typescript
   // In src/renderer/src/pages/Inventory/types.ts
   import type { InventoryItem } from '../../../../shared/types'
   
   export interface InventoryFilters {
     search: string
     stockStatus: StockStatus[]
   }
   
   // Re-export for convenience
   export type { InventoryItem }
   ```

3. **Use type utilities for transformations:**
   ```typescript
   import type { Serialized, PartialBy } from '../../../../shared/types/utils'
   
   type SerializedProduct = Serialized<Product>
   ```

### ❌ DON'T

1. **Don't duplicate type definitions:**
   ```typescript
   // ❌ BAD
   interface Product {
     id: string
     name: string
     // ... duplicated fields
   }
   ```

2. **Don't create similar types with different names:**
   ```typescript
   // ❌ BAD
   interface ProductData { /* same as Product */ }
   interface ProductInfo { /* same as Product */ }
   ```

3. **Don't use inline types for reusable entities:**
   ```typescript
   // ❌ BAD
   function getProducts(): { id: string; name: string }[] { }
   
   // ✅ GOOD
   function getProducts(): Product[] { }
   ```

## IPC Type Safety

All IPC channel names are defined as constants in `IPC_CHANNELS`:

```typescript
import { IPC_CHANNELS } from '../../../../shared/types'

// Main process
ipcMain.handle(IPC_CHANNELS.PRODUCTS.GET_ALL, async () => {
  // ...
})

// Renderer process
const products = await window.api.products.getAll()
```

## Date Handling

Types support both `Date` and `string` for flexibility:

```typescript
export interface Product {
  createdAt: Date | string  // Accepts both for IPC serialization
}
```

When sending through IPC, dates are automatically serialized to ISO strings.

## Migration Guide

To migrate existing code:

1. **Find duplicate type definitions:**
   ```bash
   # Search for interface definitions
   grep -r "interface Product" src/
   ```

2. **Replace with imports:**
   ```typescript
   // Before
   interface Product { id: string; name: string }
   
   // After
   import type { Product } from '../../../../shared/types'
   ```

3. **Update page-specific types:**
   ```typescript
   // Page types should only define page-specific structures
   // and re-export shared types
   ```

## Benefits

✅ **Single source of truth** - All types defined once  
✅ **Type safety** - Compile-time errors prevent bugs  
✅ **Auto-completion** - Better IDE support  
✅ **Refactoring** - Easy to update types globally  
✅ **Consistency** - Same types in main and renderer processes  
✅ **Maintainability** - Less code duplication  

## Type Hierarchies

### Product Type Family
```
Product (base)
  ├── ProductVariant (variation)
  ├── ProductImage (media)
  └── InventoryItem (extended with calculations)
```

### Financial Type Family
```
Transaction (base)
  └── TransactionType (enum)

Sale (base)
  └── SaleItem (line items)

FinancialMetrics (analytics)
TopProduct (rankings)
```

### User Type Family
```
User (base)
  ├── Role (enum)
  └── Employee (extended)
```

## Testing Types

Use TypeScript's utility types for test data:

```typescript
import type { Product } from '../../../../shared/types'

const mockProduct: Product = {
  id: 'test-1',
  name: 'Test Product',
  // ... all required fields
}

// Or use Partial for incomplete test data
const partialProduct: Partial<Product> = {
  name: 'Test Product'
}
```

## Contributing

When adding new types:

1. **Determine scope:** Is it shared or page-specific?
2. **Check for duplicates:** Search existing types first
3. **Add to correct location:**
   - Shared → `src/shared/types.ts`
   - Page-specific → `src/renderer/src/pages/[Page]/types.ts`
4. **Add JSDoc comments:** Document complex types
5. **Update this guide:** Keep documentation current

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Type vs Interface](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
