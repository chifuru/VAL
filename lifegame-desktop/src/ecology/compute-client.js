/* One Worker, at most six private future turns. No future state reaches counters. */
(function(root){'use strict';
  function create({onChange=()=>{},onError=()=>{},workerFactory=()=>new Worker('ecology/compute-worker.js')}={}){
    let worker=null,epoch=0,queue=[],busy=false,ready=false,limit=Infinity,preparedAt=0,watchdog=null,metadata=null, warming=true,active=false,reserved=null;
    let phases=[],nextTurn=0,requested=0,terminal=false;
    function close(dispose=false){phases=[];requested=0;terminal=false;epoch++;active=false;if(dispose){worker?.terminate();worker=null;}queue=[];reserved=null;busy=false;ready=false;clearTimeout(watchdog);watchdog=null;}
    function fail(message){close(true);onError(message);}
    function arm(){clearTimeout(watchdog);watchdog=setTimeout(()=>fail(warming?'事前計算が60秒以内に応答しませんでした。確定状態から再試行してください。':'次のターンの計算が60秒以内に応答しませんでした。確定状態を保持しています。「観測を開始」で再試行できます。'),warming?Math.max(1,60000-(performance.now()-preparedAt)):60000);}
    function init(world,observeId,end,{finalOnly=false}={}){
      close();limit=end;nextTurn=world.turn+1;preparedAt=performance.now();metadata=null;warming=true;
      try{
        worker ||= workerFactory();active=true;const token=epoch;
        worker.onerror=e=>{if(active&&token===epoch){e.preventDefault?.();fail('生態計算を起動できませんでした。再度「観測を開始」を押してください。');}};
        worker.onmessage=({data:d})=>{
          if(!active||token!==epoch||!d||d.epoch!==epoch)return;
          if(d.type==='error'){fail(d.message);return;}
          if(d.type==='ready'){
            if(ready||busy){fail('生態計算の準備通知が重複しています');return;}
            ready=true;metadata=d;clearTimeout(watchdog);fill(3);
          }else if(d.type==='phase'||d.type==='turn'){
            if(!ready||!busy||requested<=0||terminal||!Number.isSafeInteger(d.turn)||d.turn!==nextTurn||d.turn>limit||queue.length+(reserved?1:0)>=6){fail('要求と一致しないターンを受信しました');return;}
            const validPatch=p=>p&&typeof p==='object'&&!Array.isArray(p)&&p.meta?.turn===nextTurn;
            if(d.type==='phase'){
              if(!Number.isInteger(d.phase)||finalOnly||d.phase!==phases.length||d.phase>=3||!validPatch(d.patch)){fail('段階データの順序またはターンが不正です');return;}
              phases.push(d.patch);return;
            }
            const patches=d.patches===null?phases:d.patches;
            const expected=finalOnly?1:3;
            let complete=Array.isArray(patches)&&patches.length===expected;
            if(complete)for(let i=0;i<expected;i++)if(!validPatch(patches[i])){complete=false;break;}
            if((d.patches!==null&&phases.length)||!complete){fail('段階データが不足または重複しています');return;}
            const reason=patches.at(-1).meta.stopReason;
            if(reason!=null&&reason!=='checkpoint'&&reason!=='main-extinct'){fail('計算結果の停止理由が不正です');return;}
            queue.push({...d,patches});phases=[];nextTurn++;requested--;terminal=!!reason||nextTurn>limit;arm();
          }else if(d.type==='idle'){
            if(!ready||!busy||phases.length||(requested>0&&!terminal)){fail('要求した段階またはターンが完了していません');return;}
            // A checkpoint can end a batch before a longer replay ends. Only the
            // requested terminal turn prevents an explicit subsequent refill.
            warming=false;busy=false;requested=0;terminal=nextTurn>limit;clearTimeout(watchdog);
          }else {fail('生態計算から不明な通知を受信しました');return;}
          onChange();
        };
        arm();worker.postMessage({type:'init',epoch,world,observeId,stream:!finalOnly,finalOnly});
      }catch(e){fail(e.message);}
    }
    function fill(count=2){
      if(!active||!ready||busy||!worker||terminal||!Number.isSafeInteger(count)||count<=0)return;
      const amount=Math.min(count,6-queue.length-(reserved?1:0),limit-nextTurn+1);if(amount<=0)return;
      busy=true;requested=amount;arm();
      try{worker.postMessage({type:'compute',epoch,count:amount,limit});}catch(e){fail(e.message);}
    }
    function take(){if(reserved)throw Error('TURN_ALREADY_RESERVED');reserved=queue.shift()||null;return reserved;}
    function restore(packet){if(!reserved||packet!==reserved)throw Error('TURN_RESERVATION_MISMATCH');queue.unshift(reserved);reserved=null;}
    function acknowledge(){if(!reserved)throw Error('TURN_NOT_RESERVED');reserved=null;}
    return {init,close,fill,take,restore,acknowledge,get initialized(){return active;},get length(){return queue.length;},get ready(){return ready;},get busy(){return busy;},get elapsed(){return performance.now()-preparedAt;},get metadata(){return metadata;}};
  }
  root.EcoCompute={create};
})(globalThis);
