# Restaurant Plugin — Features & Screenshots

This document lists the Restaurant plugin features and includes example screenshots for documentation and marketing purposes. Place screenshots in `docs/assets/restaurant/` and name them `floorplan.png`, `orders.png`, `menu.png`, `reports.png`.

**Quick summary**
- **Tables & Floorplan**: Manage table layouts, reservations, and seating.
- **Orders & Kitchen Tickets**: Send orders to kitchen printers, modifiers, and course timers.
- **Menu & Modifiers**: Menu items with modifiers, allergens, and pricing tiers.
- **POS & Payments**: Table/quick-serve POS flows, split bills, and tips.
- **Reports**: Sales by period, menu performance, and kitchen throughput.

---

## Features (Detailed)

- **Floorplan & Reservations**
  - Create floor layouts, assign sections to staff, and manage reservations.
  - Example screenshot: ![Floorplan](assets/restaurant/floorplan.png)

- **Orders & Kitchen Integration**
  - Create orders with modifiers, print kitchen tickets, and track order status.
  - Example screenshot: ![Orders](assets/restaurant/orders.png)

- **Menu Management**
  - Manage menu items, categories, pricing, and modifier sets.
  - Example screenshot: ![Menu](assets/restaurant/menu.png)

- **Reports & Analytics**
  - Sales by menu item, table turnover, and peak hours analysis.
  - Example screenshot: ![Reports](assets/restaurant/reports.png)

---

## Where to find code

- Main process handlers: [src/main/ipc/handlers](src/main/ipc/handlers)
- Renderer UI: [src/renderer/src/plugins/restaurant](src/renderer/src/plugins/restaurant)
- Prisma schema (restaurant additions): `src/plugins/restaurant/schema.prisma`

---

## Adding screenshots

Place production screenshots in `docs/assets/restaurant/`. Use PNG or JPG and keep sizes under 400 KB.
