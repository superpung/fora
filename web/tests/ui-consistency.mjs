// Check the real shared surfaces, generated output and preserved source punctuation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4231', output=process.env.UI_AUDIT_DIR || '/tmp/fora-polish-audit';
const server=spawn(new URL('../node_modules/.bin/vite',import.meta.url).pathname,
  ['--host','127.0.0.1','--port','4231','--strictPort'],{cwd:new URL('..',import.meta.url).pathname,stdio:'ignore'});
const chip=JSON.parse(await readFile(new URL('../../data/ccfchip2026.json',import.meta.url)));
const sponsor=chip.forums.find(f=>f.sponsor);
let browser;
try {
  await mkdir(output,{recursive:true});
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch();
  for(const [name,width,height,colorScheme] of [['desktop',1280,900,'light'],['mobile',390,844,'light'],['desktop-dark',1280,900,'dark'],['mobile-dark',390,844,'dark']]){
    const context=await browser.newContext({viewport:{width,height},locale:'zh-CN',colorScheme});
    await context.addInitScript(()=>{
      localStorage.setItem('chinasoft2026:followed.talks',JSON.stringify(['R1#1']));
      localStorage.setItem('fora-ai.enabled','1');
      window.__posterText=[];
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__posterText.push(String(text));return fill.call(this,text,...args);};
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/session',r=>r.fulfill({json:{enabled:true,user:null,statistics:null}}));
    const shot=async label=>{
      await page.waitForTimeout(650);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' has no horizontal overflow');
      await page.screenshot({path:`${output}/${name}-${label}.png`});
    };
    const goto=async(path,ready)=>{await page.goto(base+path);await page.locator(ready).first().waitFor();};
    const appearance=badge=>badge.evaluate(el=>{const s=getComputedStyle(el);return [s.fontFamily,s.fontSize,s.fontWeight,s.padding,s.borderRadius,s.backgroundColor,s.color];});
    await goto('/chinasoft2026','.frow__code');
    const badgeStyle=await appearance(page.locator('.frow__code').first());
    const sameBadge=async locator=>{await locator.first().waitFor();assert.deepEqual(await appearance(locator.first()),badgeStyle);};
    assert.equal(await page.locator('.dashhead__venue svg').count(),2);
    const venue=await page.locator('.dashhead__venue').innerText();assert(!venue.includes(' · '));assert(venue.includes('中国·天津'));
    await page.locator('.search__input').fill('安全');await page.locator('.dash__resultinfo .meta-bit').waitFor();
    assert(!(await page.locator('.dash__resultinfo').innerText()).includes('·'));await shot('home-filter');
    await page.locator('.confsw__btn').click();await page.locator('.confsw__itemmeta').first().waitFor();
    assert(!(await page.locator('.confsw__pop').innerText()).includes('·'));await shot('conference-picker');await page.keyboard.press('Escape');
    await page.locator('.nav__search').click();await page.locator('.cmdk__input').fill('R1');
    await sameBadge(page.locator('.cmdk .code-tag'));assert(!(await page.locator('.cmdk__optsub').first().innerText()).includes('·'));await shot('search');await page.keyboard.press('Escape');
    await goto('/chinasoft2026/forum/R1','.fd__meta .code-tag');await sameBadge(page.locator('.fd__meta .code-tag'));await shot('forum');
    await page.locator('.simblock__toggle').first().click();await sameBadge(page.locator('.simrow .code-tag'));await page.locator('.simrow').first().scrollIntoViewIfNeeded();await shot('similar');
    await page.getByRole('button',{name:'论坛海报',exact:true}).click();await page.locator('.postermodal canvas').waitFor();
    await shot('poster');
    const posterText=await page.evaluate(()=>window.__posterText);
    assert(posterText.some(t=>/^报告 \d+$/.test(t)));assert(!posterText.some(t=>/^报告 ·/.test(t)));
    await page.keyboard.press('Escape');
    await goto('/chinasoft2026/schedule?v=mine-day#2026-11-07','.talkrow--agenda');
    await sameBadge(page.locator('.talkrow--agenda .code-tag'));
    assert((await page.locator('.talkrow--agenda .forum-identity').first().innerText()).startsWith('R1'));
    assert.equal(await page.locator('.heat-value').count(),0);await shot('myday');
    await goto('/chinasoft2026/plan','.planform__input');await page.locator('.planform__input').fill('软件安全');await page.locator('.planform__go').click();
    await sameBadge(page.locator('.planpick .code-tag'));assert(await page.locator('.planpick').first().evaluate(el=>el.querySelector('.planpick__title').getBoundingClientRect().bottom<=el.querySelector('.planpick__meta').getBoundingClientRect().top),'planner metadata follows the report heading');await page.locator('.planpick').first().scrollIntoViewIfNeeded();await shot('planner');
    await goto('/chinasoft2026/topics','.tmap__node');await page.locator('.tmap__node').first().click();
    await sameBadge(page.locator('.tmaptalk .code-tag'));await page.locator('.tmaptalk').first().scrollIntoViewIfNeeded();await shot('topics');
    await goto('/ccfchip2026/organizations','.sponsorcard');await sameBadge(page.locator('.sponsorcard .code-tag'));
    assert((await page.locator('.sponsorcard__forum').first().innerText()).startsWith(sponsor.code));await page.locator('.sponsorcard').first().scrollIntoViewIfNeeded();await shot('organizations');
    await goto('/ccfchip2026','.krail__toggle');assert(!(await page.locator('.krail__toggle').first().innerText()).includes('·'));await page.locator('.krail__toggle').first().scrollIntoViewIfNeeded();await shot('keynotes');
    await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+08:00'));
    await goto('/chinasoft2026/now','.nowclock__date');await sameBadge(page.locator('.nowcard .code-tag'));
    assert.equal(await page.locator('.nowclock__date svg').count(),1);assert(!(await page.locator('.nowclock__date').innerText()).includes('·'));await shot('now');
    if(name==='desktop'){
      const result=await page.evaluate(async()=>{
        const [{translate},{toMarkdown},{drawPoster}]=await Promise.all([import('/src/lib/i18n-store.ts'),import('/src/lib/export.ts'),import('/src/lib/poster.ts')]);
        const raw='原始·标题';const canvas=document.createElement('canvas');window.__posterText=[];
        drawPoster(canvas,{confName:raw,confDate:'2026-11-06',title:raw,code:'R1',accent:'#0070f3',metaLines:[],qrUrl:'https://example.com',talksLabel:translate('zh','poster.talksLabel',{n:1}),talks:[{index:1,title:raw,speakers:[{name:'甲'},{name:'乙'}]}]},1);
        return {markdown:toMarkdown([],{conference:{name:{zh:raw}}}),text:window.__posterText,notification:translate('zh','reminders.notifBody',{min:5,session:raw})};
      });
      assert(result.markdown.startsWith('# 我的日程——原始·标题'));assert(result.text.includes('原始·标题'));assert(!result.text.some(t=>/^\s*·\s*$/.test(t)), 'multi-speaker posters use spacing without altering source punctuation');
      assert.equal(result.notification,'5 分钟后开始：原始·标题');
    }
    assert.deepEqual(errors,[]);await context.close();console.log('PASS '+name+': consistent source identifiers, metadata icons/order, approved separators, search, posters and original source text');
  }
} finally {await browser?.close();server.kill('SIGTERM');}
