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
 assert.match(js,/workbook\['Evaluación individual'\]/);
 assert.match(js,/actualStation!==String\(station\)/);
 assert.match(js,/if\(filled\.length!==8\)/);
 assert.match(js,/if\(!validLevels\(levels\)\)/);
 assert.match(js,/Conflicto: puntajes existentes/);
 assert.match(js,/window\.KineCheckScores\.saveSeat/);
 assert.match(js,/if\(confirmed!==true\)/);
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
 const make=(station,name,levels)=>['P01','S1','Miércoles','11:35',station,'Caso','',station==='1'?'P01-1':'P01-2','Turno',name,'Pendiente',...levels];
 const blank=Array(8).fill(null),full=[4,3,2,4,3,2,4,3];
 const rows=[[],[],[],[],['Pareja','Sección','','','','','','','','Estudiante','', 'NIVEL 1'],
  make('1','Paciente Ficticio Uno',[3,3,...Array(6).fill(null)]),
  make('2','Paciente Ficticio Dos',blank)];
 const rows2=[[],[],[],[],['Pareja','Sección','','','','','','','','Estudiante','', 'NIVEL 1'],
  make('1','Paciente Ficticio Uno',blank),
  make('2','Paciente Ficticio Dos',full)];
 const groups=[{section:'S1',id:'P01',station:'1',students:[{name:'Paciente Ficticio Uno',levels:[...blank],note:''}]} ,
 {section:'S1',id:'P01',station:'2',students:[{name:'Paciente Ficticio Dos',levels:[...blank],note:''}]}];
 // Simulate master read only: use synthetic sheet rows instead of user files.
 const adapted=js.replace(/async function openXlsx\(file\) \{[\s\S]*?\n\}/,'async function openXlsx(file){return {"Evaluación individual":file.name==="evaluador1.xlsx"?testRows1:testRows2}}');
 const state={document:{getElementById:id=>elements[id]},window:{KineCheckScores:{ready:true,async saveSeat(){call.saves++;return true},async refresh(){}}},groups,save(){},renderAll(){},confirm:()=>true,console,TextDecoder,DOMParser:class{},Map,Set,Array,Number,String,JSON,Promise,Error,Date,Blob,Response,DecompressionStream};
 state.testRows1=rows;state.testRows2=rows2;
 vm.runInNewContext(adapted,state);
 await elements.excelImportReview.click();
 assert.match(elements.excelImportStatus.textContent,/1 listas para importar/);
 assert.match(elements.excelImportIssues.textContent,/pendiente, no se asigna nota/);
 assert.equal(elements.excelImportApply.disabled,false);
 await elements.excelImportApply.click();
 assert.equal(call.saves,1);
 assert.equal(groups[1].students[0].levels[0],4);
 assert.equal(groups[0].students[0].levels[0],null);
});
