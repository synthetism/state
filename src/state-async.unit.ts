import { Unit, type UnitProps, createUnitSchema, type TeachingContract } from '@synet/unit';

// Storage binding interface - what State expects from storage providers
interface StorageBinding {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists?(key: string): Promise<boolean>;
  clear?(): Promise<void>;
}

interface StateAsyncConfig {
  unitId: string;    
  initialState?: Record<string, unknown>;
  emitEvents?: boolean;
  storage?: StorageBinding;  // Optional storage binding
}

// Event handler type for proper typing
type EventHandler = (data: unknown) => void;

interface StateAsyncProps extends UnitProps {
  ownerId: string;
  currentState: Record<string, unknown>;
  eventHandlers: Map<string, EventHandler[]>;
  emitEvents: boolean;
  storage?: StorageBinding;  // Optional storage binding
}

class StateAsync extends Unit<StateAsyncProps> {
  protected constructor(props: StateAsyncProps) {
    super(props);
  }

  static create(config: StateAsyncConfig): StateAsync {
    const props: StateAsyncProps = {
      dna: createUnitSchema({ id: `state-${config.unitId}`, version: '1.0.0' }),
      ownerId: config.unitId,
      currentState: { ...config.initialState || {} },
      eventHandlers: new Map(),
      emitEvents: config.emitEvents ?? false,
      storage: config.storage  // Optional storage binding
    };
    
    return new StateAsync(props);
  }
  
  // State operations with storage binding support
  async get<T>(key: string): Promise<T | undefined> {
    // Try storage first if available
    if (this.props.storage) {
      try {
        const value = await this.props.storage.get<T>(key);
        return value ?? undefined;
      } catch (error) {
        console.warn(`[${this.dna.id}] Storage get failed for key '${key}':`, error);
        // Fall back to memory
      }
    }
    
    // Memory fallback
    return this.props.currentState[key] as T;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const oldValue = this.props.currentState[key];
    
    // Try storage first if available
    if (this.props.storage) {
      try {
        await this.props.storage.set(key, value, ttl);

      } catch (error) {
        console.warn(`[${this.dna.id}] Storage set failed for key '${key}':`, error);
        // Fall back to memory only
        this.props.currentState[key] = value;
      }
    } else {
      // Memory only
      this.props.currentState[key] = value;
    }
    
    // Emit change event
    if (this.props.emitEvents) {
      this.emit(`${key}.changed`, { oldValue, newValue: value });
    }
  }

  async has(key: string): Promise<boolean> {
    // Try storage first if available
    if (this.props.storage?.exists) {
      try {
        return await this.props.storage.exists(key);
      } catch (error) {
        console.warn(`[${this.dna.id}] Storage exists failed for key '${key}':`, error);
        // Fall back to memory
      }
    }
    
    // Memory fallback
    return key in this.props.currentState;
  }

  async delete(key: string): Promise<boolean> {
    let storageDeleted = false;
    
    // Try storage first if available
    if (this.props.storage) {
      try {
        storageDeleted = await this.props.storage.delete(key);
      } catch (error) {
        console.warn(`[${this.dna.id}] Storage delete failed for key '${key}':`, error);
      }
    }
    
    // Always delete from memory cache
    const existed = key in this.props.currentState;
    delete this.props.currentState[key];
    
    return storageDeleted || existed;
  }

  async clear(): Promise<void> {
    // Try storage first if available
    if (this.props.storage?.clear) {
      try {
        await this.props.storage.clear();
      } catch (error) {
        console.warn(`[${this.dna.id}] Storage clear failed:`, error);
      }
    }
    
    // Always clear memory
    this.props.currentState = {};
  }

  getAll(): Record<string, unknown> {
    return { ...this.props.currentState };
  }
  
  // Event system
  on(event: string, handler: EventHandler): void {
    if (!this.props.eventHandlers.has(event)) {
      this.props.eventHandlers.set(event, []);
    }
    const handlers = this.props.eventHandlers.get(event);
    if (handlers) {
      handlers.push(handler);
    }
  }
  
  // Public emit for manual events
  emit(event: string, data: unknown): void {
    const handlers = this.props.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      handler(data);
    }
  }
  
  // Teaching state observation (not mutation) - Enhanced with schemas
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        get: (...args: unknown[]) => this.get(args[0] as string),
        has: (...args: unknown[]) => this.has(args[0] as string),
        getAll: () => this.getAll(),
        on: (...args: unknown[]) => this.on(args[0] as string, args[1] as EventHandler),
        // Not teaching: set, delete, emit (only owner can mutate)
      },
      schema: {
        get: {
          name: 'get',
          description: 'Retrieve value by key from state (memory + optional storage)',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to retrieve' }
            },
            required: ['key']
          },
          response: {
            type: 'object',
            properties: {
              value: { type: 'unknown', description: 'Retrieved value or undefined' }
            }
          }
        },
        has: {
          name: 'has',
          description: 'Check if key exists in state',
          parameters: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Key to check' }
            },
            required: ['key']
          },
          response: {
            type: 'boolean'
          }
        },
        getAll: {
          name: 'getAll',
          description: 'Get all state data as object',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          },
          response: {
            type: 'object',
            properties: {
              state: { type: 'object', description: 'Complete state object' }
            }
          }
        },
        on: {
          name: 'on',
          description: 'Subscribe to state change events',
          parameters: {
            type: 'object',
            properties: {
              event: { type: 'string', description: 'Event name to listen for' },
              handler: { type: 'object', description: 'Event handler function' }
            },
            required: ['event', 'handler']
          },
          response: {
            type: 'object',
            properties: {
              unsubscribe: { type: 'object', description: 'Function to unsubscribe' }
            }
          }
        }
      }
    };
  }

  whoami(): string {
    const storageType = this.props.storage ? 'persistent' : 'memory';
    return `State[${this.props.ownerId}] - ${storageType} - v${this.dna.version}`;
  }

  help(): string {
    const storageInfo = this.props.storage ? 
      'Storage: External binding (persistent)' : 
      'Storage: Memory only';
    
    return `
State Unit v${this.dna.version} - Simple state management for complex Unit compositions

Owner: ${this.props.ownerId}
${storageInfo}
Current state keys: ${Object.keys(this.props.currentState).join(', ')}
Event handlers: ${this.props.eventHandlers.size} registered

Operations:
• get<T>(key) - Get typed state value (async, storage + memory)
• set<T>(key, value, ttl?) - Set state value (async, storage + memory)
• has(key) - Check if key exists (async, storage + memory)
• delete(key) - Delete key (async, storage + memory)  
• clear() - Clear all state (async, storage + memory)
• getAll() - Get complete state copy (memory cache)
• on(event, handler) - Listen to events
• emit(event, data) - Emit custom events

Storage Binding:
• Graceful degradation - falls back to memory on storage errors
• Memory cache - for fast synchronous access to recent data
• Event system - triggers on state changes

Teaching:
• Teaches observation capabilities (get, has, getAll, on)
• Does not teach mutation (set, delete, emit) - owner only
• Enhanced with schemas for type validation

Example:
  // Memory-only state
  const state = State.create({ unitId: 'my-state' });
  
  // State with storage binding
  const persistentState = State.create({ 
    unitId: 'my-state',
    storage: storageBinding 
  });
  
  await state.set('ready', true);
  state.on('ready.changed', (data) => console.log('State changed:', data));
`;
  }
}

export { StateAsync, type StateAsyncConfig, type StateAsyncProps, type StorageBinding };