import test from 'node:test';
import assert from 'node:assert/strict';
import { zodV4Resolver } from '../src/lib/zodResolver.ts';
import { registerSchema } from '../src/features/auth/schemas.ts';

const resolver = zodV4Resolver(registerSchema);

async function runResolver(data) {
  return resolver(data, {}, {});
}

test('resolver returns valid values for valid registration input', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  assert.ok(result.errors, 'errors should be present');
  assert.equal(Object.keys(result.errors).length, 0, 'no field errors');
  assert.equal(result.values.fullName, 'Jane Doe');
  assert.equal(result.values.email, 'jane@example.com');
});

test('resolver returns field-level errors for missing required fields', async () => {
  const result = await runResolver({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  assert.equal(Object.keys(result.errors).length, 4);
  assert.ok(result.errors.fullName?.message);
  assert.ok(result.errors.email?.message);
  assert.ok(result.errors.password?.message);
  assert.ok(result.errors.confirmPassword?.message);
  assert.equal(Object.keys(result.values).length, 0);
});

test('resolver maps confirmPassword refinement error to confirmPassword field', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password1',
    confirmPassword: 'Password2',
  });
  assert.ok(result.errors.confirmPassword, 'confirmPassword should have an error');
  assert.equal(
    result.errors.confirmPassword.message,
    'Passwords do not match'
  );
  assert.equal(Object.keys(result.errors).length, 1);
});

test('resolver rejects short full name', async () => {
  const result = await runResolver({
    fullName: 'J',
    email: 'jane@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  assert.ok(result.errors.fullName?.message);
});

test('resolver rejects invalid email', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'not-an-email',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  assert.ok(result.errors.email?.message);
});

test('resolver rejects short password', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Pass1',
    confirmPassword: 'Pass1',
  });
  assert.ok(result.errors.password?.message);
});

test('resolver rejects password without uppercase', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password1',
    confirmPassword: 'password1',
  });
  assert.ok(result.errors.password?.message);
});

test('resolver rejects password without lowercase', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'PASSWORD1',
    confirmPassword: 'PASSWORD1',
  });
  assert.ok(result.errors.password?.message);
});

test('resolver rejects password without number', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password',
    confirmPassword: 'Password',
  });
  assert.ok(result.errors.password?.message);
});

test('resolver rejects missing confirm password', async () => {
  const result = await runResolver({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password1',
    confirmPassword: '',
  });
  assert.ok(result.errors.confirmPassword?.message);
});

test('resolver accepts full name at max length', async () => {
  const result = await runResolver({
    fullName: 'A'.repeat(60),
    email: 'a@b.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  assert.equal(Object.keys(result.errors).length, 0);
});

test('resolver rejects full name over max length', async () => {
  const result = await runResolver({
    fullName: 'A'.repeat(61),
    email: 'a@b.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
  assert.ok(result.errors.fullName?.message);
});
