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
  workerHeartbeats,
  // Enum value arrays
  leadStatusValues,
  generatedSiteCreatedViaValues,
  outreachDirectionValues,
  outreachStatusValues,
  pipelineJobStatusValues,
  inboundInquiryStatusValues,
  logoSourceValues,
  // Types
  type LeadStatus,
  type LogoSource,
  type GeneratedSiteCreatedVia,
  type OutreachDirection,
  type OutreachStatus,
  type PipelineJobStatus,
  type InboundInquiryStatus,
  type InventoryPage,
  type InventoryAsset,
  type WorkerHostInfo,
} from "./schema.js";
