# Database Seed Scripts

This project has two seed scripts for different environments:

## 1. Production Seed (`seed-production.ts`)

**Use for**: Production deployment, fresh installations

**Creates**:
- 1 setup account (admin)
- Empty database ready for real data

**Run**:
```bash
npm run prisma:seed:prod
```

**Login**:
- Username: `setup`
- Password: `setup123`

---

## 2. Development Seed (`seed-development.ts`)

**Use for**: Development, testing, performance testing

**Creates** (simulating 4 years of business):
- **50,000 products** added progressively over 3 years
- **1,000,000 sales** distributed over 4 years
- **10,000 customers** with loyalty tiers
- **3 stores** with employees
- Realistic seasonal variations in sales
- Financial transactions

**Run**:
```bash
npm run prisma:seed:dev
```

**Estimated time**: 10-30 minutes depending on your system

**Login Accounts**:
- Setup: `setup` / `setup123`
- Admin: `admin` / `admin123`  
- Manager: `manager` / `manager123`

---

## Data Distribution

### Products (50k over 3 years)
- Electronics: 15%
- Clothing: 25%
- Home & Kitchen: 20%
- Sports & Fitness: 10%
- Books & Media: 8%
- Food & Beverages: 12%
- Beauty & Health: 10%

Products are created with:
- Realistic pricing ($5-$500)
- Multiple variants (colors, sizes)
- Stock levels (0-500 units)
- Placeholder images

### Sales (1M over 4 years)
- Distributed from 4 years ago to present
- Seasonal variations (higher in Nov/Dec)
- Random customers from 10k customer pool
- Multiple payment methods (cash, credit, debit)
- 1-3 items per sale

### Performance Characteristics

The development seed creates a **realistic large dataset** to test:
- Query performance with 50k products
- Pagination with millions of records
- Search functionality under load
- Dashboard analytics with historical data
- Report generation speed
- Database indexing effectiveness

---

## Quick Start

### For Fresh Development:
```bash
# Reset database and create dev data
npx prisma migrate reset
npm run prisma:seed:dev
```

### For Production Deploy:
```bash
# Create production database with setup account
npx prisma migrate deploy
npm run prisma:seed:prod
```

### For Quick Testing:
```bash
# Just setup account, no sample data
npm run prisma:seed:prod
```

---

## Database Size Estimates

- **Production**: ~10 KB (setup account only)
- **Development**: ~2-5 GB (50k products + 1M sales)

---

## Notes

- Development seed processes data in batches for memory efficiency
- Sales are distributed realistically over time
- Customer spending follows realistic patterns
- Products have authentic pricing and variants
- All dates are relative to current date
- Placeholder images used for all products

---

## Troubleshooting

**Seed takes too long?**
- Reduce `CONFIG.TOTAL_PRODUCTS` in `seed-development.ts`
- Reduce `CONFIG.TOTAL_SALES` in `seed-development.ts`

**Out of memory?**
- Reduce `CONFIG.BATCH_SIZE` to process smaller chunks
- Close other applications
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run prisma:seed:dev`

**Database locked?**
- Close the app before seeding
- Close Prisma Studio if open
- Delete `dev.db-journal` file if it exists
