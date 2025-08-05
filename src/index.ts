/**
 * @synet/state - Simple state management for complex Unit compositions
 * 
 * Provides lightweight state containers for Units that need to coordinate
 * multiple internal operations while preserving Unit Architecture principles.
 * 
 * @version 1.0.0
 */

export { State, type StateConfig, type StateProps } from './state.unit.js';
export { StateAsync, type StateAsyncConfig, type StateAsyncProps, type StorageBinding } from './state-async.unit.js';

// Convenience factory for common patterns
export function createState(unitId: string, initialState: Record<string, unknown> = {}) {
  return State.create({ unitId, initialState });
}


// Factory function for clean API
export const STATE = {
  create: (config: StateConfig) => State.create(config)
};

import type { StateConfig } from './state.unit.js';
import { State } from './state.unit.js';
