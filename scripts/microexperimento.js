(()=>{
'use strict';
const levels=[
 {name:'Primeras señales',difficulty:'Fácil',description:'Aprende a orientarte. Una llave, un interruptor y varios caminos.',map:['#######','#P....#','#.##..#','#..K#.#','##.#..#','#S...E#','#######']},
 {name:'Rutas cruzadas',difficulty:'Media',description:'Dos llaves en extremos distintos. Decide qué camino recorrer primero.',map:['#########','#P..#...#','#.#...#K#','#...##..#','###..#..#','#K..S#S.#','#.##....#','#......E#','#########']},
 {name:'El último desvío',difficulty:'Difícil',description:'Dos llaves, dos interruptores y rutas que se entrecruzan.',map:['###########','#P...#....#','#.##...#K.#','#...#.#...#','##..#...#.#','#K.....#..#','#.#...##..#','#...#S...##','#.##..#...#','#S......E.#','###########']}
];
const board=document.getElementById('board'),status=document.getElementById('status'),counter=document.getElementById('steps'),levelLabel=document.getElementById('level-label'),levelDesc=document.getElementById('level-description'),progress=document.getElementById('level-progress'),next=document.getElementById('next-level'),resetButton=document.getElementById('reset');
if(!board||!status||!counter||!levelLabel||!levelDesc||!progress||!next||!resetButton)return;
let index=0,x=0,y=0,steps=0,won=false,keys=new Set(),switches=new Set(),keyInventory=0,total=0,advanceTimer=null;
const counts=map=>({keys:map.join('').split('K').length-1,switches:map.join('').split('S').length-1});
function cancelAdvance(){if(advanceTimer!==null){clearTimeout(advanceTimer);advanceTimer=null}}
function startLevel(n){cancelAdvance();index=n;steps=0;won=false;keys=new Set();switches=new Set();keyInventory=0;const level=levels[index],map=level.map;
for(let row=0;row<map.length;row++)for(let col=0;col<map[row].length;col++)if(map[row][col]==='P'){x=col;y=row}
board.style.gridTemplateColumns='repeat('+map[0].length+',minmax(0,1fr))';
levelLabel.textContent='Nivel '+(index+1)+' de '+levels.length+' · '+level.name+' · '+level.difficulty;
levelDesc.textContent=level.description;
progress.textContent='Nivel '+(index+1)+' / '+levels.length;
document.querySelectorAll('[data-level]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.level)===index)));
next.hidden=true;status.textContent='Recoge una llave por interruptor: cada activación consume una llave. Después, alcanza la salida.';
render()}
function complete(){won=true;total+=steps;cancelAdvance();if(index<levels.length-1){let seconds=5;next.textContent='Siguiente nivel →';next.hidden=false;const countdown=()=>{status.textContent='¡Nivel '+(index+1)+' superado en '+steps+' movimientos! Siguiente nivel en '+seconds+' segundos…';if(seconds===0){startLevel(index+1);return}seconds--;advanceTimer=setTimeout(countdown,1000)};countdown()}else{status.textContent='¡Has completado los 3 niveles! Total: '+total+' movimientos. ¿Puedes hacerlo en menos?';next.textContent='Volver a empezar ↻';next.hidden=false}}
function render(){const map=levels[index].map,required=counts(map);counter.textContent='Movimientos: '+steps+' · Llaves disponibles: '+keyInventory+' · Recogidas: '+keys.size+'/'+required.keys+' · Interruptores: '+switches.size+'/'+required.switches;
const frag=document.createDocumentFragment();
for(let row=0;row<map.length;row++)for(let col=0;col<map[row].length;col++){const c=map[row][col],id=col+','+row,cell=document.createElement('div');cell.className='cell';if(c==='#')cell.classList.add('wall');if(c==='E'){cell.classList.add('exit');cell.textContent='⇥'}if(c==='K'&&!keys.has(id)){cell.classList.add('key');cell.textContent='◆'}if(c==='S'&&!switches.has(id)){cell.classList.add('switch');cell.textContent='✦'}if(x===col&&y===row){cell.classList.add('player');cell.textContent='●'}frag.append(cell)}
board.replaceChildren(frag);
board.setAttribute('aria-label','Nivel '+(index+1)+'. Posición: columna '+(x+1)+', fila '+(y+1)+'. Llaves disponibles '+keyInventory+'. Llaves recogidas '+keys.size+' de '+required.keys+'. Interruptores '+switches.size+' de '+required.switches+'.')}
function move(dx,dy){if(won)return;const map=levels[index].map,nx=x+dx,ny=y+dy,c=map[ny]?.[nx],required=counts(map);if(!c||c==='#')return;

if(c==='E'&&switches.size<required.switches){status.textContent='Activa todos los interruptores usando una llave por cada uno.';return}if(c==='S'&&!switches.has(nx+','+ny)&&keyInventory<1){status.textContent='Necesitas recoger una llave para activar este interruptor.';return}
x=nx;y=ny;steps++;const id=x+','+y;
if(c==='K'&&!keys.has(id)){keys.add(id);keyInventory++;status.textContent='¡Llave recogida! Disponibles: '+keyInventory}
else if(c==='S'&&!switches.has(id)){switches.add(id);keyInventory--;status.textContent='¡Interruptor activado! Se ha consumido una llave. '+switches.size+' de '+required.switches}
else if(c==='E')complete();
else status.textContent=switches.size===required.switches?'Todos los requisitos completos. Busca la salida.':'Explora las rutas y completa los requisitos.';
render()}
const directions={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
document.querySelectorAll('[data-move]').forEach(button=>button.addEventListener('click',()=>move(...directions[button.dataset.move])));
document.addEventListener('keydown',event=>{const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||event.altKey||event.ctrlKey||event.metaKey)return;const direction={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right'}[event.key];if(direction){event.preventDefault();move(...directions[direction])}});
resetButton.addEventListener('click',()=>{total=0;startLevel(index)});
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{total=0;startLevel(Number(button.dataset.level))}));
next.addEventListener('click',()=>{if(!won)return;if(index===levels.length-1){total=0;startLevel(0)}else startLevel(index+1)});
startLevel(0);
})();