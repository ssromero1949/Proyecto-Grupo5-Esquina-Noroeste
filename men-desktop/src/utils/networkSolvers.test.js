import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCpm, solvePert } from './networkSolvers.js';

const criticalExercise = {
  id: 'critical-1',
  name: 'Ejemplo ruta crítica',
  nodes: [
    { id: 'A', duration: 8 },
    { id: 'B', duration: 3 },
    { id: 'C', duration: 7 },
    { id: 'D', duration: 2 },
    { id: 'E', duration: 6 }
  ],
  edges: [
    { id: 'e1', from: 'A', to: 'B' },
    { id: 'e2', from: 'A', to: 'C' },
    { id: 'e3', from: 'A', to: 'D' },
    { id: 'e4', from: 'B', to: 'E' },
    { id: 'e5', from: 'C', to: 'E' },
    { id: 'e6', from: 'D', to: 'E' }
  ]
};

test('solveCpm devuelve la ruta crítica con nodos ficticios de inicio y fin', () => {
  const result = solveCpm(criticalExercise);

  assert.equal(result.method, 'CPM');
  assert.deepEqual(result.criticalPath, ['Inicio', 'A', 'C', 'E', 'Fin']);
  assert.equal(result.totalDuration, 21);
  assert.deepEqual(result.criticalEdges, ['e2', 'e5']);
  assert.equal(result.finalStates.Inicio.earliestStart, 0);
  assert.equal(result.finalStates.Fin.latestFinish, 21);
  assert.equal(result.finalStates.A.slack, 0);
  assert.equal(result.finalStates.C.slack, 0);
});

test('solvePert calcula tiempos esperados y conserva la ruta crítica', () => {
  const result = solvePert({
    ...criticalExercise,
    nodes: [
      { id: 'A', optimistic: 7, mostLikely: 8, pessimistic: 9 },
      { id: 'B', optimistic: 2, mostLikely: 3, pessimistic: 4 },
      { id: 'C', optimistic: 6, mostLikely: 7, pessimistic: 8 },
      { id: 'D', optimistic: 1, mostLikely: 2, pessimistic: 3 },
      { id: 'E', optimistic: 5, mostLikely: 6, pessimistic: 7 }
    ],
    edges: [
      { id: 'e1', from: 'A', to: 'B' },
      { id: 'e2', from: 'A', to: 'C' },
      { id: 'e3', from: 'A', to: 'D' },
      { id: 'e4', from: 'B', to: 'E' },
      { id: 'e5', from: 'C', to: 'E' },
      { id: 'e6', from: 'D', to: 'E' }
    ]
  });

  assert.equal(result.method, 'PERT');
  assert.deepEqual(result.criticalPath, ['Inicio', 'A', 'C', 'E', 'Fin']);
  assert.equal(result.totalDuration, 21);
  assert.deepEqual(result.criticalEdges, ['e2', 'e5']);
  assert.equal(result.finalStates.E.slack, 0);
});
