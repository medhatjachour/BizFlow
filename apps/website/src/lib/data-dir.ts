import path from "node:path";

export const dataDir = process.env.BIZFLOW_DATA_DIR ?? path.join(process.cwd(), ".data");