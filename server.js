const express=require('express');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const robots=[
{id:'RB-001',name:'Atlas',type:'Welding',status:'Running',health:94,temperature:68,vibration:2.1,battery:87,hours:3280,lastService:'2026-08-12',nextService:'2026-10-18'},
{id:'RB-002',name:'Bolt',type:'Assembly',status:'Running',health:82,temperature:79,vibration:3.8,battery:72,hours:4120,lastService:'2026-07-28',nextService:'2026-10-07'},
{id:'RB-003',name:'Cargo',type:'Material Handling',status:'Warning',health:61,temperature:91,vibration:6.7,battery:48,hours:5190,lastService:'2026-06-15',nextService:'2026-10-04'},
{id:'RB-004',name:'Delta',type:'Painting',status:'Maintenance',health:45,temperature:84,vibration:7.9,battery:31,hours:6410,lastService:'2026-05-22',nextService:'2026-10-02'},
{id:'RB-005',name:'Echo',type:'Inspection',status:'Running',health:97,temperature:63,vibration:1.6,battery:93,hours:2460,lastService:'2026-09-03',nextService:'2026-11-02'},
{id:'RB-006',name:'Falcon',type:'Packaging',status:'Idle',health:76,temperature:71,vibration:3.2,battery:64,hours:3890,lastService:'2026-08-01',nextService:'2026-10-21'}];
const alerts=[
{id:1,robot:'RB-003',severity:'Critical',title:'High vibration trend',detail:'Vibration exceeds the learned baseline.',time:'10 min ago',acknowledged:false},
{id:2,robot:'RB-004',severity:'High',title:'Maintenance overdue',detail:'Gearbox inspection is due today.',time:'32 min ago',acknowledged:false},
{id:3,robot:'RB-002',severity:'Medium',title:'Temperature rising',detail:'Motor temperature is above its baseline.',time:'1 hr ago',acknowledged:false},
{id:4,robot:'RB-003',severity:'Medium',title:'Low battery',detail:'Battery is below the operating threshold.',time:'2 hrs ago',acknowledged:false}];
const workOrders=[
{id:'WO-1042',robot:'RB-003',issue:'Inspect wrist actuator vibration',priority:'Critical',technician:'Unassigned',status:'Open',due:'Today'},
{id:'WO-1041',robot:'RB-004',issue:'Gearbox inspection and lubrication',priority:'High',technician:'M. Dlamini',status:'In Progress',due:'Today'},
{id:'WO-1039',robot:'RB-002',issue:'Cooling system inspection',priority:'Medium',technician:'A. Naidoo',status:'Scheduled',due:'Tomorrow'},
{id:'WO-1035',robot:'RB-006',issue:'Battery health check',priority:'Low',technician:'S. Jacobs',status:'Completed',due:'2026-09-30'}];
function recommendations(r){const a=[];if(r.vibration>=6)a.push({risk:'High',action:'Inspect bearings, gearbox and wrist actuator; check alignment.'});else if(r.vibration>=4)a.push({risk:'Medium',action:'Schedule vibration inspection and review lubrication.'});if(r.temperature>=90)a.push({risk:'High',action:'Inspect cooling path, motor load and thermal sensors.'});else if(r.temperature>=78)a.push({risk:'Medium',action:'Monitor motor temperature and cooling performance.'});if(r.battery<40)a.push({risk:'Medium',action:'Run battery health test and inspect charging history.'});if(r.health<65)a.push({risk:'High',action:'Create preventive maintenance work order within 24 hours.'});if(!a.length)a.push({risk:'Low',action:'Continue normal monitoring; no immediate action predicted.'});return a}
setInterval(()=>robots.forEach(r=>{let d=Math.random()-.5;r.temperature=+(Math.max(45,Math.min(110,r.temperature+d*2.4))).toFixed(1);r.vibration=+Math.max(.7,r.vibration+d*.35).toFixed(1);if(r.status==='Running')r.battery=Math.max(8,Math.round(r.battery-Math.random()*.4));if(r.temperature>98||r.vibration>8.5)r.health=Math.max(20,r.health-1);if(r.temperature>90||r.vibration>6)if(r.status!=='Maintenance')r.status='Warning'},4000));
app.get('/api/dashboard',(req,res)=>{const active=alerts.filter(a=>!a.acknowledged);res.json({stats:{total:robots.length,running:robots.filter(r=>r.status==='Running').length,warning:robots.filter(r=>r.status==='Warning').length,maintenance:robots.filter(r=>r.status==='Maintenance').length,avgHealth:Math.round(robots.reduce((s,r)=>s+r.health,0)/robots.length),openWorkOrders:workOrders.filter(w=>w.status!=='Completed').length,activeAlerts:active.length},robots,alerts,workOrders})});
app.get('/api/robots/:id',(req,res)=>{const r=robots.find(x=>x.id===req.params.id);if(!r)return res.status(404).json({error:'Robot not found'});res.json({...r,predictions:recommendations(r)})});
app.get('/api/robots/:id/history',(req,res)=>{const r=robots.find(x=>x.id===req.params.id);if(!r)return res.status(404).json({error:'Robot not found'});res.json(Array.from({length:24},(_,i)=>({label:`-${23-i}h`,temperature:+(r.temperature+Math.sin(i/2)*4+(Math.random()-.5)*3).toFixed(1),vibration:+Math.max(.5,r.vibration+Math.cos(i/3)*.8+(Math.random()-.5)*.5).toFixed(1),health:Math.max(20,Math.min(100,Math.round(r.health+Math.sin(i/4)*3)))})))});
app.post('/api/robots/:id/action',(req,res)=>{const r=robots.find(x=>x.id===req.params.id);if(!r)return res.status(404).json({error:'Robot not found'});const a=req.body.action;if(a==='service')r.status='Maintenance';if(a==='resume')r.status='Running';if(a==='reset'){r.status='Idle';r.health=Math.min(100,r.health+5)}if(a==='create-work-order')workOrders.unshift({id:`WO-${1043+workOrders.length}`,robot:r.id,issue:'AI recommended preventive inspection',priority:r.health<65?'High':'Medium',technician:'Unassigned',status:'Open',due:'Today'});res.json({success:true,robot:r})});
app.post('/api/alerts/:id/ack',(req,res)=>{const a=alerts.find(x=>x.id===Number(req.params.id));if(!a)return res.status(404).json({error:'Alert not found'});a.acknowledged=true;res.json({success:true,alert:a})});
app.post('/api/work-orders',(req,res)=>{const {robot,issue,priority='Medium',technician='Unassigned'}=req.body;if(!robot||!issue)return res.status(400).json({error:'robot and issue are required'});const w={id:`WO-${1043+workOrders.length}`,robot,issue,priority,technician,status:'Open',due:'Today'};workOrders.unshift(w);res.status(201).json(w)});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'AI Robot Maintenance Portal'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT,()=>console.log(`AI Robot Maintenance Portal: http://localhost:${PORT}`));
