import { test } from 'node:test';
import assert from 'node:assert/strict';

test('módulo do agendador carrega no Node', async () => {
  const modulo = await import('../src/agendador.js');
  assert.equal(typeof modulo, 'object');
});
