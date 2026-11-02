// Published intervals must share the clock axis regardless of earlier density.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {installDataFixture} from './data-fixture.mjs';
const base='http://127.0.0.1:4253';
const server=spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,['--host','127.0.0.1','--port','4253','--strictPort'],{cwd:new URL('..',import.meta.url),stdio:'ignore'});
const date='2032-05-07';
const talk=(id,start,end)=>({id,title:{zh:'Detailed report '+id},speakers:[{name:'Alex'}],start,end,type:'talk'});
const raw={id:'fixture',name:{zh:'Axis fixture'},start_date:date,end_date:date,timezone:'Asia/Shanghai',venues:[],organizations:[],committees:[],
 days:[{date,blocks:[{id:'board',kind:'forums',start:'09:00',end:'15:00',forum_entries:[{forum_code:'A'},{forum_code:'B'}]}]}],
 forums:[{code:'A',title:{zh:'Dense programme'},day_date:date,room:'Room A',detail_extracted:true,start:'09:00',end:'15:00',
 talks:[talk('A#0','09:00','09:02'),talk('A#1','09:02','09:05'),talk('A#2','09:05','10:00'),talk('A#3','10:00','11:00'),talk('A#4','11:00','12:00'),talk('A#5','14:00','15:00')],breaks:[{name:'Lunch',start:'12:00',end:'14:00'}]},
 {code:'B',title:{zh:'Sparse programme'},day_date:date,room:'Room B',detail_extracted:true,start:'09:00',end:'15:00',talks:[talk('B#0','09:00','12:00'),talk('B#1','14:00',null)],breaks:[{name:'Short break',start:'12:00',end:'12:02'}]}]};
let browser;
try{
 for(let i=0;;i++){try{if((await fetch(base)).ok)break;}catch{}assert(i<100);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();await mkdir('/tmp/fora-timeline-axis',{recursive:true});
 for(const [width,colorScheme,hasTouch]of[[1280,'light',false],[1280,'dark',false],[390,'light',true],[390,'dark',true]]){
 const page=await browser.newPage({locale:'zh-CN',viewport:{width,height:900},colorScheme,hasTouch,isMobile:hasTouch});
 await installDataFixture(page,structuredClone(raw));await page.route('**/api/session',r=>r.fulfill({json:{enabled:false,user:null}}));
 await page.goto(base+'/fixture/schedule?v=all');await page.locator('.tgrid__talk').first().waitFor();await page.waitForTimeout(900);
 const verify=()=>page.evaluate(()=>{
  const min=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  for(const el of document.querySelectorAll('.tgrid__talk, .tgrid__break')){
   const box=el.getBoundingClientRect(),body=el.closest('.tgrid__cbody').getBoundingClientRect();
   const expected=(min(el.dataset.start)-540)*3.4;
   if(Math.abs(box.top-body.top-expected)>0.1)throw Error('Start drift '+el.dataset.start);
   if(el.dataset.end&&Math.abs(box.height-(min(el.dataset.end)-min(el.dataset.start))*3.4)>0.1)throw Error('Duration drift '+el.dataset.start);
  }
  const gutter=document.querySelector('.tgrid__gbody').getBoundingClientRect();
  for(const body of document.querySelectorAll('.tgrid__cbody'))if(Math.abs(body.getBoundingClientRect().top-gutter.top)>0.1)throw Error('Clock origin differs');
 });
 await verify();const first=page.locator('.tgrid__talk').first(),next=page.locator('.tgrid__talk').nth(1);const nextTop=await next.evaluate(e=>e.style.top);
 if(hasTouch){await first.tap();assert.equal(await first.getAttribute('aria-expanded'),'true');}
 else{await first.focus();await page.waitForTimeout(300);assert(await first.evaluate(e=>e.getBoundingClientRect().height>30));await first.blur();await first.hover();}
 await page.waitForTimeout(300);assert(await first.evaluate(e=>e.getBoundingClientRect().height>30));assert.equal(await next.evaluate(e=>e.style.top),nextTop);
 await page.screenshot({path:`/tmp/fora-timeline-axis/${width}-${colorScheme}-expanded.png`});
 if(hasTouch){await first.tap();await page.mouse.move(0,0);}else await page.mouse.move(0,0);
 await page.waitForTimeout(400);await verify();
 const lunch=page.locator('.tgrid__break').filter({hasText:'Lunch'});await lunch.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await verify();
 await page.screenshot({path:`/tmp/fora-timeline-axis/${width}-${colorScheme}-lunch.png`});
 console.log('PASS',width,colorScheme,'exact starts/ends, short talks/breaks, lunch, independent columns and expansion');await page.close();
 }
}finally{await browser?.close();server.kill();}
