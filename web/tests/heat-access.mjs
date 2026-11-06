// Heat visibility follows the authenticated participation setting across navigation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {installDataFixture} from './data-fixture.mjs';
const base='http://127.0.0.1:4254';
const server=spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,['--host','127.0.0.1','--port','4254','--strictPort'],{cwd:new URL('..',import.meta.url),stdio:'ignore'});
const raw={id:'sample',name:{zh:'Sample'},start_date:'2032-01-01',end_date:'2032-01-01',days:[],forums:[],committees:[],organizations:[],venues:[]};
let browser;
try {
 for(let i=0;;i++){try{if((await fetch(base)).ok)break;}catch{}assert(i<100);await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();await mkdir('/tmp/fora-heat-access',{recursive:true});
 for(const [width,colorScheme] of [[1280,'light'],[390,'dark']])for(const mode of ['anonymous','disabled','enabled','expired','session-error']) {
  const page=await browser.newPage({viewport:{width,height:900},locale:'zh-CN',colorScheme});let user=mode==='enabled'||mode==='expired'||mode==='disabled'?{id:'test',login:'tester'}:null;
  let statistics={enabled:mode==='enabled'||mode==='expired',revision:0},reads=0,expired=false;
  await installDataFixture(page,structuredClone(raw));
  await page.addInitScript(()=>localStorage.setItem('fora.heat.enabled','true'));
  await page.route('**/api/session',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.fulfill({status:mode==='session-error'?503:200,json:{enabled:true,user,statistics:user?statistics:null}})});
  await page.route('**/api/sync',r=>r.fulfill({status:expired?401:200,json:{revision:0,bundle:{app:'fora',version:1,follows:[],prefs:{}},statistics,updated_at:''}}));
  await page.route('**/api/statistics',r=>{statistics={enabled:r.request().postDataJSON().enabled,revision:statistics.revision+1};return r.fulfill({json:statistics})});
  await page.route('**/api/auth/logout',r=>{user=null;return r.fulfill({json:{ok:true}})});
  await page.route('**/api/heat',r=>{reads++;return r.fulfill({status:expired?401:200,json:{generated_at:new Date().toISOString(),conferences:{}},headers:{'Cache-Control':'private, no-cache, max-age=300'}})});
  await page.goto(base+'/sample/popular');
  if(mode==='enabled'||mode==='expired') {
   await page.getByRole('tab',{name:'报告',exact:true}).waitFor();assert(page.url().includes('/popular'));assert(reads>=1,'valid deep link waits for the session');
   await page.getByRole('button',{name:'账户与设置',exact:true}).click();
   await page.getByRole('button',{name:'热度统计',exact:true}).click();
   await page.waitForURL('**/sample');assert.equal(await page.locator('a[href="/sample/popular"]').count(),0);
   await page.screenshot({path:`/tmp/fora-heat-access/${width}-off.png`});
   await page.getByRole('button',{name:'热度统计',exact:true}).click();
   await page.locator('a[href="/sample/popular"]').waitFor();
   await page.getByRole('button',{name:'账户与设置',exact:true}).click();
   const beforeReads=reads;
   const reentry=page.waitForResponse(response=>response.url().endsWith('/api/heat')&&response.status()===200);
   await page.locator('a[href="/sample/popular"]').click();await reentry;
   await page.getByRole('tab',{name:'报告',exact:true}).waitFor();assert(reads>beforeReads,'re-entering validates access again');
   await page.screenshot({path:`/tmp/fora-heat-access/${width}-on.png`});
   if(mode==='expired'){expired=true;await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'))});}
   else {await page.getByRole('button',{name:'账户与设置',exact:true}).click();await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:'退出登录',exact:true}).click();}
   await page.waitForURL('**/sample');assert.equal(await page.locator('a[href="/sample/popular"]').count(),0);
  }else{
   await page.waitForURL('**/sample');await page.waitForTimeout(600);assert.equal(reads,0);
   assert.equal(await page.locator('a[href="/sample/popular"]').count(),0);
   await page.getByRole('button',{name:'账户与设置',exact:true}).click();
   assert.equal(await page.getByRole('button',{name:'热度统计',exact:true}).count(),mode==='disabled'?1:0);
   await page.screenshot({path:`/tmp/fora-heat-access/${width}-${mode}.png`});
  }
  console.log('PASS',width,mode,'heat access and settings');await page.close();
 }
}finally{await browser?.close();server.kill();}
