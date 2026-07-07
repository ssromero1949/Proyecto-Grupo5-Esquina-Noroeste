import { useState, useEffect } from 'react';
import { generateDynamicBatch, solveDynamicProgramming } from '../../utils/dynamicSolver';
import DynamicGraph from './DynamicGraph';
import DynamicTables from './DynamicTables';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DynamicModule = () => {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  // Cache for states of each exercise to persist across navigation
  const [exerciseStates, setExerciseStates] = useState({});

  // Get current state for selected exercise, defaulting if not found
  const currentState = selectedExercise && exerciseStates[selectedExercise.id] 
    ? exerciseStates[selectedExercise.id] 
    : { isSolving: false, currentStep: 0, solution: null, maxSteps: 0 };

  const { isSolving, currentStep, solution, maxSteps } = currentState;

  // Update state helper
  const updateState = (updates) => {
    if (!selectedExercise) return;
    setExerciseStates(prev => ({
      ...prev,
      [selectedExercise.id]: {
        ...(prev[selectedExercise.id] || { isSolving: false, currentStep: 0, solution: null, maxSteps: 0 }),
        ...updates
      }
    }));
  };

  // Generar lote inicial
  useEffect(() => {
    handleGenerateNew();
  }, []);

  const handleGenerateNew = () => {
    const batch = generateDynamicBatch(5);
    setExercises(batch);
    setExerciseStates({}); // Reset all states
    if (batch.length > 0) {
      handleSelect(batch[0]);
    }
  };

  const handleSelect = (ex) => {
    setSelectedExercise(ex);
  };

  const handleSolveProblem = () => {
    if (selectedExercise) {
      const result = solveDynamicProgramming(selectedExercise);
      updateState({
        solution: result,
        isSolving: true,
        currentStep: 1,
        maxSteps: result.tables.length + 1
      });
    }
  };

  const exportToPDF = async () => {
    if (!selectedExercise || !solution) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Resolución del Problema de la Diligencia', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Costo Mínimo (Ruta Óptima): ${solution.minCost}`, 14, 32);

    let currentY = 40;

    const captureSvg = async (svgId) => {
      const svgElement = document.getElementById(svgId);
      if (!svgElement) return null;
      try {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return await new Promise((resolve, reject) => {
          img.onload = () => {
            const scale = 4; // Multiplicador para alta resolución (4x)
            const baseWidth = svgElement.clientWidth || 800;
            const baseHeight = svgElement.clientHeight || 400;

            canvas.width = baseWidth * scale;
            canvas.height = baseHeight * scale;
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar la imagen escalada
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            resolve({
              data: canvas.toDataURL('image/png', 1.0),
              width: baseWidth, // Devolvemos el ancho base para mantener la proporción en el PDF
              height: baseHeight
            });
          };
          img.onerror = reject;
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        });
      } catch (err) {
        console.error("Error capturando SVG", err);
        return null;
      }
    };

    // 1. Grafo Inicial
    const initialImg = await captureSvg('dynamic-graph-pdf-initial');
    if (initialImg) {
      doc.setFontSize(14);
      doc.text('Grafo Inicial', 14, currentY);
      currentY += 8;
      const pdfWidth = 180;
      const pdfHeight = (initialImg.height * pdfWidth) / initialImg.width;
      doc.addImage(initialImg.data, 'PNG', 15, currentY, pdfWidth, pdfHeight);
      currentY += pdfHeight + 15;
    }

    // 2. Dibujar las tablas de cada etapa

    solution.tables.forEach((table, index) => {
      doc.setFontSize(14);
      doc.text(`Etapa ${table.stageIndex}`, 14, currentY);
      currentY += 8;

      const stageNodes = selectedExercise.stagesNodes[selectedExercise.stagesCount - 1 - table.stageIndex];
      const nextStageNodes = selectedExercise.stagesNodes[selectedExercise.stagesCount - table.stageIndex];
      
      const head = [['Estado (s)', ...nextStageNodes.map(n => `Decisión x=${selectedExercise.nodes.find(node => node.id === n).label}`), 'f*(s)', 'x*']];
      const body = table.rows.map(row => {
        const stateLabel = selectedExercise.nodes.find(node => node.id === row.state).label;
        
        const decisionCosts = nextStageNodes.map(x => {
          if (row.decisions[x]) {
            return `${row.decisions[x].costEdge} + ${solution.tables[index-1] ? solution.tables[index-1].rows.find(r => r.state === x)?.f_star || 0 : 0} = ${row.decisions[x].costTotal}`;
          }
          return '-';
        });

        const xStarLabels = row.x_star.map(x => selectedExercise.nodes.find(node => node.id === x).label).join(', ');
        
        return [stateLabel, ...decisionCosts, row.f_star, xStarLabels];
      });

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      currentY = doc.lastAutoTable.finalY + 15;
    });

    // 3. Grafo Final
    const finalImg = await captureSvg('dynamic-graph-pdf-final');
    if (finalImg) {
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFontSize(14);
      doc.text('Grafo Final (Rutas Óptimas)', 14, currentY);
      currentY += 8;
      const pdfWidth = 180;
      const pdfHeight = (finalImg.height * pdfWidth) / finalImg.width;
      doc.addImage(finalImg.data, 'PNG', 15, currentY, pdfWidth, pdfHeight);
      currentY += pdfHeight + 15;
    }

    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }

    const optimalPathsStr = solution.optimalPaths.map(path => 
      path.map(id => selectedExercise.nodes.find(n => n.id === id).label).join(' -> ')
    ).join(' | o | ');

    doc.setFontSize(12);
    doc.text(`Ruta(s) Óptima(s): ${optimalPathsStr}`, 14, currentY);

    try {
      // Fallback robusto para descargar en Electron
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Problema_Diligencia_${selectedExercise.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error exporting PDF:", e);
      doc.save(`Problema_Diligencia_${selectedExercise.id}.pdf`);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="glass-panel" style={{ width: '300px', flexShrink: 0, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--primary)' }}>Lote de Ejercicios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {exercises.map((ex, index) => (
              <div
                key={ex.id}
                className={`exercise-card ${selectedExercise?.id === ex.id ? 'active' : ''}`}
                onClick={() => handleSelect(ex)}
              >
                <h4>Problema Diligencia {index + 1}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {ex.stagesCount - 2} etapas intermedias
                </p>
              </div>
            ))}
          </div>
        </div>
        
        <button className="btn" style={{ background: 'var(--primary)', color: 'white', marginTop: 'auto' }} onClick={handleGenerateNew}>
          🔄 Generar Nuevos
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="glass-panel content-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Problema de la Diligencia</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isSolving && selectedExercise && (
                <button className="btn" style={{ background: 'var(--success)', color: 'white' }} onClick={handleSolveProblem}>
                  ▶️ Resolver Paso a Paso
                </button>
              )}
              {isSolving && currentStep > 0 && (
                <button className="btn" style={{ background: 'var(--background-alt)', color: 'white' }} onClick={() => updateState({ currentStep: Math.max(0, currentStep - 1) })}>
                  ⬅️ Paso Anterior
                </button>
              )}
              {isSolving && currentStep < maxSteps && (
                <button className="btn" style={{ background: 'var(--primary)', color: 'white' }} onClick={() => updateState({ currentStep: Math.min(maxSteps, currentStep + 1) })}>
                  Paso Siguiente ➡️
                </button>
              )}
              {isSolving && currentStep === maxSteps && (
                <button className="btn" style={{ background: '#dc3545', color: 'white' }} onClick={exportToPDF}>
                  📄 Exportar PDF
                </button>
              )}
            </div>
          </div>

          {selectedExercise && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(!isSolving || currentStep === 0) && (
                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>Contexto del Problema</h3>
                  <p>
                    Un agente (viajero, empresa, etc.) debe planificar una ruta desde un estado <strong>Origen</strong> hacia un <strong>Destino</strong> a través de múltiples etapas. Cada transición de un estado a otro en la siguiente etapa incurre en un costo. El objetivo es encontrar la política (ruta) que minimice el costo total acumulado, resolviéndolo mediante la técnica de recursión hacia atrás de Bellman (Programación Dinámica).
                  </p>
                </div>
              )}

              {isSolving && currentStep > 0 && currentStep < maxSteps && (
                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>
                    Explicación de la Etapa {solution.tables[currentStep - 1]?.stageIndex}
                  </h4>
                  <p style={{ margin: 0 }}>
                    En esta etapa evaluamos las decisiones desde los estados actuales hacia los estados de la siguiente etapa. 
                    Usamos la fórmula de Bellman: <code>f*(s) = min(c(s, x) + f*(x))</code>, donde sumamos el costo inmediato de la arista con el costo óptimo acumulado desde el estado de destino.
                  </p>
                </div>
              )}

              {isSolving && currentStep === maxSteps && (
                <div style={{ padding: '15px', background: 'rgba(0,200,83,0.1)', border: '1px solid var(--success)', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: 'var(--success)' }}>Resultado Final y Rutas Óptimas</h3>
                  <p style={{ margin: '0 0 5px 0' }}>Después de evaluar todas las etapas hacia atrás, hemos determinado la política óptima.</p>
                  <p style={{ margin: '0 0 5px 0' }}><strong>Costo Mínimo Total:</strong> {solution.minCost}</p>
                  <div>
                    <strong>Ruta(s) Óptima(s):</strong>
                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                      {solution.optimalPaths.map((path, idx) => {
                        const pathLabels = path.map(id => selectedExercise.nodes.find(n => n.id === id).label).join(' ➔ ');
                        return <li key={`path-${idx}`}>{pathLabels}</li>;
                      })}
                    </ul>
                  </div>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>
                  Grafo del Problema {isSolving && currentStep > 0 ? `(Paso ${currentStep} de ${maxSteps})` : ''}
                </h3>
                
                {/* Grafos ocultos para la generación del PDF */}
                <div style={{ display: 'none' }}>
                  <DynamicGraph 
                    svgId="dynamic-graph-pdf-initial"
                    problem={selectedExercise} 
                    solution={solution} 
                    currentStep={0}
                    isSolving={isSolving}
                    maxSteps={maxSteps}
                    pdfMode={true}
                  />
                  <DynamicGraph 
                    svgId="dynamic-graph-pdf-final"
                    problem={selectedExercise} 
                    solution={solution} 
                    currentStep={maxSteps}
                    isSolving={isSolving}
                    maxSteps={maxSteps}
                    pdfMode={true}
                  />
                </div>

                <DynamicGraph 
                  svgId="dynamic-graph-svg"
                  problem={selectedExercise} 
                  solution={solution} 
                  currentStep={currentStep}
                  isSolving={isSolving}
                  maxSteps={maxSteps}
                />
              </div>

              {isSolving && currentStep > 0 && (
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <DynamicTables 
                    problem={selectedExercise} 
                    solution={solution} 
                    currentStep={currentStep}
                    maxSteps={maxSteps}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicModule;
