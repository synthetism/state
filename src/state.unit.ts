import { Unit, type UnitProps, createUnitSchema, type TeachingContract } from '@synet/unit';

interface StateConfig {
  unitId: string;           // Which unit owns this state
  initialState: Record<string, unknown>;
}

// Event handler type for proper typing
type EventHandler = (data: unknown) => void;

interface StateProps extends UnitProps {
  ownerId: string;
  currentState: Record<string, unknown>;
  eventHandlers: Map<string, EventHandler[]>;
}

class State extends Unit<StateProps> {
  protected constructor(props: StateProps) {
    super(props);
  }

  static create(config: StateConfig): State {
    const props: StateProps = {
      dna: createUnitSchema({ id: `state-${config.unitId}`, version: '1.0.0' }),
      ownerId: config.unitId,
      currentState: { ...config.initialState },
      eventHandlers: new Map()
    };
    
    return new State(props);
  }
  
  // State operations
  get<T>(key: string): T | undefined {
    return this.props.currentState[key] as T;
  }
  
  set<T>(key: string, value: T): void {
    const oldValue = this.props.currentState[key];
    this.props.currentState[key] = value;
    
    // Emit change event
    this.emit(`${key}.changed`, { oldValue, newValue: value });
  }

  has(key: string): boolean {
    return key in this.props.currentState;
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
  
  // Teaching state observation (not mutation)
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        get: (...args: unknown[]) => this.get(args[0] as string),
        has: (...args: unknown[]) => this.has(args[0] as string),
        getAll: () => this.getAll(),
        on: (...args: unknown[]) => this.on(args[0] as string, args[1] as EventHandler),
        // Not teaching: set, emit (only owner can mutate)
      }
    };
  }

  whoami(): string {
    return `State[${this.props.ownerId}] - v${this.dna.version}`;
  }

  help(): string {
    return `
State Unit v${this.dna.version} - Simple state management for complex Unit compositions

Owner: ${this.props.ownerId}
Current state keys: ${Object.keys(this.props.currentState).join(', ')}
Event handlers: ${this.props.eventHandlers.size} registered

Operations:
• get<T>(key) - Get typed state value
• set<T>(key, value) - Set state value (triggers events)
• has(key) - Check if key exists
• getAll() - Get complete state copy
• on(event, handler) - Listen to events
• emit(event, data) - Emit custom events

Teaching:
• Teaches observation capabilities (get, has, on)
• Does not teach mutation (set, emit) - owner only

Example:
  state.set('ready', true);
  state.on('ready.changed', (data) => console.log('State changed:', data));
  state.emit('custom.event', { message: 'Hello' });
`;
  }
}

export { State, type StateConfig, type StateProps };