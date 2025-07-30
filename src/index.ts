/**
 * @synet/state - Simple state management for complex Unit compositions
 * 
 * Provides lightweight state containers for Units that need to coordinate
 * multiple internal operations while preserving Unit Architecture principles.
 * 
 * @version 1.0.0
 */

export { State, type StateConfig, type StateProps } from './state.unit.js';

// Factory function for clean API
export const STATE = {
  create: (config: StateConfig) => State.create(config)
};

// Re-export types for convenience
export type { TeachingContract } from '@synet/unit';

import type { StateConfig } from './state.unit.js';
import { State } from './state.unit.js';
