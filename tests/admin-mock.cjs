/* Synthetic Supabase API tests: verifies admin UI wiring, NOT real RLS/DB.
   Run with local static server on BASE_URL and Playwright installed in tests/. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const origin=(process.env.BASE_URL||"http://127.0.0.1:4173").replace(/\/$/,"");
const fakeUrl="https://market-ci.supabase.co";
const memberId="11111111-1111-4111-8111-111111111111";
const newId="22222222-2222-4222-8222-222222222222";
const example=()=>({
 id:memberId,slug:"company-profile-starter",name:"Company Profile Starter",
 category:"Website",stack:"HTML, CSS",description:"Draft test",
 price_idr:399000,status:"draft",features:["Responsif"],
 preview_path:"/previews/website.svg",license_summary:"",created_at:new Date().toISOString()
});
function apiMock(products,assets,{admin=true}={}){
 return async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
  let body,status=200;
  if(path==="/auth/v1/token"){
    body={access_token:"test-access",refresh_token:"test-refresh",expires_in:3600};
  }else if(path==="/auth/v1/logout"){
    body={};
  }else if(path==="/rest/v1/market_admins"){
    body=admin?[{user_id:memberId}]:[];
  }else if(path==="/rest/v1/market_products"){
    if(method==="POST"){
      const item={id:newId,created_at:new Date().toISOString(),...req.postDataJSON()};
      products.unshift(item);body=[item];
    }else if(method==="PATCH"){
      const id=url.searchParams.get("id")?.replace(/^eq\./,"");
      const changes=req.postDataJSON();
      const item=products.find(p=>p.id===id);
      if(item)Object.assign(item,changes);
      body=item?[item]:[];
    }else{
      body=url.searchParams.get("status")==="eq.published"?products.filter(p=>p.status==="published"):products;
    }
  }else if(path==="/rest/v1/market_assets"){
    if(method==="POST"){
      const item=req.postDataJSON();
      assets.splice(0,assets.length,...assets.filter(x=>x.product_id!==item.product_id),item);
      body=[item];
    }else body=assets;
  }else if(path==="/rest/v1/market_orders")body=[];
  else if(path.startsWith("/storage/v1/object/anshel-source-packages/"))body={Key:path};
  else {status=404;body={message:"Unknown mock route"}}
  return route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
 };
}
async function mockPage(browser,width,height,{admin=true}={}){
 const page=await browser.newPage({viewport:{width,height}});
 const products=[example()],assets=[];
 await page.route("**/api/market-config",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({configured:true,url:fakeUrl,publishableKey:"sb_publishable_testkey"})}));
 await page.route(fakeUrl+"/**",apiMock(products,assets,{admin}));
 return {page,products,assets};
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 let tested=0;
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,640]]){
  const {page,products,assets}=await mockPage(browser,width,height);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(origin+"/admin.html",{waitUntil:"domcontentloaded"});
  await page.locator("#loginScreen").waitFor({state:"visible"});
  await page.locator("#email").fill("admin@example.test");
  await page.locator("#password").fill("test-only");
  await page.locator("#loginButton").click();
  await page.locator("#dashboard").waitFor({state:"visible"});
  assert.equal(await page.locator("#totalProducts").innerText(),"1");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator("#newProduct").click();
  await page.locator('[name="name"]').fill("Example Admin Product");
  await page.locator('[name="slug"]').fill("example-admin-product");
  await page.locator('[name="price_idr"]').fill("250000");
  await page.locator("#saveProduct").click();
  await page.locator("#productDialog").waitFor({state:"hidden"});
  assert.equal(await page.locator("#totalProducts").innerText(),"2");
  await page.locator('[data-edit="'+newId+'"]').click();
  await page.locator("#zipFile").setInputFiles({name:"test.zip",mimeType:"application/zip",buffer:Buffer.from("PK\x03\x04synthetic")});
  await page.locator("#uploadZip").click();
  await page.waitForFunction(()=>document.querySelector("#zipStatus").textContent.includes("test.zip"));
  assert.equal(assets.length,1);
  await page.locator('[name="license_summary"]').fill("Lisensi contoh. Bukan produk siap dijual.");
  await page.locator('[name="status"]').selectOption("published");
  await page.locator("#saveProduct").click();
  await page.locator("#productDialog").waitFor({state:"hidden"});
  assert.equal(await page.locator("#publishedProducts").innerText(),"1");
  assert.equal(products.find(p=>p.id===newId).status,"published");
  await page.locator('[data-section="orders"]').click();
  assert.ok((await page.locator("#orderRows").innerText()).includes("Belum ada pesanan"));
  await page.locator("#logoutButton").click();
  await page.locator("#loginScreen").waitFor({state:"visible"});
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/token|auth/i.test(k))),false);
  assert.equal(errors.length,0,errors.join("; "));
  tested+=1;await page.close();
 }
 // A signed-in user without an admin membership can never see the dashboard.
 const {page}=await mockPage(browser,390,844,{admin:false});
 await page.goto(origin+"/admin.html",{waitUntil:"domcontentloaded"});
 await page.locator("#loginScreen").waitFor({state:"visible"});
 await page.locator("#email").fill("non-admin@example.test");
 await page.locator("#password").fill("test-only");
 await page.locator("#loginButton").click();
 await page.waitForFunction(()=>document.querySelector("#loginButton").disabled===false);
 assert.equal(await page.locator("#dashboard").isVisible(),false);
 await page.close();
 await browser.close();
 console.log("PASS: simulated Supabase Auth/RLS gates, CRUD, ZIP upload, publish and mobile layouts ("+tested+" viewports)");
})().catch(err=>{console.error(err);process.exitCode=1});
