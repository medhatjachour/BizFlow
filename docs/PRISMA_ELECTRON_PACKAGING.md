# Prisma + Electron Packaging Solution

## Problem
Prisma Client uses native binary modules (`.node` files) that need special handling in Electron packaged apps. The error "Cannot find module '.prisma/client/default'" occurs when:
- Native modules are inside the ASAR archive and inaccessible at runtime
- Module resolution doesn't find the Prisma Client in the packaged resources
- Query engine binaries aren't in the expected location

## Solution Overview
We use a **dual-strategy approach**:
1. **extraResources**: Place Prisma modules in `resources/node_modules/` (outside ASAR)
2. **asarUnpack**: Also unpack Prisma from ASAR as a fallback
3. **Custom Module Resolution**: Programmatically configure Node.js to find Prisma
4. **Environment Variables**: Tell Prisma where to find its query engine

## Implementation Details

### 1. electron-builder.yml Configuration

```yaml
files:
  # Include Prisma modules in the build
  - node_modules/.prisma/**/*
  - node_modules/@prisma/client/**/*

extraResources:
  # Place Prisma in resources/ directory (outside ASAR)
  - from: node_modules/.prisma
    to: node_modules/.prisma
  - from: node_modules/@prisma/client
    to: node_modules/@prisma/client

asarUnpack:
  # Also unpack from ASAR as fallback
  - node_modules/.prisma/**/*
  - node_modules/@prisma/client/**/*
```

### 2. Runtime Module Resolution (src/main/ipc/handlers/index.ts)

```typescript
if (!isDev) {
  // Add Prisma paths to Node's global module resolution
  const Module = require('module')
  const prismaClientPath = path.join(process.resourcesPath, 'node_modules', '@prisma', 'client')
  const prismaEnginePath = path.join(process.resourcesPath, 'node_modules', '.prisma', 'client')
  
  Module.globalPaths.push(path.join(process.resourcesPath, 'node_modules'))
  Module.globalPaths.push(prismaClientPath)
  Module.globalPaths.push(prismaEnginePath)
  
  // Set query engine location
  const engineFilename = getPlatformSpecificEngine()
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(prismaEnginePath, engineFilename)
}
```

### 3. Query Engine Binary Names by Platform

- **Windows**: `query_engine-windows.dll.node`
- **macOS (Intel)**: `libquery_engine-darwin.dylib.node`
- **macOS (ARM64/M1)**: `libquery_engine-darwin-arm64.dylib.node`
- **Linux**: `libquery_engine-debian-openssl-3.0.x.so.node`

## Directory Structure in Packaged App

```
dist/linux-unpacked/
├── BizFlow (executable)
└── resources/
    ├── app.asar                           # Main app code
    ├── app.asar.unpacked/                 # Unpacked native modules
    │   └── node_modules/
    │       └── @prisma/...                # Fallback location
    ├── node_modules/                      # Primary Prisma location
    │   ├── .prisma/
    │   │   └── client/
    │   │       ├── libquery_engine-*.node # Native binaries
    │   │       ├── index.js
    │   │       └── schema.prisma
    │   └── @prisma/
    │       └── client/
    │           ├── index.js
    │           ├── default.js
    │           └── package.json
    └── prisma/
        ├── migrations/                    # SQL migration files
        ├── schema.prisma                  # Schema definition
        └── template.db                    # Database file
```

## Testing the Package

### 1. Build Unpacked App
```bash
npm run build:unpack
```

### 2. Verify Prisma Files Exist
```bash
# Check extraResources
ls -la dist/linux-unpacked/resources/node_modules/.prisma/client/
ls -la dist/linux-unpacked/resources/node_modules/@prisma/client/

# Check query engine binaries
find dist/linux-unpacked/resources -name "*.node"
```

### 3. Run the Packaged App
```bash
# Linux
./dist/linux-unpacked/BizFlow

# Check logs for Prisma initialization
tail -f ~/.<appName>/logs/app-*.log | grep Prisma
```

### 4. Expected Log Output (Success)
```
[Prisma] Configuring production module resolution...
[Prisma] resourcesPath: /path/to/resources
[Prisma] Added to global module paths
[Prisma] Query engine path: /path/to/.prisma/client/libquery_engine-*.node
[Prisma] ✓ Loaded via direct path
[Database] ✓ Connected to database
```

### 5. Expected Log Output (Failure)
```
[Prisma] Strategy 1 failed: Cannot find module '.prisma/client/default'
[Prisma] Strategy 2 failed: Cannot find module '@prisma/client'
[Database] ⚠️ Error initializing Prisma: ...
```

## Troubleshooting

### Issue: "Cannot find module '.prisma/client/default'"
**Cause**: Module resolution not finding Prisma
**Solution**: 
- Verify `extraResources` copied files: `ls dist/.../resources/node_modules/`
- Check logs for `resourcesPath` value
- Ensure `Module.globalPaths` has correct paths

### Issue: "Query engine binary not found"
**Cause**: Wrong platform-specific binary name
**Solution**:
- Check which `.node` files exist: `find dist -name "*.node"`
- Update `engineFilename` logic in `handlers/index.ts`
- Regenerate Prisma Client with correct platform

### Issue: "ENOENT: no such file or directory, open '.../schema.prisma'"
**Cause**: Schema file not in extraResources
**Solution**:
- Verify `electron-builder.yml` includes `prisma/schema.prisma`
- Check it exists: `ls dist/.../resources/prisma/schema.prisma`

### Issue: App works in dev but not in production package
**Cause**: Different module resolution between dev and production
**Solution**:
- Test with `NODE_ENV=production npm run dev` first
- Add more logging to see actual paths being used
- Use `console.log` to debug `process.resourcesPath` value

## Performance Considerations

### Cold Start Time
- Prisma Client adds ~200-500ms to app startup
- Query engine binary loading adds ~100-200ms
- Total: ~300-700ms overhead (acceptable for desktop app)

### Alternative: better-sqlite3
If Prisma proves problematic, consider `better-sqlite3`:
- ✅ No query engine binaries needed
- ✅ Simpler packaging (standard native module)
- ✅ 2-24x faster performance
- ✅ Synchronous API (better for Electron)
- ❌ No schema migrations (manual SQL)
- ❌ No type-safe queries (raw SQL strings)

## Migration Notes

### Current System Compatibility
Our `MigrationManager` uses **raw SQL migration files**, which means:
- ✅ Works with Prisma Client (current)
- ✅ Would work with better-sqlite3 (future option)
- ✅ Would work with node-sqlite3 (future option)
- ✅ Database-agnostic approach

### If Switching to better-sqlite3
1. Replace PrismaClient with `better-sqlite3`
2. Keep MigrationManager unchanged (uses raw SQL)
3. Update repositories to use `.prepare()` instead of Prisma syntax
4. Benefit: No packaging complexity, faster performance

## References
- [Prisma + Electron GitHub Issues](https://github.com/prisma/prisma/issues?q=electron)
- [Electron Native Modules Docs](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [better-sqlite3 Package](https://github.com/WiseLibs/better-sqlite3)
- [electron-builder extraResources](https://www.electron.build/configuration/contents#extraresources)

## Version History
- **2025-02-08**: Initial implementation with dual-strategy approach
- Prisma version: 5.4.2
- Electron version: 26.3.0
- Node version: 20.19.30
