import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper para dibujar el grafo en el PDF
function drawGraph(doc, exercise, frameData, method, startY) {
  const { nodes, edges } = exercise;
  const width = 800;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 280;
  
  const sortedNodes = [...nodes];
  const sourceNode = sortedNodes.find(n => n.id === exercise.source);
  const sinkNode = sortedNodes.find(n => n.id === exercise.sink);
  const middleNodes = sortedNodes.filter(n => n.id !== exercise.source && n.id !== exercise.sink);
  
  const nodePositions = {};
  if (sourceNode) nodePositions[sourceNode.id] = { x: 60, y: centerY };
  if (sinkNode) nodePositions[sinkNode.id] = { x: width - 60, y: centerY };
  
  middleNodes.forEach((n, i) => {
    const angle = -Math.PI / 2 + (Math.PI / (middleNodes.length + 1)) * (i + 1);
    nodePositions[n.id] = {
      x: centerX + (radius * 0.9) * Math.sin(angle),
      y: centerY + (radius * 0.55) * Math.cos(angle) * (i % 2 === 0 ? 1 : -1)
    };
  });

  const scale = 0.225; // Transforma 800px a ~180mm
  const offsetX = 15;

  const isEdgeActive = (id) => frameData && frameData.activeEdges && frameData.activeEdges.includes(id);
  const isEdgeInMST = (id) => frameData && frameData.mstEdges && frameData.mstEdges.includes(id);
  const isEdgeCritical = (id) => frameData && frameData.criticalEdges && frameData.criticalEdges.includes(id);
  const isNodeActive = (id) => frameData && frameData.activeNode === id;
  const isNodeVisited = (id) => frameData && frameData.visitedNodes && frameData.visitedNodes.includes(id);
  const isNodeInPath = (id) => frameData && frameData.path && frameData.path.includes(id);
  const isNodeCritical = (id) => frameData && frameData.criticalPath && frameData.criticalPath.includes(id);

  // Aristas
  edges.forEach(e => {
    const p1 = nodePositions[e.from];
    const p2 = nodePositions[e.to];
    if (!p1 || !p2) return;
    
    const active = isEdgeActive(e.id) || isEdgeInMST(e.id) || isEdgeCritical(e.id);
    let color = active ? [249, 115, 22] : [156, 163, 175]; // Naranja : Gris claro
    let lineWidth = active ? 0.8 : 0.4;

    let capDisp = null;
    if (method === 'Ford-Fulkerson') {
      capDisp = frameData && frameData.availableCap !== undefined ? frameData.availableCap[e.id] : e.capacity;
      if (capDisp === 0) {
        color = [0, 0, 0];
        lineWidth = 0.8;
      }
    }

    const x1 = offsetX + p1.x * scale;
    const y1 = startY + p1.y * scale;
    const x2 = offsetX + p2.x * scale;
    const y2 = startY + p2.y * scale;

    doc.setDrawColor(...color);
    doc.setLineWidth(lineWidth);
    doc.line(x1, y1, x2, y2);
    
    // Flecha direccional
    if (method !== 'Kruskal') {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowLen = 3;
      const nodeR = 18 * scale; // = 4.05
      const endX = x2 - nodeR * Math.cos(angle);
      const endY = y2 - nodeR * Math.sin(angle);
      
      doc.setFillColor(...color);
      doc.triangle(
        endX, endY,
        endX - arrowLen * Math.cos(angle - Math.PI/6), endY - arrowLen * Math.sin(angle - Math.PI/6),
        endX - arrowLen * Math.cos(angle + Math.PI/6), endY - arrowLen * Math.sin(angle + Math.PI/6),
        'F'
      );
    }

    // Etiqueta
    const midX = offsetX + ((p1.x + p2.x) / 2) * scale;
    const midY = startY + ((p1.y + p2.y) / 2) * scale;
    
    let label = '';
    if (method === 'Dijkstra' || method === 'Kruskal') label = `${e.cost}`;
    else if (method === 'Ford-Fulkerson') label = `${capDisp}`;
    else if (method === 'CPM' || method === 'PERT') {
      const durationValue = frameData && frameData.edgeDurations && frameData.edgeDurations[e.id] !== undefined ? frameData.edgeDurations[e.id] : (e.duration ?? e.cost);
      label = `${Number(durationValue).toFixed(2)}`;
    }
    
    doc.setFillColor(255, 255, 255);
    doc.rect(midX - 3, midY - 2, 6, 4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...color);
    doc.text(label, midX, midY + 1, { align: 'center' });
  });

  // Nodos
  nodes.forEach(n => {
    const p = nodePositions[n.id];
    if (!p) return;
    
    const active = isNodeActive(n.id) || isNodeInPath(n.id) || isNodeCritical(n.id);
    const visited = isNodeVisited(n.id);
    
    let bg = [55, 65, 81]; // Gris oscuro
    if (active) bg = [234, 88, 12]; // Naranja
    else if (visited) bg = [5, 150, 105]; // Verde
    else if (n.id === exercise.source) bg = [37, 99, 235]; // Azul
    else if (n.id === exercise.sink) bg = [124, 58, 237]; // Morado
    
    if (method === 'Dijkstra' && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state && state.status !== 'none' && !active && n.id !== exercise.source && n.id !== exercise.sink) {
         if (state.status === 'permanente') bg = [5, 150, 105];
         else bg = [180, 83, 9];
      }
    } else if (method === 'Kruskal' && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state && !active) {
         if (state.status === 'C') bg = [5, 150, 105];
         else bg = [55, 65, 81];
      }
    } else if ((method === 'CPM' || method === 'PERT') && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state && !active) {
        if (state.critical) bg = [245, 158, 11];
        else if (state.slack === 0) bg = [59, 130, 246];
        else bg = [55, 65, 81];
      }
    }
    
    const nx = offsetX + p.x * scale;
    const ny = startY + p.y * scale;
    const nr = 18 * scale;
    
    doc.setFillColor(...bg);
    doc.circle(nx, ny, nr, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(n.id, nx, ny + 1, { align: 'center', baseline: 'middle' });
    
    // Etiqueta superior
    let topLabel = '';
    if (method === 'Dijkstra' && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state && state.status !== 'none') {
         topLabel = `[${state.status === 'permanente' ? 'Perm' : 'Temp'}: ${state.value}]`;
      }
    } else if (method === 'Kruskal' && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state) topLabel = state.status === 'C' ? '[C]' : "[C']";
    } else if ((method === 'CPM' || method === 'PERT') && frameData && frameData.nodeStates) {
      const state = frameData.nodeStates[n.id];
      if (state) topLabel = `[ES:${state.earliestStart.toFixed(0)}, LF:${state.latestFinish.toFixed(0)}]`;
    }
    
    if (topLabel) {
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(topLabel, nx, ny - nr - 1, { align: 'center' });
    }
  });

  return startY + height * scale; // Retorna el Y donde termina el grafo
}

export function exportNetworkToPDF(exercise, solution) {
  const doc = new jsPDF();
  let currentY = 15;

  // Título
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`Reporte de Analisis de Redes: ${exercise.name}`, 14, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Algoritmo Utilizado: ${solution.method}`, 14, currentY);
  currentY += 6;
  doc.text(`Origen: ${exercise.source} | Destino: ${exercise.sink}`, 14, currentY);
  currentY += 10;

  // === GRAFO INICIAL ===
  if (solution.frames && solution.frames.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Grafo Inicial", 14, currentY);
    currentY += 6;
    currentY = drawGraph(doc, exercise, solution.frames[0], solution.method, currentY);
    currentY += 15;
  }

  // Lista de Nodos
  if (currentY > 250) {
    doc.addPage();
    currentY = 15;
  }
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Nodos del Grafo", 14, currentY);
  currentY += 6;
  
  const nodesBody = [exercise.nodes.map(n => n.id).join(', ')];
  autoTable(doc, {
    startY: currentY,
    head: [['Listado de Nodos']],
    body: [nodesBody],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });
  currentY = doc.lastAutoTable.finalY + 10;

  // Lista de Aristas
  doc.text("Aristas (Conexiones)", 14, currentY);
  currentY += 6;

  const edgesBody = exercise.edges.map(e => {
    let type = solution.method === 'Ford-Fulkerson' ? `Capacidad: ${e.capacity}` : `Costo: ${e.cost}`;
    return [`${e.from} -> ${e.to}`, type];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Ruta', 'Valor Atributo']],
    body: edgesBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // === GRAFO FINAL ===
  if (currentY > 200) { // Si no hay espacio, nueva página
    doc.addPage();
    currentY = 15;
  }

  if (solution.frames && solution.frames.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Grafo Final (Solucion)", 14, currentY);
    currentY += 6;
    currentY = drawGraph(doc, exercise, solution.frames[solution.frames.length - 1], solution.method, currentY);
    currentY += 15;
  }

  // Solución Final
  doc.setFontSize(14);
  doc.text("Resultado Final", 14, currentY);
  currentY += 6;

  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61); // green-700
  
  if (solution.method === 'Dijkstra') {
    doc.text(`Distancia Minima: ${solution.finalDistance}`, 14, currentY);
    currentY += 6;
    doc.text(`Ruta Optima: ${solution.path.join(' -> ')}`, 14, currentY);
    currentY += 10;
    
    if (solution.finalStates) {
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Estado Final de los Nodos", 14, currentY);
      currentY += 6;
      
      const statesBody = Object.keys(solution.finalStates).map(nodeId => {
        const state = solution.finalStates[nodeId];
        return [nodeId, state.status, state.value === Infinity ? '∞' : state.value, state.predecessor || '-'];
      });
      
      autoTable(doc, {
        startY: currentY,
        head: [['Nodo', 'Clasificacion', 'Valor', 'Predecesor']],
        body: statesBody,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }
    
  } else if (solution.method === 'Kruskal') {
    doc.text(`Costo Total del Arbol: ${solution.totalCost}`, 14, currentY);
    currentY += 6;
    doc.text(`Aristas en el Arbol: ${solution.mstEdges.length}`, 14, currentY);
  } else if (solution.method === 'Ford-Fulkerson') {
    doc.text(`Flujo Maximo: ${solution.maxFlow}`, 14, currentY);
  } else if (solution.method === 'CPM' || solution.method === 'PERT') {
    doc.text(`Duración Total del Proyecto: ${solution.totalDuration.toFixed(2)}`, 14, currentY);
    currentY += 6;
    doc.text(`Ruta Crítica: ${solution.criticalPath.join(' -> ')}`, 14, currentY);
  }
  currentY += 15;

  // Iteraciones
  if (currentY > 250) {
    doc.addPage();
    currentY = 15;
  }

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Historial de Iteraciones (Paso a Paso)", 14, currentY);
  currentY += 6;

  const iterationsBody = solution.frames.map((frame, idx) => {
    return [idx, frame.narrative];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Paso', 'Descripcion de la Iteracion']],
    body: iterationsBody,
    theme: 'striped',
    headStyles: { fillColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generado por Sistema MEN & Redes - Pagina ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`Red_${solution.method}_${exercise.name.replace(/\s+/g, '_')}.pdf`);
}
