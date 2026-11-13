import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const path=new URL('../evalua/kin2002/panel/importar-excel-simulacion.js',import.meta.url);
const js=readFileSync(path,'utf8');
const html=readFileSync(new URL('../evalua/kin2002/panel/index.html',import.meta.url),'utf8');

test('importador KIN2002 presenta dos Excel con confirmación y aislación por estación',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',path.pathname]));
 for(const id of ['excelEvaluator1','excelEvaluator2','excelImportReview','excelImportApply','excelImportStatus','excelImportPreview'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/importar-excel-simulacion\.js/);
 assert.match(js,/workbook\['Evaluación'\]/);
 assert.match(js,/actualStation!==String\(station\)/);
 assert.match(js,/if\(count===5\)/);
 assert.match(js,/if\(!validLevels\(levels\)\)/);
 assert.match(js,/Conflicto: evaluación guardada/);
 assert.match(js,/window\.KineCheckScores\.saveSeat/);
 assert.match(js,/if\(confirmed===true\)/);
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem/);
});

test('Excel: filas vacías, parcial y completa se distinguen sin publicar notas parciales',async()=>{
 const call={saves:0};
 const elements={};
 for(const id of ['excelEvaluator1','excelEvaluator2','excelImportReview','excelImportApply','excelImportStatus','excelImportPreview','excelImportIssues']){
  elements[id]={disabled:false,dataset:{},style:{},textContent:'',innerHTML:'',files:[],
   addEventListener(_type,cb){this.click=cb}};
 }
 elements.excelEvaluator1.files=[{name:'evaluador1.xlsx',size:100}];
 elements.excelEvaluator2.files=[{name:'evaluador2.xlsx',size:100}];
 const make=(station,name,levels)=>[station==='1'?'P01':'P02','S1','Miércoles','11:35',station,'Caso',station==='1'?'P01-1':'P02-1','',name,'Pendiente',...levels];
 const blank=Array(8).fill(null),full=[4,3,2,4,3];
 const header=['Pareja','Sección','','','','','','','Estudiante','','H1','H2','H3','H4','H5'];
 const rows=[[],[],[],[],[],header,make('1','Paciente Ficticio Uno',[3,3,null,null,null]),make('2','Paciente Ficticio Dos',[null,null,null,null,null])];
 const rows2=[[],[],[],[],[],header,make('1','Paciente Ficticio Uno',[null,null,null,null,null]),make('2','Paciente Ficticio Dos',full)];
 const groups=[{section:'S1',id:'P01',station:'1',students:[{name:'Paciente Ficticio Uno',levels:[...blank],note:''}]} ,
 {section:'S1',id:'P02',station:'2',students:[{name:'Paciente Ficticio Dos',levels:[...blank],note:''}]}];
 // Simulate master read only: use synthetic sheet rows instead of user files.
 const adapted=js.replace(/async function openXlsx\(file\) \{[\s\S]*?\n\}/,'async function openXlsx(file){return {"Evaluación":file.name==="evaluador1.xlsx"?testRows1:testRows2}}');
 const state={document:{getElementById:id=>elements[id]},window:{KineCheckScores:{ready:true,async saveSeat(){call.saves++;return true},async refresh(){}}},groups,save(){},renderAll(){},confirm:()=>true,console,TextDecoder,DOMParser:class{},Map,Set,Array,Number,String,JSON,Promise,Error,Date,Blob,Response,DecompressionStream};
 state.testRows1=rows;state.testRows2=rows2;
 vm.runInNewContext(adapted,state);
 elements.excelImportReview.click();
 for(let i=0;i<100&&!elements.excelImportStatus.textContent;i++)await new Promise(r=>setTimeout(r,2));
 assert.match(elements.excelImportStatus.textContent,/2 registros listos para importar/);
 assert.match(elements.excelImportStatus.textContent,/1 parciales/);
 assert.equal(elements.excelImportApply.disabled,false);
 elements.excelImportApply.click();
 for(let i=0;i<100&&call.saves!==2;i++)await new Promise(r=>setTimeout(r,2));
 assert.equal(call.saves,2);
 assert.equal(groups[1].students[0].levels[0],4);
 assert.equal(groups[0].students[0].levels[0],3);
});
