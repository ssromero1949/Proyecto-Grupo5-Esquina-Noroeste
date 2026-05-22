import { useState, useEffect } from 'react';
import { generateBatch } from './utils/matrixGenerator';
import { solveNorthwestCorner } from './utils/solver';
import { exportToPDF } from './utils/pdfGenerator';
import './index.css';

function App() {
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [solutionsCache, setSolutionsCache] = useState({});
  const [currentFrames, setCurrentFrames] = useState({});
  const [showRoute, setShowRoute] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  // Estados del Modo Manual
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualRows, setManualRows] = useState(3);
  const [manualCols, setManualCols] = useState(3);
  const [manualMatrix, setManualMatrix] = useState({
    costs: Array(3).fill(null).map(() => Array(3).fill('')),
    supply: Array(3).fill(''),
    demand: Array(3).fill('')
  });
  const [manualError, setManualError] = useState('');

  const RouteOverlay = ({ solution, activeFrame }) => {
    const [points, setPoints] = useState([]);

    useEffect(() => {
      const updatePoints = () => {
        if (!solution) return;
        const newPoints = [];
        const containerEl = document.querySelector('.matrix-container');
        if (!containerEl) return;
        const containerRect = containerEl.getBoundingClientRect();

        for (let f = 1; f <= activeFrame; f++) {
          const frame = solution.frames[f];
          if (frame && frame.currentCell) {
            const el = document.getElementById(`cell-${frame.currentCell.r}-${frame.currentCell.c}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              newPoints.push({
                x: rect.left - containerRect.left + rect.width / 2 + containerEl.scrollLeft,
                y: rect.top - containerRect.top + rect.height / 2 + containerEl.scrollTop
              });
            }
          }
        }
        setPoints(newPoints);
      };

      setTimeout(updatePoints, 50);
      window.addEventListener('resize', updatePoints);
      return () => window.removeEventListener('resize', updatePoints);
    }, [solution, activeFrame]);

    if (points.length < 2) return null;

    return (
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, overflow: 'visible' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
          </marker>
        </defs>
        {points.slice(0, -1).map((p, i) => {
          const nextP = points[i+1];
          if (p.x === nextP.x && p.y === nextP.y) return null;
          
          let x1 = p.x;
          let y1 = p.y;
          let x2 = nextP.x;
          let y2 = nextP.y;
          
          const offset = 28; // Recortar la línea 28px desde el centro para no tapar los números
          
          if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) { 
            // Horizontal
            if (x2 > x1) { x1 += offset; x2 -= offset; }
            else { x1 -= offset; x2 += offset; }
          } else {
            // Vertical
            if (y2 > y1) { y1 += offset; y2 -= offset; }
            else { y1 -= offset; y2 += offset; }
          }

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#f97316"
              strokeWidth="3"
              className="animated-route"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>
    );
  };

  useEffect(() => {
    const batch = generateBatch(5);
    setExercises(batch);
    if (batch.length > 0) {
      setSelectedExercise(batch[0]);
    }
  }, []);

  const handleGenerateNew = () => {
    const batch = generateBatch(5);
    setExercises(batch);
    setSelectedExercise(batch[0]);
    setSolutionsCache({});
    setCurrentFrames({});
    setShowRoute(false);
    setShowStatement(false);
    setIsManualMode(false);
  };

  const handleSelect = (ex) => {
    setSelectedExercise(ex);
    setShowRoute(false);
    setShowStatement(false);
    setIsManualMode(false);
  };

  const handleSolve = () => {
    if (selectedExercise) {
      const res = solveNorthwestCorner(selectedExercise);
      setSolutionsCache(prev => ({ ...prev, [selectedExercise.id]: res }));
      setCurrentFrames(prev => ({ ...prev, [selectedExercise.id]: 0 })); // Inicia en el primer paso
      setShowRoute(false);
    }
  };

  // --- Funciones para Modo Manual ---
  const activateManualMode = () => {
    setIsManualMode(true);
    setSelectedExercise(null);
    setManualError('');
    setShowRoute(false);
  };

  const handleUpdateDimensions = () => {
    const r = Math.max(2, Math.min(8, manualRows));
    const c = Math.max(2, Math.min(8, manualCols));
    setManualRows(r);
    setManualCols(c);
    setManualMatrix({
      costs: Array(r).fill(null).map(() => Array(c).fill('')),
      supply: Array(r).fill(''),
      demand: Array(c).fill('')
    });
    setManualError('');
  };

  const handleMatrixChange = (type, i, j, value) => {
    let num = value;
    if (value !== '') {
       num = parseInt(value, 10);
       if (isNaN(num)) num = '';
    }

    setManualMatrix(prev => {
      const next = { ...prev };
      if (type === 'cost') {
        next.costs = prev.costs.map((row, rIdx) => 
          rIdx === i ? row.map((cVal, cIdx) => cIdx === j ? num : cVal) : row
        );
      } else if (type === 'supply') {
        next.supply = prev.supply.map((s, idx) => idx === i ? num : s);
      } else if (type === 'demand') {
        next.demand = prev.demand.map((d, idx) => idx === j ? num : d);
      }
      return next;
    });
  };

  const handleSolveManual = () => {
    let hasError = false;
    let errorMsg = '';
    
    const checkArray = (arr, name) => {
      for(let x of arr) {
        if (x === '' || x === null || x < 0) return `Faltan valores o hay números inválidos en ${name}.`;
      }
      return null;
    };
    
    for (let r of manualMatrix.costs) {
       const err = checkArray(r, 'la matriz de costos');
       if(err) { hasError = true; errorMsg = err; break; }
    }
    if(!hasError) {
       errorMsg = checkArray(manualMatrix.supply, 'las ofertas') || checkArray(manualMatrix.demand, 'las demandas');
       if(errorMsg) hasError = true;
    }
    
    if (hasError) {
      setManualError(errorMsg);
      return;
    }

    const totalSupply = manualMatrix.supply.reduce((a,b)=>a+b, 0);
    const totalDemand = manualMatrix.demand.reduce((a,b)=>a+b, 0);
    
    if (totalSupply <= 0 || totalDemand <= 0) {
      setManualError('La suma total de oferta y demanda debe ser mayor a cero.');
      return;
    }
    
    setManualError('');
    
    const ex = {
      id: `manual-${Date.now()}`,
      name: 'Ejercicio Manual',
      rows: manualRows,
      cols: manualCols,
      costs: manualMatrix.costs.map(row => [...row]),
      supply: [...manualMatrix.supply],
      demand: [...manualMatrix.demand],
      totalSupply,
      totalDemand,
      isBalanced: totalSupply === totalDemand,
      namesRows: Array.from({length: manualRows}, (_, i) => `O${i+1}`),
      namesCols: Array.from({length: manualCols}, (_, i) => `D${i+1}`),
      statement: null
    };
    
    setSelectedExercise(ex);
    setIsManualMode(false);
    
    const res = solveNorthwestCorner(ex);
    setSolutionsCache(prev => ({ ...prev, [ex.id]: res }));
    setCurrentFrames(prev => ({ ...prev, [ex.id]: 0 }));
    setShowRoute(false);
  };
  // ----------------------------------

  const currentSolution = selectedExercise ? solutionsCache[selectedExercise.id] : null;
  const activeFrame = selectedExercise ? (currentFrames[selectedExercise.id] || 0) : 0;

  const updateActiveFrame = (updater) => {
    if (!selectedExercise) return;
    setCurrentFrames(prev => {
      const current = prev[selectedExercise.id] || 0;
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [selectedExercise.id]: next };
    });
  };

  const handleExportPDF = () => {
    if (currentSolution && selectedExercise) {
      exportToPDF(selectedExercise, currentSolution);
    }
  };

  const frameData = currentSolution ? currentSolution.frames[activeFrame] : null;

  return (
    <div className="app-container">
      <aside className="sidebar glass-panel">
        <div className="header-actions" style={{ flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1 style={{ margin: 0 }}>Ejercicios</h1>
            <button className="btn" onClick={handleGenerateNew}>↻ Generar</button>
          </div>
          <button 
            className="btn" 
            style={{ width: '100%', background: isManualMode ? 'var(--primary)' : 'rgba(255,255,255,0.1)' }}
            onClick={activateManualMode}
          >
            + Ingresar Manualmente
          </button>
        </div>
        
        <div className="exercise-list" style={{ marginTop: '10px' }}>
          {exercises.map((ex) => {
            const isSolved = !!solutionsCache[ex.id];
            return (
            <div 
              key={ex.id} 
              className={`exercise-card ${selectedExercise?.id === ex.id && !isManualMode ? 'active' : ''}`}
              onClick={() => handleSelect(ex)}
            >
              <div className="title">
                <span>{ex.name} {isSolved && <span style={{fontSize: '0.75rem', color: 'var(--success)'}}>(Resuelto)</span>}</span>
                <span className={`badge ${ex.isBalanced ? 'balanced' : 'unbalanced'}`}>
                  {ex.isBalanced ? 'Equilibrado' : 'Desequilibrado'}
                </span>
              </div>
              <div className="details">
                Matriz: {ex.rows}x{ex.cols} | Oferta: {ex.totalSupply} | Demanda: {ex.totalDemand}
              </div>
            </div>
            );
          })}
        </div>
      </aside>

      <main className="main-content glass-panel">
        {isManualMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="header-actions">
              <h2 style={{ margin: 0 }}>Crear Ejercicio Manual</h2>
              <button className="btn" style={{ background: 'var(--success)' }} onClick={handleSolveManual}>
                ▶ Resolver Ejercicio
              </button>
            </div>
            
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Dimensiones (2 a 8)</h3>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Orígenes (Filas)</label>
                  <input type="number" min="2" max="8" value={manualRows} onChange={e => setManualRows(e.target.value)} className="manual-input" style={{ width: '120px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Destinos (Columnas)</label>
                  <input type="number" min="2" max="8" value={manualCols} onChange={e => setManualCols(e.target.value)} className="manual-input" style={{ width: '120px' }} />
                </div>
                <button className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={handleUpdateDimensions}>
                  Generar Cuadrícula
                </button>
              </div>
              {manualError && (
                <div style={{ marginTop: '15px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                  ⚠️ {manualError}
                </div>
              )}
            </div>

            <div className="matrix-container" style={{ position: 'relative', overflowX: 'auto' }}>
              <table style={{ margin: '0 auto' }}>
                <thead>
                  <tr>
                    <th>Origen \\ Destino</th>
                    {Array.from({ length: manualCols }).map((_, j) => (
                      <th key={j}>D{j+1}</th>
                    ))}
                    <th style={{ color: '#93c5fd' }}>Oferta</th>
                  </tr>
                </thead>
                <tbody>
                  {manualMatrix.costs.map((row, i) => (
                    <tr key={i}>
                      <th>O{i+1}</th>
                      {row.map((cost, j) => (
                        <td key={j} style={{ textAlign: 'center' }}>
                          <input 
                            type="number" 
                            min="0"
                            className="manual-input" 
                            value={cost} 
                            onChange={(e) => handleMatrixChange('cost', i, j, e.target.value)} 
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)' }}>
                         <input 
                            type="number" 
                            min="0"
                            className="manual-input" 
                            style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}
                            value={manualMatrix.supply[i]} 
                            onChange={(e) => handleMatrixChange('supply', i, null, e.target.value)} 
                            placeholder="0"
                          />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th style={{ color: '#c4b5fd' }}>Demanda</th>
                    {manualMatrix.demand.map((d, j) => (
                      <td key={j} style={{ textAlign: 'center', background: 'rgba(139, 92, 246, 0.1)' }}>
                        <input 
                          type="number" 
                          min="0"
                          className="manual-input" 
                          style={{ borderColor: 'rgba(139, 92, 246, 0.5)' }}
                          value={d} 
                          onChange={(e) => handleMatrixChange('demand', null, j, e.target.value)} 
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td style={{ background: 'rgba(255,255,255,0.05)' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedExercise ? (
          <>
            <div className="header-actions">
              <div>
                <h2 style={{ margin: 0 }}>{selectedExercise.name}</h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <span className={`badge ${selectedExercise.isBalanced ? 'balanced' : 'unbalanced'}`}>
                    Estado: {selectedExercise.isBalanced ? 'Equilibrado' : 'Desequilibrado'}
                  </span>
                  {!selectedExercise.isBalanced && (
                    <span className="badge" style={{background: 'rgba(255,255,255,0.1)', color: '#fff'}}>
                      Requiere Balanceo (Diferencia: {Math.abs(selectedExercise.totalSupply - selectedExercise.totalDemand)})
                    </span>
                  )}
                </div>
              </div>
              {currentSolution ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn" style={{ background: showRoute ? '#f97316' : '#3b82f6' }} onClick={() => setShowRoute(!showRoute)}>
                    {showRoute ? 'Ocultar Ruta' : 'Trazar Ruta'}
                  </button>
                  <button className="btn" style={{ background: '#8b5cf6' }} onClick={handleExportPDF}>
                    📄 Exportar a PDF
                  </button>
                </div>
              ) : (
                <button className="btn" style={{ background: 'var(--success)' }} onClick={handleSolve}>
                  ▶ Resolver Ejercicio
                </button>
              )}
            </div>

            {selectedExercise.statement && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>Contexto del Problema</span>
                  <button 
                    className="btn" 
                    style={{ padding: '4px 10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.1)' }}
                    onClick={() => setShowStatement(!showStatement)}
                  >
                    {showStatement ? 'Ocultar enunciado' : 'Leer enunciado completo'}
                  </button>
                </div>
                {showStatement && (
                  <div style={{ marginTop: '12px', lineHeight: '1.5', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    {selectedExercise.statement}
                  </div>
                )}
              </div>
            )}

            {currentSolution && frameData && (
              <div className="player-controls glass-panel" style={{ padding: '15px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    className="btn" 
                    disabled={activeFrame === 0} 
                    onClick={() => updateActiveFrame(c => c - 1)}
                  >
                    ◀ Paso Anterior
                  </button>
                  <span style={{ fontWeight: '600' }}>Paso {activeFrame} de {currentSolution.frames.length - 1}</span>
                  <button 
                    className="btn" 
                    disabled={activeFrame === currentSolution.frames.length - 1} 
                    onClick={() => updateActiveFrame(c => c + 1)}
                  >
                    Siguiente Paso ▶
                  </button>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--primary)', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  {frameData.narrative}
                </div>
                {activeFrame === currentSolution.frames.length - 1 && (
                  <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '10px' }}>
                    ¡Solución Completada! Costo Total de Transporte: ${currentSolution.totalCost}
                  </div>
                )}
              </div>
            )}

            <div className="matrix-container" style={{ position: 'relative' }}>
              <table>
                <thead>
                  <tr>
                    <th>Origen \\ Destino</th>
                    {(currentSolution ? frameData.namesCols : (selectedExercise.namesCols || Array.from({ length: selectedExercise.cols }, (_, i) => `D${i+1}`))).map((colName, i) => (
                      <th key={i} style={currentSolution && frameData.crossedCols.includes(i) ? { textDecoration: 'line-through', opacity: 0.4 } : {}}>
                        {colName}
                      </th>
                    ))}
                    <th>Oferta</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentSolution ? frameData.balancedCosts : selectedExercise.costs).map((row, i) => {
                    const rowName = currentSolution ? frameData.namesRows[i] : (selectedExercise.namesRows ? selectedExercise.namesRows[i] : `O${i+1}`);
                    const isRowCrossed = currentSolution && frameData.crossedRows.includes(i);
                    const supplyVal = currentSolution ? frameData.balancedSupply[i] : selectedExercise.supply[i];
                    return (
                      <tr key={i}>
                        <th style={isRowCrossed ? { textDecoration: 'line-through', opacity: 0.4 } : {}}>{rowName}</th>
                        {row.map((cost, j) => {
                          const isColCrossed = currentSolution && frameData.crossedCols.includes(j);
                          const allocation = currentSolution ? frameData.allocations[i][j] : null;
                          const isCrossed = isRowCrossed || isColCrossed;
                          const isCurrentStep = currentSolution && frameData.currentCell && frameData.currentCell.r === i && frameData.currentCell.c === j;
                          
                          let cellStyle = {};
                          let cellClassName = "cost-cell";
                          
                          if (isCurrentStep) {
                            cellClassName += " current-step";
                          } else if (allocation !== null) {
                            cellStyle = { background: 'rgba(16, 185, 129, 0.4)', borderColor: 'var(--success)', opacity: 1, boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' };
                          } else if (isCrossed) {
                            cellStyle = { opacity: 0.2 };
                          }

                          return (
                            <td key={j}>
                              <div id={`cell-${i}-${j}`} className={cellClassName} style={cellStyle}>
                                <span className="cost-label" style={allocation !== null || isCurrentStep ? { color: '#fff' } : {}}>c:{cost}</span>
                                {allocation !== null ? (
                                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{allocation}</span>
                                ) : (
                                  <span style={{ opacity: 0.3 }}>-</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="supply-cell" style={supplyVal === 0 ? { color: 'var(--text-muted)' } : {}}>{supplyVal}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <th>Demanda</th>
                    {(currentSolution ? frameData.balancedDemand : selectedExercise.demand).map((d, j) => (
                      <td key={j} className="demand-cell" style={d === 0 ? { color: 'var(--text-muted)' } : {}}>{d}</td>
                    ))}
                    <td style={{ background: 'rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                      {currentSolution ? frameData.balancedSupply.reduce((a,b)=>a+b,0) : `${selectedExercise.totalSupply} / ${selectedExercise.totalDemand}`}
                    </td>
                  </tr>
                </tbody>
              </table>
              {showRoute && currentSolution && <RouteOverlay solution={currentSolution} activeFrame={activeFrame} />}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Selecciona o genera un ejercicio
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
