import {
  webAdminApi,
  normalizePaginatedList,
  generateIdempotencyKey,
  type CareProgramRuleListProgramsRequest,
  type CareProgramRuleGetProgramResponse,
  type CareProgramRuleGetRuleResponse,
  type CareTaskScheduleResponse,
} from "@/lib/api";
import type { CareTaskTemplateItem, EducationCatalogItem } from "../constants";

export type ProgramStatus = "draft" | "published" | "retired";
export type RuleStatus = "draft" | "active" | "retired";
export type RuleView = "active" | "draft";

export interface CareProgramRecord {
  id: string;
  programCode: string;
  version: number;
  revision: number;
  name: string;
  diseaseKey: string;
  description: string;
  status: ProgramStatus;
  baselineKeys: string[];
  taskTemplates: CareTaskTemplateItem[];
  completionSummary: string;
  completionCriteria?: Record<string, unknown>;
  reminderPolicy: Record<string, unknown>;
  contentJourney: EducationCatalogItem[];
  dataSources: Array<Record<string, unknown>>;
  lastUpdated: string;
  publishedAt?: string;
  retiredAt?: string;
  hasDetailLoaded: boolean;
}

export interface DeclarativeRuleNode {
  operator: string;
  key?: string;
  value?: string | number | boolean;
  min?: number;
  max?: number;
  rules?: Array<Record<string, unknown>>;
  reasonCode?: string;
  severity?: "attention" | "urgent";
}

export interface CareRuleTestSummary {
  status: "passed" | "failed" | "unavailable";
  total?: number;
  passed?: number;
  failed?: number;
  reasonCodes?: string[];
  interpreterVersion?: string;
  executedAt?: string;
}

export interface CareRuleTestScenario {
  scenarioKey: string;
  passed: boolean;
  expectedSeverity?: "attention" | "urgent" | "normal";
  actualSeverity?: "attention" | "urgent" | "normal";
  reasonCodes?: string[];
}

export interface CareRuleRecord {
  id: string;
  careProgramId: string;
  programName: string;
  programCode: string;
  programStatus: ProgramStatus;
  view: RuleView;
  version: number;
  revision?: number;
  status: RuleStatus;
  rules: DeclarativeRuleNode[];
  dataSources: Array<{
    kind: "care_task_check_in";
    schemaVersion: "health-check-in.v1";
    templateKey: string;
    allowedFactPrefixes: string[];
  }>;
  testSummary?: CareRuleTestSummary;
  testResults?: CareRuleTestScenario[];
  primaryMetric: string;
  primaryOperator: string;
  primaryThreshold: number;
  primarySeverity: "Attention" | "Urgent";
  conditionSummary: string;
  sourceType: "health_metric" | "care_task_check_in";
  templateKey?: string;
}

export interface CreateCareProgramInput {
  programCode?: string;
  name: string;
  diseaseKey: string;
  description: string;
  baselineKeys: string[];
  taskTemplates: CareTaskTemplateItem[];
  completionSummary: string;
  publishImmediately: boolean;
}

export interface UpdateCareProgramInput {
  name: string;
  diseaseKey: string;
  description: string;
  baselineKeys: string[];
  taskTemplates: CareTaskTemplateItem[];
  completionSummary: string;
}

export interface CreateOrUpdateRuleInput {
  careProgramId: string;
  sourceType: "health_metric" | "care_task_check_in";
  templateKey?: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: "Attention" | "Urgent";
  reasonCode?: string;
}

const BASELINE_FIELD_SCHEMAS: Record<
  string,
  {
    key: string;
    type: "number" | "integer" | "boolean" | "string" | "date";
    unit?: string;
    range?: { min?: number; max?: number };
    required: boolean;
    visibility: "patient" | "care_team";
  }
> = {
  systolic: {
    key: "usual_systolic",
    type: "number",
    unit: "mmHg",
    range: { min: 50, max: 300 },
    required: true,
    visibility: "care_team",
  },
  diastolic: {
    key: "usual_diastolic",
    type: "number",
    unit: "mmHg",
    range: { min: 30, max: 200 },
    required: true,
    visibility: "care_team",
  },
  glucose: {
    key: "usual_fasting_glucose",
    type: "number",
    unit: "mg/dL",
    range: { min: 20, max: 600 },
    required: true,
    visibility: "care_team",
  },
  weight: {
    key: "usual_weight",
    type: "number",
    unit: "kg",
    range: { min: 20, max: 350 },
    required: true,
    visibility: "patient",
  },
  heartRate: {
    key: "usual_heart_rate",
    type: "integer",
    unit: "bpm",
    range: { min: 30, max: 250 },
    required: true,
    visibility: "care_team",
  },
  hba1c: {
    key: "baseline_hba1c",
    type: "number",
    unit: "%",
    range: { min: 3, max: 20 },
    required: false,
    visibility: "care_team",
  },
  medications: {
    key: "current_medications",
    type: "string",
    required: false,
    visibility: "care_team",
  },
  symptoms: {
    key: "baseline_symptoms",
    type: "string",
    required: false,
    visibility: "patient",
  },
};

const REVERSE_BASELINE_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(BASELINE_FIELD_SCHEMAS).map(([uiKey, def]) => [def.key, uiKey])
);

const UI_TO_BE_OPERATOR: Record<string, string> = {
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  "==": "equal",
  "!=": "not_equal",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  equal: "equal",
  not_equal: "not_equal",
};

const BE_TO_UI_OPERATOR: Record<string, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  equal: "==",
  not_equal: "!=",
  between: "between",
  exists: "exists",
};

const UI_METRIC_TO_BE_KEY: Record<string, string> = {
  Systolic: "systolic",
  Diastolic: "diastolic",
  Glucose: "value",
  HeartRate: "value",
  SymptomSeverityRank: "check_in.severity_rank",
  ChestPainReported: "check_in.symptom.chest_pain",
  ShortnessOfBreathReported: "check_in.symptom.shortness_of_breath",
  DizzinessReported: "check_in.symptom.dizziness",
};

const BE_KEY_TO_UI_METRIC: Record<string, string> = {
  systolic: "Systolic",
  diastolic: "Diastolic",
  value: "Glucose",
  "check_in.severity_rank": "SymptomSeverityRank",
  "check_in.symptom.chest_pain": "ChestPainReported",
  "check_in.symptom.shortness_of_breath": "ShortnessOfBreathReported",
  "check_in.symptom.dizziness": "DizzinessReported",
};

function sanitizeSnakeKey(raw: string, fallback: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+/, "");
  const prefixed = /^[a-z]/.test(normalized) ? normalized : `${fallback}_${normalized}`;
  const clean = prefixed.slice(0, 64);
  return /^[a-z][a-z0-9_]{0,63}$/.test(clean) ? clean : fallback;
}

export function slugifyProgramCode(name: string): string {
  const ascii = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (ascii || "care-program").slice(0, 120);
}

function buildBaselineForm(baselineKeys: string[]) {
  const keys = baselineKeys.length > 0 ? baselineKeys : ["systolic", "diastolic"];
  const fields = keys.map((k) => {
    const known = BASELINE_FIELD_SCHEMAS[k];
    if (known) return known;
    return {
      key: sanitizeSnakeKey(k, "baseline_field"),
      type: "string" as const,
      required: false,
      visibility: "care_team" as const,
    };
  });
  return { schemaVersion: "v1", fields };
}

function inferMetricType(diseaseKey: string): string {
  if (diseaseKey === "diabetes") return "blood_glucose";
  if (diseaseKey === "hypertension" || diseaseKey === "cardiovascular") return "blood_pressure";
  return "heart_rate";
}

function buildTaskTemplatesPayload(
  templates: CareTaskTemplateItem[],
  diseaseKey: string
): Array<Record<string, unknown>> {
  const usedKeys = new Set<string>();
  return templates.map((tpl, idx) => {
    const baseKey = sanitizeSnakeKey(tpl.key || `${tpl.type}_task_${idx + 1}`, `task_${idx + 1}`);
    let uniqueKey = baseKey;
    let suffix = 1;
    while (usedKeys.has(uniqueKey)) {
      uniqueKey = `${baseKey.slice(0, 56)}_${suffix++}`;
    }
    usedKeys.add(uniqueKey);

    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(tpl.time) ? tpl.time : "08:00";
    const windowMinutes = Math.max(1, Math.min(1440, Math.round(Number(tpl.windowMinutes) || 120)));

    const payload: Record<string, unknown> = {
      key: uniqueKey,
      type: tpl.type,
      required: true,
      schedule: {
        frequency: "daily",
        time,
        windowMinutes,
      },
      reminderPolicy: { channels: ["in_app"] },
    };

    if (tpl.type === "check_in") {
      const codes = (tpl.allowedSymptomCodes && tpl.allowedSymptomCodes.length > 0
        ? tpl.allowedSymptomCodes
        : ["chest_pain", "dizziness"]
      ).map((c) => sanitizeSnakeKey(c, "symptom"));
      payload.completionRule = {
        responseMode: "health_check_in",
        schemaVersion: "health-check-in.v1",
        allowedSymptomCodes: Array.from(new Set(codes)).slice(0, 64),
      };
    } else if (tpl.type === "education") {
      payload.completionRule = { responseMode: "acknowledge" };
      payload.contentRef = {
        contentId: sanitizeSnakeKey(tpl.contentId || "hypertension_salt_guide", "education_content"),
        version: tpl.contentVersion || "v1.0",
        locale: tpl.contentLocale || "vi",
        displayType: tpl.displayType || "article",
      };
    } else if (tpl.type === "metric") {
      payload.completionRule = { metricType: inferMetricType(diseaseKey) };
    } else {
      payload.completionRule = { responseMode: "confirm" };
    }

    return payload;
  });
}

function buildContentJourney(
  templates: CareTaskTemplateItem[],
  catalog: EducationCatalogItem[]
): Array<Record<string, unknown>> {
  const refs = templates.filter((t) => t.type === "education" && t.contentId);
  if (refs.length > 0) {
    return refs.map((t, idx) => {
      const matched = catalog.find((c) => c.contentId === t.contentId);
      return {
        stepOrder: idx + 1,
        contentId: sanitizeSnakeKey(t.contentId || "hypertension_salt_guide", "content_item"),
        version: t.contentVersion || matched?.version || "v1.0",
        locale: t.contentLocale || matched?.locale || "vi",
        displayType: t.displayType || matched?.displayType || "article",
        title: matched?.title || t.contentId,
        summary: matched?.summary || "",
        status: matched?.status || "published",
      };
    });
  }
  return [];
}

function mapBeBaselineKeys(baselineForm: unknown): string[] {
  if (!baselineForm || typeof baselineForm !== "object") return [];
  const fields = (baselineForm as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];
  return fields
    .map((f) => {
      const key = (f as { key?: unknown })?.key;
      if (typeof key !== "string") return null;
      return REVERSE_BASELINE_KEYS[key] || key;
    })
    .filter((k): k is string => Boolean(k));
}

function mapBeTaskTemplates(taskTemplates: unknown): CareTaskTemplateItem[] {
  if (!Array.isArray(taskTemplates)) return [];
  return taskTemplates.map((raw, idx) => {
    const item = raw as Record<string, unknown>;
    const schedule = (item.schedule as Record<string, unknown>) || {};
    const completionRule = (item.completionRule as Record<string, unknown>) || {};
    const contentRef = (item.contentRef as Record<string, unknown>) || undefined;
    const typeRaw = String(item.type || "metric");
    const validType = (
      ["metric", "check_in", "education", "appointment", "doctor_review"].includes(typeRaw)
        ? typeRaw
        : "metric"
    ) as CareTaskTemplateItem["type"];

    return {
      key: typeof item.key === "string" ? item.key : `task_${idx + 1}`,
      type: validType,
      time: typeof schedule.time === "string" ? schedule.time : "08:00",
      windowMinutes: Number(schedule.windowMinutes) || 120,
      allowedSymptomCodes: Array.isArray(completionRule.allowedSymptomCodes)
        ? completionRule.allowedSymptomCodes.filter((c): c is string => typeof c === "string")
        : undefined,
      contentId: typeof contentRef?.contentId === "string" ? contentRef.contentId : undefined,
      contentVersion: typeof contentRef?.version === "string" ? contentRef.version : undefined,
      contentLocale: typeof contentRef?.locale === "string" ? contentRef.locale : undefined,
      displayType:
        contentRef?.displayType === "video" || contentRef?.displayType === "document"
          ? contentRef.displayType
          : contentRef
          ? "article"
          : undefined,
    };
  });
}

function mapBeContentJourney(
  rawList: unknown,
  program: { id: string; name: string }
): EducationCatalogItem[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((raw, idx) => {
    const rec = (raw as Record<string, unknown>) || {};
    const contentId = String(rec.contentId || `content_${idx + 1}`);
    const displayTypeRaw = String(rec.displayType || "article");
    const displayType =
      displayTypeRaw === "video" || displayTypeRaw === "document" ? displayTypeRaw : "article";
    const statusRaw = String(rec.status || "published");
    const status =
      statusRaw === "draft" || statusRaw === "retired" ? statusRaw : "published";
    return {
      id: `${program.id}:${contentId}`,
      contentId,
      version: String(rec.version || "v1.0"),
      locale: String(rec.locale || "vi"),
      displayType,
      title: String(rec.title || contentId),
      summary: String(rec.summary || ""),
      status,
      programId: program.id,
      programName: program.name,
    };
  });
}

function extractCompletionSummary(criteria: unknown): string {
  if (!criteria || typeof criteria !== "object") return "80% adherence over 90 days";
  const rec = criteria as Record<string, unknown>;
  if (typeof rec.summary === "string" && rec.summary.trim()) return rec.summary;
  if (typeof rec.adherenceTargetPercent === "number" && typeof rec.durationDays === "number") {
    return `${rec.adherenceTargetPercent}% / ${rec.durationDays} days`;
  }
  return "80% adherence over 90 days";
}

export function mapBeProgramToRecord(
  raw: Record<string, unknown> | CareProgramRuleGetProgramResponse,
  previous?: CareProgramRecord
): CareProgramRecord {
  const rec = raw as Record<string, unknown>;
  const id = String(rec.id || rec._id || previous?.id || "");
  const name = String(rec.name || previous?.name || "");
  const updatedIso = String(
    rec.updatedAt || rec.publishedAt || rec.retiredAt || previous?.lastUpdated || new Date().toISOString()
  );

  const baselineKeys = rec.baselineForm
    ? mapBeBaselineKeys(rec.baselineForm)
    : previous?.baselineKeys ?? [];

  const taskTemplates = rec.taskTemplates
    ? mapBeTaskTemplates(rec.taskTemplates)
    : previous?.taskTemplates ?? [];

  const contentJourney = rec.contentJourney
    ? mapBeContentJourney(rec.contentJourney, { id, name })
    : previous?.contentJourney ?? [];

  return {
    id,
    programCode: String(rec.programCode || previous?.programCode || ""),
    version: Number(rec.version ?? previous?.version ?? 1),
    revision: Number(rec.revision ?? previous?.revision ?? 1),
    name,
    diseaseKey: String(rec.diseaseKey || previous?.diseaseKey || "general"),
    description: typeof rec.description === "string" ? rec.description : previous?.description || "",
    status: (rec.status as ProgramStatus) || previous?.status || "draft",
    baselineKeys,
    taskTemplates,
    completionSummary: rec.completionCriteria
      ? extractCompletionSummary(rec.completionCriteria)
      : previous?.completionSummary || "80% adherence over 90 days",
    completionCriteria:
      (rec.completionCriteria as Record<string, unknown>) || previous?.completionCriteria,
    reminderPolicy:
      (rec.reminderPolicy as Record<string, unknown>) ||
      previous?.reminderPolicy || { channels: ["in_app"] },
    contentJourney,
    dataSources: Array.isArray(rec.dataSources)
      ? (rec.dataSources as Array<Record<string, unknown>>)
      : previous?.dataSources ?? [],
    lastUpdated: updatedIso,
    publishedAt: typeof rec.publishedAt === "string" ? rec.publishedAt : previous?.publishedAt,
    retiredAt: typeof rec.retiredAt === "string" ? rec.retiredAt : previous?.retiredAt,
    hasDetailLoaded: Boolean(rec.taskTemplates || rec.baselineForm || previous?.hasDetailLoaded),
  };
}

function summarizeRuleNode(node: DeclarativeRuleNode | undefined): string {
  if (!node) return "—";
  if (node.key) {
    const metricLabel = BE_KEY_TO_UI_METRIC[node.key] || node.key;
    const opSymbol = BE_TO_UI_OPERATOR[node.operator] || node.operator;
    if (node.operator === "between") {
      return `${metricLabel} ${node.min ?? "?"}..${node.max ?? "?"}`;
    }
    if (node.operator === "exists") {
      return `${metricLabel} exists`;
    }
    return `${metricLabel} ${opSymbol} ${String(node.value ?? "")}`;
  }
  if (Array.isArray(node.rules) && node.rules.length > 0) {
    return `${node.operator.toUpperCase()}(${node.rules.length})`;
  }
  return node.reasonCode || node.operator;
}

export function mapBeRuleProjectionToRecord(
  dto: CareProgramRuleGetRuleResponse,
  program: CareProgramRecord,
  view: RuleView
): CareRuleRecord {
  const full = dto as {
    id: string;
    careProgramId: string;
    version: number;
    revision?: number;
    status: RuleStatus;
    rules?: DeclarativeRuleNode[];
    dataSources?: CareRuleRecord["dataSources"];
    testSummary?: CareRuleTestSummary;
    testResults?: CareRuleTestScenario[];
  };

  const rules = Array.isArray(full.rules) ? full.rules : [];
  const dataSources = Array.isArray(full.dataSources) ? full.dataSources : [];
  const firstNode = rules[0];
  const rawKey = firstNode?.key || "systolic";
  const isCheckIn = rawKey.startsWith("check_in.") || dataSources.length > 0;
  const primarySeverity = firstNode?.severity === "urgent" ? "Urgent" : "Attention";

  return {
    id: full.id,
    careProgramId: full.careProgramId,
    programName: program.name,
    programCode: program.programCode,
    programStatus: program.status,
    view,
    version: full.version,
    revision: full.revision,
    status: full.status,
    rules,
    dataSources,
    testSummary: full.testSummary,
    testResults: full.testResults,
    primaryMetric: BE_KEY_TO_UI_METRIC[rawKey] || rawKey,
    primaryOperator: BE_TO_UI_OPERATOR[firstNode?.operator || "gte"] || ">=",
    primaryThreshold: typeof firstNode?.value === "number" ? firstNode.value : 0,
    primarySeverity,
    conditionSummary: rules.map(summarizeRuleNode).join(" | ") || "—",
    sourceType: isCheckIn ? "care_task_check_in" : "health_metric",
    templateKey: dataSources[0]?.templateKey,
  };
}

export const careProgramService = {
  async listPrograms(query: CareProgramRuleListProgramsRequest["query"] = { page: 1, limit: 50 }) {
    const res = await webAdminApi.careProgramRuleListPrograms({
      query: { page: 1, limit: 50, ...query },
    });
    const normalized = normalizePaginatedList<Record<string, unknown>>(res);
    const items = normalized.items.map((item) => mapBeProgramToRecord(item));
    return {
      ...normalized,
      items,
    };
  },

  async getProgramDetail(id: string, previous?: CareProgramRecord): Promise<CareProgramRecord> {
    const detail = await webAdminApi.careProgramRuleGetProgram({ params: { id } });
    return mapBeProgramToRecord(detail, previous);
  },

  async createProgram(
    input: CreateCareProgramInput,
    catalog: EducationCatalogItem[]
  ): Promise<CareProgramRecord> {
    const programCode = input.programCode?.trim() || slugifyProgramCode(input.name);
    const body = {
      programCode,
      name: input.name.trim(),
      diseaseKey: input.diseaseKey,
      description: input.description.trim() || undefined,
      baselineForm: buildBaselineForm(input.baselineKeys),
      taskTemplates: buildTaskTemplatesPayload(input.taskTemplates, input.diseaseKey),
      reminderPolicy: { channels: ["in_app"], leadMinutes: 15 },
      completionCriteria: {
        summary: input.completionSummary.trim() || "80% adherence over 90 days",
      },
      contentJourney: buildContentJourney(input.taskTemplates, catalog),
      dataSources: [] as Array<Record<string, unknown>>,
    };

    const idempotencyKey = generateIdempotencyKey();
    const created = await webAdminApi.careProgramRuleCreateProgram({
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
      body,
    });

    const createdRec = created as unknown as Record<string, unknown>;
    const createdId = String(createdRec.id || createdRec._id || "");
    let record = mapBeProgramToRecord(createdRec);

    if (input.publishImmediately && createdId) {
      const published = await webAdminApi.careProgramRulePublishProgram({
        params: { id: createdId },
        body: {
          expectedRevision: record.revision,
          reason: "Published on program creation",
        },
      });
      record = mapBeProgramToRecord(published as unknown as Record<string, unknown>, record);
    }

    return record;
  },

  async updateProgram(
    program: CareProgramRecord,
    input: UpdateCareProgramInput,
    catalog: EducationCatalogItem[]
  ): Promise<CareProgramRecord> {
    const updated = await webAdminApi.careProgramRuleUpdateProgram({
      params: { id: program.id },
      body: {
        expectedRevision: program.revision,
        name: input.name.trim(),
        diseaseKey: input.diseaseKey,
        description: input.description.trim() || undefined,
        baselineForm: buildBaselineForm(input.baselineKeys),
        taskTemplates: buildTaskTemplatesPayload(input.taskTemplates, input.diseaseKey),
        completionCriteria: {
          summary: input.completionSummary.trim() || "80% adherence over 90 days",
        },
        contentJourney: buildContentJourney(input.taskTemplates, catalog),
      } as Record<string, unknown> & { expectedRevision: number },
    });
    return mapBeProgramToRecord(updated as unknown as Record<string, unknown>, program);
  },

  async publishProgram(program: CareProgramRecord, reason: string): Promise<CareProgramRecord> {
    const res = await webAdminApi.careProgramRulePublishProgram({
      params: { id: program.id },
      body: { expectedRevision: program.revision, reason },
    });
    return mapBeProgramToRecord(res as unknown as Record<string, unknown>, program);
  },

  async retireProgram(program: CareProgramRecord, reason: string): Promise<CareProgramRecord> {
    const res = await webAdminApi.careProgramRuleRetireProgram({
      params: { id: program.id },
      body: { expectedRevision: program.revision, reason },
    });
    return mapBeProgramToRecord(res as unknown as Record<string, unknown>, program);
  },

  async getRuleProjection(program: CareProgramRecord, view: RuleView): Promise<CareRuleRecord | null> {
    try {
      const dto = await webAdminApi.careProgramRuleGetRule({
        params: { id: program.id },
        query: { view },
      });
      return mapBeRuleProjectionToRecord(dto, program, view);
    } catch {
      return null;
    }
  },

  buildRuleNodesAndSources(input: CreateOrUpdateRuleInput, existingNodes: DeclarativeRuleNode[] = []) {
    const beKey = UI_METRIC_TO_BE_KEY[input.metric] || sanitizeSnakeKey(input.metric, "value");
    const beOperator = UI_TO_BE_OPERATOR[input.operator] || "gte";
    const severity = input.severity === "Urgent" ? ("urgent" as const) : ("attention" as const);
    const newNode: DeclarativeRuleNode = {
      operator: beOperator,
      key: beKey,
      value: input.threshold,
      severity,
      reasonCode:
        input.reasonCode ||
        sanitizeSnakeKey(`${input.metric}_${severity}`, "clinical_threshold_alert"),
    };

    const rules = [newNode, ...existingNodes].slice(0, 50);
    const dataSources: Array<Record<string, unknown>> =
      input.sourceType === "care_task_check_in" && input.templateKey
        ? [
            {
              kind: "care_task_check_in",
              schemaVersion: "health-check-in.v1",
              templateKey: input.templateKey,
              allowedFactPrefixes: [
                "check_in.overall_status",
                "check_in.severity",
                "check_in.severity_rank",
                "check_in.symptom.",
              ],
            },
          ]
        : [];

    return { rules, dataSources };
  },

  async createRuleDraft(input: CreateOrUpdateRuleInput) {
    const { rules, dataSources } = this.buildRuleNodesAndSources(input);
    return webAdminApi.careProgramRuleCreateRule({
      params: { id: input.careProgramId },
      body: {
        rules: rules as unknown as Array<Record<string, unknown>>,
        dataSources,
      },
    });
  },

  async updateRuleDraft(
    programId: string,
    ruleId: string,
    expectedRevision: number,
    payload: {
      rules?: Array<Record<string, unknown>>;
      dataSources?: Array<Record<string, unknown>>;
      testResults?: Record<string, unknown>;
    }
  ) {
    return webAdminApi.careProgramRuleUpdateRule({
      params: { id: programId, ruleId },
      body: {
        expectedRevision,
        ...payload,
      } as { expectedRevision: number } & Record<string, unknown>,
    });
  },

  async activateRule(programId: string, ruleId: string, expectedRevision: number, reason: string) {
    return webAdminApi.careProgramRuleActivateRule({
      params: { id: programId, ruleId },
      body: { expectedRevision, reason },
    });
  },

  async retireRule(programId: string, ruleId: string, expectedRevision: number, reason: string) {
    return webAdminApi.careProgramRuleRetireRule({
      params: { id: programId, ruleId },
      body: { expectedRevision, reason },
    });
  },

  async scheduleTasks(): Promise<CareTaskScheduleResponse> {
    return webAdminApi.careTaskSchedule();
  },

  async getInboxAlertSummary() {
    const res = await webAdminApi.careAlertInbox({ query: { limit: 50 } });
    return normalizePaginatedList<Record<string, unknown>>(res);
  },
};
