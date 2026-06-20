# Bakery Plugin — Features & Screenshots

This document lists the Bakery plugin features and includes example screenshots for documentation and marketing purposes. Place screenshots in `docs/assets/bakery/` and name them `production.png`, `orders.png`, `products.png`, `reports.png`.

**Quick summary**
- **Recipes & Production**: Define recipes, scale batches, and schedule production runs.
- **Ingredient Inventory**: Track ingredients, lot control, and waste logs.
- **Sales & Orders**: POS sales, wholesale orders, and pickup schedules.
- **Reports**: Production yield, ingredient usage, and sales by product.

---

## Features (Detailed)

- **Recipes & Batch Production**
  - Create multi-step recipes with ingredient lists and yields.
  - Generate production batches and print batching tickets.
  - Example screenshot: ![Production](assets/bakery/production.png)

- **Ingredient Inventory & Waste**
  - Track ingredient stock, reorder points, and record waste/loss.
  - Example screenshot: ![Orders](assets/bakery/orders.png)

- **Orders & POS**
  - Take retail and wholesale orders, schedule pick-ups, and integrate with POS.
  - Example screenshot: ![Products](assets/bakery/products.png)

- **Reports & Analytics**
  - Production efficiency, top-selling items, and cost-of-goods-sold (COGS).
  - Example screenshot: ![Reports](assets/bakery/reports.png)

---

## Where to find code

- Main process handlers: [src/main/ipc/handlers](src/main/ipc/handlers)
- Renderer UI: [src/renderer/src/plugins/bakery](src/renderer/src/plugins/bakery)
- Prisma schema (bakery additions): `src/plugins/bakery/schema.prisma`

---

## Adding screenshots

Place production screenshots in `docs/assets/bakery/`. Use PNG or JPG and keep sizes under 400 KB.
