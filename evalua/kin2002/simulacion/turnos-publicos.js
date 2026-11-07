/* Turnos autorizados del planificador KIN2002. Solo parejas y horarios; sin nombres ni notas de estudiantes. */
const schedule = [
["S1","Miércoles","11:35","12"],["S1","Miércoles","11:50","12"],["S1","Miércoles","12:05","12"],["S1","Miércoles","12:20","12"],
["S1","Viernes","10:05","12"],["S1","Viernes","10:20","12"],["S1","Viernes","10:35","12"],["S1","Viernes","10:50","12"],
["S1","Viernes","11:05","12"],["S1","Viernes","11:20","12"],["S1","Viernes","11:35","1"],
["S2","Martes","11:35","12"],["S2","Martes","11:50","12"],["S2","Martes","12:05","12"],["S2","Martes","12:20","12"],["S2","Martes","12:35","12"],
["S2","Jueves","14:35","12"],["S2","Jueves","14:50","12"],["S2","Jueves","15:05","12"],
];
let num = 0;
const slots = schedule.flatMap(([section,day,time,stations])=>stations.split("").map(station=>({
 section,day,time,station,pair:"P"+String(++num).padStart(2,"0"),
 name:""
})));
if(slots.length!==37)throw Error("Planificador incompleto: se esperan 37 parejas");
const grouped = [...new Set(slots.map(x=>x.section+"-"+x.station))];
for(const key of grouped){
 const [section,station]=key.split("-");
 const rows = slots.filter(x=>x.section===section&&x.station===station).flatMap(x=>[x,x]);
 window.KC_SIM_importRoster(rows,station);
}
const message=document.getElementById("masterstatus");
if(message)message.textContent="37 parejas precargadas (S1: 21; S2: 16), con horarios y estaciones. Para visualizar los nombres, adjunta el Excel maestro de cada docente; no se publican datos personales en el sitio.";
