/**
 * Integration example showing State Unit in action with complex coordination
 */

import { State } from '../src/state.unit.js';
import { Unit, type UnitProps, createUnitSchema, type TeachingContract } from '@synet/unit';

// Example: Network Unit with State management
interface NetworkConfig {
  host: string;
  timeout?: number;
}

interface NetworkProps extends UnitProps {
  config: NetworkConfig;
  state: State;
}

class NetworkUnit extends Unit<NetworkProps> {
  protected constructor(props: NetworkProps) {
    super(props);
  }

  static create(config: NetworkConfig): NetworkUnit {
    const state = State.create({
      unitId: 'network',
      initialState: {
        connected: false,
        connections: 0,
        retries: 0,
        lastError: null,
        lastConnected: null
      }
    });

    const props: NetworkProps = {
      dna: createUnitSchema({ id: 'network', version: '1.0.0' }),
      config,
      state
    };
    
    return new NetworkUnit(props);
  }

  async connect(): Promise<void> {
    try {
      // Simulate connection logic
      await this.establishConnection();
      
      this.props.state.set('connected', true);
      this.props.state.set('connections', this.props.state.get<number>('connections')! + 1);
      this.props.state.set('lastConnected', new Date().toISOString());
      this.props.state.set('lastError', null);
      
      this.props.state.emit('network.connected', { 
        timestamp: Date.now(),
        host: this.props.config.host 
      });
      
    } catch (error) {
      this.props.state.set('lastError', (error as Error).message);
      this.props.state.set('retries', this.props.state.get<number>('retries')! + 1);
      
      this.props.state.emit('network.error', { 
        error: (error as Error).message, 
        retries: this.props.state.get('retries') 
      });
      
      throw error;
    }
  }

  private async establishConnection(): Promise<void> {
    // Simulate async connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate random failures for demo
    if (Math.random() < 0.3) {
      throw new Error('Connection failed');
    }
  }

  isConnected(): boolean {
    return this.props.state.get<boolean>('connected') || false;
  }

  getConnectionCount(): number {
    return this.props.state.get<number>('connections') || 0;
  }

  onConnectionChange(handler: Function): void {
    this.props.state.on('connected.changed', handler);
  }

  onNetworkEvent(event: string, handler: Function): void {
    this.props.state.on(event, handler);
  }

  getStats(): Record<string, unknown> {
    return {
      connected: this.isConnected(),
      connections: this.getConnectionCount(),
      retries: this.props.state.get('retries'),
      lastError: this.props.state.get('lastError'),
      lastConnected: this.props.state.get('lastConnected')
    };
  }

  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        isConnected: () => this.isConnected(),
        getConnectionCount: () => this.getConnectionCount(),
        getStats: () => this.getStats(),
        onConnectionChange: (...args: unknown[]) => this.onConnectionChange(args[0] as Function),
        onNetworkEvent: (...args: unknown[]) => this.onNetworkEvent(args[0] as string, args[1] as Function),
        // Teach state observation
        ...this.props.state.teach().capabilities
      }
    };
  }

  whoami(): string {
    return `NetworkUnit[${this.props.config.host}] - v${this.dna.version}`;
  }

  help(): string {
    return `
NetworkUnit v${this.dna.version} - Network connection with state management

Configuration:
• Host: ${this.props.config.host}
• Timeout: ${this.props.config.timeout || 'default'}

Current State:
• Connected: ${this.isConnected()}
• Connections: ${this.getConnectionCount()}
• Retries: ${this.props.state.get('retries')}

Operations:
• connect() - Establish connection
• isConnected() - Check connection status
• getStats() - Get connection statistics
• onConnectionChange(handler) - Listen to connection changes
• onNetworkEvent(event, handler) - Listen to network events

Teaching:
• Teaches connection status and statistics
• Teaches state observation capabilities
• Does not teach connection control
`;
  }
}

// Example: Orchestration Unit coordinating multiple children
interface OrchestrationConfig {
  children: string[];
  timeout?: number;
}

interface OrchestrationProps extends UnitProps {
  config: OrchestrationConfig;
  state: State;
  children: Map<string, Unit<any>>;
}

class OrchestrationUnit extends Unit<OrchestrationProps> {
  protected constructor(props: OrchestrationProps) {
    super(props);
  }

  static create(config: OrchestrationConfig): OrchestrationUnit {
    const state = State.create({
      unitId: 'orchestration',
      initialState: {
        initialized: false,
        childrenReady: 0,
        totalChildren: config.children.length,
        readyChildren: [],
        errors: []
      }
    });

    // Auto-initialization logic
    state.on('childrenReady.changed', () => {
      const ready = state.get<number>('childrenReady')!;
      const total = state.get<number>('totalChildren')!;
      
      if (ready === total) {
        state.set('initialized', true);
        state.emit('orchestration.ready', { 
          timestamp: Date.now(),
          children: state.get('readyChildren')
        });
      }
    });

    const props: OrchestrationProps = {
      dna: createUnitSchema({ id: 'orchestration', version: '1.0.0' }),
      config,
      state,
      children: new Map()
    };
    
    return new OrchestrationUnit(props);
  }

  addChild(id: string, unit: Unit<any>): void {
    this.props.children.set(id, unit);
    
    // Listen for child readiness (simplified)
    setTimeout(() => {
      this.markChildReady(id);
    }, Math.random() * 1000);
  }

  private markChildReady(childId: string): void {
    const readyChildren = this.props.state.get<string[]>('readyChildren') || [];
    
    if (!readyChildren.includes(childId)) {
      readyChildren.push(childId);
      this.props.state.set('readyChildren', readyChildren);
      this.props.state.set('childrenReady', readyChildren.length);
      
      this.props.state.emit('child.ready', { 
        childId, 
        readyCount: readyChildren.length,
        totalChildren: this.props.state.get('totalChildren')
      });
    }
  }

  isInitialized(): boolean {
    return this.props.state.get<boolean>('initialized') || false;
  }

  getReadyChildren(): string[] {
    return this.props.state.get<string[]>('readyChildren') || [];
  }

  onReady(handler: Function): void {
    this.props.state.on('orchestration.ready', handler);
  }

  onChildReady(handler: Function): void {
    this.props.state.on('child.ready', handler);
  }

  teach(): TeachingContract {
    return {
      unitId: this.dna.id,
      capabilities: {
        isInitialized: () => this.isInitialized(),
        getReadyChildren: () => this.getReadyChildren(),
        onReady: (...args: unknown[]) => this.onReady(args[0] as Function),
        onChildReady: (...args: unknown[]) => this.onChildReady(args[0] as Function),
        // Teach state observation
        ...this.props.state.teach().capabilities
      }
    };
  }

  whoami(): string {
    return `OrchestrationUnit[${this.props.config.children.length} children] - v${this.dna.version}`;
  }

  help(): string {
    return `
OrchestrationUnit v${this.dna.version} - Coordinate multiple child units

Configuration:
• Children: ${this.props.config.children.join(', ')}
• Total: ${this.props.config.children.length}

Current State:
• Initialized: ${this.isInitialized()}
• Ready children: ${this.getReadyChildren().length}/${this.props.state.get('totalChildren')}

Operations:
• addChild(id, unit) - Add child unit
• isInitialized() - Check if all children ready
• getReadyChildren() - Get list of ready children
• onReady(handler) - Listen for full initialization
• onChildReady(handler) - Listen for individual child readiness

Events:
• 'orchestration.ready' - All children initialized
• 'child.ready' - Individual child becomes ready
• 'childrenReady.changed' - Ready count changes
`;
  }
}

// Demo function
export function demo() {
  console.log('🔄 State Unit Integration Demo\n');

  // Create network unit with state
  const network = NetworkUnit.create({ host: 'api.example.com' });
  
  // Listen to network events
  network.onConnectionChange((data: any) => {
    console.log('📡 Connection changed:', data.newValue ? 'CONNECTED' : 'DISCONNECTED');
  });

  network.onNetworkEvent('network.connected', (data: any) => {
    console.log('✅ Network connected to:', data.host);
  });

  network.onNetworkEvent('network.error', (data: any) => {
    console.log('❌ Network error:', data.error, `(retry ${data.retries})`);
  });

  // Create orchestration unit
  const orchestration = OrchestrationUnit.create({
    children: ['auth', 'storage', 'api']
  });

  orchestration.onChildReady((data: any) => {
    console.log(`👶 Child ready: ${data.childId} (${data.readyCount}/${data.totalChildren})`);
  });

  orchestration.onReady((data: any) => {
    console.log('🎉 Orchestration fully initialized!', data.children);
  });

  // Simulate operations
  console.log('1. Attempting network connection...');
  network.connect().catch(console.error);

  console.log('\n2. Adding children to orchestration...');
  orchestration.addChild('auth', network); // Using network as example child
  orchestration.addChild('storage', network);
  orchestration.addChild('api', network);

  // Show final state after a moment
  setTimeout(() => {
    console.log('\n📊 Final Network Stats:', network.getStats());
    console.log('📊 Orchestration Ready:', orchestration.isInitialized());
    console.log('📊 Ready Children:', orchestration.getReadyChildren());
  }, 1500);
}

export { NetworkUnit, OrchestrationUnit, type NetworkConfig, type OrchestrationConfig };
