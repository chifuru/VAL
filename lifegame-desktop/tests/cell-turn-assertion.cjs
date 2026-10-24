'use strict';
// Starting a qualified private turn is now legal; cancellation still publishes nothing.
module.exports=(E,w)=>{const assert=require('node:assert/strict'),before=JSON.stringify(w),job=E.beginTurn(w);job.cancel();assert.throws(()=>job.advance(),/TURN_DISCARDED/);assert.equal(JSON.stringify(w),before);};
