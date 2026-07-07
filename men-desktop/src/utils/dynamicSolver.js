// dynamicSolver.js

/**
 * Genera un problema de la diligencia aleatorio.
 * @param {number} numStages - Número de etapas intermedias
 * @returns {object} Problema generado { stages, nodes, edges }
 */
export function generateStagecoachProblem(numStages = 3) {
  const nodes = [];
  const edges = [];
  let nodeId = 1;

  // Nodo origen (etapa 0)
  nodes.push({ id: nodeId, label: 'Origen', stage: 0 });
  const originId = nodeId++;

  // Etapas intermedias
  const stagesNodes = [[originId]]; // Array of arrays of node IDs
  
  for (let i = 1; i <= numStages; i++) {
    const numNodes = Math.floor(Math.random() * 3) + 2; // 2 a 4 nodos por etapa
    const currentStageNodes = [];
    for (let j = 0; j < numNodes; j++) {
      nodes.push({ id: nodeId, label: String.fromCharCode(64 + nodeId - 1), stage: i });
      currentStageNodes.push(nodeId++);
    }
    stagesNodes.push(currentStageNodes);
  }

  // Nodo destino (etapa N+1)
  nodes.push({ id: nodeId, label: 'Destino', stage: numStages + 1 });
  const destId = nodeId;
  stagesNodes.push([destId]);

  // Generar conexiones (aristas) de etapa a etapa+1
  for (let i = 0; i < stagesNodes.length - 1; i++) {
    const fromNodes = stagesNodes[i];
    const toNodes = stagesNodes[i + 1];

    fromNodes.forEach(fromNode => {
      toNodes.forEach(toNode => {
        // En un problema estándar de diligencia, a veces no todas las rutas existen, pero para simplificar, conectamos todas con costos aleatorios.
        const cost = Math.floor(Math.random() * 20) + 2; // Costo entre 2 y 21
        edges.push({ from: fromNode, to: toNode, cost });
      });
    });
  }

  return { id: `diligencia-${Date.now()}-${Math.floor(Math.random() * 1000)}`, nodes, edges, stagesCount: numStages + 2, stagesNodes };
}

/**
 * Genera un lote de problemas de la diligencia.
 * @param {number} count - Número de problemas a generar
 * @returns {Array} Arreglo de problemas
 */
export function generateDynamicBatch(count = 5) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push(generateStagecoachProblem(3));
  }
  return batch;
}

/**
 * Resuelve el problema usando programación dinámica hacia atrás (backward recursion).
 * @param {object} problem - { nodes, edges, stagesCount, stagesNodes }
 * @returns {object} Solución { tables, optimalPath, minCost }
 */
export function solveDynamicProgramming(problem) {
  const { nodes, edges, stagesCount, stagesNodes } = problem;
  
  // f_n(s) = min { c(s,x) + f_{n-1}(x) }
  const tables = [];
  const f_star = {}; // f_star[nodeId] = min cost to destination

  // El nodo de destino tiene costo 0 hacia el destino
  const destId = stagesNodes[stagesCount - 1][0];
  f_star[destId] = 0;

  // Resolver etapa por etapa de atrás hacia adelante
  for (let n = stagesCount - 2; n >= 0; n--) {
    const currentStageNodes = stagesNodes[n];
    const nextStageNodes = stagesNodes[n + 1];
    
    const stageTable = {
      stageIndex: stagesCount - 1 - n, // 1 para la última decisión, etc.
      rows: []
    };

    currentStageNodes.forEach(s => {
      const row = { state: s, decisions: {}, f_star: Infinity, x_star: [] };
      
      nextStageNodes.forEach(x => {
        const edge = edges.find(e => e.from === s && e.to === x);
        if (edge) {
          const cost = edge.cost + f_star[x];
          row.decisions[x] = { costEdge: edge.cost, costTotal: cost };
          
          if (cost < row.f_star) {
            row.f_star = cost;
            row.x_star = [x];
          } else if (cost === row.f_star) {
            row.x_star.push(x);
          }
        }
      });
      
      f_star[s] = row.f_star;
      stageTable.rows.push(row);
    });

    tables.push(stageTable);
  }

  // Reconstruir la ruta óptima
  let optimalPaths = [];
  const startNode = stagesNodes[0][0];

  function buildPaths(currentNode, currentPath) {
    if (currentNode === destId) {
      optimalPaths.push([...currentPath, currentNode]);
      return;
    }
    
    // Buscar la decisión óptima para el currentNode en la tabla correspondiente
    const stageIndexReversed = nodes.find(n => n.id === currentNode).stage;
    const tableIndex = stagesCount - 2 - stageIndexReversed;
    const table = tables[tableIndex];
    const row = table.rows.find(r => r.state === currentNode);

    if (row && row.x_star) {
      row.x_star.forEach(nextX => {
        buildPaths(nextX, [...currentPath, currentNode]);
      });
    }
  }

  buildPaths(startNode, []);
  
  return {
    tables, // Tablas en orden inverso (Etapa 1 = la más cercana al destino)
    optimalPaths,
    minCost: f_star[startNode]
  };
}
