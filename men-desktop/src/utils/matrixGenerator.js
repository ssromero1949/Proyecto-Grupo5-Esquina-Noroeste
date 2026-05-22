export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const themes = [
  {
    company: "TechLogistics",
    product: "computadoras portátiles",
    originType: "Fábrica",
    destinationType: "Tienda",
    origins: ["Norte", "Sur", "Este", "Oeste", "Central"],
    destinations: ["Centro", "Plaza", "Mall", "Outlet", "Express"]
  },
  {
    company: "AgroDistribución",
    product: "toneladas de trigo",
    originType: "Silo",
    destinationType: "Molino",
    origins: ["Alfa", "Beta", "Gamma", "Delta", "Epsilon"],
    destinations: ["Nacional", "Regional", "Local", "Exportación", "Móvil"]
  },
  {
    company: "MediSupply",
    product: "lotes de vacunas",
    originType: "Lab",
    destinationType: "Hospital",
    origins: ["Central", "Fronterizo", "Estatal", "Municipal", "Privado"],
    destinations: ["General", "Infantil", "Clínico", "Especial", "Militar"]
  },
  {
    company: "AutoParts Corp",
    product: "motores ensamblados",
    originType: "Planta",
    destinationType: "Ensambladora",
    origins: ["Monterrey", "Saltillo", "Puebla", "Toluca", "Silao"],
    destinations: ["A", "B", "C", "D", "E"]
  }
];

export function generateExercise(id, forceBalanced = false) {
  const rows = getRandomInt(3, 5); // Orígenes
  const cols = getRandomInt(3, 5); // Destinos

  const costs = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(getRandomInt(1, 30));
    }
    costs.push(row);
  }

  const supply = [];
  let totalSupply = 0;
  for (let i = 0; i < rows; i++) {
    const s = getRandomInt(10, 100);
    supply.push(s);
    totalSupply += s;
  }

  const demand = [];
  let totalDemand = 0;
  for (let i = 0; i < cols - 1; i++) {
    const d = getRandomInt(10, 80);
    demand.push(d);
    totalDemand += d;
  }

  const isBalanced = forceBalanced || Math.random() > 0.5;

  if (isBalanced) {
    let remainingDemand = totalSupply - totalDemand;
    if (remainingDemand <= 0) {
        remainingDemand = getRandomInt(10, 50);
        supply[rows-1] += (totalDemand + remainingDemand) - totalSupply; 
        totalSupply = totalDemand + remainingDemand;
    }
    demand.push(remainingDemand);
    totalDemand += remainingDemand;
  } else {
    demand.push(getRandomInt(10, 100));
    totalDemand = demand.reduce((a, b) => a + b, 0);
  }

  const theme = themes[getRandomInt(0, themes.length - 1)];
  
  const namesRows = [];
  const shuffledOrigins = [...theme.origins].sort(() => 0.5 - Math.random());
  for (let i = 0; i < rows; i++) {
    namesRows.push(`${theme.originType} ${shuffledOrigins[i]}`);
  }

  const namesCols = [];
  const shuffledDestinations = [...theme.destinations].sort(() => 0.5 - Math.random());
  for (let i = 0; i < cols; i++) {
    namesCols.push(`${theme.destinationType} ${shuffledDestinations[i]}`);
  }

  const isBalancedFinal = totalSupply === totalDemand;
  const isBalancedContext = isBalancedFinal
    ? "La oferta total coincide exactamente con la demanda requerida." 
    : `Existe un desequilibrio ya que la oferta es de ${totalSupply} y la demanda de ${totalDemand}.`;

  const statement = `La empresa ${theme.company}, enfocada en la distribución de ${theme.product}, necesita coordinar sus envíos. Cuenta con ${rows} centros logísticos (${theme.originType}s) que disponen de una oferta total de ${totalSupply} unidades. Por otro lado, debe abastecer a ${cols} puntos de entrega (${theme.destinationType}s) que demandan en conjunto ${totalDemand} unidades. ${isBalancedContext} Los costos de transporte por unidad se muestran en la tabla adjunta. Obtenga una solución inicial utilizando el Método de la Esquina Noroeste.`;

  return {
    id,
    name: `Ejercicio ${id}`,
    rows,
    cols,
    costs,
    supply,
    demand,
    totalSupply,
    totalDemand,
    isBalanced: isBalancedFinal,
    namesRows,
    namesCols,
    statement
  };
}

export function generateBatch(count = 5) {
  const batch = [];
  batch.push(generateExercise(1, true));
  batch.push(generateExercise(2, false));
  for (let i = 3; i <= count; i++) {
    batch.push(generateExercise(i));
  }
  return batch;
}
