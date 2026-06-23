import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportNetworkToPDF(exercise, solution) {
  const doc = new jsPDF();
  let currentY = 15;

  // Título
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Reporte de Análisis de Redes: ${exercise.name}`, 14, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-500
  doc.text(`Algoritmo Utilizado: ${solution.method}`, 14, currentY);
  currentY += 6;
  doc.text(`Origen: ${exercise.source} | Destino: ${exercise.sink}`, 14, currentY);
  currentY += 10;

  // Lista de Nodos
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text("Nodos del Grafo", 14, currentY);
  currentY += 6;
  
  const nodesBody = [exercise.nodes.map(n => n.id).join(', ')];
  doc.autoTable({
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

  doc.autoTable({
    startY: currentY,
    head: [['Ruta', 'Valor Atributo']],
    body: edgesBody,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });
  currentY = doc.lastAutoTable.finalY + 15;

  // Solución Final
  doc.setFontSize(14);
  doc.text("Resultado Final", 14, currentY);
  currentY += 6;

  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61); // green-700
  
  if (solution.method === 'Dijkstra') {
    doc.text(`Distancia Mínima: ${solution.finalDistance}`, 14, currentY);
    currentY += 6;
    doc.text(`Ruta Óptima: ${solution.path.join(' -> ')}`, 14, currentY);
  } else if (solution.method === 'Kruskal') {
    doc.text(`Costo Total del Árbol: ${solution.totalCost}`, 14, currentY);
    currentY += 6;
    doc.text(`Aristas en el Árbol: ${solution.mstEdges.length}`, 14, currentY);
  } else if (solution.method === 'Ford-Fulkerson') {
    doc.text(`Flujo Máximo: ${solution.maxFlow}`, 14, currentY);
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

  doc.autoTable({
    startY: currentY,
    head: [['Paso', 'Descripción de la Iteración']],
    body: iterationsBody,
    theme: 'striped',
    headStyles: { fillColor: [55, 65, 81] }, // gray-700
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
      `Generado por Sistema MEN & Redes - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`Red_${solution.method}_${exercise.name.replace(/\s+/g, '_')}.pdf`);
}
