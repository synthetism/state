import { describe, it, expect } from 'vitest';
import { createState } from '../src/index.js';
import { createCircuitState } from './fixtures/functions.js';


describe('StateUnit Circuit-Breaker Integration', () => {
  it('should support circuit-breaker state patterns', () => {
    // Circuit breaker state for URL-specific failure tracking
    const circuitState = createCircuitState('https://api.example.com', {
      successCount: 0,
      openedAt: null,
      nextRetryAt: null
    });

    const stateChangeEvents: unknown[] = [];
    
    // Listen to state transitions
    circuitState.on('state.changed', (data) => {
      stateChangeEvents.push(data);
    });

    // 1. Simulate failure sequence
    circuitState.set('failures', 1);
    circuitState.set('lastFailure', Date.now());

    expect(circuitState.get('failures')).toBe(1);
    expect(circuitState.get('state')).toBe('CLOSED'); // Still closed
    
    // 2. Trigger circuit opening (threshold reached)
    circuitState.set('failures', 5);
    circuitState.set('state', 'OPEN');
    circuitState.set('openedAt', Date.now());
    circuitState.set('nextRetryAt', Date.now() + 30000); // 30s timeout

    expect(circuitState.get('state')).toBe('OPEN');
    expect(circuitState.get('openedAt')).toBeTruthy();
    expect(stateChangeEvents.length).toBeGreaterThan(0);

    // 3. Simulate half-open attempt
    circuitState.set('state', 'HALF_OPEN');
    circuitState.set('successCount', 0);

    expect(circuitState.get('state')).toBe('HALF_OPEN');

    // 4. Success - close circuit
    circuitState.set('successCount', 1);
    circuitState.set('state', 'CLOSED');
    circuitState.set('failures', 0);
    circuitState.set('openedAt', null);

    expect(circuitState.get('state')).toBe('CLOSED');
    expect(circuitState.get('failures')).toBe(0);
    
    // Should have captured state transitions
    expect(stateChangeEvents.length).toBeGreaterThan(0);
  });

  it('should support URL-specific circuit state tracking', () => {
    // Multiple circuit states for different URLs
    const api1State = createCircuitState('https://api1.example.com');
    const api2State = createCircuitState('https://api2.example.com', {
      state: 'OPEN',
      failures: 10
    });

    // Different URLs have independent state
    expect(api1State.get('state')).toBe('CLOSED');
    expect(api2State.get('state')).toBe('OPEN');
    
    expect(api1State.get('failures')).toBe(0);
    expect(api2State.get('failures')).toBe(10);

    // Verify original URLs are preserved in state
    expect(api1State.get('url')).toBe('https://api1.example.com');
    expect(api2State.get('url')).toBe('https://api2.example.com');

    // Identity verification with transformed IDs
    expect(api1State.whoami()).toContain('api1-example-com');
    expect(api2State.whoami()).toContain('api2-example-com');
  });

  it('should provide state snapshot for circuit monitoring', () => {
    const circuitState = createState('circuit-monitor', {
      state: 'HALF_OPEN',
      failures: 3,
      lastFailure: 1659456000000,
      successCount: 0,
      requestCount: 15,
      errorRate: 0.2
    });

    const snapshot = circuitState.getAll();
    
    // Complete circuit state for monitoring
    expect(snapshot).toEqual({
      state: 'HALF_OPEN',
      failures: 3,
      lastFailure: 1659456000000,
      successCount: 0,
      requestCount: 15,
      errorRate: 0.2
    });

    // Verify state values accessible
    expect(circuitState.has('errorRate')).toBe(true);
    expect(circuitState.get<number>('errorRate')).toBe(0.2);
  });
});
