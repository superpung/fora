// Exercise real browser clocks, source-derived live expectations and notifications.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4216';
const out = resolve(process.env.LIVE_AUDIT_DIR || '/tmp/chinasoft2026-live-audit/after');
mkdirSync(out, {recursive:true});
const data = JSON.parse(readFileSync(new URL('../src/data/conferences/chinasoft2026.json', import.meta.url)));
const server = process.env.AUDIT_BASE_URL ? null : spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,
 ['--host','127.0.0.1','--port','4216','--strictPort'],{cwd:new URL('..',import.meta.url).pathname,stdio:'ignore'});
const follows = {forums:['E6','C5'],talks:['R14#3','R32#1','E4#6','R1#6'],speakers:[]};
const snapshots = [], errors = [];
let browser;
function active(start,end,time) { return !!start && !!end && start <= time && time < end; }
function expectedRooms(day,time) {
 const forums = data.forums.filter(f=>f.day_date===day && active(
  [f.start,...f.talks.map(t=>t.start)].filter(Boolean).sort()[0],
  [f.end,...f.talks.map(t=>t.end)].filter(Boolean).sort().at(-1),time)).map(f=>f.title.zh);
 const events = (data.days.find(d=>d.date===day)?.blocks??[]).filter(b=>b.kind!=='forums'&&active(b.start,b.end,time)).map(b=>b.title.zh);
 return [...forums,...events].sort();
}
async function open(name,time,path,{mobile=false,zone='Asia/Shanghai',dark=false,clock=false,seed=follows,mock=false}={}) {
 const context=await browser.newContext({locale:'zh-CN',timezoneId:zone,hasTouch:mobile,isMobile:mobile,viewport:mobile?{width:390,height:844}:{width:1440,height:1000},serviceWorkers:'block'});
 await context.addInitScript(({seed,dark,mock})=>{
  if(!localStorage.getItem('live-audit-seeded')) {
   for(const [key,value] of Object.entries(seed)) localStorage.setItem('chinasoft2026:followed.'+key,JSON.stringify(value));
   localStorage.setItem('fora-theme',dark?'dark':'light');
   localStorage.setItem('live-audit-seeded','1');
  }
  if(mock) {
   window.__notifications=[];
   window.Notification=class {
    static permission='granted'; static async requestPermission(){return 'granted';}
    constructor(title,options){if(options.tag!=="fora-rem:test") window.__notifications.push({title,...options});}
    close(){}
   };
   navigator.serviceWorker.getRegistration=async()=>undefined;
  }
 },{seed,dark,mock});
 const page=await context.newPage();
 page.setDefaultTimeout(15_000);
 page.on('pageerror', e=>errors.push({name,error:e.message}));
 if(clock) await page.clock.install({time:new Date(time)}); else await page.clock.setFixedTime(new Date(time));
 await page.goto(base+path,{waitUntil:'networkidle'});
 const ready = path==='/' ? '.hub' : path.includes('/now') ? '.nowclock' : path.includes('/forum/') ? '.fd__title' : path.includes('/schedule') ? '.daytabs' : '.dashhead';
 await page.locator(ready).waitFor();
 await page.waitForTimeout(500);
 return {context,page,name,time,path,zone,mobile,dark,ready};
}
async function shot(test,suffix='',expandedCard=false) {
 const {page,name,...meta}=test;
 await page.evaluate(async(forum)=>{
  await document.fonts.ready;
  const previous = scrollY;
  for(let top=0;top<document.documentElement.scrollHeight;top+=innerHeight*0.8) {
   scrollTo({top,behavior:'instant'}); await new Promise(r=>setTimeout(r,650));
  }
  scrollTo({top:forum?previous:0,behavior:'instant'});
 },test.path.includes('/forum/'));
 await page.waitForTimeout(650);
 // Simulated performance clocks and native animation clocks advance separately.
 // Finish finite animations for captures; keep live pulse animations running.
 await page.evaluate(()=>document.getAnimations().forEach(a=>{
  if(Number.isFinite(a.effect?.getComputedTiming().endTime)) a.finish();
 }));
 await page.waitForTimeout(100);
 assert(await page.locator('.frow__talks, .meetrow').evaluateAll(elements=>elements.every(el=>{
  for(let node=el;node;node=node.parentElement) if(Number(getComputedStyle(node).opacity)<0.99) return false;
  return true;
 })),name+' expanded content must be painted');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' page overflow');
 await page.locator(test.ready).waitFor();
 await page.locator('.pageloader').waitFor({state:'hidden'});
 if(expandedCard) {
  const card=page.locator('.tgrid__talk.is-open');
  await card.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await page.waitForTimeout(300);
  assert(await card.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'expanded card must reveal all metadata');
 }
 const filename=name+suffix+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage:!expandedCard&&!test.path.includes('/forum/'),
  // The hosting provider's review toolbar is not part of the application.
  style:'iframe[title="Netlify Drawer"] { visibility: hidden !important; }'});
 snapshots.push({...meta,context:undefined,filename,name:name+suffix});
 console.log('SCREENSHOT '+name+suffix);
}
async function finish(test) {await test.context.close();}
try {
 if(server) for(let i=0;;i++) {
  try {if((await fetch(base)).ok) break;} catch { /* Wait for Vite readiness. */ }
  if(i>100) throw Error('Vite did not start');
  await new Promise(r=>setTimeout(r,100));
 }
 browser=await chromium.launch();
 if(!process.env.REMINDERS_ONLY) for(const [name,day,before,after] of [
  ['nav-conference-start','04',0,1],['nav-conference-end','08',1,0]]) {
  const test=await open(name,`2026-11-${day}T23:59:40+08:00`,'/chinasoft2026/now',
   {clock:true,zone:'America/Los_Angeles'});
  assert.equal(await test.page.locator('.nav__link--live').count(),before);
  await test.page.clock.fastForward(31_000);
  await test.page.waitForFunction(expected=>document.querySelectorAll('.nav__link--live').length===expected,after);
  await shot(test); await finish(test);
 }
 if(!process.env.NAV_ONLY) {
 if(!process.env.REMINDERS_ONLY) {
 const moments=[['preconference','04','12:00'],['registration','05','13:00'],['first-report','06','08:55'],
  ['morning','06','10:00'],['break','06','10:25'],['overrun','06','12:05'],['afternoon','06','14:00'],
  ['annual-meeting','06','19:40'],['opening','07','09:00'],['keynote','07','13:45'],['before-e6','07','14:09'],
  ['e6-running','07','14:30'],['e6-end','07','15:10'],['late-report','07','18:25'],['banquet','07','18:30'],
  ['evening-meeting','07','20:45'],['day-ended','07','23:00'],['last-morning','08','09:30'],
  ['closing','08','14:00'],['last-meeting','08','17:00'],['programme-ended','08','19:00'],['postconference','09','09:00']];
 for(const [name,day,time] of moments) {
  const test=await open('now-'+name,`2026-11-${day}T${time}:00+08:00`,'/chinasoft2026/now');
  await shot(test);
  assert.equal(await test.page.locator('.nowclock__time').innerText(),time);
  assert.deepEqual((await test.page.locator('.nowcard__title').allTextContents()).sort(),expectedRooms('2026-11-'+day,time),name);
  if(name==='e6-running') assert((await test.page.locator('.nowstar--live').innerText()).includes('智能化时代软件人才培养特别大会论坛'));
  if(name==='break') assert((await test.page.locator('.nowcard').filter({hasText:'R14'}).innerText()).includes('茶歇'));
  if(['preconference','postconference'].includes(name)) assert.equal(await test.page.locator('.nowempty').count(),1);
  console.log('PASS '+name); await finish(test);
 }
 for(const mobile of [false,true]) {
  const suffix=mobile?'-mobile':'-desktop';
  for(const [name,path,selector] of [
   ['hub','/','.hubcard'],['home','/chinasoft2026','.frow'],
   ['schedule','/chinasoft2026/schedule?v=all','.tgrid'],
   ['mine-board','/chinasoft2026/schedule?v=mine-board','.tgrid'],
   ['myday','/chinasoft2026/schedule?v=mine-day','.block--myday'],
   ['forum','/chinasoft2026/forum/R14#talk-4','#talk-4'],
   ['now','/chinasoft2026/now','.nowclock']]) {
   const test=await open(name+suffix,'2026-11-06T10:00:00+08:00',path,{mobile});
   const {page}=test; await page.locator(selector).first().waitFor();
   if(name==='hub') assert((await page.locator('.hubgroup').filter({has:page.locator('a[href="/chinasoft2026"]')}).innerText()).startsWith('进行中'));
   if(name==='home') {
    assert((await page.locator('.daypill.is-today').innerText()).includes('11月6日'));
    const row=page.locator('.frow').filter({has:page.locator('.frow__code',{hasText:'R14'})});
    await row.locator('button[aria-expanded]').last().click();
    await row.locator('.is-now').scrollIntoViewIfNeeded();
   }
   if(name==='schedule'||name==='mine-board') {
    assert((await page.locator('.daytab.is-active').innerText()).includes('11月6日'));
    assert.equal(await page.locator('.tgrid__nowpill').innerText(),'10:00');
    await page.locator('.tgrid__nowpill').scrollIntoViewIfNeeded();
    assert((await page.locator('.tgrid__ttime.is-now').count())>0);
    const current=page.locator('.tgrid__talk').filter({has:page.locator('.tgrid__ttime.is-now')}).first();
    await current.scrollIntoViewIfNeeded();
    if(mobile) {
     await current.click(); assert.equal(await current.getAttribute('aria-expanded'),'true');
     // Full-page capture resizes Chromium's mobile viewport and can change hover
     // emulation. Capture the expanded touch control at its real viewport first.
     await shot(test,'-expanded',true);
    }
   }
   if(name==='myday') assert((await page.locator('.talkrow--now').innerText()).includes('大模型威胁下的硬件组件供应链安全'));
   if(name==='forum') assert.equal(await page.locator('#talk-4.tlrow--now').count(),1);
   await shot(test); await finish(test);
  }
 }
 for(const [name,time,path,options] of [
  ['now-dark-mobile','2026-11-07T14:30:00+08:00','/chinasoft2026/now',{mobile:true,dark:true}],
  ['opening-highlight','2026-11-07T09:00:00+08:00','/chinasoft2026/schedule',{}],
  ['myday-unknown','2026-11-07T14:30:00+08:00','/chinasoft2026/schedule?v=mine-day',{}],
  ['unknown-only','2026-11-07T14:30:00+08:00','/chinasoft2026/now',{seed:{forums:['C5'],talks:[],speakers:[]}}],
  ['now-overseas','2026-11-07T09:00:00+08:00','/chinasoft2026/now',{zone:'America/Los_Angeles'}],
  ['schedule-overseas','2026-11-06T10:00:00+08:00','/chinasoft2026/schedule',{zone:'America/Los_Angeles'}],
  ['forum-overseas','2026-11-06T10:00:00+08:00','/chinasoft2026/forum/R14#talk-4',{zone:'America/Los_Angeles'}]]) {
  const test=await open(name,time,path,options); const {page}=test;
  if(name==='now-dark-mobile') assert((await page.locator('.nowstar--live').innerText()).includes('智能化时代软件人才培养特别大会论坛'));
  if(name==='unknown-only') assert.equal((await page.locator('.nowstar__when').innerText()).trim(),'时间待定');
  if(name==='myday-unknown') assert.equal(await page.locator('.myday__move').count(),1);
  if(name==='opening-highlight') assert((await page.locator('.block--other .is-now').first().innerText()).includes('08:30–11:45'));
  if(name==='now-overseas') assert.equal(await page.locator('.nowclock__time').innerText(),'09:00');
  if(name==='schedule-overseas') assert.equal(await page.locator('.tgrid__nowpill').innerText(),'10:00');
  if(name==='forum-overseas') assert.equal(await page.locator('#talk-4.tlrow--now').count(),1);
  await shot(test); await finish(test);
 }
 // Advance actual application intervals, without navigating or reloading.
 for(const [name,path,selector] of [
  ['now-tick','/chinasoft2026/now','.nowcard'],
  ['forum-tick','/chinasoft2026/forum/R14#talk-4','#talk-4.tlrow--now'],
  ['timeline-tick','/chinasoft2026/schedule','.tgrid__nowpill'],
  ['myday-tick','/chinasoft2026/schedule?v=mine-day','.talkrow--now']]) {
  const test=await open(name,'2026-11-06T09:59:40+08:00',path,{clock:true});
  await test.page.clock.fastForward(31_000);
  await test.page.locator(selector).first().waitFor();
  if(name==='now-tick') assert.equal(await test.page.locator('.nowclock__time').innerText(),'10:00');
  if(name==='timeline-tick') assert.equal(await test.page.locator(selector).innerText(),'10:00');
  if(name==='myday-tick') assert((await test.page.locator(selector).innerText()).includes('大模型威胁下的硬件组件供应链安全'));
  await shot(test); await finish(test);
 }
 for(const [name,path,selector] of [['hub-midnight','/','.hubgroup__title'],['home-midnight','/chinasoft2026','.daypill.is-today'],['schedule-midnight','/chinasoft2026/schedule','.daytab.is-today']]) {
  const test=await open(name,name==='hub-midnight'?'2026-11-04T23:59:40+08:00':'2026-11-06T23:59:40+08:00',path,{clock:true,zone:'America/Los_Angeles'});
  await test.page.clock.fastForward(31_000);
  if(name!=='hub-midnight') assert((await test.page.locator(selector).innerText()).includes('11月7日'));
  else assert((await test.page.locator('.hubgroup').filter({has:test.page.locator('a[href="/chinasoft2026"]')}).innerText()).startsWith('进行中'));
  await shot(test); await finish(test);
 }
 }
 // Intercept notification delivery; exercise the real provider and its opt-in UI.
 const rem=await open('reminders-enabled','2026-11-06T09:49:40+08:00','/chinasoft2026/schedule?v=mine-day',
  {clock:true,mobile:true,zone:'America/Los_Angeles',mock:true,seed:{forums:[],talks:['R14#3'],speakers:[]}});
 await rem.page.getByRole('button',{name:'账户与设置',exact:true}).click();
 assert.deepEqual(await rem.page.evaluate(()=>window.__notifications),[]);
 await rem.page.getByRole('button',{name:/日程提醒/}).click();
 await rem.page.waitForTimeout(400); await shot(rem);
 await rem.page.clock.fastForward(31_000);
 await rem.page.waitForFunction(()=>window.__notifications.length===1);
 assert((await rem.page.evaluate(()=>window.__notifications[0].body)).startsWith('10 分钟'));
 await rem.page.clock.fastForward(30_000);
 assert.equal(await rem.page.evaluate(()=>window.__notifications.length),1);
 await rem.page.reload({waitUntil:'networkidle'});
 assert.equal(await rem.page.evaluate(()=>window.__notifications.length),0,'reload must not notify twice');
 await rem.page.clock.fastForward(10*60_000);
 assert.equal(await rem.page.evaluate(()=>window.__notifications.length),0,'started talks must not notify');
 await shot(rem,'-after-start'); await finish(rem);
 const late=await open('reminders-late','2026-11-06T09:55:00+08:00','/chinasoft2026/schedule?v=mine-day',
  {mock:true,zone:'America/Los_Angeles',seed:{forums:[],talks:['R14#3'],speakers:[]}});
 await late.page.getByRole('button',{name:'账户与设置',exact:true}).click();
 await late.page.getByRole('button',{name:/日程提醒/}).click();
 await late.page.waitForFunction(()=>window.__notifications.length===1);
 await shot(late);
 assert((await late.page.evaluate(()=>window.__notifications[0].body)).startsWith('5 分钟'),'late activation uses actual time remaining');
 await finish(late);
 for(const [name,seed,time] of [
  ['reminders-disabled',{forums:[],talks:['R14#3'],speakers:[]},'2026-11-06T09:49:40+08:00'],
  ['reminders-untimed',{forums:['C5'],talks:[],speakers:[]},'2026-11-07T14:00:00+08:00']]) {
  const test=await open(name,time,'/chinasoft2026/now',{seed,clock:true,mock:true,mobile:true});
  await test.page.getByRole('button',{name:'账户与设置',exact:true}).click();
  const toggle=test.page.getByRole('button',{name:/日程提醒/});
  await toggle.click();
  if(name==='reminders-disabled') await toggle.click();
  await test.page.clock.fastForward(31_000);
  assert.equal(await test.page.evaluate(()=>window.__notifications.length),0,name);
  await shot(test); await finish(test);
 }
 const daily=await open('reminders-day-start','2026-11-06T09:49:40+08:00','/chinasoft2026/now',
  {clock:true,mock:true,mobile:true,seed:{forums:[],talks:['R14#3'],speakers:[]}});
 await daily.page.getByRole('button',{name:'账户与设置',exact:true}).click();
 await daily.page.getByRole('button',{name:/日程提醒/}).click();
 await daily.page.getByRole('button',{name:/每日开始提醒/}).click();
 await daily.page.clock.fastForward(31_000);
 await daily.page.waitForFunction(()=>window.__notifications.length===2);
 assert((await daily.page.evaluate(()=>window.__notifications.map(n=>n.title).join(' '))).includes('今日日程即将开始'));
 await shot(daily); await finish(daily);
 const legacy=await open('reminders-legacy-cache','2026-11-06T09:49:40+08:00','/chinasoft2026/schedule',
  {clock:true,mock:true,zone:'America/Los_Angeles',seed:{forums:[],talks:['R14#3'],speakers:[]}});
 await legacy.page.evaluate(()=>{
  const key='chinasoft2026:reminder.items';
  const cached=JSON.parse(localStorage.getItem(key));
  delete cached.timezone; localStorage.setItem(key,JSON.stringify(cached));
 });
 await legacy.page.goto(base+'/',{waitUntil:'networkidle'});
 legacy.path='/'; legacy.ready='.hub';
 await legacy.page.locator('.hub').waitFor();
 await legacy.page.getByRole('button',{name:'账户与设置',exact:true}).click();
 await legacy.page.getByRole('button',{name:/日程提醒/}).click();
 await legacy.page.clock.fastForward(31_000);
 await legacy.page.waitForFunction(()=>window.__notifications.length===1);
 assert((await legacy.page.evaluate(()=>window.__notifications[0].title)).includes('大模型威胁下的硬件组件供应链安全'));
 await shot(legacy); await finish(legacy);
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS clock audit: ${snapshots.length} screenshots, live boundaries, overseas clocks, automatic ticks, midnight and reminders`);
} finally {
 writeFileSync(resolve(out,'results.json'),JSON.stringify({base,snapshots,errors},null,2));
 writeFileSync(resolve(out,'index.html'),'<!doctype html><meta charset="utf-8"><title>ChinaSoft 2026 live clock audit</title><style>body{font:14px system-ui;margin:24px;background:#fafafa}section{margin:32px 0}img{max-width:100%;border:1px solid #ddd}a{color:#06c}</style><h1>ChinaSoft 2026 live clock audit</h1>'+snapshots.map(s=>`<section><h2>${s.name}</h2><p>Initial browser time: ${s.time} · Device zone: ${s.zone} · ${s.path}</p><a href="${s.filename}"><img loading="lazy" src="${s.filename}"></a></section>`).join(''));
 await browser?.close(); server?.kill();
}
