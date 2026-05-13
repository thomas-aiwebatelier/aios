export {
  getProdDb,
  closeProdDb,
  getTestDb,
  runMigrations,
  type Db,
} from "./client.js";

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
  type LeadStatus,
  type GeneratedSiteCreatedVia,
  type OutreachDirection,
  type OutreachStatus,
  type PipelineJobStatus,
  type InboundInquiryStatus,
  type InventoryPage,
  type InventoryAsset,
} from "./schema.js";
