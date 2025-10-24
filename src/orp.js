// ORP pivot index rules, then local-centering within container
export function pivotIndex(word){
  const core = word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g,'');
  const len = core.length;
  let i = 0;
  if(len<=1) i=0;
  else if(len<=5) i=1;
  else if(len<=9) i=2;
  else if(len<=13) i=3;
  else i=4;
  const lead = ((word.match(/^[^A-Za-z0-9]+/))||[''])[0].length;
  const pos = Math.min(lead + i, Math.max(0, word.length-1));
  return pos;
}

export function renderWordInto(wrap, preEl, pivotEl, postEl, word){
  const pi = pivotIndex(word);
  const pre = word.slice(0,pi);
  const pivot = word.slice(pi,pi+1);
  const post = word.slice(pi+1);
  preEl.textContent = pre;
  pivotEl.textContent = pivot;
  postEl.textContent = post;

  // Force layout and center the pivot locally
  void pivotEl.offsetWidth;
  const pr = pivotEl.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  const localPivotCenter = (pr.left - wr.left) + pr.width / 2;
  const dx = -Math.round(localPivotCenter);
  wrap.style.transform = `translateX(${dx}px)`;
}
