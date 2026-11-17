/* Browser regression checks never write to Firestore or create catalog products. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,640]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // An unavailable configuration must never expose fixtures, even via old URLs.
  await page.route('**/api/market-config',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  for(const path of ['/','/produk.html?id=1','/rilis?slug=company-profile-starter','/checkout.html?id=1','/tersimpan','/bandingkan?ids=concept-1,concept-2']){
   const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);
   await page.locator('.loading').waitFor({state:'hidden',timeout:20000});
   const text=await page.locator('body').innerText();
   assert.doesNotMatch(text,/Lihat 6 konsep|Impor 6 draft|Company Profile Starter|Business Dashboard UI|katalog contoh/i);
   assert.equal(await page.locator('[data-testid="product-card"]').count(),0);
   assert.equal(await page.locator('.siteHeader a[href="/admin"],.siteFooter a[href="/admin"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${path} overflow at ${width}`);
   assert.match(text,/belum dapat dimuat|belum tersedia|tidak dapat dimuat/i,path+' reports failure');
  }
  await page.goto(base+'/admin.html');await page.locator('.adminSignIn').waitFor();
  assert.equal(await page.locator('button:has-text("Tambah produk"),button:has-text("Impor")').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'admin overflow');
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('PASS: four viewports; failure states; no fixtures; private admin; legacy URLs; no overflow or JS errors');
})().catch(error=>{console.error(error);process.exit(1)});
