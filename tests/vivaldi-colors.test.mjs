import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sandbox={};sandbox.globalThis=sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root,"vivaldi-colors.js"),"utf8"),sandbox);
const api=sandbox.__chatgptVivaldiColors;
const popup=fs.readFileSync(path.join(root,"popup.js"),"utf8");
const html=fs.readFileSync(path.join(root,"popup.html"),"utf8");
const packager=fs.readFileSync(path.join(root,"scripts/build-release.sh"),"utf8");
test("custom Vivaldi CSS has all 8 non-idle states, both src and srcset selectors",()=>{
 const css=api.generate(null,{version:"0.4.8"});
 for(const key of api.STATES){
  assert.ok(css.includes("/assets/tab-status/"+key+".svg"),key);
  assert.ok(css.includes(api.DEFAULT_COLORS[key]),key);
 }
 assert.match(css,/srcset\*=/);
 assert.match(css,/\.tab-header/);
 assert.doesNotMatch(css,/\/assets\/tab-status\/idle\.svg/);
});
test("malformed palette input is safely normalized without CSS injection",()=>{
 const css=api.generate({working:"red; } body { display:none",error:"#123ABC"},{
  version:"0.4.8",testOutline:false
 });
 assert.ok(css.includes(api.DEFAULT_COLORS.working));
 assert.ok(css.includes("#123ABC"));
 assert.doesNotMatch(css,/display:none|outline: 2px solid #00FFFF/);
});
test("explicit CSS-load diagnostic is opt-in",()=>{
 const plain=api.generate(null,{version:"0.4.8"});
 const probe=api.generate(null,{version:"0.4.8",testOutline:true});
 assert.doesNotMatch(plain,/outline: 2px solid #00FFFF/);
 assert.match(probe,/outline: 2px solid #00FFFF/);
});
test("popup exposes palette, export controls, and explains restart limitation",()=>{
 for(const id of ["vivaldiColorRows","vivaldiExportCss","vivaldiResetColors","vivaldiCssMessage","vivaldiTestOutline"])
  assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/src="vivaldi-colors\.js"/);
 assert.match(popup,/vivaldiColorsApi\.generate/);
 assert.match(popup,/URL\.createObjectURL/);
 assert.match(popup,/chrome\.storage\.local\.set\(\{vivaldiTabColors:/);
 assert.match(html,/Browser neu starten/);
 assert.match(packager,/vivaldi-colors\.js/);
});
