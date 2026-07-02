// Funciones auxiliares

function createFrame(base, overrides) {
  return { ...base, ...overrides };
}

function getDurationForEdge(edge, mode) {
  if (mode === 'pert') {
    const optimistic = Number(edge.optimistic ?? edge.cost ?? 1);
    const mostLikely = Number(edge.mostLikely ?? edge.cost ?? 1);
    const pessimistic = Number(edge.pessimistic ?? edge.cost ?? 1);
    return (optimistic + (4 * mostLikely) + pessimistic) / 6;
  }

  return Number(edge.duration ?? edge.cost ?? 1);
}

function getNodeDuration(node, incomingEdges, mode) {
  if (node.id === 'Inicio' || node.id === 'Fin') {
    return 0;
  }

  if (mode === 'pert') {
    const optimistic = Number(node.optimistic ?? node.cost ?? 1);
    const mostLikely = Number(node.mostLikely ?? node.cost ?? 1);
    const pessimistic = Number(node.pessimistic ?? node.cost ?? 1);
    if (node.optimistic !== undefined || node.mostLikely !== undefined || node.pessimistic !== undefined) {
      return (optimistic + (4 * mostLikely) + pessimistic) / 6;
    }
  }

  if (node.duration !== undefined || node.cost !== undefined) {
    return Number(node.duration ?? node.cost ?? 0);
  }

  const directEdge = incomingEdges.find((edge) => edge.to === node.id);
  if (directEdge) {
    return getDurationForEdge(directEdge, mode);
  }

  return 0;
}

function solveCriticalPath(exercise, mode) {
  const { nodes, edges } = exercise;
  const frames = [];

  const activityNodes = nodes.map((n) => ({ ...n }));
  const augmentedNodes = [{ id: 'Inicio' }, ...activityNodes, { id: 'Fin' }];
  const startNodes = activityNodes.filter((node) => !edges.some((edge) => edge.to === node.id)).map((node) => node.id);
  const finishNodes = activityNodes.filter((node) => !edges.some((edge) => edge.from === node.id)).map((node) => node.id);

  const augmentedEdges = [
    ...startNodes.map((nodeId) => ({ id: `start-${nodeId}`, from: 'Inicio', to: nodeId, duration: 0 })),
    ...edges.map((edge) => ({ ...edge })),
    ...finishNodes.map((nodeId) => ({ id: `end-${nodeId}`, from: nodeId, to: 'Fin', duration: 0 }))
  ];

  const adjacency = {};
  const indegree = {};

  augmentedNodes.forEach((n) => {
    adjacency[n.id] = [];
    indegree[n.id] = 0;
  });

  augmentedEdges.forEach((e) => {
    adjacency[e.from].push(e);
    indegree[e.to] += 1;
  });

  const queue = augmentedNodes.map((n) => n.id).filter((id) => indegree[id] === 0);
  const topo = [];

  while (queue.length > 0) {
    const current = queue.shift();
    topo.push(current);
    adjacency[current].forEach((e) => {
      indegree[e.to] -= 1;
      if (indegree[e.to] === 0) queue.push(e.to);
    });
  }

  if (topo.length !== augmentedNodes.length) {
    throw new Error('El grafo contiene un ciclo y no puede resolverse con CPM/PERT.');
  }

  const earliestStart = {};
  const earliestFinish = {};
  const predecessor = {};
  const predecessorEdge = {};
  const nodeDurations = {};

  augmentedNodes.forEach((n) => {
    const originalNode = activityNodes.find((candidate) => candidate.id === n.id);
    earliestStart[n.id] = n.id === 'Inicio' ? 0 : -Infinity;
    earliestFinish[n.id] = n.id === 'Inicio' ? 0 : -Infinity;
    predecessor[n.id] = null;
    predecessorEdge[n.id] = null;
    nodeDurations[n.id] = getNodeDuration(originalNode ?? n, augmentedEdges.filter((edge) => edge.to === n.id), mode);
  });

  // Frame: Introducción y Inicio cálculo hacia adelante
  frames.push({
    narrative: `Se inicia el cálculo de la ruta crítica utilizando ${mode === 'pert' ? 'PERT' : 'CPM'}. Se han integrado nodos ficticios: Inicio (0) y Fin (0).`,
    nodeStates: {},
    activeEdges: [],
    path: [],
    criticalPath: [],
    criticalEdges: [],
    edgeDurations: {}
  });

  frames.push({
    narrative: `Paso 1: CÁLCULO HACIA ADELANTE (IC/TC). Comienza con Inicio: IC=0, TC=0.`,
    nodeStates: { Inicio: { earliestStart: 0, latestFinish: 0, slack: 0, critical: false } },
    activeEdges: [],
    path: [],
    criticalPath: [],
    criticalEdges: [],
    edgeDurations: {}
  });

  topo.forEach((nodeId) => {
    if (nodeId === 'Inicio') return;

    const incoming = augmentedEdges.filter((e) => e.to === nodeId);
    let bestPred = null;
    let bestEdge = null;
    let bestValue = -Infinity;

    incoming.forEach((edge) => {
      const candidate = earliestFinish[edge.from];
      if (Number.isFinite(candidate) && candidate > bestValue) {
        bestValue = candidate;
        bestPred = edge.from;
        bestEdge = edge.id;
      }
    });

    if (bestPred !== null) {
      earliestStart[nodeId] = bestValue;
      earliestFinish[nodeId] = earliestStart[nodeId] + nodeDurations[nodeId];
      predecessor[nodeId] = bestPred;
      predecessorEdge[nodeId] = bestEdge;

      const predDesc = incoming.length > 1 
        ? `Máximo: IC=${Math.max(...incoming.map(e => earliestFinish[e.from])).toFixed(2)}.` 
        : '';
      
      frames.push({
        narrative: `${nodeId}: IC=${earliestStart[nodeId].toFixed(2)}, Duración=${nodeDurations[nodeId].toFixed(2)}, TC=${earliestFinish[nodeId].toFixed(2)}. ${predDesc}`,
        nodeStates: {},
        activeEdges: [],
        path: [],
        criticalPath: [],
        criticalEdges: [],
        edgeDurations: {}
      });
    }
  });

  const totalDuration = Number.isFinite(earliestFinish.Fin) ? earliestFinish.Fin : 0;

  frames.push({
    narrative: `Tiempo total del proyecto: ${totalDuration.toFixed(2)} unidades.`,
    nodeStates: {},
    activeEdges: [],
    path: [],
    criticalPath: [],
    criticalEdges: [],
    edgeDurations: {}
  });

  const latestStart = {};
  const latestFinish = {};

  augmentedNodes.forEach((n) => {
    latestFinish[n.id] = n.id === 'Fin' ? totalDuration : Infinity;
  });

  frames.push({
    narrative: `Paso 2: CÁLCULO HACIA ATRÁS (IL/TL). Comienza desde Fin: TL=${totalDuration.toFixed(2)}, IL=${totalDuration.toFixed(2)}.`,
    nodeStates: { Fin: { earliestStart: totalDuration, latestFinish: totalDuration, slack: 0, critical: false } },
    activeEdges: [],
    path: [],
    criticalPath: [],
    criticalEdges: [],
    edgeDurations: {}
  });

  for (let i = topo.length - 1; i >= 0; i -= 1) {
    const nodeId = topo[i];
    if (nodeId === 'Fin') {
      latestStart[nodeId] = totalDuration;
      latestFinish[nodeId] = totalDuration;
      continue;
    }

    const outgoing = augmentedEdges.filter((e) => e.from === nodeId);
    if (outgoing.length === 0) {
      latestStart[nodeId] = latestFinish[nodeId] - nodeDurations[nodeId];
      continue;
    }

    const successorValues = outgoing.map((edge) => latestStart[edge.to]);
    latestFinish[nodeId] = Math.min(...successorValues);
    latestStart[nodeId] = latestFinish[nodeId] - nodeDurations[nodeId];

    const succDesc = outgoing.length > 1 
      ? `Mínimo: TL=${Math.min(...successorValues).toFixed(2)}.` 
      : '';

    frames.push({
      narrative: `${nodeId}: TL=${latestFinish[nodeId].toFixed(2)}, Duración=${nodeDurations[nodeId].toFixed(2)}, IL=${latestStart[nodeId].toFixed(2)}. ${succDesc}`,
      nodeStates: {},
      activeEdges: [],
      path: [],
      criticalPath: [],
      criticalEdges: [],
      edgeDurations: {}
    });
  }

  const criticalNodeIds = new Set();
  const slackValues = {};

  augmentedNodes.forEach((n) => {
    const slack = latestStart[n.id] - earliestStart[n.id];
    slackValues[n.id] = slack;
    if (slack === 0) {
      criticalNodeIds.add(n.id);
    }
  });

  frames.push({
    narrative: `Paso 3: CÁLCULO DE HOLGURA. Fórmula: H = IL - IC.`,
    nodeStates: {},
    activeEdges: [],
    path: [],
    criticalPath: [],
    criticalEdges: [],
    edgeDurations: {}
  });

  augmentedNodes.forEach((n) => {
    if (n.id === 'Inicio' || n.id === 'Fin') return;
    
    const slack = slackValues[n.id];
    const indicator = slack === 0 ? '✓ CRÍTICA' : '';
    
    frames.push({
      narrative: `${n.id}: H = ${latestStart[n.id].toFixed(2)} - ${earliestStart[n.id].toFixed(2)} = ${slack.toFixed(2)} ${indicator}`,
      nodeStates: {},
      activeEdges: [],
      path: [],
      criticalPath: [],
      criticalEdges: [],
      edgeDurations: {}
    });
  });

  const criticalPathNodes = [];
  let currentNode = 'Fin';
  while (currentNode) {
    criticalPathNodes.unshift(currentNode);
    if (currentNode === 'Inicio') break;

    const prev = predecessor[currentNode];
    if (!prev || !criticalNodeIds.has(prev)) {
      break;
    }

    currentNode = prev;
  }

  if (criticalPathNodes[0] !== 'Inicio') {
    criticalPathNodes.unshift('Inicio');
  }

  const criticalEdges = augmentedEdges
    .filter((edge) => edge.id && !edge.id.startsWith('start-') && !edge.id.startsWith('end-'))
    .filter((edge) => criticalPathNodes.includes(edge.from) && criticalPathNodes.includes(edge.to))
    .map((edge) => edge.id);

  const nodeStates = {};
  augmentedNodes.forEach((n) => {
    const earliest = Number.isFinite(earliestStart[n.id]) ? earliestStart[n.id] : 0;
    const latest = Number.isFinite(latestFinish[n.id]) ? latestFinish[n.id] : earliest;
    nodeStates[n.id] = {
      earliestStart: earliest,
      latestFinish: latest,
      latestStart: Number.isFinite(latestStart[n.id]) ? latestStart[n.id] : latest,
      slack: (Number.isFinite(latestStart[n.id]) ? latestStart[n.id] : latest) - earliest,
      critical: criticalNodeIds.has(n.id)
    };
  });

  frames.push({
    narrative: `Paso 4: RUTA CRÍTICA IDENTIFICADA. Camino: ${criticalPathNodes.join(' → ')}. Duración: ${totalDuration.toFixed(2)} unidades. Sin holgura, todo retraso afecta el proyecto.`,
    nodeStates,
    activeEdges: criticalEdges,
    path: criticalPathNodes,
    criticalPath: criticalPathNodes,
    criticalEdges,
    totalDuration,
    edgeDurations: Object.fromEntries(augmentedEdges.map((edge) => [edge.id, getDurationForEdge(edge, mode)]))
  });

  return {
    method: mode === 'pert' ? 'PERT' : 'CPM',
    frames,
    totalDuration,
    criticalPath: criticalPathNodes,
    criticalEdges,
    finalStates: nodeStates,
    graph: {
      nodes: augmentedNodes,
      edges: augmentedEdges,
      source: 'Inicio',
      sink: 'Fin'
    }
  };
}

export function solveCpm(exercise) {
  return solveCriticalPath(exercise, 'cpm');
}

export function solvePert(exercise) {
  return solveCriticalPath(exercise, 'pert');
}

// 1. Algoritmo de Dijkstra (Ruta Más Corta)
export function solveDijkstra(exercise) {
  const { nodes, edges, source, sink } = exercise;
  const frames = [];
  
  // Estado de los nodos
  const nodeStates = {}; 
  
  nodes.forEach(n => {
    nodeStates[n.id] = { status: 'none', value: Infinity, predecessor: null };
  });

  // Paso 1: Nodo Origen
  nodeStates[source] = { status: 'permanente', value: 0, predecessor: null };

  let baseState = {
    narrative: `Paso 1: El nodo origen (${source}) recibe un valor de 0 y es clasificado inmediatamente como Permanente.`,
    nodeStates: JSON.parse(JSON.stringify(nodeStates)),
    activeNode: source,
    activeEdges: [],
    path: []
  };
  
  frames.push(createFrame(baseState, {}));

  let lastPermanente = source;

  while (true) {
    if (lastPermanente === sink) {
      frames.push(createFrame(baseState, {
        narrative: `¡El nodo destino (${sink}) ha sido clasificado como Permanente! Terminamos la búsqueda.`,
        activeNode: sink,
        activeEdges: []
      }));
      break;
    }

    // Paso 2: Cálculo de Temporales
    const neighbors = edges.filter(e => e.from === lastPermanente && nodeStates[e.to].status !== 'permanente');
    
    if (neighbors.length > 0) {
      for (let edge of neighbors) {
        const v = edge.to;
        const currentPermanenteValue = nodeStates[lastPermanente].value;
        const edgeCost = edge.cost;
        const sum = currentPermanenteValue + edgeCost;
        
        let narrative = `Evaluando arista ${lastPermanente} -> ${v} (Costo: ${edgeCost}). Suma: ${currentPermanenteValue} + ${edgeCost} = ${sum}. `;
        
        const existingState = nodeStates[v];
        if (existingState.status === 'none' || sum < existingState.value) {
          narrative += existingState.status === 'none' 
            ? `El nodo ${v} recibe su primer valor Temporal: ${sum}. Predecesor asignado: ${lastPermanente}.`
            : `La nueva suma (${sum}) es menor que el valor Temporal actual (${existingState.value}). Se actualiza el Temporal a ${sum} y el predecesor cambia a ${lastPermanente}.`;
            
          nodeStates[v].status = 'temporal';
          nodeStates[v].value = sum;
          nodeStates[v].predecessor = lastPermanente;
        } else {
          narrative += `La nueva suma (${sum}) NO es menor que el valor Temporal actual (${existingState.value}). Se conserva el valor anterior.`;
        }

        baseState.nodeStates = JSON.parse(JSON.stringify(nodeStates));
        frames.push(createFrame(baseState, {
          narrative,
          activeNode: lastPermanente,
          activeEdges: [edge.id]
        }));
      }
    } else {
      frames.push(createFrame(baseState, {
        narrative: `El nodo ${lastPermanente} no tiene vecinos que no sean Permanentes.`,
        activeNode: lastPermanente,
        activeEdges: []
      }));
    }

    // Paso 3: Conversión a Permanente
    let minNode = null;
    let minValue = Infinity;
    for (let nodeId in nodeStates) {
      const state = nodeStates[nodeId];
      if (state.status === 'temporal' && state.value < minValue) {
        minValue = state.value;
        minNode = nodeId;
      }
    }

    if (minNode === null) {
      frames.push(createFrame(baseState, {
        narrative: `No quedan nodos temporales accesibles. No se puede llegar a todos los nodos restantes.`,
        activeNode: null,
        activeEdges: []
      }));
      break;
    }

    nodeStates[minNode].status = 'permanente';
    lastPermanente = minNode;
    baseState.nodeStates = JSON.parse(JSON.stringify(nodeStates));

    frames.push(createFrame(baseState, {
      narrative: `Paso 3: Seleccionamos el nodo Temporal con el menor valor de toda la red: el nodo ${minNode} (Valor Temporal: ${minValue}). Se fija como Permanente.`,
      activeNode: minNode,
      activeEdges: []
    }));
  }

  // Trazado de ruta por predecesores
  const path = [];
  const finalActiveEdges = [];
  let curr = sink;
  if (nodeStates[sink].status === 'permanente') {
    while (curr !== null) {
      path.unshift(curr);
      const prev = nodeStates[curr].predecessor;
      if (prev !== null) {
        const edge = edges.find(e => e.from === prev && e.to === curr);
        if (edge) finalActiveEdges.push(edge.id);
      }
      curr = prev;
    }
  }

  const finalDist = nodeStates[sink].value;

  frames.push(createFrame(baseState, {
    narrative: path.length > 0 
      ? `Trazado de la ruta final: Retrocediendo desde el destino (${sink}) leyendo los nodos predecesores... Ruta óptima: ${path.join(' -> ')} con peso total de ${finalDist}.` 
      : `No existe ruta desde ${source} hasta ${sink}.`,
    activeNode: null,
    activeEdges: finalActiveEdges,
    path
  }));

  return { method: 'Dijkstra', frames, finalDistance: finalDist, path, finalStates: nodeStates };
}

// 2. Algoritmo de Árbol de Expansión Mínima (Lógica de Prim solicitada: Conjuntos C y C')
export function solveKruskal(exercise) {
  const { nodes, edges } = exercise;
  const frames = [];
  
  // Inicialización de Conjuntos C y C'
  const C = new Set();
  const C_prime = new Set(nodes.map(n => n.id));
  
  // Paso 1: Elegir el primer nodo
  const initialNode = nodes[0].id;
  C.add(initialNode);
  C_prime.delete(initialNode);

  const mstEdges = [];
  let totalCost = 0;

  const getNodeStates = () => {
    const states = {};
    nodes.forEach(n => {
      states[n.id] = { status: C.has(n.id) ? 'C' : 'C_prime' };
    });
    return states;
  };

  let baseState = {
    narrative: `Iteración 1: Iniciamos colocando el primer nodo (${initialNode}) en el conjunto C (Conectados). Los demás nodos van al conjunto C' (No conectados).`,
    nodeStates: getNodeStates(),
    mstEdges: [],
    activeEdges: [],
    totalCost: 0
  };

  frames.push(createFrame(baseState, {}));

  let iteration = 2;
  while (C_prime.size > 0) {
    // Paso 2 y 3: Búsqueda de Frontera y Selección del Menor
    let minEdge = null;
    let minCost = Infinity;
    const frontierEdges = [];

    for (let edge of edges) {
      const inFromC = C.has(edge.from) && C_prime.has(edge.to);
      const inToC = C.has(edge.to) && C_prime.has(edge.from);
      
      // La red es no dirigida para este algoritmo
      if (inFromC || inToC) {
        frontierEdges.push(edge);
        if (edge.cost < minCost) {
          minCost = edge.cost;
          minEdge = edge; // Paso 4: Empates se resuelven arbitrariamente usando el primero menor que aparece (< y no <=)
        }
      }
    }

    if (minEdge === null) {
      frames.push(createFrame(baseState, {
        narrative: `Iteración ${iteration}: No hay arcos que conecten C con C'. El grafo está desconectado.`,
        activeEdges: []
      }));
      break;
    }

    const cNode = C.has(minEdge.from) ? minEdge.from : minEdge.to;
    const cPrimeNode = C.has(minEdge.from) ? minEdge.to : minEdge.from;

    frames.push(createFrame(baseState, {
      narrative: `Iteración ${iteration} (Frontera): Evaluando los ${frontierEdges.length} arcos que conectan C con C'. El arco con la longitud menor es ${cNode} - ${cPrimeNode} (Costo: ${minCost}).`,
      activeEdges: [minEdge.id]
    }));

    // Paso 5: Actualización de Estado
    C.add(cPrimeNode);
    C_prime.delete(cPrimeNode);
    mstEdges.push(minEdge.id);
    totalCost += minCost;

    baseState.nodeStates = getNodeStates();
    baseState.mstEdges = [...mstEdges];
    baseState.totalCost = totalCost;

    frames.push(createFrame(baseState, {
      narrative: `Iteración ${iteration} (Transferencia): El nodo ${cPrimeNode} se mueve del conjunto C' al conjunto C. El arco se incluye en el Árbol de Expansión Mínima.`,
      activeEdges: []
    }));

    iteration++;
  }

  if (C_prime.size === 0) {
    frames.push(createFrame(baseState, {
      narrative: `¡Condición de Detención alcanzada! El conjunto C' está vacío, indicando que el 100% de los nodos están conectados al árbol principal. La longitud total del árbol de expansión mínima es de ${totalCost}.`,
      activeEdges: mstEdges // Resaltar todos al final
    }));
  }

  return { method: 'Kruskal', frames, mstEdges, totalCost, finalStates: getNodeStates() };
}

// 3. Algoritmo de Flujo Máximo (Heurística Voraz - Ford-Fulkerson Video)
export function solveFordFulkerson(exercise) {
  const { nodes, edges, source, sink } = exercise;
  const frames = [];

  // Usamos un mapa para la capacidad residual/disponible.
  const availableCap = {};
  const adj = {};

  nodes.forEach(n => {
    adj[n.id] = [];
  });

  edges.forEach(e => {
    availableCap[e.id] = e.capacity;
    adj[e.from].push({ to: e.to, edgeId: e.id });
  });

  let baseState = {
    narrative: `Inicialización: Las capacidades iniciales de los arcos están intactas. Comenzamos en la Fuente (${source}).`,
    availableCap: { ...availableCap },
    activeEdges: [],
    path: [],
    maxFlow: 0
  };

  frames.push(createFrame(baseState, {}));

  let maxFlow = 0;
  let iteration = 1;

  // Búsqueda Voraz (DFS priorizando mayor capacidad)
  function findGreedyPath() {
    const visited = new Set();
    const path = []; // Arrays of { node, edgeId }
    
    function dfs(curr) {
      if (curr === sink) return true;
      visited.add(curr);
      
      // Ordenar las aristas de salida por mayor capacidad disponible (Heurística)
      const neighbors = adj[curr]
        .filter(n => !visited.has(n.to) && availableCap[n.edgeId] > 0)
        .sort((a, b) => availableCap[b.edgeId] - availableCap[a.edgeId]);
        
      for (let neighbor of neighbors) {
        path.push(neighbor);
        if (dfs(neighbor.to)) return true;
        path.pop(); // Backtrack
      }
      return false;
    }
    
    if (dfs(source)) return path;
    return null;
  }

  while (true) {
    const greedyPath = findGreedyPath();
    if (!greedyPath) {
      const flowCarryingEdges = edges.filter(e => e.capacity - availableCap[e.id] > 0).map(e => e.id);
      frames.push(createFrame(baseState, {
        narrative: `Iteración ${iteration}: No se encontró ninguna trayectoria de aumento. Todas las rutas posibles hacia el Sumidero están bloqueadas. Fin del ciclo.`,
        activeEdges: flowCarryingEdges,
        path: []
      }));
      break;
    }

    // Calcular el cuello de botella
    let bottleneck = Infinity;
    const pathEdges = [];
    const pathNodes = [source];
    
    greedyPath.forEach(step => {
      bottleneck = Math.min(bottleneck, availableCap[step.edgeId]);
      pathEdges.push(step.edgeId);
      pathNodes.push(step.to);
    });

    frames.push(createFrame(baseState, {
      narrative: `Iteración ${iteration} (Búsqueda): Eligiendo siempre el arco con mayor capacidad disponible. Trayectoria: ${pathNodes.join(' -> ')}. \n(Cuello de Botella): El valor mínimo en esta ruta es ${bottleneck}.`,
      activeEdges: pathEdges,
      path: pathNodes
    }));

    // Actualización de capacidades
    let narrativeUpdate = `Iteración ${iteration} (Actualización y Bloqueo): Simulando el envío de flujo. Se resta el cuello de botella (${bottleneck}) a la capacidad de los arcos usados. `;
    let blockedFound = false;

    greedyPath.forEach(step => {
      availableCap[step.edgeId] -= bottleneck;
      if (availableCap[step.edgeId] === 0) {
        narrativeUpdate += `El arco hacia ${step.to} queda bloqueado. `;
        blockedFound = true;
      }
    });
    
    maxFlow += bottleneck;
    narrativeUpdate += `Flujo total acumulado: ${maxFlow}.`;

    baseState.availableCap = { ...availableCap };
    baseState.maxFlow = maxFlow;

    frames.push(createFrame(baseState, {
      narrative: narrativeUpdate,
      activeEdges: pathEdges,
      path: pathNodes
    }));
    
    iteration++;
  }

  frames.push(createFrame(baseState, {
    narrative: `¡Condición de Detención alcanzada! El Flujo Máximo de la red es: ${maxFlow}.`,
    activeEdges: edges.filter(e => e.capacity - availableCap[e.id] > 0).map(e => e.id),
    path: []
  }));

  return { method: 'Ford-Fulkerson', frames, maxFlow };
}
