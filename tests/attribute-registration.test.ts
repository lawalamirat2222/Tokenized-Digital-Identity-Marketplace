import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Mock tx-sender
  },
  contracts: {
    'attribute-registration': {
      functions: {
        'register-attribute-type': vi.fn(),
        'authorize-provider': vi.fn(),
        'revoke-provider-authorization': vi.fn(),
        'is-provider-authorized': vi.fn(),
        'get-attribute-details': vi.fn(),
        'set-attribute-active': vi.fn(),
        'set-admin': vi.fn(),
      },
      variables: {
        admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        'next-attribute-id': 1,
      },
      maps: {
        'attribute-types': new Map(),
        'provider-attributes': new Map(),
      },
    },
  },
  blockHeight: 100,
};

// Mock function to simulate contract calls
function callContract(contractName, functionName, ...args) {
  return mockClarity.contracts[contractName].functions[functionName](...args);
}

describe('Attribute Registration Contract', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    mockClarity.contracts['attribute-registration'].variables['next-attribute-id'] = 1;
    mockClarity.contracts['attribute-registration'].maps['attribute-types'] = new Map();
    mockClarity.contracts['attribute-registration'].maps['provider-attributes'] = new Map();
    
    // Setup mock implementations
    mockClarity.contracts['attribute-registration'].functions['register-attribute-type'].mockImplementation((name, description) => {
      if (mockClarity.tx.sender !== mockClarity.contracts['attribute-registration'].variables.admin) {
        return { err: 1 }; // Not authorized
      }
      
      const attributeId = mockClarity.contracts['attribute-registration'].variables['next-attribute-id'];
      mockClarity.contracts['attribute-registration'].maps['attribute-types'].set(attributeId, {
        name,
        description,
        active: true
      });
      
      mockClarity.contracts['attribute-registration'].variables['next-attribute-id'] = attributeId + 1;
      
      return { ok: attributeId };
    });
    
    mockClarity.contracts['attribute-registration'].functions['authorize-provider'].mockImplementation((provider, attributeId) => {
      if (mockClarity.tx.sender !== mockClarity.contracts['attribute-registration'].variables.admin) {
        return { err: 2 }; // Not authorized
      }
      
      if (!mockClarity.contracts['attribute-registration'].maps['attribute-types'].has(attributeId)) {
        return { err: 2 }; // Attribute doesn't exist
      }
      
      const key = JSON.stringify({ provider, 'attribute-id': attributeId });
      mockClarity.contracts['attribute-registration'].maps['provider-attributes'].set(key, {
        authorized: true,
        timestamp: mockClarity.blockHeight
      });
      
      return { ok: true };
    });
    
    mockClarity.contracts['attribute-registration'].functions['is-provider-authorized'].mockImplementation((provider, attributeId) => {
      const key = JSON.stringify({ provider, 'attribute-id': attributeId });
      if (!mockClarity.contracts['attribute-registration'].maps['provider-attributes'].has(key)) {
        return false;
      }
      
      return mockClarity.contracts['attribute-registration'].maps['provider-attributes'].get(key).authorized;
    });
    
    mockClarity.contracts['attribute-registration'].functions['get-attribute-details'].mockImplementation((attributeId) => {
      if (!mockClarity.contracts['attribute-registration'].maps['attribute-types'].has(attributeId)) {
        return null;
      }
      
      return mockClarity.contracts['attribute-registration'].maps['attribute-types'].get(attributeId);
    });
  });
  
  it('should register a new attribute type', () => {
    const result = callContract('attribute-registration', 'register-attribute-type', 'Email Verification', 'Verifies user email address');
    expect(result).toEqual({ ok: 1 });
    
    const attributeDetails = callContract('attribute-registration', 'get-attribute-details', 1);
    expect(attributeDetails).toEqual({
      name: 'Email Verification',
      description: 'Verifies user email address',
      active: true
    });
    
    expect(mockClarity.contracts['attribute-registration'].variables['next-attribute-id']).toBe(2);
  });
  
  it('should not register attribute type if not admin', () => {
    // Change sender to non-admin
    const originalSender = mockClarity.tx.sender;
    mockClarity.tx.sender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    const result = callContract('attribute-registration', 'register-attribute-type', 'Email Verification', 'Verifies user email address');
    expect(result).toEqual({ err: 1 });
    
    // Restore original sender
    mockClarity.tx.sender = originalSender;
  });
  
  it('should authorize a provider for an attribute', () => {
    // First register an attribute
    callContract('attribute-registration', 'register-attribute-type', 'Email Verification', 'Verifies user email address');
    
    const provider = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = callContract('attribute-registration', 'authorize-provider', provider, 1);
    expect(result).toEqual({ ok: true });
    
    const isAuthorized = callContract('attribute-registration', 'is-provider-authorized', provider, 1);
    expect(isAuthorized).toBe(true);
  });
  
  it('should not authorize provider for non-existent attribute', () => {
    const provider = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = callContract('attribute-registration', 'authorize-provider', provider, 999);
    expect(result).toEqual({ err: 2 });
  });
  
  it('should get attribute details', () => {
    callContract('attribute-registration', 'register-attribute-type', 'ID Verification', 'Verifies government ID');
    
    const details = callContract('attribute-registration', 'get-attribute-details', 1);
    expect(details).toEqual({
      name: 'ID Verification',
      description: 'Verifies government ID',
      active: true
    });
  });
  
  it('should return null for non-existent attribute', () => {
    const details = callContract('attribute-registration', 'get-attribute-details', 999);
    expect(details).toBeNull();
  });
});
