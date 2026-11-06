// Both live panels share timing metadata across countdown and running states.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {installDataFixture} from './data-fixture.mjs';
const base='http://127.0.0.1:4255';
const server=spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,['--host','127.0.0.1','--port','4255','--strictPort'],{cwd:new URL('..',import.meta.url),stdio:'ignore'});
const date='2032-05-07';
const raw={id:'fixture',name:{zh:'Live fixture'},start_date:date,end_date:date,timezone:'Asia/Shanghai',venues:[],committees:[],organizations:[],days:[{date,blocks:[{kind:'forums',start:'09:00',end:'11:00',forum_entries:[{forum_code:'A'},{forum_code:'B'}]}]}],forums:['A','B'].map((code,i)=>({code,title:{zh:'Forum '+code},day_date:date,start:i?'10:00':'09:00',end:'11:00',room:'Room '+code,detail_extracted:true,talks:[{id:code+'#0',title:{zh:'Report '+code},type:'talk',start:i?'10:00':'09:00',end:i?'11:00':'09:30',speakers:[{name:'Alex'}]}]}))};
for(const code of ['C','D','E','F']) {
 const f=structuredClone(raw.forums[0]);f.code=code;f.title.zh=code==='C'?'A longer forum title that wraps to several lines':'Forum '+code;
 f.talks[0].id=code+'#0';f.talks[0].title.zh=code==='D'?'A long current report title spanning multiple lines':'Current report '+code;
 if(code==='E')f.talks[0].speakers=[];
 f.talks.push({id:code+'#1',title:{zh:'Next report '+code},type:'talk',start:'09:30',end:'10:00',speakers:[{name:'Blair'}]});
 raw.forums.push(f);raw.days[0].blocks[0].forum_entries.push({forum_code:code});
}
let browser;
try{
 for(let i=0;;i++){try{if((await fetch(base)).ok)break;}catch{}assert(i<100);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();await mkdir('/tmp/fora-live-countdown',{recursive:true});
 for(const [width,colorScheme]of[[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']]){
 const p=await browser.newPage({locale:'zh-CN',viewport:{width,height:1000},colorScheme,timezoneId:'America/Los_Angeles'});
 await p.clock.setFixedTime(new Date(date+'T08:58:00+08:00'));
 await installDataFixture(p,structuredClone(raw));await p.route('**/api/session',r=>r.fulfill({json:{enabled:false,user:null}}));await p.addInitScript(()=>localStorage.setItem('fixture:followed.talks',JSON.stringify(['A#0'])));
 await p.goto(base+'/fixture/now');await p.waitForTimeout(1000);await p.locator('.nowstar__when').waitFor();await p.waitForTimeout(800);
 const next=p.locator('.nownext__when'),star=p.locator('.nowstar__when');assert.equal(await next.innerText(),'2 分钟后');assert.equal(await star.innerText(),'2 分钟后');
 for(const e of [next,star]){assert.equal(await e.locator('svg').count(),1);assert.equal(await e.locator('svg').getAttribute('width'),'13');}
 assert.deepEqual(await next.locator('svg').evaluate(e=>e.innerHTML),await star.locator('svg').evaluate(e=>e.innerHTML));
 const styles=async e=>e.evaluate(el=>{const s=getComputedStyle(el),i=getComputedStyle(el.querySelector('svg'));return [s.display,s.gap,s.fontSize,i.color]});assert.deepEqual(await styles(next),await styles(star));
 await star.scrollIntoViewIfNeeded();await p.screenshot({path:`/tmp/fora-live-countdown/${width}-${colorScheme}-before.png`});
 await p.clock.setFixedTime(new Date(date+'T09:00:00+08:00'));await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForFunction(()=>document.querySelector('.nowstar--live'));assert.equal(await star.locator('svg').count(),1);assert(!(await star.innerText()).includes('分钟后'));
 await p.waitForTimeout(1000);
 await p.evaluate(()=>{
  const groups=new Map();
  for(const card of document.querySelectorAll('.nowcard')) {
   const r=card.getBoundingClientRect();const key=Math.round(r.top);const row=groups.get(key)||[];row.push(card);groups.set(key,row);
  }
  for(const row of groups.values())for(const selector of [null,'.nowcard__top','.nowcard__talk','.nowcard__next']) {
   const rects=row.map(c=>selector?c.querySelector(selector):c).filter(Boolean).map(e=>e.getBoundingClientRect());
   if(rects.length>1&&Math.max(...rects.map(r=>r.top))-Math.min(...rects.map(r=>r.top))>1)throw Error('Live section misalignment: '+selector);
   if(!selector&&Math.max(...rects.map(r=>r.height))-Math.min(...rects.map(r=>r.height))>1)throw Error('Unequal card heights');
  }
 });
 await p.locator('.nowrooms').scrollIntoViewIfNeeded();
 await p.screenshot({path:`/tmp/fora-live-countdown/${width}-${colorScheme}-running.png`});
 await p.locator('.nowstar__link').click();await p.waitForURL('**/forum/A#talk-1');await p.goBack();await p.waitForTimeout(1000);await star.waitFor();assert.equal(await star.locator('svg').count(),1);
 console.log('PASS',width,colorScheme,'matching icon/style, venue countdown, running boundary and navigation');await p.close();
 }
}finally{await browser?.close();server.kill();}
