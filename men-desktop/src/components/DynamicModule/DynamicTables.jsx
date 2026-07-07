const DynamicTables = ({ problem, solution, currentStep, maxSteps }) => {
  if (!problem || !solution) return null;

  // Tablas a mostrar (desde el paso 1 hasta el actual)
  const visibleTablesCount = currentStep === maxSteps ? solution.tables.length : currentStep;
  const visibleTables = solution.tables.slice(0, visibleTablesCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {visibleTables.map((table, index) => {
        const stageIndex = table.stageIndex;
        const nextStageNodes = problem.stagesNodes[problem.stagesCount - stageIndex];
        
        return (
          <div key={`table-${stageIndex}`} style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: 'var(--primary)', margin: '0 0 15px 0' }}>
              Tabla de Cálculos (Etapa {stageIndex})
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'var(--background-alt)' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>Estado actual (s)</th>
                  {nextStageNodes.map(xId => {
                    const nodeLabel = problem.nodes.find(n => n.id === xId).label;
                    return (
                      <th key={`head-${xId}`} style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                        Decisión x={nodeLabel}
                      </th>
                    );
                  })}
                  <th style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>f*(s)</th>
                  <th style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>Decisión Óptima x*</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map(row => {
                  const stateLabel = problem.nodes.find(n => n.id === row.state).label;
                  const xStarLabels = row.x_star.map(xId => problem.nodes.find(n => n.id === xId).label).join(', ');
                  
                  return (
                    <tr key={`row-${row.state}`}>
                      <td style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                        {stateLabel}
                      </td>
                      {nextStageNodes.map(xId => {
                        const decision = row.decisions[xId];
                        return (
                          <td key={`cell-${row.state}-${xId}`} style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {decision ? (
                              <span>
                                {decision.costEdge} + {decision.costTotal - decision.costEdge} = <strong>{decision.costTotal}</strong>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', color: 'var(--success)' }}>
                        {row.f_star}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', color: 'var(--success)' }}>
                        {xStarLabels}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

    </div>
  );
};

export default DynamicTables;
