// Funciones auxiliares

function createFrame(base, overrides) {
  return { ...base, ...overrides };
}

// 1. Algoritmo de Dijkstra (Ruta Más Corta)
export function solveDijkstra(exercise) {
  const { nodes, edges, source, sink } = exercise;
  const frames = [];
  
  const dist = {};
  const prev = {};
  const unvisited = new Set(nodes.map(n => n.id));
  
  nodes.forEach(n => {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  });
  dist[source] = 0;

  let baseState = {
    narrative: 'Inicialización: Distancia al origen (S) es 0, y a los demás nodos es infinito (∞).',
    distances: { ...dist },
    visitedNodes: [],
    activeNode: null,
    activeEdges: [],
    path: []
  };
  
  frames.push(createFrame(baseState, {}));

  const visitedList = [];

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let u = null;
    let minDist = Infinity;
    for (let nodeId of unvisited) {
      if (dist[nodeId] < minDist) {
        minDist = dist[nodeId];
        u = nodeId;
      }
    }

    if (u === null) break; // All remaining vertices are inaccessible
    if (u === sink) {
      visitedList.push(u);
      baseState.visitedNodes = [...visitedList];
      frames.push(createFrame(baseState, {
        narrative: `¡Hemos llegado al nodo destino (${sink}) con una distancia mínima de ${dist[sink]}! Terminamos la búsqueda.`,
        activeNode: u
      }));
      break;
    }

    unvisited.delete(u);
    visitedList.push(u);
    baseState.visitedNodes = [...visitedList];

    frames.push(createFrame(baseState, {
      narrative: `Visitando nodo ${u}. Distancia actual: ${dist[u]}. Buscando vecinos no visitados.`,
      activeNode: u
    }));

    const neighbors = edges.filter(e => e.from === u && unvisited.has(e.to));
    
    if (neighbors.length > 0) {
      for (let edge of neighbors) {
        const v = edge.to;
        const alt = dist[u] + edge.cost;
        let narrative = `Evaluando arista ${u} -> ${v} (costo ${edge.cost}). `;
        
        if (alt < dist[v]) {
          narrative += `Nueva distancia (${dist[u]} + ${edge.cost} = ${alt}) es menor que la actual (${dist[v] === Infinity ? '∞' : dist[v]}). Actualizando.`;
          dist[v] = alt;
          prev[v] = u;
        } else {
          narrative += `La distancia alternativa (${alt}) no mejora la actual (${dist[v]}). No se actualiza.`;
        }

        baseState.distances = { ...dist };
        frames.push(createFrame(baseState, {
          narrative,
          activeNode: u,
          activeEdges: [edge.id]
        }));
      }
    } else {
      frames.push(createFrame(baseState, {
        narrative: `El nodo ${u} no tiene vecinos no visitados accesibles.`,
        activeNode: u
      }));
    }
  }

  // Reconstruct path
  const path = [];
  let curr = sink;
  if (prev[curr] !== null || curr === source) {
    while (curr !== null) {
      path.unshift(curr);
      curr = prev[curr];
    }
  }

  frames.push(createFrame(baseState, {
    narrative: path.length > 0 ? `Ruta más corta encontrada: ${path.join(' -> ')} con costo total de ${dist[sink]}.` : `No existe ruta desde ${source} hasta ${sink}.`,
    activeNode: null,
    activeEdges: [],
    path
  }));

  return { method: 'Dijkstra', frames, finalDistance: dist[sink], path };
}

// 2. Algoritmo de Kruskal (Árbol de Expansión Mínima)
class UnionFind {
  constructor(elements) {
    this.parent = {};
    elements.forEach(e => (this.parent[e] = e));
  }
  find(a) {
    if (this.parent[a] === a) return a;
    return this.parent[a] = this.find(this.parent[a]);
  }
  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent[rootA] = rootB;
      return true;
    }
    return false;
  }
}

export function solveKruskal(exercise) {
  const { nodes, edges } = exercise;
  const frames = [];
  
  // Treat as undirected, remove duplicate edges if any, sort by cost
  const sortedEdges = [...edges].sort((a, b) => a.cost - b.cost);
  const uf = new UnionFind(nodes.map(n => n.id));
  
  const mstEdges = [];
  let totalCost = 0;

  let baseState = {
    narrative: 'Inicialización: Ordenamos todas las aristas de menor a mayor costo.',
    mstEdges: [],
    activeEdges: [],
    totalCost: 0
  };

  frames.push(createFrame(baseState, {}));

  for (let edge of sortedEdges) {
    let narrative = `Evaluando arista ${edge.from} - ${edge.to} (costo: ${edge.cost}). `;
    
    if (uf.union(edge.from, edge.to)) {
      mstEdges.push(edge.id);
      totalCost += edge.cost;
      narrative += `No forma ciclo. Se agrega al Árbol de Expansión Mínima. Costo acumulado: ${totalCost}.`;
      baseState.mstEdges = [...mstEdges];
      baseState.totalCost = totalCost;
    } else {
      narrative += `Forma un ciclo con las aristas actuales. Se descarta.`;
    }

    frames.push(createFrame(baseState, {
      narrative,
      activeEdges: [edge.id]
    }));

    if (mstEdges.length === nodes.length - 1) {
      frames.push(createFrame(baseState, {
        narrative: `Se han conectado todos los ${nodes.length} nodos con ${mstEdges.length} aristas. El Árbol de Expansión Mínima está completo.`,
        activeEdges: []
      }));
      break;
    }
  }

  frames.push(createFrame(baseState, {
    narrative: `Algoritmo finalizado. Costo total del Árbol de Expansión Mínima: ${totalCost}.`,
    activeEdges: []
  }));

  return { method: 'Kruskal', frames, mstEdges, totalCost };
}

// 3. Algoritmo de Ford-Fulkerson (Flujo Máximo)
export function solveFordFulkerson(exercise) {
  const { nodes, edges, source, sink } = exercise;
  const frames = [];

  // Residual graph
  const capacity = {};
  const flow = {};
  const adj = {};

  nodes.forEach(n => {
    adj[n.id] = [];
  });

  edges.forEach(e => {
    capacity[`${e.from}-${e.to}`] = e.capacity;
    flow[`${e.from}-${e.to}`] = 0;
    
    capacity[`${e.to}-${e.from}`] = 0; // Reverse edge capacity is 0 initially
    flow[`${e.to}-${e.from}`] = 0;
    
    adj[e.from].push(e.to);
    adj[e.to].push(e.from);
  });

  let baseState = {
    narrative: 'Inicialización: Todo el flujo inicial es 0.',
    flow: { ...flow },
    activeEdges: [],
    path: [],
    maxFlow: 0
  };

  frames.push(createFrame(baseState, {}));

  let maxFlow = 0;

  function bfs() {
    const parent = {};
    const visited = new Set([source]);
    const queue = [source];

    while (queue.length > 0) {
      const u = queue.shift();
      
      for (let v of adj[u]) {
        if (!visited.has(v) && capacity[`${u}-${v}`] - flow[`${u}-${v}`] > 0) {
          visited.add(v);
          parent[v] = u;
          queue.push(v);
          if (v === sink) return parent;
        }
      }
    }
    return null;
  }

  while (true) {
    const parent = bfs();
    if (!parent) {
      frames.push(createFrame(baseState, {
        narrative: `No se encontraron más rutas de aumento desde el Origen al Destino en el grafo residual. Algoritmo terminado.`,
        activeEdges: [],
        path: []
      }));
      break;
    }

    // Find path capacity
    let pathFlow = Infinity;
    let curr = sink;
    const pathEdges = [];
    const pathNodes = [sink];
    
    while (curr !== source) {
      const p = parent[curr];
      const resCap = capacity[`${p}-${curr}`] - flow[`${p}-${curr}`];
      pathFlow = Math.min(pathFlow, resCap);
      
      // Find original edge id for visualization
      const originalEdge = edges.find(e => (e.from === p && e.to === curr) || (e.from === curr && e.to === p));
      if (originalEdge) pathEdges.push(originalEdge.id);
      
      curr = p;
      pathNodes.unshift(curr);
    }

    frames.push(createFrame(baseState, {
      narrative: `Ruta de aumento encontrada: ${pathNodes.join(' -> ')}. La capacidad mínima en esta ruta (cuello de botella) es ${pathFlow}.`,
      activeEdges: pathEdges,
      path: pathNodes
    }));

    // Augment flow
    curr = sink;
    while (curr !== source) {
      const p = parent[curr];
      flow[`${p}-${curr}`] += pathFlow;
      flow[`${curr}-${p}`] -= pathFlow;
      curr = p;
    }

    maxFlow += pathFlow;
    baseState.flow = { ...flow };
    baseState.maxFlow = maxFlow;

    frames.push(createFrame(baseState, {
      narrative: `Aumentando flujo por ${pathFlow} unidades. Flujo máximo actual acumulado: ${maxFlow}.`,
      activeEdges: pathEdges,
      path: pathNodes
    }));
  }

  frames.push(createFrame(baseState, {
    narrative: `¡Flujo máximo total alcanzado: ${maxFlow}!`,
    activeEdges: [],
    path: []
  }));

  return { method: 'Ford-Fulkerson', frames, maxFlow };
}
