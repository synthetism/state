#!/usr/bin/env node

/**
 * Test Enhanced State Unit with Storage Binding
 * Tests the new StorageBinding interface and schema consciousness
 */

import { StateAsync as State, type StorageBinding } from '../src/state-async.unit.js';

// === MOCK STORAGE ADAPTER ===

class MockStorageAdapter implements StorageBinding {
  private storage = new Map<string, unknown>();
  
  async get<T>(key: string): Promise<T | null> {
    console.log(`🔍 Mock storage GET: ${key}`);
    return this.storage.get(key) as T || null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    console.log(`💾 Mock storage SET: ${key} = ${JSON.stringify(value)} ${ttl ? `(TTL: ${ttl}ms)` : ''}`);
    this.storage.set(key, value);
    
    // Simulate TTL
    if (ttl) {
      setTimeout(() => {
        console.log(`⏰ Mock storage EXPIRED: ${key}`);
        this.storage.delete(key);
      }, ttl);
    }
  }
  
  async delete(key: string): Promise<boolean> {
    console.log(`🗑️ Mock storage DELETE: ${key}`);
    return this.storage.delete(key);
  }
  
  async exists(key: string): Promise<boolean> {
    console.log(`❓ Mock storage EXISTS: ${key}`);
    return this.storage.has(key);
  }
  
  async clear(): Promise<void> {
    console.log(`🧹 Mock storage CLEAR ALL`);
    this.storage.clear();
  }
}

// === TEST FUNCTIONS ===

async function testMemoryState() {
  console.log('\n🧠 === TESTING MEMORY-ONLY STATE ===');
  
  const state = State.create({
    unitId: 'memory-test',
    emitEvents: true
  });
  
  console.log('State identity:', state.whoami());
  
  // Test basic operations
  await state.set('greeting', 'Hello Unit Architecture!');
  const greeting = await state.get<string>('greeting');
  console.log('Retrieved greeting:', greeting);
  
  const exists = await state.has('greeting');
  console.log('Greeting exists:', exists);
  
  // Test event system
  state.on('status.changed', (data) => {
    console.log('📢 Event received:', data);
  });
  
  await state.set('status', 'ready');
  
  const allState = state.getAll();
  console.log('All state:', allState);
}

async function testPersistentState() {
  console.log('\n💾 === TESTING PERSISTENT STATE ===');
  
  const mockStorage = new MockStorageAdapter();
  
  const state = State.create({
    unitId: 'persistent-test',
    storage: mockStorage,
    emitEvents: true
  });
  
  console.log('State identity:', state.whoami());
  
  // Test storage operations
  await state.set('user', { id: 123, name: 'Alice' });
  await state.set('session', { token: 'abc123' }, 5000); // 5 second TTL
  
  const user = await state.get<{id: number, name: string}>('user');
  console.log('Retrieved user:', user);
  
  const session = await state.get<{token: string}>('session');
  console.log('Retrieved session:', session);
  
  // Test existence
  const userExists = await state.has('user');
  const nonexistentExists = await state.has('nonexistent');
  console.log('User exists:', userExists);
  console.log('Nonexistent exists:', nonexistentExists);
  
  // Test deletion
  const deleted = await state.delete('user');
  console.log('User deleted:', deleted);
  
  const userAfterDelete = await state.get('user');
  console.log('User after delete:', userAfterDelete);
}

async function testSchemaConsciousness() {
  console.log('\n📋 === TESTING SCHEMA CONSCIOUSNESS ===');
  
  const state = State.create({ unitId: 'schema-test' });
  
  const contract = state.teach();
  console.log('Teaching contract unit ID:', contract.unitId);
  console.log('Available capabilities:', Object.keys(contract.capabilities));
  console.log('Available schemas:', Object.keys(contract.schema || {}));
  
  // Test schema details
  if (contract.schema) {
    const getSchema = contract.schema.get;
    console.log('\n"get" capability schema:');
    console.log('- Name:', getSchema.name);
    console.log('- Description:', getSchema.description);
    console.log('- Parameters:', JSON.stringify(getSchema.parameters, null, 2));
    console.log('- Response:', JSON.stringify(getSchema.response, null, 2));
  }
}

async function testGracefulDegradation() {
  console.log('\n🔧 === TESTING GRACEFUL DEGRADATION ===');
  
  // Mock storage that fails sometimes
  class UnreliableStorage implements StorageBinding {
    private failureCount = 0;
    
    async get<T>(key: string): Promise<T | null> {
      if (this.failureCount++ < 2) {
        throw new Error('Storage temporarily unavailable');
      }
      return null;
    }
    
    async set<T>(key: string, value: T): Promise<void> {
      if (key === 'fail-key') {
        throw new Error('Storage write failed');
      }
      console.log(`✅ Storage SET succeeded: ${key}`);
    }
    
    async delete(key: string): Promise<boolean> {
      throw new Error('Storage delete always fails');
    }
    
    async exists(key: string): Promise<boolean> {
      throw new Error('Storage exists always fails');
    }
    
    async clear(): Promise<void> {
      throw new Error('Storage clear always fails');
    }
  }
  
  const unreliableStorage = new UnreliableStorage();
  const state = State.create({
    unitId: 'degradation-test',
    storage: unreliableStorage
  });
  
  // Test graceful degradation
  await state.set('fail-key', 'this will fail in storage');
  await state.set('memory-key', 'this will work in memory');
  
  const failedValue = await state.get('fail-key');
  const memoryValue = await state.get('memory-key');
  
  console.log('Failed storage value (should be undefined):', failedValue);
  console.log('Memory value (should work):', memoryValue);
  
  // Test fallback behavior
  const exists = await state.has('memory-key');
  console.log('Key exists (fallback to memory):', exists);
  
  const deleted = await state.delete('memory-key');
  console.log('Key deleted (fallback successful):', deleted);
}

// === RUN TESTS ===

async function runAllTests() {
  console.log('🚀 ENHANCED STATE UNIT TESTING');
  console.log('================================');
  
  await testMemoryState();
  await testPersistentState();
  await testSchemaConsciousness();
  await testGracefulDegradation();
  
  console.log('\n✅ ALL TESTS COMPLETED');
  console.log('\n🎯 READY FOR KEYVALUE INTEGRATION');
  console.log('   Next: KeyValue.createState() Producer Pattern');
}

runAllTests().catch(console.error);
