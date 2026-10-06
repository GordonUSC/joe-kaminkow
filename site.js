'use strict';
(() => {
const $ = id => document.getElementById(id);
const sources = {
 licensing:'https://licensinginternational.org/about/hall-of-fame/joseph-kaminkow/',
 laser:'https://www.ipdb.org/machine.cgi?id=1415',
 checkpoint:'https://www.ipdb.org/machine.cgi?id=498',
 patent:'https://patents.google.com/patent/US5358244A/en',
 interview:'https://cdcgaming.com/commentary/frank-floor-talk-innovator-joe-kaminkow-looks-back-and-to-the-future/',
 cars:'https://collectorscarworld.com/joe-kaminkows-james-bond-007-db5-heads-to-amelia/'
};
const stories = [
 {world:'pinball',title:'Give the story a physical presence.',copy:'Joe secured the NASA license for Space Shuttle at Williams. Barry Oursler designed the machine. A familiar idea and a physical playfield came together through different kinds of creative work.',source:'licensing'},
 {world:'pinball',title:'Let the whole machine perform.',copy:'Data East’s 1987 Laser War is recorded by IPDB as the first pinball machine with stereo and subwoofer sound. Joe described building it with Gary Stern; the music and sound are David Thiel’s.',source:'laser'},
 {world:'pinball',title:'A surprise you can actually touch.',copy:'A ball-catching, ball-retrieving target appears in US Patent 5,358,244. The named inventors are Joseph Kaminkow and Edwin Cebula. That is a concrete piece of shared invention—not a solo legend.',source:'patent'},
 {world:'stories',title:'Recognition is only the beginning.',copy:'Joe’s work in licensed entertainment brought familiar worlds into play. The creative challenge is what happens after recognition: how a story becomes interaction, character and surprise.',source:'licensing'},
 {world:'stories',title:'Think beyond the screen.',copy:'In his 2023 interview, Joe discusses video, speech, lighting and cabinet form as parts of the same experience. This little machine borrows that creative principle; its artwork and rules are original.',source:'interview'},
 {world:'stories',title:'Leave room for the team.',copy:'Joe describes assembling complementary creative talents. His contribution matters, and so does the work around him: engineers, artists, programmers, sound designers and fellow game designers.',source:'interview'},
 {world:'garage',title:'An idea deserves a beautiful finish.',copy:'Operation Grand Slam brought Joe’s Bond-inspired DB5 vision together with Kevin Kay Restorations and specialist collaborators. The work behind the polish is part of the story.',source:'cars'},
 {world:'garage',title:'Curiosity has room for contrast.',copy:'His published collection ranges from a Fiat 500 Gucci to a Ford GT. Small, exuberant and unexpected can belong in the same garage as a supercar.',source:'cars'},
 {world:'garage',title:'Keep a little play inside.',copy:'The DB5’s in-car screen includes games. Even within an elaborate automotive project, Joe found another place to make somebody smile.',source:'cars'}
];
const symbols = [
 ['SPARK','<path d="m32 3 6 19 19 10-19 6-6 23-7-23L5 32l20-10Z"/>'],
 ['STORY','<rect x="7" y="12" width="50" height="40" rx="3"/><path d="m25 21 17 11-17 11Z"/><path d="M7 20h50M7 44h50"/>'],
 ['CRAFT','<path d="m15 48 25-25M35 7a15 15 0 0 0 20 20L41 41 23 58 8 43l20-19A15 15 0 0 1 35 7Z"/><circle cx="18" cy="45" r="3"/>'],
 ['PLAY','<circle cx="32" cy="32" r="25"/><path d="m26 19 20 13-20 13Z"/>'],
 ['ROAD','<path d="M8 43V30l10-14h28l10 14v13ZM17 29h30M10 36h8m28 0h8"/><circle cx="18" cy="45" r="5"/><circle cx="46" cy="45" r="5"/>'],
 ['HEART','<path d="M32 54 9 32C-3 17 16 3 32 19 48 3 67 17 55 32Z"/>']
];
let world='pinball', values=[0,1,2], held=-1, spinning=false, timers=[], pending=[], turn=0, sound=false, audio=null;
const seen = new Set(), motion=matchMedia('(prefers-reduced-motion: reduce)');
const holds = [...document.querySelectorAll('.hold')];
function paintReel(i,v){const reel=$('reel-'+i);reel.querySelector('.symbol').innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+symbols[v][1]+'</svg>';reel.querySelector('.reel-label').textContent=symbols[v][0];}
values.forEach((v,i)=>paintReel(i,v));
function setSound(on){sound=on;$('sound-toggle').textContent=on?'Sound on':'Sound off';$('sound-toggle').setAttribute('aria-pressed',String(on));}
function note(freq,duration=.1){if(!sound||!audio||document.hidden)return;try{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.065,audio.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration+.02);}catch{setSound(false);}}
$('sound-toggle').addEventListener('click',async()=>{if(sound){setSound(false);return;}try{audio ||= new (window.AudioContext||window.webkitAudioContext)();await audio.resume();setSound(true);note(440);}catch{setSound(false);$('machine-help').textContent='Audio is unavailable here. The complete experience works silently.';}});
function clearTimers(){timers.forEach(clearTimeout);timers=[];}
function rand(){if(window.crypto?.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%symbols.length;}return Math.floor(Math.random()*symbols.length);}
function finish(silent=false){if(!spinning)return;clearTimers();values=[...pending];values.forEach((v,i)=>{paintReel(i,v);$('reel-'+i).classList.remove('rolling');});spinning=false;turn++;$('spin').disabled=false;$('spin').textContent=held<0?'SPIN AGAIN ↻':'REMIX THE IDEAS ↻';$('reveal-now').disabled=true;holds.forEach(b=>b.disabled=false);document.querySelectorAll('[name=world]').forEach(r=>r.disabled=false);
 const pool=stories.map((s,i)=>s.world===world?i:-1).filter(i=>i>=0);const unseen=pool.filter(i=>!seen.has(i));const choice=unseen.length?unseen[(values[0]+values[1]+values[2])%unseen.length]:pool[(turn+values[1])%pool.length];seen.add(choice);const story=stories[choice];
 $('machine-message').textContent=values.map(v=>symbols[v][0]).join(' + ');$('reveal-category').textContent='DISCOVERY / '+world.toUpperCase();$('reveal-title').textContent=story.title;$('reveal-copy').textContent=story.copy;$('reveal-link').href=sources[story.source];$('reveal-link').textContent='Explore the source ↗';$('discovered').textContent=seen.size+' / 9 STORIES EXPLORED';$('machine-help').textContent=seen.size===9?'All nine stories explored. Keep remixing—or take a look inside the garage.':held<0?'Keep one symbol: choose a Hold button, then remix. Or choose another world.':'One symbol is held. Remix the others, or tap the same Hold button to release it.';
 $('reveal-card').classList.remove('fresh');if(!motion.matches){void $('reveal-card').offsetWidth;$('reveal-card').classList.add('fresh');}if(!silent)note(659,.22);
}
$('spin').addEventListener('click',()=>{if(spinning)return;spinning=true;pending=values.map((v,i)=>i===held?v:rand());$('spin').disabled=true;$('reveal-now').disabled=false;holds.forEach(b=>b.disabled=true);document.querySelectorAll('[name=world]').forEach(r=>r.disabled=true);$('machine-message').textContent='A LITTLE CURIOSITY…';$('machine-help').textContent='The symbols are turning. Reveal now skips the animation.';note(220);
 if(motion.matches){finish();return;}
 values.forEach((v,i)=>{if(i===held)return;$('reel-'+i).classList.add('rolling');timers.push(setTimeout(()=>{$('reel-'+i).classList.remove('rolling');paintReel(i,pending[i]);note(330+i*100);},600+i*230));});timers.push(setTimeout(()=>finish(),1250));
});
$('spin').disabled=false;
$('reveal-now').addEventListener('click',()=>finish());
holds.forEach((b,i)=>b.addEventListener('click',()=>{if(spinning)return;held=held===i?-1:i;holds.forEach((el,j)=>{el.setAttribute('aria-pressed',String(j===held));el.textContent=j===held?'Held · release':'Hold reel '+(j+1);});$('spin').textContent=held<0?'SPIN AGAIN ↻':'REMIX THE IDEAS ↻';$('machine-help').textContent=held<0?'All three symbols will turn. Choose a Hold button to keep one.':'Reel '+(held+1)+' stays. The other two symbols will change on your next remix.';note(390);}));
document.querySelectorAll('[name=world]').forEach(r=>r.addEventListener('change',()=>{world=r.value;$('machine-message').textContent='NEXT STOP: '+world.toUpperCase();}));
function interrupt(){finish(true);if(audio&&audio.state==='running')audio.suspend().catch(()=>{});}
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();else if(sound&&audio)audio.resume().catch(()=>setSound(false));});window.addEventListener('focus',()=>{if(sound&&audio)audio.resume().catch(()=>setSound(false));});motion.addEventListener('change',()=>{if(motion.matches)finish(true);});
const cars=[['1965 Aston Martin DB5','The ambitious Bond-inspired build at the heart of Operation Grand Slam.'],['1966-style Batmobile','A film-and-television fantasy made tangible. The interview describes a car based on molds from the George Barris cars.'],['Back to the Future DeLorean','A particularly personal connection: Joe names co-writer Bob Gale as a close friend.'],['Ford GT','One end of a collection that celebrates very different kinds of automotive character.'],['Fiat 500 Gucci','The small, playful counterpart Joe describes as fun to drive.']];
document.querySelectorAll('[data-car]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.car);document.querySelectorAll('[data-car]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));$('car-number').textContent='0'+(i+1)+' / 05';$('car-name').textContent=cars[i][0];$('car-description').textContent=cars[i][1];}));
})();
