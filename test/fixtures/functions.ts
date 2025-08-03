import { State, type StateConfig } from '../../src/state.unit.js';
// URL-safe ID transformation for circuit breakers
export function createCircuitState(url: string, initialState: Record<string, unknown> = {}) {
  // Transform URL to valid Unit ID: https://api.example.com -> circuit-api-example-com
  const safeId = `circuit-${url
    .replace(/https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')}`;
    
  return State.create({ 
    unitId: safeId, 
    initialState: {
      url,  // Keep original URL in state
      state: 'CLOSED',
      failures: 0,
      lastFailure: null,
      ...initialState
    }
  });
}