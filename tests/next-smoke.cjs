/* Next.js app router smoke tests. Run after Next server is ready on BASE_URL.
   Playwright intentionally checks the preview's rendered dimensions. */
const assert=require("node:assert/strict");const{chromium}=require("playwright");
const base=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
(async()=>{const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});let tested=0;
for(const [label,width,height] of [["desktop",1440,900],["tablet",768,1024],["mobile",390,844],["small",320,640]]){
 const page=await browser.newPage({viewport:{width,height}});const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const home=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});assert.equal(home.status(),200);
 // Regression guard: the storefront is catalog-first, not a generic marketing hero.
 await page.locator(".catalogPageHeader h1").waitFor({state:"visible",timeout:12000});
 assert.equal(await page.locator(".catalogPageHeader h1").innerText(),"Source Code & Template",label+" catalog-first heading");
 assert.equal(await page.locator(".hero,.heroMetrics,.metricPill").count(),0,label+" no decorative marketing hero");
 assert.equal(await page.locator('.siteHeader a[href="/admin"]').count(),0,label+" admin route hidden from public navigation");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+" catalog overflow");
 await page.goto(base+"/produk.html?id=1",{waitUntil:"domcontentloaded"});
 await page.locator(".detailDescription h1").waitFor({state:"visible",timeout:14000});
 assert.equal(await page.locator(".detailDescription h1").innerText(),"Company Profile Starter");
 const preview=await page.locator(".previewFrameLarge .previewImage").evaluate(img=>{const frame=img.parentElement.getBoundingClientRect(),rect=img.getBoundingClientRect(),css=getComputedStyle(img);return{src:img.getAttribute("src"),natural:img.naturalWidth,ratio:frame.width/frame.height,fit:css.objectFit,within:rect.width<=frame.width+1&&rect.height<=frame.height+1}});
 assert.ok(preview.natural>0,label+" preview loads");assert.equal(preview.fit,"contain",label+" image object-fit");assert.ok(preview.within,label+" not stretched");assert.ok(preview.ratio>1.5&&preview.ratio<1.7,label+" 16:10 frame");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+" detail overflow");
 await page.goto(base+"/checkout.html?id=1",{waitUntil:"domcontentloaded"});
 await page.locator(".orderTotal").waitFor({state:"visible"});
 assert.ok((await page.locator(".orderTotal").innerText()).includes("Belum ditetapkan"));
 assert.equal(await page.locator("button:has-text('Pembelian belum tersedia')").isDisabled(),true);
 const thumbnail=await page.locator(".orderPreview .previewFrame").evaluate(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height}});
 assert.ok(thumbnail.w<=113&&thumbnail.h<=81,label+" compact checkout thumbnail");
 await page.goto(base+"/admin.html",{waitUntil:"domcontentloaded"});
 await page.locator(".adminSignIn").waitFor({state:"visible",timeout:15000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+" admin overflow");
 await page.goto(base+"/tersimpan",{waitUntil:"domcontentloaded"});
 await page.locator(".pageTitle").waitFor({state:"visible"});
 await page.goto(base+"/bandingkan?ids=concept-1,concept-2",{waitUntil:"domcontentloaded"});
 await page.locator(".compareTable").waitFor({state:"visible",timeout:15000});
 assert.deepEqual(errors,[],label+" JS errors");tested++;await page.close();
}
await browser.close();console.log("PASS: Next.js App Router, preview images, redirects, checkout lock and responsive layouts ("+tested+" viewports)");
})().catch(e=>{console.error(e);process.exit(1)});
