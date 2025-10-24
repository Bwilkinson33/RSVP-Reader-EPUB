// High-level EPUB loader: file -> chapters[]
// Uses JSZip via ESM: we import from esm.sh to avoid bundlers.
import JSZip from 'https://esm.sh/jszip@3.10.1';

function textDecoder(bytes){
  return new TextDecoder('utf-8').decode(bytes);
}

async function readXml(zip, path){
  const file = zip.file(path);
  if(!file) throw new Error('Missing file in EPUB: ' + path);
  const xmlText = await file.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if(err) throw new Error('XML parse error in ' + path);
  return doc;
}

function resolvePath(base, rel){
  if(/^\w+:\/\//.test(rel)) return rel;
  const stack = base.split('/').slice(0,-1);
  const parts = rel.split('/');
  for(const p of parts){
    if(p==='.'||p==='') continue;
    if(p==='..') stack.pop();
    else stack.push(p);
  }
  return stack.join('/');
}

function cleanTextFromXHTML(xhtmlString){
  // Parse as HTML to easily query elements
  const doc = new DOMParser().parseFromString(xhtmlString, 'text/html');
  // Drop boilerplate
  doc.querySelectorAll('script,style,nav,header,footer').forEach(el=>el.remove());
  // Remove page breaks/footnotes by common roles/classes (best-effort)
  doc.querySelectorAll('[role="doc-pagebreak"], .pagebreak, sup.footnote, a.footnote').forEach(el=>el.remove());

  // Gather textual blocks
  const blocks = [];
  const selectors = 'article,section,h1,h2,h3,h4,h5,h6,p,li,blockquote';
  doc.querySelectorAll(selectors).forEach(el=>{
    const t = el.textContent.replace(/\u00AD/g,'').trim(); // strip soft hyphen
    if(t) blocks.push(t);
  });
  // Fallback: if nothing matched, use body text
  if(blocks.length===0){
    const t = doc.body ? doc.body.textContent.trim() : xhtmlString;
    if(t) blocks.push(t);
  }
  // Join with blank lines between blocks to preserve paragraph boundaries
  return blocks.join('\n\n');
}

async function loadOPF(zip, containerDoc){
  const rootfile = containerDoc.querySelector('rootfile');
  if(!rootfile) throw new Error('OPF rootfile not found');
  const opfPath = rootfile.getAttribute('full-path');
  const opfDoc = await readXml(zip, opfPath);

  const manifest = {};
  opfDoc.querySelectorAll('manifest > item').forEach(it=>{
    manifest[it.getAttribute('id')] = {
      href: it.getAttribute('href'),
      mediaType: it.getAttribute('media-type')
    };
  });

  const spine = [];
  opfDoc.querySelectorAll('spine > itemref').forEach(ir=>{
    const idref = ir.getAttribute('idref');
    if(idref && manifest[idref]) spine.push(manifest[idref].href);
  });

  // Basic metadata
  const titleNode = opfDoc.querySelector('metadata > title, metadata > dc\:title');
  const title = titleNode ? titleNode.textContent.trim() : 'Untitled EPUB';

  // Try nav or ncx for nicer chapter titles (optional)
  // Resolve paths relative to OPF
  const manifestByHref = {};
  Object.keys(manifest).forEach(id=>{
    const abs = resolvePath(opfPath, manifest[id].href);
    manifestByHref[abs] = id;
  });
  let tocTitles = [];
  // Find nav (EPUB 3)
  const navItem = opfDoc.querySelector('manifest > item[properties~="nav"]');
  if(navItem){
    const navPath = resolvePath(opfPath, navItem.getAttribute('href'));
    const navFile = await zip.file(navPath).async('string');
    const navDoc = new DOMParser().parseFromString(navFile, 'text/html');
    navDoc.querySelectorAll('nav[epub\:type="toc"] li, nav#toc li').forEach(li=>{
      const a = li.querySelector('a');
      if(a){
        const txt = a.textContent.trim();
        const href = a.getAttribute('href');
        tocTitles.push({txt, href});
      }
    });
  } else {
    // Fallback: NCX (EPUB 2)
    const ncxId = opfDoc.querySelector('spine').getAttribute('toc');
    if(ncxId && manifest[ncxId]){
      const ncxPath = resolvePath(opfPath, manifest[ncxId].href);
      const ncxDoc = await readXml(zip, ncxPath);
      ncxDoc.querySelectorAll('navMap > navPoint > navLabel > text').forEach(t=>{
        const txt = t.textContent.trim();
        tocTitles.push({txt});
      });
    }
  }

  return { opfPath, spine, manifest, title, tocTitles };
}

export async function loadEpubFile(file){
  const zip = await JSZip.loadAsync(file);
  const containerDoc = await readXml(zip, 'META-INF/container.xml');
  const { opfPath, spine, manifest, title, tocTitles } = await loadOPF(zip, containerDoc);

  const chapters = [];
  for(let i=0;i<spine.length;i++){
    const href = spine[i];
    const chapPath = resolvePath(opfPath, href);
    const file = zip.file(chapPath);
    if(!file) continue;
    const xhtml = await file.async('string');
    const text = cleanTextFromXHTML(xhtml);
    chapters.push({ title: (tocTitles[i]?.txt || `Chapter ${i+1}`), text });
  }
  return { title, chapters };
}
