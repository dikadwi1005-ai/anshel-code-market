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
   await page.goto(base,{waitUntil:'load',timeout:30000});
   assert.equal(await page.locator('.product').count(),6,label+': catalog count');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no overflow on catalog');
   assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.preview-image')].every(x=>x.complete&&x.naturalWidth>0)),label+': previews load');
   await page.locator('.product .p-title a').first().click();
   await page.waitForURL('**/produk.html?id=1');
   assert.equal(await page.locator('h1').innerText(),'Company Profile Starter');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no detail overflow');
   await page.locator('.payment-preview-link a').click();
   await page.waitForURL('**/checkout.html?id=1');
   assert.equal(await page.locator('h1').innerText(),'Transfer bank Mandiri',label+': Mandiri-only checkout heading');
   assert.equal(await page.locator('.bank-choice strong').innerText(),'Bank Mandiri',label+': bank selected');
   assert.equal(await page.locator('#accountNumber').innerText(),'Belum dikonfigurasi',label+': no invented account number');
   assert.equal(await page.locator('#accountHolder').innerText(),'Belum diverifikasi',label+': no invented account holder');
   assert.equal(await page.locator('#orderState').innerText(),'Belum ada pesanan',label+': no invented order');
   assert.ok(await page.locator('#createOrder').isDisabled(),label+': live orders blocked');
   assert.equal(await page.locator('form').count(),0,label+': no active payment form');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no checkout overflow');
   assert.ok(await page.locator('.product-row img').evaluate(el=>el.naturalWidth>0),label+': order preview loads');
   assert.ok(await page.locator('.product-row img').evaluate(el=>el.getBoundingClientRect().height<=100),label+': order thumbnail stays compact');
   assert.equal(await page.locator('.price-block strong').count(),1,label+': one displayed concept price');
   assert.equal(await page.locator('.total-line.final strong').innerText(),'Belum ditetapkan',label+': no misleading payable total');
   assert.ok((await page.locator('.order-description').innerText()).length>10,label+': product description in summary');
   await page.goto(base+'/produk.html?id=1',{waitUntil:'load'});
   await page.locator('#favorite').click();
   await page.goto(base+'/tersimpan.html',{waitUntil:'load'});
   assert.equal(await page.locator('.saved-card').count(),1,label+': favorite persists');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': no saved-page overflow');
   await page.locator('.saved-card [data-remove]').first().click();
   assert.equal(await page.locator('.saved-empty h2').innerText(),'Belum ada produk tersimpan.');
   await page.goto(base,{waitUntil:'load'});
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
 await p.goto(base+'/#produk-6',{waitUntil:'load'});
 await p.waitForURL('**/produk.html?id=6');
 assert.equal(await p.locator('h1').innerText(),'Creative Portfolio');
 await p.goto(base+'/checkout.html?id=999',{waitUntil:'load'});
 assert.equal(await p.locator('.missing h2').innerText(),'Produk tidak ditemukan.');
 await p.goto(base+'/produk.html?id=999',{waitUntil:'load'});
 assert.equal(await p.locator('h1').innerText(),'Produk tidak ditemukan.');
 await p.goto(base+'/?kategori=Dashboard',{waitUntil:'load'});
 assert.equal(await p.locator('.product').count(),2);
 await p.goto(base+'/tersimpan.html',{waitUntil:'load'});
 assert.equal(await p.locator('.saved-empty h2').innerText(),'Belum ada produk tersimpan.');
 // Recently viewed products remain local to this browser and can be cleared.
 await p.goto(base+'/produk.html?id=2',{waitUntil:'load'});
 await p.goto(base+'/',{waitUntil:'load'});
 assert.equal(await p.locator('#recentSection').evaluate(el=>el.hidden),false);
 assert.equal(await p.locator('.recent-item strong').first().innerText(),'Business Dashboard UI');
 await p.locator('#clearRecent').click();
 assert.equal(await p.locator('#recentSection').evaluate(el=>el.hidden),true);
 // Shared filter links hydrate the controls and can be reset.
 await p.goto(base+'/?q=booking&kategori=Website&urutkan=low',{waitUntil:'load'});
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
 await p.goto(base+'/',{waitUntil:'load'});
 await p.keyboard.press('/');
 assert.ok(await p.locator('#search').evaluate(el=>el===document.activeElement));
 // Admin and published-content pages must fail closed when unconfigured.
 await p.goto(base+'/admin.html',{waitUntil:'domcontentloaded'});
 await p.locator('#busyScreen').waitFor({state:'hidden',timeout:15000});
 const adminSetup=await p.locator('#setupScreen').isVisible();
 const adminLogin=await p.locator('#loginScreen').isVisible();
 assert.ok(adminSetup||adminLogin,'admin requires either setup or login');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'admin no horizontal overflow');
 if(adminSetup)assert.ok(await p.locator('#setupScreen').innerText().then(s=>s.includes('Database marketplace belum terhubung.')));
 await p.goto(base+'/rilis.html?slug=does-not-exist',{waitUntil:'domcontentloaded'});
 assert.ok(await p.locator('#releaseApp h1').isVisible());
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'release page no overflow');
 await browser.close();
 console.log('PASS: '+total+' viewport flows + Mandiri checkout, admin setup, published product safety and history');
})().catch(err=>{console.error(err);process.exitCode=1});
