const assert=require('node:assert/strict');const F=require('../field-core.js');
const hm=t=>new Date(t).toISOString().slice(11,16);
// Madrid, solsticio de verano: orto 04:45 UTC y ocaso 19:49 UTC (06:45 / 21:49 CEST).
let t=F.sunTimes(Date.UTC(2026,5,21,12),40.4168,-3.7038);assert.equal(hm(t.sunrise),'04:45');assert.equal(hm(t.sunset),'19:49');assert.ok(t.dusk>t.sunset&&t.dawn<t.sunrise);
// Noche polar: sin orto ni ocaso.
t=F.sunTimes(Date.UTC(2026,11,21,12),78.2,15.6);assert.equal(t.sunrise,null);assert.equal(t.sunset,null);
// UTM de referencia: (0,0) → 31N 166021,44 E; Puerta del Sol → 30T 440290 4474257.
let u=F.toUTM(0,0);assert.equal(u.zone,31);assert.ok(Math.abs(u.easting-166021.44)<.05);assert.ok(Math.abs(u.northing)<.01);
u=F.toUTM(40.4168,-3.7038);assert.equal(u.text,'30T 440290 E 4474257 N');assert.equal(F.toUTM(-33.9,18.4).northing>5e6,true);
assert.equal(F.toDMS(43.2312,-4.9617),'43°13′52.3″N 4°57′42.1″O');
assert.ok(Math.abs(F.bearing({lat:43,lon:-5},{lat:44,lon:-5}))<1e-9);assert.ok(Math.abs(F.bearing({lat:0,lon:0},{lat:0,lon:1})-90)<1e-9);assert.equal(F.cardinal(359),'N');assert.equal(F.cardinal(225),'SO');
assert.equal(F.stormDistance(30).toFixed(2),'10.29');assert.equal(F.stormDistance(0),null);
const r=F.turnaround({start:0,now:3,deadline:10});assert.equal(r.turn,5);assert.equal(r.late,false);assert.equal(F.turnaround({start:0,now:6,deadline:10}).late,true);assert.equal(F.turnaround({start:NaN,now:1,deadline:2}),null);
const m=F.moonIllumination(Date.UTC(2026,8,26,16,49));assert.ok(m.fraction>.97,'luna llena 26-sep-2026');assert.equal(m.name,'Luna llena');
// Posición solar: Madrid, mediodía solar del solsticio ≈ 73° de altura hacia el sur.
const sp=F.sunPosition(Date.UTC(2026,5,21,12,15),40.4168,-3.7038);assert.ok(Math.abs(sp.altitude-73)<1.5,'altura '+sp.altitude);assert.ok(Math.abs(sp.azimuth-180)<12,'acimut '+sp.azimuth);
assert.ok(F.sunPosition(Date.UTC(2026,5,21,7),40.4168,-3.7038).azimuth<110);
// Ladera que sube hacia el norte → orientada al sur (180°), 45 % ≈ 24°.
const g=[90,90,90,45,45,45,0,0,0];const sa=F.slopeAspect(g,100);assert.ok(Math.abs(sa.aspect-180)<1);assert.ok(Math.abs(sa.slope-24.2)<.5);
assert.ok(Math.abs(F.distance({lat:43,lon:-5},F.offset({lat:43,lon:-5},1000,90))*1000-1000)<1);
assert.equal(F.illumination({slope:0,aspect:0,horizon:[0,0,0,0,0,0,0,0]},{azimuth:180,altitude:-2}).state,'night');
assert.equal(F.illumination({slope:0,aspect:0,horizon:[0,0,0,0,30,0,0,0]},{azimuth:180,altitude:20}).reason,'relieve');
assert.equal(F.illumination({slope:40,aspect:0,horizon:[0,0,0,0,0,0,0,0]},{azimuth:180,altitude:30}).reason,'ladera');
assert.equal(F.illumination({slope:30,aspect:180,horizon:[0,0,0,0,0,0,0,0]},{azimuth:180,altitude:30}).state,'sun');
console.log('Field core passed: sun times (incl. polar night), sun position, slope/aspect, offsets, relief shading, UTM, DMS, bearings, moon phase.');
