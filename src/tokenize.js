export function splitParas(text){
  return text.replace(/\r\n/g,'\n').split(/\n\s*\n+/).map(s=>s.trim()).filter(Boolean);
}
export function tokenize(text){
  const paras = splitParas(text);
  const tokens = [];
  const starts = [];
  let offset = 0;
  for(const p of paras){
    starts.push(offset);
    const ws = p.split(/\s+/).filter(Boolean); // keep punctuation attached
    tokens.push(...ws);
    offset = tokens.length;
  }
  return { tokens, starts };
}
