/**
 * Legacy re-export shim. The implementation now lives in `./core/engine`.
 * This file exists so any code still importing from `./verification/engine`
 * continues to resolve. The old duplicate implementation was removed during
 * the claim-separation refactor (it consolidated claims into one compound
 * assertion, causing date/entity conflation).
 */
export { VerificationEngine } from "./core/engine";
