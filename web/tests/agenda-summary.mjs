// Synthetic programmes guard every cross-surface time and day-summary contract.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {installDataFixture} from './data-fixture.mjs';
const base='http://127.0.0.1:4251';
const server=spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,['--host','127.0.0.1','--port','4251','--strictPort'],{cwd:new URL('..',import.meta.url),stdio:'ignore'});
const person=name=>({name});
const talk=(title,start,end,speakers=[person(title)])=>({type:'keynote',title:{zh:title},start,end,speakers});
const day='2032-05-07', next='2032-05-08';
const raw={id:'fixture',name:{zh:'Synthetic programme'},start_date:day,end_date:next,timezone:'Asia/Shanghai',
 venues:[{id:'v',name:{zh:'Venue'},type:'main'}],organizations:[],committees:[],
 days:[{date:day,venue_id:'v',blocks:[
  {id:'am',kind:'forums',start:'08:00',end:'11:00',forum_entries:[{forum_code:'A'}]},
  {id:'pm',kind:'forums',start:'14:00',end:'17:00',forum_entries:[{forum_code:'B'}]},
  {id:'key',kind:'keynotes',title:{zh:'Plenary'},start:'13:00',end:'15:00',location:'Hall',extra:{flags:['Venue source note']},talks:[
   talk('Afternoon report','13:45','14:00'),talk('Panel','14:00','15:00',['Alex','Blair','Casey','Drew','Evan','Fran'].map(person))]},
  {id:'meeting',kind:'committee_meetings',start:'20:00',end:'21:00',meetings:[{name:{zh:'Evening meeting'},start:'20:00',end:'22:00',room:'Room'}]},
 ]},{date:next,venue_id:'v',blocks:[{id:'only',kind:'keynotes',title:{zh:'Plenary only'},start:'18:00',end:'19:00',talks:[talk('Evening report','18:00','19:00')]}]}],
 forums:['A','B'].map((code,i)=>({code,title:{zh:'Forum '+code},day_date:day,session_period:'morning',room:'Room '+code,detail_extracted:true,
  talks:[{...talk('Forum report '+code,i?'14:30':'09:00',i?'15:00':'09:30'),type:'talk',enrichment:{topics:['软件测试'],summary:{zh:'Test'}}}]}))};
for(const f of raw.forums)f.talks.forEach((t,i)=>t.id=`${f.code}#${i}`);
for(const d of raw.days){let i=0;for(const b of d.blocks)if(b.kind==='keynotes')for(const t of b.talks??[])t.id=`KEYNOTE:${d.date}#${i++}`;}
let browser;
try{
 for(let i=0;;i++){try{if((await fetch(base)).ok)break;}catch{}assert(i<100);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();await mkdir('/tmp/fora-agenda-summary',{recursive:true});
 for(const [width,colorScheme] of [[1280,'light'],[390,'light'],[1280,'dark'],[390,'dark']]){
  const context=await browser.newContext({locale:'zh-CN',timezoneId:'America/Los_Angeles',colorScheme,viewport:{width,height:900},serviceWorkers:'block'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await installDataFixture(page,structuredClone(raw));
  await page.route('**/api/session',r=>r.fulfill({json:{enabled:false,user:null}}));
  await page.goto(base+'/fixture');await page.locator('h1').waitFor();
  await page.evaluate(async raw=>{
   const {buildConferenceViews}=await import('/src/lib/data.ts');
   const {periodAt,publishedWindow}=await import('/src/lib/conference-time.ts');
   const check=(ok,label)=>{if(!ok)throw Error(label)};
   for(const [time,expected] of [['11:59','morning'],['12:00','afternoon'],['17:59','afternoon'],['18:00','evening'],[null,undefined],['bad',undefined]])check(periodAt(time)===expected,'period '+time);
   check(publishedWindow([]).start===undefined,'empty interval');
   const v=buildConferenceViews(raw);
   const [{buildTopicMap},{similarTalks},{buildLiveView},{keynoteItem,toICS}]=await Promise.all([
    import('/src/lib/topics.ts'),import('/src/lib/similar.ts'),import('/src/lib/live.ts'),import('/src/lib/export.ts')]);
   const topicTalks=buildTopicMap(raw,'zh',800,600,k=>k).nodes.flatMap(n=>n.talks);
   check(topicTalks.some(t=>t.forumCode==='B'&&t.period==='afternoon'),'topic report period');
   check(similarTalks(raw.id,raw,'A',0).some(t=>t.forumCode==='B'&&t.period==='afternoon'),'similar report period');
   check(buildLiveView(v,{todayStr:raw.days[0].date,nowMin:14*60+40}).nowRooms.some(r=>r.code==='B'),'second forum board is live');
   const item=keynoteItem(raw.days[0].blocks[2].talks[0].id,v,'talk');
   check(item.start==='13:45'&&item.end==='14:00','resolved agenda clock');
   check(toICS([item],'2032-05-01T00:00:00Z',v).includes('DTSTART:20320507T054500Z'),'export uses venue clock across device timezone');
   check(v.scheduleDays.length===2,'plenary-only day');
   check(v.scheduleDays[0].slots.length===2,'all forum blocks');
   check(v.scheduleDays[0].start==='08:00'&&v.scheduleDays[0].end==='22:00','full published day envelope');
   check(v.forumTimeWindow(v.forumsByCode.B).start==='14:00','forum uses its own block');
   const periods=v.speakerList.flatMap(s=>s.talks.map(t=>[t.talkTitle.zh,t.period]));
   check(periods.some(([t,p])=>t==='Afternoon report'&&p==='afternoon'),'afternoon keynote');
   check(periods.some(([t,p])=>t==='Evening report'&&p==='evening'),'evening keynote');
   check(periods.some(([t,p])=>t==='Forum report B'&&p==='afternoon'),'precise report time outranks forum period');
  },raw);
  const sections=page.locator('.dashday');assert.equal(await sections.count(),2);
  assert((await sections.first().locator('.dashday__time').innerText()).includes('08:00–22:00'));
  assert.equal(await sections.first().locator('.dashday__n').innerText(),'2 个论坛');
  for(const toggle of await page.locator('.krail__toggle').all())await toggle.click();
  const panel=page.locator('.krow').filter({has:page.getByText('Panel',{exact:true})});
  const names=await panel.locator('.pauthor').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
  assert(names[1].x>names[0].x);assert.equal(names[0].y,names[1].y);
  await panel.scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`/tmp/fora-agenda-summary/${width}-${colorScheme}-home.png`});
  await page.goto(base+'/fixture/speakers?q=Afternoon');await page.locator('.spcard__main').first().click();
  await page.locator('.sptalk').waitFor();assert((await page.locator('.sptalk').innerText()).includes('下午'));
  await page.waitForTimeout(500);await page.screenshot({path:`/tmp/fora-agenda-summary/${width}-${colorScheme}-speaker.png`});
  await page.goto(base+'/fixture/schedule?v=all');const toggle=page.getByRole('button',{name:'来源注记'});await toggle.waitFor();
  await toggle.focus();await page.keyboard.press('Enter');await page.getByText('Venue source note',{exact:true}).waitFor();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');await toggle.click();
  assert.deepEqual(errors,[]);console.log('PASS',width,colorScheme,'periods, full day, all blocks, plenary-only day, horizontal names, speaker metadata, source disclosure');
  await context.close();
 }
}finally{await browser?.close();server.kill();}
