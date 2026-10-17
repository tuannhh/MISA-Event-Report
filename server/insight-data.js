// Keep source aggregates, but never include staff dimensions, filter values or raw rows.
export function insightData(report){
  const aggregate=summary=>summary?Object.fromEntries(['total','called','call_rate','call_unknown','clevel','clevel_share','clevel_completion','completion','target','positions','sizes','sources','modes','trend','invalidDates'].map(k=>[k,summary[k]])):null;
  const {from,to,compareFrom,compareTo,mode}=report.range;
  return {current:aggregate(report.current),comparison:aggregate(report.comparison),range:{from,to,compareFrom,compareTo,mode},filteredBySource:Object.keys(report.range.sourceFilters||{}).length>0};
}
