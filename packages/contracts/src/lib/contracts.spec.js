import assert from 'node:assert/strict';
import test from 'node:test';

import { ContractsError, ValidationContractsError } from './contracts.ts';

test('ContractsError exposes code, message, and status', () => {
  const error = new ContractsError('BROKEN', 'Something failed', 503, {
    service: 'registry',
  });

  assert.equal(error.code, 'BROKEN');
  assert.equal(error.message, 'Something failed');
  assert.equal(error.status, 503);
  assert.deepEqual(error.details, { service: 'registry' });
});

test('ValidationContractsError applies validation defaults', () => {
  const error = new ValidationContractsError('Invalid payload');

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.status, 400);
  assert.equal(error.name, 'ValidationContractsError');
});

test('shared contracts can be composed as runtime objects', () => {
  const registration = {
    metadata: {
      pluginId: 'plugin.billing',
      displayName: 'Billing Plugin',
      version: '1.2.0',
      owner: 'platform-team',
    },
    gatewayBaseUrl: 'https://plugins.example.com/billing',
    healthEndpoint: '/health',
    permissions: ['billing.invoice.read'],
    policies: ['billing.invoice.owner-only'],
  };

  const response = {
    data: registration,
    requestId: 'req_123',
    timestamp: new Date().toISOString(),
  };

  assert.equal(response.data.metadata.pluginId, 'plugin.billing');
  assert.equal(Array.isArray(response.data.permissions), true);
});
