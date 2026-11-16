/* Anshel Market regression checks for desktop, tablet and mobile.
   Usage: run static server on port 4173, install playwright in tests/ and chromium.
   Run: BASE_URL=http://127.0.0.1:4173 node tests/smoke.cjs
*/
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let total=0;
 for(const [label,width,height] of [['desktop',1440,900],['laptop',1024,768],['tablet',768,1024],['mobile',390,844],['small-mobile',320,640]]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle',timeout:30000});
   assert.equal(await page.locator('.product').count(),6,label+': catalog count');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no overflow on catalog');
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.preview-image')].every(x=>x.complete&&x.naturalWidth>0)),label+': previews load');
   await page.locator('.product .p-title a').first().click();
   await page.waitForURL('**/produk.html?id=1');
   assert.equal(await page.locator('h1').innerText(),'Company Profile Starter');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no detail overflow');
   await page.locator('.payment-preview-link a').click();
   await page.waitForURL('**/checkout.html?id=1');
   assert.equal(await page.locator('.method input').count(),3,label+': three planned payment options');
   assert.ok(await page.locator('.checkout-disabled').isDisabled(),label+': no live payments');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no checkout overflow');
   assert.ok(await page.locator('.order-product img').evaluate(el=>el.naturalWidth>0),label+': order preview loads');
   await page.locator('input[value="gateway"]').check();
   assert.equal(await page.locator('#methodDetail h3').innerText(),'Alur Virtual Account (rencana)');
   await page.locator('input[value="trakteer"]').check();
   assert.equal(await page.locator('#methodDetail h3').innerText(),'Alur Trakteer Shop (rencana)');
   await page.goto(base+'/produk.html?id=1',{waitUntil:'networkidle'});
   await page.locator('#favorite').click();
   await page.goto(base+'/tersimpan.html',{waitUntil:'networkidle'});
   assert.equal(await page.locator('.saved-card').count(),1,label+': favorite persists');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no saved-page overflow');
   await page.locator('.saved-card [data-remove]').first().click();
   assert.equal(await page.locator('.saved-empty h2').innerText(),'Belum ada produk tersimpan.');
   await page.goto(base,{waitUntil:'networkidle'});
   await page.locator('[data-compare="1"]').check();
   await page.locator('[data-compare="2"]').check();
   await page.locator('#compareToggle').click();
   await page.waitForURL('**/bandingkan.html?ids=*');
   assert.equal(await page.locator('thead th').count(),3,label+': 2 selected + label');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no comparison overflow');
   assert.equal(await page.locator('.compare-table thead th').first().evaluate(x=>getComputedStyle(x).position),'sticky',label+': comparison labels sticky');
   assert.equal(errors.length,0,label+': JavaScript exceptions: '+errors.join('; '));
   total+=1;await page.close();
 }
 const p=await browser.newPage({viewport:{width:375,height:812}});
 await p.goto(base+'/#produk-6',{waitUntil:'networkidle'});
 await p.waitForURL('**/produk.html?id=6');
 assert.equal(await p.locator('h1').innerText(),'Creative Portfolio');
 await p.goto(base+'/produk.html?id=999',{waitUntil:'networkidle'});
 assert.equal(await p.locator('h1').innerText(),'Produk tidak ditemukan.');
 await p.goto(base+'/?kategori=Dashboard',{waitUntil:'networkidle'});
 assert.equal(await p.locator('.product').count(),2);
 await p.goto(base+'/tersimpan.html',{waitUntil:'networkidle'});
 assert.equal(await p.locator('.saved-empty h2').innerText(),'Belum ada produk tersimpan.');
 // Recently viewed products remain local to this browser and can be cleared.
 await p.goto(base+'/produk.html?id=2',{waitUntil:'networkidle'});
 await p.goto(base+'/',{waitUntil:'networkidle'});
 assert.equal(await p.locator('#recentSection').evaluate(el=>el.hidden),false);
 assert.equal(await p.locator('.recent-item strong').first().innerText(),'Business Dashboard UI');
 await p.locator('#clearRecent').click();
 assert.equal(await p.locator('#recentSection').evaluate(el=>el.hidden),true);
 // Shared filter links hydrate the controls and can be reset.
 await p.goto(base+'/?q=booking&kategori=Website&urutkan=low',{waitUntil:'networkidle'});
 assert.equal(await p.locator('.product').count(),1);
 assert.equal(await p.locator('#search').inputValue(),'booking');
 assert.equal(await p.locator('#sort').inputValue(),'low');
 await p.locator('#search').fill('this-does-not-exist-in-the-catalog');
 assert.equal(await p.locator('.result-empty strong').innerText(),'Tidak ada produk yang cocok.');
 await p.locator('[data-reset-list]').click();
 assert.equal(await p.locator('.product').count(),6);
 assert.ok(!new URL(p.url()).searchParams.has('q'));
 // Browser history restores category selection without a page reload.
 await p.locator('#search').fill('dashboard');
 await p.waitForFunction(()=>new URL(location.href).searchParams.get('q')==='dashboard');
 await p.locator('[data-category="Dashboard"]').click();
 assert.equal(await p.locator('[data-category="Dashboard"]').getAttribute('aria-pressed'),'true');
 await p.goBack({waitUntil:'domcontentloaded'});
 assert.equal(await p.locator('[data-category="Dashboard"]').getAttribute('aria-pressed'),'false');
 assert.equal(await p.locator('#search').inputValue(),'dashboard');
 await p.goto(base+'/',{waitUntil:'networkidle'});
 await p.keyboard.press('/');
 assert.ok(await p.locator('#search').evaluate(el=>el===document.activeElement));
 await browser.close();
 console.log('PASS: '+total+' viewport flows + checkout preview, deep links, URL filters and history');
})().catch(err=>{console.error(err);process.exitCode=1});
