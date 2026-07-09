// common/src/featureFlags.ts

/**
 * Legacy script engine is intentionally kept in the codebase, but hidden and
 * inactive by default. New automation should use Automation Flow instead.
 */
export const FEATURE_ENABLE_SCRIPT_ENGINE = false;

/**
 * Server-side Automation Flow runtime is the primary automation engine.
 */
export const FEATURE_ENABLE_AUTOMATION_FLOW_RUNTIME = true;
