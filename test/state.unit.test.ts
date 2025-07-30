import { describe, it, expect, vi, beforeEach } from 'vitest';
import { State, type StateConfig } from '../src/state.unit.js';

describe('State Unit', () => {
  let state: State;
  let config: StateConfig;

  beforeEach(() => {
    config = {
      unitId: 'test-unit',
      initialState: {
        connected: false,
        retries: 0,
        metadata: { version: '1.0.0' }
      }
    };
    state = State.create(config);
  });

  describe('Unit Architecture Compliance', () => {
    it('should be created through static factory', () => {
      expect(state).toBeInstanceOf(State);
  
    });

    it('should have proper DNA', () => {
      expect(state.dna.id).toBe('state-test-unit');
      expect(state.dna.version).toBe('1.0.0');
    });

    it('should implement whoami()', () => {
      const identity = state.whoami();
      expect(identity).toBe('State[test-unit] - v1.0.0');
    });

    it('should implement help()', () => {
      const help = state.help();
      expect(help).toContain('State Unit v1.0.0');
      expect(help).toContain('Owner: test-unit');
      expect(help).toContain('get<T>(key)');
      expect(help).toContain('set<T>(key, value)');
    });
  });

  describe('State Operations', () => {
    it('should get initial state values', () => {
      expect(state.get<boolean>('connected')).toBe(false);
      expect(state.get<number>('retries')).toBe(0);
      expect(state.get('metadata')).toEqual({ version: '1.0.0' });
    });

    it('should set and get state values', () => {
      state.set('connected', true);
      expect(state.get<boolean>('connected')).toBe(true);

      state.set('retries', 3);
      expect(state.get<number>('retries')).toBe(3);
    });

    it('should check if keys exist', () => {
      expect(state.has('connected')).toBe(true);
      expect(state.has('nonexistent')).toBe(false);
      
      state.set('new-key', 'value');
      expect(state.has('new-key')).toBe(true);
    });

    it('should return all state', () => {
      const allState = state.getAll();
      expect(allState).toEqual({
        connected: false,
        retries: 0,
        metadata: { version: '1.0.0' }
      });

      // Should be a copy, not reference
      allState.connected = true;
      expect(state.get('connected')).toBe(false);
    });

    it('should handle undefined values gracefully', () => {
      expect(state.get('nonexistent')).toBeUndefined();
    });
  });

  describe('Event System', () => {
    it('should emit events on state changes', () => {
      const handler = vi.fn();
      state.on('connected.changed', handler);

      state.set('connected', true);

      expect(handler).toHaveBeenCalledWith({
        oldValue: false,
        newValue: true
      });
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      state.on('connected.changed', handler1);
      state.on('connected.changed', handler2);

      state.set('connected', true);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should support manual event emission', () => {
      const handler = vi.fn();
      state.on('custom.event', handler);

      state.emit('custom.event', { message: 'Hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'Hello' });
    });

    it('should handle events with no handlers gracefully', () => {
      expect(() => {
        state.emit('nonexistent.event', {});
      }).not.toThrow();
    });

    it('should emit change events for different data types', () => {
      const stringHandler = vi.fn();
      const numberHandler = vi.fn();
      const objectHandler = vi.fn();

      state.on('name.changed', stringHandler);
      state.on('count.changed', numberHandler);
      state.on('config.changed', objectHandler);

      state.set('name', 'test');
      state.set('count', 42);
      state.set('config', { active: true });

      expect(stringHandler).toHaveBeenCalledWith({
        oldValue: undefined,
        newValue: 'test'
      });
      
      expect(numberHandler).toHaveBeenCalledWith({
        oldValue: undefined,
        newValue: 42
      });
      
      expect(objectHandler).toHaveBeenCalledWith({
        oldValue: undefined,
        newValue: { active: true }
      });
    });
  });

  describe('Teaching Contracts', () => {
    it('should teach observation capabilities', () => {
      const contract = state.teach();
      
      expect(contract.unitId).toBe('state-test-unit');
      expect(contract.capabilities).toHaveProperty('get');
      expect(contract.capabilities).toHaveProperty('has');
      expect(contract.capabilities).toHaveProperty('getAll');
      expect(contract.capabilities).toHaveProperty('on');
    });

    it('should not teach mutation capabilities', () => {
      const contract = state.teach();
      
      expect(contract.capabilities).not.toHaveProperty('set');
      expect(contract.capabilities).not.toHaveProperty('emit');
    });

    it('should work with taught capabilities', () => {
      const contract = state.teach();
      
      // Test get capability
      const getValue = contract.capabilities.get;
      expect(getValue('connected')).toBe(false);
      
      // Test has capability
      const hasKey = contract.capabilities.has;
      expect(hasKey('connected')).toBe(true);
      expect(hasKey('nonexistent')).toBe(false);
      
      // Test getAll capability
      const getAllState = contract.capabilities.getAll;
      const allState = getAllState();
      expect(allState).toEqual(config.initialState);
    });

    it('should allow taught event observation', () => {
      const contract = state.teach();
      const handler = vi.fn();
      
      // Use taught on capability
      const addEventListener = contract.capabilities.on;
      addEventListener('connected.changed', handler);
      
      // Original unit changes state
      state.set('connected', true);
      
      expect(handler).toHaveBeenCalledWith({
        oldValue: false,
        newValue: true
      });
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support complex state coordination', () => {
      const networkState = State.create({
        unitId: 'network',
        initialState: {
          connected: false,
          connections: 0,
          retries: 0,
          lastError: null
        }
      });

      const events: string[] = [];
      
      // Listen to various state changes
      networkState.on('connected.changed', () => events.push('connection-changed'));
      networkState.on('retries.changed', () => events.push('retry-changed'));
      networkState.on('network.error', () => events.push('error-occurred'));
      networkState.on('network.ready', () => events.push('ready'));

      // Simulate connection attempt
      networkState.set('retries', 1);
      networkState.set('connected', true);
      networkState.set('connections', 1);
      networkState.emit('network.ready', { timestamp: Date.now() });

      expect(events).toEqual([
        'retry-changed',
        'connection-changed',
        'ready'
      ]);
      
      expect(networkState.get('connected')).toBe(true);
      expect(networkState.get('connections')).toBe(1);
    });

    it('should support initialization tracking', () => {
      const orchestrationState = State.create({
        unitId: 'orchestration',
        initialState: {
          initialized: false,
          childrenReady: 0,
          totalChildren: 3
        }
      });

      let isFullyInitialized = false;

      // Auto-initialize when all children ready
      orchestrationState.on('childrenReady.changed', () => {
        const ready = orchestrationState.get<number>('childrenReady');
        const total = orchestrationState.get<number>('totalChildren');
        
        if (ready === total) {
          orchestrationState.set('initialized', true);
          orchestrationState.emit('orchestration.ready', { timestamp: Date.now() });
        }
      });

      orchestrationState.on('orchestration.ready', () => {
        isFullyInitialized = true;
      });

      // Simulate children becoming ready
      orchestrationState.set('childrenReady', 1);
      expect(isFullyInitialized).toBe(false);
      
      orchestrationState.set('childrenReady', 2);
      expect(isFullyInitialized).toBe(false);
      
      orchestrationState.set('childrenReady', 3);
      expect(isFullyInitialized).toBe(true);
      expect(orchestrationState.get('initialized')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty initial state', () => {
      const emptyState = State.create({
        unitId: 'empty',
        initialState: {}
      });

      expect(emptyState.getAll()).toEqual({});
      expect(emptyState.get('anything')).toBeUndefined();
      expect(emptyState.has('anything')).toBe(false);
    });

    it('should handle complex nested objects', () => {
      const complexState = State.create({
        unitId: 'complex',
        initialState: {
          user: {
            id: 1,
            profile: {
              name: 'Test',
              settings: {
                theme: 'dark'
              }
            }
          },
          items: [1, 2, 3]
        }
      });

      const user = complexState.get<any>('user');
      expect(user.profile.name).toBe('Test');
      
      const items = complexState.get<number[]>('items');
      expect(items).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined values', () => {
      state.set('nullValue', null);
      state.set('undefinedValue', undefined);

      expect(state.get('nullValue')).toBeNull();
      expect(state.get('undefinedValue')).toBeUndefined();
      expect(state.has('nullValue')).toBe(true);
      expect(state.has('undefinedValue')).toBe(true);
    });
  });
});
