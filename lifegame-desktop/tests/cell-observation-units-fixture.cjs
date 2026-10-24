'use strict';
// Shared by Node and the browser; builds an internal observation fixture only.
module.exports=function fixture(E,finiteWater=false,width=8,height=8){
 const S=E.S,C=S.CellSpace,w=E.create({seed:'cell-units',width,height,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},producerModel:'colony/1',largePlantModel:'independent/1',consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',balanceModel:'survival/4',ageModel:'life/1',ecologyRevision:'observation/4.1',relationshipModel:'network/1'});
 for(const key of ['organisms','resources','carcasses','pending','searchQ','primaryInocula','hyperInocula','informationField'])w[key]=[];
 w.config.enabled={main:true,plant:true,prey:true,fungus:true,P:true,Q:true};w.tiles=w.tiles.map((t,i)=>({...t,terrain:[0,19].includes(i)?'shallow':'plain',env:[0,19].includes(i)?5:3,blocked:false,walls:[],cover:'none',light:1,soilM:5}));
 w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings(finiteWater?{aquaticProfile:'freshwater-comparison/1'}:{});C.initialize(w);
 const add=(id,species,options={},space={})=>{const o=S.organism(w,S.D.byId[species],options.cell??18,id,{age:40,birthReady:1000,...options});if(options.mutated)o.ryouki.mutated=true;C.assign(w,o,space);w.organisms.push(o);return o;};
 for(let slot=0;slot<3;slot++)for(let i=0;i<3;i++)add('r'+slot+'-'+i,'ryouki',{mutated:true,phase:1+(slot*3+i)%4},{state:'settled',slot});
 for(let i=0;i<2;i++)add('moving'+i,'ryouki',{}, {state:'moving'});
 for(let i=0;i<6;i++)add('colony'+i,'grass',{B:7});
 for(let i=0;i<3;i++)add('tree'+i,i===2?'starcrown':'forestcrown',{phase:i===0?2:1,B:9});
 for(const [i,n]of [1,2,3,4,8].entries()){const o=add('herd'+i,'grassbug',{age:i?10:2,B:2*n,E:1,M:.01});o.consumerGroup.cohorts=[{age:i?10:2,phase:1+i%2,n,B:2*n}];o.HP=S.spec(o).capacity[3]*n;}
 for(let i=0;i<6;i++)add('fungus'+i,'fungus',{B:2});add('floating','freshwaterlight',{cell:19,B:8,E:4,M:.1});
 const host=w.organisms[0];host.infection=S.infection(w,'leafparasite',host.id,0,host.id);host.infection.q=S.hyper(w,host.infection.id,0);
 w.cellState.water[18]=7;w.cellState.organic=[{id:'organic',cell:18,E:3,M:.1,B:1}];w.cellState.nextMaterial=[{id:'pending',kind:'organic',cell:18,availableAt:1,E:2,M:.2,B:1}];
 w.carcasses=[{id:'c:prior:0',species:'grass',cell:18,slot:'food',tag:'plant',created:-1,availableAt:0,expires:null,q:99,E:7,M:.2,G:2,infection:null,payloadExpires:null}];
 E.finish(w,E.context(w));return w;
};
