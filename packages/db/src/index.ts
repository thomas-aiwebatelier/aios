export { createDb, createSchema, runMigrations, type Db } from "./client.js";

export * as schema from "./schema.js";

// Convenience re-exports of all table objects
export {
  leads,
  brandProfiles,
  siteInventories,
  competitors,
  generatedSites,
  outreachMessages,
  pipelineJobs,
  inboundInquiries,
  // Enum value arrays
  leadStatusValues,
  generatedSiteCreatedViaValues,
  outreachDirectionValues,
  outreachStatusValues,
  pipelineJobStatusValues,
  inboundInquiryStatusValues,
  // Types
  type InventoryPage,
  type InventoryAsset,
} from "./schema.js";
