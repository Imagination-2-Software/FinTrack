import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEnvVar } from '../api/admin/users.ts';

test('resolveEnvVar returns the first non-empty candidate', () => {
  assert.equal(resolveEnvVar(undefined, 'value2', 'value3'), 'value2');
});

test('resolveEnvVar trims leading and trailing whitespace', () => {
  assert.equal(resolveEnvVar('  value  '), 'value');
});

test('resolveEnvVar trims leading and trailing newlines', () => {
  assert.equal(resolveEnvVar('\nvalue\n'), 'value');
});

test('resolveEnvVar trims carriage returns', () => {
  assert.equal(resolveEnvVar('\r\nvalue\r\n'), 'value');
});

test('resolveEnvVar treats whitespace-only values as empty and moves to next candidate', () => {
  assert.equal(resolveEnvVar('   ', 'valid'), 'valid');
});

test('resolveEnvVar returns empty string when all candidates are empty or undefined', () => {
  assert.equal(resolveEnvVar(undefined, '', null), '');
});

test('resolveEnvVar returns empty string when no candidates provided', () => {
  assert.equal(resolveEnvVar(), '');
});
