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
  emailTemplates,
  sequenceSteps,
  leadActivities,
  // Enum value arrays
  leadStatusValues,
  generatedSiteCreatedViaValues,
  outreachDirectionValues,
  outreachStatusValues,
  pipelineJobStatusValues,
  inboundInquiryStatusValues,
  logoSourceValues,
  salesStageValues,
  sequenceAngleValues,
  sequenceStepStatusValues,
  activityTypeValues,
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
  type SalesStage,
  type SequenceAngle,
  type SequenceStepStatus,
  type ActivityType,
} from "./schema.js";
