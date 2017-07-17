"use strict";
var rf = require("resourceforkjs").resourceFork;
var repl = require("repl");
var novaParse = require("./novaParse.js").novaParse;


var ndat4 = new rf("./test/Nova\ Data\ 4.ndat", false);
var nships1 = new rf("./test/Nova\ Ships\ 1.ndat", false);
var weap = new rf("./test/files/weap.ndat", false);


ndat4.read();
weap.read();




var local = repl.start();

var np;
nships1.read().then(function() {
    np = new novaParse(nships1.resources);
    np.parse();
    local.context.np = np;
}.bind(this));

local.context.rf = rf;
local.context.ndat4 = ndat4;
local.context.nships1 = nships1;
local.context.weap = weap;
local.context.novaParse = novaParse;
