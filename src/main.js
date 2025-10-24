import { createReader } from './reader.js';

const els = {
  inputEl: document.getElementById('inputText'),
  startBtn: document.getElementById('startBtn'),
  wpmInput: document.getElementById('wpmInput'),
  multInput: document.getElementById('punctMultiplier'),
  fontSelect: document.getElementById('fontSelect'),
  previewWord: document.getElementById('previewWord'),
  loader: document.getElementById('loader'),
  stage: document.getElementById('stage'),
  wrap: document.getElementById('wordWrap'),
  preEl: document.getElementById('pre'),
  pivotEl: document.getElementById('pivot'),
  postEl: document.getElementById('post'),
  wpmDisplay: document.getElementById('wpmDisplay'),
  plusBtn: document.getElementById('plusBtn'),
  minusBtn: document.getElementById('minusBtn'),
  progressFill: document.getElementById('progressFill'),
};

createReader(els);
