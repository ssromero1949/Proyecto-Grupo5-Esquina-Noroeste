import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToPDF(exercise, solution) {
  try {
    const doc = new jsPDF();
    
    // Función auxiliar para construir el cuerpo de la tabla para un frame específico
    const buildFrameTableBody = (frame) => {
      const body = [];
      for (let i = 0; i < frame.namesRows.length; i++) {
        const row = [frame.namesRows[i]];
        for (let j = 0; j < frame.namesCols.length; j++) {
          const alloc = frame.allocations[i][j];
          const isCrossed = frame.crossedRows.includes(i) || frame.crossedCols.includes(j);
          
          if (alloc !== null) {
            row.push(`[ ${alloc} ]\n$${frame.balancedCosts[i][j]}`);
          } else if (isCrossed) {
            row.push(`-- x --\n$${frame.balancedCosts[i][j]}`);
          } else {
            row.push(`$${frame.balancedCosts[i][j]}`);
          }
        }
        row.push(frame.balancedSupply[i].toString());
        body.push(row);
      }
      
      const demandRow = ["Demanda"];
      for (let j = 0; j < frame.namesCols.length; j++) {
        demandRow.push(frame.balancedDemand[j].toString());
      }
      demandRow.push(frame.balancedDemand.reduce((a, b) => a + b, 0).toString());
      body.push(demandRow);
      return body;
    };

    const headCols = ["O/D", ...solution.frames[0].namesCols, "Oferta"];
    let nextY = 20;

    // Título General
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`Reporte: ${exercise.name} (Esquina Noroeste)`, 14, nextY);
    nextY += 8;
    
    doc.setFontSize(11);
    doc.text(`Estado Inicial: ${exercise.isBalanced ? 'Equilibrado' : 'Desequilibrado'}`, 14, nextY);
    nextY += 6;
    if (!exercise.isBalanced) {
       doc.text(`(Se aplicó auto-balanceo lógico agregando fila/columna ficticia con costo 0)`, 14, nextY);
       nextY += 8;
    } else {
       nextY += 4;
    }

    if (exercise.statement) {
       doc.setFontSize(10);
       doc.setTextColor(80, 80, 80);
       const splitStatement = doc.splitTextToSize(exercise.statement, 180);
       doc.text(splitStatement, 14, nextY);
       nextY += (splitStatement.length * 5) + 6;
    }

    // Recorremos todos los frames para imprimir el historial visual completo
    solution.frames.forEach((frame) => {
      // Verificamos si necesitamos una nueva página antes de imprimir el siguiente paso
      if (nextY > 250) {
        doc.addPage();
        nextY = 20;
      }

      if (frame.step === 0) {
        doc.setFontSize(14);
        doc.setTextColor(59, 130, 246); // Azul
        doc.text("Matriz de Costos Inicial (Balanceada)", 14, nextY);
        nextY += 6;
      } else {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        // Dividir el texto narrativo si es muy largo
        const textLines = doc.splitTextToSize(frame.narrative, 180);
        doc.text(textLines, 14, nextY);
        nextY += (textLines.length * 5) + 2;
      }

      autoTable(doc, {
        startY: nextY,
        head: [headCols],
        body: buildFrameTableBody(frame),
        theme: 'grid',
        styles: { halign: 'center', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: frame.step === solution.frames.length - 1 ? [16, 185, 129] : [59, 130, 246] },
        didParseCell: function(data) {
           // Resaltar visualmente las celdas asignadas (verde) y las tachadas (gris)
           if (data.section === 'body' && data.cell.text[0]) {
               if (data.cell.text[0].includes('[ ')) {
                   data.cell.styles.fillColor = [209, 250, 229]; // Fondo Verde Claro
                   data.cell.styles.textColor = [6, 78, 59]; // Texto Verde Oscuro
                   data.cell.styles.fontStyle = 'bold';
               } else if (data.cell.text[0].includes('-- x --')) {
                   data.cell.styles.textColor = [156, 163, 175]; // Texto Gris
               }
           }
        }
      });

      nextY = doc.lastAutoTable.finalY + 12;
    });

    // --- Costo Total ---
    if (nextY > 270) {
      doc.addPage();
      nextY = 20;
    }
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Verde
    doc.text(`Costo Total de Transporte: $${solution.totalCost}`, 14, nextY);
    
    // Fallback robusto para descargar en Electron
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MEN_${exercise.name.replace(/ /g, "_")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Hubo un error al generar el PDF. Revisa la consola.");
  }
}
