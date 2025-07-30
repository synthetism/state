# State Unit

```bash
  _____ _        _         _    _       _ _   
 / ____| |      | |       | |  | |     (_) |  
| (___ | |_ __ _| |_ ___  | |  | |_ __  _| |_ 
 \___ \| __/ _` | __/ _ \ | |  | | '_ \| | __|
 ____) | || (_| | ||  __/ | |__| | | | | | |_ 
|_____/ \__\__,_|\__\___|  \____/|_| |_|_|\__|
                                              
version: 1.0.0                                              
```

**Simple state management for complex Unit compositions**

Lightweight state container for Units that need to coordinate multiple internal operations while preserving Unit Architecture principles.

## Quick Start

```typescript
import { State } from '@synet/state';

// Create state for a complex unit
const state = State.create({
  unitId: 'my-complex-unit',
  initialState: { 
    initialized: false,
    connections: 0,
    cache: new Map()
  }
});

// State operations
state.set('initialized', true);
const isReady = state.get<boolean>('initialized');

// Event handling
state.on('initialized.changed', (data) => {
  console.log('State changed:', data);
});

// Manual events
state.emit('custom.event', { message: 'Hello' });
```

## When to Use State Unit

### **✅ Good Use Cases:**
- **Complex Unit compositions** with multiple internal units
- **Remote/Network Units** that need connection state
- **Coordination Units** managing multiple child units
- **Infrastructure Units** with legitimate runtime state needs

### **❌ Avoid State Unit For:**
- **Simple business logic** units
- **Pure functions** or stateless operations  
- **Value objects** that should be immutable
- **Domain entities** with inherent state

## Features

### **Simple State Management**
- **Get/Set operations** with type safety
- **Event system** for state change notifications
- **Manual event emission** for custom coordination
- **No hidden state** - everything explicit

### **Unit Architecture Compliance**
- **Teaching contracts** for state observation
- **Zero dependencies** - pure TypeScript
- **Immutable props** with mutable state container
- **Clear boundaries** between configuration and runtime

## Installation

```bash
npm install @synet/state
```

## API Reference

### State Creation

```typescript
interface StateConfig {
  unitId: string;                    // Owner unit identifier
  initialState: Record<string, unknown>; // Initial state values
}

const state = State.create({
  unitId: 'my-unit',
  initialState: {
    connected: false,
    retries: 0,
    metadata: {}
  }
});
```

### State Operations

```typescript
// Type-safe get/set
state.set<boolean>('connected', true);
const connected = state.get<boolean>('connected');

// Check if key exists
if (state.has('retries')) {
  console.log('Retries tracked');
}

// Get all state
const allState = state.getAll();
console.log('Current state:', allState);
```

### Event System

```typescript
// Listen to state changes
state.on('connected.changed', (data) => {
  console.log('Connection changed:', data.oldValue, '->', data.newValue);
});

// Listen to any state change
state.on('*.changed', (data) => {
  console.log('Any state changed:', data);
});

// Manual event emission
state.emit('custom.event', { 
  type: 'notification',
  message: 'Something happened'
});

// Custom events for coordination
state.emit('unit.ready', { timestamp: Date.now() });
```

### Teaching State Awareness

```typescript
// State can teach observation capabilities
const contract = state.teach();

// Other units can learn to observe state
childUnit.learn([contract]);

// Child can now observe parent state
childUnit.execute('state.get', 'connected');
childUnit.execute('state.on', 'connected.changed', handler);
```

## Real-World Example

### Complex Network Unit

```typescript
import { State } from '@synet/state';
import { Unit } from '@synet/unit';

interface NetworkProps extends UnitProps {
  config: NetworkConfig;
  state: State;
}

class NetworkUnit extends Unit<NetworkProps> {
  static create(config: NetworkConfig): NetworkUnit {
    const state = State.create({
      unitId: 'network',
      initialState: {
        connected: false,
        connections: 0,
        retries: 0,
        lastError: null
      }
    });
    
    return new NetworkUnit({ 
      dna: createUnitSchema({ id: 'network', version: '1.0.0' }),
      config, 
      state,
      created: new Date()
    });
  }
  
  async connect(): Promise<void> {
    try {
      // Complex connection logic...
      await this.establishConnection();
      
      this.props.state.set('connected', true);
      this.props.state.set('connections', this.props.state.get('connections') + 1);
      this.props.state.emit('network.connected', { timestamp: Date.now() });
      
    } catch (error) {
      this.props.state.set('lastError', error);
      this.props.state.set('retries', this.props.state.get('retries') + 1);
      this.props.state.emit('network.error', { error, retries: this.props.state.get('retries') });
    }
  }
  
  isConnected(): boolean {
    return this.props.state.get<boolean>('connected') || false;
  }
  
  onConnectionChange(handler: Function): void {
    this.props.state.on('connected.changed', handler);
  }
  
  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        isConnected: () => this.isConnected(),
        onConnectionChange: (handler: Function) => this.onConnectionChange(handler),
        // Teach state observation
        ...this.props.state.teach().capabilities
      }
    };
  }
}

// Usage
const network = NetworkUnit.create({ host: 'api.example.com' });

network.onConnectionChange((data) => {
  console.log('Network state changed:', data.newValue);
});

await network.connect();
console.log('Connected:', network.isConnected());
```

### Coordination Between Units

```typescript
// Parent unit coordinates multiple child units
class OrchestrationUnit extends Unit<OrchestrationProps> {
  static create(config: OrchestrationConfig): OrchestrationUnit {
    const state = State.create({
      unitId: 'orchestration',
      initialState: {
        initialized: false,
        childrenReady: 0,
        totalChildren: config.children.length
      }
    });
    
    // Listen for child readiness
    state.on('child.ready', () => {
      const ready = state.get('childrenReady') + 1;
      state.set('childrenReady', ready);
      
      if (ready === state.get('totalChildren')) {
        state.set('initialized', true);
        state.emit('orchestration.ready', { timestamp: Date.now() });
      }
    });
    
    return new OrchestrationUnit({ state, ...config });
  }
  
  async initializeChild(child: Unit): Promise<void> {
    await child.initialize();
    this.props.state.emit('child.ready', { childId: child.dna.id });
  }
}
```

## Architecture Principles

### **State vs Configuration**
- **Props**: Immutable configuration and unit identity
- **State**: Mutable runtime coordination data
- **Clear boundary**: State is explicit, never hidden

### **Teaching Philosophy**
```typescript
//  State teaches observation, not mutation
teach(): TeachingContract {
  return {
    unitId: this.dna.id,
    capabilities: {
      get: (key: string) => this.get(key),
      on: (event: string, handler: Function) => this.on(event, handler),
      // ❌ Not teaching: set, emit (only owner can mutate)
    }
  };
}
```

### **Event-Driven Coordination**
- State changes automatically emit events
- Manual events for custom coordination
- Observer pattern without tight coupling

## Performance

- **Memory efficient** - Simple Map-based storage
- **Type safe** - Generic get/set operations
- **Event optimized** - Minimal overhead for listeners
- **Zero dependencies** - Pure TypeScript implementation

## License

MIT - Part of the SYNET ecosystem

---

> **"Complex coordination requires simple state - but state should serve consciousness, never rule it."**  
> *— Unit Architecture Philosophy*
