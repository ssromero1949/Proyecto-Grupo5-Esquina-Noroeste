export function solveNorthwestCorner(exercise) {
  let supply = [...exercise.supply];
  let demand = [...exercise.demand];
  let costs = exercise.costs.map(row => [...row]);
  let rows = exercise.rows;
  let cols = exercise.cols;
  let namesRows = exercise.namesRows ? [...exercise.namesRows] : Array.from({length: rows}, (_, i) => `O${i+1}`);
  let namesCols = exercise.namesCols ? [...exercise.namesCols] : Array.from({length: cols}, (_, i) => `D${i+1}`);

  const diff = exercise.totalSupply - exercise.totalDemand;
  
  // Módulo 2: Auto-Balanceo Lógico
  if (diff > 0) {
    // Oferta > Demanda -> Agregar Destino Ficticio
    cols++;
    demand.push(diff);
    namesCols.push("Ficticio (D)");
    costs.forEach(row => row.push(0));
  } else if (diff < 0) {
    // Demanda > Oferta -> Agregar Origen Ficticio
    rows++;
    supply.push(Math.abs(diff));
    namesRows.push("Ficticio (O)");
    const newRow = Array(cols).fill(0);
    costs.push(newRow);
  }

  const allocations = Array.from({length: rows}, () => Array(cols).fill(null));
  const crossedRows = new Set();
  const crossedCols = new Set();
  const frames = [];

  frames.push({
    step: 0,
    allocations: JSON.parse(JSON.stringify(allocations)),
    crossedRows: Array.from(crossedRows),
    crossedCols: Array.from(crossedCols),
    narrative: diff !== 0 
      ? `Problema desequilibrado. Se agregó un ${diff > 0 ? 'destino' : 'origen'} ficticio para balancear el modelo (costos en 0). Modelo listo.`
      : "Problema equilibrado. Modelo listo para resolver.",
    balancedCosts: costs,
    balancedSupply: [...supply],
    balancedDemand: [...demand],
    namesRows,
    namesCols,
    currentCell: null
  });

  let step = 1;
  let i = 0;
  let j = 0;
  let totalCost = 0;

  while (i < rows && j < cols) {
    if (crossedRows.has(i)) { i++; continue; }
    if (crossedCols.has(j)) { j++; continue; }

    const qty = Math.min(supply[i], demand[j]);
    allocations[i][j] = qty;
    
    supply[i] -= qty;
    demand[j] -= qty;
    
    const cost = costs[i][j];
    totalCost += (qty * cost);

    let actionText = `Paso ${step}: Esquina Noroeste [${namesRows[i]}, ${namesCols[j]}]. Oferta disponible: ${qty + supply[i]}, Demanda: ${qty + demand[j]}. Se asignan ${qty} unidades. (Costo: ${qty} * ${cost} = ${qty*cost}).`;

    if (demand[j] === 0 && supply[i] === 0) {
      if (i !== rows - 1 || j !== cols - 1) {
         crossedCols.add(j);
         actionText += ` Se agotan ambos al mismo tiempo (Degeneración). Tachamos la columna ${namesCols[j]} y dejamos oferta 0 temporalmente.`;
      } else {
         crossedCols.add(j);
         crossedRows.add(i);
         actionText += ` Fin del proceso. Se agotaron todas las ofertas y demandas.`;
      }
    } else if (demand[j] === 0) {
      crossedCols.add(j);
      actionText += ` Se agotó la demanda de ${namesCols[j]}, tachamos su columna.`;
    } else if (supply[i] === 0) {
      crossedRows.add(i);
      actionText += ` Se agotó la oferta de ${namesRows[i]}, tachamos su fila.`;
    }

    frames.push({
      step,
      allocations: JSON.parse(JSON.stringify(allocations)),
      crossedRows: Array.from(crossedRows),
      crossedCols: Array.from(crossedCols),
      narrative: actionText,
      balancedCosts: costs,
      balancedSupply: [...supply],
      balancedDemand: [...demand],
      namesRows,
      namesCols,
      currentCell: { r: i, c: j }
    });

    step++;
  }

  return { frames, totalCost, balancedMatrix: { costs, supply: exercise.supply, demand: exercise.demand, namesRows, namesCols } };
}
