-- Creates SurveyRound, SurveyResponse, SurveyIndicatorValue tables + enums.
-- Idempotent: safe to run multiple times.

BEGIN;

-- ─── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "SurveyRoundType" AS ENUM ('BASELINE', 'MIDLINE', 'ENDLINE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SurveyRoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CONFIRMED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SurveyResponseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── SurveyRound ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SurveyRound" (
  "id"          SERIAL PRIMARY KEY,
  "type"        "SurveyRoundType" NOT NULL UNIQUE,
  "label"       TEXT NOT NULL,
  "year"        INTEGER NOT NULL,
  "description" TEXT,
  "targetCount" INTEGER NOT NULL DEFAULT 0,
  "status"      "SurveyRoundStatus" NOT NULL DEFAULT 'DRAFT',
  "openedAt"    TIMESTAMP(3),
  "closedAt"    TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "SurveyRound_status_idx" ON "SurveyRound"("status");
CREATE INDEX IF NOT EXISTS "SurveyRound_year_idx" ON "SurveyRound"("year");

-- ─── SurveyResponse ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SurveyResponse" (
  "id"                     SERIAL PRIMARY KEY,
  "roundId"                INTEGER NOT NULL
    REFERENCES "SurveyRound"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "beneficiaryId"          INTEGER
    REFERENCES "Beneficiary"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "beneficiaryUhid"        TEXT,
  "localId"                TEXT,
  "deviceId"               TEXT,
  "fullName"               TEXT,
  "district"               TEXT,
  "block"                  TEXT,
  "village"                TEXT,
  "gender"                 TEXT,
  "isYouth"                BOOLEAN NOT NULL DEFAULT false,
  "isBpl"                  BOOLEAN NOT NULL DEFAULT false,
  "category"               TEXT,
  "annualIncome"           DOUBLE PRECISION,
  "landHolding"            DOUBLE PRECISION,
  "householdAssets"        JSONB,
  "cropData"               JSONB,
  "isFpoMember"            BOOLEAN,
  "fpoName"                TEXT,
  "fpoSalesIncrease"       BOOLEAN,
  "fpoServicesRating"      INTEGER,
  "satisfactionScore"      INTEGER,
  "decisionInfluenceScore" INTEGER,
  "remarks"                TEXT,
  "status"                 "SurveyResponseStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt"            TIMESTAMP(3),
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  UNIQUE ("roundId", "localId"),
  UNIQUE ("roundId", "beneficiaryId")
);

CREATE INDEX IF NOT EXISTS "SurveyResponse_roundId_idx" ON "SurveyResponse"("roundId");
CREATE INDEX IF NOT EXISTS "SurveyResponse_district_idx" ON "SurveyResponse"("district");
CREATE INDEX IF NOT EXISTS "SurveyResponse_block_idx" ON "SurveyResponse"("block");
CREATE INDEX IF NOT EXISTS "SurveyResponse_status_idx" ON "SurveyResponse"("status");
CREATE INDEX IF NOT EXISTS "SurveyResponse_beneficiaryUhid_idx" ON "SurveyResponse"("beneficiaryUhid");

-- ─── SurveyIndicatorValue ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SurveyIndicatorValue" (
  "id"                SERIAL PRIMARY KEY,
  "roundId"           INTEGER NOT NULL
    REFERENCES "SurveyRound"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "indicatorId"       INTEGER NOT NULL
    REFERENCES "Indicator"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "computedValue"     DOUBLE PRECISION,
  "reviewedValue"     DOUBLE PRECISION,
  "reviewNotes"       TEXT,
  "sampleSize"        INTEGER,
  "unit"              TEXT,
  "methodology"       TEXT,
  "writtenToLogframe" BOOLEAN NOT NULL DEFAULT false,
  "writtenAt"         TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,
  UNIQUE ("roundId", "indicatorId")
);

CREATE INDEX IF NOT EXISTS "SurveyIndicatorValue_roundId_idx" ON "SurveyIndicatorValue"("roundId");
CREATE INDEX IF NOT EXISTS "SurveyIndicatorValue_indicatorId_idx" ON "SurveyIndicatorValue"("indicatorId");

COMMIT;
