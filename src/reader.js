import { tokenize } from './tokenize.js';
import { renderWordInto } from './orp.js';
import { msPerWordFor } from './timing.js';
import { updateProgressBar } from './progress.js';
import { clamp } from './utils.js';
import { loadEpubFile } from './epub/loader.js';

export function createReader(elements){
  const {
    inputEl, startBtn, wpmInput, multInput, fontSelect, previewWord,
    loader, stage, wrap, preEl, pivotEl, postEl, wpmDisplay,
    plusBtn, minusBtn, progressFill
  } = elements;

  const epubFileInput = document.getElementById('epubFile');
  const epubName = document.getElementById('epubName');
  const chapterLabel = document.getElementById('chapterLabel');

  // Book/Chapter state
  let chapters = []; // [{title, words, paraStarts}]
  let chapterIdx = 0;
  let wordIdx = 0; // next word index within chapter
  let isEpubMode = false;

  // Reader state
  let timer = null;
  let paused = true;
  let baseWPM = 500;
  let punctMult = 1.6;

  // UI helpers
  const setWPM = (val)=>{
    baseWPM = Math.max(50, Math.round(val));
    wpmInput.value = baseWPM;
    wpmDisplay.textContent = baseWPM + ' WPM';
  };
  const setFont = (which)=>{
    const val = (which==='mono') ?
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' :
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
    document.documentElement.style.setProperty('--reader-font', val);
  };
  const curChapter = ()=> chapters[chapterIdx] || { words: [], paraStarts: [], title: 'Chapter' };

  function renderWord(w){
    renderWordInto(wrap, preEl, pivotEl, postEl, w || '');
  }
  function updateChapterLabel(){
    const total = Math.max(1, chapters.length);
    const idx = Math.min(chapterIdx+1, total);
    const title = (chapters[chapterIdx]?.title || `Chapter ${idx}`);
    chapterLabel.textContent = `${title} (${idx}/${total})`;
  }
  function updateProgress(){
    const c = curChapter();
    updateProgressBar(progressFill, wordIdx, c.words.length);
  }

  // Navigation & control
  function restartBook(){
    chapterIdx = 0; wordIdx = 0; paused = true;
    updateChapterLabel();
    updateProgress();
    const c = curChapter();
    renderWord(c.words[0] || '');
  }
  function jumpParagraphStart(current){
    const c = curChapter();
    if(!c.paraStarts?.length) return;
    const base = Math.max(0, Math.min(c.words.length-1, wordIdx - 1));
    if(current){
      let target=0;
      for(let i=0;i<c.paraStarts.length;i++){
        if(c.paraStarts[i] <= base) target = c.paraStarts[i]; else break;
      }
      wordIdx = target;
    } else {
      for(let j=0;j<c.paraStarts.length;j++){
        if(c.paraStarts[j] > base){ wordIdx = c.paraStarts[j]; break; }
      }
    }
    updateProgress();
    if(wordIdx < c.words.length) renderWord(c.words[wordIdx]);
  }
  function prevChapter(){
    if(chapterIdx > 0){ chapterIdx--; wordIdx=0; paused=true; updateChapterLabel(); updateProgress(); renderWord(curChapter().words[0]||''); }
  }
  function nextChapter(){
    if(chapterIdx < chapters.length-1){ chapterIdx++; wordIdx=0; paused=true; updateChapterLabel(); updateProgress(); renderWord(curChapter().words[0]||''); }
  }

  function tick(){
    if(paused) return;
    const c = curChapter();
    if(wordIdx >= c.words.length){
      // stop at end of chapter by default
      renderWord('✓ Chapter complete');
      updateProgressBar(progressFill, c.words.length, c.words.length);
      paused = true;
      return;
    }
    renderWord(c.words[wordIdx]);
    const delay = msPerWordFor(c.words[wordIdx], baseWPM, punctMult);
    wordIdx++;
    updateProgress();
    timer = setTimeout(tick, delay);
  }

  // Start button behavior: prioritizes EPUB if a file is selected; otherwise uses textarea text.
  startBtn.onclick = async ()=>{
    punctMult = Math.max(1, parseFloat(multInput.value)||1.6);
    setWPM(parseInt(wpmInput.value||'500',10));

    if(epubFileInput.files && epubFileInput.files.length){
      try{
        const file = epubFileInput.files[0];
        const { title, chapters: chaps } = await loadEpubFile(file);
        chapters = chaps.map((c,i)=>{
          const tk = tokenize(c.text);
          return { title: c.title || `Chapter ${i+1}`, words: tk.tokens, paraStarts: tk.starts };
        });
        isEpubMode = true;
        chapterIdx = 0; wordIdx = 0; paused = false;
        loader.style.display='none'; stage.style.display='block';
        clearTimeout(timer);
        updateChapterLabel();
        updateProgress();
        tick();
        return;
      }catch(err){
        alert('EPUB load failed: ' + err.message);
        return;
      }
    }

    // Textarea fallback
    const t = inputEl.value.trim();
    if(!t){ inputEl.focus(); return; }
    const built = tokenize(t);
    chapters = [{ title: 'Chapter 1', words: built.tokens, paraStarts: built.starts }];
    isEpubMode = false;
    chapterIdx=0; wordIdx=0; paused=false;
    loader.style.display='none'; stage.style.display='block';
    clearTimeout(timer);
    updateChapterLabel();
    updateProgress();
    tick();
  };

  // File name display + clear textarea preview on epub selection
  epubFileInput.addEventListener('change', ()=>{
    const f = epubFileInput.files && epubFileInput.files[0];
    epubName.textContent = f ? f.name : '';
    if(f){ previewWord.textContent = '(EPUB selected)'; }
  });

  // Input preview remains for pasted text
  inputEl.oninput = ()=>{
    const t = inputEl.value.trim();
    const tk = tokenize(t);
    previewWord.textContent = (tk.tokens[0]||'(preview)');
  };
  fontSelect.onchange = ()=>{ setFont(fontSelect.value); };
  plusBtn.onclick = (e)=>{ setWPM(baseWPM + (e.shiftKey?100:50)); };
  minusBtn.onclick = (e)=>{ setWPM(baseWPM - (e.shiftKey?100:50)); };

  // Keyboard
  window.addEventListener('keydown', (e)=>{
    const active = document.activeElement;
    const typing = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA');
    const reading = stage.style.display==='block';
    if(!reading && typing) return;

    if(e.shiftKey && e.key==='ArrowLeft'){ e.preventDefault(); prevChapter(); return; }
    if(e.shiftKey && e.key==='ArrowRight'){ e.preventDefault(); nextChapter(); return; }

    if(e.key===' '){ e.preventDefault();
      // If we're paused at end-of-chapter and there's a next chapter, pressing Space continues.
      if(paused){
        const c = curChapter();
        const atEnd = (wordIdx>=c.words.length);
        if(atEnd && chapterIdx < chapters.length-1){
          nextChapter(); // will render first word of next chapter, still paused
        }
        paused=false; tick();
      } else {
        paused=true;
      }
    }
    else if(e.key==='r' || e.key==='R'){ e.preventDefault(); restartBook(); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); jumpParagraphStart(true); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); jumpParagraphStart(false); }
  });

  // init
  setFont('sans'); setWPM(500); inputEl.oninput();

  // dev tests (use #test)
  function runTests(){
    console.log('[RSVP tests] start');

    // Tokenization/punctuation attach
    const t1 = tokenize('Hello, world!\n\nNext para.');
    console.assert(t1.tokens[0]==='Hello,','tokenize punctuation attach');
    console.assert(t1.tokens[1]==='world!','tokenize punctuation attach 2');
    console.assert(t1.starts.length===2 && t1.starts[0]===0,'paraStarts length');

    // Paragraph jump logic
    let tmp = tokenize('One two three.\n\nFour five');
    chapters = [{title:'Ch1', words: tmp.tokens, paraStarts: tmp.starts}];
    chapterIdx=0; wordIdx=3; // currently would have shown words[2]
    jumpParagraphStart(true); console.assert(wordIdx===0,'jump current paragraph start');
    wordIdx=3; jumpParagraphStart(false); console.assert(wordIdx===4,'jump next paragraph start');

    // Chapter progress resets
    chapters = [
      { title:'A', words:['a','b','c'], paraStarts:[0] },
      { title:'B', words:['d','e'], paraStarts:[0] },
    ];
    chapterIdx=0; wordIdx=0; updateProgress();
    console.assert(progressFill.style.width==='0%','ch1 progress 0');
    wordIdx=3; updateProgress(); console.assert(progressFill.style.width==='100%','ch1 progress 100');
    nextChapter(); console.assert(chapterIdx===1 && wordIdx===0, 'nextChapter sets start');
    updateProgress(); console.assert(progressFill.style.width==='0%','ch2 progress 0');

    console.log('[RSVP tests] ok');
  }
  if(location.hash.includes('test')){ try{ runTests(); }catch(e){ console.error('Tests failed', e); } }
}
