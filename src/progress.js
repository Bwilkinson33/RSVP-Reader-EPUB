export function updateProgressBar(progressFill, idx, total){
  if(!total){ progressFill.style.width = '0%'; return; }
  const pct = Math.max(0, Math.min(100, Math.round((idx/total)*100)));
  progressFill.style.width = pct + '%';
}
