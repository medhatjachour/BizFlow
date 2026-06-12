---
mode: agent
---

# Project Context
I’m building a high-performance **desktop management system** using **Electron.js + Next.js (TypeScript) + Tailwind CSS + Prisma (SQLite)**.  
The app manages **sales, inventory, and financial operations** for small businesses and must support **multi-user access with roles and permissions**.

# Architecture
- **Electron (Main Process)**: Manages app lifecycle, windows, and IPC.
- **Preload Script**: Exposes secure, throttled APIs via `contextBridge`.
- **Renderer (UI)**: Built with Next.js + React + Tailwind CSS.
- **Database**: SQLite via Prisma ORM with optimized schema and raw SQL support.
- **IPC**: Efficient, non-blocking communication between renderer and main process.
- **Auth**: Multi-user login with roles (`admin`, `sales`, `inventory`, `finance`) and scoped access.

# Performance Goals
- Handle **large datasets** (thousands of records) smoothly with **no lag or memory leaks**.
- Optimize **SQL queries** using indexes, joins, and constraints.
- Implement **pagination**, **virtual scrolling**, and **lazy loading** in the UI.
- Use **debounced filters**, **memoized charts**, and **background data loading**.
- Ensure **non-blocking IPC handlers** and support **streamed or batched responses**.
- Profile and tune performance using **SQLite EXPLAIN**, **React Profiler**, and **Electron tools**.


# Instructions for Copilot
- Always use **TypeScript** and **async/await**.
- Prioritize **performance**, **SQL efficiency**, and **smooth UX**.
- Use **Prisma raw SQL** for complex joins and aggregations.
- Apply **SQLite indexes** on foreign keys, timestamps, and filterable fields.
- Implement **React Window** or **TanStack Virtual** for large tables.
- Use **Web Workers** or **Electron background processes** for heavy computation.
- Follow **clean architecture**: separate main, preload, and renderer logic.
- Enforce **role-based access control** in both backend (IPC) and frontend (UI).
- Provide **boilerplate + example implementations**.
- Suggest **best practices** for scalability, performance, and maintainability.