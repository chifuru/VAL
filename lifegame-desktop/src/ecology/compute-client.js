/* One Worker, at most six private future turns. No future state reaches counters. */
(function(root){'use strict';
  function create({onChange=()=>{},onError=()=>{},workerFactory=()=>new Worker('ecology/compute-worker.js')}={}){
    let worker=null,epoch=0,queue=[],busy=false,ready=false,limit=Infinity,preparedAt=0,watchdog=null,metadata=null, warming=true,active=false,reserved=null;
    function close(dispose=false){epoch++;active=false;if(dispose){worker?.terminate();worker=null;}queue=[];reserved=null;busy=false;ready=false;clearTimeout(watchdog);watchdog=null;}
    function fail(message){close(true);onError(message);}
    function arm(){clearTimeout(watchdog);watchdog=setTimeout(()=>fail('事前計算が60秒以内に応答しませんでした。確定状態から再試行してください。'),warming?Math.max(1,60000-(performance.now()-preparedAt)):60000);}
    function init(world,observeId,end){
      close();limit=end;preparedAt=performance.now();metadata=null;warming=true;
      try{
        worker ||= workerFactory();active=true;const token=epoch;
        worker.onerror=e=>{if(token===epoch){e.preventDefault?.();fail('生態計算を起動できませんでした。再度「観測を開始」を押してください。');}};
        worker.onmessage=({data:d})=>{
          if(token!==epoch||d.epoch!==epoch)return;
          if(d.type==='error'){fail(d.message);return;}
          if(d.type==='ready'){ready=true;metadata=d;clearTimeout(watchdog);fill(3);}
          if(d.type==='turn'){queue.push(d);arm();}
          if(d.type==='idle'){warming=false;busy=false;clearTimeout(watchdog);}
          onChange();
        };
        arm();worker.postMessage({type:'init',epoch,world,observeId});
      }catch(e){fail(e.message);}
    }
    function fill(count=2){
      if(!ready||busy||!worker||queue.at(-1)?.turn>=limit)return;
      const amount=Math.min(count,6-queue.length-(reserved?1:0));if(amount<=0)return;
      busy=true;arm();worker.postMessage({type:'compute',epoch,count:amount,limit});
    }
    function take(){if(reserved)throw Error('TURN_ALREADY_RESERVED');reserved=queue.shift()||null;return reserved;}
    function restore(packet){if(packet!==reserved)throw Error('TURN_RESERVATION_MISMATCH');queue.unshift(reserved);reserved=null;}
    function acknowledge(){reserved=null;}
    return {init,close,fill,take,restore,acknowledge,get initialized(){return active;},get length(){return queue.length;},get ready(){return ready;},get busy(){return busy;},get elapsed(){return performance.now()-preparedAt;},get metadata(){return metadata;}};
  }
  root.EcoCompute={create};
})(globalThis);
