/* Browser contract tests with a FAKE Firebase adapter.
 * These verify UI wiring, NOT real Firebase credentials or Firestore Rules.
 * Run: BASE_URL=http://127.0.0.1:4173 node tests/admin-mock.cjs
 */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = (process.env.BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const firebaseConfig = {
  provider: "firebase", configured: true,
  firebase: {
    apiKey: "mock-api-key", authDomain: "market-test.firebaseapp.com",
    projectId: "market-test", appId: "1:123:web:abcdef"
  },
  storageEnabled: false, paymentsEnabled: false, ordersEnabled: false
};
const adapter = String.raw`
// Simulate the exported Firebase adapter contract, in-memory only.
export async function openFirebase(config,{administrator=false}={}) {
  const now=new Date().toISOString();
  const products=[{
    id:"p1",slug:"company-profile-starter",name:"Company Profile Starter",
    category:"Website",stack:"HTML, CSS",description:"Contoh draft",
    price_idr:399000,status:"draft",features:["Responsif"],
    preview_path:"/previews/website.svg",license_summary:"",
    created_at:now
  }];
  const assets=[],orders=[];
  let loggedIn=null;
  const client={
    listPublicCatalog:async()=>[{
      id:"published-1",slug:"example-release",name:"Example Release",
      category:"Website",stack:"HTML",description:"Produk terbit simulasi",
      price_idr:250000,status:"preview",features:["Fitur A"],
      preview_path:"/previews/website.svg",license_summary:"Lisensi contoh",
      created_at:now
    }]
  };
  if(!administrator)return client;
  return {
    ...client,
    signIn:async(email)=>{loggedIn={uid:email.startsWith("nonadmin")?"other":"admin",email};return loggedIn;},
    signOut:async()=>{loggedIn=null;},
    isAdmin:async(uid)=>uid==="admin",
    listProducts:async()=>products.map(p=>({...p})),
    listAssets:async()=>assets,
    listOrders:async()=>orders,
    saveProduct:async(product,id=null)=>{
      if(id){
        const p=products.find(p=>p.id===id);
        if(!p)throw Error("Unknown product");
        Object.assign(p,product);
        return id;
      }
      const newId="p"+(products.length+1);
      products.unshift({...product,id:newId,created_at:new Date().toISOString()});
      return newId;
    },
    setCatalogVisibility:async(id,visible)=>{
      const p=products.find(p=>p.id===id);
      if(p)p.status=visible?"preview":"draft";
    },
    archiveProduct:async(id)=>{
      const p=products.find(p=>p.id===id);if(p)p.status="archived";
    },
    importDrafts:async(items)=>{
      const existing=new Set(products.map(p=>p.slug));
      let added=0;
      for(const item of items){
        if(existing.has(item.slug))continue;
        products.push({...item,id:"p"+(products.length+1)});
        existing.add(item.slug);added++;
      }
      return added;
    }
  };
}
`;
async function installMocks(page) {
  await page.route("**/api/market-config", route =>
    route.fulfill({status:200,contentType:"application/json",
      body:JSON.stringify(firebaseConfig)}));
  await page.route("**/firebase-client.js", route =>
    route.fulfill({status:200,contentType:"text/javascript",body:adapter}));
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
  let tested=0;
  for(const [label,width,height] of [
    ["desktop",1440,900],["tablet",768,1024],
    ["mobile",390,844],["small",320,640]
  ]) {
    const page=await browser.newPage({viewport:{width,height}});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("dialog",async dialog=>dialog.accept());
    await installMocks(page);
    await page.goto(base+"/admin.html",{waitUntil:"domcontentloaded"});
    await page.locator("#loginScreen").waitFor({state:"visible",timeout:18000});
    await page.locator("#email").fill("admin@example.test");
    await page.locator("#password").fill("TestPassword!");
    await page.locator("#loginButton").click();
    await page.locator("#dashboard").waitFor({state:"visible",timeout:15000});
    assert.equal(await page.locator("#totalProducts").innerText(),"1",label+": initial draft");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),
      label+": no admin overflow");
    await page.locator("#importDrafts").click();
    await page.waitForFunction(()=>document.querySelector("#totalProducts").textContent==="6");
    assert.equal(await page.locator("#draftProducts").innerText(),"6");
    await page.locator("#newProduct").click();
    await page.locator("#productDialog").waitFor({state:"visible"});
    assert.equal(await page.locator('[name="status"] option[value="published"]').isDisabled(),true);
    assert.equal(await page.locator('[name="status"] option[value="preview"]').isDisabled(),false);
    await page.locator('[name="name"]').fill("Market Demo Product");
    await page.locator('[name="slug"]').fill("market-demo-product");
    await page.locator('[name="price_idr"]').fill("250000");
    await page.locator("#saveProduct").click();
    await page.locator("#productDialog").waitFor({state:"hidden"});
    await page.waitForFunction(()=>document.querySelector("#totalProducts").textContent==="7");
    const row=page.locator("#productRows tr").filter({hasText:"Market Demo Product"});
    await row.locator("[data-visibility]").click();
    await page.waitForFunction(()=>document.querySelector("#publishedProducts").textContent==="1");
    assert.ok((await row.innerText()).includes("Pratinjau publik"));
    await row.locator("[data-visibility]").click();
    await page.waitForFunction(()=>document.querySelector("#publishedProducts").textContent==="0");
    await row.locator("[data-edit]").click();
    await page.locator("#productDialog").waitFor({state:"visible"});
    assert.equal(await page.locator("#zipUploader input[type=file]").count(),0);
    assert.ok(await page.locator(".storage-warning").innerText().then(s=>s.includes("Blaze")));
    await page.locator('[name="status"]').selectOption("archived");
    await page.locator("#saveProduct").click();
    await page.locator("#productDialog").waitFor({state:"hidden"});
    await page.locator('[data-section="orders"]').click();
    assert.ok((await page.locator("#orderRows").innerText()).includes("Belum ada pesanan"));
    await page.locator("#logoutButton").click();
    await page.locator("#loginScreen").waitFor({state:"visible"});
    assert.equal(await page.evaluate(()=>
      Object.keys(localStorage).some(k=>/firebase:authUser|supabase.auth.token/i.test(k))),false);
    assert.deepEqual(errors,[],label+": errors");
    tested++;
    await page.close();
  }

  // A signed-in user without market_admins membership must be rejected.
  const unauthorized=await browser.newPage({viewport:{width:390,height:844}});
  await installMocks(unauthorized);
  await unauthorized.goto(base+"/admin.html",{waitUntil:"domcontentloaded"});
  await unauthorized.locator("#loginScreen").waitFor({state:"visible"});
  await unauthorized.locator("#email").fill("nonadmin@example.test");
  await unauthorized.locator("#password").fill("TestPassword!");
  await unauthorized.locator("#loginButton").click();
  await unauthorized.waitForFunction(()=>document.querySelector("#loginButton").disabled===false);
  assert.equal(await unauthorized.locator("#dashboard").isVisible(),false);
  await unauthorized.close();

  // Public catalog must contain only published Firestore results.
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await installMocks(page);
  await page.goto(base+"/",{waitUntil:"domcontentloaded"});
  await page.locator("#marketLive").waitFor({state:"visible",timeout:15000});
  assert.equal(await page.locator(".live-card").count(),1);
  assert.equal(await page.locator("#conceptLayout").evaluate(el=>el.hidden),true);
  assert.ok((await page.locator("#count").innerText()).includes("1 dari 1 pratinjau"));
  await page.locator("#search").fill("does-not-match");
  assert.equal(await page.locator(".live-card").count(),0);
  await page.locator("#search").fill("");
  assert.equal(await page.locator(".live-card").count(),1);
  await page.locator("#showDemoCatalog").click();
  assert.equal(await page.locator("#conceptLayout").evaluate(el=>el.hidden),false);
  await page.locator("#showDemoCatalog").click();
  assert.equal(await page.locator("#conceptLayout").evaluate(el=>el.hidden),true);
  await page.locator(".live-card").click();
  await page.waitForURL("**/rilis.html?slug=example-release");
  await page.locator("#releaseApp h1").waitFor({state:"visible"});
  assert.equal(await page.locator("#releaseApp h1").innerText(),"Example Release");
  assert.ok((await page.locator("#releaseApp").innerText()).includes("Belum dapat dibeli"));
  await page.close();

  await browser.close();
  console.log("PASS: Firebase mock admin preview toggle, live storefront search, Auth gate ("+
    tested+" viewports)");
})().catch(e=>{console.error(e);process.exitCode=1});
