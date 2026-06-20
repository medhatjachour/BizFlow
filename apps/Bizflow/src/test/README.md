# Test Structure and Organization

This document describes the test organization and structure for the Electron application.

## Directory Structure

```
src/test/
├── setup.ts              # Global test setup and configuration
├── test-utils.ts         # Common test utilities and mocks
├── unit/                 # Unit tests (isolated components/functions)
│   ├── components/       # Component unit tests
│   ├── hooks/           # Custom hook tests
│   ├── utils/           # Utility function tests
│   └── services/        # Main process service tests
└── integration/          # Integration tests (page-level, multi-component)
    ├── pages/           # Page component integration tests
    └── workflows/       # Business workflow tests
```

## Test Categories

### Unit Tests (`src/test/unit/`)
- **Components**: Test individual React components in isolation
- **Hooks**: Test custom React hooks functionality
- **Utils**: Test utility functions and helpers
- **Services**: Test main process business logic services

### Integration Tests (`src/test/integration/`)
- **Pages**: Test complete page components with all dependencies
- **Workflows**: Test end-to-end business processes

## Test Setup

### Global Setup (`setup.ts`)
- Configures Vitest environment
- Sets up localStorage and timer mocks
- Provides global IPC mocks
- Configures React Testing Library

### Test Utilities (`test-utils.ts`)
- Common mock implementations (Toast, Language, Auth, etc.)
- Mock data factories
- Test wrapper components
- Helper functions

## Mock Strategy

### Context Mocks
All React contexts are mocked at the test level:
- `AuthContext`: User authentication state
- `ToastContext`: Notification system
- `LanguageContext`: Internationalization
- `DisplaySettingsContext`: UI preferences

### IPC Mocks
Window API calls are mocked to simulate main process communication:
- Product operations
- Customer operations
- Sales transactions
- Employee management

### Repository Mocks
Database operations are mocked to test business logic in isolation.

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/test/unit/utils/cn.test.ts
```

## Test Coverage Goals

Current Status: ~15-20% coverage
Target: 80%+ coverage

### High Priority Areas
1. **Core Business Logic**: Product, Customer, Employee, Sales services
2. **Critical UI Components**: POS, Inventory, Reports
3. **Custom Hooks**: Data fetching, form handling, state management
4. **Utility Functions**: Formatting, validation, calculations

### Coverage Metrics
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >85%
- **Lines**: >80%

## Best Practices

### Test Naming
- Use descriptive test names that explain the behavior
- Follow the pattern: `should [expected behavior] when [condition]`

### Test Structure
```typescript
describe('ComponentName', () => {
  describe('Feature', () => {
    it('should behave correctly', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### Mock Management
- Mock external dependencies (contexts, IPC, repositories)
- Use realistic mock data
- Reset mocks between tests

### Async Testing
- Use `async/await` for asynchronous operations
- Use `waitFor` for React state updates
- Mock timers for time-dependent logic

## Adding New Tests

1. Determine test category (unit vs integration)
2. Create test file in appropriate directory
3. Import necessary mocks and utilities
4. Follow established patterns
5. Run tests to ensure they pass
6. Update coverage goals as needed