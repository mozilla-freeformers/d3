/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function () {

/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }
        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            main.apply(undef, args);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../tools/almond", function(){});

// UA-Parser.JS v0.5.2
// Lightweight JavaScript-based User-Agent string parser
// https://github.com/faisalman/ua-parser-js
//
// Copyright © 2012 Faisalman
// licensed under MIT
//
// commit: https://github.com/faisalman/ua-parser-js/commit/4efb13be3ee21cab86d1b2e9f740572346b497bf
(function(e,t){var n="",r="function",i="undefined",s="object",o="major",u="model",a="name",f="type",l="vendor",c="version",h="console",p="mobile",d="tablet",v={regex:function(){var e,o,u,a,f,l,c=arguments;for(o=0;o<c.length;o+=2){var h=c[o],p=c[o+1];if(typeof e===i){e={};for(a=0;a<p.length;a++)typeof p[a]===s?e[p[a][0]]=t:e[p[a]]=t;if(this.getUA().toString()===n)return e}for(u=0;u<h.length;u++){f=h[u].exec(this.getUA());if(!!f){for(a=0;a<p.length;a++)l=f[a+1],typeof p[a]===s&&p[a].length===2?e[p[a][0]]=p[a][1]:typeof p[a]===s&&p[a].length===3?typeof p[a][1]===r&&(!p[a][1].exec||!p[a][1].test)?e[p[a][0]]=l?p[a][1].call(this,l,p[a][2]):t:e[p[a][0]]=l?l.replace(p[a][1],p[a][2]):t:e[p[a]]=l?l:t;break}}if(!!f)break}return e},string:function(e,n){for(var r in n)if(n.hasOwnProperty(r))if(typeof n[r]===s&&n[r].length>0){for(var o=0;o<n[r].length;o++)if(e.toLowerCase().indexOf(n[r][o].toLowerCase())!==-1)return r.toString()===i?t:r}else if(e.toLowerCase().indexOf(n[r].toLowerCase())!==-1)return r.toString()===i?t:r;return e}},m={browser:{oldsafari:{major:{1:["/85","/125","/312"],2:["/412","/416","/417","/419"],"undefined":"/"},version:{"1.0":"/85",1.2:"/125",1.3:"/312","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","undefined":"/"}}},device:{sprint:{model:{"Evo Shift 4G":"7373KT"},vendor:{HTC:"APA"}}},os:{windows:{version:{ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2e3:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",RT:"ARM"}}}},g={browser:[[/(opera\smini)\/((\d+)?[\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/((\d+)?[\w\.-]+)/i,/(opera).+version\/((\d+)?[\w\.]+)/i,/(opera)[\/\s]+((\d+)?[\w\.]+)/i,/(kindle)\/((\d+)?[\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?((\d+)?[\w\.]+)*/i,/(avant\sbrowser|iemobile|slimbrowser|baidubrowser)[\/\s]?((\d+)?[\w\.]*)/i,/ms(ie)\s((\d+)?[\w\.]+)/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt)\/((\d+)?[\w\.-]+)/i],[a,c,o],[/(yabrowser)\/((\d+)?[\w\.]+)/i],[[a,"Yandex"],c,o],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?((\d+)?[\w\.]+)/i],[a,c,o],[/(dolfin)\/((\d+)?[\w\.]+)/i],[[a,"Dolphin"],c,o],[/((?:android.+)crmo|crios)\/((\d+)?[\w\.]+)/i],[[a,"Chrome"],c,o],[/version\/((\d+)?[\w\.]+).+?mobile\/\w+\s(safari)/i],[c,o,[a,"Mobile Safari"]],[/version\/((\d+)?[\w\.]+).+?(mobile\s?safari|safari)/i],[c,o,a],[/applewebkit.+?(mobile\s?safari|safari)((\/[\w\.]+))/i],[a,[o,v.string,m.browser.oldsafari.major],[c,v.string,m.browser.oldsafari.version]],[/(konqueror)\/((\d+)?[\w\.]+)/i,/(applewebkit|khtml)\/((\d+)?[\w\.]+)/i],[a,c,o],[/(navigator|netscape)\/((\d+)?[\w\.-]+)/i],[[a,"Netscape"],c,o],[/(swiftfox)/i,/(iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo)[\/\s]?((\d+)?[\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/((\d+)?[\w\.-]+)/i,/(mozilla)\/((\d+)?[\w\.]+).+rv\:.+gecko\/\d+/i,/(uc\s?browser|polaris|lynx|dillo|icab|doris)[\/\s]?((\d+)?[\w\.]+)/i,/(gobrowser)\/?((\d+)?[\w\.]+)*/i,/(mosaic)[\/\s]((\d+)?[\w\.]+)/i],[a,c,o]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],[u,l,[f,d]],[/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[l,u,[f,d]],[/\((ip[honed]+);.+(apple)/i],[u,l,[f,p]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola)[\s_-]?([\w-]+)*/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[l,u,[f,p]],[/\((bb10);\s(\w+)/i],[[l,"BlackBerry"],u,[f,p]],[/android.+((transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+))/i],[[l,"Asus"],u,[f,d]],[/(sony)\s(tablet\s[ps])/i],[l,u,[f,d]],[/(nintendo|playstation)\s([wids3portablev]+)/i],[l,u,[f,h]],[/(sprint\s[a-z]+)(\w+)/i],[[l,v.string,m.device.sprint.vendor],[u,v.string,m.device.sprint.model],[f,p]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|;\ssony)[_\s-]?([\w-]+)*/i],[l,[u,/_/g," "],[f,p]],[/\s((milestone|droid[2x]?))[globa\s]*\sbuild\//i,/(mot)[\s-]?(\w+)*/i],[[l,"Motorola"],u,[f,p]],[/android.+\s((mz60\d|xoom[\s2]{0,2}))\sbuild\//i],[[l,"Motorola"],u,[f,d]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9))/i],[[l,"Samsung"],u,[f,d]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[[l,"Samsung"],u,[f,p]],[/(sie)-(\w+)*/i],[[l,"Siemens"],u,[f,p]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[[l,"Nokia"],u,[f,p]],[/android\s3\.[\s\w-;]{10}((a\d{3}))/i],[[l,"Acer"],u,[f,d]],[/android\s3\.[\s\w-;]{10}(lg?)-([06cv9]{3,4})/i],[[l,"LG"],u,[f,d]],[/(lg)[e;\s-\/]+(\w+)*/i],[[l,"LG"],u,[f,p]],[/(mobile|tablet);.+rv\:.+gecko\//i],[f,l,u]],engine:[[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront)\/([\w\.]+)/i,/(khtml)\/([\w\.]+)/i,/(tasman)\s([\w\.]+)/i],[a,c],[/rv\:([\w\.]+).*(gecko)/i],[c,a]],os:[[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone\sos|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[a,[c,v.string,m.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[a,"Windows"],[c,v.string,m.os.windows.version]],[/\((bb)(10);/i],[[a,"BlackBerry"],c],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)\/([\w\.]+)/i,/(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego)[\/\s-]?([\w\.]+)*/i],[a,c],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[[a,"Symbian"],c],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[a,"Firefox OS"],c],[/(nintendo|playstation)\s([wids3portablev]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],[a,c],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[a,"Chromium OS"],c],[/(sunos)\s?([\w\.]+\d)*/i],[[a,"Solaris"],c],[/\s(\w*bsd|dragonfly)\s?([\w\.]+)*/i],[a,c],[/(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i],[[a,"iOS"],[c,/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i],[a,[c,/_/g,"."]],[/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(macintosh|mac(?=_powerpc)|plan\s9|minix|beos|os\/2|amigaos|morphos)/i,/(unix)\s?([\w\.]+)*/i],[a,c]]},y=function(r){var i=r||(e&&e.navigator&&e.navigator.userAgent?e.navigator.userAgent:n);this.getBrowser=function(){return v.regex.apply(this,g.browser)},this.getDevice=function(){return v.regex.apply(this,g.device)},this.getEngine=function(){return v.regex.apply(this,g.engine)},this.getOS=function(){return v.regex.apply(this,g.os)},this.getResult=function(){return{browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice()}},this.getUA=function(){return i},this.setUA=function(e){return i=e,this},this.setUA(i)};typeof exports!==i&&!/\[object\s[DOM]*Window\]/.test(e.toString())?(typeof module!==i&&module.exports&&(exports=module.exports=y),exports.UAParser=y):e.UAParser=y})(this);
define("../external/ua-parser/ua-parser", function(){});

(function() {/*
 A JavaScript implementation of the SHA family of hashes, as defined in FIPS
 PUB 180-2 as well as the corresponding HMAC implementation as defined in
 FIPS PUB 198a

 Copyright Brian Turek 2008-2012
 Distributed under the BSD License
 See http://caligatio.github.com/jsSHA/ for more information

 Several functions taken from Paul Johnson
*/
function j(a){throw a;}function q(a,e){var b=[],f=(1<<e)-1,c=a.length*e,d;for(d=0;d<c;d+=e)b[d>>>5]|=(a.charCodeAt(d/e)&f)<<32-e-d%32;return{value:b,binLen:c}}function s(a){var e=[],b=a.length,f,c;0!==b%2&&j("String of HEX type must be in byte increments");for(f=0;f<b;f+=2)c=parseInt(a.substr(f,2),16),isNaN(c)&&j("String of HEX type contains invalid characters"),e[f>>>3]|=c<<24-4*(f%8);return{value:e,binLen:4*b}}
function t(a){var e=[],b=0,f,c,d,g,h;-1===a.search(/^[a-zA-Z0-9=+\/]+$/)&&j("Invalid character in base-64 string");f=a.indexOf("=");a=a.replace(/\=/g,"");-1!==f&&f<a.length&&j("Invalid '=' found in base-64 string");for(c=0;c<a.length;c+=4){h=a.substr(c,4);for(d=g=0;d<h.length;d+=1)f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(h[d]),g|=f<<18-6*d;for(d=0;d<h.length-1;d+=1)e[b>>2]|=(g>>>16-8*d&255)<<24-8*(b%4),b+=1}return{value:e,binLen:8*b}}
function u(a,e){var b="",f=4*a.length,c,d;for(c=0;c<f;c+=1)d=a[c>>>2]>>>8*(3-c%4),b+="0123456789abcdef".charAt(d>>>4&15)+"0123456789abcdef".charAt(d&15);return e.outputUpper?b.toUpperCase():b}
function v(a,e){var b="",f=4*a.length,c,d,g;for(c=0;c<f;c+=3){g=(a[c>>>2]>>>8*(3-c%4)&255)<<16|(a[c+1>>>2]>>>8*(3-(c+1)%4)&255)<<8|a[c+2>>>2]>>>8*(3-(c+2)%4)&255;for(d=0;4>d;d+=1)b=8*c+6*d<=32*a.length?b+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(g>>>6*(3-d)&63):b+e.b64Pad}return b}
function w(a){var e={outputUpper:!1,b64Pad:"="};try{a.hasOwnProperty("outputUpper")&&(e.outputUpper=a.outputUpper),a.hasOwnProperty("b64Pad")&&(e.b64Pad=a.b64Pad)}catch(b){}"boolean"!==typeof e.outputUpper&&j("Invalid outputUpper formatting option");"string"!==typeof e.b64Pad&&j("Invalid b64Pad formatting option");return e}function x(a,e){var b=(a&65535)+(e&65535);return((a>>>16)+(e>>>16)+(b>>>16)&65535)<<16|b&65535}
function y(a,e,b,f,c){var d=(a&65535)+(e&65535)+(b&65535)+(f&65535)+(c&65535);return((a>>>16)+(e>>>16)+(b>>>16)+(f>>>16)+(c>>>16)+(d>>>16)&65535)<<16|d&65535}
function z(a,e){var b=[],f,c,d,g,h,A,r,i,B,k=[1732584193,4023233417,2562383102,271733878,3285377520],m=[1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1518500249,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,1859775393,
1859775393,1859775393,1859775393,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,2400959708,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782,3395469782];a[e>>>5]|=128<<24-e%32;a[(e+
65>>>9<<4)+15]=e;B=a.length;for(r=0;r<B;r+=16){f=k[0];c=k[1];d=k[2];g=k[3];h=k[4];for(i=0;80>i;i+=1)b[i]=16>i?a[i+r]:(b[i-3]^b[i-8]^b[i-14]^b[i-16])<<1|(b[i-3]^b[i-8]^b[i-14]^b[i-16])>>>31,A=20>i?y(f<<5|f>>>27,c&d^~c&g,h,m[i],b[i]):40>i?y(f<<5|f>>>27,c^d^g,h,m[i],b[i]):60>i?y(f<<5|f>>>27,c&d^c&g^d&g,h,m[i],b[i]):y(f<<5|f>>>27,c^d^g,h,m[i],b[i]),h=g,g=d,d=c<<30|c>>>2,c=f,f=A;k[0]=x(f,k[0]);k[1]=x(c,k[1]);k[2]=x(d,k[2]);k[3]=x(g,k[3]);k[4]=x(h,k[4])}return k}
window.jsSHA=function(a,e,b){var f=null,c=0,d=[0],g=0,h=null,g="undefined"!==typeof b?b:8;8===g||16===g||j("charSize must be 8 or 16");"HEX"===e?(0!==a.length%2&&j("srcString of HEX type must be in byte increments"),h=s(a),c=h.binLen,d=h.value):"ASCII"===e||"TEXT"===e?(h=q(a,g),c=h.binLen,d=h.value):"B64"===e?(h=t(a),c=h.binLen,d=h.value):j("inputFormat must be HEX, TEXT, ASCII, or B64");this.getHash=function(b,a,e){var g=null,h=d.slice(),m="";switch(a){case "HEX":g=u;break;case "B64":g=v;break;default:j("format must be HEX or B64")}if("SHA-1"===
b){null===f&&(f=z(h,c));m=g(f,w(e))}else j("Chosen SHA variant is not supported");return m};this.getHMAC=function(b,a,e,f,h){var m,n,l,C,p,D,E=[],F=[],o=null;switch(f){case "HEX":m=u;break;case "B64":m=v;break;default:j("outputFormat must be HEX or B64")}if("SHA-1"===e){l=64;D=160}else j("Chosen SHA variant is not supported");if("HEX"===a){o=s(b);p=o.binLen;n=o.value}else if("ASCII"===a||"TEXT"===a){o=q(b,g);p=o.binLen;n=o.value}else if("B64"===a){o=t(b);p=o.binLen;n=o.value}else j("inputFormat must be HEX, TEXT, ASCII, or B64");
b=l*8;a=l/4-1;if(l<p/8){"SHA-1"===e?n=z(n,p):j("Unexpected error in HMAC implementation");n[a]=n[a]&4294967040}else l>p/8&&(n[a]=n[a]&4294967040);for(l=0;l<=a;l=l+1){E[l]=n[l]^909522486;F[l]=n[l]^1549556828}"SHA-1"===e?C=z(F.concat(z(E.concat(d),b+c)),b+D):j("Unexpected error in HMAC implementation");return m(C,w(h))}};})();

define("../external/jsSHA/sha1", function(){});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/shims',[], function(){

  /*global self, DOMException, Range */

  // Provide a global console method for browsers that don't always have one
  // available (e.g. IE9).
  if ( !window.console ) {
    window.console = {
      log: function(){},
      warn: function(){},
      debug: function(){},
      info: function(){},
      error: function(){}
    };
  }

  // Shim our access to localStorage incase a browser doesn't support it
  if ( !window.localStorage ) {
    window.localStorage = {
      getItem: function() {},
      setItem: function() {},
      removeItem: function() {}
    };
  }

  /*************************************************************************/
  // Support BrowserID when missing (everyone but Firefox Mobile)
  if ( !navigator.id ) {
    var script = document.createElement( "script" );
    script.src = "https://login.persona.org/include.js";
    script.type = "text/javascript";
    script.setAttribute( "data-butter-exclude", true );
    document.head.appendChild( script );

    // If the BrowserID shim isn't loaded when Cornfield.login tries to use it, then we'll crash
    // This shim will be replaced by the real BrowserID shim when it loads
    navigator.id = {
      _shimmed: true,
      get: function() {}
    };
  }

  /*************************************************************************/
  // Support createContextualFragment when missing (IE9)
  if ( 'Range' in window &&
       !Range.prototype.createContextualFragment ) {

    // Implementation used under MIT License, http://code.google.com/p/rangy/
    // Copyright (c) 2010 Tim Down

    // Implementation as per HTML parsing spec, trusting in the browser's
    // implementation of innerHTML. See discussion and base code for this
    // implementation at issue 67. Spec:
    // http://html5.org/specs/dom-parsing.html#extensions-to-the-range-interface
    // Thanks to Aleks Williams.

    var dom = {
      getDocument: function getDocument( node ) {
        if ( node.nodeType === 9 ) {
          return node;
        } else if ( typeof node.ownerDocument !== "undefined" ) {
          return node.ownerDocument;
        } else if ( typeof node.document !== "undefined" ) {
          return node.document;
        } else if ( node.parentNode ) {
          return this.getDocument( node.parentNode );
        } else {
          throw "No document found for node.";
        }
      },

      isCharacterDataNode: function( node ) {
        var t = node.nodeType;
        // Text, CDataSection or Comment
        return t === 3 || t === 4 || t === 8;
      },

      parentElement: function( node ) {
        var parent = node.parentNode;
        return parent.nodeType === 1 ? parent : null;
      },

      isHtmlNamespace: function( node ) {
        // Opera 11 puts HTML elements in the null namespace,
        // it seems, and IE 7 has undefined namespaceURI
        var ns;
        return typeof node.namespaceURI === "undefined" ||
               ( ( ns = node.namespaceURI ) === null ||
                 ns === "http://www.w3.org/1999/xhtml" );
      },

      fragmentFromNodeChildren: function( node ) {
        var fragment = this.getDocument( node ).createDocumentFragment(), child;
        while ( !!( child = node.firstChild ) ) {
          fragment.appendChild(child);
        }
        return fragment;
      }
    };

    Range.prototype.createContextualFragment = function( fragmentStr ) {
      // "Let node the context object's start's node."
      var node = this.startContainer,
        doc = dom.getDocument(node);

      // "If the context object's start's node is null, raise an INVALID_STATE_ERR
      // exception and abort these steps."
      if (!node) {
        throw new DOMException( "INVALID_STATE_ERR" );
      }

      // "Let element be as follows, depending on node's interface:"
      // Document, Document Fragment: null
      var el = null;

      // "Element: node"
      if ( node.nodeType === 1 ) {
        el = node;

      // "Text, Comment: node's parentElement"
      } else if ( dom.isCharacterDataNode( node ) ) {
        el = dom.parentElement( node );
      }

      // "If either element is null or element's ownerDocument is an HTML document
      // and element's local name is "html" and element's namespace is the HTML
      // namespace"
      if ( el === null ||
           ( el.nodeName === "HTML" &&
             dom.isHtmlNamespace( dom.getDocument( el ).documentElement ) &&
             dom.isHtmlNamespace( el )
           )
         ) {
        // "let element be a new Element with "body" as its local name and the HTML
        // namespace as its namespace.""
        el = doc.createElement( "body" );
      } else {
        el = el.cloneNode( false );
      }

      // "If the node's document is an HTML document: Invoke the HTML fragment parsing algorithm."
      // "If the node's document is an XML document: Invoke the XML fragment parsing algorithm."
      // "In either case, the algorithm must be invoked with fragment as the input
      // and element as the context element."
      el.innerHTML = fragmentStr;

      // "If this raises an exception, then abort these steps. Otherwise, let new
      // children be the nodes returned."

      // "Let fragment be a new DocumentFragment."
      // "Append all new children to fragment."
      // "Return fragment."
      return dom.fragmentFromNodeChildren( el );
    };
  }
  /*************************************************************************/

  /***************************************************************************
   * Cross-browser full element.classList implementation for IE9 and friends.
   * 2011-06-15
   *
   * By Eli Grey, http://purl.eligrey.com/github/classList.js/blob/master/classList.js
   * Public Domain.
   * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
   */

  if (typeof document !== "undefined" && !("classList" in document.createElement("a"))) {
    (function (view) {
      

      var classListProp = "classList",
        protoProp = "prototype",
        elemCtrProto = (view.HTMLElement || view.Element)[protoProp],
        objCtr = Object,
        strTrim = String[protoProp].trim || function () {
          return this.replace(/^\s+|\s+$/g, "");
        },
        arrIndexOf = Array[protoProp].indexOf || function (item) {
          var i = 0,
            len = this.length;
          for (; i < len; i++) {
            if (i in this && this[i] === item) {
              return i;
            }
          }
          return -1;
        },
        // Vendors: please allow content code to instantiate DOMExceptions
        DOMEx = function (type, message) {
          this.name = type;
          this.code = DOMException[type];
          this.message = message;
        },
        checkTokenAndGetIndex = function (classList, token) {
          if (token === "") {
            throw new DOMEx("SYNTAX_ERR", "An invalid or illegal string was specified");
          }
          if (/\s/.test(token)) {
            throw new DOMEx("INVALID_CHARACTER_ERR", "String contains an invalid character");
          }
          return arrIndexOf.call(classList, token);
        },
        ClassList = function (elem) {
          var trimmedClasses = strTrim.call(elem.className),
            classes = trimmedClasses ? trimmedClasses.split(/\s+/) : [],
            i = 0,
            len = classes.length;
          for (; i < len; i++) {
            this.push(classes[i]);
          }
          this._updateClassName = function () {
            elem.className = this.toString();
          };
        },
        classListProto = ClassList[protoProp] = [],
        classListGetter = function () {
          return new ClassList(this);
        };

      // Most DOMException implementations don't allow calling DOMException's toString()
      // on non-DOMExceptions. Error's toString() is sufficient here.
      DOMEx[protoProp] = Error[protoProp];
      classListProto.item = function (i) {
        return this[i] || null;
      };
      classListProto.contains = function (token) {
        token += "";
        return checkTokenAndGetIndex(this, token) !== -1;
      };
      classListProto.add = function (token) {
        token += "";
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.push(token);
          this._updateClassName();
        }
      };
      classListProto.remove = function (token) {
        token += "";
        var index = checkTokenAndGetIndex(this, token);
        if (index !== -1) {
          this.splice(index, 1);
          this._updateClassName();
        }
      };
      classListProto.toggle = function (token) {
        token += "";
        if (checkTokenAndGetIndex(this, token) === -1) {
          this.add(token);
        } else {
          this.remove(token);
        }
      };
      classListProto.toString = function () {
        return this.join(" ");
      };

      if (objCtr.defineProperty) {
        var classListPropDesc = {
          get: classListGetter,
          enumerable: true,
          configurable: true
        };
        try {
          objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
        } catch (ex) { // IE 8 doesn't support enumerable:true
          if (ex.number === -0x7FF5EC54) {
            classListPropDesc.enumerable = false;
            objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
          }
        }
      } else if (objCtr[protoProp].__defineGetter__) {
        elemCtrProto.__defineGetter__(classListProp, classListGetter);
      }
    }(self));
  }
  /***************************************************************************/

  return;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/eventmanager', [], function(){

  /**
   * EventManagerWrapper - an event queue wrapper
   *
   * Takes an object `object` and extends it with methods necessary to
   * allow object to become an event source.  Other objects can register
   * event listeners with an event source, and have their callback invoked
   * when an event occurs.  Event sources can also be used to dispatch
   * events to registered listeners.
   *
   * To create an event source, pass an object to EventManagerWrapper:
   *
   *    var o = new SomeObject();
   *    EventManagerWrapper( someObject );
   *    o.listen( "some-event", function(){...} );
   *    ...
   *    o.dispatch( "some-event", data );
   *
   * By default, all event dispatching is done asynchronously, meaning
   * calls to dispatch() return immediately, and callbacks are executed
   * later.
   *
   * Event source objects wrapped with EventManagerWrapper have the
   * following methods attached:
   *
   * 1. object.listen( eventName, listener )
   *
   *    eventName [String] - the name of an event to listen for
   *    listener  [Function] - a callback function to execute
   *
   *    Register a new listener with the object.  The listener callback
   *    should accept an argument `e`, which is an event containing:
   *    type [String], target [Object], and data [Object].
   *
   * 2. object.unlisten( eventName, listener )
   *
   *    eventName [String] - the name of an event
   *    listener  [Function] - the callback previously registered or null
   *
   *    Unregister an existing listener, or remove all listeners for a given
   *    event name.  The listener callback should be the one you used in
   *    a previous call to listen.  If you supply no listener argument, all
   *    listeners for the `eventName` event will be removed.
   *
   * 3. object.dispatch( eventName, eventData )
   *
   *    eventName [String] - the name of an event to dispatch
   *    eventData [Object] - an object to attach to the event's `data` property
   *
   *    Dispatch takes an `eventName` and creates a new event object, using
   *    `eventData` as its data property.  It then invokes any and all listeners
   *    which were previously registered with `listen`.
   *
   * 4. object.chain( eventManagerWrappedObject, events )
   *
   *    eventManagerWrappedObject [Object] - an object wrapped by EventManagerWrapper
   *    events [Array] - an array of event names [String]
   *
   *    Chain allows the events of one event source to be chained to another,
   *    such that dispatching an event through one will also cause it to invoke
   *    listeners on the other.  This is a form of event bubbling.
   *
   * 5. object.unchain( eventManagerWrappedObject, events )
   *
   *    eventManagerWrappedObject [Object] - an object wrapped by EventManagerWrapper
   *    events [Array] - an array of event names [String]
   *
   *    Unchain allows one event source to be unchained from from another,
   *    which was previously chained using `chain`.
   **/

  /**
   * Class: ButterEvent
   *
   * An event to propagate within Butter which holds and protects data about the event
   * instance. Propagation of the event can be stopped in the same manner as DOM events:
   * by calling event.stopPropagation inside a handler, the dispatch loop will be
   * interrupted.
   *
   * @param {String} type: Event type. Usually specified by a call to `object.dispatch`.
   * @param {Object} target: The event target. Usually the object which dispatched the event.
   * @param {*} data: Optional. Data to accompany the event.
   */
  function ButterEvent( type, target, data ) {
    var _propagationStopped = false;

    Object.defineProperties( this, {
      type: {
        value: type
      },
      target: {
        value: target
      },
      data: {
        value: data
      },
      propagationStopped: {
        get: function() {
          return _propagationStopped;
        }
      }
    });

    /**
     * Member: stopPropagation
     *
     * Stops the propagation of this event during a dispatch. As a side-effect
     * _propagationStopped is set to true and cannot be reset, thus notifying
     * external bodies that the event dispatch should halt.
     */
    this.stopPropagation = function() {
      _propagationStopped = true;
    };

    this.clone = function() {
      return new ButterEvent( type, target, data );
    };
  }

  /**
   * Static, shared functions for all event source wrapped objects.
   **/
  function __isWrapped( object ){
    return object.listen && object.unlisten;
  }

  function __chain( a, b, events ){
    if( !__isWrapped(b) ){
      throw "Error: Object is not a valid event source: " + b;
    }

    var i = events.length;
    while( i-- ){
      // Hook event directly to dispatch function so that new
      // event object is not generated, simply propagated further.
      b.listen( events[ i ], a.dispatch );
    }
  }

  function __unchain( a, b, events ){
    if( !__isWrapped(b) ){
      throw "Error: Object is not a valid event source: " + b;
    }

    var i = events.length;
    while( i-- ){
      b.unlisten( events[ i ], a.dispatch );
    }
  }

  function __invoke( eventName, listeners, butterEvent ){
    var these, i;

    if( listeners[ eventName ] ){
      these = listeners[ eventName ].slice();
      i = these.length;
      // Progress through the loop of listeners until there are no more or until
      // the propagationStopped flag has been raised.
      while( i-- && !butterEvent.propagationStopped ){
        these[ i ]( butterEvent );
      }
    }
  }

  function __dispatch( target, namespace, event, eventData ){
    var customEvent, butterEvent,
        namespacedEventName, eventName;

    if ( event instanceof ButterEvent ) {
      // If an old event object was passed in, don't re-use it; clone it
      // instead to provide a fresh slate (e.g. propagation flag is reset).
      butterEvent = event.clone();
      eventName = butterEvent.type;
    } else if ( typeof( event ) === "string" ) {
      // Otherwise, create a new event object from parameters to initialize dispatch process.
      butterEvent = new ButterEvent( event + "", target, eventData );
      eventName = event;
    }
    else {
      // Protect from the use of object literals or other objects passed in as re-dispatched events.
      throw "Invalid event dispatch parameters.";
    }

    namespacedEventName = namespace + eventName;

    // Create custom DOM event and dispatch it.
    customEvent = document.createEvent( "CustomEvent" );
    customEvent.initCustomEvent( namespacedEventName, false, false, butterEvent );
    document.dispatchEvent( customEvent );
  }

  function __listen( o, namespace, eventName, listener, listeners, handler ){
    var i, namespacedEventName;

    if( typeof( eventName ) === "object" ){
      for( i in eventName ){
        if( eventName.hasOwnProperty( i ) ){
          o.listen( i, eventName[ i ] );
        }
      }
    } else {
      namespacedEventName = namespace + eventName;

      // If there are no listeners yet for `eventName`, create a place to store them
      // and add a DOM event listener to the document. Note that `handler` is the
      // specified event handler, not listener, since we call all listeners in a loop
      // in JS, relying on DOM events only for the initial dispatch/handle.
      if( !listeners[ namespacedEventName ] ){
        listeners[ namespacedEventName ] = [];
        document.addEventListener( namespacedEventName, handler, false );
      }

      // Add the listener to the list so that it's called when a dispatch occurs.
      listeners[ namespacedEventName ].push( listener );
    }
  }

  function __unlisten( o, namespace, eventName, listener, listeners, handler ){
    var these, idx, i,
        namespacedEventName = namespace + eventName;

    if( typeof( eventName ) === "object" ){
      for( i in eventName ){
        if( eventName.hasOwnProperty( i ) ){
          o.unlisten( i, eventName[ i ] );
        }
      }
    } else {
      these = listeners[ namespacedEventName ];
      if ( !these ){
        return;
      }

      if ( !listener ) {
        throw "Removing listeners without specifying a listener explicitly is prohibited. Please remove listeners directly.";
      }

      idx = these.indexOf( listener );
      if ( idx > -1 ){
        these.splice( idx, 1 );
      }

      // If no listeners exist in the pool any longer, remove the pool and the
      // DOM event listener.
      if ( these.length === 0 ){
        delete listeners[ namespacedEventName ];
        document.removeEventListener( namespacedEventName, handler, false );
      }
    }
  }

  var __seed = Date.now();

  /**
   * EventManagerWrapper objects maintain a few internal items.
   * First, a list of listeners is kept for this object's events.
   * Second, all event names are namespaced so there is no
   * leakage into other event sources.  Third, an event handler
   * is created, which has access to the appropriate listeners.
   **/
  function EventManagerWrapper( object ){

    if ( !object || __isWrapped( object) ){
      return;
    }

    var
        // A list of listeners, keyed by namespaced event name.
        _listeners = {},

        // A unique namespace for events to avoid collisions. An
        // event name "event" with namespace "butter-1336504666771:"
        // would become "butter-1336504666771:event".
        _namespace = "butter-" + __seed++ + ":",

        // An event handler used to invoke listeners, with scope
        // such that it can get at *this* object's listeners.
        _handler = function( domEvent ){
          __invoke( domEvent.type, _listeners, domEvent.detail );
        };

    // Thin wrapper around calls to static functions

    object.chain = function( eventManagerWrappedObject , events ){
      __chain( this, eventManagerWrappedObject, events );
    };

    object.unchain = function( eventManagerWrappedObject, events ){
      __unchain( this, eventManagerWrappedObject, events );
    };

    object.dispatch = function( eventName, eventData ){
      __dispatch( this, _namespace, eventName, eventData, _listeners );
    };

    object.listen = function( eventName, listener ){
      __listen( this, _namespace, eventName , listener, _listeners, _handler );
    };

    object.unlisten = function( eventName, listener ){
      __unlisten( this, _namespace, eventName, listener, _listeners, _handler );
    };

    return object;
  }

  return {
    extend: EventManagerWrapper
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function( undefined ) {

  // By default, logging is off.
  var __debug = false;

  /**
   * Module: Logger
   *
   * Supplies customized logging functionality to Butter.
   */
  define('core/logger', [], function() {

    /**
     * Class: Logger
     *
     * Controls logging for a specific object instance.
     *
     * @param {String} name: Name of the object to report in the log.
     */
    function Logger( name ) {

      /**
       * Member: log
       *
       * Logs a message to the console prefixed by the given name.
       *
       * @param {String} message: Contents of the log message
       */
      this.log = function( message ) {
        if ( __debug ) {
          console.log( "[" + name + "] " + message );
        }
      };

      /**
       * Member: error
       *
       * Throws an error with the given message prefixed by the given name.
       *
       * @param {String} message: Contents of the error
       * @throws: Obligatory, since this is an error
       */
      this.error = function( message ) {
        if ( __debug ) {
          throw new Error( "[" + name + "] " + message );
        }
      };

    }

    /**
     * Class Function: enabled
     *
     * Whether the logger is enabled or not.
     *
     * @param {Boolean} value: State of the logger.
     */
    Logger.enabled = function( value ) {
      if ( value !== undefined ) {
        __debug = !!value;
      }
      return __debug;
    };

    return Logger;
  });

}());

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function( undefined ) {

  /**
   * Shared config for all Configuration instances, keyed on configID below
   */
  var __config = {};

  /**
   * Configuration IDs go from 1..n, and are used to key __config
   */
  var __id = 0;

  /**
   * Variables allowed in config files.  Variables take the form:
   *
   * "foo": "value",
   * "bar": "{{foo}}"
   *
   * The name of the variable is enclosed in {{..}} when used.
   * A defaultValue can be specified as well as a validate()
   * function, to validate/clean values when being set.
   */
  var __variables = {

    // The base-dir prefix used in paths, often something like ../
    "baseDir": {
      name: "{{baseDir}}",
      defaultValue: "./",
      validate: function( value ){
        // Make sure value ends in a trailing /
        return value.replace( /\/?$/, '/' );
      }
    }

  };

  /**
   * Validates any variable value being set, for example,
   * making sure paths end in '/'.
   */
  function __validateVariable( property, value ){
    var variable = __variables[ property ];

    if( !( variable && variable.validate ) ){
      return value;
    }

    return variable.validate( value );
  }

  /**
   * Replace any variable {{foo}} with the value of "foo" from the config.
   */
  function __replaceVariable( value, config ){
    if( value === undefined ){
      return value;
    }

    var newValue = value,
        variable,
        configValue,
        substitution;

    for( var variableName in __variables ){
      if( __variables.hasOwnProperty( variableName ) ){
        variable = __variables[ variableName ];
        configValue = config[ variableName ];
        substitution = configValue ? configValue : variable.defaultValue;
        newValue = newValue.replace ?
          newValue.replace( variable.name, substitution, "g" ) :
          newValue;
      }
    }

    return newValue;
  }

  /**
   * Replace any variable {{foo}} with the value of "foo" down a property
   * branch.
   */
  function __replaceVariableBranch( property, config ){
    if( property === undefined ){
      return property;
    }

    for( var propName in property ){
      if( property.hasOwnProperty( propName ) ){
        if( typeof property[ propName ] === "object" ){
          property[ propName ] = __replaceVariableBranch( property[ propName ], config );
        } else {
          property[ propName ] = __replaceVariable( property[ propName ], config );
        }
      }
    }

    return property;
  }

  /**
   * Module: Config
   *
   * Manages configuration info for the app.
   */
  define('core/config', [], function() {

    /**
     * Class: Configuration
     *
     * Manages access to config properties, doing variable substitution.
     *
     * @param {String} configID: A unique ID for this config, used as key into __config.
     * @param {Object} configObject: A parsed config object, see config.parse().
     * @throws config is not a parsed object (e.g., if string is passed).
     */
    function Configuration( configID, configObject ) {

      // Constructor should be called by Config.parse()
      if (typeof configObject !== "object"){
        throw "Config Error: expected parsed config object";
      }

      // Register configuration info centrally
      __config[ configID ] = configObject;

      /**
       * Member: value
       *
       * Gets or overrides the value of a config property, doing
       * variable replacement as needed. If only one argument is passed,
       * the name of a property, the value is returned. If two arguments
       * are passed, the second is used in order to override the property's
       * value. If a known variable is overriden, its validate() method
       * is called (if any). The value is returned in both cases.
       *
       * @param {String} property: The config property to get.
       * @param {Object} newValue: [Optional] A new value to use.
       */
      this.value = function( property, newValue ){
        var configValue;

        if( newValue !== undefined ){
          configObject[ property ] = __validateVariable( property, newValue );
        }

        // If we're giving back a property branch, replace values deep before
        // handing it back to the user.
        configValue = configObject[ property ];
        if( typeof configValue === "object" ){
          return __replaceVariableBranch( configValue, configObject );
        } else {
          return __replaceVariable( configValue, configObject );
        }
      };

      /**
       * Member: override
       *
       * Overrides this Configuration object's top-level config with values
       * in another, leaving any values in this object alone which aren't
       * in the other. You typically override a default configuration with
       * a user's extra settings.
       */
      this.override = function( configuration ){
        var configA = configObject,
            configB = __config[ configuration.id ];

        for( var propName in configB ){
          if( configB.hasOwnProperty( propName ) ){
            configA[ propName ] = configB[ propName ];
          }
        }
      };

      /**
       * Member: id
       *
       * An internal-use getter for keying config information.
       */
      Object.defineProperty( this, "id", { get: function(){ return configID; } } );
    }

    /**
     * Class: Config
     *
     * Manages creation of Configuration objects
     */
    var Config = {

      /**
       * Member: parse
       *
       * Parses a JSON config string, creating a Configuration object.
       *
       * @param {String} configJSON: The config's JSON string.
       * @throws JSON is malformed or otherwise can't be parsed.
       */
      parse: function( configJSON ){
        try {
          var config = JSON.parse( configJSON );
          return new Configuration( "config-" + __id++, config );
        } catch( e ){
          throw "Config.parse Error: unable to parse config string. Error was: " + e.message;
        }
      },
      
      /**
       * Member: reincarnate
       *
       * Constructs a Configuration object based on a JSON object.
       *
       * @param {Object} configObj: The config JSON object.
       */
      reincarnate: function( configObj ){
        return new Configuration( "config-" + __id++, configObj );
      }
    };

    return Config;
  });

}());

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/observer',[], function(){

  /**
   * Notification
   *
   * A Notification object is passed to subscribers when a notification occurs. It
   * describes the notification, encompassing references to the notification origin,
   * the name of the notification, and some data to assist. Notifications can be
   * cancelled by calling the `cancel` function, and a reason can be specified to
   * pass on to the body which issued the notification.
   *
   * @param {Object} origin: The object which issued the notification.
   * @param {String} type: The type of notification.
   * @param {Object} data: Arbitrary data to associate with the notification.
   */
  function Notification( origin, type, data ) {
    var _cancelledReason;

    /**
     * cancel
     *
     * Cancels a notification and records a reason for doing so.
     *
     * @param {String} reason: The reason for canceling the notification.
     */
    this.cancel = function( reason ) {
      _cancelledReason = reason || true;
    };

    Object.defineProperties( this, {
      origin: {
        value: origin,
        enumerable: true
      },
      type: {
        value: type,
        enumerable: true
      },
      data: {
        value: data,
        enumerable: true
      },
      cancelledReason: {
        enumerable: true,
        get: function() {
          return _cancelledReason;
        }
      },
      cancelled: {
        enumerable: true,
        get: function() {
          return !!_cancelledReason;
        }
      }
    });
  }

  /**
   * __subscribe
   *
   * A class function which adds a subscriber to a group of subscribers
   * corresponding to a given notification type.
   *
   * @param {String} type: The type of notification that the given subscriber should receive.
   * @param {Function} subscriber: A function which will be called when notification occurs.
   * @param {Object} subscriberDict: The group of subscribers for an object.
   */
  function __subscribe( type, subscriber, subscriberDict ) {
    if ( !subscriberDict[ type ] ) {
      subscriberDict[ type ] = [];
    }
    subscriberDict[ type ].push( subscriber );
  }

  /**
   * __unsubscribe
   *
   * A class function which removes a subscriber from a group of subscribers
   * corresponding to a given notification type.
   *
   * @param {String} type: The type of notification that the given subscriber was set up to receive.
   * @param {Function} subscriber: A function which will be called when notification occurs.
   * @param {Object} subscriberDict: The group of subscribers for an object.
   */
  function __unsubscribe( type, subscriber, subscriberDict ) {
    var idx, subscribers = subscriberDict[ type ];

    if ( subscribers ) {
      idx = subscribers.indexOf( subscriber );
      if ( idx > -1 ) {
        subscribers.splice( idx, 1 );
      }
    }
  }

  /**
   * __notify
   *
   * A class function which calls all the subscribers of a given notification type.
   *
   * @param {String} type: The type of notification identifying a group of subscribers.
   * @param {Function} subscriber: A function which will be called when notification occurs.
   * @param {Object} subscriberDict: The group of subscribers for an object.
   * @param {Object} object: The object issuing the notification.
   */
  function __notify( type, data, subscriberDict, object ) {
    var i, l,
        subscribers = subscriberDict[ type ],
        notification = new Notification( object, type, data );

    if ( subscribers ) {
      for ( i = 0, l = subscribers.length; i < l; ++i ) {
        subscribers[ i ]( notification );
        if ( notification.cancelled ) {
          break;
        }
      }
    }

    return notification;
  }

  /**
   * extendObject
   *
   * Gives an object the functionality to record and notify subscribers for typed notifications
   * (simple implementation of Observer pattern).
   *
   * @param {Object} object: The object to extend with Observer functionality.
   */
  function extendObject( object ) {
    var _subscribers = {};

    if ( object.subscribe ) {
      throw "Object already has Observer properties.";
    }

    object.subscribe = function( type, subscriber ) {
      __subscribe( type, subscriber, _subscribers );
    };

    object.unsubscribe = function( type, subscriber ) {
      __unsubscribe( type, subscriber, _subscribers );
    };

    object.notify = function( type, data ) {
      return __notify( type, data, _subscribers, object );
    };
  }

  return {
    extend: extendObject
  };

});
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/lang', [], function(){

  var DEFAULT_TRANSITION_TIMEOUT = 15;

  var TRANSFORM_PROPERTY = (function(){
    var div = document.createElement( "div" );
    var choices = "Webkit Moz O ms".split( " " ).map( function( prefix ) { return prefix + "Transform"; } );

    for ( var i = choices.length; i >= 0; --i ) {
      if ( div.style[ choices[ i ] ] !== undefined ) {
        return choices[ i ];
      }
    }

    return "transform";
  }());

  /**
   * HTML escape code from mustache.js, used under MIT Licence
   * https://github.com/janl/mustache.js/blob/master/mustache.js
   **/
  var escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
  };

  return {

    // Escape HTML string so it is suitable for use in dom text
    escapeHTML: function( str ) {
      return String( str ).replace( /&(?!\w+;)|[<>"']/g, function ( s ) {
        return escapeMap[ s ] || s;
      });
    },

    extend: function ( obj /* , extra arguments ... */) {
      var dest = obj, src = [].slice.call( arguments, 1 );
      src.forEach( function( copy ) {
        for( var prop in copy ){
          if( copy.hasOwnProperty( prop ) ){
            dest[ prop ] = copy[ prop ];
          }
        }
      });
    }, //extend

    // Convert an SMPTE timestamp to seconds
    smpteToSeconds: function( smpte ){
      var t = smpte.split( ":" );
      if( t.length === 1 ){
        return parseFloat( t[ 0 ], 10 );
      }
      if( t.length === 2 ){
        return parseFloat( t[ 0 ], 10 ) + parseFloat( t[ 1 ] / 12, 10 );
      }
      if( t.length === 3 ){
        return parseInt( t[ 0 ] * 60, 10 ) + parseFloat( t[ 1 ], 10 ) + parseFloat( t[ 2 ] / 12, 10 );
      }
      if( t.length === 4 ){
        return parseInt( t[ 0 ] * 3600, 10 ) + parseInt( t[ 1 ] * 60, 10 ) + parseFloat( t[ 2 ], 10 ) + parseFloat( t[ 3 ] / 12, 10 );
      }
    }, //smpteToSeconds

    secondsToSMPTE: function( time ){
      var timeStamp = new Date( 1970, 0, 1 ),
          seconds;
      timeStamp.setSeconds( time );
      seconds = timeStamp.toTimeString().substr( 0, 8 );
      if( seconds > 86399 ){
        seconds = Math.floor( (timeStamp - Date.parse("1/1/70") ) / 3600000) + seconds.substr(2);
      }
      return seconds;
    }, //secondsToSMPTE

    clone: function( obj ) {
      var newObj = {};
      for ( var prop in obj ) {
        if ( obj.hasOwnProperty( prop ) ) {
          newObj[ prop ] = obj[ prop ];
        } //if
      } //for
      return newObj;
    },

    // Fill in a given object with default properties.  Based on underscore (MIT License).
    // https://github.com/documentcloud/underscore/blob/master/underscore.js
    defaults: function( obj, source ){
      for( var prop in source ){
        if( obj[ prop ] === undefined ){
          obj[ prop ] = source[ prop ];
        }
      }
      return obj;
    },

    domFragment: function( inputString, immediateSelector ) {
      var range = document.createRange(),

          // For particularly speedy loads, 'body' might not exist yet, so try to use 'head'
          container = document.body || document.head,
          fragment,
          child;

      range.selectNode( container );
      fragment = range.createContextualFragment( inputString );

      // If immediateSelector was specified, try to use it to find a child node of the fragment
      // and return it.
      if( immediateSelector ){
        child = fragment.querySelector( immediateSelector );
        if ( child ) {
          // Opera appends children to the <body> in some cases, so the parentNode might not be `fragment` here.
          // So, remove it from whatever its attached to, since it was spawned right here.
          // Note: should be `fragment.removeChild( child );`
          child.parentNode.removeChild( child );
          return child;
        }
      }

      return fragment;
    },

    applyTransitionEndListener: (function() {
      var div = document.createElement( "div" ),
          p,
          pre = [ "OTransition", "webkitTransition", "MozTransition", "transition" ];

      // Check for CSS3 Transition support
      /*jshint loopfunc:true */
      for ( p in pre ) {
        if ( div.style[ pre[ p ] ] !== undefined ) {
          return function( element, listener ) {
            element.addEventListener( "transitionend", listener, false );
            element.addEventListener( "oTransitionEnd", listener, false );
            element.addEventListener( "webkitTransitionEnd", listener, false );
          };
        }
      }
      /*jshint loopfunc:false */

      // Fallback on setTimeout
      return function( element, listener ) {

        // If there was already a timeout waiting on this element, remove it.
        var currentTimeout = element.getAttribute( "data-butter-transition-end" );
        if ( typeof currentTimeout === "string" && currentTimeout !== "" ) {
          clearTimeout( currentTimeout | 0 );
        }

        // Set a timeout which will clear the `data-butter-transition-end` by itself and call the listener when it expires.
        currentTimeout = setTimeout( function() {
          element.removeAttribute( "data-butter-transition-end" );
          listener.apply( this, arguments );
        } , DEFAULT_TRANSITION_TIMEOUT );

        // Add the `data-butter-transition-end` attribute to the element with the value of currentTimeout.
        element.setAttribute( "data-butter-transition-end", currentTimeout );
      };
    }()),

    removeTransitionEndListener: function( element, listener ) {
      element.removeEventListener( "transitionend", listener, false );
      element.removeEventListener( "oTransitionEnd", listener, false );
      element.removeEventListener( "webkitTransitionEnd", listener, false );
    },

    setTransformProperty: function( element, transform ) {
      element.style[ TRANSFORM_PROPERTY ] = transform;
    },

    getTransformProperty: function( element ) {
      return element.style[ TRANSFORM_PROPERTY ];
    }
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/time', [], function(){

  var __timeAccuracy = 5;

  /**
   * Member: roundTime
   *
   * Rounds a number to a set accuracy
   * Accuracy of 5:
   * 1.012345 -> 1.01234
   * Accuracy of 2:
   * 1.012345 -> 1.01
   *
   * @param {Number} time: Time which will be rounded
   * @param {Number} accuracy: A one time accuracy to round to
   */
  function roundTime( time, accuracy ){
    accuracy = accuracy >= 0 ? accuracy : __timeAccuracy;
    return Math.round( time * ( Math.pow( 10, accuracy ) ) ) / Math.pow( 10, accuracy );
  }

  /**
   * Member: toSeconds
   *
   * toSeconds converts a timecode string to seconds.
   * "HH:MM:SS.DD" -> seconds
   * examples:
   * "1:00:00" -> 3600
   * "-1:00:00" -> -3600
   * it also converts strings with seconds to seconds
   * " 003600.00" -> 3600
   * " 003600.99" -> 3600.99
   *
   * @param {String} time: Timecode to be converted to seconds
   */
  function toSeconds( time ) {
    var splitTime,
        seconds,
        minutes,
        hours,
        isNegative = 1;

    if ( typeof time === "number" ) {
      return time;
    }

    if ( typeof time !== "string" ) {
      return 0;
    }

    time = time.trim();
    if ( time.substring( 0, 1 ) === "-" ) {
      time = time.replace( "-", "" );
      isNegative = -1;
    }

    splitTime = time.split( ":" );
    seconds = +splitTime[ splitTime.length - 1 ] || 0;
    minutes = +splitTime[ splitTime.length - 2 ] || 0;
    hours = +splitTime[ splitTime.length - 3 ] || 0;

    seconds += hours * 3600;
    seconds += minutes * 60;

    return seconds * isNegative;
  }

  /**
   * Member: toTimecode
   *
   * toTimecode converts seconds to a timecode string.
   * seconds -> "HH:MM:SS.DD"
   * examples:
   * 3600 -> "1:00:00"
   * -3600 -> "-1:00:00"
   * it also converts strings to timecode
   * "  00:00:01" -> "1"
   * "  000:01:01.00" -> "1:01"
   * "3600" -> "1:00:00"
   *
   * @param {Number} time: Seconds to be converted to timecode
   */
  function toTimecode( time ){
    var hours,
        minutes,
        seconds,
        timeString,
        isNegative = "";

    if ( typeof time === "string" ) {
      time = toSeconds( time );
    }

    if ( typeof time !== "number" ) {
      return 0;
    }

    if ( time < 0 ) {
      isNegative = "-";
      time = -time;
    }

    hours = Math.floor( time / 3600 );
    minutes = Math.floor( ( time % 3600 ) / 60 );
    seconds = roundTime( time % 60, 2 );
    timeString = seconds + "";

    if ( !minutes && !hours ) {
      return isNegative + timeString;
    }

    if ( !seconds ) {
      timeString = ":00";
    } else if ( seconds < 10 ) {
      timeString = ":0" + seconds;
    } else {
      timeString = ":" + timeString;
    }

    if ( !minutes ) {
      timeString = "00" + timeString;
    } else if ( hours && minutes < 10 ) {
      timeString = "0" + minutes + timeString;
    } else {
      timeString = minutes + timeString;
    }

    if ( hours ) {
      timeString = hours + ":" + timeString;
    }

    return isNegative + timeString;
  }

  /**
   * Member: toPrettyString
   *
   * toPrettyString converts a time in ms to something pretty for display.
   *
   * Examples:
   * 12341 -> "less than a minute"
   * 123411 -> "2 minutes"
   * 123411234 -> "10 hours"
   * 1234112341 -> "14 days"
   *
   * @param {Number} ms: A number of ms
   */
  function toPrettyString( ms ) {
    var round = Math.round,
        t, seconds, minutes, hours, days;

    t = ms / 1000;
    seconds = round( t % 60 );
    t /= 60;
    minutes = round( t % 60 );
    t /= 60;
    hours = round( t % 24 );
    t /= 24;
    days = round( t );

    if( days >= 1 ) {
      return "" + days + ( days === 1 ? " day" : " days" );
    } else if( hours >= 1 ) {
      return "" + hours + ( hours === 1 ? " hour" : " hours" );
    } else if( minutes >= 1 ) {
      return "" + minutes + ( minutes === 1 ? " minute" : " minutes" );
    } else {
      return "less than a minute";
    }
  }

  var utils = {
    roundTime: roundTime,
    toSeconds: toSeconds,
    toTimecode: toTimecode,
    toPrettyString: toPrettyString
  }; //utils

  Object.defineProperties( utils, {
    timeAccuracy: {
      enumerable: true,
      get: function(){
        return __timeAccuracy;
      },
      set: function( val ){
        __timeAccuracy = val;
      }
    }
  });

  return utils;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('util/scroll-group', [], function() {

  function ScrollGroup( scrollElement ) {
    this.scrollDiff = [ 0, 0 ];
    this.scrollOrigin = [ 0, 0 ];
    this.boundingClientRect = null;
    this.scrollElement = scrollElement;
    this.iterationScrollX = 0;
    this.iterationScrollY = 0;
  }

  ScrollGroup.prototype.updateBounds = function() {
    this.scrollOrigin[ 0 ] = this.scrollElement.scrollLeft;
    this.scrollOrigin[ 1 ] = this.scrollElement.scrollTop;
    this.boundingClientRect = this.scrollElement.getBoundingClientRect();
  };

  ScrollGroup.prototype.processIteration = function() {
    this.scrollElement.scrollLeft += this.iterationScrollX;
    this.scrollElement.scrollTop += this.iterationScrollY;
    this.scrollDiff[ 0 ] = this.scrollElement.scrollLeft - this.scrollOrigin[ 0 ];
    this.scrollDiff[ 1 ] = this.scrollElement.scrollTop - this.scrollOrigin[ 1 ];
    this.iterationScrollX = 0;
    this.iterationScrollY = 0;
  };

  function NullScrollGroup() {
    ScrollGroup.call( this, arguments );
  }

  NullScrollGroup.prototype = Object.create( ScrollGroup );

  NullScrollGroup.prototype.update = function() {};

  return {
    ScrollGroup: ScrollGroup,
    NullScrollGroup: NullScrollGroup
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/dragndrop', [ "core/eventmanager", "util/lang", "util/scroll-group" ],
  function( EventManager, LangUtils, ScrollGroup ) {

  var SCROLL_INTERVAL = 16,
      DEFAULT_SCROLL_AMOUNT = 10,
      SCROLL_WINDOW = 10,
      MIN_SCROLL_ELEMENT_ONSCREEN_HEIGHT = 50,
      MIN_SCROLL_ELEMENT_ONSCREEN_WIDTH = 10,
      MAXIMUM_Z_INDEX = 2147483647,
      MIN_WIDTH = 15,
      RESIZABLE_CLASS = "butter-resizable";

  var NULL_FUNCTION = function() {};

  var DEFAULT_ONSTOP_DRAGGABLE_FUNCTION = function() { return false; };

  var __droppables = [],
      __mouseDown = false,
      __selectedDraggables = [],
      __mousePos = [ 0, 0 ],
      __mouseLast = [ 0, 0 ],
      __scroll = false,
      __helpers = [],
      __scrollGroups = [],
      __nullScrollGroup = new ScrollGroup.NullScrollGroup();

  // for what seems like a bug in chrome. :/
  // dataTransfer.getData seems to report nothing
  var __currentDraggingHelper;

  var __nullRect = {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  };

  var DragNDrop = {};

  function __getScrollGroup( scrollElement ) {
    var i, newScrollGroup;

    if ( scrollElement ) {
      for ( i = __scrollGroups.length - 1; i >= 0; --i ) {
        if ( __scrollGroups[ i ].scrollElement === scrollElement ) {
          return __scrollGroups[ i ];
        }
      }
      newScrollGroup = new ScrollGroup.ScrollGroup( scrollElement );
      __scrollGroups.push( newScrollGroup );
      return newScrollGroup;
    }
    else {
      return __nullScrollGroup;
    }
  }

  function __draggableUpdateTimeout() {
    var i, j,
        draggables = __selectedDraggables,
        draggable,
        droppable;

    __scroll = false;

    if ( __mouseDown ) {
      for ( i = __selectedDraggables.length - 1; i >= 0; --i ) {
        __selectedDraggables[ i ].update();
      }
      for ( i = __scrollGroups.length - 1; i >= 0; --i ) {
        __scrollGroups[ i ].processIteration();
      }

      for ( i = draggables.length - 1; i >= 0; --i ) {
        draggable = draggables[ i ];
        draggable.drag();
        for ( j = __droppables.length - 1; j >= 0; --j ) {
          droppable = __droppables[ j ];
          if ( draggable.element === droppable.element ||
              !droppable.drag( draggable.element.getBoundingClientRect() ) ) {
            droppable.forget( draggable );
          }
          else {
            // If we stumbled on a valid droppable early in the array
            // and the draggable has a droppable already that is, perhaps
            // further along in the array, forcefully forget the draggable
            // before telling another droppable to remember it.
            if ( draggable.droppable && draggable.droppable !== droppable ) {
              draggable.droppable.forget( draggable );
            }
            droppable.remember( draggable );
            break;
          }
        }
      }

      window.setTimeout( __draggableUpdateTimeout, SCROLL_INTERVAL );
    }
  }

  function __onWindowDragStart( e ) {
    e.preventDefault();
  }

  function __onDraggableDragged( e ) {
    e.preventDefault();

    __mouseLast[ 0 ] = __mousePos[ 0 ];
    __mouseLast[ 1 ] = __mousePos[ 1 ];
    __mousePos = [ e.clientX, e.clientY ];

    var draggables = __selectedDraggables,
        i;

    // If this is the first drag iteration, update bounding rects
    if ( !__mouseDown ) {
      __mouseDown = true;

      for ( i = __scrollGroups.length - 1; i >= 0; --i ) {
        __scrollGroups[ i ].updateBounds();
      }

      for ( i = draggables.length - 1; i >= 0; --i ) {
        draggables[ i ].start( e );
      }

      __draggableUpdateTimeout();

      // Prevent drags from happening while we're dragging around objects, since
      // it's not an HTML5 drag and it'll interfere.
      window.addEventListener( "dragstart", __onWindowDragStart, false );

      DragNDrop.dispatch( "dragstarted" );
    }
  }

  function __onDraggableMouseUp() {
    window.removeEventListener( "dragstart", __onWindowDragStart, false );
    window.removeEventListener( "mousemove", __onDraggableDragged, false );
    window.removeEventListener( "mousemove", __onDraggableMouseUp, false );

    if ( !__mouseDown ) {
      return;
    }

    DragNDrop.dispatch( "dragstopped" );

    __mouseDown = false;

    var selectedDraggable,
        selectedDraggables = __selectedDraggables.slice(),
        droppables = [],
        droppable,
        i;

    // Collect all the droppables
    for ( i = selectedDraggables.length - 1; i >= 0; --i ) {
      selectedDraggable = selectedDraggables[ i ];
      droppable = selectedDraggable.droppable;
      if ( droppable && droppables.indexOf( droppable ) === -1 ) {
        droppables.push( droppable );
      }
    }

    // Let droppable know that it's about to receive one or more items
    for ( i = droppables.length - 1; i >= 0; --i ) {
      droppables[ i ].startDrop();
    }

    for ( i = selectedDraggables.length - 1; i >= 0; --i ) {
      selectedDraggable = selectedDraggables[ i ];
      selectedDraggable.stop();
    }

    for ( i = selectedDraggables.length - 1; i >= 0; --i ) {
      selectedDraggable = selectedDraggables[ i ];
      selectedDraggable.drop();
    }

    for ( i = selectedDraggables.length - 1; i >= 0; --i ) {
      selectedDraggable = selectedDraggables[ i ];
      selectedDraggable.reset();
    }

    // Let droppable know that we're done dropping
    for ( i = droppables.length - 1; i >= 0; --i ) {
      droppables[ i ].stopDrop();
    }

    DragNDrop.dispatch( "dropfinished" );
  }

  function __onDraggableMouseDown( e ) {
    if ( e.which !== 1 || e.ctrlKey ) {
      __onDraggableMouseUp( e );
      return;
    }
    e.stopPropagation();
    window.addEventListener( "mousemove", __onDraggableDragged, false );
    window.addEventListener( "mouseup", __onDraggableMouseUp, false );
  }

  function __getPaddingRect( element ) {
    var style = getComputedStyle( element ),
          top = style.getPropertyValue( "padding-top" ),
          left = style.getPropertyValue( "padding-left" ),
          bottom = style.getPropertyValue( "padding-bottom" ),
          right = style.getPropertyValue( "padding-right" );

      return {
        top: Number(top.substring( 0, top.indexOf( "px" ) ) ),
        left: Number(left.substring( 0, left.indexOf( "px" ) ) ),
        bottom: Number(bottom.substring( 0, bottom.indexOf( "px" ) ) ),
        right: Number(right.substring( 0, right.indexOf( "px" ) ) )
      };
  }

  function __checkParent( parent, child ) {
    var parentNode = child.parentNode;
    while ( parentNode ) {
      if ( parentNode === parent ) {
        return true;
      }
      parentNode = parentNode.parentNode;
    }
    return false;
  }

  function __getHighestZIndex( element ) {
    var z = getComputedStyle( element ).zIndex;
    if ( isNaN( z ) ) {
      z = 0;
      var parentNode = element.parentNode;
      while ( parentNode && [ window, document ].indexOf( parentNode ) === -1 ) {
        var style = getComputedStyle( parentNode );
        if ( style ) {
          var nextZ = style.zIndex;
          if ( isNaN( nextZ ) && nextZ > z ) {
            z = nextZ;
          }
        }
        parentNode = parentNode.parentNode;
      }
    }
  }

  function __sortDroppables() {
    __droppables = __droppables.sort( function ( a, b ) {

      var elementA = a.element,
          elementB = b.element,
          zA = __getHighestZIndex( elementA ),
          zB = __getHighestZIndex( elementB );

      if ( __checkParent( elementA, elementB ) ) {
        return -1;
      }
      else if ( __checkParent( elementB, elementA ) ) {
        return 1;
      }

      return zA - zB;
    });
  }

  function Resizable( element, options ) {
    var _leftHandle = element.querySelector( ".handle.left-handle" ),
        _rightHandle = element.querySelector( ".handle.right-handle" ),
        _onStart = options.start || NULL_FUNCTION,
        _onStop = options.stop || NULL_FUNCTION,
        _onResize = options.resize || NULL_FUNCTION,
        _padding = options.padding || 0,
        _updateInterval = -1,
        _scroll = options.scroll,
        _scrollRect,
        _elementRect,
        _lastDims,
        _iterationBlockX,
        _resizeEvent = {                                                      // Exposed on callbacks of Resizable

          /**
           * blockIteration
           *
           * Blocks one iteration of the resize loop at the specified value. This function will be exposed and be active
           * on the `resize` callback of a Resizable.
           *
           * @param {Number} value: The value at which resizing should be stopped. For resizing start by the right-handle,
           *                        this is treated as a width value. For the left-handle, it's a left value.
           */
          blockIteration: function( value ) {
            _iterationBlockX = value;
          },
          direction: null
        };

    function onLeftMouseDown( e ) {
      e.stopPropagation();

      var originalRect = element.getBoundingClientRect(),
          originalPosition = element.offsetLeft,
          originalWidth = element.clientWidth,
          mouseDownPosition = e.clientX,
          mousePosition,
          mouseOffset;

      function update() {
        var diff = mousePosition - mouseDownPosition,
            newX = originalPosition + diff,
            newW = originalWidth - diff;

        // At the beginning of this iteration, _iterationBlockX should be null, assuming no block occured.
        _iterationBlockX = null;

        if ( newW < MIN_WIDTH ) {
          return;
        }

        if ( _scroll && _scroll.scrollLeft > 0 ) {
          if ( originalRect.left + diff < _scrollRect.left - SCROLL_WINDOW ) {
            _scroll.scrollLeft -= DEFAULT_SCROLL_AMOUNT;
            newX -= DEFAULT_SCROLL_AMOUNT;
            newW += DEFAULT_SCROLL_AMOUNT;
            mouseDownPosition += DEFAULT_SCROLL_AMOUNT;
          }
        }

        if ( newX < 0 ) {
          newW += newX;
          newX = 0;
        }

        // If the size actually changed, use the _onResize callback to notify handlers of this Resizable,
        // and expose the opportunity to block this iteration from actually resizing the element.
        if ( _lastDims[ 0 ] !== newX || _lastDims[ 1 ] !== newW ) {
          _onResize( newX, newW, _resizeEvent );
        }

        // If _iterationBlockX is non-null, this iteration was meant to be blocked at that value. Since
        // we're resizing wrt the left side of the element here, _iterationBlockX is used to find the
        // left side of the resizing element, and subsequently, a corresponding width value.
        if ( _iterationBlockX === null ) {
          element.style.left = newX + "px";
          element.style.width = newW - _padding + "px";
          _elementRect = element.getBoundingClientRect();

          _lastDims[ 0 ] = newX;
          _lastDims[ 1 ] = newW;
        }
        else {
          newX = _iterationBlockX;
          newW = originalPosition + originalWidth - newX;

          element.style.left = newX + "px";
          element.style.width = newW - _padding + "px";
          _elementRect = element.getBoundingClientRect();

          _lastDims[ 0 ] = newX;
          _lastDims[ 1 ] = newW;
        }

      }

      function onMouseUp() {
        window.removeEventListener( "mousemove", onMouseMove, false );
        window.removeEventListener( "mouseup", onMouseUp, false );
        clearInterval( _updateInterval );
        _updateInterval = -1;
        _onStop( _resizeEvent );
        element.classList.remove( RESIZABLE_CLASS );
        DragNDrop.dispatch( "resizestopped" );
      }

      function onMouseMove( e ) {
        e.preventDefault();
        mousePosition = e.clientX;
        if ( _updateInterval === -1 ) {
          _lastDims = [];
          _resizeEvent.direction = 'left';
          _updateInterval = setInterval( update, SCROLL_INTERVAL );
          _onStart( _resizeEvent );
        }
      }

      _elementRect = element.getBoundingClientRect();
      mouseOffset = e.clientX - _elementRect.left;
      _scrollRect = _scroll.getBoundingClientRect();

      element.classList.add( RESIZABLE_CLASS );

      window.addEventListener( "mousemove", onMouseMove, false );
      window.addEventListener( "mouseup", onMouseUp, false );

      DragNDrop.dispatch( "resizestarted" );
    }

    function onRightMouseDown( e ) {
      e.stopPropagation();

      var originalPosition = element.offsetLeft,
          originalWidth = element.offsetWidth,
          mouseDownPosition = e.clientX,
          mousePosition,
          mouseOffset;

      function update() {
        var diff = mousePosition - mouseDownPosition,
            newW = originalWidth + diff;

        // At the beginning of this iteration, _iterationBlockX should be null, assuming no block occured.
        _iterationBlockX = null;

        if ( newW < MIN_WIDTH ) {
          return;
        }

        if ( _scroll && _scroll.scrollLeft < _scroll.scrollWidth - _scrollRect.width ) {
          if ( mousePosition > _scrollRect.right + SCROLL_WINDOW ) {
            _scroll.scrollLeft += DEFAULT_SCROLL_AMOUNT;
            mouseDownPosition -= DEFAULT_SCROLL_AMOUNT;
          }
        }

        if ( newW + originalPosition > element.offsetParent.offsetWidth ) {
          newW = element.offsetParent.offsetWidth - originalPosition;
        }

        // If the size actually changed, use the _onResize callback to notify handlers of this Resizable,
        // and expose the opportunity to block this iteration from actually resizing the element.
        if ( _lastDims[ 1 ] !== newW ) {
          _onResize( originalPosition, newW, _resizeEvent );
        }

        // If _iterationBlockX is non-null, this iteration was meant to be blocked at that value. Since
        // we're resizing wrt the right side of the element here, _iterationBlockX is used to find the
        // width of the resizing element.
        if ( _iterationBlockX === null ) {
          element.style.width = newW + "px";
          _elementRect = element.getBoundingClientRect();
          _lastDims[ 1 ] = newW;
        }
        else {
          newW = _iterationBlockX - originalPosition;
          element.style.width = newW + "px";
          _elementRect = element.getBoundingClientRect();
          _lastDims[ 1 ] = newW;
        }
      }

      function onMouseUp() {
        window.removeEventListener( "mousemove", onMouseMove, false );
        window.removeEventListener( "mouseup", onMouseUp, false );
        clearInterval( _updateInterval );
        _updateInterval = -1;
        _onStop( _resizeEvent );
        element.classList.remove( RESIZABLE_CLASS );
        DragNDrop.dispatch( "resizestopped" );
      }

      function onMouseMove( e ) {
        mousePosition = e.clientX;
        if ( _updateInterval === -1 ) {
          _lastDims = [];
          _resizeEvent.direction = 'right';
          _updateInterval = setInterval( update, SCROLL_INTERVAL );
          _onStart( _resizeEvent );
        }
      }

      _elementRect = element.getBoundingClientRect();
      if ( _scroll ) {
        _scrollRect = _scroll.getBoundingClientRect();
      }
      mouseOffset = e.clientX - _elementRect.left;

      element.classList.add( RESIZABLE_CLASS );

      window.addEventListener( "mousemove", onMouseMove, false );
      window.addEventListener( "mouseup", onMouseUp, false );

      DragNDrop.dispatch( "resizestarted" );
    }

    _leftHandle.addEventListener( "mousedown", onLeftMouseDown, false );
    _rightHandle.addEventListener( "mousedown", onRightMouseDown, false );

    return {
      destroy: function() {
        _leftHandle.removeEventListener( "mousedown", onLeftMouseDown, false );
        _rightHandle.removeEventListener( "mousedown", onRightMouseDown, false );
      }
    };
  }

  function Helper( element, options ) {
    options = options || {};
    var _image = options.image,
        _onStart = options.start || NULL_FUNCTION,
        _onStop = options.stop || NULL_FUNCTION,
        _id = __helpers.length;

    __helpers[ _id ] = {
      element: element,
      pluginOptions: options.pluginOptions
    };

    element.setAttribute( "draggable", true );

    element.addEventListener( "dragstart", function( e ) {
      __currentDraggingHelper = {
        element: element,
        pluginOptions: options.pluginOptions
      };
      e.dataTransfer.effectAllowed = "all";
      // coerce to string so IE9 doesn't throw
      e.dataTransfer.setData( "text", _id + "" );
      if ( _image ) {
        var img = document.createElement( "img" );
        img.src = _image.src;
        e.dataTransfer.setDragImage( img, img.width / 2, img.height / 2 );
      }
      _onStart();
    });

    element.addEventListener( "dragend", function() {
      __currentDraggingHelper = null;
      _onStop();
    });

    element.addEventListener( "drop", function() {
    });
  }

  function Droppable( element, options ) {
    options = options || {};
    var _hoverClass = options.hoverClass,
        _onDrop = options.drop || NULL_FUNCTION,
        _onOver = options.over || NULL_FUNCTION,
        _onOut = options.out || NULL_FUNCTION,
        _onStartDrop = options.startDrop || NULL_FUNCTION,
        _onStopDrop = options.stopDrop || NULL_FUNCTION,
        _droppable = {},
        _data = options.data,
        _rememberedDraggables = [];

    function onDrop( e ) {
      var transferData, helper;
      e.stopPropagation();
      e.preventDefault();

      if ( _hoverClass ) {
        element.classList.remove( _hoverClass );
      }
      try {
        // This can throw a "SecurityError: The operation is insecure."
        // error if dataTransfer.effectAllowed is "uninitialized".
        // Unfortunately, checking effectAllowed in ie9 throws
        // a "Unexpected call to method or property access."
        transferData = e.dataTransfer.getData( "text" );
      } catch ( err ) {
        return;
      }
      helper = __helpers[ transferData ] || __currentDraggingHelper;
      if ( helper ) {
        _onDrop( helper.element, [ e.clientX, e.clientY ], helper.pluginOptions );
      }
    }

    function onDragOver( e ) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    }

    function onDragEnter( e ) {
      var transferData, helper;
      if ( _hoverClass ) {
        element.classList.add( _hoverClass );
      }
      try {
        // This can throw a "SecurityError: The operation is insecure."
        // error if dataTransfer.effectAllowed is "uninitialized".
        // Unfortunately, checking effectAllowed in ie9 throws
        // a "Unexpected call to method or property access."
        transferData = e.dataTransfer.getData( "text" );
      } catch ( err ) {
        return;
      }
      helper = __helpers[ transferData ] || __currentDraggingHelper;
      if ( helper ) {
        _onOver( helper.element, [ e.clientX, e.clientY ] );
      }
    }

    function onDragLeave( e ) {
      var transferData, helper;
      if ( _hoverClass ) {
        element.classList.remove( _hoverClass );
      }
      try {
        // This can throw a "SecurityError: The operation is insecure."
        // error if dataTransfer.effectAllowed is "uninitialized".
        // Unfortunately, checking effectAllowed in ie9 throws
        // a "Unexpected call to method or property access."
        transferData = e.dataTransfer.getData( "text" );
      } catch ( err ) {
        return;
      }
      helper = __helpers[ transferData ] || __currentDraggingHelper;
      if ( helper ) {
        _onOut( helper.element, [ e.clientX, e.clientY ] );
      }
    }

    element.addEventListener( "drop", onDrop, false );
    element.addEventListener( "dragover", onDragOver, false );
    element.addEventListener( "dragenter", onDragEnter, false );
    element.addEventListener( "dragleave", onDragLeave, false );

    function removeDraggable( draggable ) {
      var idx = _rememberedDraggables.indexOf( draggable );
      if ( idx > -1 ) {
        _rememberedDraggables.splice( idx, 1 );
        if ( _rememberedDraggables.length === 0 ) {
          element.classList.remove( _hoverClass );
        }
      }
      return idx > -1;
    }

    _droppable = {
      element: element,
      startDrop: _onStartDrop,
      stopDrop: _onStopDrop,
      remember: function( draggable ) {
        var idx = _rememberedDraggables.indexOf( draggable );
        if ( idx === -1 ) {
          _rememberedDraggables.push( draggable );
          element.classList.add( _hoverClass );
          draggable.droppable = _droppable;
          _onOver( draggable.element );
        }
      },
      forget: function( draggable ) {
        if ( removeDraggable( draggable ) ) {
          draggable.droppable = null;
          _onOut( draggable.element );
        }
      },
      drop: function( draggable ) {
        if ( removeDraggable( draggable ) ) {
          _onDrop( draggable, __mousePos );
        }
      },
      drag: function( dragElementRect ) {
        var rect = element.getBoundingClientRect();

        var maxL = Math.max( dragElementRect.left, rect.left ),
            maxT = Math.max( dragElementRect.top, rect.top ),
            minR = Math.min( dragElementRect.right, rect.right ),
            minB = Math.min( dragElementRect.bottom, rect.bottom );

        if ( minR < maxL || minB < maxT ) {
          return false;
        }

        // TODO: to check for half x-axis overlap
        // use ( minR - maxL ) > dragElementRect.width / 2
        // or height * width / 2 for area check.
        if ( ( minB - maxT ) > dragElementRect.height / 2 ) {
          return true;
        }

        return false;
      },
      destroy: function() {
        var idx = __droppables.indexOf( _droppable );
        if ( idx > -1 ) {
          __droppables.splice( idx, 1 );
        }
        element.removeEventListener( "drop", onDrop, false );
        element.removeEventListener( "dragover", onDragOver, false );
        element.removeEventListener( "dragenter", onDragEnter, false );
        element.removeEventListener( "dragleave", onDragLeave, false );
      },
    };

    Object.defineProperties( _droppable, {
      data: {
        enumerable: true,
        get: function() {
          return _data;
        }
      }
    });

    __droppables.push( _droppable );
    __sortDroppables();

    return _droppable;
  }

  function Draggable( element, options ) {
    options = options || {};

    var _containment = options.containment,
        _scrollGroup = __getScrollGroup( options.scroll ),
        _xAxis = !options.axis || options.axis.indexOf( "x" ) > -1 ? true : false,
        _yAxis = !options.axis || options.axis.indexOf( "y" ) > -1 ? true : false,
        _xOffsetBounds = [],
        _yOffsetBounds = [],
        _xOffsetScrollBounds = [],
        _yOffsetScrollBounds = [],
        _draggingPositionOffset = [],
        _revert = options.revert,
        _mouseOffset = [ 0, 0 ],
        _element = element,
        _elementRect,
        _scrollAmount = options.scrollAmount || DEFAULT_SCROLL_AMOUNT,
        _oldZIndex,
        _onStart = options.start || NULL_FUNCTION,
        _onStop = options.stop || DEFAULT_ONSTOP_DRAGGABLE_FUNCTION,
        _onDrag = options.drag || NULL_FUNCTION,
        _originalPosition,
        _draggable = {},
        _data = options.data,
        _containmentPadding = __nullRect,
        _diffRect = {
          top: 0, bottom: 0, left: 0, right: 0
        };

    if ( _containment ) {
      _containmentPadding = __getPaddingRect( _containment );
    }

    _draggable.updateRects = function() {
      var containmentRect, scrollRect;

      _elementRect = element.getBoundingClientRect();

      if ( _containment ) {
        // If a containment element is specified, we need to create some offset boundaries to
        // prevent draggable elements from leaving a defined space. These are offset values because
        // transform: translate is used to re-position elements during a drag.
        containmentRect = _containment.getBoundingClientRect();
        _xOffsetBounds[ 0 ] = containmentRect.left - _elementRect.left;
        _xOffsetBounds[ 1 ] = containmentRect.right - _elementRect.right;
        _yOffsetBounds[ 0 ] = containmentRect.top - _elementRect.top;
        _yOffsetBounds[ 1 ] = containmentRect.bottom - _elementRect.bottom;
      }

      if ( _scrollGroup ) {
        // If a scroll container element is specified, we need to store its bounding rect to know when
        // to start/stop scrolling for a comparison similar to that of bounds checking above.
        scrollRect = _scrollGroup.boundingClientRect;
        _xOffsetScrollBounds[ 0 ] = scrollRect.left - _elementRect.left - _elementRect.width + MIN_SCROLL_ELEMENT_ONSCREEN_WIDTH;
        _xOffsetScrollBounds[ 1 ] = scrollRect.right - _elementRect.right + _elementRect.width - MIN_SCROLL_ELEMENT_ONSCREEN_WIDTH;
        _yOffsetScrollBounds[ 0 ] = scrollRect.top - _elementRect.top + _elementRect.height - MIN_SCROLL_ELEMENT_ONSCREEN_HEIGHT;
        _yOffsetScrollBounds[ 1 ] = scrollRect.bottom - _elementRect.bottom - _elementRect.height + MIN_SCROLL_ELEMENT_ONSCREEN_HEIGHT;
      }
    };

    function updatePosition() {
      var x = __mousePos[ 0 ] - _mouseOffset[ 0 ] + _scrollGroup.scrollDiff[ 0 ],
          y = __mousePos[ 1 ] - _mouseOffset[ 1 ] + _scrollGroup.scrollDiff[ 1 ];

      // Only accept offsets for axes for which we need to provide movement
      _draggingPositionOffset[ 0 ] = _xAxis ? x : 0;
      _draggingPositionOffset[ 1 ] = _yAxis ? y : 0;
    }

    function checkScroll() {
      var scrollRect;
      scrollRect = _scrollGroup.boundingClientRect;

      // If the mouse crosses the right scroll barrier, begin to scroll to the right.
      if ( __mousePos[ 0 ] > scrollRect.right + SCROLL_WINDOW ) {
        __scroll = true;
        _scrollGroup.iterationScrollX = _scrollAmount;
      }

      // Otherwise, if the mouse crosses the left scroll barrier, begin to scroll left.
      else if ( __mousePos[ 0 ] < scrollRect.left - SCROLL_WINDOW ) {
        __scroll = true;
        _scrollGroup.iterationScrollX = -_scrollAmount;
      }

      // If the mouse crosses the bottom scroll barrier, begin to scroll down.
      if ( __mousePos[ 1 ] > scrollRect.bottom + SCROLL_WINDOW ) {
        __scroll = true;
        _scrollGroup.iterationScrollY = _scrollAmount;
      }

      // Otherwise, if the mouse crosses the top scroll barrier, begin to scroll up.
      else if ( __mousePos[ 1 ] < scrollRect.top - SCROLL_WINDOW ) {
        __scroll = true;
        _scrollGroup.iterationScrollY = -_scrollAmount;
      }
    }

    function checkContainment() {
      var x = _draggingPositionOffset[ 0 ],
          y = _draggingPositionOffset[ 1 ];

      // If y axis is allowed to move, check it.
      if ( !_yAxis && !_xAxis || _yAxis ) {

        // If the y scrolling bound is crossed, lock the element's y movement.
        if ( y < _yOffsetScrollBounds[ 0 ] + _scrollGroup.scrollDiff[ 1 ] ) {
          y = _yOffsetScrollBounds[ 0 ] + _scrollGroup.scrollDiff[ 1 ] + _scrollGroup.iterationScrollY;
        }
        else if ( y > _yOffsetScrollBounds[ 1 ] + _scrollGroup.scrollDiff[ 1 ] ) {
          y = _yOffsetScrollBounds[ 1 ] + _scrollGroup.scrollDiff[ 1 ] + _scrollGroup.iterationScrollY;
        }

        // If the y containment bound is crossed, lock the element's y movement.
        if ( y < _yOffsetBounds[ 0 ] ) {
          y = _yOffsetBounds[ 0 ];
        }
        else if ( y > _yOffsetBounds[ 1 ] ) {
          y = _yOffsetBounds[ 1 ];
        }

        // Store the adjusted y value.
        _draggingPositionOffset[ 1 ] = y;
      }

      // If x axis is allowed to move, check it.
      if ( !_yAxis && !_xAxis || _xAxis ) {

        // If the x scrolling bound is crossed, lock the element's x movement.
        if ( x < _xOffsetScrollBounds[ 0 ] + _scrollGroup.scrollDiff[ 0 ] ) {
          x = _xOffsetScrollBounds[ 0 ] + _scrollGroup.scrollDiff[ 0 ] + _scrollGroup.iterationScrollX;
        }
        else if ( x > _xOffsetScrollBounds[ 1 ] + _scrollGroup.scrollDiff[ 0 ] ) {
          x = _xOffsetScrollBounds[ 1 ] + _scrollGroup.scrollDiff[ 0 ] + _scrollGroup.iterationScrollX;
        }

        // If the x containment bound is crossed, lock the element's x movement.
        if ( x < _xOffsetBounds[ 0 ] ) {
          x = _xOffsetBounds[ 0 ];
        }
        else if ( x > _xOffsetBounds[ 1 ] ) {
          x = _xOffsetBounds[ 1 ];
        }

        // Store the adjusted x value.
        _draggingPositionOffset[ 0 ] = x;
      }
    }

    element.addEventListener( "mousedown", __onDraggableMouseDown, false );

    _draggable.droppable = null;

    _draggable.destroy = function() {
      _draggable.selected = false;
      element.removeEventListener( "mousedown", __onDraggableMouseDown, false );
    };

    _draggable.update = function() {
      // Find new potential (x,y) for element.
      updatePosition();

      // Adjust for scrolling.
      if ( _scrollGroup ) {
        checkScroll();
      }

      // See if (x,y) needs to be contained.
      if ( _containment ) {
        checkContainment();
      }

      // Set the transform on element.
      LangUtils.setTransformProperty( element, "translate(" + _draggingPositionOffset[ 0 ] + "px, " + _draggingPositionOffset[ 1 ] + "px)" );

      // Set values for diffRect so that position updates are easily reported to listeners.
      _diffRect.top = _elementRect.top + _draggingPositionOffset[ 1 ] - _scrollGroup.scrollDiff[ 1 ];
      _diffRect.bottom = _elementRect.bottom + _draggingPositionOffset[ 1 ] - _scrollGroup.scrollDiff[ 1 ];
      _diffRect.left = _elementRect.left + _draggingPositionOffset[ 0 ] - _scrollGroup.scrollDiff[ 0 ];
      _diffRect.right = _elementRect.right + _draggingPositionOffset[ 0 ] - _scrollGroup.scrollDiff[ 0 ];
    };

    _draggable.getLastRect = function() {
      return _diffRect;
    };

    _draggable.getLastOffset = function() {
      return _draggingPositionOffset;
    };

    _draggable.start = function( e ) {
      // Store original position of the element and the offset of the mouse wrt the window. These values are used
      // in calculations elsewhere (e.g. update, containment, etc.) to figure out exactly how many pixels the user
      // moved the element. Later, _originalPosition is used to revert the element to its original position if
      // required.
      _originalPosition = [ element.offsetLeft, element.offsetTop ];
      _mouseOffset = [ e.clientX, e.clientY ];

      // Notify listeners that dragging is starting now.
      _onStart();

      // Make sure the position is up to date after this call because the user may
      // have moved the element around in the DOM tree.
      _draggable.updateRects();

      // Update position right away.
      updatePosition();
    };

    _draggable.drag = function() {
      if ( _draggable.droppable ) {
        _onDrag( _draggable, _draggable.droppable );
      }
    };

    _draggable.drop = function() {
      if ( _draggable.droppable ) {
        _draggable.droppable.drop( _draggable );
      }
    };

    _draggable.stop = function() {
      // If originalPosition is not null, start() was called
      if ( _originalPosition ) {
        LangUtils.setTransformProperty( _element, "" );
        _onStop();
      }
    };

    _draggable.reset = function() {
      if ( !_draggable.droppable && _revert && _originalPosition ) {
        element.style.left = _originalPosition[ 0 ] + "px";
        element.style.top = _originalPosition[ 1 ] + "px";
      }
      _draggable.droppable = null;
      _originalPosition = null;
    };

    Object.defineProperties( _draggable, {
      data: {
        enumerable: true,
        get: function() {
          return _data;
        }
      },
      selected: {
        enumerable: true,
        get: function() {
          for ( var i = __selectedDraggables.length - 1; i >= 0; --i ) {
            if ( __selectedDraggables[ i ].element === _element ) {
              return true;
            }
          }
          return false;
        },
        set: function( val ) {
          if ( val ) {
            _oldZIndex = getComputedStyle( element ).getPropertyValue( "z-index" );
            element.style.zIndex = MAXIMUM_Z_INDEX;
            __selectedDraggables.push( _draggable );
          }
          else {
            element.style.zIndex = _oldZIndex;
            for ( var i = __selectedDraggables.length - 1; i >= 0; --i ) {
              if ( __selectedDraggables[ i ].element === _element ) {
                __selectedDraggables.splice( i, 1 );
                return;
              }
            }
          }
        }
      },
      element: {
        enumerable: true,
        get: function() {
          return _element;
        }
      }
    });

    return _draggable;
  }

  function Sortable( parentElement, options ) {

    var _onChange = options.change || NULL_FUNCTION,
        _elements = [],
        _instance = {},
        _mouseDownPosition = 0,
        _draggingElement,
        _draggingOriginalPosition,
        _moved,
        _hoverElement,
        _placeHolder,
        _oldZIndex;


    function createPlaceholder( victim ) {
      var placeholder = victim.cloneNode( false );
      placeholder.classList.add( "placeholder" );
      parentElement.replaceChild( placeholder, victim );
      return placeholder;
    }

    function positionElement( diff ) {
      _draggingElement.style.top = _draggingOriginalPosition - diff + "px";
    }

    function onElementMouseMove( e ) {
      if ( !_moved ) {
        _moved = true;
        _placeHolder = createPlaceholder( _draggingElement );
        parentElement.appendChild( _draggingElement );
        _draggingElement.style.position = "absolute";
        _draggingElement.style.zIndex = MAXIMUM_Z_INDEX;
        positionElement( 0 );
      }
      else{
        var diff = _mouseDownPosition - e.clientY;
        positionElement( diff );
        var dragElementRect = _draggingElement.getBoundingClientRect();
        for ( var i=_elements.length - 1; i>=0; --i ) {
          var element = _elements[ i ];

          if ( element === _draggingElement ) {
            continue;
          }

          var rect = element.getBoundingClientRect();

          var maxL = Math.max( dragElementRect.left, rect.left ),
              maxT = Math.max( dragElementRect.top, rect.top ),
              minR = Math.min( dragElementRect.right, rect.right ),
              minB = Math.min( dragElementRect.bottom, rect.bottom );

          if ( minR < maxL || minB < maxT ) {
            continue;
          }

          if ( minB - maxT > dragElementRect.height / 2 ) {
            _hoverElement = element;
            var newPlaceHolder = createPlaceholder( _hoverElement );
            parentElement.replaceChild( _hoverElement, _placeHolder );
            _placeHolder = newPlaceHolder;
            var orderedElements = [],
                childNodes = parentElement.childNodes;
            for ( var j=0, l=childNodes.length; j<l; ++j ) {
              var child = childNodes[ j ];
              if ( child !== _draggingElement ) {
                if ( child !== _placeHolder ) {
                  orderedElements.push( child );
                }
                else{
                  orderedElements.push( _draggingElement );
                }
              }
            }
            _onChange( orderedElements );
          }
        }
      }
    }

    function onElementMouseDown( e ) {
      if ( e.which !== 1 ) {
        return;
      }
      _moved = false;
      _draggingElement = this;
      _draggingOriginalPosition = _draggingElement.offsetTop;

      var style = getComputedStyle( _draggingElement );

      _oldZIndex = style.getPropertyValue( "z-index" );
      _mouseDownPosition = e.clientY;

      window.addEventListener( "mouseup", onElementMouseUp, false );
      window.addEventListener( "mousemove", onElementMouseMove, false );

      DragNDrop.dispatch( "sortstarted", e );
    }

    function onElementMouseUp() {
      _draggingElement.style.zIndex = _oldZIndex;
      window.removeEventListener( "mouseup", onElementMouseUp, false );
      window.removeEventListener( "mousemove", onElementMouseMove, false );
      _moved = false;
      if ( _placeHolder ) {
        _draggingElement.style.zIndex = "";
        _draggingElement.style.position = "";
        _draggingElement.style.top = "";
        parentElement.replaceChild( _draggingElement, _placeHolder );
        _placeHolder = null;
      }
      DragNDrop.dispatch( "sortstopped" );
    }

    _instance.addItem = function( item ) {
      _elements.push( item );
      item.addEventListener( "mousedown", onElementMouseDown, false );
    };

    _instance.removeItem = function( item ) {
      _elements.splice( _elements.indexOf( item ), 1 );
      item.removeEventListener( "mousedown", onElementMouseDown, false );
    };

    return _instance;
  }

  DragNDrop.draggable = Draggable;
  DragNDrop.droppable = Droppable;
  DragNDrop.helper = Helper;
  DragNDrop.resizable = Resizable;
  DragNDrop.sortable = Sortable;

  Object.defineProperties( DragNDrop, {
    isDragging: {
      get: function() {
        return __mouseDown;
      }
    }
  });

  EventManager.extend( DragNDrop );

  return DragNDrop;

});


/*
 RequireJS text 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/requirejs/text for details
*/
define('text',["module"],function(e){var t=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"],n=/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,r=/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,i=typeof location!="undefined"&&location.href,s=i&&location.protocol&&location.protocol.replace(/\:/,""),o=i&&location.hostname,u=i&&(location.port||undefined),a=[],f=e.config&&e.config()||{},l,c;return l={version:"2.0.1",strip:function(e){if(e){e=e.replace(n,"");var t=e.match(r);t&&(e=t[1])}else e="";return e},jsEscape:function(e){return e.replace(/(['\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r").replace(/[\u2028]/g,"\\u2028").replace(/[\u2029]/g,"\\u2029")},createXhr:f.createXhr||function(){var e,n,r;if(typeof XMLHttpRequest!="undefined")return new XMLHttpRequest;if(typeof ActiveXObject!="undefined")for(n=0;n<3;n+=1){r=t[n];try{e=new ActiveXObject(r)}catch(i){}if(e){t=[r];break}}return e},parseName:function(e){var t=!1,n=e.indexOf("."),r=e.substring(0,n),i=e.substring(n+1,e.length);return n=i.indexOf("!"),n!==-1&&(t=i.substring(n+1,i.length),t=t==="strip",i=i.substring(0,n)),{moduleName:r,ext:i,strip:t}},xdRegExp:/^((\w+)\:)?\/\/([^\/\\]+)/,useXhr:function(e,t,n,r){var i=l.xdRegExp.exec(e),s,o,u;return i?(s=i[2],o=i[3],o=o.split(":"),u=o[1],o=o[0],(!s||s===t)&&(!o||o.toLowerCase()===n.toLowerCase())&&(!u&&!o||u===r)):!0},finishLoad:function(e,t,n,r){n=t?l.strip(n):n,f.isBuild&&(a[e]=n),r(n)},load:function(e,t,n,r){if(r.isBuild&&!r.inlineText){n();return}f.isBuild=r.isBuild;var a=l.parseName(e),c=a.moduleName+"."+a.ext,h=t.toUrl(c),p=f.useXhr||l.useXhr;!i||p(h,s,o,u)?l.get(h,function(t){l.finishLoad(e,a.strip,t,n)},function(e){n.error&&n.error(e)}):t([c],function(e){l.finishLoad(a.moduleName+"."+a.ext,a.strip,e,n)})},write:function(e,t,n,r){if(a.hasOwnProperty(t)){var i=l.jsEscape(a[t]);n.asModule(e+"!"+t,"define(function () { return '"+i+"';});\n")}},writeFile:function(e,t,n,r,i){var s=l.parseName(t),o=s.moduleName+"."+s.ext,u=n.toUrl(s.moduleName+"."+s.ext)+".js";l.load(o,n,function(t){var n=function(e){return r(u,e)};n.asModule=function(e,t){return r.asModule(e,u,t)},l.write(e,o,n,i)},i)}},typeof process!="undefined"&&process.versions&&!!process.versions.node?(c=require.nodeRequire("fs"),l.get=function(e,t){var n=c.readFileSync(e,"utf8");n.indexOf("\ufeff")===0&&(n=n.substring(1)),t(n)}):l.createXhr()?l.get=function(e,t,n){var r=l.createXhr();r.open("GET",e,!0),f.onXhr&&f.onXhr(r,e),r.onreadystatechange=function(i){var s,o;r.readyState===4&&(s=r.status,s>399&&s<600?(o=new Error(e+" HTTP status: "+s),o.xhr=r,n(o)):t(r.responseText))},r.send(null)}:typeof Packages!="undefined"&&(l.get=function(e,t){var n="utf-8",r=new java.io.File(e),i=java.lang.System.getProperty("line.separator"),s=new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(r),n)),o,u,a="";try{o=new java.lang.StringBuffer,u=s.readLine(),u&&u.length()&&u.charAt(0)===65279&&(u=u.substring(1)),o.append(u);while((u=s.readLine())!==null)o.append(i),o.append(u);a=String(o.toString())}finally{s.close()}t(a)}),l})
;
define('text!layouts/trackevent.html',[],function () { return '<div class="butter-track-event" data-butter-draggable-type="trackevent">\n\n  <div class="butter-track-event-info">\n    <span class="butter-track-event-icon"></span>\n    <div class="title"></div>\n  </div>\n\n  <div class="handle left-handle"></div>\n  <div class="handle right-handle"></div>\n\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/views/trackevent-view', [ "core/logger", "core/eventmanager", "util/dragndrop",
          "util/lang", "text!layouts/trackevent.html" ],
  function( Logger, EventManager, DragNDrop,
            LangUtils, TRACKEVENT_LAYOUT ) {

  var TRACKEVENT_MIN_WIDTH = 50;

  return function( trackEvent, type, inputOptions ){

    var _element = LangUtils.domFragment( TRACKEVENT_LAYOUT, ".butter-track-event" ),
        _type = type,
        _icon = document.getElementById( _type + "-icon" ),
        _start = inputOptions.start || 0,
        _end = inputOptions.end || _start + 1,
        _parent,
        _handles,
        _typeElement = _element.querySelector( ".title" ),
        _draggable,
        _resizable,
        _trackEvent = trackEvent,
        _dragging = false,
        _resizing = false,
        _padding = 0,
        _elementText,
        _ghost,
        _onDrag,
        _onResize,
        _this = this;

    EventManager.extend( _this );

    function resetContainer() {
      if ( !_trackEvent.track || !_trackEvent.track._media ) {
        return;
      }
      if ( _trackEvent.track.view.element !== _element.parentNode ) {
        _trackEvent.track.view.element.appendChild( _element );
      }
      _element.style.left = _start  / _trackEvent.track._media.duration * 100 + "%";
      _element.style.width = ( _end - _start ) / _trackEvent.track._media.duration * 100 + "%";
    }

    this.setToolTip = function( title ){
      _element.title = title;
    };

    this.update = function( options ){
      options = options || {};
      _element.style.top = "0px";
      if ( !isNaN( options.start ) ) {
        _start = options.start;
      }
      if ( !isNaN( options.end ) ) {
        _end = options.end;
      }
      resetContainer();
    }; //update

    /**
     * Member: createGhost
     *
     * Creates a clone of the current trackEvent that does not have an associated Popcorn trackevent.
     * Used to notify the user when a trackevent overlaps and where the new location will be
     * when the trackevent is dropped
     */
    this.createGhost = function() {
      if ( _ghost ) {
        return _ghost;
      }

      var clone = _element.cloneNode( false );
      clone.style.top = "";

      // Copy the `left` attribute here, once. Successive updates are done using
      // the translate transform property.
      clone.style.left = _element.style.left;

      clone.classList.add( "butter-track-event-ghost" );
      LangUtils.setTransformProperty( clone, "" );

      _ghost = {
        element: clone
      };

      return _ghost;
    };

    /*
     * Member: cleanupGhost
     *
     * Removes this trackEvent's ghost and makes sure isGhost is set to false
     */
    this.cleanupGhost = function() {
      _ghost.track.view.removeTrackEventGhost( _ghost );
      _ghost = null;
    };

    this.updateGhost = function() {
      // Don't touch top or left style attributes. Just adjust transform through translate(x, 0) to match
      // the draggable element.
      LangUtils.setTransformProperty( _ghost.element, "translate(" + _draggable.getLastOffset()[ 0 ] + "px, 0px)" );
    };

    this.setDragHandler = function( dragHandler ) {
      _onDrag = dragHandler;
    };

    this.setResizeHandler = function( resizeHandler ) {
      _onResize = resizeHandler;
    };

    Object.defineProperties( this, {
      trackEvent: {
        enumerable: true,
        get: function(){
          return _trackEvent;
        }
      },
      ghost: {
        enumerable: true,
        get: function() {
          return _ghost;
        }
      },
      element: {
        enumerable: true,
        get: function(){ return _element; }
      },
      start: {
        enumerable: true,
        get: function(){ return _start; },
        set: function( val ){
          _start = val;
          resetContainer();
        }
      },
      end: {
        enumerable: true,
        get: function(){ return _end; },
        set: function( val ){
          _end = val;
          resetContainer();
        }
      },
      type: {
        enumerable: true,
        get: function(){ return _type; },
        set: function( val ){
          _type = val;
          _element.setAttribute( "data-butter-trackevent-type", _type );
        }
      },
      elementText: {
        enumerable: true,
        get: function() {
          return _elementText;
        },
        set: function( val ) {
          _elementText = val;
          _typeElement.innerHTML = _elementText;
        }
      },
      selected: {
        enumerable: true,
        get: function(){ return _draggable.selected; },
        set: function( val ){
          if( val ){
            select();
          }
          else {
            deselect();
          } //if
        }
      },
      dragging: {
        enumerable: true,
        get: function(){
          return _dragging;
        }
      },
      resizing: {
        enumerable: true,
        get: function() {
          return _resizing;
        }
      },
      parent: {
        enumerabled: true,
        get: function(){
          return _parent;
        },
        set: function( val ){
          _parent = val;

          if( _draggable ){
            _draggable.destroy();
            _draggable = null;
          }

          if( _resizable ){
            _resizable.destroy();
            _resizable = null;
            _handles = null;
          }

          if( _parent ){

            if( _parent.element && _parent.element.parentNode && _parent.element.parentNode.parentNode ){

              // Capture the element's computed style on initialization
              var elementStyle = getComputedStyle( _element ),
                  paddingLeft = elementStyle.paddingLeft ? +elementStyle.paddingLeft.substring( 0, elementStyle.paddingLeft.length - 2 ) : 0,
                  paddingRight = elementStyle.paddingRight ? +elementStyle.paddingRight.substring( 0, elementStyle.paddingRight.length - 2 ) : 0;

              // Store padding values to negate from width calculations
              _padding = paddingLeft + paddingRight;

              _draggable = DragNDrop.draggable( _element, {
                containment: _parent.element.parentNode,
                scroll: _parent.element.parentNode.parentNode,
                data: _this,
                start: function(){
                  _dragging = true;
                  _element.classList.add( "trackevent-dragging" );
                  _this.dispatch( "trackeventdragstarted" );
                },
                stop: function() {
                  _dragging = false;
                  _element.classList.remove( "trackevent-dragging" );
                  _this.dispatch( "trackeventdragstopped" );
                },
                drag: function( draggable, droppable ) {
                  if ( _onDrag ) {
                    _onDrag( draggable, droppable );
                  }
                },
                revert: true
              });

              _draggable.selected = _trackEvent.selected;

              _resizable = DragNDrop.resizable( _element, {
                containment: _parent.element.parentNode,
                scroll: _parent.element.parentNode.parentNode,
                padding: _padding,
                start: function( resizeEvent ) {
                  _resizing = true;
                  _this.dispatch( "trackeventresizestarted", resizeEvent );
                },
                stop: function( resizeEvent ) {
                  _resizing = false;
                  _this.dispatch( "trackeventresizestopped", resizeEvent );
                },
                resize: function( x, w, resizeEvent ) {
                  if ( w < TRACKEVENT_MIN_WIDTH ) {
                    _element.classList.add( "trackevent-small" );
                  } else {
                    _element.classList.remove( "trackevent-small" );
                  }
                  if ( _onResize ) {
                    _onResize( _trackEvent, x, w, resizeEvent, resizeEvent.direction );
                  }
                }
              });

              _element.setAttribute( "data-butter-draggable-type", "trackevent" );
              _element.setAttribute( "data-butter-trackevent-id", _trackEvent.id );

            }

            resetContainer();
          } //if
        } //set
      }
    });

    _element.className = "butter-track-event";
    if ( _icon ) {
      _element.querySelector( ".butter-track-event-icon" ).style.backgroundImage = "url( "+ _icon.src + ")";
    }
    _this.type = _type;

    _this.update( inputOptions );

    _element.addEventListener( "mousedown", function ( e ) {
      _this.dispatch( "trackeventmousedown", { originalEvent: e, trackEvent: _trackEvent } );
    }, true);
    _element.addEventListener( "mouseup", function ( e ) {
      _this.dispatch( "trackeventmouseup", { originalEvent: e, trackEvent: _trackEvent } );
    }, false);
    _element.addEventListener( "mouseover", function ( e ) {
      _this.dispatch( "trackeventmouseover", { originalEvent: e, trackEvent: _trackEvent } );
    }, false );
    _element.addEventListener( "mouseout", function ( e ) {
      _this.dispatch( "trackeventmouseout", { originalEvent: e, trackEvent: _trackEvent } );
    }, false );

    function select() {
      if ( _draggable && !_draggable.selected ) {
        _draggable.selected = true;
      }
      _element.setAttribute( "selected", true );
    } //select

    function deselect() {
      if ( _draggable && _draggable.selected ) {
        _draggable.selected = false;
      }
      _element.removeAttribute( "selected" );
    } //deselect

  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: TrackEvent
 *
 * Supports a single event in the Media > Track > TrackEvent model.
 */
define('core/trackevent', [ "./logger", "./eventmanager", "./observer",
          "util/lang", "util/time", "./views/trackevent-view" ],
  function( Logger, EventManager, Observer,
            LangUtil, TimeUtil, TrackEventView ) {

  var __guid = 0;

  var __trackEventExceptionStrings = {
    "trackevent-overlap": "The times you have entered cause trackevents to overlap.",
    "invalid-start-time": "[start] is an invalid value.",
    "invalid-end-time": "[end] is an invalid value.",
    "start-greater-than-end": "[start] must be less than [end]."
  };

  var TrackEventUpdateException = function ( reason ) {
    this.type = "trackevent-update";
    this.reason = reason;
    this.message = __trackEventExceptionStrings[ reason ];
    this.toString = function () {
      return "TrackEvent update failed: " + this.message;
    };
  };

  /**
   * Class: TrackEvent
   *
   * Represents and governs a single popcorn event.
   *
   * @param {Object} options: Options for initialization. Can contain the properties type, name, and popcornOptions. If the popcornOptions property is specified, its contents will be used to initialize the plugin instance associated with this TrackEvent.
   */
  var TrackEvent = function ( options ) {

    options = options || {};

    var _this = this,
        _id = "TrackEvent" + __guid++,
        _name = options.name || _id,
        _logger = new Logger( _id ),
        _track = null,
        _type = options.type + "",
        _popcornOptions = options.popcornOptions || {
          start: 0,
          end: 1
        },
        _view = new TrackEventView( this, _type, _popcornOptions ),
        _popcornWrapper = null,
        _selected = false;

    EventManager.extend( _this );
    Observer.extend( _this );

    _this.popcornOptions = _popcornOptions;
    _this.popcornTrackEvent = null;

    function defaultValue( item ) {
      if ( item.default ) {
        return item.default;
      }
      return item.type === "number" ? 0 : "";
    }

    if ( !_type ){
      _logger.log( "Warning: " + _id + " has no type." );
    }
    else {
      this.manifest = Popcorn.manifest[ _type ];
    }

    _popcornOptions.start = _popcornOptions.start || 0;
    _popcornOptions.start = TimeUtil.roundTime( _popcornOptions.start );
    _popcornOptions.end = _popcornOptions.end || _popcornOptions.start + 1;
    _popcornOptions.end = TimeUtil.roundTime( _popcornOptions.end );


    /**
     * Member: bind
     *
     * Binds the TrackEvent to its dependencies.
     *
     * @param {Object} track: The track the trackevent will inhabit.
     * @param {Object} popcornWrapper: a reference to a PopcornWrapper object that wraps various functionality for modifying Popcorn data.
     */
    this.bind = function( track, popcornWrapper ) {
      _track = track;
      _popcornWrapper = popcornWrapper;
    };

    /**
     * Member: update
     *
     * Updates the event properties and runs sanity checks on input.
     *
     * @param {Object} updateOptions: Object containing plugin-specific properties to be updated for this TrackEvent.
     * @event trackeventupdated: Occurs when an update operation succeeded.
     * @throws TrackEventUpdateException: When an update operation failed because of conflicting times or other serious property problems.
     */
    this.update = function( updateOptions, applyDefaults ) {
      updateOptions = updateOptions || {};

      var newStart = updateOptions.start,
          newEnd = updateOptions.end,
          manifestOptions,
          media,
          updateNotification,
          duration;

      if ( isNaN( newStart ) ) {
        if ( updateOptions.hasOwnProperty( "start" ) ) {
          throw new TrackEventUpdateException( "invalid-start-time", "[start] is an invalid value." );
        }
        else {
          newStart = _popcornOptions.start;
        }
      }

      if ( isNaN( newEnd ) ) {
        if ( updateOptions.hasOwnProperty( "end" ) ) {
          throw new TrackEventUpdateException( "invalid-end-time", "[end] is an invalid value." );
        }
        else {
          newEnd = _popcornOptions.end;
        }
      }

      if ( newStart > newEnd ) {
        throw new TrackEventUpdateException( "start-greater-than-end", "[start] must be less than [end]." );
      }

      // Synchronously notify observers that an update is happening.
      // This action gives observers a chance to stop the trackevent from updating
      // if a problem is detected. If `notify` returns `false`, the update is cancelled
      // because some subscriber wished to prevent it from being committed.
      updateNotification = _this.notify( "update", updateOptions );
      if ( updateNotification.cancelled ) {
        return;
      }

      if ( _track && _track._media ) {
        media = _track._media;
        duration = media.duration;

        if ( this.manifest ) {
          manifestOptions = this.manifest.options;
          if ( manifestOptions ) {
            for ( var prop in manifestOptions ) {
              if ( manifestOptions.hasOwnProperty( prop ) ) {
                if ( updateOptions[ prop ] === undefined ) {
                  if ( applyDefaults ) {
                    _popcornOptions[ prop ] = defaultValue( manifestOptions[ prop ] );
                  }
                } else {
                  _popcornOptions[ prop ] = updateOptions[ prop ];
                }
              }
            }
            if ( !( "target" in manifestOptions ) && updateOptions.target ) {
              _popcornOptions.target = updateOptions.target;
            }
            if ( "zindex" in manifestOptions && media ) {
              _popcornOptions.zindex = updateOptions.zindex = media.maxPluginZIndex - _track.order;
            }
          }
        }
      }

      _popcornOptions.start = newStart;
      _popcornOptions.end = newEnd;
      _this.popcornOptions = _popcornOptions;

      // if PopcornWrapper exists, it means we're connected properly to a Popcorn instance,
      // and can update the corresponding Popcorn trackevent for this object
      if ( _popcornWrapper ) {
        _popcornWrapper.synchronizeEvent( _this, updateOptions );
      }
    };

    /**
     * Member: unbind
     *
     * Kills references to popcornWrapper and track which are necessary to function. TrackEvent becomes
     * a husk for popcorn data at this point.
     */
    this.unbind = function( preventRemove ) {
      if ( !preventRemove && _popcornWrapper ) {
        _popcornWrapper.destroyEvent( _this );
        _popcornWrapper = null;
      }
      _track = null;
    };

    /**
     * Member: copy
     *
     * Returns a copy of the data needed to create a track event just like this one.
     * Does not copy state or unique data.
     */
    this.copy = function() {
      var popcornOptions = {},
          manifestOptions = {};
      if ( this.manifest ) {
        manifestOptions = _this.manifest.options;
        if ( manifestOptions ) {
          for ( var prop in manifestOptions ) {
            if ( manifestOptions.hasOwnProperty( prop ) ) {
              popcornOptions[ prop ] = _popcornOptions[ prop ];
            }
          }
        }
      }
      return {
        popcornOptions: popcornOptions,
        type: _type,
        track: _track
      };
    };

    Object.defineProperties( this, {

      /**
       * Property: track
       *
       * Specifies the track on which this TrackEvent currently sites.
       */
      track: {
        enumerable: true,
        get: function(){
          return _track;
        }
      },

      /**
       * Property: view
       *
       * A reference to the view object generated for this TrackEvent.
       * @malleable: No.
       */
      view: {
        enumerable: true,
        configurable: false,
        get: function(){
          return _view;
        }
      },
      /**
       * Property: dragging
       *
       * This TrackEvent's dragging state. True when TrackEvent is being dragged.
       * @malleable: No.
       */
      dragging: {
        enumerable: true,
        get: function(){
          return _view.dragging;
        }
      },

      /**
       * Property: resizing
       *
       * This TrackEvent's resizing state. True when TrackEvent is being resized.
       * @malleable: No.
       */
      resizing: {
        enumerable: true,
        get: function(){
          return _view.resizing;
        }
      },

      /**
       * Property: uiInUse
       *
       * This TrackEvent's resizing state. True when TrackEvent is being resized.
       * @malleable: No.
       */
      uiInUse: {
        enumerable: true,
        get: function(){
          return _view.resizing || _view.dragging;
        }
      },

      /**
       * Property: type
       *
       * The type representing the popcorn plugin created and manipulated by this TrackEvent.
       * @malleable: No.
       */
      type: {
        enumerable: true,
        get: function(){
          return _type;
        }
      },

      /**
       * Property: name
       *
       * Name of this TrackEvent.
       * @malleable: No.
       */
      name: {
        enumerable: true,
        get: function(){
          return _name;
        }
      },

      /**
       * Property: id
       *
       * Name of this TrackEvent.
       * @malleable: No.
       */
      id: {
        enumerable: true,
        get: function(){
          return _id;
        }
      },

      /**
       * Property: selected
       *
       * Specifies the state of selection. When true, this TrackEvent is selected.
       *
       * @malleable: Yes.
       * @event trackeventselected: Dispatched when selected state changes to true.
       * @event trackeventdeselected: Dispatched when selected state changes to false.
       */
      selected: {
        enumerable: true,
        get: function(){
          return _selected;
        },
        set: function( val ){
          _selected = val;
          _view.selected = _selected;
          if ( _selected ){
            _this.notify( "selected" );
            _this.dispatch( "trackeventselected" );
          }
          else {
            _this.notify( "deselected" );
            _this.dispatch( "trackeventdeselected" );
          } //if
        }
      },

      /**
       * Property: json
       *
       * Represents this TrackEvent in a portable JSON format.
       *
       * @malleable: Yes. Will import JSON in the same format that it was exported.
       * @event trackeventupdated: When this property is set, the TrackEvent's data will change, so a trackeventupdated event will be dispatched.
       */
      json: {
        enumerable: true,
        get: function(){
          return {
            id: _id,
            type: _type,
            popcornOptions: LangUtil.clone( _popcornOptions ),
            track: _track ? _track.id : undefined,
            name: _name
          };
        },
        set: function( importData ){
          _type = _popcornOptions.type = importData.type;
          this.manifest = Popcorn.manifest[ _type ];
          if ( importData.name ){
            _name = importData.name;
          }
          _popcornOptions = importData.popcornOptions;
          _this.popcornOptions = _popcornOptions;
          _view.type = _type;
          _view.update( _popcornOptions );
          _this.dispatch( "trackeventupdated", _this );
        }
      }
    }); //properties

  }; //TrackEvent

  TrackEvent.MINIMUM_TRACKEVENT_SIZE = 0.02;

  return TrackEvent;

}); //define
;
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/views/track-view', [ "core/logger", "core/eventmanager", "util/dragndrop" ],
  function( Logger, EventManager, DragNDrop ) {

  var TRACKEVENT_BORDER_OFFSET = 2;

  return function( id, track ) {

    var _id = id,
        _track = track,
        _this = this,
        _trackEvents = [],
        _element = document.createElement( "div" ),
        _duration = 1,
        _parent,
        _droppable;

    EventManager.extend( _this );

    _element.className = "butter-track";

    function setupDroppable(){
      _droppable = DragNDrop.droppable( _element, {
        hoverClass: "draggable-hover",
        data: _this,
        drop: function( dropped, mousePosition, popcornOptions ) {
          var droppedElement = dropped.data ? dropped.data.element : dropped,
              draggableType = droppedElement.getAttribute( "data-butter-draggable-type" ),
              duration, start, end, left,
              trackRect = _element.getBoundingClientRect(),
              trackEvent, trackEventView, trackEventRect;

          if ( draggableType === "plugin" ) {
            left = mousePosition[ 0 ] - trackRect.left;
            start = left / trackRect.width * _duration;
            _this.dispatch( "plugindropped", {
              start: start,
              track: _track,
              type: droppedElement.getAttribute( "data-popcorn-plugin-type" ),
              popcornOptions: popcornOptions
            });
          }
          else if ( draggableType === "trackevent" ) {
            trackEventRect = dropped.getLastRect();
            trackEventView = dropped.data;
            trackEvent = trackEventView.trackEvent;

            // Avoid using width values to derive end value to circumvent padding/border issues.
            duration = trackEvent.popcornOptions.end - trackEvent.popcornOptions.start;
            left = trackEventRect.left - trackRect.left;
            start = left / trackRect.width * _duration;
            end = start + duration;

            _this.dispatch( "trackeventdropped", {
              start: start,
              end: end,
              track: _track,
              trackEvent: trackEventView.trackEvent
            });
          }
        }
      });
    }

    _element.setAttribute( "data-butter-track-id", _id );

    Object.defineProperties( this, {
      id: {
        enumerable: true,
        get: function() {
          return _id;
        }
      },
      element: {
        enumerable: true,
        configurable: false,
        get: function(){
          return _element;
        }
      },
      duration: {
        enumerable: true,
        get: function(){
          return _duration;
        },
        set: function( val ){
          _duration = val;
          for( var i=0, l=_trackEvents.length; i<l; ++i ){
            _trackEvents[ i ].update();
          } //for
        }
      },
      parent: {
        enumerable: true,
        get: function(){
          return _parent;
        },
        set: function( val ){
          _parent = val;
          if ( _droppable ) {
            _droppable.destroy();
            _droppable = null;
          }
          if ( _parent ) {
            setupDroppable();
          }
          for( var i=0, l=_trackEvents.length; i<l; ++i ){
            _trackEvents[ i ].parent = _this;
          }
        }
      },
      track: {
        enumerable: true,
        get: function() {
          return _track;
        }
      }
    });

    function onTrackEventDragStopped( e ) {
      _track.removeTrackEvent( e.target.trackEvent, true );
    }

    this.addTrackEvent = function( trackEvent ) {
      var trackEventElement = trackEvent.view.element;
      _element.appendChild( trackEventElement );
      _trackEvents.push( trackEvent.view );
      trackEvent.view.parent = _this;
      _this.chain( trackEvent, [
        "trackeventmousedown",
        "trackeventmouseover",
        "trackeventmouseout",
        "trackeventmoved"
      ]);

      trackEvent.view.listen( "trackeventdragstopped", onTrackEventDragStopped );
    };

    this.removeTrackEvent = function( trackEvent ){
      var trackEventElement = trackEvent.view.element;

      // When `trackeventdragstarted` occurs, TrackEvents views are removed from their Track's view
      // to avoid unnecessary collisions while dragging. So, it may be the case that the TrackEvent's view
      // is no longer parented by this Track's view.
      trackEventElement.parentNode.removeChild( trackEventElement );

      _trackEvents.splice( _trackEvents.indexOf( trackEvent.view ), 1 );
      trackEvent.view.parent = null;
      _this.unchain( trackEvent, [
        "trackeventmousedown",
        "trackeventmouseover",
        "trackeventmouseout",
        "trackeventmoved"
      ]);

      trackEvent.view.unlisten( "trackeventdragstopped", onTrackEventDragStopped );
    };

    // Creates a ghost trackEvent on this track. This means a cloned representation of a currently overlapping trackEvent
    // is added to this track.
    this.addTrackEventGhost = function( ghost ) {
      ghost.track = _track;
      _element.appendChild( ghost.element );
    };

    // Removes a ghost trackEvent from this track
    this.removeTrackEventGhost = function( ghost ) {
      ghost.track = null;
      _element.removeChild( ghost.element );
    };

    this.findOverlappingTrackEvent = function( trackEventView, leftValue, widthValue ) {
      var otherTrackEventView,
          rect1 = trackEventView.element.getBoundingClientRect(),
          rect2,
          left, right, width;

      left = leftValue || rect1.left;
      width = widthValue || rect1.width;
      right = left + width;

      // If the rect's width is 0 here, it's likely that we're not even attached to the DOM
      if ( width === 0 ) {
        return null;
      }

      // loop over all the trackevents for this track and see if we overlap
      for ( var i = 0, l = _trackEvents.length; i < l; i++ ) {
        otherTrackEventView = _trackEvents[ i ];
        // make sure that we don't check against the same trackEvent or other dragging trackEvents
        if ( !otherTrackEventView.dragging && trackEventView !== otherTrackEventView ) {
          rect2 = otherTrackEventView.element.getBoundingClientRect();
          // if a trackevent overlaps and it's not a ghost...
          if ( !otherTrackEventView.isGhost &&
               !( left >= ( rect2.right - TRACKEVENT_BORDER_OFFSET ) ||
                ( right <= rect2.left + TRACKEVENT_BORDER_OFFSET ) ) ) {
            return otherTrackEventView.trackEvent;
          }
        }
      }
      return null;
    };
  }; //TrackView
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/track', [ "./eventmanager", "./trackevent", "./views/track-view" ],
        function( EventManager, TrackEvent, TrackView ){

  var __guid = 0,
      NAME_PREFIX = "Layer ",
      Track;

  Track = function( options ) {
    options = options || {};

    var _trackEvents = [],
        _target = options.target,
        _id = "" + __guid++,
        _view = new TrackView( _id, this ),
        _popcornWrapper = null,
        _this = this,
        _order = 0,
        _name = NAME_PREFIX + _order;

    _this._media = null;

    /*
     * ghost stores a reference to the current track's ghost.
     * A ghost track is created when a trackevent overlaps another trackevent and there is
     * no room for a ghost trackevent to exist.
     */
    _this.ghost = null;

    EventManager.extend( _this );

    /**
     * Member: setPopcornWrapper
     *
     * Sets the PopcornWrapper object. Subsequently, PopcornWrapper can be used to directly manipulate Popcorn track events.
     *
     * @param {Object} newPopcornWrapper: PopcornWrapper object or null
     */
    this.setPopcornWrapper = function ( newPopcornWrapper ) {
      _popcornWrapper = newPopcornWrapper;
      for ( var i = 0, l = _trackEvents.length; i < l; ++i ){
        _trackEvents[ i ].bind( _this, newPopcornWrapper );
      }
    };

    this.updateTrackEvents = function() {
      var trackEvents = _trackEvents.slice();
      for ( var i = 0, l = trackEvents.length; i < l; i++ ) {
        trackEvents[ i ].update();
      }
    };

    Object.defineProperties( this, {
      view: {
        enumerable: true,
        configurable: false,
        get: function(){
          return _view;
        }
      },
      target: {
        enumerable: true,
        get: function(){
          return _target;
        },
        set: function( val ){
          _target = val;
          _this.dispatch( "tracktargetchanged", _this );
          for( var i=0, l=_trackEvents.length; i<l; i++ ) {
            _trackEvents[ i ].target = val;
            _trackEvents[ i ].update({ target: val });
          }
        }
      },
      name: {
        enumerable: true,
        get: function(){
          return _name;
        },
        set: function( name ) {
          _name = name;
          _this.dispatch( "tracknamechanged", _this );
        }
      },
      id: {
        enumerable: true,
        get: function() {
          return _id;
        }
      },
      json: {
        enumerable: true,
        get: function(){
          var exportJSONTrackEvents = [];
          for ( var i=0, l=_trackEvents.length; i<l; ++i ) {
            exportJSONTrackEvents.push( _trackEvents[ i ].json );
          }
          return {
            name: _name,
            id: _id,
            trackEvents: exportJSONTrackEvents
          };
        },
        set: function( importData ){
          if( importData.name ){
            _name = importData.name;
          }
          if( importData.trackEvents ){
            var importTrackEvents = importData.trackEvents;
            if ( Array.isArray( importTrackEvents ) ) {
              for( var i = 0, l = importTrackEvents.length; i < l; ++i ) {
                _this.addTrackEvent( importTrackEvents[ i ] );
              }
            } else if ( console ) {
              console.warn( "Ignored imported track event data. Must be in an Array." );
            }
          }
        }
      },
      trackEvents: {
        enumerable: true,
        configurable: false,
        get: function(){
          return _trackEvents;
        }
      },
      order: {
        enumerable: true,
        get: function() {
          return _order;
        },
        set: function( val ) {
          _order = val;
          _name = NAME_PREFIX + val;
        }
      }
    });

    this.getTrackEventById = function( id ){
      for ( var i=0, l=_trackEvents.length; i<l; ++i) {
        if( _trackEvents[ i ].id === id ) {
          return _trackEvents[ i ];
        } //if
      } //for
    }; //getTrackEventById

    this.getTrackEventByName = function( name ){
      for ( var i=0, l=_trackEvents.length; i<l; ++i) {
        if( _trackEvents[ i ].name === name ) {
          return _trackEvents[ i ];
        } //if
      } //for
    }; //getTrackEventByName

    function trackEventUpdateNotificationHandler( notification ) {
      var trackEvent = notification.origin,
          updateOptions = notification.data,
          currentOptions = trackEvent.popcornOptions,
          start = updateOptions.start || updateOptions.start === 0 ? updateOptions.start : currentOptions.start,
          end = updateOptions.end || updateOptions.end === 0 ? updateOptions.end : currentOptions.end,
          destinationTrack,
          nextTrack;

      // If the update will cause this event to overlap with another ...
      if ( trackEvent.track.findOverlappingTrackEvent( start, end, trackEvent ) ) {
        // reject the update by cancelling the notifiction;
        notification.cancel( "trackevent-overlap" );

        // remove the incriminating trackEvent to avoid conflicts;
        _this.removeTrackEvent( trackEvent );

        // find another track for the trackEvent to live on;
        nextTrack = _this._media.getNextTrack( _this );
        destinationTrack = nextTrack ? _this._media.forceEmptyTrackSpaceAtTime( nextTrack, start, end ) : _this._media.addTrack();

        // update the track with the updateOptions that were first issued;
        trackEvent.update( updateOptions );

        // and, finally, place the track in its new home.
        destinationTrack.addTrackEvent( trackEvent );
      }
    }

    this.addTrackEvent = function( trackEvent ) {
      var oldSelected = false;

      if ( !( trackEvent instanceof TrackEvent ) ) {
        trackEvent = new TrackEvent( trackEvent );
      } else if ( trackEvent.selected ) {
        // cache the track event's selected state
        oldSelected = true;
        // a selected track event cannot be selected again, so we deselect it
        trackEvent.selected = false;
      }

      if ( trackEvent.track ) {
        throw "TrackEvent still bound to track. Please use `track.removeTrackEvent` first.";
      }

      trackEvent.bind( _this, _popcornWrapper );

      // If the track itself has a target, give it to the trackevent as well.
      if( _target ){
        trackEvent.target = _target;
      }
      // Remember the trackevent
      _trackEvents.push( trackEvent );

      // Listen for a handful of events that affect functionality in and outside of this track.
      _this.chain( trackEvent, [
        "trackeventupdated",
        "trackeventselected",
        "trackeventdeselected"
      ]);

      // Add it to the view.
      _view.addTrackEvent( trackEvent );

      trackEvent.selected = oldSelected;

      trackEvent.subscribe( "update", trackEventUpdateNotificationHandler );

      _this.dispatch( "trackeventadded", trackEvent );

      // Update the trackevent with defaults (if necessary)
      if ( _this._media ) {
        trackEvent.update( trackEvent.popcornOptions, true );
      }

      return trackEvent;
    }; //addTrackEvent

    /*
     * Method removeTrackEvent
     *
     * @param {Object} trackEvent: The trackEvent to be removed from this track
     */
    this.removeTrackEvent = function( trackEvent, preventRemove ) {
      var idx = _trackEvents.indexOf( trackEvent );
      if ( idx > -1 ) {
        _trackEvents.splice( idx, 1 );
        _this.unchain( trackEvent, [
          "trackeventupdated",
          "trackeventselected",
          "trackeventdeselected"
        ]);
        trackEvent.unsubscribe( "update", trackEventUpdateNotificationHandler );
        _view.removeTrackEvent( trackEvent );
        trackEvent.unbind( preventRemove );
        _this.dispatch( "trackeventremoved", trackEvent );
        return trackEvent;
      }
    };

    this.findOverlappingTrackEvent = function( start, end, ignoreTrackEvent ) {
      var trackEvent, popcornOptions;

      // If a TrackEvent was passed in, we can derive the rest from less arguments.
      if ( start instanceof TrackEvent ) {
        // If only two args were passed in, treat the last one as ignoreTrackEvent.
        if ( arguments.length === 2 ) {
          ignoreTrackEvent = end;
        }

        // Sort out the args again.
        trackEvent = start;
        start = trackEvent.popcornOptions.start;
        end = trackEvent.popcornOptions.end;
      }

      // loop over all the trackevents for this track and see if we overlap
      for ( var i = 0, l = _trackEvents.length; i < l; i++ ) {
        trackEvent = _trackEvents[ i ];
        popcornOptions = trackEvent.popcornOptions;
        // if a trackevent overlaps and it's not a ghost...
        if (  trackEvent !== ignoreTrackEvent &&
              !trackEvent.view.isGhost &&
              !( start >= popcornOptions.end || end <= popcornOptions.start ) ) {
          return trackEvent;
        }
      }
      return null;
    };

    this.deselectEvents = function( except ){
      var trackEvent;
      for ( var i = 0, l = _trackEvents.length; i < l; ++i ) {
        trackEvent = _trackEvents[ i ];
        if( trackEvent !== except && trackEvent.selected ){
          trackEvent.selected = false;
        } //if
      } //for
    }; //deselectEvents

  }; //Track

  return Track;

}); //define
;
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('ui/page-element', [ "core/logger", "util/dragndrop" ],
        function( Logger, DragNDrop ) {

  var BLINK_DURATION = 1500;
  var FADE_WAIT = 200;

  return function( element, events ) {

    var _element = typeof( element ) === "string" ? document.getElementById( element ) : element,
        _events = events || {},
        _droppable,
        _highlighting = false,
        _blinking = false,
        _this = this;

    function toggleElementState( state ) {
      if ( state ) {
        _element.classList.add( "butter-highlight-on" );
      }
      else {
        _element.classList.remove( "butter-highlight-on" );
      }
    }

    this.highlight = function( state ) {
      toggleElementState( state );
      _highlighting = state;
      _blinking = false;
      _element.classList.remove( "butter-highlight-fade" );
    };

    this.destroy = function() {
      if ( _droppable ) {
        _droppable.destroy();
      }
    };

    function onBlinkEnd() {
      _blinking = false;
      _element.classList.remove( "butter-highlight-fade" );
      if ( !_highlighting ) {
        toggleElementState( false );
      }
    }

    this.blink = function() {
      if ( !_highlighting && !_blinking ) {
        _blinking = true;
        setTimeout( function(){
          // Check if we're still blinking (could have been interrupted by a zealous dragger)
          if ( _blinking ) {
            _element.classList.add( "butter-highlight-fade" );
          }
        }, FADE_WAIT );
        toggleElementState( true );
        setTimeout( onBlinkEnd, BLINK_DURATION );
      }
    };

    if ( _element ) {
      _element.setAttribute( "butter-clean", "true" );

      _droppable = DragNDrop.droppable( _element, {
        over: function( dragElement ) {
          if ( dragElement.getAttribute( "data-butter-draggable-type" ) !== "plugin" ) {
            return;
          }
          _this.highlight( true );
          if ( _events.over ) {
            _events.over();
          }
        },
        out: function( dragElement ) {
          if ( dragElement.getAttribute( "data-butter-draggable-type" ) !== "plugin" ) {
            return;
          }
          _this.highlight( false );
          if ( _events.out ) {
            _events.out();
          }
        },
        drop: function( dragElement, position, popcornOptions ) {
          if ( !dragElement.getAttribute || dragElement.getAttribute( "data-butter-draggable-type" ) !== "plugin" ) {
            return;
          }
          _this.highlight( false );
          if ( _events.drop ) {
            _events.drop( dragElement, position, popcornOptions );
          }
        }
      });

    }

    // Expose element
    this.element = _element;

  };

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function() {
  define('core/target', [ "core/logger", "core/eventmanager", "ui/page-element" ],
          function( Logger, EventManager, PageElement ) {

    var __guid = 0;

    var Target = function ( options ) {
      options = options || {};

      var _id = "Target" + __guid++,
          _logger = new Logger( _id ),
          _name = options.name || _id,
          _element,
          _pageElement,
          _this = this;

      EventManager.extend( _this );

      _element = document.getElementById( options.element );

      if( !_element ){
        _logger.log( "Warning: Target element is null." );
      }
      else {
        _pageElement = new PageElement( _element, {
          drop: function( element, position, popcornOptions ){
            _this.dispatch( "trackeventrequested", {
              element: element,
              target: _this,
              position: position,
              popcornOptions: popcornOptions
            });
          }
        });
      } //if

      this.destroy = function () {
        if ( _pageElement ) {
          _pageElement.destroy();
        }
      };

      Object.defineProperties( this, {
        view: {
          enumerable: true,
          get: function(){
            return _pageElement;
          }
        },
        name: {
          enumerable: true,
          get: function(){
            return _name;
          }
        },
        id: {
          enumerable: true,
          get: function(){
            return _id;
          }
        },
        elementID: {
          enumerable: true,
          get: function(){
            if( _element ){
              return _element.id;
            } //if
          }
        },
        element: {
          enumerable: true,
          get: function(){
            return _element;
          }
        },
        isDefault: {
          enumerable: true,
          get: function(){
            if( _element && _element.hasAttribute( "data-butter-default" ) ){
              return true;
            } //if
            return false;
          }
        },
        json: {
          enumerable: true,
          get: function(){
            var elem = "";
            if( _element && _element.id ){
              elem = _element.id;
            } //if
            return {
              id: _id,
              name: _name,
              element: elem
            };
          },
          set: function( importData ){
            if( importData.name ){
              _name = importData.name;
            } //if
            if( importData.element ){
              _element = document.getElementById( importData.element );
            } //if
          }
        }
      });

    }; //Target

    return Target;

  }); //define
}());

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/uri', [], function(){

  // -------------------------------------------------------------
  // parseUri 1.2.2
  // (c) Steven Levithan <stevenlevithan.com>
  // http://blog.stevenlevithan.com/archives/parseuri
  // MIT License

  function parseUri( str ){
    var o   = parseUri.options,
        m   = o.parser[ o.strictMode ? "strict" : "loose" ].exec( str ),
        uri = {},
        i   = 14;

    while( i-- ){
      uri[ o.key[ i ] ] = m[ i ] || "";
    }

    uri[ o.q.name ] = {};
    uri[ o.key[ 12 ] ].replace( o.q.parser, function( $0, $1, $2 ){
      if ($1){
        uri[ o.q.name ][ $1 ] = $2;
      }
    });

    return uri;
  }

  parseUri.options = {
    strictMode: false,
    key: [
      "source","protocol","authority","userInfo","user","password",
      "host","port","relative","path","directory","file","query","anchor"
    ],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };

  // -------------------------------------------------------------

  // Unique key name for query string
  var UID_KEY_NAME = "butteruid";

  // A default seed that won't collide.
  var seed = Date.now();

  // Reconstruct a URI from its parts as a string.
  function uriToString( uri ){
    var s = "";

    // XXX: need to figure out proper rules/exceptions for adding //
    s += uri.protocol ? uri.protocol + "://" : "";
    s += uri.authority || "";
    s += uri.path || "";
    s += uri.query ? "?" + uri.query : "";
    s += uri.anchor ? "#" + uri.anchor : "";

    return s;
  }

  // Rebuild the query string for a uri
  function updateQuery( uriObject ) {
    var queryKey = uriObject.queryKey,
        queryString = "",
        queryKeyCount = 0,
        key, value;

    for ( key in queryKey ) {
      if ( queryKey.hasOwnProperty( key ) ) {
        value = queryKey[ key ];
        queryString += queryKeyCount > 0 ? "&" : "";
        queryString += key;
        // Allow value=0
        queryString += ( !!value || value === 0 ) ? "=" + value : "";
        queryKeyCount++;
      }
    }
    uriObject.query = queryString;
    return uriObject;
  }

  var URI = {

    // Allow overriding the initial seed (mostly for testing).
    set seed( value ){
      seed = value|0;
    },
    get seed(){
      return seed;
    },

    // Parse a string into a URI object.
    parse: function( uriString ){
      var uri = parseUri( uriString );
      uri.toString = function(){
        return uriToString( this );
      };
      return uri;
    },

    // Make a URI object (or URI string, turned into a URI object) unique.
    // This will turn http://foo.com into http://foo.com?<UID_KEY_NAME>=<seed number++>.
    makeUnique: function( uriObject ){
      if( typeof uriObject === "string" ){
        uriObject = this.parse( uriObject );
      }

      var queryKey = uriObject.queryKey;
      queryKey[ UID_KEY_NAME ] = seed++;
      return updateQuery( uriObject );
    },

    // Remove the butteruid unique identifier from a URL, that is, undo makeUnique
    stripUnique: function( uriObject ) {
      if( typeof uriObject === "string" ){
        uriObject = this.parse( uriObject );
      }

      var queryKey = uriObject.queryKey;
      if( queryKey ) {
        delete queryKey[ UID_KEY_NAME ];
      }
      return updateQuery( uriObject );
    }
  };

  return URI;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */
/*jshint evil:true*/

define('core/popcorn-wrapper', [ "core/logger", "core/eventmanager", "util/uri" ], function( Logger, EventManager, URI ) {

  // regex to determine the type of player we need to use based on the provided url
  var __urlRegex = /(?:http:\/\/www\.|http:\/\/|www\.|\.|^)(youtu|vimeo|soundcloud|baseplayer)/;

      // how long to wait for the status of something in checkTimeoutLoop
  var STATUS_INTERVAL = 100,
      // timeout duration to wait for popcorn players to exist
      PLAYER_WAIT_DURATION = 10000,
      // timeout duration to wait for media to be ready
      MEDIA_WAIT_DURATION = 10000;

  /* The Popcorn-Wrapper wraps various functionality and setup associated with
   * creating, updating, and removing associated data with Popcorn.js.
   */
  return function ( mediaId, options ){

    var _id = mediaId,
        _logger = new Logger( _id + "::PopcornWrapper" ),
        _popcornEvents = options.popcornEvents || {},
        _onPrepare = options.prepare || function(){},
        _onFail = options.fail || function(){},
        _onPlayerTypeRequired = options.playerTypeRequired || function(){},
        _onTimeout = options.timeout || function(){},
        _popcorn,
        _mediaReady = false,
        _mediaType,
        _interruptLoad = false,
        _this = this,
        _makeVideoURLsUnique = options.makeVideoURLsUnique;

    /* Destroy popcorn bindings specfically without touching other discovered
     * settings
     */
    this.unbind = function(){
      if ( _popcorn ) {
        try{
          _popcorn.destroy();
          _popcorn = undefined;
        }
        catch( e ){
          _logger.log( "WARNING: Popcorn did NOT get destroyed properly: \n" + e.message + "\n" + e.stack );
        }
      }
    };

    /* Setup any handlers that were defined in the options passed into
     * popcorn wrapper. Events such as timeupdate, paused, etc
     */
    function addPopcornHandlers(){
      for ( var eventName in _popcornEvents ){
        if ( _popcornEvents.hasOwnProperty( eventName ) ) {
          _popcorn.on( eventName, _popcornEvents[ eventName ] );
        }
      } //for
    } //addPopcornHandlers

    // Cancel loading or preparing of media whilst attempting to setup
    this.interruptLoad = function(){
      _interruptLoad = true;
    }; //interrupt

    // Update Popcorn events with data from a butter trackevent
    this.synchronizeEvent = function( trackEvent, newOptions ) {
      var options = trackEvent.popcornOptions,
          popcornId = trackEvent.id,
          popcornEvent = null;

      function createTrackEvent() {

        if ( _popcorn.getTrackEvent( popcornId ) ) {
          _popcorn[ trackEvent.type ]( popcornId, newOptions );
        } else {
          _popcorn[ trackEvent.type ]( popcornId, options );
        }

        popcornEvent = _popcorn.getTrackEvent( popcornId );
        trackEvent.popcornTrackEvent = popcornEvent;

        trackEvent.popcornOptions.start = +popcornEvent.start;
        trackEvent.popcornOptions.end = +popcornEvent.end;

        if ( trackEvent.view ) {
          if ( popcornEvent.toString ) {
            trackEvent.view.setToolTip( popcornEvent.toString() );
            if ( trackEvent.type === "sequencer" ) {
              if ( !trackEvent.popcornOptions.hidden ) {
                trackEvent.view.element.classList.add( "sequencer-video" );
                trackEvent.view.element.classList.remove( "sequencer-audio" );
              } else {
                trackEvent.view.element.classList.add( "sequencer-audio" );
                trackEvent.view.element.classList.remove( "sequencer-video" );
              }
            }
          } else {
            trackEvent.view.setToolTip( JSON.stringify( options ) );
          }
        }

        trackEvent.view.update( trackEvent.popcornOptions );

        // make sure we have a reference to the trackevent before calling toString
        if ( trackEvent.popcornTrackEvent ) {
          trackEvent.view.elementText = trackEvent.popcornTrackEvent.toString();
          // we should only get here if no exceptions happened
          trackEvent.dispatch( "trackeventupdated", trackEvent );
        }
      }

      if ( _popcorn ) {
        // make sure the plugin is still included
        if ( _popcorn[ trackEvent.type ] ) {
          if ( trackEvent.type === "sequencer" ) {
            waitForPopcorn( createTrackEvent, function() {
              throw "Your media seems to be taking a long time to load. Review your media URL(s) or continue waiting.";
            }, findMediaType( trackEvent.popcornOptions.source ) );
          } else {
            createTrackEvent();
          }
        }
      }
    };

    // Destroy a Popcorn trackevent
    this.destroyEvent = function( trackEvent ){
      var popcornId = trackEvent.id;

      // ensure the trackevent actually exists before we remove it
      if ( _popcorn ) {
        if ( popcornId && _popcorn.getTrackEvent( popcornId ) ) {
          _popcorn.removeTrackEvent( popcornId );
        } //if

      } //if
    }; //destroyEvent

    /* Create functions for various failure and success cases,
     * generate the Popcorn string and ensures our player is ready
     * before we actually create the Popcorn instance and notify the
     * user.
     */
    this.prepare = function( url, target, popcornOptions, callbacks, scripts ){
      var urlsFromString;

      _mediaReady = false;

      // called when timeout occurs preparing popcorn
      function popcornTimeoutWrapper( e ) {
        _interruptLoad = true;
        _onTimeout( e );
      }

      // called when timeout occurs preparing media
      function mediaTimeoutWrapper( e ) {
        _onTimeout( e );
      }

      // called when there's a serious failure in preparing popcorn
      function failureWrapper( e ) {
        _interruptLoad = true;
        _logger.log( e );
        _onFail( e );
      }

      // attempt to grab the first url for a type inspection
      // In the case of URL being a string, check that it doesn't follow our format for
      // Null Video (EG #t=,200). Without the check it incorrectly will splice on the comma.
      var firstUrl = url;
      if ( typeof( url ) !== "string" ) {
        if ( !url.length ) {
          throw "URL is invalid: empty array or not a string.";
        }
        else {
          firstUrl = url[ 0 ];
        }
      }
      else if ( url.indexOf( "#t" ) !== 0 && url.indexOf( "," ) > -1 ) {
        urlsFromString = url.split( "," );
        firstUrl = urlsFromString[ 0 ];
        url = urlsFromString;
      }

      // discover and stash the type of media as dictated by the url
      setMediaType( firstUrl );

      // if there isn't a target, we can't really set anything up, so stop here
      if ( !target ) {
        _logger.log( "Warning: tried to prepare media with null target." );
        return;
      }

      // only enter this block if popcorn doesn't already exist (call clear() first to destroy it)
      if ( !_popcorn ) {
        try {
          // make sure popcorn is setup properly: players, etc
          waitForPopcorn( function(){
            // construct the correct dom infrastructure if required
            constructPlayer( target );
            // generate a function which will create a popcorn instance when entered into the page
            createPopcorn( generatePopcornString( popcornOptions, url, target, null, callbacks, scripts ) );
            // once popcorn is created, attach listeners to it to detect state
            addPopcornHandlers();
            // wait for the media to become available and notify the user, or timeout
            waitForMedia( _onPrepare, mediaTimeoutWrapper );
          }, popcornTimeoutWrapper, _mediaType );
        }
        catch( e ) {
          // if we've reached here, we have an internal failure in butter or popcorn
          failureWrapper( e );
        }
      }

    };

    /* Return the type of media that is going to be used
     * based on the specified url
     */
    function findMediaType( url ){
      var regexResult = __urlRegex.exec( url ),
          // if the regex didn't return anything we know it's an HTML5 source
          mediaType = "object";
      if ( regexResult ) {
        mediaType = regexResult[ 1 ];
        // our regex only handles youtu ( incase the url looks something like youtu.be )
        if ( mediaType === "youtu" ) {
          mediaType = "youtube";
        }
      }
      return mediaType;
    }

    /* Sets the type of media that is going to be used
     * based on the specified url
     */
    function setMediaType( url ) {
      _mediaType = findMediaType( url );
      return _mediaType;
    }

    /* If possible and necessary, reformat the dom to conform to the url type specified
     * for the media. For example, youtube/vimeo players like <div>'s, not <video>'s to
     * dwell in.
     */
    function constructPlayer( target ){
      var targetElement = document.getElementById( target );

      if ( _mediaType !== "object" && targetElement ) {
        if ( [ "VIDEO", "AUDIO" ].indexOf( targetElement.nodeName ) !== -1 ) {
          var parentNode = targetElement.parentNode,
              newElement = document.createElement( "div" ),
              videoAttributes = [ "controls", "preload", "autoplay", "loop", "muted", "poster", "src" ],
              attributes;

          newElement.id = targetElement.id;
          attributes = targetElement.attributes;
          if ( attributes ) {
            for( var i = attributes.length - 1; i >= 0; i-- ) {
              var name = attributes[ i ].nodeName;
              if ( videoAttributes.indexOf( name ) === -1 ) {
                newElement.setAttribute( name, targetElement.getAttribute( name ) );
              }
            }
          }
          if ( targetElement.className ) {
            newElement.className = targetElement.className;
          }
          parentNode.replaceChild( newElement, targetElement );
          newElement.setAttribute( "data-butter", "media" );
        }
      }
    }

    /* Determine which player is needed (usually based on the result of setMediaType)
     * and create a stringified representation of the Popcorn constructor (usually to
     * insert in a script tag).
     */
    var generatePopcornString = this.generatePopcornString = function( popcornOptions, url, target, method, callbacks, scripts, trackEvents ){

      callbacks = callbacks || {};
      scripts = scripts || {};

      var popcornString = "",
          optionString,
          saveOptions,
          i,
          option;

      // Chrome currently won't load multiple copies of the same video.
      // See http://code.google.com/p/chromium/issues/detail?id=31014.
      // Munge the url so we get a unique media resource key.
      // However if set in the config, don't append this
      url = typeof url === "string" ? [ url ] : url;
      if ( _makeVideoURLsUnique ) {
        for( i=0; i<url.length; i++ ){
          url[ i ] = URI.makeUnique( url[ i ] ).toString();
        }
      }
      // Transform into a string of URLs (i.e., array string)
      url = JSON.stringify( url );

      // prepare popcornOptions as a string
      if ( popcornOptions ) {
        popcornOptions = ", " + JSON.stringify( popcornOptions );
      } else {
        popcornOptions = ", {}";
      }

      // attempt to get the target element, and continue with a warning if a failure occurs
      if ( typeof( target ) !== "string" ) {
        if ( target && target.id ) {
          target = target.id;
        }
        else{
          _logger.log( "WARNING: Unexpected non-string Popcorn target: " + target );
        }
      } //if

      // if the media type hasn't been discovered yet, bail, since it's pointless to continue
      if ( !_mediaType ) {
        throw new Error( "Media type not generated yet. Please specify a url for media objects before generating a popcorn string." );
      }

      if ( scripts.init ) {
        popcornString += scripts.init + "\n";
      }
      if ( callbacks.init ) {
        popcornString += callbacks.init + "();\n";
      }

      // special case for basePlayer, since it doesn't require as much of a harness
      if ( _mediaType === "baseplayer" ) {
        popcornString +=  "Popcorn.player( 'baseplayer' );\n" +
                          "var popcorn = Popcorn.baseplayer( '#" + target + "' " + popcornOptions + " );\n";
      } else {
        // just try to use Popcorn.smart to detect/setup video
        popcornString += "var popcorn = Popcorn.smart( '#" + target + "', " + url + popcornOptions + " );\n";
      }

      if ( scripts.beforeEvents ) {
        popcornString += scripts.beforeEvents + "\n";
      }
      if ( callbacks.beforeEvents ) {
        popcornString += callbacks.beforeEvents + "( popcorn );\n";
      }

      // if popcorn was built successfully
      if ( _popcorn ) {

        if ( trackEvents ) {
          for ( i = trackEvents.length - 1; i >= 0; i-- ) {
            popcornOptions = trackEvents[ i ].popcornOptions;

            saveOptions = {};
            for ( option in popcornOptions ) {
              if ( popcornOptions.hasOwnProperty( option ) ) {
                if ( popcornOptions[ option ] !== undefined ) {
                  saveOptions[ option ] = popcornOptions[ option ];
                }
              }
            }

            //stringify will throw an error on circular data structures
            try {
              //pretty print with 4 spaces per indent
              optionString = JSON.stringify( saveOptions, null, 4 );
            } catch ( jsonError ) {
              optionString = false;
              _logger.log( "WARNING: Unable to export event options: \n" + jsonError.message );
            }

            if ( optionString ) {
              popcornString += "popcorn." + trackEvents[ i ].type + "(" +
                optionString + ");\n";
            }

          }

        }

      }

      if ( scripts.afterEvents ) {
        popcornString += scripts.afterEvents + "\n";
      }
      if ( callbacks.afterEvents ) {
        popcornString += callbacks.afterEvents + "( popcorn );\n";
      }

      popcornString += "popcorn.controls( false );\n";

      // if the `method` var is blank, the user probably just wanted an inline function without an onLoad wrapper
      method = method || "inline";

      // ... otherwise, wrap the function in an onLoad wrapper
      if ( method === "event" ) {
        popcornString = "\ndocument.addEventListener('DOMContentLoaded',function(e){\n" + popcornString;
        popcornString += "\n},false);";
      }
      else {
        popcornString = popcornString + "\nreturn popcorn;";
      } //if

      return popcornString;
    };

    /* Create a Popcorn instace in the page. Try just running the generated function first (from popcornString)
     * and insert it as a script in the head if that fails.
     */
    function createPopcorn( popcornString ){
      var popcornFunction = new Function( "", popcornString ),
          popcorn = popcornFunction();
      if ( !popcorn ) {
        var popcornScript = document.createElement( "script" );
        popcornScript.innerHTML = popcornString;
        document.head.appendChild( popcornScript );
        popcorn = window.Popcorn.instances[ window.Popcorn.instances.length - 1 ];
      }
      _popcorn = popcorn;
    }

    /* Abstract the problem of waiting for some condition to occur with a timeout. Loop on checkFunction,
     * calling readyCallback when it succeeds, or calling timeoutCallback after MEDIA_WAIT_DURATION milliseconds.
     */
    function checkTimeoutLoop( checkFunction, readyCallback, timeoutCallback ){
      var ready = false;

      // perform one check
      function doCheck(){

        if ( _interruptLoad ) {
          return;
        }

        // run the check function
        ready = checkFunction();
        if ( ready ) {
          // if success, call the ready callback
          readyCallback();
        }
        else {
          // otherwise, prepare for another loop
          setTimeout( doCheck, STATUS_INTERVAL );
        }
      }

      // set a timeout to occur after timeoutDuration milliseconds
      setTimeout(function(){
        // if success hasn't already occured, call timeoutCallback
        if ( !ready ) {
          timeoutCallback();
        }
      }, MEDIA_WAIT_DURATION );

      //init
      doCheck();
    }

    /* Wait for the media to return a sane readyState and duration so we can interact
     * with it (uses checkTimeoutLoop).
     */
    function waitForMedia( readyCallback, timeoutCallback ){
      checkTimeoutLoop(function(){
        // Make sure _popcorn still exists (e.g., destroy() hasn't been called),
        // that we're ready, and that we have a duration.
        _mediaReady = ( _popcorn && ( _popcorn.media.readyState >= 1 && _popcorn.duration() > 0 ) );

        return _mediaReady;
      }, readyCallback, timeoutCallback, MEDIA_WAIT_DURATION );
    }

    /* Wait for Popcorn to be set up and to have the required players load (uses
     * checkTimeoutLoop).
     */
    function waitForPopcorn( readyCallback, timeoutCallback, mediaType ) {
      if ( mediaType !== "object" ) {
        _onPlayerTypeRequired( mediaType );
        checkTimeoutLoop(function(){
          return ( !!window.Popcorn[ mediaType ] );
        }, readyCallback, timeoutCallback, PLAYER_WAIT_DURATION );
      }
      else{
        readyCallback();
      }
    }

    // Passthrough to the Popcorn instances play method
    this.play = function(){
      if ( _mediaReady && _popcorn.paused() ) {
        _popcorn.play();
      }
    };

    // Passthrough to the Popcorn instances pause method
    this.pause = function(){
      if ( _mediaReady && !_popcorn.paused() ) {
        _popcorn.pause();
      }
    };

    // XXX: SoundCloud has a bug (reported by us, but as yet unfixed) which blocks
    // loading of a second iframe/player if the iframe for the first is removed
    // from the DOM.  We can simply move old ones to a quarantine div, hidden from
    // the user for now (see #2630).  We lazily create and memoize the instance.
    function getSoundCloudQuarantine() {
      if ( getSoundCloudQuarantine.instance ) {
        return getSoundCloudQuarantine.instance;
      }

      var quarantine = document.createElement( "div" );
      quarantine.style.width = "0px";
      quarantine.style.height = "0px";
      quarantine.style.overflow = "hidden";
      quarantine.style.visibility = "hidden";
      document.body.appendChild( quarantine );

      getSoundCloudQuarantine.instance = quarantine;
      return quarantine;
    }

    // Wipe the current Popcorn instance and anything it created
    this.clear = function( container ) {
      if ( typeof( container ) === "string" ) {
        container = document.getElementById( container );
      }
      if ( !container ) {
        _logger.log( "Warning: tried to clear media with null target." );
        return;
      }

      function isSoundCloud( p ) {
        return !!(
          p.media       &&
          p.media._util &&
          p.media._util.type === "SoundCloud" );
      }

      if ( _popcorn ) {
        if ( isSoundCloud( _popcorn ) ) {
          // XXX: pull the SoundCloud iframe element out of our video div, and quarantine
          // so we don't delete it, and block loading future SoundCloud instances. See above.
          var soundCloudParent = _popcorn.media.parentNode,
              soundCloudIframe = soundCloudParent.querySelector( "iframe" );
          if ( soundCloudIframe ) {
            getSoundCloudQuarantine().appendChild( soundCloudIframe );
          }
        }
        _this.unbind();
      }

      // Tear-down old instances, special-casing SoundCloud removal, see above.
      while( container.firstChild ) {
        container.removeChild( container.firstChild );
      }

      if ( [ "AUDIO", "VIDEO" ].indexOf( container.nodeName ) > -1 ) {
        container.currentSrc = "";
        container.src = "";
        container.removeAttribute( "src" );
      }
    };

    Object.defineProperties( this, {
      volume: {
        enumerable: true,
        set: function( val ){
          if ( _popcorn ) {
            _popcorn.volume( val );
          } //if
        },
        get: function() {
          if ( _popcorn ) {
            return _popcorn.volume();
          }
          return false;
        }
      },
      muted: {
        enumerable: true,
        set: function( val ) {
          if ( _popcorn ) {
            if ( val ) {
              _popcorn.mute();
            }
            else {
              _popcorn.unmute();
            } //if
          } //if
        },
        get: function() {
          if ( _popcorn ) {
            return _popcorn.muted();
          }
          return false;
        }
      },
      currentTime: {
        enumerable: true,
        set: function( val ) {
          if ( _mediaReady && _popcorn ) {
            _popcorn.currentTime( val );
          } //if
        },
        get: function() {
          if ( _popcorn ) {
            return _popcorn.currentTime();
          }
          return 0;
        }
      },
      duration: {
        enumerable: true,
        get: function() {
          if ( _popcorn ) {
            return _popcorn.duration();
          } //if
          return 0;
        }
      },
      popcorn: {
        enumerable: true,
        get: function(){
          return _popcorn;
        }
      },
      paused: {
        enumerable: true,
        get: function() {
          if ( _popcorn ) {
            return _popcorn.paused();
          } //if
          return true;
        },
        set: function( val ) {
          if ( _popcorn ) {
            if ( val ) {
              _this.pause();
            }
            else {
              _this.play();
            } //if
          } //if
        }
      } //paused
    });

  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function() {
  define('core/media', [
            "core/logger",
            "core/eventmanager",
            "core/track",
            "core/popcorn-wrapper",
            "util/uri"
          ],
          function( Logger, EventManager, Track, PopcornWrapper, URI ) {

    var MEDIA_ELEMENT_SAFETY_POLL_INTERVAL = 500,
        MEDIA_ELEMENT_SAFETY_POLL_ATTEMPTS = 10;

    var __guid = 0;

    var Media = function ( mediaOptions ) {
      mediaOptions = mediaOptions || {};

      EventManager.extend( this );

      var _tracks = [],
          _orderedTracks = [],
          _id = "Media" + __guid++,
          _logger = new Logger( _id ),
          _name = mediaOptions.name || _id,
          _url = mediaOptions.url,
          _ready = false,
          _target = mediaOptions.target,
          _registry,
          _currentTime = 0,
          _duration = -1,
          _popcornOptions = mediaOptions.popcornOptions,
          _mediaUpdateInterval,
          _this = this,
          _popcornWrapper = new PopcornWrapper( _id, {
            popcornEvents: {
              muted: function(){
                _this.dispatch( "mediamuted", _this );
              },
              unmuted: function(){
                _this.dispatch( "mediaunmuted", _this );
              },
              volumechange: function(){
                _this.dispatch( "mediavolumechange", _popcornWrapper.volume );
              },
              timeupdate: function(){
                _currentTime = _popcornWrapper.currentTime;
                _this.dispatch( "mediatimeupdate", _this );
              },
              pause: function(){
                clearInterval( _mediaUpdateInterval );
                _this.dispatch( "mediapause" );
              },
              play: function(){
                _mediaUpdateInterval = setInterval( function(){
                  _currentTime = _popcornWrapper.currentTime;
                }, 10 );
                _this.dispatch( "mediaplay" );
              },
              ended: function(){
                _this.dispatch( "mediaended" );
              },
              seeked: function(){
                _this.dispatch( "mediaseeked" );
              }
            },
            prepare: function(){
              _this.duration = _popcornWrapper.duration;
              _ready = true;
              for( var i = 0, l = _tracks.length; i < l; i++ ) {
                _tracks[ i ].updateTrackEvents();
              }

              // If the target element has a `data-butter-media-controls` property,
              // set the `controls` attribute on the corresponding media element.
              var targetElement = document.getElementById( _target );
              if (  targetElement &&
                    targetElement.getAttribute( "data-butter-media-controls" ) ) {
                _popcornWrapper.popcorn.controls( true );
              }

              _this.dispatch( "mediaready" );
            },
            timeout: function(){
              _this.dispatch( "mediatimeout" );
            },
            fail: function(){
              _this.dispatch( "mediafailed", "error" );
            },
            playerTypeRequired: function( type ){
              _this.dispatch( "mediaplayertyperequired", type );
            },
            setup: {
              target: _target,
              url: _url
            },
            makeVideoURLsUnique: mediaOptions.makeVideoURLsUnique
          });

      this.popcornCallbacks = null;
      this.popcornScripts = null;
      this.maxPluginZIndex = 0;

      this.destroy = function(){
        _popcornWrapper.unbind();
      };

      this.clear = function(){
        for ( var i = _tracks.length - 1; i >= 0; i-- ) {
          _this.removeTrack( _tracks[ i ] );
        }
      };

      function ensureNewTrackIsTrack( track ) {
        if ( !( track instanceof Track ) ) {
          track = new Track( track );
        }
        return track;
      }

      function setupNewTrack( track ) {
        track._media = _this;
        _tracks.push( track );
        _this.chain( track, [
          "tracktargetchanged",
          "trackeventadded",
          "trackeventremoved",
          "trackeventupdated",
          "trackeventselected",
          "trackeventdeselected"
        ]);
        track.setPopcornWrapper( _popcornWrapper );
      }

      function addNewTrackTrackEvents( track ) {
        var trackEvents = track.trackEvents;
        if ( trackEvents.length > 0 ) {
          for ( var i=0, l=trackEvents.length; i<l; ++i ) {
            track.dispatch( "trackeventadded", trackEvents[ i ] );
          }
        }
      }

      this.addTrack = function ( track ) {
        track = ensureNewTrackIsTrack( track );

        if ( track._media ) {
          throw "Track already belongs to a Media object. Use `media.removeTrack` prior to this function.";
        }

        // Give new track last order since it's newest
        track.order = _tracks.length;

        setupNewTrack( track );

        // Simply add the track onto the ordered tracks array
        _orderedTracks.push( track );

        _this.dispatch( "trackadded", track );
        _this.dispatch( "trackorderchanged", _orderedTracks );

        addNewTrackTrackEvents( track );

        return track;
      };

      this.insertTrackBefore = function( otherTrack, newTrack ) {
        newTrack = ensureNewTrackIsTrack( newTrack );

        if ( newTrack._media ) {
          throw "Track already belongs to a Media object. Use `media.removeTrack` prior to this function.";
        }

        var idx = _orderedTracks.indexOf( otherTrack );

        if ( idx > -1 ) {
          // Give new track last order since it's newest
          newTrack.order = idx;

          // Insert new track
          _orderedTracks.splice( idx, 0, newTrack );

          setupNewTrack( newTrack );

          _this.dispatch( "trackadded", newTrack );

          // Sort tracks after added one to update their order.
          _this.sortTracks( idx + 1 );

          addNewTrackTrackEvents( newTrack );

          return newTrack;
        }
        else {
          throw "inserTrackBefore must be passed a valid relative track.";
        }
      };

      this.getTrackById = function( id ) {
        for ( var i = 0, l = _tracks.length; i < l; ++i ) {
          if ( _tracks[ i ].id === id ) {
            return _tracks[ i ];
          }
        }
      };

      this.removeTrack = function ( track ) {
        var idx = _tracks.indexOf( track ),
            trackEvent,
            orderedIndex;
        if ( idx > -1 ) {
          _tracks.splice( idx, 1 );
          orderedIndex = _orderedTracks.indexOf( track );
          var events = track.trackEvents;
          for ( var i=0, l=events.length; i<l; ++i ) {
            trackEvent = events[ i ];
            trackEvent.selected = false;
            trackEvent.unbind();
            track.dispatch( "trackeventremoved", trackEvent );
          } //for
          _this.unchain( track, [
            "tracktargetchanged",
            "trackeventadded",
            "trackeventremoved",
            "trackeventupdated",
            "trackeventselected",
            "trackeventdeselected"
          ]);
          track.setPopcornWrapper( null );
          track._media = null;
          _orderedTracks.splice( orderedIndex, 1 );
          _this.dispatch( "trackremoved", track );
          _this.sortTracks( orderedIndex );
          return track;
        } //if
      }; //removeTrack

      this.cleanUpEmptyTracks = function() {
        var oldTracks = _tracks.slice();
        for( var i = oldTracks.length - 1; i >= 0; --i ) {
          if ( oldTracks[ i ].trackEvents.length === 0 && _tracks.length > 1 ) {
            _this.removeTrack( oldTracks[ i ] );
          }
        }
      };

      this.findTrackWithTrackEventId = function( id ){
        for( var i=0, l=_tracks.length; i<l; ++i ){
          var te = _tracks[ i ].getTrackEventById( id );
          if( te ){
            return {
              track: _tracks[ i ],
              trackEvent: te
            };
          }
        } //for
      }; //findTrackWithTrackEventId

      this.getManifest = function( name ) {
        return _registry[ name ];
      }; //getManifest

      function setupContent(){
        // In the case of URL being a string, check that it doesn't follow our format for
        // Null Video (EG #t=,200). Without the check it incorrectly will splice on the comma.
        if ( _url && _url.indexOf( "#t" ) !== 0 && _url.indexOf( "," ) > -1 ) {
          _url = _url.split( "," );
        }
        if ( _url && _target ){
          _popcornWrapper.prepare( _url, _target, _popcornOptions, _this.popcornCallbacks, _this.popcornScripts );
        }
      }

      this.setupContent = setupContent;

      this.onReady = function( callback ){
        function onReady( e ){
          callback( e );
          _this.unlisten( "mediaready", onReady );
        }
        if( _ready ){
          callback();
        }
        else{
          _this.listen( "mediaready", onReady );
        }
      };

      this.pause = function(){
        _popcornWrapper.pause();
      }; //pause

      this.play = function(){
        _popcornWrapper.play();
      };

      this.generatePopcornString = function( callbacks, scripts ){
        var popcornOptions = _popcornOptions || {};

        callbacks = callbacks || _this.popcornCallbacks;
        scripts = scripts || _this.popcornScripts;

        var collectedEvents = [];
        for ( var i = 0, l = _tracks.length; i < l; ++i ) {
          collectedEvents = collectedEvents.concat( _tracks[ i ].trackEvents );
        }

        return _popcornWrapper.generatePopcornString( popcornOptions, _url, _target, null, callbacks, scripts, collectedEvents );
      };

      function compareTrackOrder( a, b ) {
        return a.order - b.order;
      }

      this.sortTracks = function( startIndex, endIndex ) {
        var i = startIndex || 0,
            l = endIndex || _orderedTracks.length;

        for ( ; i <= l; ++i ) {
          if ( _orderedTracks[ i ] ) {
            _orderedTracks[ i ].order = i;
            _orderedTracks[ i ].updateTrackEvents();
          }
        }

        _orderedTracks.sort( compareTrackOrder );
        _this.dispatch( "trackorderchanged", _orderedTracks );
      };

      this.getNextTrack = function( currentTrack ) {
        var trackIndex = _orderedTracks.indexOf( currentTrack );
        if ( trackIndex > -1 && trackIndex < _orderedTracks.length - 1 ) {
          return _orderedTracks[ trackIndex + 1 ];
        }
        return null;
      };

      this.getLastTrack = function( currentTrack ) {
        var trackIndex = _orderedTracks.indexOf( currentTrack );
        if ( trackIndex > 0 ) {
          return _orderedTracks[ trackIndex - 1 ];
        }
        return null;
      };

      this.findNextAvailableTrackFromTimes = function( start, end ) {
        for ( var i = 0, l = _orderedTracks.length; i < l; ++i ) {
          if ( !_orderedTracks[ i ].findOverlappingTrackEvent( start, end ) ) {
            return _orderedTracks[ i ];
          }
        }
        return null;
      };

      this.forceEmptyTrackSpaceAtTime = function( track, start, end, ignoreTrackEvent ) {
        var nextTrack;

        if ( track.findOverlappingTrackEvent( start, end, ignoreTrackEvent ) ) {
          nextTrack = _this.getNextTrack( track );
          if ( nextTrack ) {
            if ( nextTrack.findOverlappingTrackEvent( start, end, ignoreTrackEvent ) ) {
              return _this.insertTrackBefore( nextTrack );
            }
            else {
              return nextTrack;
            }
          }
          else {
            return this.addTrack();
          }
        }

        return track;
      };

      this.fixTrackEventBounds = function() {
        var i, j,
            tracks, tracksLength,
            trackEvents, trackEventsLength,
            trackEvent, trackEventOptions,
            start, end;

        tracks = _orderedTracks.slice();

        // loop through all tracks
        for ( i = 0, tracksLength = tracks.length; i < tracksLength; i++ ) {
          trackEvents = tracks[ i ].trackEvents.slice();

          // loop through all track events
          for ( j = 0, trackEventsLength = trackEvents.length; j < trackEventsLength; j++ ) {
            trackEvent = trackEvents[ j ];
            trackEventOptions = trackEvent.popcornOptions;
            start = trackEventOptions.start;
            end = trackEventOptions.end;

            // check if track event is out of bounds
            if ( end > _duration ) {
              if ( start > _duration ) {
                // remove offending track event
                trackEvent.track.removeTrackEvent( trackEvent );
              } else {
                trackEvent.update({
                  end: _duration
                });
              }
            }
          }
        }
      };

      this.hasTrackEvents = function() {
        for ( var i = 0, l = _tracks.length; i < l; ++i ) {
          if ( _tracks[ i ].trackEvents.length ) {
            return true;
          }
        }
      };

      // Internally we decorate URLs with a unique butteruid, strip it when exporting
      function sanitizeUrl() {
        var sanitized;

        function sanitize( url ) {
          return URI.stripUnique( url ).toString();
        }

        // Deal with url being single or array of multiple
        if ( Array.isArray( _url ) ) {
          sanitized = [];
          _url.forEach( function( url ) {
            sanitized.push( sanitize( url ) );
          });
          return sanitized;
        }
        else {
          return sanitize( _url );
        }
      }

      Object.defineProperties( this, {
        ended: {
          enumerable: true,
          get: function(){
            if( _popcornWrapper.popcorn ){
              return _popcornWrapper.popcorn.ended();
            }
            return false;
          }
        },
        url: {
          enumerable: true,
          get: function() {
            return _url;
          },
          set: function( val ) {
            if ( _url !== val ) {
              _url = val;
              _ready = false;
              _popcornWrapper.clear( _target );
              setupContent();
              _this.dispatch( "mediacontentchanged", _this );
            }
          }
        },
        target: {
          get: function() {
            return _target;
          },
          set: function( val ) {
            if ( _target !== val ) {
              _popcornWrapper.clear( _target );
              _target = val;
              setupContent();
              _this.dispatch( "mediatargetchanged", _this );
            }
          },
          enumerable: true
        },
        muted: {
          enumerable: true,
          get: function(){
            return _popcornWrapper.muted;
          },
          set: function( val ){
            _popcornWrapper.muted = val;
          }
        },
        ready:{
          enumerable: true,
          get: function(){
            return _ready;
          }
        },
        name: {
          get: function(){
            return _name;
          },
          enumerable: true
        },
        id: {
          get: function(){
            return _id;
          },
          enumerable: true
        },
        tracks: {
          get: function(){
            return _tracks;
          },
          enumerable: true
        },
        orderedTracks: {
          get: function() {
            return _orderedTracks;
          },
          enumerable: true
        },
        currentTime: {
          get: function(){
            return _currentTime;
          },
          set: function( time ){
            if( time !== undefined ){
              _currentTime = time;
              if( _currentTime < 0 ){
                _currentTime = 0;
              }
              if( _currentTime > _duration ){
                _currentTime = _duration;
              } //if
              _popcornWrapper.currentTime = _currentTime;
              _this.dispatch( "mediatimeupdate", _this );
            } //if
          },
          enumerable: true
        },
        duration: {
          get: function(){
            return _duration;
          },
          set: function( time ){
            if( time ){
              _duration = +time;
              _logger.log( "duration changed to " + _duration );
              _this.fixTrackEventBounds();
              _this.dispatch( "mediadurationchanged", _this );
            }
          },
          enumerable: true
        },
        json: {
          get: function() {
            var exportJSONTracks = [];
            for ( var i = 0, l = _orderedTracks.length; i < l; ++i ) {
              exportJSONTracks.push( _orderedTracks[ i ].json );
            }
            return {
              id: _id,
              name: _name,
              url: sanitizeUrl(),
              target: _target,
              duration: _duration,
              popcornOptions: _popcornOptions,
              controls: _popcornWrapper.popcorn ? _popcornWrapper.popcorn.controls() : false,
              tracks: exportJSONTracks
            };
          },
          set: function( importData ){
            var newTrack,
                url,
                i, l,
                fallbacks = [],
                source = [];
            if( importData.name ) {
              _name = importData.name;
            }
            if( importData.target ){
              _this.target = importData.target;
            }
            if ( importData.duration >= 0 ) {
              _duration = importData.duration;
              _this.url = "#t=," + _duration;
            }
            if( importData.tracks ){
              var importTracks = importData.tracks;
              if( Array.isArray( importTracks ) ) {
                for ( i = 0, l = importTracks.length; i < l; ++i ) {
                  newTrack = new Track();
                  newTrack.json = importTracks[ i ];
                  _this.addTrack( newTrack );
                  newTrack.updateTrackEvents();
                }
                // Backwards comp for old base media.
                // Insert previous base media as a sequence event as the last track.
                if ( importData.url && _duration >= 0 ) {
                  url = importData.url;
                  if ( !Array.isArray( url ) ) {
                    url = [ url ];
                  }
                  // If source is a single array and of type null player, don't bother making a sequence.
                  if ( url.length > 1 || !( /#t=\d*,?\d+?/ ).test( url[ 0 ] ) ) {
                    // grab first source as main source.
                    source.push( URI.makeUnique( url.shift() ).toString() );
                    for ( i = 0; i < url.length; i++ ) {
                      fallbacks.push( URI.makeUnique( url[ i ] ).toString() );
                    }
                    newTrack = new Track();
                    _this.addTrack( newTrack );
                    newTrack.addTrackEvent({
                      type: "sequencer",
                      popcornOptions: {
                        start: 0,
                        end: _duration,
                        source: source,
                        title: URI.stripUnique( source[ 0 ] ).path,
                        fallback: fallbacks,
                        duration: _duration,
                        target: "video-container"
                      }
                    });
                  }
                }
              } else if ( console ) {
                console.warn( "Ignoring imported track data. Must be in an Array." );
              }
            }
          },
          enumerable: true
        },
        registry: {
          get: function(){
            return _registry;
          },
          set: function( val ){
            _registry = val;
          },
          enumerable: true
        },
        popcorn: {
          enumerable: true,
          get: function(){
            return _popcornWrapper;
          }
        },
        paused: {
          enumerable: true,
          get: function(){
            return _popcornWrapper.paused;
          },
          set: function( val ){
            _popcornWrapper.paused = val;
          }
        },
        volume: {
          enumerable: true,
          get: function(){
            return _popcornWrapper.volume;
          },
          set: function( val ){
            _popcornWrapper.volume = val;
          }
        },
        popcornOptions: {
          enumerable: true,
          get: function(){
            return _popcornOptions;
          },
          set: function( val ){
            _popcornOptions = val;
            _this.dispatch( "mediapopcornsettingschanged", _this );
            setupContent();
          }
        }
      });

      // check to see if we have any child source elements and use them if neccessary
      function retrieveSrc( targetElement ) {
        var url = "";

        if ( targetElement.children ) {
          var children = targetElement.children;
          url = [];
          for ( var i = 0, il = children.length; i < il; i++ ) {
            if ( children[ i ].nodeName === "SOURCE" ) {
              url.push( children[ i ].src );
            }
          }
        }
        return !url.length ? targetElement.currentSrc : url;
      }

      // There is an edge-case where currentSrc isn't set yet, but everything else about the video is valid.
      // So, here, we wait for it to be set.
      var targetElement = document.getElementById( _target ),
          mediaSource = _url,
          attempts = 0,
          safetyInterval;

      if ( targetElement && [ "VIDEO", "AUDIO" ].indexOf( targetElement.nodeName ) > -1 ) {
        mediaSource = mediaSource || retrieveSrc( targetElement );
        if ( !mediaSource ) {
          safetyInterval = setInterval(function() {
            mediaSource = retrieveSrc( targetElement );
            if ( mediaSource ) {
              _url = mediaSource ;
              setupContent();
              clearInterval( safetyInterval );
            } else if ( attempts++ === MEDIA_ELEMENT_SAFETY_POLL_ATTEMPTS ) {
              clearInterval( safetyInterval );
            }
          }, MEDIA_ELEMENT_SAFETY_POLL_INTERVAL );
        // we already have a source, lets make sure we update it
        } else {
          _url = mediaSource;
        }
      }

    }; //Media

    return Media;

  });
}());

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/page', [ "core/logger", "core/eventmanager" ], function( Logger, EventManager ) {

  return function( loader ) {

    var PLAYER_TYPE_URL = "{popcorn-js}/players/{type}/popcorn.{type}.js";

    EventManager.extend( this );

    this.scrape = function() {
      var rootNode = document.body,
          targets = rootNode.querySelectorAll("*[data-butter='target']"),
          medias = rootNode.querySelectorAll("*[data-butter='media']");

      return {
        media: medias,
        target: targets
      };
    }; // scrape

    this.prepare = function( readyCallback ){
      loader.load([
        {
          type: "js",
          url: "{popcorn-js}/popcorn.js",
          check: function(){
            return !!window.Popcorn;
          }
        },
        {
          type: "js",
          url: "{popcorn-js}/modules/player/popcorn.player.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn.player;
          }
        },

        // XXXhumph - We're converting players to use wrappers, so preload
        // the ones we need for those players to work.  See ticket #1994.
        {
          type: "js",
          url: "{popcorn-js}/wrappers/common/popcorn._MediaElementProto.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn._MediaElementProto;
          }
        },

        {
          type: "js",
          url: "{popcorn-js}/wrappers/html5/popcorn.HTMLMediaElement.js",
          check: function(){
            return !!window.Popcorn &&
                   !!window.Popcorn.HTMLVideoElement &&
                   !!window.Popcorn.HTMLAudioElement;
          }
        },
        {
          type: "js",
          url: "{popcorn-js}/wrappers/youtube/popcorn.HTMLYouTubeVideoElement.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn.HTMLVimeoVideoElement;
          }
        },
        {
          type: "js",
          url: "{popcorn-js}/wrappers/vimeo/popcorn.HTMLVimeoVideoElement.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn.HTMLVimeoVideoElement;
          }
        },
        {
          type: "js",
          url: "{popcorn-js}/wrappers/soundcloud/popcorn.HTMLSoundCloudAudioElement.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn.HTMLSoundCloudAudioElement;
          }
        },
        {
          type: "js",
          url: "{popcorn-js}/wrappers/null/popcorn.HTMLNullVideoElement.js",
          check: function(){
            return !!window.Popcorn && !!window.Popcorn.HTMLNullVideoElement;
          }
        }

      ], readyCallback, null, true );
    };

    this.addPlayerType = function( type, callback ){
      loader.load({
        type: "js",
        url: PLAYER_TYPE_URL.replace( /\{type\}/g, type ),
        check: function(){
          return !!Popcorn[ type ];
        }
      }, callback );
    };

  }; // page
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/*
 * Module: GhostTrack
 *
 * Creates a ghosted track that will potentially get created if an overlapping trackEvent is dropped.
 */
define('timeline/ghost-track', [], function() {
  function GhostTrack( lastTrack, nextTrack ) {
    var _this = this,
        _element = document.createElement( "div" ),
        _view;

    _element.classList.add( "butter-track" );
    _element.classList.add( "butter-track-ghost" );

    // Will be filled in when a new track is made to take the place of this ghost.
    _this.resultantTrack = null;

    // Create methods to manage ghost trackEvents
    _view = {
      addTrackEventGhost: function( trackEventGhost ) {
        trackEventGhost.track = _this;
        _element.appendChild( trackEventGhost.element );
      },
      removeTrackEventGhost: function( trackEventGhost ) {
        trackEventGhost.track = null;
        _element.removeChild( trackEventGhost.element );
      }
    };

    Object.defineProperties( _view, {
      /*
       * Property: element
       *
       * Reference to the DOM element for the ghost track
       */
      element: {
        enumerable: true,
        get: function() {
          return _element;
        }
      },
      /*
       * Property: track
       *
       * The ghost track
       */
      track: {
        enumerable: true,
        get: function() {
          return _this;
        }
      }
    });

    Object.defineProperties( _this, {
      /*
       * Property: lastTrack
       *
       * Reference to the bottom most track inside the track-container
       */
      lastTrack: {
        enumerable: true,
        get: function() {
          return lastTrack;
        }
      },
      /*
       * Property: nextTrack
       *
       * The track that is below this track inside the track-container
       */
      nextTrack : {
        enumerable: true,
        get: function() {
          return nextTrack;
        }
      },
      /*
       * Property: view
       *
       * A reference to the view object that was generated for this track
       */
      view: {
        enumerable: true,
        get: function() {
          return _view;
        }
      },
      /*
       * Property: isGhost
       *
       * Specifies whether this track is a ghost or not.
       */
      isGhost: {
        enumerable: true,
        get: function() {
          return true;
        }
      },
      /*
       * Property: numGhostTrackEvents
       *
       * Specifies the number of trackEvents on this track which are ghosts
       */
      numGhostTrackEvents: {
        enumerable: true,
        get: function() {
          return _element.childNodes.length;
        }
      }
    });
  }

  return GhostTrack;
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/ghost-manager', [ "./ghost-track" ], function( GhostTrack ) {

  function GhostManager( media, tracksContainerElement ) {
    
    var _media = media,
        _tracksContainerElement = tracksContainerElement;

    function createGhostTrackForTrack( track, nextTrack ) {
      var ghostTrack;
      if ( !track.ghost ) {
        ghostTrack = track.ghost = new GhostTrack( track, nextTrack );
        if ( !nextTrack ) {
          _tracksContainerElement.appendChild( ghostTrack.view.element );
        }
        else {
          _tracksContainerElement.insertBefore( ghostTrack.view.element, nextTrack.view.element );
        }
      }
      return track.ghost;
    }

    function cleanUpGhostTracks() {
      var tracks = _media.tracks;
      for ( var i = 0, l = tracks.length; i < l; ++i ) {
        cleanUpGhostTrack( tracks[ i ] );
      }
    }

    function cleanUpGhostTrack( track ) {
      var ghostTrack = track.ghost;
      if ( ghostTrack && ghostTrack.numGhostTrackEvents === 0 ) {
        _tracksContainerElement.removeChild( ghostTrack.view.element );
        track.ghost = null;
      }
    }
    
    this.trackEventDragged = function( trackEventView, trackView ) {
      var track, nextTrack, ghostTrack,
          overlappingTrackEvent;

      if ( trackView ) {
        track = trackView.track;

        overlappingTrackEvent = trackView.findOverlappingTrackEvent( trackEventView );

        if ( overlappingTrackEvent ) {
          nextTrack = _media.getNextTrack( track );
          if ( !nextTrack || nextTrack.view.findOverlappingTrackEvent( trackEventView ) ) {
            nextTrack = createGhostTrackForTrack( track, nextTrack );
            if ( trackEventView.ghost && trackEventView.ghost.track !== nextTrack ) {
              ghostTrack = trackEventView.ghost.track;
              trackEventView.cleanupGhost();
              if ( ghostTrack.lastTrack ) {
                cleanUpGhostTrack( ghostTrack.lastTrack );
              }
            }
          }
          if ( !trackEventView.ghost ) {
            nextTrack.view.addTrackEventGhost( trackEventView.createGhost() );
          }
          trackEventView.updateGhost();
        }
        else if ( trackEventView.ghost ) {
          track = trackEventView.ghost.track;
          trackEventView.cleanupGhost();
          cleanUpGhostTracks();
        }
      }
      else if ( trackEventView.ghost ) {
        track = trackEventView.ghost.track;
        trackEventView.cleanupGhost();
        cleanUpGhostTracks();
      }
    };

    this.removeGhostsAfterDrop = function( trackEvent ) {
      var currentTrack = trackEvent.track,
          ghost = trackEvent.view.ghost;

      if ( ghost && ghost.track ) {
        trackEvent.view.cleanupGhost( currentTrack );
        cleanUpGhostTracks();
      }
    };

  }

  return GhostManager;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/track-container', [ "core/logger", "util/dragndrop", "./ghost-manager" ],
  function( Logger, DragNDrop, GhostManager ) {

  var TWEEN_PERCENTAGE = 0.35,    // diminishing factor for tweening (see followCurrentTime)
      TWEEN_THRESHOLD = 10;       // threshold beyond which tweening occurs (see followCurrentTime)

  return function( butter, media, mediaInstanceRootElement ) {

    var _media = media,
        _this = this;

    var _element = mediaInstanceRootElement.querySelector( ".tracks-container-wrapper" ),
        _container = mediaInstanceRootElement.querySelector( ".tracks-container" );

    var _vScrollbar, _hScrollbar;

    var _droppable;

    var _leftViewportBoundary = 0,
        _viewportWidthRatio = 0.1;

    var _newTrackForDroppables;

    _this.ghostManager = new GhostManager( media, _container );

    butter.listen( "trackorderchanged", function( e ) {
      var orderedTracks = e.data;
      for ( var i = 0, l = orderedTracks.length; i < l; ++i ) {
        var trackElement = orderedTracks[ i ].view.element;
        if ( trackElement !== _container.childNodes[ i ] ) {
          _container.insertBefore( trackElement, _container.childNodes[ i ] || null );
        }
      }
    });

    DragNDrop.listen( "dropfinished", function() {
      _media.cleanUpEmptyTracks();
      _vScrollbar.update();
    });

    _container.addEventListener( "mousedown", function() {
      butter.deselectAllTrackEvents();
    }, false );

    _droppable = DragNDrop.droppable( _element, {
      startDrop: function() {
        _newTrackForDroppables = null;
      },
      drop: function( dropped, mousePosition ) {
        // Used if drop spawns a new track
        var newTrack, draggableType,
            trackEvent, trackEventRect,
            droppedLeftValue, duration,
            start, end,
            containerRect = _container.getBoundingClientRect();

        // XXX secretrobotron: I chopped out an if statement from this section
        // which attempted to check whether or not trackevents were being dropped
        // below the last track on the timeline. It was interfering with dropping multiple
        // items, and we seem to have shaved off the space between tracks that was
        // causing the need for this check to begin with. Here's the commit which spawned
        // the check: https://github.com/mozilla/butter/commit/3952c02da32092433fb884cead0ba4e7e18ff988

        // Ensure its a plugin and that only the area under the last track is droppable
        draggableType = ( dropped.element || dropped ).getAttribute( "data-butter-draggable-type" );

        if ( draggableType === "plugin" ) {
          newTrack = butter.currentMedia.addTrack();
          newTrack.view.dispatch( "plugindropped", {
            start: ( mousePosition[ 0 ] - containerRect.left ) / _container.clientWidth * newTrack.view.duration,
            track: newTrack,
            type: dropped.getAttribute( "data-popcorn-plugin-type" )
          });
        }
        else if ( draggableType === "trackevent" ) {
          trackEvent = dropped.data.trackEvent;
          trackEventRect = dropped.getLastRect();
          droppedLeftValue = trackEventRect.left - containerRect.left;

          if ( !_newTrackForDroppables ) {
            _newTrackForDroppables = butter.currentMedia.addTrack();
          }

          // Avoid using trackevent view width values here to circumvent padding/border
          duration = trackEvent.popcornOptions.end - trackEvent.popcornOptions.start;
          start = droppedLeftValue / _container.clientWidth * _media.duration;
          end = start + duration;

          createTrackEventFromDrop( trackEvent, {
            start: start,
            end: end
          }, trackEvent.track, _newTrackForDroppables );
        }
      }
    });

    this.setScrollbars = function( vertical, horizontal ) {
      _vScrollbar = vertical;
      _hScrollbar = horizontal;
      _hScrollbar.update();
      _vScrollbar.update();
    };

    function resetContainer() {
      _element.scrollLeft = _container.scrollWidth * _leftViewportBoundary;
      _container.style.width = _element.clientWidth / _viewportWidthRatio + "px";
      _vScrollbar.update();
      _hScrollbar.update();
    }

    _media.listen( "mediaready", function(){
      resetContainer();
      var tracks = _media.tracks;
      for ( var i = 0, il = tracks.length; i < il; ++i ) {
        var trackView = tracks[ i ].view;
        _container.appendChild( trackView.element );
        trackView.duration = _media.duration;
        trackView.parent = _this;
      }
    });

    butter.listen( "mediaremoved", function ( e ) {
      if ( e.data === _media && _droppable ){
        _droppable.destroy();
      }
    });

    function onTrackAdded( e ) {
      var trackView = e.data.view;

      trackView.listen( "trackeventdropped", onTrackEventDropped );

      _container.appendChild( trackView.element );
      trackView.duration = _media.duration;
      trackView.parent = _this;
      if ( _vScrollbar ) {
        _vScrollbar.update();
      }
    }

    function onTrackEventDragStarted( e ) {
      var trackEventView = e.target,
          element = trackEventView.element,
          trackView = trackEventView.trackEvent.track.view,
          topOffset = element.getBoundingClientRect().top - _container.getBoundingClientRect().top;

      trackView.element.removeChild( element );

      // After the trackevent view element is removed, we need to set its top value manually so that dragging & scrolling can happen
      // starting with the correct Y value. Otherwise, it would be reset to 0 (the top of _container), which is incorrect.
      element.style.top = topOffset + "px";

      _container.appendChild( element );

      _vScrollbar.update();
    }

    function onTrackEventDragged( draggable, droppable ) {
      _this.ghostManager.trackEventDragged( draggable.data, droppable.data );
      _vScrollbar.update();
    }

    var existingTracks = _media.tracks;
    for ( var i = 0; i < existingTracks.length; ++i ) {
      onTrackAdded({
        data: existingTracks[ i ]
      });
    }

    function createTrackEventFromDrop( trackEvent, popcornOptions, oldTrack, desiredTrack ) {
      var newTrack = _media.forceEmptyTrackSpaceAtTime( desiredTrack, popcornOptions.start, popcornOptions.end, trackEvent );

      if ( oldTrack !== newTrack ) {
        if ( oldTrack ) {
          oldTrack.removeTrackEvent( trackEvent, true );
        }
        trackEvent.update( popcornOptions );
        newTrack.addTrackEvent( trackEvent );
        _this.ghostManager.removeGhostsAfterDrop( trackEvent, oldTrack );
      }
      else {
        trackEvent.update( popcornOptions );
        _this.ghostManager.removeGhostsAfterDrop( trackEvent, oldTrack );
      }
    }

    function onTrackEventDropped( e ) {
      var trackEvent = e.data.trackEvent,
          popcornOptions = e.data,
          desiredTrack = e.data.track,
          oldTrack = trackEvent.track;

      createTrackEventFromDrop( trackEvent, popcornOptions, oldTrack, desiredTrack );
    }

    function onTrackEventResizeStarted( e ) {
      var trackEventView = e.target,
          trackEvent = trackEventView.trackEvent,
          direction = e.data.direction,
          trackEventStart = trackEvent.popcornOptions.start,
          trackEventEnd = trackEvent.popcornOptions.end,
          min, max,
          trackEvents = trackEvent.track.trackEvents;

      // Only one of these two functions, onTrackEventResizedLeft or onTrackEventResizedRight,
      // is run during resizing. Since all the max/min data is prepared ahead of time, we know
      // the w/x values shouldn't grow/shrink past certain points.
      function onTrackEventResizedLeft( trackEvent, x, w, resizeEvent ) {
        if ( x < min ) {
          resizeEvent.blockIteration( min );
        }
      }

      function onTrackEventResizedRight( trackEvent, x, w, resizeEvent ) {
        if ( x + w > max ) {
          resizeEvent.blockIteration( max );
        }
      }

      // Slightly different code paths for left and right resizing.
      if ( direction === "left" ) {
        // Use trackEvents.reduce to find a valid minimum left value.
        min = trackEvents.reduce( function( previousValue, otherTrackEvent ) {
          var popcornOptions = otherTrackEvent.popcornOptions;

          // [ otherEvent ] [ otherEvent ] |<-- [ thisEvent ] [ otherEvent ]
          return (  otherTrackEvent !== trackEvent &&
                    popcornOptions.end > previousValue &&
                    popcornOptions.end < trackEventStart  ) ?
              popcornOptions.end : previousValue;
        }, 0 );

        // Rebase min value on pixels instead of time.
        // Use clientLeft to compensate for border (https://developer.mozilla.org/en-US/docs/DOM/element.clientLeft).
        min = min / _media.duration * _container.offsetWidth + trackEventView.element.clientLeft * 2;

        // Only use the left handler.
        trackEventView.setResizeHandler( onTrackEventResizedLeft );
      }
      else {
        // Use trackEvents.reduce to find a valid maximum right value.
        max = trackEvents.reduce( function( previousValue, otherTrackEvent ) {
          var popcornOptions = otherTrackEvent.popcornOptions;

          // [ otherEvent ] [ otherEvent ] [ thisEvent ] -->| [ otherEvent ]
          return (  otherTrackEvent !== trackEvent &&
                    popcornOptions.start < previousValue &&
                    popcornOptions.start > trackEventEnd ) ?
              popcornOptions.start : previousValue;
        }, _media.duration );

        // Rebase min value on pixels instead of time.
        // Use clientLeft to compensate for border (https://developer.mozilla.org/en-US/docs/DOM/element.clientLeft).
        max = max / _media.duration * _container.offsetWidth - trackEventView.element.clientLeft * 2;

        // Only use the right handler.
        trackEventView.setResizeHandler( onTrackEventResizedRight );
      }

      function onTrackEventResizeStopped() {
        var popcornOptions = {};

        // Finish off by making sure the values are correct depending on the direction.
        if ( direction === "right" ) {
          popcornOptions.end = trackEvent.popcornOptions.start +
            ( trackEventView.element.clientWidth / _container.clientWidth ) *
            _media.duration;
        }
        else {
          popcornOptions.start = trackEventView.element.offsetLeft /
            _container.clientWidth *
            _media.duration;
        }

        trackEvent.update( popcornOptions );

        // Stop using the handler set above.
        trackEventView.setResizeHandler( null );

        trackEventView.unlisten( "trackeventresizestopped", onTrackEventResizeStopped );
      }

      trackEventView.listen( "trackeventresizestopped", onTrackEventResizeStopped );
    }

    _media.listen( "trackeventadded", function( e ) {
      var trackEventView = e.data.view;
      trackEventView.setDragHandler( onTrackEventDragged );
      trackEventView.listen( "trackeventdragstarted", onTrackEventDragStarted );
      trackEventView.listen( "trackeventresizestarted", onTrackEventResizeStarted );
      _vScrollbar.update();
    });

    _media.listen( "trackeventremoved", function( e ) {
      var trackEventView = e.data.view;
      trackEventView.setDragHandler( null );
      trackEventView.unlisten( "trackeventdragstarted", onTrackEventDragStarted );
      trackEventView.unlisten( "trackeventresizestarted", onTrackEventResizeStarted );
      _vScrollbar.update();
    });

    _media.listen( "trackadded", onTrackAdded );

    _media.listen( "trackremoved", function( e ) {
      var trackView = e.data.view;

      trackView.listen( "trackeventdropped", onTrackEventDropped );

      _container.removeChild( trackView.element );
      if ( _vScrollbar ) {
        _vScrollbar.update();
      }
    });

    /**
     * Member: followCurrentTime
     *
     * Attempts to position the viewport around the media's currentTime (the scrubber)
     * such that the currentTime is centered in the viewport. If currentTime is situated
     * to the right of the mid-point of the track container, this code begins to affect
     * the scrollLeft property of _element by either setting the value to the mid-point
     * immediately (if currentTime is not beyond TWEEN_THRESHOLD from the mid-point), or
     * by incrementally stepping toward the mid-point by tweening to provide some
     * softening for proper user feedback.
     *
     * Note that the values assigned to scrollLeft are rounded to prevent jitter.
     */
    _this.followCurrentTime = function() {
      var p = _media.currentTime / _media.duration,
          currentTimePixel = p * _container.clientWidth,
          halfWidth = _element.clientWidth / 2,
          xOffset = currentTimePixel - _element.scrollLeft,
          target = p * _container.scrollWidth - halfWidth;

      // If the currentTime surpasses half of the width of the track container...
      if ( xOffset >= halfWidth && !_media.paused ) {
        // ... by more than TWEEN_THRESHOLD...
        if ( xOffset - halfWidth > TWEEN_THRESHOLD ) {
          // then perform a simple tween on scrollLeft to slide the scrubber back into the middle.
          _element.scrollLeft = Math.round( _element.scrollLeft - ( _element.scrollLeft - target ) * TWEEN_PERCENTAGE );
        }
        else {
          // Otherwise, just nail scrollLeft at the center point.
          _element.scrollLeft = Math.round( target );
        }
      }
    };

    _this.update = function() {
      resetContainer();
    };

    /**
     * Member: setContainerBounds
     *
     * Adjusts the viewport boundaries. A left and width value can be specified
     * representing the left and width percentage of the viewport with respect to its
     * container. If either is -1, it is ignored, and the old value is preserved.
     *
     * @param {Number} left: Left side of the viewport as percent from 0 - 1
     * @param {Number} width: Ratio of viewport to tracks (0 - 1)
     */
    _this.setViewportBounds = function( left, width ) {
      _leftViewportBoundary = left >= 0 ? ( left > 1 ? 1 : left ) : _leftViewportBoundary;
      _viewportWidthRatio = width >= 0 ? ( width > 1 ? 1 : width ) : _viewportWidthRatio;
      resetContainer();
    };

    _this.snapTo = function( time ) {
      var p = time / _media.duration,
          newScroll = _container.clientWidth * p,
          maxLeft = _container.clientWidth - _element.clientWidth;
      if ( newScroll < _element.scrollLeft || newScroll > _element.scrollLeft + _element.clientWidth ) {
        if ( newScroll > maxLeft ) {
          _element.scrollLeft = maxLeft;
          return;
        }
        _element.scrollLeft = newScroll;
      }
    };

    this.getTrackWidth = function() {
      return _container.offsetWidth;
    };

    // The properties `element` and `conainer` do not have getter functions, but are immediately assigned
    // values to prevent a Safari crash; a function which solely returns `_container` fails to accomplish its task
    // (likely a hidden webkit/safari bug).
    Object.defineProperties( this, {
      element: {
        enumerable: true,
        value: _element
      },
      container: {
        enumerable: true,
        value: _container
      }
    });

  };

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/scrollbars', [ "core/eventmanager" ], function( EventManager ) {

  var VERTICAL_SIZE_REDUCTION_FACTOR = 3,
      ACTIVE_CLASS = "butter-scollbar-active",
      SCROLL_MODIFIER = 10;

  function Vertical( outerElement, innerElement ){
    var _element = document.createElement( "div" ),
        _handle = document.createElement( "div" ),
        _elementHeight,
        _parentHeight,
        _childHeight,
        _scrollHeight,
        _handleHeight,
        _mousePos = 0,
        _this = this;

    EventManager.extend( _this );

    _element.className = "butter-scroll-bar butter-scroll-bar-v";
    _handle.className = "butter-scroll-handle";

    _element.appendChild( _handle );

    this.update = function() {
      _parentHeight = outerElement.getBoundingClientRect().height;
      _childHeight = innerElement.getBoundingClientRect().height;
      _elementHeight = _element.getBoundingClientRect().height;
      _scrollHeight = outerElement.scrollHeight;
      _handleHeight = _elementHeight - ( innerElement.scrollHeight - _parentHeight ) / VERTICAL_SIZE_REDUCTION_FACTOR;
      _handleHeight = Math.max( 20, Math.min( _elementHeight, _handleHeight ) );
      _handle.style.height = _handleHeight + "px";
      setHandlePosition();
    };

    function onMouseUp(){
      window.removeEventListener( "mouseup", onMouseUp, false );
      window.removeEventListener( "mousemove", onMouseMove, false );
      _handle.addEventListener( "mousedown", onMouseDown, false );
      _handle.classList.remove( ACTIVE_CLASS );
    }

    function onMouseMove( e ){
      var diff = e.pageY - _mousePos,
          maxDiff = _elementHeight - _handleHeight;
      diff = Math.max( 0, Math.min( diff, maxDiff ) );
      var p = diff / maxDiff;
      outerElement.scrollTop = ( _scrollHeight - _parentHeight ) * p;
      _this.dispatch( "scroll", outerElement.scrollTop );
    }

    function onMouseDown( e ){
      if( e.button === 0 ){
        var handleY = _handle.offsetTop;
        _mousePos = e.pageY - handleY;
        window.addEventListener( "mouseup", onMouseUp, false );
        window.addEventListener( "mousemove", onMouseMove, false );
        _handle.removeEventListener( "mousedown", onMouseDown, false );
        _handle.classList.add( ACTIVE_CLASS );
      }
    }

    function setHandlePosition() {
      if ( innerElement.scrollHeight - _elementHeight > 0 ) {
        _handle.style.top = ( _elementHeight - _handleHeight ) *
          ( outerElement.scrollTop / ( _scrollHeight - _parentHeight ) ) + "px";
      }
      else {
        _handle.style.top = "0px";
      }
    }

    outerElement.addEventListener( "scroll", function(){
      setHandlePosition();
    }, false );

    outerElement.addEventListener( "mousewheel", function( e ){
      var delta = e.wheelDeltaY || e.wheelDelta;

      outerElement.scrollTop -= delta / SCROLL_MODIFIER;
      setHandlePosition();
      e.preventDefault();
    }, false );

    // For Firefox
    outerElement.addEventListener( "DOMMouseScroll", function( e ){
      if( e.axis === e.VERTICAL_AXIS && !e.shiftKey ){
        outerElement.scrollTop += e.detail * 2;
        setHandlePosition();
        e.preventDefault();
      }
    }, false );

    _element.addEventListener( "click", function( e ) {
      // bail early if this event is coming from the handle
      if( e.srcElement === _handle || e.button > 0 ) {
        return;
      }

      var posY = e.pageY,
          handleRect = _handle.getBoundingClientRect(),
          elementRect = _element.getBoundingClientRect(),
          p;

      if( posY > handleRect.bottom ) {
        _handle.style.top = ( ( posY - elementRect.top ) - _handleHeight ) + "px";
      } else if( posY < handleRect.top ) {
        _handle.style.top = posY - elementRect.top + "px";
      }

      p = _handle.offsetTop / ( _elementHeight - _handleHeight );
      outerElement.scrollTop = ( _scrollHeight - _elementHeight ) * p;
    }, false);

    _handle.addEventListener( "mousedown", onMouseDown, false );

    _this.update();

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _element;
        }
      }
    });

  }

  function Horizontal( outerElement, innerElement ){
    var _element = document.createElement( "div" ),
        _handle = document.createElement( "div" ),
        _elementWidth,
        _parentWidth,
        _childWidth,
        _scrollWidth,
        _handleWidth,
        _mousePos = 0,
        _this = this;

    EventManager.extend( _this );

    _element.className = "butter-scroll-bar butter-scroll-bar-h";
    _handle.className = "butter-scroll-handle";

    _element.appendChild( _handle );

    this.update = function() {
      _parentWidth = outerElement.getBoundingClientRect().width;
      _childWidth = innerElement.getBoundingClientRect().width;
      _elementWidth = _element.getBoundingClientRect().width;
      _scrollWidth = innerElement.scrollWidth;
      _handleWidth = _elementWidth - ( _scrollWidth - _parentWidth );
      _handleWidth = Math.max( 20, Math.min( _elementWidth, _handleWidth ) );
      _handle.style.width = _handleWidth + "px";
      setHandlePosition();
    };

    function onMouseUp(){
      window.removeEventListener( "mouseup", onMouseUp, false );
      window.removeEventListener( "mousemove", onMouseMove, false );
      _handle.addEventListener( "mousedown", onMouseDown, false );
    }

    function onMouseMove( e ){
      e.preventDefault();
      var diff = e.pageX - _mousePos;
      diff = Math.max( 0, Math.min( diff, _elementWidth - _handleWidth ) );
      _handle.style.left = diff + "px";
      var p = _handle.offsetLeft / ( _elementWidth - _handleWidth );
      outerElement.scrollLeft = ( _scrollWidth - _elementWidth ) * p;
      _this.dispatch( "scroll", outerElement.scrollLeft );
    }

    function onMouseDown( e ){
      if( e.button === 0 ){
        var handleX = _handle.offsetLeft;
        _mousePos = e.pageX - handleX;
        window.addEventListener( "mouseup", onMouseUp, false );
        window.addEventListener( "mousemove", onMouseMove, false );
        _handle.removeEventListener( "mousedown", onMouseDown, false );
      }
    }

    function setHandlePosition(){
      if( _scrollWidth - _elementWidth > 0 ) {
        _handle.style.left = ( _elementWidth - _handleWidth ) *
          ( outerElement.scrollLeft / ( _scrollWidth - _elementWidth ) ) + "px";
      } else {
        _handle.style.left = "0px";
      }
    }

    outerElement.addEventListener( "scroll", function(){
      setHandlePosition();
    }, false );

    outerElement.addEventListener( "mousewheel", function( e ){
      if( e.wheelDeltaX ){
        outerElement.scrollLeft -= e.wheelDeltaX;
        setHandlePosition();
        e.preventDefault();
      }
    }, false );

    // For Firefox
    outerElement.addEventListener( "DOMMouseScroll", function( e ){
      if( e.axis === e.HORIZONTAL_AXIS || ( e.axis === e.VERTICAL_AXIS && e.shiftKey )){
        outerElement.scrollLeft += e.detail * 2;
        setHandlePosition();
        e.preventDefault();
      }
    }, false );

    _element.addEventListener( "click", function( e ) {
      // bail early if this event is coming from the handle
      if( e.srcElement === _handle || e.button > 0 ) {
        return;
      }

      var posX = e.pageX,
          handleRect = _handle.getBoundingClientRect(),
          elementRect = _element.getBoundingClientRect(),
          p;

      if( posX > handleRect.right ) {
        _handle.style.left = ( ( posX - elementRect.left ) - _handleWidth ) + "px";
      }
      else if( posX < handleRect.left ) {
        _handle.style.left = posX - elementRect.left + "px";
      }

      p = _handle.offsetLeft / ( _elementWidth - _handleWidth );
      outerElement.scrollLeft = ( _scrollWidth - _elementWidth ) * p;
    }, false);

    _handle.addEventListener( "mousedown", onMouseDown, false );

    _this.update();

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _element;
        }
      }
    });

  }

  return {
    Vertical: Vertical,
    Horizontal: Horizontal
  };

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/scrubber', [ "util/lang" ],
  function( util ) {

  var SCROLL_INTERVAL = 16,
      SCROLL_DISTANCE = 20,
      MOUSE_SCRUBBER_PIXEL_WINDOW = 3;

  return function( butter, parentElement, media, tracksContainer ) {
    var _container = parentElement.querySelector( ".time-bar-scrubber-container" ),
        _node = _container.querySelector( ".time-bar-scrubber-node" ),
        _timeTooltip = _container.querySelector( ".butter-time-tooltip" ),
        _line = _container.querySelector( ".time-bar-scrubber-line" ),
        _fill = _container.querySelector( ".fill-bar" ),
        _tracksContainer = tracksContainer,
        _tracksContainerWidth,
        _media = media,
        _mouseDownPos,
        _currentMousePos,
        _timelineMousePos,
        _scrollInterval = -1,
        _rect,
        _width = 0,
        _isPlaying = false,
        _isScrubbing = false,
        _lastTime = -1,
        _lastScrollLeft = _tracksContainer.element.scrollLeft,
        _lastScrollWidth = _tracksContainer.element.scrollWidth,
        _lineWidth = 0,
        _isSeeking = false,
        _seekMouseUp = false;

    function setNodePosition() {
      var duration = _media.duration,
          currentTime = _media.currentTime,
          tracksElement = _tracksContainer.element,
          scrollLeft = tracksElement.scrollLeft,
          scrollWidth = tracksElement.scrollWidth;

      // If we can avoid re-setting position and visibility, then do so
      if( _lastTime !== currentTime || _lastScrollLeft !== scrollLeft || _lastScrollWidth !== scrollWidth ){
        setTimeTooltip();

        // To prevent some scrubber jittering (from viewport centering), pos is rounded before
        // being used in calculation to account for possible precision issues.
        var pos = Math.round( currentTime / duration * _tracksContainerWidth ),
            adjustedPos = pos - scrollLeft;

        // If the node position is outside of the viewing window, hide it.
        // Otherwise, show it and adjust its position.
        // Note the use of clientWidth here to account for padding/margin width fuzziness.
        if( pos < scrollLeft || pos - _lineWidth > _container.clientWidth + scrollLeft ){
          _node.style.display = "none";
        }
        else {
          _node.style.left = adjustedPos + "px";
          _node.style.display = "block";
        } //if

        if( pos < scrollLeft ){
          _fill.style.display = "none";
        }
        else {
          if( pos > _width + scrollLeft ){
            _fill.style.width = ( _width - 2 ) + "px";
          }
          else {
            _fill.style.width = adjustedPos + "px";
          } //if
          _fill.style.display = "block";
        } //if
      } //if

      _lastTime = currentTime;
      _lastScrollLeft = scrollLeft;
      _lastScrollWidth = scrollWidth;
    }

    function onMouseUp() {
      _seekMouseUp = true;

      _timeTooltip.classList.remove( "tooltip-no-transition-on" );

      if( _isPlaying && !_isSeeking ){
        _media.play();
      }

      if( _isScrubbing ){
        _isScrubbing = false;
      }

      clearInterval( _scrollInterval );
      _scrollInterval = -1;

      parentElement.addEventListener( "mouseover", onMouseOver, false );
      window.removeEventListener( "mouseup", onMouseUp, false );
      window.removeEventListener( "mousemove", onMouseMove, false );
    } //onMouseUp

    function scrollTracksContainer( direction ) {
      if( direction === "right" ){
        _scrollInterval = setInterval(function() {
          if( _currentMousePos < _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos += SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft += SCROLL_DISTANCE;
            evalMousePosition();
            setNodePosition();
          }
        }, SCROLL_INTERVAL );
      }
      else{
        _scrollInterval = setInterval(function() {
          if( _currentMousePos > _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
            clearInterval( _scrollInterval );
            _scrollInterval = -1;
          }
          else{
            _currentMousePos -= SCROLL_DISTANCE;
            _tracksContainer.element.scrollLeft -= SCROLL_DISTANCE;
            evalMousePosition();
            setNodePosition();
          }
        }, SCROLL_INTERVAL );
      }
    } //scrollTracksContainer

    function evalMousePosition() {
      var diff = _currentMousePos - _mouseDownPos;
      diff = Math.max( 0, Math.min( diff, _width ) );
      _media.currentTime = ( diff + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
    } //evalMousePosition

    function onMouseMove( e ) {
      _currentMousePos = e.pageX;

      if( _scrollInterval === -1 ){
        if( _currentMousePos > _rect.right - MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "right" );
        }
        else if( _currentMousePos < _rect.left + MOUSE_SCRUBBER_PIXEL_WINDOW ){
          scrollTracksContainer( "left" );
        } //if
      } //if

      onTimelineMouseMove( e );
      evalMousePosition();
      setNodePosition();
    } //onMouseMove

    function onSeeked() {
      _isSeeking = false;

      _media.unlisten( "mediaseeked", onSeeked );

      if( _isPlaying && _seekMouseUp ) {
        _media.play();
      }
    }

    function onTimelineMouseMove( e ) {
      _timelineMousePos = e.clientX - parentElement.offsetLeft;

      if ( _timelineMousePos < 0 ) {
        _timelineMousePos = 0;
      } else if ( _timelineMousePos > _container.offsetWidth ) {
        _timelineMousePos = _container.offsetWidth;
      }

      _timeTooltip.style.left = _timelineMousePos + "px";
      setTimeTooltip();
    }

    function setTimeTooltip() {
      _timeTooltip.innerHTML = util.secondsToSMPTE( ( _timelineMousePos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration );
    }

    function onMouseOver( e ) {
      onTimelineMouseMove( e );
      _timeTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.addEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseover", onMouseOver, false );
      parentElement.addEventListener( "mouseout", onMouseOut, false );
    }

    function onMouseOut() {
      _timeTooltip.classList.remove( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.addEventListener( "mouseover", onMouseOver, false );
    }

    var onMouseDown = this.onMouseDown = function( e ) {
      var pos = e.pageX - _container.getBoundingClientRect().left;

      _isScrubbing = true;
      _isSeeking = true;
      _seekMouseUp = false;
      _media.listen( "mediaseeked", onSeeked );

      if( _isPlaying ){
        _media.pause();
      }

      _media.currentTime = ( pos + _tracksContainer.element.scrollLeft ) / _tracksContainerWidth * _media.duration;
      setNodePosition();
      _mouseDownPos = e.pageX - _node.offsetLeft;

      if ( _media.currentTime >= 0 ) {
        _timeTooltip.innerHTML = util.secondsToSMPTE( _media.currentTime );
      }
      _timeTooltip.classList.add( "tooltip-no-transition-on" );

      parentElement.removeEventListener( "mouseout", onMouseOut, false );
      parentElement.removeEventListener( "mousemove", onTimelineMouseMove, false );
      window.addEventListener( "mousemove", onMouseMove, false );
      window.addEventListener( "mouseup", onMouseUp, false );
    }; //onMouseDown

    parentElement.addEventListener( "mouseover", onMouseOver, false );

    this.update = function( containerWidth ) {
      _width = containerWidth || _width;
      _tracksContainerWidth = _tracksContainer.container.getBoundingClientRect().width;
      _rect = _container.getBoundingClientRect();
      _lineWidth = _line.clientWidth;
      setNodePosition();
    };

    this.enable = function() {
      _container.addEventListener( "mousedown", onMouseDown, false );
    };

    this.disable = function() {
      _container.removeEventListener( "mousedown", onMouseDown, false );
    };


    _media.listen( "mediaplay", function() {
      _isPlaying = true;
    });

    _media.listen( "mediapause", function() {
      // scrubbing is for the mouseup and mousedown state.
      // seeking is the media's state.
      // these are not always the same.
      if( !_isScrubbing && !_isSeeking ){
        _isPlaying = false;
      }
    });

    _media.listen( "mediatimeupdate", setNodePosition );
  };
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/timebar', [ "util/lang", "./scrubber" ], function( util, Scrubber ) {

  var CANVAS_CONTAINER_PADDING = 5,
      TICK_COLOR = "#999999";

  return function( butter, media, statusArea, tracksContainer, hScrollbar ) {

    var _element = statusArea.querySelector( ".time-bar" ),
        _canvas = _element.querySelector( "canvas" ),
        _media = media,
        _tracksContainer = tracksContainer,
        _scrubber = new Scrubber( butter, _element, _media, _tracksContainer, hScrollbar );

    function drawTicks() {
      var tracksContainerWidth = tracksContainer.container.getBoundingClientRect().width,
          width = Math.min( tracksContainerWidth, _tracksContainer.container.scrollWidth ),
          containerWidth = Math.min( width, _tracksContainer.element.offsetWidth - CANVAS_CONTAINER_PADDING );

      var context = _canvas.getContext( "2d" );

      if ( _canvas.height !== _canvas.offsetHeight ) {
        _canvas.height = _canvas.offsetHeight;
      }
      if ( _canvas.width !== containerWidth ) {
        _canvas.width = containerWidth;
      }

      var inc = _tracksContainer.container.clientWidth / _media.duration,
          textWidth = context.measureText( util.secondsToSMPTE( 5 ) ).width,
          padding = 20,
          lastPosition = 0,
          lastTimeDisplayed = -( ( textWidth + padding ) / 2 ),
          start = _tracksContainer.element.scrollLeft / inc,
          end = ( _tracksContainer.element.scrollLeft + containerWidth ) / inc;

      context.clearRect ( 0, 0, _canvas.width, _canvas.height );
      context.translate( -_tracksContainer.element.scrollLeft, 0 );
      context.beginPath();

      for ( var i = 1, l = _media.duration + 1; i < l; i++ ) {

        // If the current time is not in the viewport, just skip it
        if ( i + 1 < start ) {
          continue;
        }
        if ( i - 1 > end ) {
          break;
        }

        var position = i * inc;
        var spaceBetween = -~( position ) + ~( lastPosition );

        // ensure there is enough space to draw a seconds tick
        if ( spaceBetween > 3 ) {

          // ensure there is enough space to draw a half second tick
          if ( spaceBetween > 6 ) {

            context.moveTo( -~position - spaceBetween / 2, 0 );
            context.lineTo( -~position - spaceBetween / 2, 7 );

            // ensure there is enough space for quarter ticks
            if ( spaceBetween > 12 ) {

              context.moveTo( -~position - spaceBetween / 4 * 3, 0 );
              context.lineTo( -~position - spaceBetween / 4 * 3, 4 );

              context.moveTo( -~position - spaceBetween / 4, 0 );
              context.lineTo( -~position - spaceBetween / 4, 4 );

            }
          }
          context.moveTo( -~position, 0 );
          context.lineTo( -~position, 10 );

          if ( ( position - lastTimeDisplayed ) > textWidth + padding ) {

            lastTimeDisplayed = position;
            // text color
            context.fillStyle = TICK_COLOR;
          }

          lastPosition = position;
        }
      }
      // stroke color
      context.strokeStyle = TICK_COLOR;
      context.stroke();
      context.translate( _tracksContainer.element.scrollLeft, 0 );

      _scrubber.update( containerWidth );
    }

    // drawTicks() is called as a consequence of update(), which is called
    // from timeline/media to update according to viewport-centering. As a result,
    // drawTicks() need only happen when tracksContainer scrolls and the media is
    // not playing (probably when the user is scrubbing/zooming/scrolling).
    _media.listen( "mediapause", function() {
      _tracksContainer.element.addEventListener( "scroll", drawTicks, false );
    });
    _media.listen( "mediaplay", function() {
      _tracksContainer.element.removeEventListener( "scroll", drawTicks, false );
    });
    _tracksContainer.element.addEventListener( "scroll", drawTicks, false );

    this.update = function() {
      drawTicks();
    };

    this.enable = function() {
      _canvas.addEventListener( "mousedown", _scrubber.onMouseDown, false );
      _scrubber.enable();
    };

    this.disable = function() {
      _canvas.removeEventListener( "mousedown", _scrubber.onMouseDown, false );
      _scrubber.disable();
    };

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _element;
        }
      }
    });

  }; //TimeBar

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/status', [ "util/lang" ], function( util ){

  function Button( parentNode, className, onClick ) {
    var _container = parentNode.querySelector( className ),
        _button = _container.querySelector( ".status-button" ),
        _state = true;

    function update() {
      if( _state ){
        _button.removeAttribute( "data-state" );
      }
      else {
        _button.setAttribute( "data-state", true );
      }
    }

    _button.addEventListener( "click", onClick, false );

    Object.defineProperties( this, {
      state: {
        enumerable: true,
        get: function(){
          return _state;
        },
        set: function( val ){
          _state = val;
          update();
        }
      }
    });
  }

  function Time( parentNode, media ){
    var _container = parentNode.querySelector( ".time-container" ),
        _timeBox = _container.querySelector( "input" ),
        _media = media,
        _oldValue = 0;

    function setTime( time, setCurrentTime ){
      if( typeof( time ) === "string" || !isNaN( time ) ){
        if( setCurrentTime ){
          try {
            time = Popcorn.util.toSeconds( time );
            _media.currentTime = time;
          }
          catch( e ){
            time = _media.currentTime;
          } //try
        } //if

        _timeBox.value = util.secondsToSMPTE( time );
      }
      else {
        _timeBox.value = _oldValue;
      } //if
    } //setTime

    _media.listen( "mediatimeupdate", function(){
      setTime( _media.currentTime, false );
    });

    _timeBox.addEventListener( "focus", function(){
      _oldValue = _timeBox.value;
    }, false );

    _timeBox.addEventListener( "blur", function(){
      if( _timeBox.value !== _oldValue ){
        setTime( _timeBox.value, true );
      } //if
    }, false );

    _timeBox.addEventListener( "keydown", function( e ){
      if( e.which === 13 ){
        _timeBox.blur();
      }
      else if( e.which === 27 ){
        _timeBox.value = _oldValue;
        _timeBox.blur();
      } //if
    }, false );

    setTime( 0, false );

  }

  return function Status( media, statusArea ) {

    var _media = media,
        _statusContainer = statusArea.querySelector( ".status-container" ),
        _muteButton,
        _playButton,
        _time;

    _statusContainer.className = "status-container";

    _time = new Time( statusArea, _media );

    _muteButton = new Button( statusArea, ".mute-button-container", function() {
      _media.muted = !_media.muted;
    });

    _playButton = new Button( statusArea, ".play-button-container", function() {
      if ( _media.ended ) {
        _media.paused = false;
      }
      else {
        _media.paused = !_media.paused;
      }
    });

    // Ensure default state is correct
    _playButton.state = true;

    _media.listen( "mediamuted", function(){
      _muteButton.state = false;
    });

    _media.listen( "mediaunmuted", function(){
      _muteButton.state = true;
    });

    _media.listen( "mediavolumechange", function(){
      _muteButton.state = !_media.muted;
    });

    _media.listen( "mediaended", function(){
      _playButton.state = true;
    });

    _media.listen( "mediaplay", function(){
      _playButton.state = false;
    });

    _media.listen( "mediapause", function(){
      _playButton.state = true;
    });

    _media.listen( "mediacontentchanged", function(){
      _playButton.state = true;
    });

  };

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/modal', [], function(){

  var __container = document.createElement( "div" );

  var Modal = function( childElement, createOverlay ){

    if( !__container.parentNode ){
      __container.className = "butter-modal-container";
      __container.setAttribute( "data-butter-exclude", true );
      document.body.appendChild( __container );
    }


      var _element = document.createElement( "div" );

      _element.classList.add( "butter-modal-overlay" );
      if ( createOverlay || createOverlay === undefined ) {
        _element.classList.add( "butter-modal-overlay-dark-bg" );
      }
      __container.appendChild( _element );

    // need to wait an event-loop cycle to apply this class
    // ow, opacity transition fails to render
    setTimeout( function(){
      if ( _element ) {
        _element.classList.add( "fade-in" );
      }
    }, 10 );

    _element.appendChild( childElement );

    this.destroy = function(){
      __container.removeChild( _element );
      _element = null;
    };

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _element;
        }
      }
    });

  };

  Modal.element = __container;

  return Modal;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: Dialog
 *
 * Provides dialog functionality to Butter
 */
define('dialog/dialog', [ "util/lang", "core/eventmanager", "./modal" ],
  function( LangUtils, EventManager, Modal ){

  var __dialogs = {},
      __openDialogs = {},
      __keyboardAvoidElements = [
        "TEXTAREA"
      ];

  /**
   * Function: __createDialog
   *
   * Creates a dialog based on src for html layout and ctor for scripted construction
   *
   * @param {String} layoutSrc: String from which the dialog's DOM fragment is created
   * @param {Funtion} dialogCtor: Constructor to run after mandatory dialog constituents are created
   * @param {String} name: Name of the dialog that was constructed when spawn was called
   */
  function __createDialog( layoutSrc, dialogCtor, name ) {

    /**
     * Class: Dialog
     *
     * A Dialog
     *
     * @param {Object} spawnOptions: Can contain an 'event' object whose properties are events, and 'data' to pass to dialogCtor
     */
    return function ( spawnOptions ) {

      spawnOptions = spawnOptions || {};

      var _listeners = spawnOptions.events || {},
          _activities = {},
          _rootElement = LangUtils.domFragment( layoutSrc ),
          _enterKeyActivity,
          _escapeKeyActivity,
          _modal,
          _name = name;

      // Make sure we have a handle to the butter-dialog div. If there are comments or extra elements
      // described in layoutSrc, we don't care about them.
      if ( !( _rootElement.classList && _rootElement.classList.contains( "butter-dialog" ) ) ) {
        _rootElement = _rootElement.querySelector( ".butter-dialog" ) || _rootElement.querySelector( ".butter-first-run-dialog" );
      }

      /**
       * Member: onKeyDown
       *
       * Handler for keydown events that runs two specific activities if they're bound: Enter and Escape keys
       *
       * @param {Event} e: Standard DOM Event from a keydown occurrence
       */
      function onKeyDown( e ) {
        e.stopPropagation();
        if ( __keyboardAvoidElements.indexOf( e.target.nodeName ) === -1 ) {
          e.preventDefault();
          if (  _enterKeyActivity &&
                ( e.which === 13 || e.keyCode === 13 ) ) {
            _activities[ _enterKeyActivity ]( e );
          }
          else if ( _escapeKeyActivity &&
                    ( e.which === 27 || e.keyCode === 27 ) ) {
            _activities[ _escapeKeyActivity ]( e );
          }
        }
      }

      /**
       * Member: _internal
       *
       * Namespace for the dialog, not exposed to the rest of Butter.
       * This is mostly in place to persist the namespace division from the old method of
       * implementing dialogs (with iframes), which used a special library to talk to Butter.
       * _internal effectively replaces that library.
       * There is a purposeful API separation here as a result.
       */
      var _internal = {
        /**
         * Member: rootElement
         *
         * Element constructed from layoutSrc to represent the basis for the Dialog.
         */
        rootElement: _rootElement,

        /**
         * Member: activity
         *
         * Calls the listener corresponding to the given activity name.
         *
         * @param {String} activityName: Name of the activity to execute
         */
        activity: function( activityName ){
          _activities[ activityName ]();
        },

        /**
         * Member: enableCloseButton
         *
         * Enables access to a close butter if it exists in the layout. Using this function,
         * the layout can simply contain an element with a "close-button" class, and it will
         * be connected to the "default-close" activity.
         */
        enableCloseButton: function(){
          var closeButton = _rootElement.querySelector( ".close-button" );
          if( closeButton ){
            closeButton.addEventListener( "click", function closeClickHandler(){
              _internal.activity( "default-close" );
              closeButton.removeEventListener( "click", closeClickHandler, false );
            }, false );
          }
        },

        /**
         * Member: showError
         *
         * Sets the error state of the dialog to true and insert a message into the element
         * with an "error" class if one exists.
         *
         * @param {String} message: Error message to report
         */
        showError: function( message ){
          var element = _rootElement.querySelector( ".error" );
          if( element ){
            element.innerHTML = message;
            _rootElement.setAttribute( "data-error", true );
          }
        },

        /**
         * Member: hideError
         *
         * Removes the error state of the dialog.
         */
        hideError: function(){
          _rootElement.removeAttribute( "data-error" );
        },

        /**
         * Member: assignEnterKey
         *
         * Assigns the enter key to an activity.
         *
         * @param {String} activityName: Name of activity to assign to enter key
         */
        assignEnterKey: function( activityName ){
          _enterKeyActivity = activityName;
        },

        /**
         * Member: assignEscapeKey
         *
         * Assigns the escape key to an activity.
         *
         * @param {String} activityName: Name of activity to assign to escape key
         */
        assignEscapeKey: function( activityName ){
          _escapeKeyActivity = activityName;
        },

        /**
         * Member: registerActivity
         *
         * Registers an activity which can be referenced by the given name.
         *
         * @param {String} name: Name of activity
         * @param {Function} callback: Function to call when activity occurs
         */
        registerActivity: function( name, callback ){
          _activities[ name ] = callback;
        },

        /**
         * Member: assignButton
         *
         * Assigns a button's click to an activity
         *
         * @param {String} selector: Selector for the button (DOM element)
         * @param {String} activityName: Name of activity to link with the click of the given button
         */
        assignButton: function( selector, activityName ){
          var element = _rootElement.querySelector( selector );
          element.addEventListener( "click", _activities[ activityName ], false );
        },

        /**
         * Member: enableElements
         *
         * Removes the "disabled" attribute from given elements
         *
         * @arguments: Each parameter pasesd into this function is treated as the selector for an element to enable
         */
        enableElements: function(){
          var i = arguments.length;
          while ( i-- ) {
            _rootElement.querySelector( arguments[ i ] ).removeAttribute( "disabled" );
          }
        },

        /**
         * Member: disableElements
         *
         * Applies the "disabled" attribute to given elements
         *
         * @arguments: Each parameter pasesd into this function is treated as the selector for an element to enable
         */
        disableElements: function(){
          var i = arguments.length;
          while ( i-- ) {
            _rootElement.querySelector( arguments[ i ] ).setAttribute( "disabled", true );
          }
        },

        /**
         * Member: send
         *
         * Sends a message to the _external namespace.
         *
         * @param {String} activityName: Name of activity to assign to escape key
         * @param {*} data: Data to send along with the message
         */
        send: function( message, data ){
          _external.dispatch( message, data );
        }
      };

      /**
       * Member: _external
       *
       * As with _internal, _external is supplied to Butter only to persist the design
       * of dialogs as they were used in older versions. This maintains that Dialogs function
       * as independent bodies which can send and receive messages from Butter.
       * There is a purposeful API separation here as a result.
       */
      var _external = {
        /**
         * Member: send
         *
         * Sends a message to the _external namespace.
         *
         * @param {String} activityName: Name of activity to assign to escape key
         * @param {*} data: Data to send along with the message
         */
        element: _rootElement,

        /**
         * Member: open
         *
         * Opens the dialog. If listeners were supplied during construction, they are attached now.
         */
        open: function( overlay ) {
          if ( __openDialogs[ _name ] ) {
            _external.focus();
            return;
          }
          __openDialogs[ _name ] = true;
          for ( var e in _listeners ) {
            if ( _listeners.hasOwnProperty( e ) ) {
              _external.listen( e, _listeners[ e ] );
            }
          }
          _modal = new Modal( _rootElement, overlay );
          setTimeout( function() {
            _external.focus();
          }, 0 );
          document.addEventListener( "keydown", onKeyDown, false );
          _internal.dispatch( "open" );
          _external.dispatch( "open" );
        },

        /**
         * Member: close
         *
         * Closes the dialog. If listeners were supplied during construction, they are removed now.
         */
        close: function() {
          __openDialogs[ _name ] = false;
          for( var e in _listeners ){
            if ( _listeners.hasOwnProperty( e ) ) {
              if ( e !== "close" ) {
                _internal.unlisten( e, _listeners[ e ] );
              }
            }
          }
          _modal.destroy();
          _modal = null;
          document.removeEventListener( "keydown", onKeyDown, false );
          _internal.dispatch( "close" );
          _external.dispatch( "close" );
        },

        /**
         * Member: send
         *
         * Sends a message to the dialog.
         *
         * @param {String} message: Message to send to the dialog.
         * @param {*} data: Data to send along with the message.
         */
        send: function( message, data ) {
          _internal.dispatch( message, data );
        },

        /**
         * Member: focus
         *
         * Focuses the dialog as possible. Dispatches a "focus" event to the internal namespace to allow
         * the dialog to respond accordingly, since there may be a better object to focus.
         */
        focus: function() {
          _rootElement.focus();
          _internal.dispatch( "focus" );
        }

      };

      // Give both namespaces Event capabilities.
      EventManager.extend( _internal );
      EventManager.extend( _external );

      // Register the "default-close" activity for immediate use.
      _internal.registerActivity( "default-close", function(){
        _external.close();
      });

      // Register the "default-ok" activity for immediate use.
      _internal.registerActivity( "default-ok", function(){
        _external.dispatch( "submit" );
        _external.close();
      });

      // Call the dialog constructor now that everything is in place.
      dialogCtor( _internal, spawnOptions.data );

      // Return only the external namespace to Butter, since nothing else is required.
      return _external;
    };
  }

  /**
   * ModuleNamespace: Dialog
   */
  return {

    /**
     * Member: register
     *
     * Registers a dialog to be created with a given layout and constructor.
     *
     * @param {String} name: Name of the dialog to be constructed when spawn is called
     * @param {String} layoutSrc: String representing the basic DOM of the dialog
     * @param {Function} dialogCtor: Function to be run after dialog internals are in place
     */
    register: function( name, layoutSrc, dialogCtor ) {
      __dialogs[ name ] = __createDialog( layoutSrc, dialogCtor, name );
      __openDialogs[ name ] = false;
    },

    /**
     * Member: spawn
     *
     * Creates a dialog represented by the given name.
     *
     * @param {String} name: Name of the dialog to construct
     * @param {String} spawnOptions: Options to pass to the constructor (see __createDialog)
     */
    spawn: function( name, spawnOptions ) {
      if ( __dialogs[ name ] ) {
        return __dialogs[ name ]( spawnOptions );
      }
      else {
        throw "Dialog '" + name + "' does not exist.";
      }
    },

    modal: Modal
  };
});

define('text!layouts/track-handle.html',[],function () { return '<div class="track-handle">\n  <span class="title"></span>\n  <span class="track-handle-icon"></span>\n  <div class="menu">\n    <div class="delete"></div>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/trackhandles', [ "dialog/dialog", "util/dragndrop", "util/lang", "text!layouts/track-handle.html" ],
  function( Dialog, DragNDrop, LangUtils, TRACK_HANDLE_LAYOUT ) {

  var ADD_TRACK_BUTTON_Y_ADJUSTMENT = 37;

  return function( butter, media, mediaInstanceRootElement, tracksContainer ) {

    var _media = media,
        _container = mediaInstanceRootElement.querySelector( ".track-handle-container" ),
        _listElement = _container.querySelector( ".handle-list" ),
        _addTrackButton = _container.querySelector( "button.add-track" ),
        _tracks = {},
        _menus = [],
        _this = this,
        _draggingHandleIndex,
        _draggingHandleId;

    _addTrackButton.addEventListener( "click", function() {
      butter.currentMedia.addTrack();
    }, false );

    function sortHandles(){
      if ( butter.currentMedia ) {
        var tracks = butter.currentMedia.orderedTracks,
            trackHandle;
        for ( var i = 0, l = tracks.length; i < l; ++i ) {
          trackHandle = _tracks[ tracks[ i ].id ];
          // It *is* possible for there to be more tracks than there are track handles while importing, so
          // do a check here to see if a handle exists first before ordering.
          if ( trackHandle ) {
            _listElement.appendChild( trackHandle.element );
          }
        }
      }
    }

    DragNDrop.listen( "sortstarted", function onSortStarted( e ) {
      var originalEvent = e.data,
          orderedTracks = butter.currentMedia.orderedTracks,
          id = originalEvent.target.getAttribute( "data-butter-track-id" );

      for ( var i = 0; i < orderedTracks.length; i++ ) {
        if ( orderedTracks[ i ].id === id ) {
          _draggingHandleIndex = i;
          _draggingHandleId = id;
        }
      }

    });

    var _sortable = DragNDrop.sortable( _listElement, {
      change: function( elements ) {
        var newIndex, id,
            orderedTracks = butter.currentMedia.orderedTracks,
            track,
            indexCache;

        for( var i = 0, l = elements.length; i < l; ++i ) {
          id = elements[ i ].getAttribute( "data-butter-track-id" );
          if ( id === _draggingHandleId ) {
            newIndex = i;
            break;
          }
        }

        track = orderedTracks[ _draggingHandleIndex ];
        orderedTracks.splice( _draggingHandleIndex, 1 );
        orderedTracks.splice( newIndex, 0, track );

        indexCache = newIndex;
        if ( newIndex < _draggingHandleIndex ) {
          var temp = _draggingHandleIndex;

          _draggingHandleIndex = newIndex;
          newIndex = temp;
        }

        butter.currentMedia.sortTracks( _draggingHandleIndex, newIndex );

        // We now need to set the values of "current index" to where we replaced since sortstarted
        // won't fire again until the mouse is let go and then an element is selected again.
        _draggingHandleIndex = indexCache;
      }
    });

    _media.listen( "trackorderchanged", function( e ) {
      var tracks = e.data;
      for ( var i = 0, l = tracks.length; i < l; i++ ) {
        var track = tracks[ i ],
            element = _tracks[ track.id ].element;
        element.querySelector( "span.title" ).textContent = track.name;
      }
    });

    function onTrackAdded( e ) {
      var track = e.data,
          trackId = track.id,
          trackDiv = LangUtils.domFragment( TRACK_HANDLE_LAYOUT, ".track-handle" ),
          menuDiv = trackDiv.querySelector( ".menu" ),
          deleteButton = menuDiv.querySelector( ".delete" );

      deleteButton.addEventListener( "click", function() {
        var dialog = Dialog.spawn( "delete-track", {
          data: track.name,
          events: {
            submit: function( e ){
              if( e.data === true ){
                var trackEvents = track.trackEvents;
                for ( var i = 0, l = trackEvents.length; i < l; i++ ) {
                  butter.editor.closeTrackEventEditor( trackEvents[ i ] );
                }
                media.removeTrack( track );
              } //if
              dialog.close();
            },
            cancel: function(){
              dialog.close();
            }
          }
        });
        dialog.open();
      }, false );

      trackDiv.addEventListener( "dblclick", function(){
        var dialog = Dialog.spawn( "track-data", {
          data: track,
          events: {
            submit: function( e ) {
              // wrap in a try catch so we know right away about any malformed JSON
              try {
                var trackData = JSON.parse( e.data ),
                    trackEvents = track.trackEvents,
                    trackDataEvents = trackData.trackEvents,
                    dontRemove = {},
                    toAdd = [],
                    i,
                    l;

                trackDiv.childNodes[ 0 ].textContent = track.name = trackData.name;
                // update every trackevent with it's new data
                for ( i = 0, l = trackDataEvents.length; i < l; i++ ) {
                  var teData = trackDataEvents[ i ],
                      te = track.getTrackEventById( teData.id );

                  // check to see if the current track event exists already
                  if ( te ) {
                    te.update( teData.popcornOptions );
                    /* remove it from our reference to the array of track events so we know
                     * which ones to remove later
                     */
                    dontRemove[ teData.id ] = teData;
                  // if we couldn't find the track event, it must be a new one
                  } else {
                    toAdd.push( { type: teData.type, popcornOptions: teData.popcornOptions } );
                  }
                }

                // remove all trackEvents that wern't updated
                for ( i = trackEvents.length, l = 0; i >= l; i-- ) {
                  if ( trackEvents[ i ] && !dontRemove[ trackEvents[ i ].id ] ) {
                    track.removeTrackEvent( trackEvents[ i ] );
                  }
                }

                // add all the trackEvents that didn't exist so far
                for ( i = 0, l = toAdd.length; i < l; i++ ) {
                  track.addTrackEvent( toAdd[ i ] );
                }
                // let the dialog know things went well
                dialog.send( "track-updated" );
              } catch ( error ) {
                // inform the dialog about the issue
                dialog.send( "error" );
              }
            }
          }
        });
        dialog.open();
      }, false );

      _menus.push( menuDiv );

      trackDiv.setAttribute( "data-butter-track-id", trackId );
      menuDiv.setAttribute( "data-butter-track-id", trackId );
      menuDiv.querySelector( ".delete" ).setAttribute( "data-butter-track-id", trackId );
      trackDiv.querySelector( "span.track-handle-icon" ).setAttribute( "data-butter-track-id", trackId );
      trackDiv.querySelector( "span.title" ).setAttribute( "data-butter-track-id", trackId );
      trackDiv.querySelector( "span.title" ).appendChild( document.createTextNode( track.name ) );

      _sortable.addItem( trackDiv );

      _listElement.appendChild( trackDiv );

      _tracks[ trackId ] = {
        id: trackId,
        track: track,
        element: trackDiv,
        menu: menuDiv
      };

      _addTrackButton.style.top = _listElement.offsetHeight - ADD_TRACK_BUTTON_Y_ADJUSTMENT + "px";

      sortHandles();
    }

    var existingTracks = _media.tracks;
    for( var i=0; i<existingTracks.length; ++i ){
      onTrackAdded({
        data: existingTracks[ i ]
      });
    }

    _media.listen( "trackadded", onTrackAdded );

    _media.listen( "trackremoved", function( e ){
      var trackId = e.data.id;
      _listElement.removeChild( _tracks[ trackId ].element );
      _sortable.removeItem( _tracks[ trackId ].element );
      _menus.splice( _menus.indexOf( _tracks[ trackId ].menu ), 1 );
      delete _tracks[ trackId ];
      _addTrackButton.style.top = _listElement.offsetHeight - ADD_TRACK_BUTTON_Y_ADJUSTMENT + "px";
    });

    tracksContainer.element.addEventListener( "scroll", function(){
      _container.scrollTop = tracksContainer.element.scrollTop;
    }, false );

    _container.addEventListener( "mousewheel", function( e ){
      if( e.wheelDeltaY ){
        tracksContainer.element.scrollTop -= e.wheelDeltaY;
        e.preventDefault();
      }
    }, false );

    // For Firefox
    _container.addEventListener( "DOMMouseScroll", function( e ){
      if( e.axis === e.VERTICAL_AXIS && !e.shiftKey ){
        tracksContainer.element.scrollTop += e.detail * 2;
        e.preventDefault();
      }
    }, false );

    this.update = function(){
      _container.scrollTop = tracksContainer.element.scrollTop;
      _addTrackButton.style.top = _listElement.offsetHeight - ADD_TRACK_BUTTON_Y_ADJUSTMENT + "px";
    };

    _this.update();

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _container;
        }
      }
    });

  }; //TrackHandles

});

define('text!layouts/super-scrollbar.html',[],function () { return '<div id="butter-super-scrollbar-outer-container">\n  <div class="butter-super-scrollbar-zoom-slider-container">\n    <span class="tick"></span>\n    <span class="tick"></span>\n    <span class="tick"></span>\n    <span class="tick"></span>\n    <span class="tick"></span>\n    <span class="tick"></span>\n    <div class="butter-super-scrollbar-zoom-slider">\n      <div class="butter-super-scrollbar-zoom-handle"></div>\n    </div>\n  </div>\n  <div id="butter-super-scrollbar-inner-container">\n    <div id="butter-super-scrollbar-visuals"></div>\n    <span id="butter-super-scrollbar-viewport" class="viewport-transition"> \n      <span id="butter-super-scrollbar-handle-left" class="butter-super-scrollbar-handle">\n        <span class="butter-super-arrow"></span>\n      </span>\n      <span id="butter-super-scrollbar-handle-right" class="butter-super-scrollbar-handle">\n        <span class="butter-super-arrow"></span>\n      </span>\n    </span>\n    <span id="buter-super-scrollbar-scrubber"></span>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/* Super scrollbar is a scrollbar and a zoom bar in one.
 * It also doubles as a minimap of sorts.
 * Displaying a preview of all the tracks and track events */
define('timeline/super-scrollbar', [ "util/lang", "text!layouts/super-scrollbar.html" ],
  function( LangUtils, SUPER_SCROLLBAR_LAYOUT ) {

  var TRACK_PADDING = 1,          // This padding is pixels between track event visuals.
                                  // This is, in pixels, how close the left and right handles on the
                                  // viewport can get.
                                  // TODO: There is a bug I cannot find (yet), to keep this value from working on
                                  // right handle.
                                  // Right drag solves this with css min-width that is the same as MIN_WIDTH.
                                  // min-width only seems to work for right, and not left, so left uses MIN_WIDTH.
                                  // need one fix for both cases.

      MIN_WIDTH = 5,
      ARROW_MIN_WIDTH = 50,       // The arrows have to change position at this point.
      ARROW_MIN_WIDTH_CLASS = "super-scrollbar-small";

  return function( outerElement, innerElement, boundsChangedCallback, media ) {
    var _outer = LangUtils.domFragment( SUPER_SCROLLBAR_LAYOUT, "#butter-super-scrollbar-outer-container" ),
        _inner = _outer.querySelector( "#butter-super-scrollbar-inner-container" ),
        _rect, _duration,
        _media = media,
        // viewport is the draggable, resizable, representation of the viewable track container.
        _viewPort = _inner.querySelector( "#butter-super-scrollbar-viewport" ),
        _leftHandle = _viewPort.querySelector( "#butter-super-scrollbar-handle-left" ),
        _rightHandle = _viewPort.querySelector( "#butter-super-scrollbar-handle-right" ),
        // visuals is the container for the visual representations for track events.
        _visuals = _inner.querySelector( "#butter-super-scrollbar-visuals" ),
        _scrubber = _inner.querySelector( "#buter-super-scrollbar-scrubber" ),
        _zoomSlider = _outer.querySelector( ".butter-super-scrollbar-zoom-slider" ),
        _zoomSliderContainer = _outer.querySelector( ".butter-super-scrollbar-zoom-slider-container" ),
        _zoomSliderHandle = _outer.querySelector( ".butter-super-scrollbar-zoom-handle" ),
        _offset = 0,
        _trackEventVisuals = {},
        _boundsChangedCallback = function( left, width ) {
          if ( width !== -1 ) {
            _zoomSliderHandle.style.left = width * 100 + "%";
          }
          boundsChangedCallback( left, width );
        },
        _this = this;

    var checkMinSize, onViewMouseUp, onViewMouseDown, onViewMouseMove,
        onLeftMouseUp, onLeftMouseDown, onLeftMouseMove,
        onRightMouseUp, onRightMouseDown, onRightMouseMove,
        onElementMouseUp, onElementMouseDown, onElementMouseMove,
        updateView;

    checkMinSize = function() {
      if ( _viewPort.getBoundingClientRect().width < ARROW_MIN_WIDTH ) {
        _inner.classList.add( ARROW_MIN_WIDTH_CLASS );
      } else {
        _inner.classList.remove( ARROW_MIN_WIDTH_CLASS );
      }
    };

    _this.update = function() {
      _rect = _inner.getBoundingClientRect();
      checkMinSize();
    };

    onElementMouseUp = function( e ) {
      e.stopPropagation();
      window.removeEventListener( "mouseup", onElementMouseUp, false );
      window.removeEventListener( "mousemove", onElementMouseMove, false );
    };

    onViewMouseUp = function( e ) {
      e.stopPropagation();
      window.removeEventListener( "mouseup", onViewMouseUp, false );
      window.removeEventListener( "mousemove", onViewMouseMove, false );
    };

    onLeftMouseUp = function( e ) {
      e.stopPropagation();
      outerElement.addEventListener( "scroll", updateView, false );
      window.removeEventListener( "mouseup", onLeftMouseUp, false );
      window.removeEventListener( "mousemove", onLeftMouseMove, false );
    };

    onRightMouseUp = function( e ) {
      e.stopPropagation();
      outerElement.addEventListener( "scroll", updateView, false );
      window.removeEventListener( "mouseup", onRightMouseUp, false );
      window.removeEventListener( "mousemove", onRightMouseMove, false );
    };

    onElementMouseDown = function( e ) {
      e.stopPropagation();
      media.currentTime = ( e.clientX - _rect.left ) / _rect.width * _duration;
      _viewPort.classList.remove( "viewport-transition" );
      window.addEventListener( "mouseup", onElementMouseUp, false );
      window.addEventListener( "mousemove", onElementMouseMove, false );
    };

    onViewMouseDown = function( e ) {
      e.stopPropagation();
      _viewPort.classList.remove( "viewport-transition" );
      _offset = e.clientX - _rect.left - _viewPort.offsetLeft;
      _media.pause();  // pause the media here to diffuse confusion with scrolling & playing
      window.addEventListener( "mouseup", onViewMouseUp, false );
      window.addEventListener( "mousemove", onViewMouseMove, false );
    };

    onLeftMouseDown = function( e ) {
      e.stopPropagation();
      _media.pause();  // pause the media here to diffuse confusion with scrolling & playing
      _viewPort.classList.remove( "viewport-transition" );
      outerElement.removeEventListener( "scroll", updateView, false );
      window.addEventListener( "mouseup", onLeftMouseUp, false );
      window.addEventListener( "mousemove", onLeftMouseMove, false );
    };

    onRightMouseDown = function( e ) {
      e.stopPropagation();
      _media.pause();  // pause the media here to diffuse confusion with scrolling & playing
      outerElement.removeEventListener( "scroll", updateView, false );
      _viewPort.classList.remove( "viewport-transition" );
      window.addEventListener( "mouseup", onRightMouseUp, false );
      window.addEventListener( "mousemove", onRightMouseMove, false );
    };

    onElementMouseMove = function( e ) {
      e.preventDefault();
      e.stopPropagation();
      media.currentTime = ( e.clientX - _rect.left ) / _rect.width * _duration;
    };

    onViewMouseMove = function( e ) {
      e.preventDefault();
      e.stopPropagation();
      _boundsChangedCallback( Math.max( 0, ( e.clientX - _rect.left - _offset ) ) / _rect.width, -1 );
    };

    onLeftMouseMove = function( e ) {
      e.preventDefault();
      e.stopPropagation();

      // position is from the left of the container, to the left of the viewport.
      var position = e.clientX - _rect.left;

      // make sure we never go out of bounds.
      if ( position < 0 ) {
        position = 0;
      }

      // make sure left never goes over right.
      if ( position + MIN_WIDTH > _viewPort.offsetLeft + _viewPort.clientWidth ) {
        position = _viewPort.offsetLeft + _viewPort.clientWidth - MIN_WIDTH;
      }

      _viewPort.style.left = position / _rect.width * 100 + "%";
      _boundsChangedCallback( _viewPort.offsetLeft / _rect.width, _viewPort.offsetWidth / _rect.width );
    };

    onRightMouseMove = function( e ) {
      e.preventDefault();
      e.stopPropagation();

      // position is from the right of the container, to the right of the viewport.
      var position = _rect.width - ( e.clientX - _rect.left );

      // make sure we never go out of bounds.
      if ( position < 0 ) {
        position = 0;
      }

      _viewPort.style.right = position / _rect.width * 100 + "%";
      _boundsChangedCallback( _viewPort.offsetLeft / _rect.width, _viewPort.offsetWidth / _rect.width );
    };

    updateView = function() {
      _viewPort.style.left = outerElement.scrollLeft / innerElement.offsetWidth * 100 + "%";
      _viewPort.style.right = ( 1 - ( outerElement.scrollLeft + outerElement.offsetWidth ) / innerElement.offsetWidth ) * 100 + "%";
    };

    _inner.addEventListener( "mousedown", onElementMouseDown, false );
    outerElement.addEventListener( "scroll", updateView, false );
    _viewPort.addEventListener( "mousedown", onViewMouseDown, false );
    _leftHandle.addEventListener( "mousedown", onLeftMouseDown, false );
    _rightHandle.addEventListener( "mousedown", onRightMouseDown, false );

    /**
     * scaleViewPort
     *
     * Scales the viewport by a percentage value (0 - 1). The viewport grows or shrinks
     * to cover less or more area, and calls _boundsChangedCallback with the new (left, width) combination
     * as percentage values (0 - 1). This action has the consequence of zooming the
     * track container viewport in or out.
     *
     * A left and right position are calculated by moving them a set amount from their current
     * positions around the mid-point of the viewport. A new width value is also calculated
     * to provide _boundsChangedCallback with the necessary values: left & width.
     *
     * If the growth or shrink rate results in less than a pixel on both ends, nothing happens.
     *
     * @param {Number} scale: Percentage (0 - 1) to grow or shrink the viewport
     */
    function scaleViewPort( scale ) {

      var viewWidth = _viewPort.clientWidth,
          viewLeft = _viewPort.offsetLeft,
          rectWidth = _rect.width,
          oldScale = viewWidth / rectWidth,
          scaleDiff = oldScale - scale,
          halfScale = scaleDiff / 2,
          pixelGrowth = halfScale * rectWidth,
          rightPosition,
          leftPosition;

      // make sure our growth is at least a pixel on either side.
      if ( ( pixelGrowth > -1 && pixelGrowth < 1 ) ) {
        return;
      }

      rightPosition = ( 1 - ( ( viewLeft + viewWidth ) / rectWidth ) ) + halfScale;
      leftPosition = ( viewLeft / rectWidth ) + halfScale;

      if ( rightPosition < 0 ) {
        leftPosition += rightPosition;
        rightPosition = 0;
      }
      if ( leftPosition < 0 ) {
        rightPosition += leftPosition;
        leftPosition = 0;
      }

      _viewPort.style.right = rightPosition * 100 + "%";
      _viewPort.style.left = leftPosition * 100 + "%";

      _boundsChangedCallback( leftPosition, scale );
    }

    function zoomSliderMouseUp() {
      _viewPort.classList.remove( "viewport-transition" );
      window.removeEventListener( "mouseup", zoomSliderMouseUp, false );
      window.removeEventListener( "mousemove", zoomSliderMouseMove, false );
      _zoomSliderContainer.addEventListener( "mousedown", zoomSliderContainerMouseDown, false );
      _zoomSliderHandle.addEventListener( "mousedown", zoomSliderHanldeMouseDown, false );
    }

    function zoomSliderMouseMove( e ) {
      e.preventDefault();
      updateZoomSlider( e );
    }

    function updateZoomSlider( e ) {
      var position = e.clientX - ( _zoomSliderContainer.offsetLeft + ( _zoomSliderHandle.offsetWidth / 2 ) ),
          scale;

      if ( position < 0 ) {
        position = 0;
      } else if ( position > _zoomSlider.offsetWidth ) {
        position = _zoomSlider.offsetWidth;
      }
      scale = position / _zoomSlider.offsetWidth;
      if ( scale * _rect.width < MIN_WIDTH ) {
        scale = MIN_WIDTH / _rect.width;
      }
      scaleViewPort( scale );
      _zoomSliderHandle.style.left = position / _zoomSlider.offsetWidth * 100 + "%";
    }

    function zoomSliderContainerMouseDown( e ) {
      _viewPort.classList.add( "viewport-transition" );
      updateZoomSlider( e );
      _zoomSliderHandle.removeEventListener( "mousedown", zoomSliderHanldeMouseDown, false );
      _zoomSliderContainer.removeEventListener( "mousedown", zoomSliderContainerMouseDown, false );
      window.addEventListener( "mousemove", zoomSliderMouseMove, false );
      window.addEventListener( "mouseup", zoomSliderMouseUp, false );
    }

    function zoomSliderHanldeMouseDown() {
      _viewPort.classList.add( "viewport-transition" );
      _zoomSliderHandle.removeEventListener( "mousedown", zoomSliderHanldeMouseDown, false );
      _zoomSliderContainer.removeEventListener( "mousedown", zoomSliderContainerMouseDown, false );
      window.addEventListener( "mousemove", zoomSliderMouseMove, false );
      window.addEventListener( "mouseup", zoomSliderMouseUp, false );
    }

    _zoomSliderContainer.addEventListener( "mousedown", zoomSliderContainerMouseDown, false );
    _zoomSliderHandle.addEventListener( "mousedown", zoomSliderHanldeMouseDown, false );

    function updateTrackEventVisual( trackEvent, order ) {
      var trackEventVisual = document.createElement( "div" ),
          style = trackEvent.view.element.style;
      trackEventVisual.classList.add( "butter-super-scrollbar-trackevent" );
      _trackEventVisuals[ trackEvent.id ] = trackEventVisual;
      _visuals.appendChild( trackEventVisual );
      trackEventVisual.style.width = style.width;
      trackEventVisual.style.left = style.left;
      trackEventVisual.style.top = ( trackEventVisual.offsetHeight + TRACK_PADDING ) * order + "px";
    }

    _media.listen( "trackeventremoved", function( e ) {
      var trackEvent = _trackEventVisuals[ e.data.id ];
      if ( trackEvent ) {
        delete _trackEventVisuals[ e.data.id ];
        trackEvent.parentNode.removeChild( trackEvent );
      }
    });

    _media.listen( "trackeventupdated", function( e ) {
      var trackEvent = _trackEventVisuals[ e.data.id ],
          style = e.data.view.element.style;
      if ( trackEvent ) {
        trackEvent.style.width = style.width;
        trackEvent.style.left = style.left;
      }
    });

    _media.listen( "trackorderchanged", function( e ) {
      var data = e.data, i = 0,
          j, jl, trackEvent, track,
          il = data.length;
      for ( ; i < il; i++ ) {
        track = data[ i ];
        for ( j = 0, jl = track.trackEvents.length; j < jl; j++ ) {
          trackEvent = _trackEventVisuals[ track.trackEvents[ j ].id ];
          if ( trackEvent ) {
            trackEvent.style.top = ( trackEvent.offsetHeight + TRACK_PADDING ) * track.order + "px";
          }
        }
      }
    });

    _media.listen( "mediatimeupdate", function( e ) {
      _scrubber.style.left = e.data.currentTime / _duration * 100 + "%";
    });

    _this.initialize = function() {
      var i, j, tl, tel,
          trackEvents,
          order,
          track,
          tracks = _media.tracks;
      for ( i = 0, tl = tracks.length; i < tl; i++ ) {
        track = tracks[ i ];
        trackEvents = track.trackEvents;
        order = track.order;
        for ( j = 0, tel = trackEvents.length; j < tel; j++ ) {
          updateTrackEventVisual( trackEvents[ j ], order );
        }
      }
      _media.listen( "trackeventadded", function( e ) {
        updateTrackEventVisual( e.data, e.target.order );
      });
    };

    _media.listen( "mediaready", function( e ) {
      _duration = e.target.duration;
      updateView();
    });

    _this.resize = function() {
      _this.update();
      _boundsChangedCallback( _viewPort.offsetLeft / _rect.width, _viewPort.offsetWidth / _rect.width );
    };

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _outer;
        }
      }
    });
  };
});


define('text!layouts/media-instance.html',[],function () { return '<div class="media-instance">\n  <div class="track-handle-container">\n    <div class="handle-list"></div>\n    <button class="butter-btn btn-light add-track" title="Add a new Layer for your events">+\n    </button>\n  </div>\n  <div class="media-container">\n    <div class="tracks-container-wrapper">\n      <div class="tracks-container"></div>\n    </div>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/media', [ "core/trackevent", "core/track", "core/eventmanager",
          "./track-container", "util/scrollbars", "./timebar",
          "./status", "./trackhandles", "./super-scrollbar",
          "util/lang", "text!layouts/media-instance.html" ],
  function( TrackEvent, Track, EventManager,
            TrackContainer, Scrollbars, TimeBar,
            Status, TrackHandles, SuperScrollbar,
            LangUtils, MEDIA_INSTANCE_LAYOUT ) {

  var DEFAULT_BOUNDS = [ 0, 0.5 ];

  function MediaInstance( butter, media ) {

    var _bounds = DEFAULT_BOUNDS;

    function setContainerBounds( left, right ) {
      if ( _bounds[0] !== left || _bounds[1] !== right ) {
        _bounds = [ left, right ];
        _tracksContainer.setViewportBounds( left, right );
        updateUI();
      }
    }

    var _this = this,
        _media = media,
        _rootElement = LangUtils.domFragment( MEDIA_INSTANCE_LAYOUT, ".media-instance" ),
        _tracksContainer = new TrackContainer( butter, media, _rootElement ),
        _container = _rootElement.querySelector( ".media-container" ),
        _superScrollbar = new SuperScrollbar( _tracksContainer.element, _tracksContainer.container, setContainerBounds, _media ),
        _vScrollBar = new Scrollbars.Vertical( _tracksContainer.element, _tracksContainer.container ),
        _hScrollBar = new Scrollbars.Horizontal( _tracksContainer.element, _tracksContainer.container ),
        _timebar = new TimeBar( butter, _media, butter.ui.tray.statusArea, _tracksContainer ),
        _trackHandles = new TrackHandles( butter, _media, _rootElement, _tracksContainer ),
        _status;

    _status = new Status( _media, butter.ui.tray.statusArea );

    _tracksContainer.setScrollbars( _vScrollBar, _hScrollBar );

    EventManager.extend( _this );

    function onEditorToggled() {
      _tracksContainer.update();
      _timebar.update();
      _superScrollbar.resize();
    }

    window.addEventListener( "resize", function() {
      _vScrollBar.update();
      _timebar.update();
      _superScrollbar.resize();
    }, false );

    function onMediaTimeUpdate() {
      // Move the viewport to be centered around the scrubber
      _tracksContainer.followCurrentTime();
      // Align the timebar again to remove jitter
      // TODO: this is expensive, and only fixes 50% of the problem
      _timebar.update();
    }

    _media.listen( "mediaplay", function(){
      // Make sure the viewport contains the scrubber
      _tracksContainer.snapTo( _media.currentTime );
      // Listen for timeupdate to attempt to center the viewport around the scrubber
      _media.listen( "mediatimeupdate", onMediaTimeUpdate );
    });

    _media.listen( "mediapause", function(){
      // Stop listening for timeupdates so that the user can scroll around freely
      _media.unlisten( "mediatimeupdate", onMediaTimeUpdate );
    });

    function onTrackEventMouseDown( e ){
      var trackEvent = e.data.trackEvent,
          tracks, i, length,
          wasSelected = trackEvent.selected,
          originalEvent = e.data.originalEvent;

      if ( !originalEvent.shiftKey && !trackEvent.selected ) {
        tracks = _media.tracks;
        for ( i = 0, length = tracks.length; i < length; i++ ) {
          tracks[ i ].deselectEvents( trackEvent );
        }
      }

      trackEvent.selected = true;

      function onTrackEventMouseUp() {
        window.removeEventListener( "mouseup", onTrackEventMouseUp, false );
        window.removeEventListener( "mousemove", onTrackEventDragStarted, false );

        if ( !originalEvent.shiftKey ) {
          tracks = _media.tracks;
          for ( i = 0, length = tracks.length; i < length; i++ ) {
            tracks[ i ].deselectEvents( trackEvent );
          }
        } else if ( trackEvent.selected && wasSelected ) {
          trackEvent.selected = false;
        }
      }

      function onTrackEventDragStarted() {
        window.removeEventListener( "mousemove", onTrackEventDragStarted, false );
        window.removeEventListener( "mouseup", onTrackEventMouseUp, false );
      }

      window.addEventListener( "mouseup", onTrackEventMouseUp, false );
      window.addEventListener( "mousemove", onTrackEventDragStarted, false );
    }

    function onMediaReady(){
      updateUI();
      _timebar.enable();
      _media.currentTime = 0;
    }

    function onMediaReadyFirst(){
      _media.unlisten( "mediaready", onMediaReadyFirst );
      _media.listen( "mediaready", onMediaReady );

      _container.appendChild( _tracksContainer.element );
      _rootElement.appendChild( _superScrollbar.element );
      _container.appendChild( _vScrollBar.element );
      _container.appendChild( _hScrollBar.element );
      _rootElement.appendChild( _trackHandles.element );

      butter.ui.tray.setMediaInstance( _rootElement );

      _media.listen( "trackeventremoved", function( e ){
        var trackEvent = e.data;
        trackEvent.view.unlisten( "trackeventmousedown", onTrackEventMouseDown );
      });

      function onTrackEventAdded( e ){
        var trackEvent = e.data;
        trackEvent.view.listen( "trackeventmousedown", onTrackEventMouseDown );
      }

      function onTrackAdded( e ){
        var track = e.data;
        track.view.listen( "plugindropped", onPluginDropped );
        track.view.listen( "trackeventmousedown", onTrackEventMouseDown );

        var existingEvents = track.trackEvents;
        for( var i=0; i<existingEvents.length; ++i ){
          onTrackEventAdded({
            data: existingEvents[ i ]
          });
        }

      }

      var existingTracks = _media.tracks;
      for( var i=0; i<existingTracks.length; ++i ){
        onTrackAdded({
          data: existingTracks[ i ]
        });
      }

      _media.listen( "trackadded", onTrackAdded );
      _media.listen( "trackeventadded", onTrackEventAdded );

      _media.listen( "trackremoved", function( e ){
        var track = e.data;
        track.view.unlisten( "plugindropped", onPluginDropped );
        track.view.unlisten( "trackeventmousedown", onTrackEventMouseDown );
      });

      _superScrollbar.initialize();
      _bounds = DEFAULT_BOUNDS;
      _tracksContainer.setViewportBounds( _bounds[ 0 ], _bounds[ 1 ] );
      onMediaReady();
    }

    _media.listen( "mediaready", onMediaReadyFirst );
    _media.listen( "mediacontentchanged", _timebar.disable );

    function onPluginDropped( e ) {
      var type = e.data.type,
          track = e.data.track,
          start = e.data.start,
          end = e.data.end,
          popcornOptions,
          trackEvent;

      if ( e.data.popcornOptions ) {
        popcornOptions = {};
        for ( var prop in e.data.popcornOptions ) {
          if ( e.data.popcornOptions.hasOwnProperty( prop ) ) {
            popcornOptions[ prop ] = e.data.popcornOptions[ prop ];
          }
        }
      }

      if ( _media.ready ) {
        if ( popcornOptions && popcornOptions.end ) {
          end = popcornOptions.end + start;
        }
        trackEvent = butter.generateSafeTrackEvent( type, start, end, track );
        if ( popcornOptions ) {
          if ( popcornOptions.end ) {
            popcornOptions.end = trackEvent.popcornOptions.end;
          }
          trackEvent.update( popcornOptions );
        }
        butter.editor.editTrackEvent( trackEvent );
      }
    }

    this.destroy = function() {
      if ( _rootElement.parentNode ) {
        _rootElement.parentNode.removeChild( _rootElement );
      }
      butter.editor.unlisten( "editortoggled", onEditorToggled );
      butter.unlisten( "editoropened", onEditorToggled );
    };

    this.hide = function() {
      _rootElement.style.display = "none";
    };

    this.show = function() {
      _rootElement.style.display = "block";
    };

    function updateUI() {
      if( _media.duration ){
        _tracksContainer.update();
        _timebar.update();
        _vScrollBar.update();
        _superScrollbar.update();
        _trackHandles.update();
      }
    }

    butter.listen( "ready", function(){
      updateUI();
    });

    this.trackContainer = _tracksContainer;
    this.element = _rootElement;
    this.media = _media;
  }

  return MediaInstance;

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('timeline/module', [
          "core/logger",
          "./media"
        ],
        function(
          Logger,
          Media
        ){

  var Timeline = function( butter ){

    var _media = {},
        _currentMedia,
        _parentElement = document.createElement( "div" );

    _parentElement.id = "butter-timeline";

    _parentElement.classList.add( "fadable" );

    this._start = function( onModuleReady ){
      onModuleReady();
    };

    this.getCurrentTrackWidth = function() {
      return _currentMedia.trackContainer.getTrackWidth();
    };

    butter.listen( "mediaadded", function( event ){
      var mediaObject = event.data,
          media = new Media( butter, mediaObject );

      _media[ mediaObject.id ] = media;
      _parentElement.appendChild( media.element );

      function mediaChanged( event ){
        if ( _currentMedia !== _media[ event.data.id ] ){
          if ( _currentMedia ) {
            _currentMedia.hide();
          }
          _currentMedia = _media[ event.data.id ];
          if ( _currentMedia ) {
            _currentMedia.show();
          }
        }
      }

      function mediaRemoved( event ){
        var mediaObject = event.data;
        if( _media[ mediaObject.id ] ){
          _media[ mediaObject.id ].destroy();
        }
        delete _media[ mediaObject.id ];
        if( _currentMedia && ( mediaObject.id === _currentMedia.media.id ) ){
          _currentMedia = undefined;
        }
        butter.unlisten( "mediachanged", mediaChanged );
        butter.unlisten( "mediaremoved", mediaRemoved );
      } //mediaRemoved

      butter.listen( "mediachanged", mediaChanged );
      butter.listen( "mediaremoved", mediaRemoved );
    });

  }; //Timeline

  Timeline.__moduleName = "timeline";

  return Timeline;
}); //define
;
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function() {

  function parameterize(data) {
    var s = [];

    if ( !data ) {
      return null;
    }

    for(var key in data){
      if( data.hasOwnProperty( key ) ){
        s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
      }
    }

    return s.join("&").replace("/%20/g", "+");
  }

  var __csrfToken = "",
      __onCSRFTokenAcquired;

  define('util/xhr', [], function() {

    function generateCSRFOnReadyStateHandler( callback ) {
      return function() {
        if ( this.readyState !== 4 ) {
          return;
        }

        if ( !__csrfToken ) {
          try {
            __csrfToken = JSON.parse( this.response || this.responseText ).csrf;
            if ( __csrfToken && __onCSRFTokenAcquired ) {
              __onCSRFTokenAcquired();
            }
          } catch (e) {}
        }

        if ( callback ) {
          callback.apply( this, arguments );
        }

      };
    }

    var XHR = {
      "UNSENT": 0,
      "OPENED": 1,
      "HEADERS_RECEIVED": 2,
      "LOADING": 3,
      "DONE": 4,

      /**
       * getUntilComplete
       *
       * Wraps XHR.get with a cross-browser compatible check for load completeness.
       *
       * @param {String} url: Request url.
       * @param {Function} callback: Callback function which is called after XHR is complete.
       * @param {String} mimeTypeOverride: Optional. Overrides MIME type specified by the response from the server.
       * @param {Object} extraRequestHeaders: Optional. Header key/value pairs to add to the request before it is sent to the server.
       */
      "getUntilComplete": function( url, callback, mimeTypeOverride, extraRequestHeaders ) {
        XHR.get( url, function( e ) {
          if ( this.readyState === XHR.DONE ) {
            callback.call( this, e );
          }
        }, mimeTypeOverride, extraRequestHeaders );
      },

      /**
       * get
       *
       * Sends a GET request through XHR to the specified URL.
       *
       * @param {String} url: Request url.
       * @param {Function} callback: Callback function which is called when readyState changes.
       * @param {String} mimeTypeOverride: Optional. Overrides MIME type specified by the response from the server.
       * @param {Object} extraRequestHeaders: Optional. Header key/value pairs to add to the request before it is sent to the server.
       */
      "get": function( url, callback, mimeTypeOverride, extraRequestHeaders ) {
        var xhr = new XMLHttpRequest();
        xhr.open( "GET", url, true );
        xhr.onreadystatechange = generateCSRFOnReadyStateHandler( callback );
        if ( extraRequestHeaders ) {
          for ( var requestHeader in extraRequestHeaders ) {
            if ( extraRequestHeaders.hasOwnProperty( requestHeader ) ) {
              xhr.setRequestHeader( requestHeader, extraRequestHeaders[ requestHeader ] );
            }
          }
        }
        if ( xhr.overrideMimeType && mimeTypeOverride ) {
          xhr.overrideMimeType( mimeTypeOverride );
        }
        xhr.send( null );
      },

      /**
       * post
       *
       * Sends a POST request through XHR to the specified URL.
       *
       * @param {String} url: Request url.
       * @param {Function} callback: Callback function which is called when readyState changes.
       * @param {String} type: Optional. The Content-Type header value to supply with the request.
       */
      "post": function( url, data, callback, type ) {
        var xhr = new XMLHttpRequest();
        xhr.open( "POST", url, true );
        xhr.onreadystatechange = generateCSRFOnReadyStateHandler( callback );
        if ( __csrfToken ) {
          xhr.setRequestHeader( "x-csrf-token", __csrfToken );
        }
        if ( !type ) {
          xhr.setRequestHeader( "Content-Type", "application/x-www-form-urlencoded" );
          xhr.send( parameterize( data ) );
        } else {
          xhr.setRequestHeader( "Content-Type", type );
          xhr.send( data );
        }
      },

      setCSRFTokenAcquiredCallback: function( callback ) {
        __onCSRFTokenAcquired = callback;
      }
    };

    return XHR;

  }); //define
}());

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/* This widget allows you to create a tooltip by:
 *    a) Manually calling Tooltip.create( "Some message" );
 *    b) Applying it to all elements with a given root element with a data-tooltip attribute,
 *       by calling Tooltip.apply( rootElement );
 */

define('ui/widget/tooltip', [], function() {
  var __tooltipClass = "butter-tooltip",
      __tooltipOnClass = "tooltip-on",
      __toolTipNoHoverClass = "tooltip-no-hover",
      _registeredTooltips = {},
      ToolTipObj,
      ToolTip;

  function register( tooltip ) {
    _registeredTooltips[ tooltip.name ] = tooltip;
  }

  function isRegistered( name ) {
    return !!_registeredTooltips[ name ];
  }

  // ToolTip Constructor
  ToolTipObj = function( options ) {
    if ( options && options.name && isRegistered( options.name ) ) {
      return;
    }

    var parentElement,
        name,
        message,
        top,
        left,
        error,
        destroyed = false,
        tooltipElement = document.createElement( "div" );

    tooltipElement.classList.add( __tooltipClass );
    tooltipElement.classList.add( options.name );

    Object.defineProperty( this, "message", {
      get: function() {
        return message;
      },
      set: function( newMessage ) {
        if ( newMessage && typeof newMessage === "string" ) {
          message = newMessage;
          tooltipElement.innerHTML = newMessage;
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "hidden", {
      get: function() {
        return !tooltipElement.classList.contains( __tooltipOnClass );
      },
      set: function( hidden ) {
        if ( hidden || hidden === undefined ) {
          tooltipElement.classList.remove( __tooltipOnClass );
        } else {
          tooltipElement.classList.add( __tooltipOnClass );
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "hover", {
      get: function() {
        return !tooltipElement.classList.contains( __toolTipNoHoverClass );
      },
      set: function( hover ) {
        if ( hover || hover === undefined ) {
          tooltipElement.classList.remove( __toolTipNoHoverClass  );
        } else {
          tooltipElement.classList.add( __toolTipNoHoverClass );
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "top", {
      get: function() {
        return top;
      },
      set: function( newTop ) {
        if ( parentElement && newTop && typeof newTop === "string" ) {
          top = newTop;
          tooltipElement.style.top = newTop;
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "left", {
      get: function() {
        return left;
      },
      set: function( newLeft ) {
        if ( parentElement && newLeft && typeof newLeft === "string" ) {
          left = newLeft;
          tooltipElement.style.left = newLeft;
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "tooltipElement", {
      get: function() {
        return tooltipElement;
      },
      enumerable: true
    });

    Object.defineProperty( this, "parent", {
      get: function() {
        return parentElement;
      },
      set: function( newParent ) {
        if ( newParent ) {
          // Parent must be relative or absolute for tooltip to be positioned properly
          if ( [ "absolute", "relative", "fixed" ].indexOf( getComputedStyle( newParent ).getPropertyValue( "position" ) ) === -1 ) {
            newParent.style.position = "relative";
          }

          parentElement = newParent;
          parentElement.appendChild( tooltipElement );
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "name", {
      get: function() {
        return name;
      },
      enumerable: true
    });

    Object.defineProperty( this, "error", {
      get: function() {
        return error;
      },
      set: function( value ) {
        error = !!value;

        if ( error ) {
          tooltipElement.classList.add( "tooltip-error" );
        } else {
          tooltipElement.classList.remove( "tooltip-error" );
        }
      },
      enumerable: true
    });

    Object.defineProperty( this, "destroyed", {
      get: function() {
        return destroyed;
      },
      enumerable: true
    });

    this.destroy = function() {
      if ( !destroyed ) {
        if ( parentElement && tooltipElement.parentNode === parentElement ) {
          parentElement.removeChild( tooltipElement );
        }
        _registeredTooltips[ name ] = undefined;
        destroyed = true;
      }
    };

    this.parent = options.element;
    this.top = options.top || parentElement.getBoundingClientRect().height + "px";
    this.left = options.left || "50%";
    this.message = options.message || parentElement.getAttribute( "data-tooltip" ) || parentElement.getAttribute( "title" ) || "";
    this.hidden = options.hidden;
    this.hover = options.hover;
    this.error = options.error;

    name = options.name;

    if ( name ) {
      register( this );
    }

    return this;
  };

  ToolTip = {
    /**
     * Member: create
     *
     * Creates a tooltip inside a given element, with optional message.
     * Usage:
     * Tooltip.create({
     *  name: "tooltip-name"
     *  element: myParentElement,
     *  message: "This is my message",
     *  top: 14px,
     *  left: 30px,
     *  hidden: true,
     *  hover: true,
     *  error: true
     * });
     */
    create: function( options ) {
      var newToolTip = new ToolTipObj( options );

      return newToolTip.tooltipElement;
    },
    /**
     * Member: apply
     *
     * Creates a tooltip inside all elements of a given root element with data-tooltip attribute
     */
    apply: function( rootElement ) {
      var elements,
          i,
          l;

      rootElement = rootElement || document;
      elements = rootElement.querySelectorAll( "[data-tooltip]" );

      for ( i = 0, l = elements.length; i < l; i++ ) {
        ToolTip.create({
          element: elements[ i ]
        });
      }
    },
    /**
     * Member: get
     *
     * Get a tooltip reference by name
     */
     get: function( title ){
       return _registeredTooltips[ title ];
     }
  };
  return ToolTip;
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Butter Textbox Widget Wrapper
 *
 * A simple input textbox with cross-browser click-to-select functionality.
 * Clicking this textbox will cause the contents to be selected.  The next
 * click will position the cursor.  Getting this to work cross-browser is
 * harder than it should be, especially on Chrome.  See:
 * http://code.google.com/p/chromium/issues/detail?id=4505
 *
 * The textbox manages listeners carefully in order to have mouse clicks
 * do what the user expects.  On creation, `focus` and `mouseup` handlers
 * are added to the element.  When the first `focus` event happens, the
 * contents of the element are selected, and the `focus` handler is removed,
 * so that the next click doesn't re-select.  The `mouseup` event that
 * follows the `focus` click is ignored (needed on WebKit), but subsequent
 * `mouseup` events are processed normally, so the selection can be broken.
 * Once the element receives `blur` the handlers are added back.
 **/

define('ui/widget/textbox', [], function() {

  function __highlight( e ) {
    var input = e.target;
    input.select();
    input.removeEventListener( "focus", __highlight, false );
  }

  function __ignoreMouseUp( e ) {
    e.preventDefault();
    var input = e.target;
    input.removeEventListener( "mouseup", __ignoreMouseUp, false );
  }

  function __addListeners( input ) {
    input.addEventListener( "focus", __highlight, false );
    input.addEventListener( "mouseup", __ignoreMouseUp, false );
  }

  return {
    applyTo: function( input, options ) {
      if ( !(input && (
              input.type === "text" ||
              input.type === "textarea" ||
              input.type === "url" )
           ) ) {
        throw "Textbox: Expected an input element of type text";
      }

      options = options || {};
      input.readOnly = !!options.readOnly;

      input.addEventListener( "blur", function( e ) {
          __addListeners( e.target );
      }, false);

      __addListeners( input );

      return input;
    }
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('editor/base-editor', [ "core/eventmanager", "util/scrollbars", "ui/widget/tooltip", "ui/widget/textbox" ],
  function( EventManager, Scrollbars, ToolTip, TextboxWrapper ) {

  /**
   * Class: BaseEditor
   *
   * Extends a given object to be a BaseEditor, giving it rudamentary editor capabilities
   *
   * @param {Object} extendObject: Object to be extended to become a BaseEditor
   * @param {Butter} butter: An instance of Butter
   * @param {DOMElement} rootElement: The root element to which the editor's content will be attached
   * @param {Object} events: Events such as 'open' and 'close' can be defined on this object to be called at the appropriate times
   */
  function BaseEditor( extendObject, butter, rootElement, events ) {

    EventManager.extend( extendObject );

    extendObject.butter = butter;
    extendObject.rootElement = rootElement;
    extendObject.parentElement = null;

    // Used when applyExtraHeadTags is called -- see below
    var _extraStyleTags = [],
        _extraLinkTags = [];

    /**
     * Member: open
     *
     * Opens the editor
     *
     * @param {DOMElement} parentElement: The element to which the editor's root will be attached
     */
    extendObject.open = function( parentElement ) {

      extendObject.parentElement = parentElement;

      // Attach the editor's root element to the given parentElement.
      // Do this before calling the open event so that element size and structure are defined.
      extendObject.parentElement.appendChild( extendObject.rootElement );

      // Update scrollbars, add one automatically if an allow-scrollbar class is added
      // See .addScrollbar for manual settings
      if ( extendObject.scrollbar ) {
        extendObject.scrollbar.update();
      } else if ( extendObject.rootElement.classList.contains( "allow-scrollbar" ) ) {
        extendObject.addScrollbar();
      }

      // If an open event existed on the events object passed into the constructor, call it
      if ( events.open ) {
        events.open.apply( extendObject, arguments );
      }

      // Add tooltips
      extendObject.addTooltips();

      extendObject.dispatch( "open" );
    };

    /**
     * Member: close
     *
     * Closes the editor
     */
    extendObject.close = function() {
      // Remove the editor's root element from the element to which it was attached
      extendObject.rootElement.parentNode.removeChild( extendObject.rootElement );

      // If a close event existed on the events object passed into the constructor, call it
      if ( events.close ) {
        events.close.apply( extendObject, arguments );
      }

      extendObject.dispatch( "closed" );
    };

    /**
     * Member: applyExtraHeadTags
     *
     * If a tag that belongs in the <head> is present in the given layout, place it in the document's head.
     *
     * @param {DOMFragment} layout: DOMFragment containing the style tag
     */
    extendObject.applyExtraHeadTags = function( layout ) {
      var linkNodes = layout.querySelectorAll( "link" ),
          styleNodes = layout.querySelectorAll( "style" ),
          x;

      for ( x = 0; x < linkNodes.length; x++ ) {
        _extraLinkTags[ x ] = linkNodes[ x ];
        document.head.appendChild( _extraLinkTags[ x ] );
      }

      for ( x = 0; x < styleNodes.length; x++ ) {
        _extraStyleTags[ x ] = styleNodes[ x ];
        document.head.appendChild( _extraStyleTags[ x ] );
      }
    };

    /**
     * Member: addScrollbar
     *
     * Creates a scrollbar with the following options:
     *    outer:      The outer containing element. ( optional. Default = inner.ParentNode )
     *    inner:      The inner element with the scrollable content.
     *    container:  The element to append the scrollbar to.
     */
    extendObject.addScrollbar = function( options ) {
      var innerDefault = extendObject.rootElement.querySelector( ".scrollbar-inner" );

      options = options || innerDefault && {
        inner: innerDefault,
        outer: extendObject.rootElement.querySelector( ".scrollbar-outer" ) || innerDefault.parentNode,
        appendTo: extendObject.rootElement.querySelector( ".scrollbar-container" ) || extendObject.rootElement
      };

      if ( !options ) {
        return;
      }

      extendObject.scrollbar = new Scrollbars.Vertical( options.outer, options.inner );
      options.appendTo.appendChild( extendObject.scrollbar.element );

      extendObject.scrollbar.update();

      return extendObject.scrollBar;
    };

    /**
    * Member: addTooltips
    *
    * Add tooltips to all elements marked data-tooltip
    */
    extendObject.addTooltips = function()  {
      ToolTip.apply( extendObject.rootElement );
    };

    /**
    * Member: createTooltip
    *
    * Create a tooltip that can be used in any editor.
    *
    * @param {DOMElement} element: The element that is being listened to.
    * @param {Object} options: Configuration options for the tooltip. These include:
    *                   name: The name of the Tooltip.
    *                   element: The element that the Tooltip bases it's positioning around.
    *                   message: The message that's displayed to users.
    *                   top: The CSS top position of the Tooltip in relation to element.
    *                   left: The CSS left position of the Tooltip in relation to element.
    *                   hidden: The Tooltips initial visibility state.
    *                   hover: Triggers if the tooltip displays on hover of element.
    */
    extendObject.createTooltip = function( element, options )  {
      var tooltip;

      if ( options && options.name ) {
        ToolTip.create( options );

        tooltip = ToolTip.get( options.name );

        element.addEventListener( "focus", function() {
          tooltip.hidden = false;
        }, false );
        element.addEventListener( "blur", function() {
          tooltip.hidden = true;
        }, false );
      }
    };

    /**
     * Member: removeExtraHeadTags
     *
     * Remove all extra style/link tags that have been added to the document head.
     */
    extendObject.removeExtraHeadTags = function() {
      var x;

      for ( x = 0; x < _extraLinkTags.length; x++ ) {
        document.head.removeChild( _extraLinkTags[ x ] );
      }
      _extraLinkTags = [];

      for ( x = 0; x < _extraStyleTags.length; x++ ) {
        document.head.removeChild( _extraStyleTags[ x ] );
      }
      _extraStyleTags = [];
    };

    /**
     * Member: wrapTextInputElement
     *
     * Force element to auto select the text of the element upon click.
     *
     * @param {DOMElement} element: Element that will be wrapped
     * @param {Object} options: options that can be provided to customize functionality
     *                   readOnly: Force input element to be read-only.
     */
    extendObject.wrapTextInputElement = function( element, options ) {
      return TextboxWrapper.applyTo( element, options );
    };

    window.addEventListener( "resize", function() {
      if ( extendObject.scrollbar ) {
        extendObject.scrollbar.update();
      }
    }, false );

  }

  return {
    extend: BaseEditor
  };

});

define('util/keys', [], function() {

  return {

    DELETE:     8,
    TAB:        9,
    ENTER:      13,

    ESCAPE:     27,

    SPACE:      32,

    LEFT:       37,
    UP:         38,
    RIGHT:      39,
    DOWN:       40,

    0:          48,
    1:          49,
    2:          50,
    3:          51,
    4:          52,
    5:          53,
    6:          54,
    7:          55,
    8:          56,
    9:          57,

    A:          65,
    B:          66,
    C:          67,
    D:          68,
    E:          69,
    F:          70,
    G:          71,
    H:          72,
    I:          73,
    J:          74,
    K:          75,
    L:          76,
    M:          77,
    N:          78,
    O:          79,
    P:          80,
    Q:          81,
    R:          82,
    S:          83,
    T:          84,
    U:          85,
    V:          86,
    W:          87,
    X:          88,
    Y:          89,
    Z:          90,

    EQUALS:     187,
    MINUS:      189

  };

});

define('text!layouts/trackevent-editor-defaults.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="trackevent-warning">\n  <strong>Warning:</strong> <span class="trackevent-warning-message"></span>\n</div>\n\n<fieldset class="trackevent-property default input">\n  <label class="property-name"></label>\n  <input class="value" type="text" />\n</fieldset>\n\n<fieldset class="trackevent-property default input units">\n  <label class="property-name"></label>\n  <div class="butter-form-append">\n    <input class="value" type="text" />\n    <span class="butter-unit"></span>\n  </div>\n</fieldset>\n\n<fieldset class="trackevent-property default input checkbox">\n  <label class="butter-form-checkbox">\n    <input class="value" type="text" />\n    <span class="property-name"></span>\n  </label>\n</fieldset>\n\n<fieldset class="trackevent-property select">\n  <label class="property-name"></label>\n  <select>\n  </select>\n</fieldset>\n\n<fieldset class="trackevent-property targets">\n  <label class="property-name">Target</label>\n  <select data-manifest-key="target">\n    <option class="default-target-option" value="Media Element">Media Element</option>\n  </select>\n</fieldset>\n\n<fieldset class="trackevent-property textarea">\n  <label class="property-name"></label>\n  <textarea class="value"></textarea>\n</fieldset>\n\n<fieldset class="trackevent-property checkbox-group">\n  <div class="checkbox-group">\n    <label class="property-name"></label>\n    <input type="checkbox" class="value" />\n  </div>\n</fieldset>\n\n<fieldset class="butter-form-inline form-half start-end">\n  <div class="butter-form-append">\n    <label class="property-name">Start</label>\n    <input type="text" class="value" data-manifest-key="start">\n    <span class="butter-unit">seconds</span>\n  </div>\n  <div class="butter-form-append">\n    <label class="property-name">End</label>\n    <input type="text" class="value" data-manifest-key="end">\n    <span class="butter-unit">seconds</span>\n  </div>\n</fieldset>\n\n<!-- For createBreadcrumbs -->\n<div class="butter-breadcrumbs">\n  <a class="butter-breadcrumbs-back">Events</a>\n  <span class="butter-editor-title">Event</span>\n  <a class="close-btn"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('editor/trackevent-editor',[ "util/lang", "util/keys", "util/time", "./base-editor", "ui/widget/tooltip",
          "text!layouts/trackevent-editor-defaults.html" ],
  function( LangUtils, KeysUtils, TimeUtils, BaseEditor, ToolTip,
            DEFAULT_LAYOUT_SNIPPETS ) {

  var NULL_FUNCTION = function(){};

  var __defaultLayouts = LangUtils.domFragment( DEFAULT_LAYOUT_SNIPPETS ),
      __googleFonts = [
        "Gentium Book Basic",
        "Lato",
        "Vollkorn",
        "Merriweather",
        "Gravitas One",
        "PT Sans",
        "Open Sans",
        "Bangers",
        "Fredoka One",
        "Covered By Your Grace",
        "Coda"
      ],
      __colorHexCodes = {
        "black": "#000000",
        "silver": "#c0c0c0",
        "gray": "#808080",
        "white": "#ffffff",
        "maroon": "#800000",
        "red": "#ff00000",
        "purple": "#800080",
        "fuchsia": "#ff00ff",
        "green": "#008000",
        "lime": "#00ff00",
        "olive": "#808000",
        "yellow": "#ffff00",
        "navy": "#000080",
        "blue": "#0000ff",
        "teal": "#008080",
        "aqua": "#00ffff"
      };

  /**
   * Class: TrackEventEditor
   *
   * Extends a given object to be a TrackEvent editor, giving it capabilities to work with TrackEvents
   *
   * @param {Object} extendObject: Object to be extended to become a TrackEvent editor
   * @param {Butter} butter: An instance of Butter
   * @param {DOMElement} rootElement: The root element to which the editor's content will be attached
   * @param {Object} events: Events such as 'open' and 'close' can be defined on this object to be called at the appropriate times
   */
  function TrackEventEditor( extendObject, butter, rootElement, events ) {
    // Wedge a check for scrollbars into the open event if it exists
    var _oldOpenEvent = events.open,
        _trackEventUpdateErrorCallback = NULL_FUNCTION,
        _errorMessageContainer,
        _trackEvent;

    events.open = function( parentElement, trackEvent ) {
      var basicButton = rootElement.querySelector( ".basic-tab" ),
          advancedButton = rootElement.querySelector( ".advanced-tab" ),
          basicTab = rootElement.querySelector( ".editor-options" ),
          advancedTab = rootElement.querySelector( ".advanced-options" ),
          wrapper = rootElement.querySelector( ".scrollbar-outer" );

      if ( !_errorMessageContainer && rootElement ) {
        _errorMessageContainer = rootElement.querySelector( "div.error-message" );
      }

      _trackEvent = trackEvent;

      if ( _oldOpenEvent ) {
        _oldOpenEvent.apply( this, arguments );
      }
      // Code for handling basic/advanced options tabs are going to be the same. If the user defined these buttons
      // handle it for them here rather than force them to write the code in their editor
      if ( basicButton && advancedButton ) {
        basicButton.addEventListener( "mouseup", function() {
          if ( basicTab.classList.contains( "display-off" ) ) {
            basicTab.classList.toggle( "display-off" );
            advancedTab.classList.toggle( "display-off" );
            basicButton.classList.add( "butter-active" );
            advancedButton.classList.remove( "butter-active" );
            extendObject.scrollbar.update();
          }
        });

        advancedButton.addEventListener( "mouseup", function() {
          if ( !basicTab.classList.contains( "display-off" ) ) {
            basicTab.classList.toggle( "display-off" );
            advancedTab.classList.toggle( "display-off" );
            basicButton.classList.remove( "butter-active" );
            advancedButton.classList.add( "butter-active" );
            extendObject.scrollbar.update();
          }
        });

        // Override default scrollbar to account for both tab containers
        extendObject.addScrollbar({
          inner: wrapper,
          outer: wrapper,
          appendTo: rootElement.querySelector( ".scrollbar-container" )
        });
      }

      if ( extendObject.scrollbar ) {
        extendObject.scrollbar.update();
      }

      extendObject.showPluginPreview( trackEvent );

    };

    BaseEditor.extend( extendObject, butter, rootElement, events );

    extendObject.defaultLayouts = __defaultLayouts.cloneNode( true );

    /**
     * Member: setErrorState
     *
     * Sets the error state of the editor, making an error message visible.
     *
     * @param {String} message: Error message to display.
     */
    extendObject.setErrorState = function( message ) {
      if ( message && _errorMessageContainer ) {
        _errorMessageContainer.innerHTML = message;
        _errorMessageContainer.parentNode.style.height = _errorMessageContainer.offsetHeight + "px";
        _errorMessageContainer.parentNode.style.visibility = "visible";
        _errorMessageContainer.parentNode.classList.add( "open" );
      }
      else {
        _errorMessageContainer.innerHTML = "";
        _errorMessageContainer.parentNode.style.height = "";
        _errorMessageContainer.parentNode.style.visibility = "";
        _errorMessageContainer.parentNode.classList.remove( "open" );
      }
    };

    extendObject.setErrorMessageContainer = function( messageContainer ) {
      _errorMessageContainer = messageContainer;
    };

    /**
     * Member: setTrackEventUpdateErrorCallback
     *
     * Stores a callback which is called when a trackevent update error occurs.
     *
     * @param {Function} errorCallback: Callback which is called upon error.
     */
    extendObject.setTrackEventUpdateErrorCallback = function( errorCallback ) {
      _trackEventUpdateErrorCallback = errorCallback || NULL_FUNCTION;
    };

    /**
     * Member: updateTrackEventSafe
     *
     * Attempt to update the properties of a TrackEvent; call _trackEventUpdateErrorCallback if a failure occurs.
     *
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {Object} properties: TrackEvent properties to update
     */
    extendObject.updateTrackEventSafe = function( trackEvent, properties ) {
      if ( properties.hasOwnProperty( "start" ) ) {
        if ( properties.start < 0 ) {
          properties.start = 0;
        }
      }
      if ( properties.hasOwnProperty( "end" ) ) {
        if ( properties.end > butter.duration ) {
          properties.end = butter.duration;
        }
      }
      try {
        trackEvent.update( properties );
      }
      catch ( e ) {
        _trackEventUpdateErrorCallback( e.toString() );
      }
    };

    extendObject.createBreadcrumbs = function( trackEvent ) {
      var oldTitleEl = rootElement.querySelector( "h1" ),
          breadcrumbsLayout = extendObject.defaultLayouts.querySelector( ".butter-breadcrumbs" ),
          backLink = breadcrumbsLayout.querySelector( ".butter-breadcrumbs-back" ),
          editorTitle =  breadcrumbsLayout.querySelector( ".butter-editor-title" ),
          closeEditorLink =  breadcrumbsLayout.querySelector( ".close-btn" ),
          pluginName = trackEvent.manifest.displayName || trackEvent.type;

      if ( !trackEvent || !oldTitleEl ) {
        return;
      }

      closeEditorLink.addEventListener( "click", function() {
        extendObject.dispatch( "back" );
      }, false );

      backLink.addEventListener( "click", function() {
        extendObject.dispatch( "back" );
      }, false );

      if ( trackEvent.type ) {
        editorTitle.innerHTML = "";
        editorTitle.appendChild( document.createTextNode( pluginName ) );
      }

      oldTitleEl.parentNode.replaceChild( breadcrumbsLayout, oldTitleEl );
    };

    /**
     * Member: createTargetsList
     *
     * Creates a list of targets in a <select>, including one specifically for "Media Element"
     */
    extendObject.createTargetsList = function( targets ) {
      var propertyRootElement = __defaultLayouts.querySelector( ".trackevent-property.targets" ).cloneNode( true ),
          selectElement = propertyRootElement.querySelector( "select" ),
          mediaOptionElement = selectElement.firstChild,
          optionElement;

      // Create one <option> per target
      for ( var i = 1; i < targets.length; ++i ) {
        optionElement = document.createElement( "option" );
        optionElement.value = targets[ i ].element.id;
        optionElement.innerHTML = targets[ i ].element.id;

        // If the default target <option> (for Media Element) exists, place them before it
        if ( mediaOptionElement ) {
          selectElement.insertBefore( optionElement, mediaOptionElement );
        }
        else {
          selectElement.appendChild( optionElement );
        }
      }

      return propertyRootElement;
    };

    extendObject.showPluginPreview = function( trackEvent ) {
      var startTime = trackEvent.popcornOptions.start,
          endTime = trackEvent.popcornOptions.end,
          currentTime = butter.currentTime,
          accuracy = startTime * Math.pow( 10, TimeUtils.timeAccuracy - 1 );

      if ( currentTime < startTime || currentTime > endTime ) {
        // Account for accuracy
        butter.currentTime = startTime === 0 ? startTime : Math.ceil( startTime * accuracy ) / accuracy;
      }
    };

    /**
     * Member: attachSelectChangeHandler
     *
     * Attaches a handler to the change event from a <select> element and updates the TrackEvent corresponding to the given property name
     *
     * @param {DOMElement} element: Element to which handler is attached
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {String} propertyName: Name of property to update when change is detected
     */
    extendObject.attachSelectChangeHandler = function( element, trackEvent, propertyName ) {
      element.addEventListener( "change", function() {
        var updateOptions = {};
        updateOptions[ propertyName ] = element.value;
        trackEvent.update( updateOptions );

        // Attempt to make the trackEvent's target blink
        var target = extendObject.butter.getTargetByType( "elementID", trackEvent.popcornOptions.target );
        if( target ) {
          target.view.blink();
        }
        else {
          extendObject.butter.currentMedia.view.blink();
        }
      }, false );
    };

    extendObject.attachColorChangeHandler = function( element, trackEvent, propertyName, callback ) {
      element.addEventListener( "change", function() {
        var value = element.value,
            message,
            updateOptions = {},
            i,
            flag = true;

        if ( value.indexOf( "#" ) === -1 ) {

          for ( i in __colorHexCodes ) {
            if ( __colorHexCodes.hasOwnProperty( i ) ) {
              if ( i === value.toLowerCase() ) {
                flag = false;
                break;
              }
            }
          }

          if ( flag ) {

            message = "Invalid Color update. Must start with a hex (#) or be one of the following: ";
            for ( i in __colorHexCodes ) {
              if ( __colorHexCodes.hasOwnProperty( i ) ) {
                message += i + ", ";
              }
            }

            message = message.substring( 0, message.lastIndexOf( "," ) ) + ".";
          }
        } else {
          if ( !value.match( /^#(?:[0-9a-fA-F]{3}){1,2}$/ ) ) {
            message = "Invalid Hex Color format. Must be a hash (#) followed by 3 or 6 digits/letters.";
          }
        }

        updateOptions[ propertyName ] = value;
        if ( callback ) {
          callback( trackEvent, updateOptions, message, propertyName );
        } else {
          trackEvent.update( updateOptions );
        }
      }, false );
    };

    /**
     * Member: attachSecondsChangeHandler
     *
     * Attaches handlers to an element (likely an <input>) and updates the TrackEvent corresponding to the given property name.
     * Special consideration is given to properties like "start" and "end" that can't be blank.
     *
     * @param {DOMElement} element: Element to which handler is attached
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {String} propertyName: Name of property to update when change is detected
     * @param {Function} callback: Called when update is ready to occur
     */
    extendObject.attachSecondsChangeHandler = function( element, trackEvent, propertyName, callback ) {
      element.addEventListener( "blur", function() {
        var updateOptions = {};
        updateOptions[ propertyName ] = TimeUtils.toSeconds( element.value );
        callback( trackEvent, updateOptions );
      }, false );

      element.addEventListener( "change", function() {
        var updateOptions = {};
        updateOptions[ propertyName ] = TimeUtils.toSeconds( element.value );
        callback( trackEvent, updateOptions );
      }, false );
    };

    /**
     * Member: attachCheckboxChangeHandler
     *
     * Attaches handlers to a checkbox element and updates the TrackEvent corresponding to the given property name
     *
     * @param {DOMElement} element: Element to which handler is attached
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {String} propertyName: Name of property to update when change is detected
     */
    extendObject.attachCheckboxChangeHandler = function( element, trackEvent, propertyName, callBack ) {
      callBack = callBack || function( trackEvent, updateOptions ) {
        trackEvent.update( updateOptions );
      };
      element.addEventListener( "click", function() {
        var updateOptions = {};
        updateOptions[ propertyName ] = element.checked;
        callBack( trackEvent, updateOptions, propertyName );
      }, false );
    };

    /**
     * Member: attachCheckboxGroupChangeHandler
     *
     * Attaches handlers to a checkbox element and updates the TrackEvent corresponding to the given property name
     *
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {String} propertyName: Name of property to update when change is detected
     */
    function attachCheckboxGroupChangeHandler( element, trackEvent, propertyName ) {
      element.addEventListener( "click", function() {
        var updateOption = {},
            updateOptions = {},
            i,
            labels = trackEvent.manifest.options[ propertyName ].labels,
            currentElement;

        // Add in the rest
        for ( i in labels ) {
          if ( labels.hasOwnProperty( i ) ) {
            currentElement = extendObject.rootElement.querySelector( "[data-manifest-key='" + i + "']" );
            updateOptions[ i ] = currentElement.checked;
          }
        }

        updateOption[ propertyName ] = updateOptions;

        trackEvent.update( updateOption );
      }, false );
    }

    /**
     * Member: attachInputChangeHandler
     *
     * Attaches handlers to a checkbox element and updates the TrackEvent corresponding to the given property name
     *
     * @param {DOMElement} element: Element to which handler is attached
     * @param {TrackEvent} trackEvent: TrackEvent to update
     * @param {String} propertyName: Name of property to update when change is detected
     * @param {Function} callback: OPTIONAL - Called when update is ready to occur
     */
     extendObject.attachInputChangeHandler = function( element, trackEvent, propertyName, callback ) {

      function updateTrackEvent( trackEvent, callback, updateOptions ) {
        if ( callback ) {
          callback( trackEvent, updateOptions );
        } else {
          trackEvent.update( updateOptions );
        }
      }

      // ignoreBlur cuts down on unnecessary calls to a track event's update method
      var ignoreBlur,
          ignoreChange,
          tooltipName,
          tooltip,
          manifestType,
          isNumber;

      if ( trackEvent.popcornTrackEvent ) {
        manifestType = trackEvent.popcornTrackEvent._natives.manifest.options[ propertyName ].type;
      }

      isNumber = manifestType === "number" ? true : false;

      function validateNumber( val ) {
        var popcornOptions = trackEvent.popcornOptions;

        // Not so pretty looking workaround for Firefox not implementing input type=number
        if ( isNaN( val ) || val === "" ) {
          val = popcornOptions[ propertyName ];
        }
        return val;
      }

      element.addEventListener( "blur", function() {
        var val = element.value;

        if ( ignoreBlur ) {
          ignoreBlur = false;
        } else {
          var updateOptions = {};

          if ( isNumber ) {
            val = validateNumber( val );
          }

          updateOptions[ propertyName ] = val;
          updateTrackEvent( trackEvent, callback, updateOptions );
        }
        if ( tooltip ) {
          tooltip.hidden = true;
        }
      }, false );

      element.addEventListener( "keypress", function( e ) {
        var updateOptions = {},
            val = element.value;

        if ( e.keyCode === KeysUtils.ENTER ) {
          if ( !e.shiftKey ) {
            e.preventDefault();
            
            if ( isNumber ) {
              val = validateNumber( val );
            }

            updateOptions[ propertyName ] = val;
            updateTrackEvent( trackEvent, callback, updateOptions );
            ignoreBlur = true;
            ignoreChange = true;
            element.blur();
          }
        }
      }, false );

      if ( element.type === "number" || isNumber ) {
        element.addEventListener( "change", function() {

          var updateOptions = {},
              val = element.value;

          if ( ignoreChange ) {
            ignoreChange = false;
          } else {

            ignoreBlur = true;

            val = validateNumber( val );

            updateOptions[ propertyName ] = val;
            updateTrackEvent( trackEvent, callback, updateOptions );
          }
        }, false );
      }

      if ( element.type === "textarea" ) {
        tooltipName = "shift-enter-tooltip-" + Date.now();

        extendObject.createTooltip( element, {
          name: tooltipName,
          element: element.parentElement,
          message: "Press Shift+Enter for a new line.",
          top: "105%",
          left: "50%",
          hidden: true,
          hover: false
        });
      }
    };

    extendObject.createStartEndInputs = function( trackEvent, callback ) {
      var editorElement = __defaultLayouts.querySelector( ".start-end" ).cloneNode( true ),
          start = editorElement.querySelector( "input[data-manifest-key='start']" ),
          end = editorElement.querySelector( "input[data-manifest-key='end']" );

      extendObject.attachSecondsChangeHandler( start, trackEvent, "start", callback );
      extendObject.attachSecondsChangeHandler( end, trackEvent, "end", callback );

      return editorElement;
    };

    /**
     * Member: createManifestItem
     *
     * Creates an element according to the manifest of the TrackEvent
     *
     * @param {String} name: Name of the manifest item to represent
     * @param {Object} manifestEntry: The manifest entry from a Popcorn plugin
     * @param {*} data: Initial data to insert in the created element
     * @param {TrackEvent} trackEvent: TrackEvent to which handlers will be attached
     * @param {Function} itemCallback: Optional. Called for each item, for the user to add functionality after creation
     */
    extendObject.createManifestItem = function( name, manifestEntry, data, trackEvent, itemCallback ) {
      var elem = manifestEntry.elem || "default",
          itemLabel = manifestEntry.label || name,
          isStartOrEnd = [ "start", "end" ].indexOf( name.toLowerCase() ) > -1,
          units = manifestEntry.units || ( isStartOrEnd ? "seconds" : "" ),
          propertyArchetypeSelector,
          propertyArchetype,
          editorElement,
          option,
          manifestEntryOption,
          i, l;

      // Get the right property archetype
      propertyArchetypeSelector = ".trackevent-property." + elem;
      if ( units ) {
        propertyArchetypeSelector += ".units";
      }
      if ( manifestEntry.type === "checkbox" ) {
        propertyArchetypeSelector += ".checkbox";
      }
      if ( manifestEntry.type === "radio" ) {
        propertyArchetypeSelector += ".radio";
      }

      propertyArchetype = __defaultLayouts.querySelector( propertyArchetypeSelector ).cloneNode( true );

      // If the manifestEntry was specified to be hidden bail early
      if ( manifestEntry.hidden ) {
        return;
      }

      // only populate if this is an input element that has associated units
      if ( units ) {
        propertyArchetype.querySelector( ".butter-unit" ).innerHTML = units;
      }

      // Grab the element with class 'property-name' to supply the archetype for new manifest entries
      if ( propertyArchetype.querySelector( ".property-name" ) ) {
        propertyArchetype.querySelector( ".property-name" ).innerHTML = itemLabel;
      }

      // If the manifest's 'elem' property is 'select', create a <select> element. Otherwise, create an
      // <input>.
      if ( manifestEntry.elem === "select" ) {
        editorElement = propertyArchetype.querySelector( "select" );

        // data-manifest-key is used to update this property later on
        editorElement.setAttribute( "data-manifest-key", name );

        if ( manifestEntry.options ) {
          for ( i = 0, l = manifestEntry.options.length; i < l; ++i ){
            option = document.createElement( "option" );
            manifestEntryOption = manifestEntry.options[ i ];

            // if the manifest has values for options, use the options as labels
            // and the values as values for the <option> elements
            if ( manifestEntry.values && manifestEntry.values[ i ] ) {
              option.innerHTML = manifestEntryOption;
              option.value = manifestEntry.values[ i ];
            }
            else {
              option.value = option.innerHTML = manifestEntryOption;
            }

            editorElement.appendChild( option );
          }
        }
        else if ( manifestEntry.googleFonts && __googleFonts ) {
          var font,
              m,
              fLen;

          __googleFonts = __googleFonts.sort();

          for ( m = 0, fLen = __googleFonts.length; m < fLen; m++ ) {
            font = document.createElement( "option" );

            font.value = font.innerHTML = __googleFonts[ m ];
            editorElement.appendChild( font );
          }
        }
      }
      else if ( manifestEntry.elem === "textarea" ) {
        editorElement = propertyArchetype.querySelector( "textarea" );

        // data-manifest-key is used to update this property later on
        editorElement.setAttribute( "data-manifest-key", name );

        if ( data ) {
          // Don't print "undefined" or the like
          if ( data === undefined || typeof data === "object" ) {
            data = "";
          }
          editorElement.value = data;
        }

      }
      else if ( manifestEntry.elem === "checkbox-group" ) {
        var item,
            elementParent = propertyArchetype,
            checkbox,
            label;

        editorElement = propertyArchetype.querySelector( ".checkbox-group" ).cloneNode( true );

        // Remove originally defined element
        elementParent.removeChild( elementParent.querySelector( "div" ) );

        for ( item in manifestEntry.labels ) {
          if ( manifestEntry.labels.hasOwnProperty( item ) ) {
            checkbox = editorElement.querySelector( ".value" );
            label = editorElement.querySelector( ".property-name" );

            attachCheckboxGroupChangeHandler( checkbox, trackEvent, name );

            label.innerHTML = manifestEntry.labels[ item ];
            checkbox.value = manifestEntry.default[ item ];
            checkbox.setAttribute( "data-manifest-key", item );

            elementParent.appendChild( editorElement );
            editorElement = propertyArchetype.querySelector( ".checkbox-group" ).cloneNode( true );
          }
        }
      }
      else {
        editorElement = propertyArchetype.querySelector( "input" );
        if ( data ) {
          // Don't print "undefined" or the like
          if ( data === undefined || typeof data === "object" ) {
            data = manifestEntry.type === "number" ? 0 : "";
          }
          editorElement.placeholder = editorElement.value = data;
        }
        try {
          editorElement.type = manifestEntry.type;
        }
        catch ( e ) {
          // Suppress IE9 errors
        }
        // data-manifest-key is used to update this property later on
        editorElement.setAttribute( "data-manifest-key", name );

      }

      if ( itemCallback ) {
        itemCallback( manifestEntry.elem, editorElement, trackEvent, name );
      }

      return propertyArchetype;
    };

    /**
     * Member: updatePropertiesFromManifest
     *
     * Updates TrackEvent properties visible in the editor with respect to the TrackEvent's manifest
     *
     * @param {TrackEvent} trackEvent: TrackEvent which supplies the manifest and property updates
     */
    extendObject.updatePropertiesFromManifest = function ( trackEvent, manifestKeys, forceTarget ) {
      var element,
          popcornOptions = trackEvent.popcornOptions,
          manifestOptions = trackEvent.manifest.options,
          option,
          units,
          i, l;

      manifestKeys = manifestKeys || Object.keys( manifestOptions );

      if ( forceTarget && manifestKeys.indexOf( "target" ) === -1 ) {
        manifestKeys = manifestKeys.concat( "target" );
      }

      for ( i = 0, l = manifestKeys.length; i < l; ++i ) {
        option = manifestKeys[ i ];
        if ( manifestOptions[ option ] ) {
          units = manifestOptions[ option ].units;
        }

        // Look for the element with the correct manifest-key which was attached to an element during creation of the editor
        element = extendObject.rootElement.querySelector( "[data-manifest-key='" + option + "']" );

        if ( element ) {
          // Checkbox elements need to be treated specially to manipulate the 'checked' property
          if ( element.type === "checkbox" ) {
            element.checked = popcornOptions[ option ];
          }
          else {
            if ( typeof popcornOptions[ option ] !== "undefined" ) {
              if ( units === "seconds" ) {
                element.value = TimeUtils.toTimecode( popcornOptions[ option ] );
              } else {
                element.value = popcornOptions[ option ];
              }
            } else {
              element.value = manifestOptions[ option ].default || "";
            }
          }
        }
        else if ( manifestOptions[ option ] && manifestOptions[ option ].elem === "checkbox-group" ) {
          var m,
              labels = manifestOptions[ option ].labels,
              popcornOption = popcornOptions[ option ];

          for ( m in labels ) {
            if ( labels.hasOwnProperty( m ) ) {
              element = extendObject.rootElement.querySelector( "[data-manifest-key='" + m + "']" );

              if ( typeof popcornOptions[ option ] !== "undefined" ) {
                element.checked = popcornOption[ m ];
              } else {
                element.checked = manifestOptions[ option ].default[ m ];
              }
            }
          }
        }
      }
    };

    /**
     * Member: createPropertiesFromManifest
     *
     * Creates editable elements according to the properties on the manifest of the given TrackEvent
     *
     * @param {options} An object which can expect the following properties:
     *
     *  {TrackEvent} trackEvent: TrackEvent from which manifest will be retrieved
     *  {Function} itemCallback: Callback which is passed to createManifestItem for each element created
     *  {Array} manifestKeys: Optional. If only specific keys are desired from the manifest, use them
     *  {DOMElement} basicContainer: Optional. If specified, elements will be inserted into basicContainer, not rootElement
     *  {DOMElement} advancedContainer: Optional. If specified, elements will be inserted into advancedContainer, not rootElement
     *  {Array} ignoreManifestKeys: Optional. Keys in this array are ignored such that elements for them are not created
     */
    extendObject.createPropertiesFromManifest = function( options ) {
      var manifestOptions,
          item,
          element,
          container,
          optionGroup,
          manifestKeys,
          basicContainer,
          advancedContainer,
          trackEvent = options.trackEvent,
          ignoreManifestKeys = options.ignoreManifestKeys || [],
          i, l;

      basicContainer = options.basicContainer || extendObject.rootElement;
      advancedContainer = options.advancedContainer || extendObject.rootElement;

      if ( !trackEvent.manifest ) {
        throw "Unable to create properties from null manifest. Perhaps trackevent is not initialized properly yet.";
      }

      extendObject.createBreadcrumbs( trackEvent );

      manifestOptions = trackEvent.manifest.options;

      manifestKeys = options.manifestKeys || Object.keys( manifestOptions );

      for ( i = 0, l = manifestKeys.length; i < l; ++i ) {
        item = manifestKeys[ i ];
        optionGroup = manifestOptions[ item ].group ? manifestOptions[ item ].group : "basic";
        container = optionGroup === "advanced" ? advancedContainer : basicContainer;
        if ( ignoreManifestKeys && ignoreManifestKeys.indexOf( item ) > -1 ) {
          continue;
        }
        element = extendObject.createManifestItem( item, manifestOptions[ item ], trackEvent.popcornOptions[ item ], trackEvent,
                                                   options.callback );

        if ( element ) {
          container.appendChild( element );
        }
      }
    };

    extendObject.getTrackEvent = function() {
      return _trackEvent;
    };

  }

  return {
    extend: TrackEventEditor,
    EDITOR_FRAGMENTS: __defaultLayouts
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: Editor
 */
define('editor/editor', [ "util/lang", "util/xhr",
          "./base-editor", "./trackevent-editor" ],
  function( LangUtils, XHRUtils,
            BaseEditor, TrackEventEditor ) {

  var __editors = {};

  function DeferredLayout( src ) {

    this.load = function( baseDir, readyCallback ) {
      baseDir = baseDir || "";
      if ( src.indexOf( "{{baseDir}}" ) > -1 ) {
        src = src.replace( "{{baseDir}}", baseDir );
      }

      XHRUtils.get( src, function( e ) {
        if ( e.target.readyState === 4 ){
          readyCallback( e.target.responseText );
        }
      }, "text/plain" );
    };
 }

  /**
   * Namespace: Editor
   */
  var Editor = {

    BaseEditor: BaseEditor,
    TrackEventEditor: TrackEventEditor,

    /**
     * Function: register
     *
     * Registers an editor in the system.
     *
     * @param {String} name: Name of the editor
     * @param {String} layoutSrc: String representing the basic HTML layout of the editor. May be prepended with "load!" to signify that load must be done after butter is initialized.
     * @param {Function} ctor: Constructor to be run when the Editor is being created
     */
    register: function( name, layoutSrc, ctor, persist ) {
      __editors[ name ] = {
        create: ctor,
        persist: !!persist,
        layout: layoutSrc || "",
        deferredLayouts: []
      };

      function processLayoutEntry( src ) {
        var deferredLayout;
        if ( src.indexOf( "load!" ) === 0 ) {
           deferredLayout = new DeferredLayout( src.substring( 5 ) );
           __editors[ name ].deferredLayouts.push( deferredLayout );
           return true;
        }
        return false;
      }

      if ( layoutSrc ) {
        if ( Array.isArray( layoutSrc ) ) {
          layoutSrc.forEach( processLayoutEntry );
        }
        else {
          if ( processLayoutEntry( layoutSrc ) ) {
            __editors[ name ].layout = "";
          }
        }
      }
    },

    /**
     * Function: initialize
     *
     * Initializes the Editor module.
     *
     * For layouts that were specified as `load!<url>`, replace the url with actual layout content by loading
     * it through XHR. This is useful for editors specified in Butter config files, since using `Butter.Editor`
     * outside of the core will not guarantee that {{baseDir}} properly exists until #1245 has landed:
     *
     * https://webmademovies.lighthouseapp.com/projects/65733/tickets/1245-remove-instances-have-butter-become-a-singleton
     *
     * @param {Function} readyCallback: After all layouts have been loaded, call this function.
     * @param {String} baseDir: The baseDir found in Butter's config which is used to replace {{baseDir}} in urls.
     */
    initialize: function( readyCallback, baseDir ) {
      var editorName,
          editorsLoaded = 0,
          editorsToLoad = [];

      for ( editorName in __editors ) {
        if ( __editors.hasOwnProperty( editorName ) && __editors[ editorName ].deferredLayouts.length > 0 ) {
          editorsToLoad.push( __editors[ editorName ] );
        }
      }

      editorsToLoad.forEach( function( editor ) {
        var finishedLayouts = 0;
        editor.deferredLayouts.forEach( function( deferredLayout ) {
          deferredLayout.load( baseDir, function( layoutData ) {
            ++finishedLayouts;
            editor.layout += layoutData;
            if ( finishedLayouts === editor.deferredLayouts.length ) {
              editor.deferredLayouts = null;
              ++editorsLoaded;
              if ( editorsLoaded === editorsToLoad.length ) {
                readyCallback();
              }
            }
          });
        });
      });
    },

    /**
     * Function: create
     *
     * Creates an editor
     *
     * @param {String} editorName: Name of the editor to create
     * @param {Butter} butter: An instance of Butter
     */
    create: function( editorName, butter ) {
      var description = __editors[ editorName ],
          completeLayout,
          compiledLayout;

      if ( !description ) {
        throw "Editor \"" + editorName + "\" does not exist.";
      }

      if ( description.layout ) {
        // Collect the element labeled with the 'butter-editor' class to avoid other elements (such as comments)
        // which may exist in the layout.
        compiledLayout = LangUtils.domFragment( description.layout );

        // Expose the full compiledLayout to the editor for later use.
        completeLayout = compiledLayout;

        // If domFragment returned a DOMFragment (not an actual element) try to get the proper element out of it
        if ( !compiledLayout.classList ) {
          compiledLayout = compiledLayout.querySelector( ".butter-editor" );
        }

        if ( !compiledLayout ) {
          throw "Editor layout not formatted properly.";
        }
      }

      return new description.create( compiledLayout, butter, completeLayout );
    },

    /**
     * Function: isRegistered
     *
     * Reports the existence of an editor given a name
     *
     * @param {String} name: Name of the editor of which existence will be verified
     */
    isRegistered: function( name ) {
      return !!__editors[ name ];
    },


    isPersistent: function( editorName ) {
      return __editors[ editorName ].persist;
    }

  };

  return Editor;

});

define('text!layouts/plugin-list-editor.html',[],function () { return '<div class="plugin-list-editor butter-editor fadable allow-scrollbar">\n  <h1>Events</h1>\n  <div class="butter-editor-body scrollbar-container">\n    <div class="plugin-container-wrapper">\n      <div class="plugin-container scrollbar-outer scrollbar-inner">\n        <a href="#" draggable="true" class="butter-plugin-tile">\n          <span class="butter-plugin-icon"></span><span class="butter-plugin-label"></span>\n        </a>\n      </div>\n    </div>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('plugin/plugin-list', [ "util/dragndrop", "util/lang", "editor/editor", "text!layouts/plugin-list-editor.html" ],
  function( DragNDrop, LangUtils, Editor, EDITOR_LAYOUT ) {

  return function( butter ) {

    var _parentElement = LangUtils.domFragment( EDITOR_LAYOUT, ".plugin-list-editor" ),
        _containerElement = _parentElement.querySelector( ".plugin-container" ),
        _targets = butter.targets,
        _iframeCovers = [],
        _iframeCover;

    for ( var i = 0, l = _targets.length; i < l; i++ ) {
      _iframeCover = document.createElement( "div" );
      _iframeCover.classList.add( "butter-iframe-fix" );
      _targets[ i ].element.appendChild( _iframeCover );
      _iframeCovers.push( _iframeCover );
    }

    var _pluginArchetype = _containerElement.querySelector( ".butter-plugin-tile" );
    _pluginArchetype.parentNode.removeChild( _pluginArchetype );

    Editor.register( "plugin-list", null, function( rootElement, butter ) {
      rootElement = _parentElement;

      Editor.BaseEditor.extend( this, butter, rootElement, {
        open: function() {
        },
        close: function() {
        }
      });
    }, true );

    butter.listen( "pluginadded", function( e ) {
      var element = _pluginArchetype.cloneNode( true ),
          iconImg = e.data.helper,
          icon = element.querySelector( ".butter-plugin-icon" ),
          text = element.querySelector( ".butter-plugin-label" ),
          pluginName = e.data.name;

      DragNDrop.helper( element, {
        start: function() {
          for ( var i = 0, l = _targets.length; i < l; ++i ) {
            _targets[ i ].view.blink();
            _iframeCovers[ i ].style.display = "block";
          }
        },
        stop: function() {
          butter.currentMedia.pause();
          for ( var i = 0, l = _targets.length; i < l; ++i ) {
            _iframeCovers[ i ].style.display = "none";
          }
        }
      });

      function onDoubleClick() {
        var trackEvent;

        if ( butter.currentMedia.ready ) {
          trackEvent = butter.generateSafeTrackEvent( e.data.type, butter.currentTime );
          butter.editor.editTrackEvent( trackEvent );
        }
      }

      element.addEventListener( "dblclick", onDoubleClick, false );

      if ( iconImg ) {
        icon.style.backgroundImage = "url('" + iconImg.src + "')";
      }

      text.innerHTML = pluginName;

      element.setAttribute( "data-popcorn-plugin-type", e.data.type );
      element.setAttribute( "data-butter-draggable-type", "plugin" );

      if ( e.data.hidden ) {
        element.style.display = "none";
      }

      _containerElement.appendChild( element );
    });

  };
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('plugin/plugin', [], function() {

  return function( pluginOptions ){
    pluginOptions = pluginOptions || {};

    var _this = this,
        _helper;

    this.type = pluginOptions.type;
    this.name = pluginOptions.displayName || pluginOptions.type;
    this.path = pluginOptions.path;
    this.hidden = pluginOptions.hidden;

    this.generateHelper = function() {
      _helper = document.getElementById( _this.type + "-icon" ) || document.getElementById( "default-icon" );
      if( !_helper ) {
        return;
      }
      _helper = _helper.cloneNode( false );
      // Prevent two elements from having the same ID on the page
      _helper.id = null;

      _helper.setAttribute( "data-popcorn-plugin-type", _this.type );
      _helper.setAttribute( "data-butter-draggable-type", "plugin" );
      _this.helper = _helper;

    };

  };
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: PluginModule
 *
 * A Butter module which provides Popcorn plugin support.
 */
define('plugin/module', [ "core/logger", "./plugin-list", "./plugin" ],
  function( Logger, PluginList, Plugin ) {

  /**
   * Class: PluginManager
   *
   * Provides Butter module functionality for Plugins
   *
   * @param {Butter} butter: A butter instance
   * @param {Butter} moduleOptions: Config options passed in when module starts up.
   */
  var PluginManager = function( butter, moduleOptions ) {

    var _plugins = this.plugins = [],
        _pluginList,
        _this = this;

    /**
     * Member: _start
     *
     * Module start function
     *
     * @param {Function} onModuleReady: Callback to signify that this module is ready to run
     */
    this._start = function( onModuleReady ) {
      _pluginList = new PluginList( butter );
      if ( moduleOptions && moduleOptions.plugins ) {
        _this.add( moduleOptions.plugins, onModuleReady );
      }
      else {
        onModuleReady();
      }
    };

    /**
     * Member: generatePluginTypeCheckFunction
     *
     * Generates a check function for the given plugin type specifically for the butter loader to use.
     *
     * @param {String} pluginType: Name of plugin
     */
    function generatePluginTypeCheckFunction( pluginType ) {
      return function(){
        // Does Popcorn know about this plugin type yet?
        return !!Popcorn.manifest[ pluginType ];
      };
    }

    /**
     * Member: add
     *
     * Add a plugin to Butter
     *
     * @param {String or Array} plugins: Plugins to add to the system. If this parameter is an array, each entry will be added separately.
     * @param {Function} onReadyCallback: Callback to call when plugins are finished loading.
     */
    this.add = function( plugins, onReadyCallback ) {
      var newPlugins = [],
          pluginLoadDescriptors = [],
          plugin,
          i,
          l;

      // Try to always use an array for code simplicity
      if ( ! ( plugins instanceof Array ) ) {
        plugins = [ plugins ];
      }

      for ( i = 0, l = plugins.length; i < l; i++ ) {
        plugin = new Plugin( plugins[ i ] );

        // Create a loader descriptor for this plugin type for the Butter loader
        pluginLoadDescriptors.push({
          type: "js",
          url: plugin.path,
          check: generatePluginTypeCheckFunction( plugin.type )
        });

        newPlugins.push( plugin );

        if ( butter.ui.enabled ) {
          plugin.generateHelper();
        }
      }

      butter.loader.load( pluginLoadDescriptors, function() {
        for ( i = 0, l = newPlugins.length; i < l; i++ ) {
          plugin = newPlugins[ i ];
          _plugins.push( plugin );
          butter.dispatch( "pluginadded", plugin );
        }
        onReadyCallback();
      }, function() {
        console.warn( "Failed to load all plugins. Please check logs and file paths." );
      });

      return newPlugins;
    };

    /**
     * Member: remove
     *
     * Remove a plugin from Butter
     *
     * @param {String or Plugin} plugin: Name of plugin or Plugin object to remove
     */
    this.remove = function( plugin ) {
      var trackEvents,
          trackEvent,
          i;

      // If a string was passed in, try to get a Plugin object instead.
      if ( typeof plugin === "string" ) {
        plugin = this.get( plugin );
        if ( !plugin ) {
          // If no plugin was found, we know we don't have to go any further because it's not here!
          return;
        }
      }

      // Remove all trackevents that were using this plugin type
      trackEvents = butter.getTrackEventsByType( plugin.type );
      while ( trackEvents.length ) {
        trackEvent = trackEvents.pop();
        trackEvent.track.removeTrackEvent( trackEvent );
      }

      // Drop reference to plugin object
      i = _plugins.indexOf( plugin );
      if ( i > -1 ) {
        _plugins.splice( i, 1 );
      }

      butter.dispatch( "pluginremoved", plugin );
    };

    /**
     * Member: clear
     *
     * Removes all plugins from Butter.
     */
    this.clear = function() {
      while ( _plugins.length > 0 ) {
        var plugin = _plugins.pop();
        butter.dispatch( "pluginremoved", plugin );
      }
    };

    /**
     * Member: get
     *
     * Returns a plugin object corresponding to the given type.
     *
     * @param {String} type: Name of plugin to retrieve
     */
    this.get = function( type ) {
      for ( var i = 0, l = _plugins.length; i < l; ++i ) {
        if ( _plugins[ i ].type === type ) {
          return _plugins[ i ];
        }
      }
    };

  };

  // Give the module a name so the module loader can act sanely.
  PluginManager.__moduleName = "plugin";

  return PluginManager;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('modules',

  [
    "timeline/module",
    "plugin/module"
  ],
  function(){

  var moduleList = Array.prototype.slice.apply( arguments );

  return function( Butter, butter, config ){

    var modules = [],
        loadedModules = 0,
        readyModules = 0;

    for( var i=0; i<moduleList.length; ++i ){
      var name = moduleList[ i ].__moduleName;
      butter[ name ] = new moduleList[ i ]( butter, config.value( name ), Butter );
      modules.push( butter[ name ] );
    }

    return {
      load: function( onLoaded ){
        function onModuleLoaded(){
          loadedModules++;
          if( loadedModules === modules.length ){
            onLoaded();
          }
        }

        for( var i=0; i<modules.length; ++i ){
          if( modules[ i ]._load ){
            modules[ i ]._load( onModuleLoaded );
          }
          else{
            loadedModules++;
          }
        }

        if( loadedModules === modules.length ){
          onLoaded();
        }
      },
      ready: function( onReady ){
        function onModuleReady(){
          readyModules++;
          if( readyModules === modules.length ){
            onReady();
          }
        }

        for( var i=0; i<modules.length; ++i ){
          if( modules[ i ]._start ){
            modules[ i ]._start( onModuleReady );
          }
          else{
            onModuleReady();
          }
        }
      }
    };

  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('loaders/base-loader', [], function() {

  // Look for variables with alphanumeric symbols, dashes, underscores,
  // and periods, surrounded by curly braces.
  var VAR_REGEX = /\{([\w\-\._]+)\}/;

  // Replaces variables with content from configDirs.
  function __fixUrl( configDirs, url ) {
    var match,
        replacement;

    // Replace {variables}
    while ( VAR_REGEX.test( url ) ) {
      match = VAR_REGEX.exec( url );
      replacement = configDirs[ match[ 1 ] ] || "";
      url = url.replace( match[0], replacement );
    }

    // Replace non-protocol double slashes
    url = url.replace( /([^:])\/\//g, "$1/" );

    return url;
  }

  function BaseLoader( configDirs ) {
    this.configDirs = configDirs;
  }

  BaseLoader.fixUrl = function( url ) {
    return __fixUrl( this.configDirs, url );
  };

  BaseLoader.generateDefaultCheckFunction = function() {
    var index = 0;
    return function(){
      return index++ > 0;
    };
  };

  BaseLoader.DEFAULT_ERROR_FUNCTION = function( e ) {
    if ( e ) {
      console.warn( e.toString() );
    }
  };

  BaseLoader.DEFAULT_LOADED_FUNCTION = function() {};

  return BaseLoader;

});
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('loaders/js-loader', [ "./base-loader" ], function( BaseLoader ) {

  function JSLoader( configDirs ) {
    BaseLoader.call( this, configDirs );
  }

  JSLoader.prototype = Object.create( BaseLoader );
  JSLoader.prototype.constructor = JSLoader;

  JSLoader.prototype.load = function( url, exclude, callback, checkFn, error ) {
    checkFn = checkFn || BaseLoader.generateDefaultCheckFunction();
    error = error || BaseLoader.DEFAULT_ERROR_FUNCTION;
    callback = callback || BaseLoader.DEFAULT_LOADED_FUNCTION;

    url = this.fixUrl( url );

    if ( !checkFn() ) {
      var scriptElement = document.createElement( "script" );
      scriptElement.type = "text/javascript";
      scriptElement.onload = callback;
      scriptElement.onerror = function( e ) {
        // Opera has a bug that will cause it to also fire load after
        // setting it to null to prevent this
        scriptElement.onload = null;

        error( e );
      };
      scriptElement.src = url;
      document.head.appendChild( scriptElement );
    }
    else if ( callback ) {
      callback();
    }
  };

  return JSLoader;

});
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('loaders/css-loader', [ "./base-loader" ], function( BaseLoader ) {

  var CSS_POLL_INTERVAL = 10;
  
  function CSSLoader( configDirs ) {
    BaseLoader.call( this, configDirs );
  }

  CSSLoader.prototype = Object.create( BaseLoader );
  CSSLoader.prototype.constructor = CSSLoader;

  CSSLoader.prototype.load = function( url, exclude, callback, checkFn, error ) {
    var link,
        interval,
        img,
        alreadyFired = false;

    // Run the load function if the link variable hasn't already been initialized.
    // TODO: Come up with a better check.
    checkFn = checkFn || function(){
      return !!link;
    };

    function runCheckFn() {
      if ( alreadyFired ) {
        return;
      }
      alreadyFired = true;
      interval = setInterval( function(){
        if( checkFn() ){
          clearInterval( interval );
          if( callback ){
            callback();
          }
        }
      }, CSS_POLL_INTERVAL );
    }

    url = this.fixUrl( url );

    if ( !checkFn() ) {
      link = document.createElement( "link" );
      link.type = "text/css";
      link.rel = "stylesheet";
      link.onerror = error;
      link.onload = runCheckFn;
      link.href = url;
      document.head.appendChild( link );

      // Crazy image onerror fallback for Safari 5.1.7 on Windows - Bug #2627
      img = document.createElement( "img" );
      img.onerror = runCheckFn;
      img.src = url;
    }
    else if ( callback ) {
      callback();
    }
  };

  return CSSLoader;

});


/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('loaders/load-item', [], function() {

  /**
   * Class: LoadItem
   *
   * Maintains state and executes loading procedures for an individual item specified by
   * url. The loader passed in as an argument is used to execute loading, but this class
   * will make sure callbacks and error-state notification are managed properly.
   *
   * @param {String} type: The type of loader used to load this item. This is used mainly for
   *                       book-keeping, since the loader itself is specified separately.
   * @param {BaseLoader} loader: A BaseLoader object which will execute the loading procedure.
   * @param {String} url: The url to pass to the BaseLoader when loading begins.
   * @param {Boolean} exclude: A variable passed to the BaseLoader to specify an exclusion attribute
   *                           when applicable (e.g. 'data-butter-exclude' on link/script tags).
   * @param {Function} checkFunction: A function passed to the BaseLoader to see if loading needs to
   *                                  occur or if the required assets are already present.
   */
  function LoadItem( type, loader, url, exclude, checkFunction ) {
    var _this = this,
        _error = null,
        _secondaryReadyCallback,
        _secondaryErrorCallback;

    function readyCallback() {
      _secondaryReadyCallback( _this );
    }

    function errorCallback( e ) {
      _error = e;
      _secondaryErrorCallback( _this );
    }

    this.load = function( secondaryReadyCallback, secondaryErrorCallback ) {
      // Store the specified callbacks, but route the loader's ready/error toward
      // ready/errorCallback functions specified above. This way, we can get in
      // between the ready/error states of the loader, and the LoadGroup this item
      // is a part of so that state management is simpler, and loading can progress
      // even when errors are to be reported.
      _secondaryReadyCallback = secondaryReadyCallback;
      _secondaryErrorCallback = secondaryErrorCallback;

      // Execute the loading procedure.
      loader.load( url, exclude, readyCallback, checkFunction, errorCallback );
    };

    Object.defineProperties( this, {
      error: {
        enumerable: true,
        get: function() {
          return _error;
        }
      }
    });
  }

  return LoadItem;
});
/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('loaders/load-group', [ "./load-item" ], function( LoadItem ) {

  /**
   * Class: LoadGroup
   *
   * A LoadGroup is used to load an entire batch of items, notifying its called of individual errors, and total completion.
   * When instantiated, a LoadGroup takes a dictionary of loader to which it refers to load individual items. Items are added
   * with LoadGroup::addItem, and if an item has a type which doesn't appear inside of the loaders dictionary, the item
   * is discarded and will not load; a warning is displayed on the console instead.
   *
   * errorCallback is called for *every* error that occurs, but the group is not halted. readyCallback is called when each
   * item has either finished loading, or reported an error state.
   *
   * @param {Dictionary} loaders: A dictionary of loaders which are used to execute loading for individual items.
   * @param {Function} readyCallback: Callback to use when all items are ready (with errors or otherwise).
   * @param {Function} errorCallback: Callback used each time an error is detected in the execution of a load.
   * @param {Boolean} ordered: If true, items are loaded in order, on after another in the order they were added.
   *                           Otherwise, loading order is not guaranteed at all.
   */
  function LoadGroup( loaders, readyCallback, errorCallback, ordered ) {
    var _this = this,
        _items = [],
        _loaders = loaders,
        _loadStarted = false,
        _erroneousItems = [],
        _successfulItems = [];

    /**
     * Member: addItem
     *
     * Adds an item to be loaded as a part of this LoadGroup.
     *
     * @param {Object} item: Item description to be loaded by this LoadGroup. The attributes on this object are used to
     *                       construct a LoadItem object with a specific type. If no loader exists of the specified type
     *                       the item is ignored and a warning is printed.
     */
    this.addItem = function( item ) {
      if ( !item.type ) {
        console.warn( "Loader description requires a type." );
        return;
      }

      if ( !item.url ) {
        console.warn( "Loader description requires a url." );
        return;
      }

      if ( !_loaders[ item.type ] ) {
        console.warn( "Invalid loader type: " + item.type + "." );
        return;
      }

      // Construct and store a LoadItem with the specified parameters. If we got this far, the item should be valid.
      _items.push( new LoadItem( item.type + "", _loaders[ item.type ], item.url + "", !!item.exclude, item.check ) );
    };

    /**
     * Private Member: startOrdered
     *
     * Loads the items in this LoadGroup in the order they were added. After the load function is called on one item,
     * unorderedReadyCallback or unorderedErrorCallback are used to progress the LoadGroup onto the next item after
     * either an load has completed or has failed respectively.
     */
    function startOrdered() {
      var itemIndex = 0;

      var next = function() {

        // itemIndex++ to read index 0 and increment afterward
        var item = _items[ itemIndex++ ];

        // If there are more items to load, load the next one.
        if ( item ) {
          item.load( unorderedReadyCallback, unorderedErrorCallback );
        }
        else {
          // Otherwise, call the readyCallback because we're done.
          readyCallback( _this );
        }
      };

      function unorderedReadyCallback( loadItem ) {
        _successfulItems.push( loadItem );
        next();
      }

      function unorderedErrorCallback( loadItem ) {
        _erroneousItems.push( loadItem );
        // If an error occured, call the error callback, but keep loading.
        errorCallback.call( this, loadItem.error );
        next();
      }

      // Start loading.
      next();
    }

    /**
     * Private Member: startUnordered
     *
     * Loads the items in this LoadGroup without any guarantees about ordering. Each item's load function is called
     * immediately, and when all have either finished loading or failed, readyCallback is executed.
     */
    function startUnordered() {
      var checkFinished = function() {
        // If every item has finished successfully or in error, call the ready callback.
        if ( _successfulItems.length + _erroneousItems.length === _items.length && readyCallback ) {
          readyCallback( _this );
        }
      };

      function unorderedReadyCallback( loadItem ) {
        _successfulItems.push( loadItem );
        checkFinished();
      }

      function unorderedErrorCallback( loadItem ) {
        _erroneousItems.push( loadItem );
        // If an error occured, call the error callback, but keep loading.
        errorCallback.call( this, loadItem.error );
        checkFinished();
      }

      _items.forEach( function( item ) {
        item.load( unorderedReadyCallback, unorderedErrorCallback );
      });
    }

    /**
     * Member: start
     *
     * Begins the loading process. If an ordered load was requested, startOrdered is called. Otherwise,
     * startUnordered is used. After the first execution of this function, successive calls are ignored.
     */
    this.start = function() {
      if ( _loadStarted ) {
        return;
      }

      _loadStarted = true;

      if ( ordered ) {
        startOrdered();
      }
      else {
        startUnordered();
      }
    };
  }

  return LoadGroup;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dependencies',[ "util/xhr", "loaders/js-loader", "loaders/css-loader", "loaders/load-group" ],
  function( XHR, JSLoader, CSSLoader, LoadGroup ) {

  return function( config ) {

    var _configDirs = config.value( "dirs" );

    var _loaders = {
      js: new JSLoader( _configDirs ),
      css: new CSSLoader( _configDirs )
    };

    this.load = function( items, readyCallback, errorCallback, ordered ) {
      var loadGroup;

      errorCallback = errorCallback || function( e ) {
        if ( e ) {
          console.warn( e.toString() );
        }
      };

      loadGroup = new LoadGroup( _loaders, readyCallback, errorCallback, ordered );

      // if `items` is an array, add items to the LoadGroup individually
      if ( Array.isArray( items ) && items.length > 0 ) {
        items.forEach( function( item ) {
          loadGroup.addItem( item );
        });
      }
      else {
        // otherwise, just add the one item
        loadGroup.addItem( items );
      }

      loadGroup.start();
    };

  };

});

define('text!dialog/dialogs/error-message.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-form">\n  <h3><span class="message">Error</span></h3>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/error-message',[ "text!dialog/dialogs/error-message.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ){

  Dialog.register( "error-message", LAYOUT_SRC, function( dialog, data ) {
    var message = dialog.rootElement.querySelector( ".message" );
    message.innerHTML = data;
    dialog.enableCloseButton();
    dialog.assignEscapeKey( "default-close" );
    dialog.assignEnterKey( "default-ok" );
  });
});
define('text!dialog/dialogs/track-data.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-form">\n  <h3 class="butter-dialog-title">Data for <span class="track-name"></span></h3>\n  <textarea class="track-data main-textarea" readonly>Please wait...</textarea>\n  <div class="error"></div>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/track-data',[ "text!dialog/dialogs/track-data.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ){

  Dialog.register( "track-data", LAYOUT_SRC, function ( dialog, track ) {
    var rootElement = dialog.rootElement;

    var trackName = rootElement.querySelector( ".track-name" ),
        trackData = rootElement.querySelector( ".track-data" );

    var data = track.json;

    trackName.innerHTML = data.name;
    trackData.value = JSON.stringify( data );
    dialog.enableCloseButton();
    dialog.assignEscapeKey( "default-close" );

  });
});

define('text!dialog/dialogs/delete-track.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-form small">\n  <p>Are you sure you want to delete <span class="track-name"></span>?</p>\n  <div class="buttons vbox center">\n    <button class="butter-btn btn-light butter-dialog-button yes">Yes</button>\n    <button class="butter-btn btn-light butter-dialog-button no">No</button>\n  </div>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/delete-track',[ "text!dialog/dialogs/delete-track.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ){

  Dialog.register( "delete-track", LAYOUT_SRC, function( dialog, trackName ) {
    dialog.registerActivity( "ok", function(){
      dialog.send( "submit", true );
    });

    dialog.rootElement.querySelector( ".track-name" )
      .appendChild( document.createTextNode( trackName ) );

    dialog.enableElements( ".yes", ".no" );
    dialog.enableCloseButton();
    dialog.assignEscapeKey( "default-close" );
    dialog.assignEnterKey( "ok" );
    dialog.assignButton( ".yes", "ok" );
    dialog.assignButton( ".no", "default-close" );
  });
});
define('text!dialog/dialogs/delete-track-events.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-form small">\n  <p><strong>Deleting all track events cannot be undone. Do you wish to continue?</strong></p>\n  <div class="buttons vbox center">\n    <button class="butter-btn btn-light butter-dialog-button yes">Yes</button>\n    <button class="butter-btn btn-light butter-dialog-button no">No</button>\n  </div>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/delete-track-events',[ "text!dialog/dialogs/delete-track-events.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ){

  Dialog.register( "delete-track-events", LAYOUT_SRC, function( dialog, data ) {
    var butter = data;

    dialog.registerActivity( "ok", function(){
      butter.currentMedia.clear();
      butter.currentMedia.addTrack();
      dialog.send( "ok" );
      dialog.activity( "default-close" );
    });

    dialog.enableElements( ".yes", ".no" );
    dialog.enableCloseButton();
    dialog.assignEscapeKey( "default-close" );
    dialog.assignEnterKey( "ok" );
    dialog.assignButton( ".yes", "ok" );
    dialog.assignButton( ".no", "default-close" );
  });
});
define('text!dialog/dialogs/feedback.html',[],function () { return '<!--  This Source Code Form is subject to the terms of the MIT license\n      If a copy of the MIT license was not distributed with this file, you can\n      obtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-feedback-form">\n  <div class="butter-logo"></div>\n  <div class="butter-dialog-offset">\n    <div class="butter-dialog-title">Feedback<span class="icon icon-info-sign"></span>\n      <p class="dialog-info dialog-hidden">You can send feedback about bugs, suggestions, or ideas you have for new projects.</p>\n    </div>\n  </div>\n  <div class="butter-form">\n    <fieldset>\n      <label><span class="ticket-icon"></span>Thanks for your feedback. Let us know how we can improve, or what we\'re doing right. Along with your comments, we\'ll be collecting your browser type (<b id="browser"></b>) and the date (<b id="date"></b>).</label>\n      <textarea id="comments" class="track-data main-textarea" placeholder="I think it would be awesome if..."></textarea>\n    </fieldset>\n    <fieldset>\n      <button class="butter-btn btn-red butter-dialog-button update">Send Feedback</button>\n    </fieldset>\n  </div>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/feedback', [ "text!dialog/dialogs/feedback.html", "dialog/dialog", "util/xhr" ],
  function( LAYOUT_SRC, Dialog, XHR ) {
    Dialog.register( "feedback", LAYOUT_SRC, function ( dialog ) {
      var rootElement = dialog.rootElement,
          updateBtn = rootElement.querySelector( ".update" ),
          infoBtn = rootElement.querySelector( ".icon-info-sign" ),
          dialogInfo = rootElement.querySelector( ".dialog-info" ),
          browserSpan = rootElement.querySelector( "#browser" ),
          browserInfo = navigator.userAgent,
          dateSpan = rootElement.querySelector( "#date" ),
          dateInfo = (new Date()).toDateString(),
          commentsTextArea = rootElement.querySelector( "#comments" );

      // Show the user what we're collecting
      browserSpan.innerHTML = browserInfo;
      dateSpan.innerHTML = dateInfo;

      updateBtn.addEventListener( "click", function() {
        if( commentsTextArea.value ) {
          var commentsReport = {
            date: dateInfo,
            browser: browserInfo,
            comments: commentsTextArea.value
          };
          XHR.post( "/feedback", JSON.stringify( commentsReport ),
                    function(){ /* fire and forget */ }, "text/json" );
          dialog.activity( "default-close" );
        }
      }, false );

      infoBtn.addEventListener( "click", function() {
        dialogInfo.classList.toggle( "dialog-hidden" );
      }, false );

      dialog.enableCloseButton();
      dialog.assignEscapeKey( "default-close" );
    });
});

define('text!dialog/dialogs/crash.html',[],function () { return '<!-- This Source Code Form is subject to the terms of the MIT license\nIf a copy of the MIT license was not distributed with this file, you can\nobtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<div class="butter-dialog butter-feedback-form">\n  <div class="butter-logo"></div>\n  <div class="butter-dialog-offset">\n    <div class="butter-dialog-title">Popcorn Maker encountered an error<span class="icon icon-info-sign"></span>\n      <p id="report" class="dialog-info dialog-hidden"></p>\n    </div>\n  </div>\n  <div class="butter-form">\n    <fieldset>\n      <label>Popcorn Maker needs to be reloaded. Your project was backed up and will be restored upon reloading. You can send an anonymous error report (click the \'i\' above for details) to Mozilla or skip this step and reload now. If you have any extra information you\'d like to send, enter it below. Mozilla makes crash reports available to the public.</label>\n      <textarea id="comments" class="track-data main-textarea" placeholder="I was working and all of a sudden..."></textarea>\n    </fieldset>\n    <fieldset>\n      <button id="yes" class="butter-btn btn-green butter-dialog-button update">Yes, send anonymous report</button>\n      <button id="no" class="butter-btn btn-red butter-dialog-button update">No thanks, don\'t send</button>\n    </fieldset>\n  </div>\n  <a class="close-button"><span class="icon icon-only icon-x"></span></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 *  * If a copy of the MIT license was not distributed with this file, you can
 *  * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/crash', [ "text!dialog/dialogs/crash.html", "dialog/dialog", "util/lang" ],
  function( LAYOUT_SRC, Dialog, LangUtil ) {

    function formatReport( report ) {
      return "<b>Date</b>: " + report.date + "<br>" +
             "<b>App URL</b>: " + report.appUrl + "<br>" +
             "<b>Script URL</b>: " + report.scriptUrl + ":" + report.lineno + "<br>" +
             "<b>Media URL(s)</b>: " + report.mediaUrl + "<br>" +
             "<b>Error</b>: " + LangUtil.escapeHTML( report.message ) + "<br>" +
             "<b>Butter State</b>: " + report.stateList.slice().reverse().join( ", " ) + "<br>" +
             "<b>Browser</b>: " + report.userAgent + "<br>" +
             "<b>Null DOM Nodes</b>: " + report.nullDomNodes + "<br>" +
             "<b>Versions</b>: Popcorn=" + report.popcornVersion + ", Butter=" + report.butterVersion;
    }

    Dialog.register( "crash", LAYOUT_SRC, function ( dialog, data ) {

      var rootElement = dialog.rootElement,
          reportTextArea = rootElement.querySelector( "#report" ),
          dialogInfo = rootElement.querySelector( ".dialog-info" ),
          infoBtn = rootElement.querySelector( ".icon-info-sign" ),
          commentsTextArea = rootElement.querySelector( "#comments" ),
          noBtn = rootElement.querySelector( "#no" ),
          yesBtn = rootElement.querySelector( "#yes" ),
          yesCallback = data.onSendReport,
          noCallback = data.onNoReport;

      reportTextArea.innerHTML = formatReport( data );

      infoBtn.addEventListener( "click", function() {
        dialogInfo.classList.toggle( "dialog-hidden" );
      }, false );

      noBtn.addEventListener( "click", noCallback, false );
      yesBtn.addEventListener( "click", function() {
        yesCallback( commentsTextArea.value || "" );
      }, false );

      dialog.enableCloseButton();
      dialog.assignEscapeKey( "default-close" );
    });
});

define('text!dialog/dialogs/first-run.html',[],function () { return '<!-- This Source Code Form is subject to the terms of the MIT license\nIf a copy of the MIT license was not distributed with this file, you can\nobtain one at https://raw.github.com/mozilla/butter/master/LICENSE -->\n\n<!-- This is just a placeholder, really -->\n<div class="butter-first-run-dialog butter-feedback-form butter-dialog">\n  <div class="butter-logo"></div>\n  <div class="butter-dialog-offset">\n    <div class="butter-dialog-body">\n      <h2><strong>Welcome to Popcorn Maker!</strong> To get started, enter a media source here.</h2>\n    </div>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialog/dialogs/first-run', [ "text!dialog/dialogs/first-run.html", "dialog/dialog" ],
  function( LAYOUT_SRC, Dialog ) {
    Dialog.register( "first-run", LAYOUT_SRC, function ( dialog ) {
      dialog.assignEscapeKey( "default-close" );
    });
});

define('text!dialog/dialogs/backup.html',[],function () { return '<!-- This Source Code Form is subject to the terms of the MIT license\nIf a copy of the MIT license was not distributed with this file, you can\nobtain one at http://www.mozillapopcorn.org/butter-license.txt -->\n\n<div class="butter-dialog">\n  <div class="butter-form">\n    <fieldset>\n      <h2>Popcorn Maker found an automatic backup for "<span class="butter-backup-project-name"></span>".</h2>\n      <p>Looks like you had <strong>unsaved changes</strong> for the project "<span class="butter-backup-project-name"></span>" from <span class="butter-backup-date"></span>. Do you want to load this project, or discard your changes?</p>\n    </fieldset>\n    <fieldset>\n      <button id="yes" class="butter-btn btn-green butter-backup-load">Yes, load this backup</button>\n      <button id="no" class="butter-btn btn-red butter-backup-discard">No, discard my changes</button>\n    </fieldset>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 *  * If a copy of the MIT license was not distributed with this file, you can
 *  * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define('dialog/dialogs/backup', [ "text!dialog/dialogs/backup.html", "dialog/dialog", "util/time" ],
  function( LAYOUT_SRC, Dialog, TimeUtil ) {

    function replaceProjectName( name, elements ) {
      for ( var i = 0, l = elements.length; i < l; i++ ) {
        elements[ i ].innerHTML = name;
      }
    }

    function fireAndCloseFn( fn, dialog ) {
      return function() {
        fn();
        dialog.activity( "default-close" );
      };
    }

    Dialog.register( "backup", LAYOUT_SRC, function ( dialog, data ) {

      var rootElement = dialog.rootElement,
          projectNameSpans = rootElement.querySelectorAll( ".butter-backup-project-name" ),
          backupDateSpan = rootElement.querySelector( ".butter-backup-date" ),
          backupLoadBtn = rootElement.querySelector( ".butter-backup-load" ),
          backupDiscardBtn = rootElement.querySelector( ".butter-backup-discard" ),
          loadProject = fireAndCloseFn( data.loadProject, dialog ),
          discardProject = fireAndCloseFn( data.discardProject, dialog ),
          projectName = data.projectName || "Unsaved Project";

      backupLoadBtn.addEventListener( "click", loadProject, false );
      backupDiscardBtn.addEventListener( "click", discardProject, false );

      // Show useful time info, for example: "5 minutes ago"
      backupDateSpan.innerHTML = TimeUtil.toPrettyString( Date.now() - data.backupDate ) + " ago";

      // Give the user info about the project we have in backup via name
      replaceProjectName( projectName, projectNameSpans );
    });
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('dialogs',[
  "dialog/dialogs/error-message",
  "dialog/dialogs/track-data",
  "dialog/dialogs/delete-track",
  "dialog/dialogs/delete-track-events",
  "dialog/dialogs/feedback",
  "dialog/dialogs/crash",
  "dialog/dialogs/first-run",
  "dialog/dialogs/backup"
], function() {} );

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('ui/toggler', [], function() {

  return function( rootElement, clickHandler, elementTitle, startState ){
    var _element = rootElement;

    if ( startState !== false && startState !== true ) {
      startState = false;
    }

    _element.title = elementTitle || "Show/Hide";

    if ( clickHandler ) {
      _element.addEventListener( "click", clickHandler, false );
    }

    Object.defineProperties( this, {
      element: {
        enumerable: true,
        get: function(){
          return _element;
        }
      },
      state: {
        enumerable: true,
        get: function() {
          return _element.classList.contains( "toggled" );
        },
        set: function( state ) {
          if ( state ) {
            _element.classList.add( "toggled" );
          }
          else {
            _element.classList.remove( "toggled" );
          }
        }
      },
      visible: {
        enumerable: true,
        get: function(){
          return _element.style.display !== "none";
        },
        set: function( val ){
          _element.style.display = val ? "block" : "none";
        }
      }
    });

    this.state = startState;

  };
});

define('ui/unload-dialog',[], function() {

  return function( butter ) {

    // We only want to nag users about this if they've never saved at all,
    // since our project backups start automatically after the user clicks
    // Save the first time.  Once they've saved, if they exit, they either saved
    // or we have a backup and can restore on reload.
    var _projectWasSavedOnce = false;

    function areYouSure() {
      return "You have unsaved project data.";
    }

    butter.listen( "projectchanged", function() {
      if ( !_projectWasSavedOnce ) {
        window.onbeforeunload = areYouSure;
      }
    });

    butter.listen( "projectsaved", function() {
      _projectWasSavedOnce = true;
      window.onbeforeunload = null;
    });
  };

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

/**
 * Module: First-Run
 *
 * Determines whether or not a user should be shown a first-run dialog
 */
define('first-run', [ "dialog/dialog", "ui/widget/tooltip" ], function( Dialog, ToolTip ) {

  var __butterStorage = window.localStorage;

  return {
    init: function() {

      var dialog,
          mediaTooltip,
          overlayDiv,
          editor = document.querySelector( ".butter-editor-area" ),
          eventsEditorButton = document.querySelector( ".butter-editor-header-popcorn" ),
          mediaInput = document.querySelector( ".add-media-input" );

      function showFirstRunTooltips() {
        ToolTip.create({
          name: "tooltip-media",
          element: eventsEditorButton,
          top: "60px",
          message: "<h3>Events Editor</h3>Augment your media with track events here!",
          hidden: false
        });

        mediaTooltip = ToolTip.get( "tooltip-media" );

        document.body.addEventListener( "mousedown", function removeTooltips() {
          mediaTooltip.hidden = true;
          document.body.removeEventListener( "mousedown", removeTooltips, true );
        }, true );

      }

      function onDialogClose() {
        // Remove Listeners
        dialog.unlisten( "close", onDialogClose );
        window.removeEventListener( "click", closeDialog, false );

        // Remove Classes
        eventsEditorButton.classList.remove( "overlay-highlight" );
        mediaInput.classList.remove( "overlay-highlight" );
        document.body.classList.remove( "first-run" );

        // Remove Overlay
        editor.removeChild( overlayDiv );

        // Show First Run Tooltips
        showFirstRunTooltips();
      }

      function closeDialog() {
        dialog.close();
      }

      function setupFirstRun() {
        // Setup and append the first-run overlay
        overlayDiv = document.createElement( "div" );
        overlayDiv.classList.add( "butter-modal-overlay" );
        overlayDiv.classList.add( "butter-modal-overlay-dark-bg" );
        overlayDiv.classList.add( "fade-in" );
        editor.appendChild( overlayDiv );

        // Add Listener
        window.addEventListener( "click", closeDialog, false );

        // Add Classes
        mediaInput.classList.add( "overlay-highlight" );
        document.body.classList.add( "first-run" );
      }

      try {
        var data = __butterStorage.getItem( "butter-first-run" );

        if ( !data || window.location.search.match( "forceFirstRun" ) ) {
          __butterStorage.setItem( "butter-first-run", true );
          setupFirstRun();
          dialog = Dialog.spawn( "first-run" );
          dialog.open( false );
          dialog.listen( "close", onDialogClose );
        }
      } catch( e ) {}
    }
  };
});

define('text!layouts/logo-spinner.html',[],function () { return '<div class="butter-logo-spin-outer">\n  <div class="butter-spinner"></div>\n</div>\n';});

define('ui/logo-spinner', [ "util/lang", "text!layouts/logo-spinner.html" ],
  function( LangUtils, LAYOUT_SRC ) {

  return function( parentElement ) {

    var outerElement = LangUtils.domFragment( LAYOUT_SRC, ".butter-logo-spin-outer" ),
        innerElement = outerElement.querySelector( ".butter-spinner" );

    if( parentElement ){
      parentElement.appendChild( outerElement );
    }

    return {
      element: outerElement,
      start: function(){
        outerElement.classList.remove( "fade-out" );
        innerElement.classList.add( "active" );
      },
      stop: function( callback ){
        outerElement.classList.add( "fade-out" );
        setTimeout(function(){
          innerElement.classList.remove( "active" );
          if( callback ){
            callback();
          }
        }, 500 );
      }
    };

  };

});

define('text!layouts/tray.html',[],function () { return '<div class="butter-tray butter-tray-minimized" data-butter-exclude="true" data-butter-content-state="timeline">\n  <div class="butter-loading-container"></div>\n  <div class="butter-status-area"></div>\n  <div class="butter-timeline-area"></div>\n  <div class="butter-toggle-button">\n    <div class="image-container"></div>\n  </div>\n</div>';});

define('text!layouts/status-area.html',[],function () { return '<div class="media-status-container">\n  <div class="time-bar">\n    <div class="time-bar-canvas-container">\n      <canvas></canvas>\n    </div>\n    <div class="time-bar-scrubber-container">\n      <div class="fill-bar"></div>\n      <div class="butter-tooltip butter-time-tooltip">00:00:00</div>\n      <div class="time-bar-scrubber-node" data-tooltip>\n        <div class="time-bar-scrubber-line" title="Displays the media\'s current time. Drag to seek through the media."></div>\n      </div>\n    </div>\n  </div>\n  <div class="status-container">\n    <div class="play-button-container">\n      <div class="butter-btn btn-green status-button" title="Play/Pause media">\n        <span class="icon icon-white icon-only icon-play"></span>\n      </div>\n    </div>\n    <div class="time-container">\n      <input type="text">\n    </div>\n  </div>\n  <div class="mute-button-container">\n    <div class="status-button" title="Toggle volume on/off">\n      <span class="icon icon-white icon-only icon-volume-down"></span>\n    </div>\n  </div>\n</div>\n';});

define('text!layouts/timeline-area.html',[],function () { return '<div class="butter-timeline fadable">\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('ui/tray', [ "util/lang",  "./logo-spinner",
          "text!layouts/tray.html",
          "text!layouts/status-area.html", "text!layouts/timeline-area.html" ],
  function( LangUtils, LogoSpinner,
            TRAY_LAYOUT,
            STATUS_AREA_LAYOUT, TIMELINE_AREA_LAYOUT ) {

  return function(){

    var statusAreaFragment = LangUtils.domFragment( STATUS_AREA_LAYOUT, ".media-status-container" );
    var timelineAreaFragment = LangUtils.domFragment( TIMELINE_AREA_LAYOUT, ".butter-timeline" );
    var trayRoot = LangUtils.domFragment( TRAY_LAYOUT, ".butter-tray" );

    var _loadingContainer = trayRoot.querySelector( ".butter-loading-container" );

    var _logoSpinner = new LogoSpinner( _loadingContainer );

    this.statusArea = trayRoot.querySelector( ".butter-status-area" );
    this.timelineArea = trayRoot.querySelector( ".butter-timeline-area" );
    
    this.rootElement = trayRoot;

    this.statusArea.appendChild( statusAreaFragment );
    this.timelineArea.appendChild( timelineAreaFragment );

    this.attachToDOM = function() {
      document.body.appendChild( trayRoot );
    };

    this.show = function() {
      // This function's only purpose is to avoid having transitions on the tray while it's attached to the DOM,
      // since Chrome doesn't display the element where it should be on load.
      trayRoot.classList.add( "butter-tray-transitions" );
    };

    this.setMediaInstance = function( mediaInstanceRootElement ) {
      var timelineContainer = this.timelineArea.querySelector( ".butter-timeline" );
      timelineContainer.innerHTML = "";
      timelineContainer.appendChild( mediaInstanceRootElement );
    };

    this.toggleLoadingSpinner = function( state ) {
      if ( state ) {
        _logoSpinner.start();
        _loadingContainer.style.display = "block";
      }
      else {
        _logoSpinner.stop( function() {
          _loadingContainer.style.display = "none";
        });
      }
    };

    Object.defineProperties( this, {
      minimized: {
        enumerable: true,
        set: function( val ) {
          if ( val ) {
            document.body.classList.add( "tray-minimized" );
            trayRoot.classList.add( "butter-tray-minimized" );
          }
          else {
            document.body.classList.remove( "tray-minimized" );
            trayRoot.classList.remove( "butter-tray-minimized" );
          }
        },
        get: function() {
          return trayRoot.classList.contains( "butter-tray-minimized" );
        }
      }
    });

  };

});
define('text!layouts/ui-kit.html',[],function () { return '<div class="butter-editor ui-kit allow-scrollbar">\n  <h1>Sample Editor</h1>\n  <div class="error-message-container">\n    <div class="error-message"></div>\n  </div>\n  <div class="butter-editor-body scrollbar-container">\n    <div class="editor-options-wrapper scrollbar-outer">\n      <div class="editor-options scrollbar-inner">\n        <fieldset>\n          <label>Buttons</label>\n          <a class="butter-btn btn-light">Button</a>\n          <a class="butter-btn btn-green" >Button</a>\n          <a class="butter-btn btn-light"><span class="icon icon-cog"></span>Button + Icon</a>\n          <p>\n            <span class="btn-group butter-btn-radio">\n              <a class="butter-btn btn-light"><span class="icon icon-only icon-align-left"></span></a>\n              <a class="butter-btn btn-light"><span class="icon icon-only icon-align-center"></span></a>\n              <a class="butter-btn btn-light"><span class="icon icon-only icon-align-right"></span></a>\n            </span>\n\n            <span class="btn-group">\n              <a class="butter-btn btn-light">Button</a>\n              <a class="butter-btn btn-light"><span class="icon icon-only icon-cog"></span></a>\n            </span>\n          </p>\n          <a class="butter-btn btn-light butter-btn-checkbox">Checkbox</a>\n          <a class="butter-btn btn-green butter-btn-checkbox" >Checkbox</a>\n        </fieldset>\n\n        <fieldset>\n          <label>Text boxes</label>\n          <input type="text" placeholder="default input">\n          <div class="butter-form-append" data-tooltip="This is an example of a tooltip">\n            <input type="text" placeholder="butter-form-append">\n            <span class="butter-unit">unit</span>\n          </div>\n          <textarea></textarea>\n\n        </fieldset>\n\n        <fieldset>\n          <label>Tooltips</label>\n          <code>ui/widgets/tooltip.js</code>\n          <p><a class="butter-btn btn-light" data-tooltip="hello world">Button\n          </a></p>\n          <pre>\n// Manual usage\nvar tooltip1 = Tooltip.create({ \n  message: "hello world" \n});\nmyButton.appendChild( tooltip1 );\n\n// Apply to all elements inside a rootElement  \n&lt;a id="test2" class="butter-btn btn-light" \n  data-tooltip="coolio"&gt;Button&lt;/a&gt;\n  \nTooltip.apply( rootElement );\n          </pre>\n        </fieldset>\n\n        <fieldset>\n          <label>This is an option set</label>\n          <label class="butter-form-radio">\n            <input type="radio" name="test" value="test">Loremt nulla pariaturanim id est laborum.\n          </label>\n          <label class="butter-form-radio">\n            <input type="radio" name="test" value="test">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmodlit anim id est laborum.\n          </label>\n          <label class="butter-form-radio">\n            <input type="radio" name="test" value="test">Loremt nulla pariaturanim id est laborum.\n          </label>\n          <label class="butter-form-checkbox">\n            <input type="checkbox" name="test2" value="test">Loremt nulla pariaturanim id est laborum.\n          </label>\n        </fieldset>\n        <fieldset class="butter-form-inline form-half">\n          <label class="butter-form-radio">\n            <input type="radio" name="test" value="test">Das asds\n          </label>\n          <label class="butter-form-radio">\n            <input type="radio" name="test" value="test">Loremt nulla \n          </label>\n        </fieldset>\n        <fieldset class="butter-form-inline form-single">\n          <label>Dulla</label>\n          <input type="text" name="test" value="test">\n        </fieldset>\n        <fieldset class="butter-form-inline form-single">\n          <label>Dulla asdas </label>\n          <select>\n            <option>Blah</option>\n          </select>\n        </fieldset>\n        <fieldset class="butter-form-inline form-half">\n          <div class="butter-form-append">\n            <label>Start</label>\n            <input type="text" placeholder="2">\n            <span class="butter-unit">seconds</span>\n          </div>\n          <div class="butter-form-append">\n            <label>End</label>\n            <input type="text" placeholder="10">\n            <span class="butter-unit">s</span>\n          </div>\n        </fieldset>\n        <fieldset class="butter-form-inline form-half">\n          <label>Text boxes</label>\n          <input type="text" placeholder="default input">\n          <input type="text" placeholder="default input">\n        </fieldset>\n\n      </div>\n    </div>\n  </div>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('editor/ui-kit', [ "editor/editor", "editor/base-editor", "text!layouts/ui-kit.html" ],
  function( Editor, BaseEditor, LAYOUT_SRC ) {
    var ACTIVE_CLASS = "butter-btn-active";

    function toggleRadio( e ) {
      var target = e.target.tagName === "A" ? e.target : e.target.parentNode,
          selected = this.querySelector( "." + ACTIVE_CLASS );
      if ( selected ) {
        selected.classList.remove( ACTIVE_CLASS );
      }
      target.classList.toggle( ACTIVE_CLASS );
    }

    function toggleCheckbox() {
      this.classList.toggle( ACTIVE_CLASS );
    }

    function attachOnClick( nodeList, fn ) {
      for ( var i = 0, l = nodeList.length; i < l; i++ ) {
        nodeList[ i ].addEventListener( "click", fn, false );
      }
    }

  Editor.register( "ui-kit", LAYOUT_SRC, function( rootElement, butter ) {
    Editor.BaseEditor.extend( this, butter, rootElement, {
      open: function() {
        var radios = rootElement.querySelectorAll( ".butter-btn-radio" ),
            checkboxes = rootElement.querySelectorAll( ".butter-btn-checkbox" );
        attachOnClick( radios, toggleRadio );
        attachOnClick( checkboxes, toggleCheckbox );
      },
      close: function() {
      }
    });
  });
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('ui/ui', [ "core/eventmanager", "./toggler",
          "./unload-dialog",
          "first-run", "./tray", "editor/ui-kit",
          "core/trackevent", "dialog/dialog",
          "util/dragndrop" ],
  function( EventManager, Toggler,
            UnloadDialog,
            FirstRun, Tray, UIKitDummy,
            TrackEvent, Dialog,
            DragNDrop ){

  var TRANSITION_DURATION = 500,
      BUTTER_CSS_FILE = "{css}/butter.ui.css";

  var __unwantedKeyPressElements = [
        "TEXTAREA",
        "INPUT",
        "VIDEO",
        "AUDIO"
      ],
      __disabledKeyRepeats = [
        32, // space key
        27, // esc key
        8   // del key
      ];

  var NUDGE_INCREMENT_SMALL = 0.25,
      NUDGE_INCREMENT_LARGE = 1;

  function UI( butter ){

    var _visibility = true,
        _uiConfig = butter.config,
        _uiOptions = _uiConfig.value( "ui" ),
        _unloadDialog,
        _this = this;

    EventManager.extend( _this );

    this.contentStateLocked = false;

    this.tray = new Tray();
    //this.header = new Header( butter, _uiConfig );

    // Filled in by the editor module
    this.editor = null;

    var _toggler = new Toggler( this.tray.rootElement.querySelector( ".butter-toggle-button" ),
        function () {
          butter.ui.visible = !butter.ui.visible;
          _toggler.state = !_toggler.state;
        }, "Show/Hide Timeline" );

    if ( _uiOptions.enabled ) {
      if ( _uiOptions.onLeaveDialog ) {
        _unloadDialog = new UnloadDialog( butter );
      }
      //document.body.classList.add( "butter-tray-spacing" );
    }

    this.loadIcons = function( plugins ) {
      var path, img, div;

      plugins.forEach( function( plugin ) {
          path = plugin.icon;

          if ( !path ) {
            return;
          }

          img = new Image();
          img.id = plugin.type + "-icon";
          img.src = path;

          // We can't use "display: none", since that makes it
          // invisible, and thus not load.  Opera also requires
          // the image be in the DOM before it will load.
          div = document.createElement( "div" );
          div.setAttribute( "data-butter-exclude", "true" );
          div.className = "butter-image-preload";

          div.appendChild( img );
          document.body.appendChild( div );
      });
    };

    this.setEditor = function( editorAreaDOMRoot ) {
      _this.editor = editorAreaDOMRoot;
      document.body.appendChild( editorAreaDOMRoot );
    };

    this.load = function( onReady ) {
      var loadOptions = {
        type: "css",
        url: BUTTER_CSS_FILE
      };

      function loadUI() {
        butter.loader.load( [ loadOptions ], function() {
          // icon preloading needs css to be loaded first

          _this.loadIcons( _uiConfig.value( "plugin" ).plugins );

          function firstRunInit() {
            butter.unlisten( "mediaready", firstRunInit );

            // Open the media-editor editor right after butter is finished starting up
            //butter.editor.openEditor( "media-editor" );
            //FirstRun.init();
          }

          butter.listen( "mediaready", firstRunInit );

          onReady();
        });
      }

      if ( _uiOptions.enabled ) {
        loadUI();

        _this.tray.attachToDOM();
        //_this.header.attachToDOM();
      }
      else {
        onReady();
      }
    };

    /**
     * Member: moveTrackEventLeft
     *
     * If possible, moves a TrackEvent to the left by a specified amount.
     *
     * @param {TrackEvent} trackEvent: TrackEvent to move
     * @param {Number} amount: Amount by which the event is to move.
     */
    function moveTrackEventLeft( trackEvent, amount ) {
      var currentPopcornOptions = trackEvent.popcornOptions,
          currentDuration = currentPopcornOptions.end - currentPopcornOptions.start,
          overlappingTrackEvent,
          popcornOptions;

      if ( currentPopcornOptions.start > amount ) {
        popcornOptions = {
          start: currentPopcornOptions.start - amount,
          end: currentPopcornOptions.end - amount
        };
      }
      else {
        popcornOptions = {
          start: 0,
          end: currentDuration
        };
      }

      // If an overlapping trackevent was found, position this trackevent such that its left side is snug against the right side
      // of the overlapping trackevent.
      overlappingTrackEvent = trackEvent.track.findOverlappingTrackEvent( popcornOptions.start, popcornOptions.end, trackEvent );

      if ( overlappingTrackEvent ) {
        popcornOptions.start = overlappingTrackEvent.popcornOptions.end;
        popcornOptions.end = popcornOptions.start + currentDuration;
      }

      trackEvent.update( popcornOptions );
    }

    /**
     * Member: shrinkTrackEvent
     *
     * If possible, shrinks a TrackEvent to the left by a specified amount.
     *
     * @param {TrackEvent} trackEvent: TrackEvent to move
     * @param {Number} amount: Amount by which the event is to shrink.
     */
    function shrinkTrackEvent( trackEvent, amount ) {
      var currentPopcornOptions = trackEvent.popcornOptions,
          popcornOptions;

      if ( currentPopcornOptions.end - currentPopcornOptions.start - amount >= TrackEvent.MINIMUM_TRACKEVENT_SIZE ) {
        popcornOptions = {
          end: currentPopcornOptions.end - amount
        };
      }
      else {
        popcornOptions = {
          end: currentPopcornOptions.start + TrackEvent.MINIMUM_TRACKEVENT_SIZE
        };
      }

      // No need to check for overlapping TrackEvents here, since you can't shrink your TrackEvent to overlap another. That's silly.

      trackEvent.update( popcornOptions );
    }

    /**
     * Member: moveTrackEventRight
     *
     * If possible, moves a TrackEvent to the right by a specified amount.
     *
     * @param {TrackEvent} trackEvent: TrackEvent to move
     * @param {Number} amount: Amount by which the event is to move.
     */
    function moveTrackEventRight( trackEvent, amount ) {
      var currentPopcornOptions = trackEvent.popcornOptions,
          currentMediaDuration = butter.currentMedia.duration,
          currentDuration = currentPopcornOptions.end - currentPopcornOptions.start,
          overlappingTrackEvent,
          popcornOptions;

      if ( currentPopcornOptions.end <= currentMediaDuration - amount ) {
        popcornOptions = {
          start: currentPopcornOptions.start + amount,
          end: currentPopcornOptions.end + amount
        };
      }
      else {
        popcornOptions = {
          start: currentMediaDuration - ( currentPopcornOptions.end - currentPopcornOptions.start ),
          end: currentMediaDuration
        };
      }

      overlappingTrackEvent = trackEvent.track.findOverlappingTrackEvent( popcornOptions.start, popcornOptions.end, trackEvent );

      // If an overlapping trackevent was found, position this trackevent such that its right side is snug against the left side
      // of the overlapping trackevent.
      if ( overlappingTrackEvent ) {
        popcornOptions.end = overlappingTrackEvent.popcornOptions.start;
        popcornOptions.start = popcornOptions.end - currentDuration;
      }
      trackEvent.update( popcornOptions );
    }

    /**
     * Member: growTrackEvent
     *
     * If possible, grows a TrackEvent to the by a specified amount.
     *
     * @param {TrackEvent} trackEvent: TrackEvent to grow is to shrink.
     */
    function growTrackEvent( trackEvent, amount ) {
      var currentPopcornOptions = trackEvent.popcornOptions,
          overlappingTrackEvent,
          popcornOptions;

      if ( currentPopcornOptions.end <= butter.currentMedia.duration - amount ) {
        popcornOptions = {
          end: currentPopcornOptions.end + amount
        };
      }
      else {
        popcornOptions = {
          end: butter.currentMedia.duration
        };
      }

      // If an overlapping trackevent was found, position this trackevent such that its left side is snug against the right side
      // of the overlapping trackevent.
      overlappingTrackEvent = trackEvent.track.findOverlappingTrackEvent( currentPopcornOptions.start, popcornOptions.end, trackEvent );

      if ( overlappingTrackEvent ) {
        popcornOptions.end = overlappingTrackEvent.popcornOptions.end;
      }

      trackEvent.update( popcornOptions );
    }

    Object.defineProperties( this, {
      enabled: {
        get: function() {
          return _uiOptions.enabled;
        }
      },
      visible: {
        enumerable: true,
        get: function(){
          return _visibility;
        },
        set: function( val ){
          if( _visibility !== val ){
            _visibility = val;
            if( _visibility ){
              this.tray.minimized = false;
            }
            else {
              this.tray.minimized = true;
            }
          }
        }
      }
    });

    var orderedTrackEvents = butter.orderedTrackEvents = [],
        sortTrackEvents = function( a, b ) {
          return a.popcornOptions.start > b .popcornOptions.start;
        };

    butter.listen( "trackeventadded", function( e ) {
      var trackEvent = e.data;
      orderedTrackEvents.push( trackEvent );
      orderedTrackEvents.sort( sortTrackEvents );
    }); // listen

    butter.listen( "trackeventremoved", function( e ) {
      var trackEvent = e.data,
          index = orderedTrackEvents.indexOf( trackEvent );
      if( index > -1 ){
        orderedTrackEvents.splice( index, 1 );
      } // if
    }); // listen

    butter.listen( "trackeventupdated", function() {
      orderedTrackEvents.sort( sortTrackEvents );
    }); // listen

    var processKey = {
      32: function( e ) { // space key
        e.preventDefault();

        if( butter.currentMedia.ended ){
          butter.currentMedia.paused = false;
        }
        else{
          butter.currentMedia.paused = !butter.currentMedia.paused;
        }
      }, // space key

      // left key
      37: function( e ) {
        var amount = e.shiftKey ? NUDGE_INCREMENT_LARGE : NUDGE_INCREMENT_SMALL,

            // Sorted selected events are used here because they should be moved from right to left.
            // Otherwise, overlapping can occur instantly, producing unexpected results.
            selectedEvents = butter.sortedSelectedEvents,

            i, seLength;

        if( selectedEvents.length ) {
          e.preventDefault();
          if ( e.ctrlKey || e.metaKey ) {
            for( i = 0, seLength = selectedEvents.length; i < seLength; ++i ) {
              shrinkTrackEvent( selectedEvents[ i ], amount );
            }
          }
          else {
            for( i = selectedEvents.length - 1; i >= 0; --i ) {
              moveTrackEventLeft( selectedEvents[ i ], amount );
            }
          }
        }
        else {
          butter.currentTime -= amount;
        }
      },

      // up key
      38: function( e ) {
        var track,
            trackEvent,
            nextTrack,

            //copy this selectedEvents because it will change inside loop
            selectedEvents = butter.selectedEvents.slice();

        if ( selectedEvents.length ) {
          e.preventDefault();
        }

        for ( var i = 0, seLength = selectedEvents.length; i < seLength; i++ ) {
          trackEvent = selectedEvents[ i ];
          track = trackEvent.track;
          nextTrack = butter.currentMedia.getLastTrack( track );
          if ( nextTrack && !nextTrack.findOverlappingTrackEvent( trackEvent ) ) {
            track.removeTrackEvent( trackEvent );
            nextTrack.addTrackEvent( trackEvent );
          }
        }
      },

      // right key
      39: function( e ) {
        var amount = e.shiftKey ? NUDGE_INCREMENT_LARGE : NUDGE_INCREMENT_SMALL,

            // Sorted selected events are used here because they should be moved from right to left.
            // Otherwise, overlapping can occur instantly, producing unexpected results.
            selectedEvents = butter.sortedSelectedEvents,

            i, seLength;

        if( selectedEvents.length ) {
          e.preventDefault();
          if ( e.ctrlKey || e.metaKey ) {
            for( i = 0, seLength = selectedEvents.length; i < seLength; ++i ) {
              growTrackEvent( selectedEvents[ i ], amount );
            }
          }
          else {
            for( i = 0, seLength = selectedEvents.length; i < seLength; ++i ) {
              moveTrackEventRight( selectedEvents[ i ], amount );
            }
          }
        }
        else {
          butter.currentTime += amount;
        }
      },

      // down key
      40: function( e ) {
        var track,
            trackEvent,
            nextTrack,

            //copy this selectedEvents because it will change inside loop
            selectedEvents = butter.selectedEvents.slice();

        if ( selectedEvents.length ) {
          e.preventDefault();
        }

        for ( var i = 0, seLength = selectedEvents.length; i < seLength; i++ ) {
          trackEvent = selectedEvents[ i ];
          track = trackEvent.track;
          nextTrack = butter.currentMedia.getNextTrack( track );
          if ( nextTrack && !nextTrack.findOverlappingTrackEvent( trackEvent ) ) {
            track.removeTrackEvent( trackEvent );
            nextTrack.addTrackEvent( trackEvent );
          }
        }
      },

      27: function() { // esc key
        if ( !DragNDrop.isDragging ) {
          butter.deselectAllTrackEvents();
        }
      },

      8: function( e ) { // del key
        var selectedEvents = butter.selectedEvents.slice(),             // Copy selectedEvents array to circumvent it changing
                                                                        // if deletion actually occurs, while still taking
                                                                        // advantage of caching.
            selectedEvent,
            dialog,
            i, l = selectedEvents.length;

        e.preventDefault();

        if( selectedEvents.length ) {

          // If any event is being dragged or resized we don't want to
          // allow deletion.
          for( i = 0; i < l; i++ ) {
            if ( selectedEvents[ i ].uiInUse ) {
              return;
            }
          }

          // If we have one track event just delete it, otherwise display a warning dialog.
          if ( selectedEvents.length === 1 ) {
            selectedEvent = selectedEvents[ 0 ];
            butter.editor.closeTrackEventEditor( selectedEvent );
            selectedEvent.track.removeTrackEvent( selectedEvent );
            return;
          }

          // Delete the events with warning dialog.
          dialog = Dialog.spawn( "delete-track", {
            data: selectedEvents.length + " track events",
            events: {
              submit: function() {
                for( i = 0; i < l; i++ ) {
                  selectedEvent = selectedEvents[ i ];
                  butter.editor.closeTrackEventEditor( selectedEvent );
                  selectedEvent.track.removeTrackEvent( selectedEvent );
                }
                dialog.close();
              },
              cancel: function() {
                dialog.close();
              }
            }
          });
          dialog.open();
        }
      },

      9: function( e ) { // tab key
        if( orderedTrackEvents.length && butter.selectedEvents.length <= 1 ){
          e.preventDefault();
          var index = 0,
              direction = e.shiftKey ? -1 : 1;
          if( orderedTrackEvents.indexOf( butter.selectedEvents[ 0 ] ) > -1 ){
            index = orderedTrackEvents.indexOf( butter.selectedEvents[ 0 ] );
            if( orderedTrackEvents[ index+direction ] ){
              index+=direction;
            } else if( !e.shiftKey ){
              index = 0;
            } else {
              index = orderedTrackEvents.length - 1;
            } // if
          } // if
          butter.deselectAllTrackEvents();
          orderedTrackEvents[ index ].selected = true;
        } // if
      }, // tab key

      67: function( e ) { // c key
        if ( e.ctrlKey || e.metaKey ) {
          butter.copyTrackEvents();
        }
      }, // c key

      86: function( e ) { // v key
        if ( e.ctrlKey || e.metaKey ) {
          butter.pasteTrackEvents();
        }
      }, // v key
    };

    function onKeyDown( e ){
      var key = e.which || e.keyCode,
          eTarget = e.target;
      // this allows backspace and del to do the same thing on windows and mac keyboards
      key = key === 46 ? 8 : key;
      if( processKey[ key ] && !eTarget.isContentEditable && __unwantedKeyPressElements.indexOf( eTarget.nodeName ) === -1 ){

        if ( __disabledKeyRepeats.indexOf( key ) > -1 ) {
          window.removeEventListener( "keydown", onKeyDown, false );
          window.addEventListener( "keyup", onKeyUp, false );
        }

        processKey[ key ]( e );
      } // if
    }

    function onKeyUp() {
      window.removeEventListener( "keyup", onKeyUp, false );
      window.addEventListener( "keydown", onKeyDown, false );
    }

    function unbindKeyDownListener() {
      window.removeEventListener( "keydown", onKeyDown, false );
    }

    function bindKeyDownListener() {
      window.addEventListener( "keydown", onKeyDown, false );
    }

    DragNDrop.listen( "dragstarted", unbindKeyDownListener );
    DragNDrop.listen( "dragstopped", bindKeyDownListener );
    DragNDrop.listen( "resizestarted", unbindKeyDownListener );
    DragNDrop.listen( "resizestopped", bindKeyDownListener );
    DragNDrop.listen( "sortstarted", unbindKeyDownListener );
    DragNDrop.listen( "sortstopped", bindKeyDownListener );

    this.TRANSITION_DURATION = TRANSITION_DURATION;

    _toggler.visible = false;
    _this.visible = false;

    this.loadIndicator = {
      start: function(){
        _this.tray.toggleLoadingSpinner( true );
      },
      stop: function(){
        _this.tray.toggleLoadingSpinner( false );
      }
    };

    _this.loadIndicator.start();

    butter.listen( "ready", function(){
      _this.loadIndicator.stop();
      //_this.visible = true;
      _this.tray.show();
    });

    butter.listen( "mediacontentchanged", function() {
      unbindKeyDownListener();
      _this.loadIndicator.start();
      _toggler.visible = false;
      butter.ui.visible = false;
      //_toggler.state = true;
    });

    butter.listen( "mediaready", function() {
      _this.loadIndicator.stop();
      _toggler.visible = true;
      //butter.ui.visible = true;
      //_toggler.state = false;
      _toggler.state = true;
      bindKeyDownListener();
    });

    _this.dialogDir = butter.config.value( "dirs" ).dialogs || "";

    // This is an easter egg to open a UI kit editor. Hurrah
    _this.showUIKit = function() {
      butter.editor.openEditor( "ui-kit" );
    };

  } //UI

  UI.__moduleName = "ui";

  return UI;

});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('util/tutorial',[ "ui/widget/tooltip" ],

function( ToolTip ) {

  function toolTipPlugin() {

    function normalize( value ) {

      if ( typeof value === "number" || ( typeof value === "string" && !/(px|%)$/.test( value ) ) ) {
        return value + "%";
      }

      return value;
    }

    return {
      _setup: function( options ) {

        options.name = options.name || Popcorn.guid( "tooltip-" );
        options._parent = Popcorn.dom.find( options.element );
        options.hover = !!options.hover;
        options.hidden = !!options.hidden;
        options.message = options.message || "";

        ToolTip.create({
          name: options.name,
          element: options._parent,
          message: options.message,
          top: normalize( options.top ),
          left: normalize( options.left ),
          hidden: options.hidden,
          hover: options.hover
        });

        options._toolTipReference = ToolTip.get( options.name );
      },
      start: function( event, options ) {
        var toolTipRef = options._toolTipReference;
        if ( toolTipRef ) {
          toolTipRef.hidden = false;
        }
      },
      end: function( event, options ) {
        var toolTipRef = options._toolTipReference;
        if ( toolTipRef ) {
          toolTipRef.hidden = true;
        }
      },
      _teardown: function( options ) {
        var toolTipRef = options._toolTipReference;
        if ( toolTipRef ) {
          toolTipRef.destroy();
        }
      }
    };
  }

  function editorControllerPlugin( butter ) {
    return function() {
      var editorTypes = [ "media-editor", "plugin-list", "share-properties" ];

      function openEditor( type ) {
        if ( editorTypes.indexOf( type ) !== -1 ) {
          butter.editor.openEditor( type );
        }
      }

      return {
        start: function( event, options ) {
          openEditor( options.type );
        },
        end: Popcorn.nop
      };
    };
  }

  function makeTips( popcornInstance, tips ) {
    for ( var i = tips.length - 1; i >= 0; i-- ) {
      popcornInstance.tooltip( tips[ i ] );
    }
  }

  function makeEditorEvents( popcornInstance, events ) {
    var controllerOptions;
    for ( var i = events.length - 1; i >= 0; i-- ) {
      controllerOptions = events[ i ];
      popcornInstance.editorController( controllerOptions );
    }
  }

  return {

    // Build tutorial tool tips and set up timing
    build: function( butter, tutorialData ) {
      var toolTipPopcornInstance;

      Popcorn.plugin( "tooltip", toolTipPlugin );
      Popcorn.plugin( "editorController", editorControllerPlugin( butter ) );

      toolTipPopcornInstance = new Popcorn( butter.currentMedia.target );

      butter.listen( "ready", function() {

        makeTips( toolTipPopcornInstance, tutorialData.general );

        if ( tutorialData.editorOpenEvents ) {
          makeEditorEvents( toolTipPopcornInstance, tutorialData.editorOpenEvents );
        }
      });

      butter.listen( "editoropened", function( e ) {
        var name = e.data;

        if ( tutorialData[ name ] ) {
          makeTips( toolTipPopcornInstance, tutorialData[ name ] );
          tutorialData[ name ] = null;
        }
      });

    }
  };

});

define('text!default-config.json',[],function () { return '{\n  "name": "default-config",\n  "baseDir": "../",\n  "crashReporter": true,\n  "cssRenderClientSide": false,\n  "snapshotHTMLOnReady": false,\n  "scrapePage": true,\n  "backupInterval": 0,\n  "title": "Popcorn Maker",\n  "ui": {\n    "enabled": true,\n    "onLeaveDialog": true,\n    "trackEventHighlight": "click"\n  },\n  "makeVideoURLsUnique": true,\n  "mediaDefaults": {\n    "frameAnimation": true\n  },\n  "trackEvent": {\n    "defaultDuration": 5\n  },\n  "plugin": {\n    "plugins": [\n      {\n        "type": "text",\n        "path": "{{baseDir}}templates/assets/plugins/text/popcorn.text.js",\n        "icon": "{{baseDir}}templates/assets/plugins/text/text-icon.png"\n      },\n      {\n        "type": "popup",\n        "path": "{{baseDir}}templates/assets/plugins/popup/popcorn.popup.js",\n        "icon": "{{baseDir}}templates/assets/plugins/popup/popup-icon.png"\n      },\n      {\n        "type": "googlemap",\n        "path": "{{baseDir}}templates/assets/plugins/googlemap/popcorn.googlemap.js",\n        "icon": "{{baseDir}}resources/icons/map.png"\n      },\n      {\n        "type": "twitter",\n        "path": "{{baseDir}}templates/assets/plugins/twitter/popcorn.twitter.js",\n        "icon": "{{baseDir}}templates/assets/plugins/twitter/twitter-icon.png"\n      },\n      {\n        "type": "image",\n        "path": "{{baseDir}}templates/assets/plugins/image/popcorn.image.js",\n        "icon": "{{baseDir}}templates/assets/plugins/image/image-icon.png"\n      },\n      {\n        "type": "loopPlugin",\n        "displayName": "loop",\n        "path": "{{baseDir}}templates/assets/plugins/loopPlugin/popcorn.loopPlugin.js",\n        "icon": "{{baseDir}}templates/assets/plugins/loopPlugin/loop-icon.png"\n      },\n      {\n        "type": "skip",\n        "path": "{{baseDir}}templates/assets/plugins/skip/popcorn.skip.js",\n        "icon": "{{baseDir}}templates/assets/plugins/skip/skip-icon.png"\n      },\n      {\n        "type": "pausePlugin",\n        "displayName": "Pause",\n        "path": "{{baseDir}}templates/assets/plugins/pausePlugin/popcorn.pausePlugin.js",\n        "icon": "{{baseDir}}templates/assets/plugins/pausePlugin/pause-icon.png"\n      },\n      {\n        "type": "wikipedia",\n        "path": "{{baseDir}}templates/assets/plugins/wikipedia/popcorn.wikipedia.js",\n        "icon": "{{baseDir}}templates/assets/plugins/wikipedia/wikipedia-icon.png"\n      },\n      {\n        "type": "sequencer",\n        "hidden": true,\n        "path": "{{baseDir}}templates/assets/plugins/sequencer/popcorn.sequencer.js",\n        "icon": "{{baseDir}}resources/icons/media.png"\n      }\n    ],\n    "defaults": [\n      "text",\n      "popup",\n      "googlemap",\n      "twitter",\n      "image",\n      "wikipedia",\n      "loopPlugin",\n      "pausePlugin",\n      "skip",\n      "sequencer"\n    ]\n  },\n  "player": {\n    "players": [\n      {\n        "type": "youtube",\n        "path": "{{baseDir}}external/popcorn-js/players/youtube/popcorn.youtube.js"\n      },\n      {\n        "type": "soundcloud",\n        "path": "{{baseDir}}external/popcorn-js/players/soundcloud/popcorn.soundcloud.js"\n      },\n      {\n        "type": "vimeo",\n        "path": "{{baseDir}}external/popcorn-js/players/vimeo/popcorn.vimeo.js"\n      }\n    ],\n    "defaults": [\n      "youtube",\n      "soundcloud",\n      "vimeo"\n    ]\n  },\n  "wrapper": {\n    "wrappers": [\n      {\n        "type": "html5",\n        "path": "{{baseDir}}external/popcorn-js/wrappers/html5/popcorn.HTMLMediaElement.js"\n      },\n      {\n        "type": "soundcloud",\n        "path": "{{baseDir}}external/popcorn-js/wrappers/soundcloud/popcorn.HTMLSoundCloudAudioElement.js"\n      },\n      {\n        "type": "youtube",\n        "path": "{{baseDir}}external/popcorn-js/wrappers/youtube/popcorn.HTMLYouTubeVideoElement.js"\n      },\n      {\n        "type": "vimeo",\n        "path": "{{baseDir}}external/popcorn-js/wrappers/vimeo/popcorn.HTMLVimeoVideoElement.js"\n      },\n      {\n        "type": "null",\n        "path": "{{baseDir}}external/popcorn-js/wrappers/null/popcorn.HTMLNullVideoElement.js"\n      }\n    ],\n    "defaults": [\n      "html5",\n      "soundcloud",\n      "vimeo",\n      "null"\n    ]\n  },\n  "dirs": {\n    "popcorn-js": "{{baseDir}}external/popcorn-js/",\n    "css": "{{baseDir}}css/",\n    "resources": "{{baseDir}}resources/",\n    "tools": "{{baseDir}}tools/"\n  },\n  "icons": {\n    "default": "popcorn-icon.png",\n    "image": "image-icon.png"\n  }\n}\n';});

define('text!layouts/ua-warning.html',[],function () { return '<div class="butter-ua-warning" data-butter-exclude>\n  <span>\n    Your web browser may lack some functionality expected by Popcorn Maker to function properly. Please upgrade your browser or <a href="https://webmademovies.lighthouseapp.com/projects/65733-popcorn-maker">file a bug</a> to find out why your browser isn\'t fully supported. Click <a href="#" class="close-button">here</a> to remove this warning.</span>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('core/project', [ "core/eventmanager", "core/media" ],
        function( EventManager, Media ) {

  var __butterStorage = window.localStorage;

  function Project( butter ) {

    var _this = this,
        _id, _name, _template, _author, _dataObject,
        _publishUrl, _iframeUrl, _remixedFrom,

        // Whether or not a save to server is required (project data has changed)
        _isDirty = false,

        // Whether or not a backup to storage is required (project data has changed)
        _needsBackup = false,

        // Whether or not the project is saved to the db and published.
        // The notion of "saving" to consumers of this code is unware of
        // the save vs. publish distinction. As such, we use isSaved externally
        // and isPublished internally, where Publish follows Save and is
        // more correct.
        _isPublished = false,

        // How often to backup data in ms. If 0, no backups are done.
        _backupIntervalMS = butter.config.value( "backupInterval" )|0,

        // Interval for backups, starts first time user clicks Save.
        _backupInterval = -1;

    function invalidate() {
      // Project is dirty, needs save, backup
      _isDirty = true;
      _needsBackup = true;

      // If the project has an id (if it was saved), start backups again
      // since they may have been stopped if LocalStorage size limits were
      // exceeded.
      if ( _id ) {
        startBackups();
      }

      // Let consumers know that the project changed
      _this.dispatch( "projectchanged" );
    }

    // Manage access to project properties.  Some we only want
    // to be read (and managed by db/butter), others we want to
    // affect save logic.
    Object.defineProperties( _this, {
      "id": {
        get: function() {
          return _id;
        },
        enumerable: true
      },

      "name": {
        get: function() {
          return _name;
        },
        set: function( value ) {
          if ( value !== _name ) {
            _name = value;
            invalidate();
          }
        },
        enumerable: true
      },

      "template": {
        get: function() {
          return _template;
        },
        set: function( value ) {
          if ( value !== _template ) {
            _template = value;
            invalidate();
          }
        },
        enumerable: true
      },

      "author": {
        get: function() {
          return _author;
        },
        set: function( value ) {
          if ( value !== _author ) {
            _author = value;
            invalidate();
          }
        },
        enumerable: true
      },

      "data": {
        get: function() {
          // Memoize value, since it doesn't always change
          if ( !_dataObject || _isDirty ) {
            var exportJSONMedia = [];
            for ( var i = 0; i < butter.media.length; ++i ) {
              exportJSONMedia.push( butter.media[ i ].json );
            }
            _dataObject = {
              targets: butter.serializeTargets(),
              media: exportJSONMedia
            };
          }
          return _dataObject;
        },
        enumerable: true
      },

      "publishUrl": {
        get: function() {
          return _publishUrl;
        },
        enumerable: true
      },

      "previewUrl": {
        get: function() {
          return _publishUrl + "?preview=true";
        },
        enumerable: true
      },

      "iframeUrl": {
        get: function() {
          return _iframeUrl;
        },
        enumerable: true
      },

      // Have changes made it to the db and been published?
      "isSaved": {
        get: function() {
          return _isPublished && !_isDirty;
        },
        enumerable: true
      }

    });

    EventManager.extend( _this );

    // Once saved data is loaded, and media is ready, we start to care about
    // the app's data states changing, and want to track.
    butter.listen( "mediaready", function mediaReady() {
      butter.unlisten( "mediaready", mediaReady );

      // Listen for changes in the project data so we know when to save.
      [ "mediacontentchanged",
        "mediatargetchanged",
        "trackadded",
        "trackremoved",
        "tracktargetchanged",
        "trackeventadded",
        "trackeventremoved",
        "trackeventupdated"
      ].forEach( function( event ) {
        butter.listen( event, invalidate );
      });
    });

    function startBackups() {
      if ( _backupInterval === -1 && _backupIntervalMS > 0 ) {
        _needsBackup = true;
        _backupInterval = setInterval( backupData, _backupIntervalMS );
        // Do a backup now so we don't miss anything
        backupData();
      }
    }

    // Import project data from JSON (i.e., created with project.export())
    _this.import = function( json ) {
      var oldTarget, targets, targetData,
          mediaData, media, m, i, l;

      // If JSON, convert to Object
      if ( typeof json === "string" ) {
        try {
          json = JSON.parse( json );
        } catch( e ) {
          return;
        }
      }

      if ( json.projectID ) {
        _id = json.projectID;
        _isPublished = true;
      }

      if ( json.name ) {
        _name = json.name;
      }

      if ( json.template ) {
        _template = json.template;
      }

      if ( json.author ) {
        _author = json.author;
      }

      if ( json.publishUrl ) {
        _publishUrl = json.publishUrl;
      }

      if ( json.iframeUrl ) {
        _iframeUrl = json.iframeUrl;
      }

      if ( json.remixedFrom ) {
        _remixedFrom = json.remixedFrom;
      }

      targets = json.targets;
      if ( targets && Array.isArray( targets ) ) {
        for ( i = 0, l = targets.length; i < l; ++i ) {
          targetData = targets[ i ];
          oldTarget = butter.getTargetByType( "elementID", targetData.element );
          // Only add target if it's not already added.
          if ( !oldTarget ) {
            butter.addTarget( targetData );
          } else {
            // If it was already added, just update its json.
            oldTarget.json = targetData;
          }
        }
      } else if ( console ) {
        console.warn( "Ignored imported target data. Must be in an Array." );
      }

      media = json.media;
      if ( media && Array.isArray( media ) ) {
        for ( i = 0, l = media.length; i < l; ++i ) {
          mediaData = media[ i ];
          m = butter.getMediaByType( "target", mediaData.target );

          if ( !m ) {
            m = new Media();
            m.json = mediaData;
            butter.addMedia( m );
          } else {
            m.json = mediaData;
          }
        }
      } else if ( console ) {
        console.warn( "Ignored imported media data. Must be in an Array." );
      }

      // If this is a restored backup, restart backups now (vs. on first save)
      // since the user indicated they want it.
      if( json.backupDate ) {
        startBackups();
      }

    };

    // Export project data as JSON string (e.g., for use with project.import())
    _this.export = function() {
      return JSON.stringify( _this.data );
    };

    // Expose backupData() to make testing possible
    var backupData = _this.backupData = function() {
      // If the project isn't different from last time, or if it's known
      // to not fit in storage, don't bother trying.
      if ( !_needsBackup ) {
        return;
      }
      // Save everything but the project id
      var data = _this.data;
      data.name = _name;
      data.template = _template;
      data.author = _author;
      data.backupDate = Date.now();
      try {
        __butterStorage.setItem( "butter-backup-project", JSON.stringify( data ) );
        _needsBackup = false;
      } catch ( e ) {
        // Deal with QUOTA_EXCEEDED_ERR when localStorage is full.
        // Stop the backup loop because we know we can't save anymore until the
        // user changes something about the project.
        clearInterval( _backupInterval );
        _backupInterval = -1;

        // Purge the saved project, since it won't be complete.
        __butterStorage.removeItem( "butter-backup-project" );

        console.warn( "Warning: Popcorn Maker LocalStorage quota exceeded. Stopping automatic backup. Will be restarted when project changes again." );
      }
    };

    // Save and Publish a project.  Saving only happens if project data needs
    // to be saved (i.e., it has been changed since last save, or was never
    // saved before).
    _this.save = function( callback ) {
      if ( !callback ) {
        callback = function() {};
      }

      // Don't save if there is nothing new to save.
      if ( _this.isSaved ) {
        callback({ error: "okay" });
        return;
      }

      var projectJSON = JSON.stringify({
        id: _id,
        name: _name,
        template: _template,
        author: _author,
        data: _this.data,
        remixedFrom: _remixedFrom
      });

      // Save to local storage first in case network is down.
      backupData();

      // Save to db, then publish
      butter.cornfield.save( _id, projectJSON, function( e ) {
        if ( e.error === "okay" ) {
          // Since we've now fully saved, blow away autosave backup
          _isDirty = false;
          __butterStorage.removeItem( "butter-backup-project" );

          // Start keeping backups in storage, if not already started
          startBackups();

          // If this was a first save, grab id generated by server and store
          if ( !_id ) {
            _id = e.projectId;
          }

          // Now Publish and get URLs for embed
          butter.cornfield.publish( _id, function( e ) {
            if ( e.error === "okay" ) {
              // Save + Publish is OK
              _isPublished = true;
              _publishUrl = e.publishUrl;
              _iframeUrl = e.iframeUrl;
            }

            // Let consumers know that the project is now saved;
            _this.dispatch( "projectsaved" );

            callback( e );
          });
        } else {
          callback( e );
        }
      });
    };
  }

  // Check for an existing project that was autosaved but not saved.
  // Returns project backup data as JS object if found, otherwise null.
  // NOTE: caller must create a new Project object and call import.
  Project.checkForBackup = function( butter, callback ) {
    // See if we already have a project autosaved from another session.
    var projectBackup, backupDate;

    // For testing purposes, we can skip backup recovery
    if ( butter.config.value( "recover" ) === "purge" ) {
      callback( null, null );
      return;
    }

    try {
      projectBackup = __butterStorage.getItem( "butter-backup-project" );
      projectBackup = JSON.parse( projectBackup );

      // Delete since user can save if he/she wants.
      __butterStorage.removeItem( "butter-backup-project" );

      if ( projectBackup ) {
        backupDate = projectBackup.backupDate;
      }
    } catch( e ) { }

    callback( projectBackup, backupDate );
  };

  return Project;
});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function () {

  var WARNING_WAIT_TIME = 500;

  var ACCEPTED_UA_LIST = {
    "Chrome": 17,
    "Firefox": 10,
    "IE": 9,
    "Safari": 6,
    "Opera": 12
  },

  MOBILE_OS_BLACKLIST = [
    "Android",
    "iOS",
    "BlackBerry",
    "MeeGo",
    "Windows Phone OS",
    "Firefox OS",
    // For BB Playbook
    "RIM Tablet OS"
  ];

  define('main', [
            "core/eventmanager", "core/logger", "core/config", "core/track",
            "core/target", "core/media", "core/page",
            "./modules", "./dependencies", "./dialogs",
            "dialog/dialog", "editor/editor", "ui/ui",
            "util/xhr", "util/lang", "util/tutorial",
            "text!default-config.json", "text!layouts/ua-warning.html",
            "ui/widget/tooltip", "core/project"
          ],
          function(
            EventManager, Logger, Config, Track,
            Target, Media, Page,
            Modules, Dependencies, Dialogs,
            Dialog, Editor, UI,
            XHR, Lang, Tutorial,
            DEFAULT_CONFIG_JSON, UA_WARNING_LAYOUT,
            ToolTip, Project
          ){

    // Satisfy lint by making reference non-global
    var UAParser = window.UAParser;

    var __guid = 0;

    var Butter = {};

    Butter.ToolTip = ToolTip;

    Butter.showUAWarning = function() {
      var uaWarningDiv = Lang.domFragment( UA_WARNING_LAYOUT, ".butter-ua-warning" );
      document.body.appendChild( uaWarningDiv );
      setTimeout(function() {
        uaWarningDiv.classList.add( "slide-out" );
      }, WARNING_WAIT_TIME );
      uaWarningDiv.getElementsByClassName( "close-button" )[ 0 ].onclick = function () {
        document.body.removeChild( uaWarningDiv );
      };
    };

    Butter.init = function( butterOptions ) {

      // ua-parser uses the current browsers UA by default
      var ua = new UAParser().getResult(),
          name = ua.browser.name,
          major = ua.browser.major,
          os = ua.os.name,
          acceptedUA = false;

      for ( var uaName in ACCEPTED_UA_LIST ) {
        if ( ACCEPTED_UA_LIST.hasOwnProperty( uaName ) && MOBILE_OS_BLACKLIST.indexOf( os ) === -1 ) {
          if ( name === uaName ) {
            if ( +major >= ACCEPTED_UA_LIST[ uaName ] ) {
              acceptedUA = true;
            }
          }
        }
      }

      if ( !acceptedUA ) {
        Butter.showUAWarning();
      }

      butterOptions = butterOptions || {};

      var _media = [],
          _currentMedia,
          _targets = [],
          _id = "Butter" + __guid++,
          _logger = new Logger( _id ),
          _page,
          _config,
          _defaultConfig,
          _defaultTarget,
          _this = Object.create( Butter ),
          _selectedEvents = [],
          _copiedEvents = [],
          _sortedSelectedEvents = [],
          _defaultPopcornScripts = {},
          _defaultPopcornCallbacks = {},
          _defaultTrackeventDuration;

      // We use the default configuration in src/default-config.json as
      // a base, and override whatever the user provides in the
      // butterOptions.config file.
      try {
        _defaultConfig = Config.parse( DEFAULT_CONFIG_JSON );
      } catch ( e) {
        throw "Butter Error: unable to find or parse default-config.json";
      }

      if ( butterOptions.debug !== undefined ) {
        Logger.enabled( butterOptions.debug );
      }

      EventManager.extend( _this );

      // Leave a reference on the instance to expose dialogs to butter users at runtime.
      // Especially good for letting people use/create dialogs without being in the butter core.
      _this.dialog = Dialog;

      function checkMedia() {
        if ( !_currentMedia ) {
          throw new Error("No media object is selected");
        } //if
      } //checkMedia

      function getRelativePosition( position, type ) {

        var mediaPosition = _currentMedia.popcorn.popcorn.position(),
            manifestOptions = Popcorn.manifest[ type ].options,
            minWidth = manifestOptions.width ? manifestOptions.width.default : 0,
            minHeight = manifestOptions.height ? manifestOptions.height.default : 0,
            calculatedLeft = ( ( position[ 0 ] - mediaPosition.left ) / mediaPosition.width ) * 100,
            calculatedTop = ( ( position[ 1 ] - mediaPosition.top ) / mediaPosition.height ) * 100;

        if ( calculatedLeft + minWidth > 100 ) {
          calculatedLeft = 100 - minWidth;
        }

        if ( calculatedTop + minHeight > 100 ) {
          calculatedTop = 100 - minHeight;
        }

        return [ calculatedLeft, calculatedTop ];
      }

      _this.getManifest = function ( name ) {
        checkMedia();
        return _currentMedia.getManifest( name );
      }; //getManifest

      _this.generateSafeTrackEvent = function( type, start, end, track, position ) {
        var trackEvent,
            relativePosition,
            popcornOptions = {};

        if ( start + _defaultTrackeventDuration > _currentMedia.duration ) {
          start = _currentMedia.duration - _defaultTrackeventDuration;
        }

        if ( start < 0 ) {
          start = 0;
        }

        if ( !end && end !== 0 ) {
          end = start + _defaultTrackeventDuration;
        }

        if ( end > _currentMedia.duration ) {
          end = _currentMedia.duration;
        }

        if ( !_defaultTarget ) {
          console.warn( "No targets to drop events!" );
          return;
        }

        if ( !( track instanceof Track ) ) {
          if ( track && track.constructor === Array ) {
            position = track;
          }
          track = _currentMedia.orderedTracks[ 0 ];
        }

        track = track || _currentMedia.addTrack();

        if ( track.findOverlappingTrackEvent( start, end ) ) {
          track = _currentMedia.insertTrackBefore( track );
        }

        popcornOptions.start = start;
        popcornOptions.end = end;
        popcornOptions.target = _defaultTarget.elementID;

        if ( position ) {
          relativePosition = getRelativePosition( position, type );
          popcornOptions.left = relativePosition[ 0 ];
          popcornOptions.top = relativePosition[ 1 ];
        }

        trackEvent = track.addTrackEvent({
          popcornOptions: popcornOptions,
          type: type
        });

        _defaultTarget.view.blink();

        return trackEvent;
      };

      function targetTrackEventRequested( e ) {
        var trackEvent,
            popcornOptions,
            start = _currentMedia.currentTime,
            end;

        if ( e.data.popcornOptions ) {
          popcornOptions = {};
          for ( var prop in e.data.popcornOptions ) {
            if ( e.data.popcornOptions.hasOwnProperty( prop ) ) {
              popcornOptions[ prop ] = e.data.popcornOptions[ prop ];
            }
          }
        }

        if ( _currentMedia && _currentMedia.ready ) {
          if ( popcornOptions && popcornOptions.end ) {
            end = popcornOptions.end + start;
          }
          trackEvent = _this.generateSafeTrackEvent( e.data.element.getAttribute( "data-popcorn-plugin-type" ), start, end, e.data.position );
          if ( popcornOptions ) {
            if ( popcornOptions.end ) {
              popcornOptions.end = trackEvent.popcornOptions.end;
            }
            trackEvent.update( popcornOptions );
          }
          _this.editor.editTrackEvent( trackEvent );
        }
        else {
          _logger.log( "Warning: No media to add dropped trackevent." );
        }
      }

      function mediaTrackEventRequested( e ) {
        var trackEvent;
        if ( _currentMedia.ready ) {
          trackEvent = _this.generateSafeTrackEvent( e.data.getAttribute( "data-popcorn-plugin-type" ), _currentMedia.currentTime );
          _this.editor.editTrackEvent( trackEvent );
        }
      }

      function mediaPlayerTypeRequired( e ){
        _page.addPlayerType( e.data );
      }

      function trackEventTimeSortingFunction( a, b ) {
        return a.popcornOptions.start < b.popcornOptions.start ? 1 : -1;
      }

      function sortSelectedEvents() {
        _sortedSelectedEvents = _selectedEvents.slice().sort( trackEventTimeSortingFunction );
      }

      function onTrackEventSelected( notification ) {
        var trackEvent = notification.origin;
        for ( var i = _selectedEvents.length - 1; i >= 0; i-- ) {
          if ( _selectedEvents[ i ] === trackEvent ) {
            return;
          }
        }
        _selectedEvents.push( trackEvent );
        sortSelectedEvents();
      }

      function onTrackEventDeSelected( notification ) {
        var trackEvent = notification.origin,
            idx = _selectedEvents.indexOf( trackEvent );
        if ( idx > -1 ) {
          _selectedEvents.splice( idx, 1 );
          sortSelectedEvents();
        }
      }

      function onTrackEventAdded( e ) {
        var trackEvent = e.data;

        trackEvent.subscribe( "selected", onTrackEventSelected );
        trackEvent.subscribe( "deselected", onTrackEventDeSelected );

        if ( trackEvent.selected && _selectedEvents.indexOf( trackEvent ) === -1 ) {
          _selectedEvents.push( trackEvent );
          sortSelectedEvents();
        }
      }

      function onTrackEventRemoved( e ) {
        var trackEvent = e.data,
            idx = _selectedEvents.indexOf( trackEvent );

        trackEvent.unsubscribe( "selected", onTrackEventSelected );
        trackEvent.unsubscribe( "deselected", onTrackEventDeSelected );

        if ( idx > -1 ) {
          _selectedEvents.splice( idx, 1 );
          sortSelectedEvents();
        }
      }

      _this.deselectAllTrackEvents = function() {
        // selectedEvents' length will change as each trackevent's selected property
        // is set to false, so use a while loop here to loop through the continually
        // shrinking selectedEvents array.
        while ( _selectedEvents.length ) {
          _selectedEvents[ 0 ].selected = false;
        }
        _sortedSelectedEvents = [];
      };

      _this.copyTrackEvents = function() {
        if ( _sortedSelectedEvents.length ) {
          _copiedEvents = [];
          for ( var i = 0; i < _sortedSelectedEvents.length; i++ ) {
            _copiedEvents.unshift( _sortedSelectedEvents[ i ].copy() );
          }
        }
      };

      _this.pasteTrackEvents = function() {
        var popcornOptions,
            offset = 0,
            trackEvent;
        // get the first events start time to compare with the current time,
        // to find the paste offset.
        if ( _copiedEvents[ 0 ] ) {
          _this.deselectAllTrackEvents();
          offset = _currentMedia.currentTime - _copiedEvents[ 0 ].popcornOptions.start;
          for ( var i = 0; i < _copiedEvents.length; i++ ) {
            popcornOptions = {};
            for ( var prop in _copiedEvents[ i ].popcornOptions ) {
              if ( _copiedEvents[ i ].popcornOptions.hasOwnProperty( prop ) ) {
                popcornOptions[ prop ] = _copiedEvents[ i ].popcornOptions[ prop ];
              }
            }
            popcornOptions.start = popcornOptions.start + offset;
            popcornOptions.end = popcornOptions.end + offset;
            if ( popcornOptions.start > _currentMedia.duration ) {
              // do not paste events outside of the duration
              break;
            } else if ( popcornOptions.end > _currentMedia.duration ) {
              // cut off events that overlap the duration
              popcornOptions.end = _currentMedia.duration;
            }
            trackEvent = _this.generateSafeTrackEvent( _copiedEvents[ i ].type, popcornOptions.start, popcornOptions.end );
            trackEvent.update( popcornOptions );
            trackEvent.selected = true;
          }
        }
      };

       /****************************************************************
       * Target methods
       ****************************************************************/
      //addTarget - add a target object
      _this.addTarget = function ( target ) {
        if ( !(target instanceof Target ) ) {
          target = new Target( target );
        } //if
        _targets.push( target );
        target.listen( "trackeventrequested", targetTrackEventRequested );
        _logger.log( "Target added: " + target.name );
        _this.dispatch( "targetadded", target );
        if ( target.isDefault || !_defaultTarget ) {
          _defaultTarget = target;
        }
        return target;
      }; //addTarget

      //removeTarget - remove a target object
      _this.removeTarget = function ( target ) {
        if ( typeof(target) === "string" ) {
          target = _this.getTargetByType( "id", target );
        } //if
        var idx = _targets.indexOf( target );
        if ( idx > -1 ) {
          target.unlisten( "trackeventrequested", targetTrackEventRequested );
          _targets.splice( idx, 1 );
          _this.dispatch( "targetremoved", target );
          if ( _defaultTarget === target ) {
            _defaultTarget = _targets.length > 0 ? _targets[ 0 ] : null;
          }
          return target;
        }
        return null;
      };

      //serializeTargets - get a list of targets objects
      _this.serializeTargets = function () {
        var sTargets = [];
        for ( var i=0, l=_targets.length; i<l; ++i ) {
          sTargets.push( _targets[ i ].json );
        }
        return sTargets;
      }; //serializeTargets

      //getTargetByType - get the target's information based on a valid type
      // if type is invalid, return undefined
      _this.getTargetByType = function( type, val ) {
        for( var i = 0, l = _targets.length; i < l; i++ ) {
          if ( _targets[ i ][ type ] === val ) {
            return _targets[ i ];
          }
        }
        return undefined;
      }; //getTargetByType

      /****************************************************************
       * Media methods
       ****************************************************************/
      //getMediaByType - get the media's information based on a valid type
      // if type is invalid, return undefined
      _this.getMediaByType = function ( type, val ) {
       for( var i = 0, l = _media.length; i < l; i++ ) {
          if ( _media[ i ][ type ] === val ) {
            return _media[ i ];
          }
        }
        return undefined;
      }; //getMediaByType

      //addMedia - add a media object
      _this.addMedia = function ( media ) {
        if ( !( media instanceof Media ) ) {
          if ( media ) {
            media.makeVideoURLsUnique = _config.value( "makeVideoURLsUnique" );
          }
          media = new Media( media );
        } //if
        media.maxPluginZIndex = _config.value( "maxPluginZIndex" );

        media.popcornCallbacks = _defaultPopcornCallbacks;
        media.popcornScripts = _defaultPopcornScripts;

        _media.push( media );

        _this.chain( media, [
          "mediacontentchanged",
          "mediadurationchanged",
          "mediatargetchanged",
          "mediatimeupdate",
          "mediaready",
          "trackadded",
          "trackremoved",
          "tracktargetchanged",
          "trackeventadded",
          "trackeventremoved",
          "trackeventupdated",
          "trackorderchanged"
        ]);

        var trackEvents;
        if ( media.tracks.length > 0 ) {
          for ( var ti=0, tl=media.tracks.length; ti<tl; ++ti ) {
            var track = media.tracks[ ti ];
                trackEvents = track.trackEvents;
                media.dispatch( "trackadded", track );
            if ( trackEvents.length > 0 ) {
              for ( var i=0, l=trackEvents.length; i<l; ++i ) {
                track.dispatch( "trackeventadded", trackEvents[ i ] );
              } //for
            } //if
          } //for
        } //if

        media.listen( "trackeventadded", onTrackEventAdded );
        media.listen( "trackeventremoved", onTrackEventRemoved );

        media.listen( "trackeventrequested", mediaTrackEventRequested );
        media.listen( "mediaplayertyperequired", mediaPlayerTypeRequired );

        _this.dispatch( "mediaadded", media );
        if ( !_currentMedia ) {
          _this.currentMedia = media;
        } //if
        media.setupContent();
        return media;
      }; //addMedia

      //removeMedia - forget a media object
      _this.removeMedia = function ( media ) {

        var idx = _media.indexOf( media );
        if ( idx > -1 ) {
          _media.splice( idx, 1 );
          _this.unchain( media, [
            "mediacontentchanged",
            "mediadurationchanged",
            "mediatargetchanged",
            "mediatimeupdate",
            "mediaready",
            "trackadded",
            "trackremoved",
            "tracktargetchanged",
            "trackeventadded",
            "trackeventremoved",
            "trackeventupdated",
            "trackorderchanged"
          ]);
          var tracks = media.tracks;
          for ( var i=0, l=tracks.length; i<l; ++i ) {
            _this.dispatch( "trackremoved", tracks[ i ] );
          } //for
          if ( media === _currentMedia ) {
            _currentMedia = undefined;
          } //if

          media.unlisten( "trackeventadded", onTrackEventAdded );
          media.unlisten( "trackeventremoved", onTrackEventRemoved );

          media.unlisten( "trackeventrequested", mediaTrackEventRequested );
          media.unlisten( "mediaplayertyperequired", mediaPlayerTypeRequired );

          _this.dispatch( "mediaremoved", media );
          return media;
        } //if
        return undefined;
      }; //removeMedia

      /****************************************************************
       * Trackevents
       ****************************************************************/
      // Selects all track events for which TrackEvent.property === query.
      // If the third param is true, it selects track events for which TrackEvent.popcornOptions.property === query.
      _this.getTrackEvents = function ( property, query, popcornOption ) {
        var allTrackEvents = _this.orderedTrackEvents,
            filterTrackEvents;

        if ( !property ) {
          return allTrackEvents;
        }

        if ( popcornOption ) {
           filterTrackEvents = function ( el ) {
              return ( el.popcornOptions[ property ] === query );
            };
        } else {
          filterTrackEvents = function ( el ) {
            return ( el[ property ] === query );
          };
        }

        return allTrackEvents.filter( filterTrackEvents );
      };

      // Selects all track events for which TrackEvent.type === query
      _this.getTrackEventsByType = function ( query ) {
        return _this.getTrackEvents( "type", query );
      };

      /****************************************************************
       * Properties
       ****************************************************************/
      Object.defineProperties( _this, {
        defaultTarget: {
          enumerable: true,
          get: function(){
            return _defaultTarget;
          }
        },
        config: {
          enumerable: true,
          get: function(){
            return _config;
          }
        },
        id: {
          get: function(){ return _id; },
          enumerable: true
        },
        tracks: {
          get: function() {
            return _currentMedia.tracks;
          },
          enumerable: true
        },
        targets: {
          get: function() {
            return _targets;
          },
          enumerable: true
        },
        currentTime: {
          get: function() {
            checkMedia();
            return _currentMedia.currentTime;
          },
          set: function( time ) {
            checkMedia();
            _currentMedia.currentTime = time;
          },
          enumerable: true
        },
        duration: {
          get: function() {
            checkMedia();
            return _currentMedia.duration;
          },
          set: function( time ) {
            checkMedia();
            _currentMedia.duration = time;
          },
          enumerable: true
        },
        media: {
          get: function() {
            return _media;
          },
          enumerable: true
        },
        currentMedia: {
          get: function() {
            return _currentMedia;
          },
          set: function( media ) {
            if ( typeof( media ) === "string" ) {
              media = _this.getMediaByType( "id", media.id );
            } //if

            if ( media && _media.indexOf( media ) > -1 ) {
              _currentMedia = media;
              _logger.log( "Media Changed: " + media.name );
              _this.dispatch( "mediachanged", media );
              return _currentMedia;
            } //if
          },
          enumerable: true
        },
        selectedEvents: {
          get: function() {
            return _selectedEvents;
          },
          enumerable: true
        },
        copiedEvents: {
          get: function() {
            return _copiedEvents;
          },
          enumerable: true
        },
        sortedSelectedEvents: {
          get: function() {
            return _sortedSelectedEvents;
          },
          enumerable: true
        },
        debug: {
          get: function() {
            return Logger.enabled();
          },
          set: function( value ) {
            Logger.enabled( value );
          },
          enumerable: true
        },
        defaultTrackeventDuration: {
          enumerable: true,
          get: function() {
            return _defaultTrackeventDuration;
          }
        }
      });

      var preparePage = _this.preparePage = function( callback ){
        var scrapedObject = _page.scrape(),
            targets = scrapedObject.target,
            medias = scrapedObject.media;

        _page.prepare(function() {
          if ( !!_config.value( "scrapePage" ) ) {
            var i, j, il, jl, url, oldTarget, oldMedia, mediaPopcornOptions, mediaObj;
            for( i = 0, il = targets.length; i < il; ++i ) {
              // Only add targets that don't already exist.
              oldTarget = _this.getTargetByType( "elementID", targets[ i ].element );
              if( !oldTarget ){
                _this.addTarget({ element: targets[ i ].id });
              }
            }

            for( i = 0, il = medias.length; i < il; i++ ) {
              oldMedia = null;
              mediaPopcornOptions = null;
              url = "";
              mediaObj = medias[ i ];

              if( mediaObj.getAttribute( "data-butter-source" ) ){
                url = mediaObj.getAttribute( "data-butter-source" );
              }

              if( _media.length > 0 ){
                for( j = 0, jl = _media.length; j < jl; ++j ){
                  if( _media[ j ].id !== medias[ i ].id && _media[ j ].url !== url ){
                    oldMedia = _media[ j ];
                    break;
                  } //if
                } //for
              }
              else{
                if( _config.value( "mediaDefaults" ) ){
                  mediaPopcornOptions = _config.value( "mediaDefaults" );
                }
              } //if

              if( !oldMedia ){
                _this.addMedia({ target: medias[ i ].id, url: url, popcornOptions: mediaPopcornOptions });
              }
            } //for
          }

          if( callback ){
            callback();
          } //if

          _this.dispatch( "pageready" );
        });
      }; //preparePage

      if( butterOptions.ready ){
        _this.listen( "ready", function( e ){
          butterOptions.ready( e.data );
        });
      } //if

      var preparePopcornScriptsAndCallbacks = _this.preparePopcornScriptsAndCallbacks = function( readyCallback ){
        var popcornConfig = _config.value( "popcorn" ) || {},
            callbacks = popcornConfig.callbacks,
            scripts = popcornConfig.scripts,
            toLoad = [],
            loaded = 0;

        // wrap the load function to remember the script
        function genLoadFunction( script ){
          return function(){
            // this = XMLHttpRequest object
            if( this.readyState === 4 ){

              // if the server sent back a bad response, record empty string and log error
              if( this.status !== 200 ){
                _defaultPopcornScripts[ script ] = "";
                _logger.log( "WARNING: Trouble loading Popcorn script: " + this.response );
              }
              else{
                // otherwise, store the response as text
                _defaultPopcornScripts[ script ] = this.response;
              }

              // see if we can call the readyCallback yet
              ++loaded;
              if( loaded === toLoad.length && readyCallback ){
                readyCallback();
              }

            }
          };
        }

        _defaultPopcornCallbacks = callbacks;

        for( var script in scripts ){
          if( scripts.hasOwnProperty( script ) ){
            var url = scripts[ script ],
                probableElement = document.getElementById( url.substring( 1 ) );
            // check to see if an element on the page contains the script we want
            if( url.indexOf( "#" ) === 0 ){
              if( probableElement ){
                _defaultPopcornScripts[ script ] = probableElement.innerHTML;
              }
            }
            else{
              // if not, treat it as a url and try to load it
              toLoad.push({
                url: url,
                onLoad: genLoadFunction( script )
              });
            }
          }
        }

        // if there are scripts to load, load them
        if( toLoad.length > 0 ){
          for( var i = 0; i < toLoad.length; ++i ){
            XHR.get( toLoad[ i ].url, toLoad[ i ].onLoad );
          }
        }
        else{
          // otherwise, call the ready callback right away
          readyCallback();
        }
      };

      /**
       * loadFromSavedDataUrl
       *
       * Attempts to load project data from a specified url and parse it using JSON functionality.
       *
       * @param {String} savedDataUrl: The url from which to attempt to load saved project data.
       * @param {Function} responseCallback: A callback function which is called upon completion (successful or not).
       * @returns: If successfull, an object is returned containing project data. Otherwise, null.
       */
      function loadFromSavedDataUrl( savedDataUrl, responseCallback ) {
        // if no valid url was provided, return early
        if ( !savedDataUrl ) {
          responseCallback();
          return;
        }
        savedDataUrl += "?noCache=" + Date.now();

        XHR.getUntilComplete(
          savedDataUrl,
          function() {
            var savedData;
            try{
              savedData = JSON.parse( this.responseText );
            }
            catch( e ){
              _this.dispatch( "loaddataerror", "Saved data not formatted properly." );
            }
            responseCallback( savedData );
          },
          "application/json",
          {
            "If-Modified-Since": "Fri, 01 Jan 1960 00:00:00 GMT"
          },
          true );
      }

      /**
       * attemptDataLoad
       *
       * Attempts to identify a url from from the query string or supplied config. If one is
       * found, an attempt to load data from the url is made which is imported as project data if successful.
       *
       * @param {Function} finishedCallback: Callback to be called when data loading has completed (successfully or not).
       */
      function attemptDataLoad( finishedCallback ) {
        var savedDataUrl,
            project = new Project( _this );

        // see if savedDataUrl is in the page's query string
        window.location.search.substring( 1 ).split( "&" ).forEach(function( item ){
          item = item.split( "=" );
          if ( item && item[ 0 ] === "savedDataUrl" ) {
            savedDataUrl = item[ 1 ];
          }
        });

        function doImport( savedData ) {
          project.import( savedData );

          if ( savedData.tutorial ) {
            Tutorial.build( _this, savedData.tutorial );
          }
        }

        // attempt to load data from savedDataUrl in query string
        loadFromSavedDataUrl( savedDataUrl, function( savedData ) {
          // if there's no savedData returned, or the returned object does not
          // contain a media attribute, load the config specified saved data
          if ( !savedData || savedData.error || !savedData.media ) {
            // if previous attempt failed, try loading data from the savedDataUrl value in the config
            loadFromSavedDataUrl( _config.value( "savedDataUrl" ), function( savedData ) {
              if ( savedData ) {
                doImport( savedData );
              }
              finishedCallback( project );
            });
          }
          else {
            // otherwise, attempt import
            doImport( savedData );
            finishedCallback( project );
          }
        });

      }

      function readConfig( userConfig ){
        // Override default config options with user settings (if any).
        if( userConfig ){
          _defaultConfig.override( userConfig );
        }

        _config = _defaultConfig;
        _defaultTrackeventDuration = _config.value( "trackEvent" ).defaultDuration;

        //prepare modules first
        var moduleCollection = new Modules( Butter, _this, _config ),
            loader = new Dependencies( _config );

        _this.loader = loader;

        _page = new Page( loader );

        _this.ui = new UI( _this  );

        _this.ui.load(function(){
          //prepare the page next
          preparePopcornScriptsAndCallbacks( function(){
            preparePage( function(){
              moduleCollection.ready( function(){
                // We look for an old project backup in localStorage and give the user
                // a chance to load or discard. If there isn't a backup, we continue
                // loading as normal.
                Project.checkForBackup( _this, function( projectBackup, backupDate ) {

                  function useProject( project ) {
                    project.template = project.template || _config.value( "name" );
                    _this.project = project;
                    _this.chain( project, [ "projectchanged", "projectsaved" ] );

                    // Fire the ready event
                    _this.dispatch( "ready", _this );
                  }

                  if( projectBackup ) {
                    // Found backup, ask user what to do
                    var _dialog = Dialog.spawn( "backup", {
                      data: {
                        backupDate: backupDate,
                        projectName: projectBackup.name,
                        loadProject: function() {
                          // Build a new Project and import projectBackup data
                          var project = new Project( _this );
                          project.import( projectBackup );
                          useProject( project );
                        },
                        discardProject: function() {
                          projectBackup = null;
                          attemptDataLoad( useProject );
                        }
                      }
                    });
                    _dialog.open();
                  } else {
                    // No backup found, keep loading
                    attemptDataLoad( useProject );
                  }
                });
              });
            });
          });
        });

      } //readConfig

      if( butterOptions.config && typeof( butterOptions.config ) === "string" ){
        var xhr = new XMLHttpRequest(),
          userConfig,
          url = butterOptions.config + "?noCache=" + Date.now();

        xhr.open( "GET", url, false );
        if( xhr.overrideMimeType ){
          // Firefox generates a misleading "syntax" error if we don't have this line.
          xhr.overrideMimeType( "application/json" );
        }
        // Deal with caching
        xhr.setRequestHeader( "If-Modified-Since", "Fri, 01 Jan 1960 00:00:00 GMT" );
        xhr.send( null );

        if( xhr.status === 200 || xhr.status === 0 ){
          try{
            userConfig = Config.parse( xhr.responseText );
          }
          catch( e ){
            throw new Error( "Butter config file not formatted properly." );
          }
          readConfig( userConfig );
        }
        else{
          _this.dispatch( "configerror", _this );
        } //if
      }
      else {
        readConfig( Config.reincarnate( butterOptions.config ) );
      } //if

      _this.page = _page;

      // Attach the instance to Butter so we can debug
      Butter.app = _this;

      return _this;
    };

    Butter.Editor = Editor;

    // Butter will report a version, which is the git commit sha
    // of the version we ship. This happens in make.js's build target.
    Butter.version = "v1.0.10-95-gdb955fc";

    // See if we have any waiting init calls that happened before we loaded require.
    if ( window.Butter ) {
      var args = window.Butter.__waiting;
      delete window.Butter;
      if ( args ) {
        Butter.init.apply( this, args );
      }
    }

    window.Butter = Butter;

    return Butter;
  });

}());

}());
