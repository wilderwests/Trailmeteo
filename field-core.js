/* Cálculos astronómicos y de relieve sin conexión: sol y luna, posición solar, pendiente, orientación, UTM y rumbos. */
(function(root){
const rad=Math.PI/180,dayMs=86400000,J1970=2440588,J2000=2451545,e=rad*23.4397;
const toJulian=d=>d/dayMs-.5+J1970,fromJulian=j=>(j+.5-J1970)*dayMs,toDays=d=>toJulian(d)-J2000;
const rightAscension=(l,b)=>Math.atan2(Math.sin(l)*Math.cos(e)-Math.tan(b)*Math.sin(e),Math.cos(l));
const declination=(l,b)=>Math.asin(Math.sin(b)*Math.cos(e)+Math.cos(b)*Math.sin(e)*Math.sin(l));
const solarMeanAnomaly=d=>rad*(357.5291+.98560028*d);
function eclipticLongitude(M){const C=rad*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M));return M+C+rad*102.9372+Math.PI}
const J0=.0009;
const julianCycle=(d,lw)=>Math.round(d-J0-lw/(2*Math.PI));
const approxTransit=(Ht,lw,n)=>J0+(Ht+lw)/(2*Math.PI)+n;
const solarTransitJ=(ds,M,L)=>J2000+ds+.0053*Math.sin(M)-.0069*Math.sin(2*L);
const hourAngle=(h,phi,d)=>Math.acos((Math.sin(h)-Math.sin(phi)*Math.sin(d))/(Math.cos(phi)*Math.cos(d)));
/* Horas solares (algoritmo de SunCalc, V. Agafonkin, BSD-2). Devuelve milisegundos UTC o null si el sol no cruza la altura. */
function sunTimes(time,lat,lon){const lw=rad*-lon,phi=rad*lat,d=toDays(time),n=julianCycle(d,lw),ds=approxTransit(0,lw,n),M=solarMeanAnomaly(ds),L=eclipticLongitude(M),dec=declination(L,0),Jnoon=solarTransitJ(ds,M,L);
 const pair=h=>{const w=hourAngle(h*rad,phi,dec);if(!Number.isFinite(w))return[null,null];const Jset=solarTransitJ(approxTransit(w,lw,n),M,L);return[fromJulian(Jnoon-(Jset-Jnoon)),fromJulian(Jset)]};
 const [sunrise,sunset]=pair(-.833),[dawn,dusk]=pair(-6),[goldenEnd,golden]=pair(6);return{noon:fromJulian(Jnoon),sunrise,sunset,dawn,dusk,golden,goldenEnd}}
function moonIllumination(time){const d=toDays(time),M=solarMeanAnomaly(d),L=eclipticLongitude(M),s={dec:declination(L,0),ra:rightAscension(L,0)};
 const Lm=rad*(218.316+13.176396*d),Mm=rad*(134.963+13.064993*d),F=rad*(93.272+13.22935*d),l=Lm+rad*6.289*Math.sin(Mm),b=rad*5.128*Math.sin(F),dist=385001-20905*Math.cos(Mm),m={ra:rightAscension(l,b),dec:declination(l,b),dist};
 const sdist=149598000,phi=Math.acos(Math.sin(s.dec)*Math.sin(m.dec)+Math.cos(s.dec)*Math.cos(m.dec)*Math.cos(s.ra-m.ra)),inc=Math.atan2(sdist*Math.sin(phi),m.dist-sdist*Math.cos(phi)),angle=Math.atan2(Math.cos(s.dec)*Math.sin(s.ra-m.ra),Math.sin(s.dec)*Math.cos(m.dec)-Math.cos(s.dec)*Math.sin(m.dec)*Math.cos(s.ra-m.ra));
 const fraction=(1+Math.cos(inc))/2,phase=.5+.5*inc*(angle<0?-1:1)/Math.PI;return{fraction,phase,name:moonName(phase)}}
function moonName(p){return p<.03||p>.97?'Luna nueva':p<.22?'Creciente':p<.28?'Cuarto creciente':p<.47?'Gibosa creciente':p<.53?'Luna llena':p<.72?'Gibosa menguante':p<.78?'Cuarto menguante':'Menguante'}
/* UTM WGS84 (equivale a ETRS89 a efectos de rescate). */
function toUTM(lat,lon){const a=6378137,f=1/298.257223563,k0=.9996,e2=f*(2-f),ep2=e2/(1-e2);const zone=Math.floor((lon+180)/6)+1,lon0=((zone-1)*6-180+3)*rad,phi=lat*rad,N=a/Math.sqrt(1-e2*Math.sin(phi)**2),T=Math.tan(phi)**2,C=ep2*Math.cos(phi)**2,A=Math.cos(phi)*(lon*rad-lon0);
 const M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*phi-(3*e2/8+3*e2**2/32+45*e2**3/1024)*Math.sin(2*phi)+(15*e2**2/256+45*e2**3/1024)*Math.sin(4*phi)-(35*e2**3/3072)*Math.sin(6*phi));
 const x=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep2)*A**5/120)+500000;let y=k0*(M+N*Math.tan(phi)*(A**2/2+(5-T+9*C+4*C**2)*A**4/24+(61-58*T+T**2+600*C-330*ep2)*A**6/720));if(lat<0)y+=10000000;
 const band='CDEFGHJKLMNPQRSTUVWXX'[Math.max(0,Math.min(20,Math.floor((lat+80)/8)))];return{zone,band,easting:x,northing:y,text:`${zone}${band} ${Math.round(x)} E ${Math.round(y)} N`}}
function toDMS(lat,lon){const f=(v,p,n)=>{const s=v<0?n:p,a=Math.abs(v),d=Math.floor(a),mf=(a-d)*60,m=Math.floor(mf),sec=(mf-m)*60;return `${d}°${String(m).padStart(2,'0')}′${sec.toFixed(1).padStart(4,'0')}″${s}`};return `${f(lat,'N','S')} ${f(lon,'E','O')}`}
function distance(a,b){const r=rad,x=(b.lat-a.lat)*r,y=(b.lon-a.lon)*r,q=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;return 6371*2*Math.asin(Math.sqrt(Math.min(1,q)))}
function bearing(a,b){const p1=a.lat*rad,p2=b.lat*rad,dl=(b.lon-a.lon)*rad,y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return(Math.atan2(y,x)/rad+360)%360}
function cardinal(deg){return['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'][Math.round(((deg%360)+360)%360/22.5)%16]}
/* Relámpago–trueno: el sonido recorre ~343 m/s. */
function stormDistance(seconds){return seconds>0?seconds*.343:null}
/* Retorno: la hora límite de llegada es el ocaso menos el margen. */
function turnaround({start,now,deadline,returnRatio=1}){if(![start,now,deadline].every(Number.isFinite))return null;const turn=start+(deadline-start)/(1+returnRatio);return{turn,remaining:turn-now,late:now>turn}}
/* Posición del sol: acimut desde el norte (horario) y altura sobre el horizonte, en grados. */
function sunPosition(time,lat,lon){const d=toDays(time),lw=rad*-lon,phi=rad*lat,M=solarMeanAnomaly(d),L=eclipticLongitude(M),dec=declination(L,0),ra=rightAscension(L,0),H=rad*(280.16+360.9856235*d)-lw-ra;const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)),alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));return{azimuth:((az/rad)+180+360)%360,altitude:alt/rad}}
/* Pendiente y orientación a partir de una rejilla 3×3 (fila norte primero), separación en metros. */
function slopeAspect(g,step){const [a,b,c,d,,f,gg,h,i]=g;if(g.some(v=>!Number.isFinite(v)))return null;const dzdx=((c+2*f+i)-(a+2*d+gg))/(8*step),dzdy=((a+2*b+c)-(gg+2*h+i))/(8*step);const slope=Math.atan(Math.hypot(dzdx,dzdy))/rad;let aspect=Math.atan2(-dzdx,-dzdy)/rad;aspect=(aspect+360)%360;return{slope,aspect}}
/* Desplaza un punto una distancia (m) con un rumbo (grados). */
function offset(p,dist,brg){const R=6371000,d=dist/R,b=brg*rad,la=p.lat*rad,lo=p.lon*rad,la2=Math.asin(Math.sin(la)*Math.cos(d)+Math.cos(la)*Math.sin(d)*Math.cos(b)),lo2=lo+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(la),Math.cos(d)-Math.sin(la)*Math.sin(la2));return{lat:la2/rad,lon:lo2/rad}}
/* Iluminación: noche, sombra del relieve, ladera de espaldas o sol directo. */
function illumination({slope,aspect,horizon},sun){if(sun.altitude<=0)return{state:'night',incidence:0};const n=Array.isArray(horizon)&&horizon.length?horizon.length:0;if(n){const k=sun.azimuth/(360/n),i0=Math.floor(k)%n,i1=(i0+1)%n,t=k-Math.floor(k),hz=horizon[i0]*(1-t)+horizon[i1]*t;if(sun.altitude<hz)return{state:'shade',reason:'relieve',incidence:0,horizon:hz}}const z=(90-sun.altitude)*rad,s=(slope||0)*rad,inc=Math.cos(z)*Math.cos(s)+Math.sin(z)*Math.sin(s)*Math.cos((sun.azimuth-(aspect||0))*rad);if(inc<=0)return{state:'shade',reason:'ladera',incidence:0};return{state:'sun',incidence:inc}}
const api={sunTimes,sunPosition,slopeAspect,offset,illumination,moonIllumination,toUTM,toDMS,distance,bearing,cardinal,stormDistance,turnaround};root.FieldCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
