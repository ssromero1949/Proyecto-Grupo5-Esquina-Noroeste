const DynamicGraph = ({ problem, solution, currentStep, isSolving, maxSteps, svgId = "dynamic-graph-svg", pdfMode = false }) => {
  if (!problem) return null;

  const { nodes, edges, stagesCount, stagesNodes } = problem;

  // Parámetros de renderizado SVG
  const svgWidth = 800;
  const svgHeight = 400;
  const paddingX = 50;
  const paddingY = 50;
  const nodeRadius = 20;

  // Calcular posiciones
  const nodePositions = {};
  
  const usableWidth = svgWidth - 2 * paddingX;
  const usableHeight = svgHeight - 2 * paddingY;
  
  const stageWidth = stagesCount > 1 ? usableWidth / (stagesCount - 1) : usableWidth;

  stagesNodes.forEach((stageGroup, stageIndex) => {
    const x = paddingX + stageIndex * stageWidth;
    const numNodes = stageGroup.length;
    const stageHeight = numNodes > 1 ? usableHeight / (numNodes - 1) : usableHeight;
    
    stageGroup.forEach((nodeId, nodeIndex) => {
      // Si solo hay un nodo, centrarlo verticalmente
      const y = numNodes === 1 
        ? svgHeight / 2 
        : paddingY + nodeIndex * stageHeight;
      
      nodePositions[nodeId] = { x, y };
    });
  });

  // Determinar qué etapa se está evaluando actualmente
  let activeStageIndex = -1; // Índice del grupo de nodos de origen para la etapa actual
  if (isSolving && currentStep > 0 && currentStep < maxSteps) {
    const tableIndex = currentStep - 1;
    const table = solution.tables[tableIndex];
    if (table) {
      activeStageIndex = stagesCount - 1 - table.stageIndex;
    }
  }

  // Identificar rutas óptimas finales
  let finalOptimalEdges = [];
  if (isSolving && currentStep === maxSteps && solution && solution.optimalPaths) {
    solution.optimalPaths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        finalOptimalEdges.push(`${path[i]}-${path[i+1]}`);
      }
    });
  }

  // Identificar decisiones óptimas parciales (ya evaluadas)
  const partialOptimalEdges = [];
  if (isSolving && currentStep > 0 && solution) {
    // Revisar las tablas desde el inicio hasta el paso actual
    for (let i = 0; i < currentStep && i < solution.tables.length; i++) {
      const table = solution.tables[i];
      table.rows.forEach(row => {
        row.x_star.forEach(x => {
          partialOptimalEdges.push(`${row.state}-${x}`);
        });
      });
    }
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', background: pdfMode ? '#ffffff' : 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
      <svg id={svgId} width={svgWidth} height={svgHeight} style={{ minWidth: `${svgWidth}px` }}>
        <defs>
          <marker id={`arrowhead${pdfMode ? '-pdf' : ''}`} markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={pdfMode ? "#9ca3af" : "rgba(255,255,255,0.3)"} />
          </marker>
          <marker id={`arrowhead-active${pdfMode ? '-pdf' : ''}`} markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={pdfMode ? "#3b82f6" : "var(--primary)"} />
          </marker>
          <marker id={`arrowhead-optimal${pdfMode ? '-pdf' : ''}`} markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={pdfMode ? "#10b981" : "var(--success)"} />
          </marker>
        </defs>

        {/* Dibujar Aristas */}
        {edges.map((edge, idx) => {
          const fromPos = nodePositions[edge.from];
          const toPos = nodePositions[edge.to];
          
          // Lógica de estilos de arista
          let isFinalOptimal = finalOptimalEdges.includes(`${edge.from}-${edge.to}`);
          let isPartialOptimal = partialOptimalEdges.includes(`${edge.from}-${edge.to}`);
          
          // Encontrar el stageIndex del nodo de origen
          const fromNodeStageIndex = nodes.find(n => n.id === edge.from).stage;
          const isEdgeInActiveStage = (activeStageIndex === fromNodeStageIndex);
          const isEdgeInEvaluatedStage = (fromNodeStageIndex > activeStageIndex && activeStageIndex !== -1);
          
          let strokeColor = pdfMode ? '#9ca3af' : 'rgba(255,255,255,0.1)'; // Por defecto, difuminado o gris firme en PDF
          let strokeWidth = pdfMode ? 1.5 : 1;
          let marker = `url(#arrowhead${pdfMode ? '-pdf' : ''})`;
          let opacity = pdfMode ? 1 : 0.3;

          if (!isSolving || currentStep === 0) {
            // Mostrar todas normalmente
            strokeColor = pdfMode ? '#9ca3af' : 'rgba(255,255,255,0.3)';
            opacity = 1;
          } else if (currentStep === maxSteps) {
            // Paso final: resaltar solo la ruta óptima final
            if (isFinalOptimal) {
              strokeColor = pdfMode ? '#10b981' : 'var(--success)';
              strokeWidth = 3;
              marker = `url(#arrowhead-optimal${pdfMode ? '-pdf' : ''})`;
              opacity = 1;
            }
          } else {
            // Paso intermedio
            if (isEdgeInActiveStage) {
              strokeColor = pdfMode ? '#3b82f6' : 'var(--primary)';
              strokeWidth = 2;
              marker = `url(#arrowhead-active${pdfMode ? '-pdf' : ''})`;
              opacity = 1;
            } else if (isPartialOptimal && isEdgeInEvaluatedStage) {
              strokeColor = pdfMode ? '#10b981' : 'var(--success)';
              strokeWidth = 2;
              marker = `url(#arrowhead-optimal${pdfMode ? '-pdf' : ''})`;
              opacity = 0.8;
            }
          }

          // Calcular vector de dirección de la arista
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Colocar la etiqueta a una distancia fija (p.ej. 45 px) desde el nodo de origen
          // Esto forma un "abanico" y evita que se superpongan verticalmente
          const offsetDist = 45; 
          const textX = fromPos.x + (dx / dist) * offsetDist;
          const textY = fromPos.y + (dy / dist) * offsetDist;
          
          return (
            <g key={`edge-${idx}`} opacity={opacity} style={{ transition: 'opacity 0.3s ease' }}>
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                markerEnd={marker}
              />
              
              {/* Fondo para el texto del costo */}
              <rect 
                x={textX - 12}
                y={textY - 9}
                width="24"
                height="18"
                fill={pdfMode ? "#ffffff" : "var(--background)"}
                rx="4"
                opacity={pdfMode ? "0.95" : "0.8"}
              />
              
              {/* Etiqueta de costo */}
              <text
                x={textX}
                y={textY}
                fill={pdfMode ? (strokeColor === '#9ca3af' ? '#4b5563' : strokeColor) : (strokeColor === 'rgba(255,255,255,0.1)' ? 'rgba(255,255,255,0.5)' : strokeColor)}
                fontSize={pdfMode ? "14" : "12"}
                textAnchor="middle"
                dominantBaseline="central"
                fontWeight={(isFinalOptimal || isPartialOptimal || isEdgeInActiveStage) ? 'bold' : 'normal'}
              >
                {edge.cost}
              </text>
            </g>
          );
        })}

        {/* Dibujar Nodos */}
        {nodes.map(node => {
          const pos = nodePositions[node.id];
          
          let isNodeInFinalOptimal = isSolving && currentStep === maxSteps && solution && solution.optimalPaths.some(path => path.includes(node.id));
          let isNodeActive = isSolving && currentStep > 0 && currentStep < maxSteps && (node.stage === activeStageIndex || node.stage === activeStageIndex + 1);
          
          let fillColor = pdfMode ? '#ffffff' : 'var(--background-alt)';
          let strokeColorNode = pdfMode ? '#1f2937' : 'var(--primary)';
          let textColor = pdfMode ? '#1f2937' : '#fff';
          let strokeWidth = 2;

          if (isNodeInFinalOptimal) {
            fillColor = pdfMode ? '#10b981' : 'var(--success)';
            strokeColorNode = pdfMode ? '#059669' : '#fff';
            textColor = '#fff';
          } else if (isNodeActive) {
            strokeColorNode = pdfMode ? '#f59e0b' : 'var(--accent)';
            strokeWidth = 3;
          }

          return (
            <g key={`node-${node.id}`} style={{ transition: 'all 0.3s ease' }}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={fillColor}
                stroke={strokeColorNode}
                strokeWidth={strokeWidth}
              />
              <text
                x={pos.x}
                y={pos.y}
                fill={textColor}
                fontSize={node.label.length > 3 ? "10" : "14"}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default DynamicGraph;
