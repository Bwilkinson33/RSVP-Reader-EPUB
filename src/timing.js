// Timing model: base on WPM, punctuation pauses, simple length & rarity heuristic (optional trimmed)
export function msPerWordFor(word, baseWPM, punctMult){
  const base = 60000 / baseWPM;
  let m = 1;
  if(/[\.!?…]$/.test(word)) m *= punctMult;
  else if(/[;,:]$/.test(word)) m *= 1 + (punctMult-1)*0.5;
  return base * m;
}
