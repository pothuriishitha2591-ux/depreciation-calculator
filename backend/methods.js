function roundTo(v, r){
  if (!Number.isFinite(v)) return 0;
  if (!r || Number(r) === 0) return Math.round((v + Number.EPSILON) * 100) / 100;
  // r is rounding base (e.g., 1 or 0.01)
  return Math.round(v / r) * r;
}

// Helper to adjust rounding so that accumulated depreciation + salvage = cost
function adjustLastYear(rows, cost, salvage, roundBase){
  const totalDep = rows.reduce((a,b)=>a + (Number(b.depreciation)||0), 0);
  const diff = Math.round(( (cost - salvage) - totalDep ) * 100) / 100;
  if (Math.abs(diff) > 0.001 && rows.length > 0){
    // add diff to last non-zero depreciation row
    for (let i = rows.length - 1; i >= 0; i--){
      if (rows[i].depreciation !== 0){
        rows[i].depreciation = roundTo(rows[i].depreciation + diff, roundBase);
        // recompute accumulated and ending book values
        let acc = 0;
        for (let j=0;j<rows.length;j++){
          acc += rows[j].depreciation;
          rows[j].accumulated = Math.round((acc + Number.EPSILON)*100)/100;
          rows[j].ending = Math.round((cost - rows[j].accumulated) * 100) / 100;
        }
        break;
      }
    }
  }
}

function calcStraight(cost, salvage, life, partial=1, roundBase=0){
  const rows=[];
  const depreciable = cost - salvage;
  if (life <= 0) return rows;
  const base = depreciable / life;
  let accumulated = 0;
  for (let y=1;y<=life;y++){
    let dep = base * (y===1 ? partial : 1);
    dep = roundTo(dep, roundBase);
    accumulated = Math.round((accumulated + dep) * 100) / 100;
    const beginning = Math.round((cost - (accumulated - dep)) * 100) / 100;
    const ending = Math.round((cost - accumulated) * 100) / 100;
    const depPercent = depreciable !== 0 ? Math.round((dep / depreciable) * 10000)/100 : 0; // percent of depreciable base
    rows.push({ year: y, beginning: beginning, depreciationPercent: depPercent, depreciation: dep, accumulated: accumulated, ending: ending });
  }
  adjustLastYear(rows, cost, salvage, roundBase);
  return rows;
}

function calcDeclining(cost, salvage, life, factor=2, partial=1, roundBase=0){
  const rows=[];
  let book = cost;
  const depreciable = cost - salvage;
  const rate = life>0 ? Math.min(1, factor / life) : 0;
  let accumulated = 0;
  for (let y=1;y<=life;y++){
    let dep = Math.max(0, book * rate);
    if (y===1) dep *= partial;
    if (book - dep < salvage) dep = book - salvage;
    dep = roundTo(dep, roundBase);
    const beginning = Math.round((book) * 100) / 100;
    accumulated = Math.round((accumulated + dep) * 100) / 100;
    book = Math.round((book - dep) * 100) / 100;
    const ending = book;
    const depPercent = depreciable !== 0 ? Math.round((dep / depreciable) * 10000)/100 : 0;
    rows.push({ year: y, beginning: beginning, depreciationPercent: depPercent, depreciation: dep, accumulated: accumulated, ending: ending });
    if (book <= salvage) {
      for (let z=y+1; z<=life; z++) rows.push({ year: z, beginning: book, depreciationPercent:0, depreciation:0, accumulated: accumulated, ending: book });
      break;
    }
  }
  adjustLastYear(rows, cost, salvage, roundBase);
  return rows;
}

function calcSYD(cost, salvage, life, partial=1, roundBase=0){
  const rows=[];
  const n = life;
  const denom = n*(n+1)/2;
  const depreciable = cost - salvage;
  let accumulated = 0;
  for (let y=1;y<=n;y++){
    const factor = (n - (y-1)) / (denom || 1);
    let dep = depreciable * factor;
    if (y===1) dep *= partial;
    dep = roundTo(dep, roundBase);
    const beginning = Math.round((cost - accumulated) * 100) / 100;
    accumulated = Math.round((accumulated + dep) * 100) / 100;
    const ending = Math.round((cost - accumulated) * 100) / 100;
    const depPercent = depreciable !== 0 ? Math.round((dep / depreciable) * 10000)/100 : 0;
    rows.push({ year: y, beginning: beginning, depreciationPercent: depPercent, depreciation: dep, accumulated: accumulated, ending: ending });
  }
  adjustLastYear(rows, cost, salvage, roundBase);
  return rows;
}

function calcUnits(cost, salvage, life, unitsArr, totalProd, roundBase=0){
  const rows=[];
  const depreciable = cost - salvage;
  const denom = totalProd > 0 ? totalProd : (Array.isArray(unitsArr) ? unitsArr.reduce((a,b)=>a+(Number(b)||0),0) : 0);
  let accumulated = 0;
  for (let y=1;y<=Math.max(0,life);y++){
    const actual = (Array.isArray(unitsArr) ? Number(unitsArr[y-1]||0) : 0);
    let dep = denom>0 ? (depreciable * (actual / denom)) : 0;
    dep = roundTo(dep, roundBase);
    const beginning = Math.round((cost - accumulated) * 100) / 100;
    accumulated = Math.round((accumulated + dep) * 100) / 100;
    const ending = Math.round((cost - accumulated) * 100) / 100;
    const depPercent = depreciable !== 0 ? Math.round((dep / depreciable) * 10000)/100 : 0;
    rows.push({ year: y, beginning: beginning, units: actual, depreciationPercent: depPercent, depreciation: dep, accumulated: accumulated, ending: ending });
  }
  adjustLastYear(rows, cost, salvage, roundBase);
  return rows;
}

module.exports = {
  calcStraight,
  calcDeclining,
  calcSYD,
  calcUnits
};
