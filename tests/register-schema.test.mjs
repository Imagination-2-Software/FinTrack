import test from 'node:test';
import { registerSchema } from '../src/features/auth/schemas.ts';

function assertInvalid(schema, data, field, message) {
  const result = schema.safeParse(data);
  if (result.success) {
    throw new Error(`Expected validation to fail for ${JSON.stringify(data)}`);
  }
  const fieldIssues = result.error.issues.filter((i) => i.path.join('.') === field);
  if (fieldIssues.length === 0) {
    throw new Error(`Expected error on field "${field}" for ${JSON.stringify(data)}`);
  }
  if (message && !fieldIssues.some((i) => i.message === message)) {
    throw new Error(`Expected message "${message}" on field "${field}"`);
  }
}

function assertValid(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Expected validation to pass for ${JSON.stringify(data)}, got: ${result.error.issues.map((i) => i.message).join(', ')}`);
  }
}

test('register schema accepts valid input', () => {
  assertValid(registerSchema, {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
});

test('register schema rejects missing full name', () => {
  assertInvalid(registerSchema, { fullName: '', email: 'a@b.com', password: 'Password1', confirmPassword: 'Password1' }, 'fullName');
});

test('register schema rejects short full name', () => {
  assertInvalid(registerSchema, { fullName: 'J', email: 'a@b.com', password: 'Password1', confirmPassword: 'Password1' }, 'fullName');
});

test('register schema rejects missing email', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: '', password: 'Password1', confirmPassword: 'Password1' }, 'email');
});

test('register schema rejects invalid email', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'not-an-email', password: 'Password1', confirmPassword: 'Password1' }, 'email');
});

test('register schema rejects missing password', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: '', confirmPassword: '' }, 'password');
});

test('register schema rejects short password', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'Pass1', confirmPassword: 'Pass1' }, 'password');
});

test('register schema rejects password without uppercase', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'password1', confirmPassword: 'password1' }, 'password');
});

test('register schema rejects password without lowercase', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'PASSWORD1', confirmPassword: 'PASSWORD1' }, 'password');
});

test('register schema rejects password without number', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'Password', confirmPassword: 'Password' }, 'password');
});

test('register schema rejects missing confirm password', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'Password1', confirmPassword: '' }, 'confirmPassword');
});

test('register schema rejects mismatched passwords', () => {
  assertInvalid(registerSchema, { fullName: 'Jane Doe', email: 'a@b.com', password: 'Password1', confirmPassword: 'Password2' }, 'confirmPassword', 'Passwords do not match');
});

test('register schema accepts full name at max length', () => {
  assertValid(registerSchema, {
    fullName: 'A'.repeat(60),
    email: 'a@b.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  });
});

test('register schema rejects full name over max length', () => {
  assertInvalid(registerSchema, { fullName: 'A'.repeat(61), email: 'a@b.com', password: 'Password1', confirmPassword: 'Password1' }, 'fullName');
});
