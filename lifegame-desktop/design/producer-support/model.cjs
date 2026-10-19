'use strict';
// Producer support now lives in the shared production state/engine hooks.
function model(){return require('../layered-primary/model.cjs').model({allocation:true});}
module.exports={model};
