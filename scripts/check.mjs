import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, writeFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(import.meta.dirname, '..');
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
await access(chrome);
const profile = await mkdtemp(path.join(tmpdir(), 'photographer-test-'));
const browser = spawn(chrome, ['--headless', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-pipe'], {stdio:['ignore','ignore','pipe','pipe','pipe']});
let sequence = 0, pending = new Map(), buffer = '', session;
browser.stderr.on('data', () => {});
browser.stdio[4].on('data', chunk => {
 buffer += chunk.toString();
 while (buffer.includes('\0')) {
  const end = buffer.indexOf('\0'), line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
  if (!line) continue;
  const message = JSON.parse(line), request = pending.get(message.id);
  if (request) {pending.delete(message.id); clearTimeout(request.timer); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);}
 }
});
function send(method, params = {}, sessionId = session) {
 return new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => {pending.delete(id); reject(new Error(`Timed out: ${method}`));}, 20000);
  pending.set(id, {resolve, reject, timer});
  browser.stdio[3].write(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}) + '\0');
 });
}
async function evaluate(expression) {
 const result = await send('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
 if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
 return result.result.value;
}
async function screenshot(name) {
 await evaluate('Promise.all([...document.images].map(img => img.decode().catch(() => {})))');
 await evaluate('Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))');
 const result = await send('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
 await mkdir(path.join(root, 'artifacts'), {recursive:true});
 await writeFile(path.join(root, 'artifacts', name), Buffer.from(result.data, 'base64'));
}
try {
 const {targetId} = await send('Target.createTarget', {url:'about:blank'}, null);
 ({sessionId:session} = await send('Target.attachToTarget', {targetId, flatten:true}, null));
 await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate', {url:pathToFileURL(path.join(root,'dist/index.html')).href});
 await evaluate(`new Promise((resolve,reject) => {let n=0;const timer=setInterval(() => {if(document.querySelectorAll('.thumbnail').length===6){clearInterval(timer);resolve(true)}else if(n++>100){clearInterval(timer);reject(Error('Gallery did not initialize'))}},50)})`);
 await evaluate('document.fonts.ready');
 await screenshot('desktop.png');
 const results = await evaluate(`(async () => {
  const results=[];
  function check(condition,name){if(!condition)throw Error(name);results.push(name)}
  const q=s=>document.querySelector(s), count=()=>q('#photo-count').textContent;
  check(count()==='3/6','Initial reference photo');
  q('.next').click(); check(count()==='4/6','Next photo');
  q('.thumbnail').click(); check(count()==='1/6','Thumbnail selection');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); check(count()==='6/6','Keyboard wraps backwards');
  q('[data-collection=italy]').click(); check(count()==='1/3' && q('.thumbnails').children.length===3,'Collection change updates photo count');
  q('.expand-button').click(); check(q('.lightbox').open,'Enlarged view opens');
  q('.lightbox-next').click(); check(count()==='2/3' && q('.lightbox figcaption').textContent.includes('2/3'),'Enlarged view navigation');
  q('.lightbox-close').click(); check(!q('.lightbox').open,'Enlarged view closes');
  for(const button of document.querySelectorAll('[data-collection]')){
   button.click(); await Promise.all([...document.images].map(img=>img.decode()));
   check([...document.images].every(img=>img.naturalWidth>0),'Images load: '+button.textContent);
  }
  q('[data-collection=croatia]').click();q('.thumbnail:nth-child(3)').click();
  const thumbs=[...document.querySelectorAll('.thumbnail')].map(el=>el.getBoundingClientRect());
  check(thumbs.every((box,i)=>i===0||box.top>=thumbs[i-1].bottom),'Thumbnails do not overlap');
  check(document.documentElement.scrollWidth<=innerWidth,'Desktop has no horizontal overflow');
  return results;
 })()`);
 results.forEach(result => console.log('PASS',result));
 await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
 await screenshot('mobile.png');
 const mobile = await evaluate(`(() => {
  if(document.documentElement.scrollWidth>innerWidth)throw Error('Mobile horizontal overflow');
  if(getComputedStyle(document.querySelector('.thumbnails')).flexDirection!=='row')throw Error('Mobile thumbnails layout');
  const stage=document.querySelector('.photo-stage');
  stage.dispatchEvent(new TouchEvent('touchstart',{changedTouches:[new Touch({identifier:1,target:stage,clientX:280,clientY:300})]}));
  stage.dispatchEvent(new TouchEvent('touchend',{changedTouches:[new Touch({identifier:1,target:stage,clientX:80,clientY:305})]}));
  if(document.querySelector('#photo-count').textContent!=='4/6')throw Error('Mobile swipe');
  return 'Mobile layout and swipe';
 })()`);
 console.log('PASS',mobile);
 console.log('Browser verification complete. Screenshots: artifacts/');
} finally {
 for(const request of pending.values())clearTimeout(request.timer);
 browser.kill('SIGTERM');
}
