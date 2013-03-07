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

/*
 RequireJS text 2.0.1 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/requirejs/text for details
*/
define('text',["module"],function(e){var t=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"],n=/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,r=/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,i=typeof location!="undefined"&&location.href,s=i&&location.protocol&&location.protocol.replace(/\:/,""),o=i&&location.hostname,u=i&&(location.port||undefined),a=[],f=e.config&&e.config()||{},l,c;return l={version:"2.0.1",strip:function(e){if(e){e=e.replace(n,"");var t=e.match(r);t&&(e=t[1])}else e="";return e},jsEscape:function(e){return e.replace(/(['\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r").replace(/[\u2028]/g,"\\u2028").replace(/[\u2029]/g,"\\u2029")},createXhr:f.createXhr||function(){var e,n,r;if(typeof XMLHttpRequest!="undefined")return new XMLHttpRequest;if(typeof ActiveXObject!="undefined")for(n=0;n<3;n+=1){r=t[n];try{e=new ActiveXObject(r)}catch(i){}if(e){t=[r];break}}return e},parseName:function(e){var t=!1,n=e.indexOf("."),r=e.substring(0,n),i=e.substring(n+1,e.length);return n=i.indexOf("!"),n!==-1&&(t=i.substring(n+1,i.length),t=t==="strip",i=i.substring(0,n)),{moduleName:r,ext:i,strip:t}},xdRegExp:/^((\w+)\:)?\/\/([^\/\\]+)/,useXhr:function(e,t,n,r){var i=l.xdRegExp.exec(e),s,o,u;return i?(s=i[2],o=i[3],o=o.split(":"),u=o[1],o=o[0],(!s||s===t)&&(!o||o.toLowerCase()===n.toLowerCase())&&(!u&&!o||u===r)):!0},finishLoad:function(e,t,n,r){n=t?l.strip(n):n,f.isBuild&&(a[e]=n),r(n)},load:function(e,t,n,r){if(r.isBuild&&!r.inlineText){n();return}f.isBuild=r.isBuild;var a=l.parseName(e),c=a.moduleName+"."+a.ext,h=t.toUrl(c),p=f.useXhr||l.useXhr;!i||p(h,s,o,u)?l.get(h,function(t){l.finishLoad(e,a.strip,t,n)},function(e){n.error&&n.error(e)}):t([c],function(e){l.finishLoad(a.moduleName+"."+a.ext,a.strip,e,n)})},write:function(e,t,n,r){if(a.hasOwnProperty(t)){var i=l.jsEscape(a[t]);n.asModule(e+"!"+t,"define(function () { return '"+i+"';});\n")}},writeFile:function(e,t,n,r,i){var s=l.parseName(t),o=s.moduleName+"."+s.ext,u=n.toUrl(s.moduleName+"."+s.ext)+".js";l.load(o,n,function(t){var n=function(e){return r(u,e)};n.asModule=function(e,t){return r.asModule(e,u,t)},l.write(e,o,n,i)},i)}},typeof process!="undefined"&&process.versions&&!!process.versions.node?(c=require.nodeRequire("fs"),l.get=function(e,t){var n=c.readFileSync(e,"utf8");n.indexOf("\ufeff")===0&&(n=n.substring(1)),t(n)}):l.createXhr()?l.get=function(e,t,n){var r=l.createXhr();r.open("GET",e,!0),f.onXhr&&f.onXhr(r,e),r.onreadystatechange=function(i){var s,o;r.readyState===4&&(s=r.status,s>399&&s<600?(o=new Error(e+" HTTP status: "+s),o.xhr=r,n(o)):t(r.responseText))},r.send(null)}:typeof Packages!="undefined"&&(l.get=function(e,t){var n="utf-8",r=new java.io.File(e),i=java.lang.System.getProperty("line.separator"),s=new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(r),n)),o,u,a="";try{o=new java.lang.StringBuffer,u=s.readLine(),u&&u.length()&&u.charAt(0)===65279&&(u=u.substring(1)),o.append(u);while((u=s.readLine())!==null)o.append(i),o.append(u);a=String(o.toString())}finally{s.close()}t(a)}),l})
;
define('text!ui/webmakernav/webmakernav.html',[],function () { return '<div class="webmaker-nav-container">\n  <div class="webmaker-nav-top">\n    <ul class="webmaker-nav primary">\n      <li><a class="on" data-tab="webmaker">Webmaker</a></li>\n      <li><a data-tab="projects">Projects</a></li>\n      <li><a data-tab="tools">Tools</a></li>\n      <li><a data-tab="events">Events</a></li>\n      <li><a href="#" class="webmaker-feedback-btn">Feedback</a></li>\n    </ul>\n    <ul class="webmaker-nav user-info">\n\n      <li class="login-join">\n        <span class="login">Sign Up</span>\n        <div class="join butter-tooltip">\n          <div class="h3">Log in to Popcorn to save and share your projects</div>\n          <div class="persona-img"></div><div class="info">Popcorn Maker uses <strong>Mozilla Persona</strong>, which puts you in control of your identity with a single email of your choice.</div>\n        </div>\n      </li>\n      <li class="user">\n        <div class="user-name link">\n          <span class="user-name-container"></span>\n          <span class="icon icon-white icon-downtick"></span>\n          <div class="butter-tooltip tooltip-user tooltip-no-hover">\n            <ul>\n              <li><a href="/dashboard" class="my-projects" target="_blank">My Projects</a></li>\n              <li><a class="logout-btn">Logout</a></li>\n            </ul>\n          </div>\n        </div>\n      </li>\n    </ul>\n  </div>\n\n  <div class="webmaker-tabs">\n    <div class="webmaker-nav webmaker-tab tab-webmaker">\n      <div class="tab-inner">\n        <img class="logo" src="/resources/webmaker/webmaker-main_01.png" alt="">\n        <div class="h3 webmaker-slogan">Mozilla Webmaker wants to help you make something amazing on the web.</div>\n        <div class="secondary-info">\n          <div class="info">You\'re using <strong>Popcorn Maker</strong> to remix web video, but Webmaker can also help you learn HTML and CSS, earn badges, create webpages, join meetups in your area, and <a href="http://webmaker.org" target="_blank">other cool stuff</a>.</div>\n        </div>\n      </div>\n    </div>\n    <div class="webmaker-tab tab-projects">\n      <ul class="webmaker-nav tab-inner">\n        <li><a href="https://webmaker.org/projects/" target="_blank">All</a></li>\n        <li><a href="https://webmaker.org/projects/?tool=popcorn" target="_blank">Popcorn Projects</a></li>\n        <li><a href="https://webmaker.org/projects/?tool=thimble" target="_blank">Thimble Projects</a></li>\n      </ul>\n    </div>\n    <div class="webmaker-tab tab-tools">\n      <ul class="webmaker-nav tab-inner">\n        <li><a class="on">Popcorn</a></li>\n        <li><a href="https://thimble.webmaker.org/editor" target="_blank">Thimble</a></li>\n        <li><a href="https://webmaker.org/tools/x-ray-goggles/" target="_blank">X-ray Goggles</a></li>\n      </ul>\n    </div>\n    <div class="webmaker-tab tab-events">\n      <ul class="webmaker-nav tab-inner">\n        <li><a href="https://webmaker.org/events" target="_blank">All Events</a></li>\n        <li><a href="https://webmaker.org/events/search" target="_blank">Search</a></li>\n        <li><a href="https://donate.mozilla.org/page/event/create" target="_blank">Create</a></li>\n      </ul>\n    </div>\n  </div>\n</div>\n';});

define('text!ui/webmakernav/webmakernav.css',[],function () { return '/* THIS FILE WAS GENERATED BY A TOOL, DO NOT EDIT. SEE .less FILE IN css/ */\n\n/*********************************************************\n* EDITORS\n*/\n/*********************************************************\n* Editor Header\n*/\n.butter-editor-header {\n  position: absolute;\n  top: 0;\n  right: 0;\n  left: -1px;\n  border-bottom: 5px solid #3fb58e;\n  height: 45px;\n  background: #052938;\n}\n.butter-editor-header > ul {\n  margin: 0;\n  padding: 0;\n  width: 100%;\n  list-style: none;\n}\n.butter-editor-header > ul > .butter-editor-header-li {\n  float: left;\n  position: relative;\n  top: 0;\n}\n.butter-editor-header .butter-btn {\n  background: none;\n  border: none;\n  color: #FFF;\n  font-size: 14px;\n  padding: 0 10px;\n  border-radius: 0;\n  height: 45px;\n  line-height: 45px;\n}\n.butter-editor-header .butter-btn > .icon {\n  margin-top: 1px;\n  margin-left: 0;\n  margin-right: 2px;\n}\n.butter-editor-header .butter-btn.butter-active {\n  background: #3fb58e;\n}\n.butter-editor-header .butter-btn.butter-editor-btn-disabled {\n  color: rgba(255, 255, 255, 0.3);\n}\n.butter-editor-header .butter-btn.butter-editor-btn-disabled > .icon {\n  opacity: 0.3;\n}\n.butter-editor-close-btn {\n  position: fixed;\n  top: 0px;\n  right: 0;\n  z-index: 100000011;\n}\n.butter-editor-close-btn.toggled .icon {\n  background-image: url("../resources/icons/glyphiconshalflings-alt.png");\n  background-position: -432px -72px;\n  /* from icon-chevron-right */\n\n}\n/*********************************************************\n* Main Editor Area\n*/\n.butter-editor-area {\n  position: fixed;\n  z-index: 100000001;\n  top: 0px;\n  bottom: 0;\n  right: 0;\n  width: 350px;\n  background: #f4f5f5;\n  -webkit-transition: right 0.35s;\n  -moz-transition: right 0.35s;\n  -o-transition: right 0.35s;\n  -ms-transition: right 0.35s;\n  transition: right 0.35s;\n  border-left: 1px solid #cccccc;\n}\n.butter-editor-area.minimized {\n  right: -352px;\n}\n.butter-editor-area .butter-editor {\n  color: #555555;\n  font-size: 13px;\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n}\n.butter-editor-area .butter-editor .butter-editor-tabs {\n  padding: 0 20px;\n  margin: 0;\n  list-style: none;\n  height: 30px;\n}\n.butter-editor-area .butter-editor .butter-editor-tabs > li {\n  float: left;\n  margin-right: 3px;\n  margin-top: -1px;\n}\n.butter-editor-area .butter-editor .butter-editor-tabs > li a:hover {\n  color: #555;\n}\n.butter-editor-area .butter-editor .butter-editor-tabs .butter-btn {\n  background: #e6e6e6;\n  border-radius: 0;\n  border: 1px solid #cccccc;\n}\n.butter-editor-area .butter-editor .butter-editor-tabs .butter-btn.butter-active {\n  background: #FFF;\n  border-top-color: #FFF;\n}\n.butter-editor-area .butter-editor h1,\n.butter-editor-area .butter-editor .butter-breadcrumbs {\n  color: #3fb58e;\n  font-weight: 700;\n  font-size: 16px;\n  text-transform: capitalize;\n  height: 50px;\n  line-height: 50px;\n  margin: 0;\n  padding: 0 20px;\n  background: #FFF;\n  border-bottom: 1px solid #cccccc;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n}\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back {\n  opacity: 0.6;\n  position: relative;\n  padding-right: 15px;\n  margin-right: 15px;\n  display: inline-block;\n  cursor: pointer;\n  border-right: 1px solid #cccccc;\n}\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back:after,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back:after,\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back:before,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back:before {\n  left: 100%;\n  border: solid transparent;\n  content: " ";\n  height: 0;\n  width: 0;\n  position: absolute;\n  pointer-events: none;\n  /* csslint-ignore */\n\n}\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back:after,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back:after {\n  border-left-color: #ffffff;\n  border-width: 5px;\n  top: 50%;\n  margin-top: -5px;\n}\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back:before,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back:before {\n  border-left-color: #cccccc;\n  border-width: 7px;\n  top: 50%;\n  margin-top: -7px;\n}\n.butter-editor-area .butter-editor h1 .butter-breadcrumbs-back:hover,\n.butter-editor-area .butter-editor .butter-breadcrumbs .butter-breadcrumbs-back:hover {\n  opacity: 1;\n}\n.butter-editor-area .butter-editor h1 .close-btn,\n.butter-editor-area .butter-editor .butter-breadcrumbs .close-btn {\n  position: relative;\n  float: right;\n  top: 10px;\n  left: 10px;\n  line-height: 14px;\n  cursor: pointer;\n}\n.butter-editor-area .butter-editor .editor-tabs {\n  position: absolute;\n  top: 60px;\n  left: 5px;\n  bottom: 5px;\n  right: 5px;\n  border-radius: 5px;\n}\n.butter-editor-area .butter-editor .editor-tabs > button {\n  margin: 10px;\n}\n.butter-editor-area .display-off {\n  display: none;\n}\n.butter-editor-area .error-message-container {\n  -webkit-transition: height 0.35s, margin 0.35s, padding 0.35s;\n  -moz-transition: height 0.35s, margin 0.35s, padding 0.35s;\n  -o-transition: height 0.35s, margin 0.35s, padding 0.35s;\n  -ms-transition: height 0.35s, margin 0.35s, padding 0.35s;\n  transition: height 0.35s, margin 0.35s, padding 0.35s;\n  overflow: hidden;\n  height: 0;\n  color: #D93B21;\n  visibility: hidden;\n  width: 300px;\n}\n.butter-editor-area .error-message-container.open {\n  padding: 10px 20px;\n  padding-right: 15px;\n  background: #F0DDDD;\n}\n.butter-editor-area .butter-editor-spacing {\n  padding-right: 0;\n}\n.butter-editor-area .butter-editor-spacing.editor-open {\n  padding-right: 350px;\n}\n.butter-editor-area .butter-editor-content {\n  position: absolute;\n  top: 50px;\n  bottom: 0;\n  width: 100%;\n}\n.butter-editor-area .butter-editor-body {\n  position: absolute;\n  top: 50px;\n  bottom: 0;\n  width: 100%;\n}\n.butter-editor-area .butter-editor-body.butter-tabs-spacing {\n  top: 80px;\n}\n.butter-editor-area .scrollbar-outer {\n  position: absolute;\n  top: 0;\n  right: 15px;\n  left: 0;\n  bottom: 0;\n  overflow: hidden;\n}\n.butter-editor-area .allow-scrollbar .butter-scroll-bar.butter-scroll-bar-v {\n  top: 5px;\n  right: 5px;\n  width: 10px;\n  bottom: 5px;\n}\n/*********************************************************\n* Editor UI styles\n*/\n.butter-form .trackevent-property,\n.butter-form .trackevent-warning,\n.butter-form fieldset {\n  border: none;\n  margin: 10px 20px;\n  padding: 0;\n  *zoom: 1;\n}\n.butter-form .trackevent-property:before,\n.butter-form .trackevent-warning:before,\n.butter-form fieldset:before,\n.butter-form .trackevent-property:after,\n.butter-form .trackevent-warning:after,\n.butter-form fieldset:after {\n  content: "";\n  display: table;\n}\n.butter-form .trackevent-property:after,\n.butter-form .trackevent-warning:after,\n.butter-form fieldset:after {\n  clear: both;\n}\n.butter-form .trackevent-warning {\n  background: #d9dddd;\n  padding: 10px;\n  border-radius: 5px;\n}\n.butter-form label.property-name,\n.butter-form label {\n  display: block;\n  font-size: 13px;\n  padding: 5px 0;\n}\n.butter-form .editor-section-header {\n  font-weight: 700;\n  font-size: 16px;\n  margin-bottom: 5px;\n}\n.butter-form select,\n.butter-form input,\n.butter-form textarea {\n  height: 32px;\n  width: 100%;\n  padding: 6px;\n  margin-bottom: 5px;\n  border: 1px solid #cccccc;\n  border-top-color: #b3b3b3;\n  border-radius: 2px;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n}\n.butter-form select:-moz-placeholder,\n.butter-form input:-moz-placeholder,\n.butter-form textarea:-moz-placeholder {\n  color: #AAA;\n}\n.butter-form select:focus,\n.butter-form input:focus,\n.butter-form textarea:focus {\n  outline: none;\n  border: 1px solid #3fb58e;\n  -webkit-transition: border 0.25s ease;\n  -moz-transition: border 0.25s ease;\n  -o-transition: border 0.25s ease;\n  -ms-transition: border 0.25s ease;\n  transition: border 0.25s ease;\n}\n.butter-form textarea {\n  height: 100px;\n  line-height: 1.3;\n  resize: none;\n}\n.butter-form .butter-form-radio,\n.butter-form .butter-form-checkbox {\n  line-height: 1.3em;\n  padding-left: 40px;\n  padding-top: 0;\n  border: none;\n}\n.butter-form input[type="radio"],\n.butter-form input[type="checkbox"] {\n  float: left;\n  vertical-align: text-top;\n  width: 12px;\n  height: 13px;\n  margin-left: -38px;\n  margin-top: 2px;\n}\n.butter-form .checkbox-group {\n  float: left;\n  margin-right: 10px;\n}\n.butter-form .checkbox-group input[type="checkbox"] {\n  float: right;\n}\n.butter-form input:invalid,\n.butter-form textarea:invalid,\n.butter-form input:invalid + .butter-unit {\n  border-color: #dd3534;\n}\n.butter-form .butter-form-append {\n  position: relative;\n  display: inline-block;\n  *zoom: 1;\n}\n.butter-form .butter-form-append:before,\n.butter-form .butter-form-append:after {\n  content: "";\n  display: table;\n}\n.butter-form .butter-form-append:after {\n  clear: both;\n}\n.butter-form .butter-form-append > input {\n  height: 32px;\n  float: left;\n  border-radius: 2px 0 0 2px;\n  width: 200px;\n}\n.butter-form .butter-unit {\n  height: 30px;\n  position: absolute;\n  right: -2px;\n  bottom: 5px;\n  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;\n  font-size: 10px;\n  line-height: 32px;\n  padding: 0 5px;\n  min-width: 16px;\n  font-weight: normal;\n  text-align: center;\n  background-color: #f4f5f5;\n  color: #777;\n  border: 1px solid #cccccc;\n  border-radius: 0 3px 3px 0;\n}\n.butter-form .butter-form-inline.form-single {\n  *zoom: 1;\n}\n.butter-form .butter-form-inline.form-single:before,\n.butter-form .butter-form-inline.form-single:after {\n  content: "";\n  display: table;\n}\n.butter-form .butter-form-inline.form-single:after {\n  clear: both;\n}\n.butter-form .butter-form-inline.form-single label {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  width: 80px;\n  float: left;\n  padding: 0;\n  margin-top: 5px;\n}\n.butter-form .butter-form-inline.form-single > input,\n.butter-form .butter-form-inline.form-single textarea,\n.butter-form .butter-form-inline.form-single select {\n  float: left;\n  margin-left: 5px;\n  width: 201px;\n}\n.butter-form .butter-form-inline.form-half .butter-form-radio,\n.butter-form .butter-form-inline.form-half .butter-form-checkbox {\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  width: 143px;\n  float: left;\n}\n.butter-form .butter-form-inline.form-half > input,\n.butter-form .butter-form-inline.form-half > select,\n.butter-form .butter-form-inline.form-half .butter-form-append {\n  position: relative;\n  width: 133px;\n  float: left;\n}\n.butter-form .butter-form-inline.form-half > input:last-child,\n.butter-form .butter-form-inline.form-half > select:last-child,\n.butter-form .butter-form-inline.form-half .butter-form-append:last-child {\n  margin-left: 10px;\n}\n.butter-form .butter-form-inline.form-half > input > input,\n.butter-form .butter-form-inline.form-half > select > input,\n.butter-form .butter-form-inline.form-half .butter-form-append > input {\n  width: 100%;\n}\n.butter-form code,\n.butter-form pre {\n  font-size: 10px;\n}\n/*********************************************************\n* Scrollbars\n*/\n.butter-scroll-bar {\n  position: absolute;\n  background: #a4acac;\n  box-shadow: 0 0 1px rgba(0, 0, 0, 0.3);\n  border-radius: 15px;\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  overflow: hidden;\n}\n.butter-scroll-handle {\n  height: 8px;\n  top: 1px;\n  position: absolute;\n  background: #d9dddd;\n  border-radius: 15px;\n}\n.butter-scroll-handle:hover,\n.butter-scroll-handle.butter-scollbar-active {\n  background: #6f7b7b;\n  cursor: pointer;\n}\n.butter-scroll-bar-v .butter-scroll-handle {\n  width: 8px;\n  left: 1px;\n}\n/*********************************************************\n* Tooltip\n*/\n*:hover > .butter-tooltip:not(.tooltip-no-hover) {\n  opacity: 1;\n  visibility: visible;\n  -webkit-transition: opacity 0.3s ease 0.5s;\n  -moz-transition: opacity 0.3s ease 0.5s;\n  -o-transition: opacity 0.3s ease 0.5s;\n  -ms-transition: opacity 0.3s ease 0.5s;\n  transition: opacity 0.3s ease 0.5s;\n}\n.butter-tooltip {\n  visibility: hidden;\n  opacity: 0;\n  position: absolute;\n  top: 100%;\n  left: 50%;\n  margin-top: -7px;\n  margin-left: -55px;\n  z-index: 100000100;\n  width: 110px;\n  padding: 10px;\n  background: #FFF;\n  text-shadow: none;\n  color: #555;\n  line-height: 15px;\n  font-size: 11px;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  border-radius: 2px;\n  text-align: center;\n  border: 1px solid #CCC;\n  box-shadow: 0 5px 6px -5px rgba(0, 0, 0, 0.3);\n  pointer-events: none;\n  /* csslint-ignore: better for browsers that support it, not critical for those that don\'t */\n\n  -webkit-transition: opacity 0.3s ease 0;\n  -moz-transition: opacity 0.3s ease 0;\n  -o-transition: opacity 0.3s ease 0;\n  -ms-transition: opacity 0.3s ease 0;\n  transition: opacity 0.3s ease 0;\n}\n.butter-tooltip.tooltip-on {\n  opacity: 1;\n  visibility: visible;\n  -webkit-transition: opacity 0.3s ease 0.5s;\n  -moz-transition: opacity 0.3s ease 0.5s;\n  -o-transition: opacity 0.3s ease 0.5s;\n  -ms-transition: opacity 0.3s ease 0.5s;\n  transition: opacity 0.3s ease 0.5s;\n}\n.butter-tooltip.tooltip-off {\n  display: none;\n}\n.butter-tooltip.tooltip-no-transition-on {\n  opacity: 1;\n  visibility: visible;\n}\n.butter-tooltip.tooltip-error {\n  color: red;\n}\n.butter-tooltip:after,\n.butter-tooltip:before {\n  content: "";\n  position: absolute;\n  top: -5px;\n  left: 50%;\n  margin-left: -5px;\n  width: 0;\n  height: 0;\n  border-left: 5px solid transparent;\n  border-right: 5px solid transparent;\n  border-bottom: 5px solid #FFF;\n}\n.butter-tooltip:after {\n  z-index: 100000101;\n}\n.butter-tooltip:before {\n  top: -6px;\n  border-bottom: 5px solid #CCC;\n}\n.butter-no-top-margin {\n  margin-top: 0;\n}\n/*********************************************************\n* Draggable/Resizable\n*/\n.editor-disable-pointer-events {\n  pointer-events: none;\n  /* csslint-ignore: better for browsers that support it, not critical for those that don\'t */\n\n}\n.editor-drag-handle {\n  -webkit-transition: opacity .3s ease;\n  -moz-transition: opacity .3s ease;\n  -ms-transition: opacity .3s ease;\n  -o-transition: opacity .3s ease;\n  transition: opacity .3s ease;\n  opacity: 0.4;\n  z-index: 5000;\n  height: 32px;\n  width: 32px;\n  position: absolute;\n  top: 15px;\n  left: 15px;\n}\n.editor-drag-handle:hover {\n  opacity: 1;\n}\n/*********************************************************\n* Webmaker nav\n*/\n.webmaker-nav-container {\n  display: none;\n  font-family: "Open Sans", sans-serif;\n  color: #FFF;\n  font-size: 12px;\n  border-bottom: 1px solid #2d2f2f;\n}\n.webmaker-nav-container a {\n  color: #FFF;\n}\n.webmaker-nav-container a:hover {\n  color: #3fb58e;\n}\n.webmaker-nav-container .h3 {\n  color: #FFF;\n  margin: 0;\n  font-weight: 700;\n  font-size: 19px;\n}\n.webmaker-nav-top {\n  background: #3a3c3c;\n  height: 29px;\n}\n.webmaker-nav {\n  padding: 0;\n  margin: 0;\n  list-style: none;\n  line-height: 29px;\n  font-size: 1em;\n  color: #FFF;\n}\n.webmaker-nav > li {\n  padding: 0;\n  margin: 0;\n  float: left;\n  height: 100%;\n}\n.webmaker-nav > li > a,\n.webmaker-nav > li > .link {\n  position: relative;\n  display: block;\n  height: 100%;\n  background: #3a3c3c;\n  padding: 0 15px;\n  font-weight: 600;\n  text-decoration: none;\n  cursor: pointer;\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n  -webkit-transition: top 0.1s ease;\n  -moz-transition: top 0.1s ease;\n  -o-transition: top 0.1s ease;\n  -ms-transition: top 0.1s ease;\n  transition: top 0.1s ease;\n  color: rgba(255, 255, 255, 0.5);\n}\n.webmaker-nav > li > a:hover,\n.webmaker-nav > li > .link:hover,\n.webmaker-nav > li > a.on,\n.webmaker-nav > li > .link.on {\n  color: #FFF;\n}\n.webmaker-nav > li > a.webmaker-btn-active,\n.webmaker-nav > li > .link.webmaker-btn-active {\n  color: #FFF;\n  border-bottom-width: 1px;\n  border-top: 1px solid #494c4c;\n  background: #3a3c3c;\n  top: 4px;\n  box-shadow: 0 -6px 0 1px #2d2f2f, 1px -8px 10px -2px #212222;\n  z-index: 10000;\n}\n.primary {\n  float: left;\n  height: 29px;\n}\n.primary > li {\n  border-right: 1px solid #474949;\n  border-left: 1px solid #2d2f2f;\n  margin-left: 0;\n}\n.webmaker-expanded .primary > li {\n  border-color: transparent;\n}\n.primary > li:last-child {\n  border-right-color: transparent;\n}\n.primary > li a:hover {\n  background: #3f4141;\n}\n/*********************************************************\n* Feedback\n*/\n.feedback-icon {\n  margin-top: 6px;\n  float: left;\n  background: url("/resources/feedback-icon.png") no-repeat;\n  height: 18px;\n  width: 20px;\n}\n.feedback-icon:hover {\n  background-position: -19px 0;\n}\n.webmaker-feedback-btn .feedback-label {\n  display: none;\n  padding-left: 5px;\n}\n.webmaker-feedback-btn:hover .feedback-label {\n  display: inline;\n}\n/*********************************************************\n* User/Login Styles\n*/\n.user-info {\n  float: right;\n  margin-right: 150px;\n}\n.user-info li {\n  border-right: none;\n}\n.login-join {\n  cursor: pointer;\n  position: relative;\n}\n.login-join .join {\n  pointer-events: auto;\n  top: 100%;\n  margin-top: 15px;\n  width: 200px;\n  margin-left: -100px;\n  z-index: 100;\n}\n.login-join .join .h3 {\n  color: #555;\n  font-size: 1em;\n  margin: 5px 0;\n}\n.login-join .join .login {\n  display: inline-block;\n}\n.login-join .join .persona-img {\n  width: 40px;\n  height: 40px;\n  position: absolute;\n  top: 43px;\n  left: 4px;\n  background: url("/resources/icons/persona-logo.png") no-repeat;\n  background-size: contain;\n}\n.login-join .join .info {\n  text-align: left;\n  margin-left: 40px;\n}\n.login-join .login {\n  color: #FFF;\n  line-height: 22px;\n  top: 3px;\n  display: block;\n  position: relative;\n  background: #535656;\n  border: 1px solid #333;\n  box-shadow: inset 0 1px 0 0 #797d7d;\n  padding: 0 12px 0 37px;\n  border-radius: 3px;\n  margin-right: 5px;\n  overflow: hidden;\n}\n.login-join .login:after {\n  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAPCAYAAAA/I0V3AAAA4klEQVR42o2RWaqEMBRE3YaCiDjPwQGcd9CrysLv4wTyoLFD90dxqbp1EgdPRB7Kskznea6Zn/aPoKoqUUrJOI5m4l2QBfSyLHKep1zXZSae3An1fS/7vst931bGkzuhaZrsLVbGkzuheZ7lOI6HyJ2QUkqv6yrbtv0LT+6E7G0UrfBfP3lZlpoXH4ZBmHgn5Pv+KwxDfqp0XQdgJp6c/RsUBIGOokiSJDE/s21bACbe5Ozp0TdAHMdSFIXUdS1N01C2wpObPT36HifwCJzI0iX29Oh7XP0E3CB9L01TzM+i/wePv4ZE5RtAngAAAABJRU5ErkJggg==") 10px center no-repeat;\n  content: "";\n  display: block;\n  width: 31px;\n  position: absolute;\n  bottom: 0;\n  left: -5px;\n  top: 0;\n  z-index: 10;\n}\n.login-join .login:before {\n  content: "";\n  display: block;\n  width: 30px;\n  height: 30px;\n  position: absolute;\n  left: -5px;\n  top: -4px;\n  z-index: 10;\n  background: rgba(255, 255, 255, 0.4);\n  -webkit-transform: rotate(45deg);\n  -moz-transform: rotate(45deg);\n  -o-transform: rotate(45deg);\n  -ms-transform: rotate(45deg);\n  transform: rotate(45deg);\n  box-shadow: 1px 0 0 2px rgba(0, 0, 0, 0.05);\n}\n.login-join .login:hover {\n  background: #606363;\n}\n.user-info > .notification-badge > a {\n  display: none;\n  height: 15px;\n  width: 15px;\n  padding: 0;\n  border-radius: 5px;\n  margin-top: 8px;\n  border: 5px solid #606363;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n  opacity: 0.7;\n}\n.user-info > .notification-badge > a:hover {\n  opacity: 1;\n}\n.webmaker-nav > .user {\n  position: relative;\n}\n.webmaker-nav > .user > a {\n  padding-left: 8px;\n}\n.tooltip.tooltip-user {\n  background: #3a3c3c;\n  border: none;\n  color: #FFF;\n  margin-top: 0;\n  left: 0;\n  right: 0;\n  width: auto;\n  margin-left: 0;\n  padding: 0;\n  text-align: left;\n  border-radius: 0 0 2px 2px;\n}\n.tooltip.tooltip-user:after,\n.tooltip.tooltip-user:before {\n  display: none;\n}\n.tooltip.tooltip-user ul {\n  padding: 0;\n  margin: 0;\n  list-style: none;\n}\n.tooltip.tooltip-user ul > li {\n  padding: 5px;\n  padding-left: 10px;\n  border-bottom: 1px solid #535656;\n}\n.tooltip.tooltip-user ul > li:last-child {\n  border-bottom: none;\n}\n.tooltip.tooltip-user ul > li a {\n  cursor: pointer;\n}\n/*********************************************************\n* Tabs\n*/\n.webmaker-tabs {\n  height: 0;\n}\n.webmaker-expanded .webmaker-tabs {\n  height: auto;\n}\n.webmaker-tabs,\n.webmaker-tab {\n  background: #3a3c3c;\n}\n.webmaker-tab li > a {\n  background: none;\n}\n.webmaker-tab {\n  box-shadow: inset 0 1px 0 0 #535656, 0 -1px 0 0 #2d2f2f;\n}\n.webmaker-tab {\n  position: relative;\n  width: 100%;\n  color: #FFF;\n  overflow: hidden;\n  height: 0;\n  -webkit-transition: height 0.1s ease;\n  -moz-transition: height 0.1s ease;\n  -o-transition: height 0.1s ease;\n  -ms-transition: height 0.1s ease;\n  transition: height 0.1s ease;\n}\n.webmaker-tab li {\n  border-right: none;\n  line-height: 50px;\n}\n.webmaker-tab li > a {\n  font-size: 1.25em;\n}\n.webmaker-tab.webmaker-tab-active {\n  height: 50px;\n}\n.webmaker-section-icon {\n  float: left;\n  height: 100%;\n  padding-left: 10px;\n}\n.tab-webmaker.webmaker-tab-active {\n  height: 100px;\n}\n.tab-webmaker .tab-inner {\n  height: 100%;\n}\n.tab-webmaker .secondary-info {\n  float: left;\n  width: 450px;\n  padding: 20px;\n  border-left: 1px solid #535656;\n  height: 100%;\n  font-size: 15px;\n  line-height: 1.3;\n}\n.tab-webmaker .secondary-info .info {\n  margin: 0;\n  font-weight: 400;\n}\n.tab-webmaker .webmaker-button {\n  float: left;\n  padding-top: 20px;\n}\n.tab-webmaker .webmaker-button a:hover {\n  color: #FFF;\n}\n.tab-webmaker .block {\n  float: left;\n  display: block;\n  color: #EEE;\n  text-decoration: none;\n  width: 250px;\n  padding-right: 20px;\n  border-left: 1px solid #535656;\n  height: 100%;\n}\n.tab-webmaker .block:hover {\n  color: #FFF;\n}\n.tab-webmaker .block h4 {\n  font-size: 16px;\n  line-height: 1;\n  margin: 24px 0 6px 0;\n}\n.tab-webmaker .block .info {\n  margin: 0;\n  line-height: 1.4;\n}\n.tab-webmaker img {\n  float: left;\n  margin: 12px 5px;\n  opacity: 0.8;\n}\n.tab-webmaker img.logo {\n  margin: 11px 0 0 15px;\n}\n.tab-webmaker .block:hover img,\n.tab-webmaker .logo {\n  opacity: 1;\n  margin-top: 11px;\n}\n.tab-webmaker .webmaker-slogan {\n  width: 420px;\n  padding: 20px;\n  margin: 0;\n  font-size: 1.6em;\n  line-height: 1.4;\n  float: left;\n  padding-right: 30px;\n  -webkit-box-sizing: border-box;\n  -moz-box-sizing: border-box;\n  -ms-box-sizing: border-box;\n  box-sizing: border-box;\n}\n/*********************************************************\n* Tooltips + Buttons\n*/\n.btn {\n  display: inline-block;\n  background: #EEE;\n  padding: 4px 8px;\n  border-radius: 2px;\n}\n.btn:hover {\n  color: #FFF;\n  background: #3fb58e;\n}\n.butter-tooltip.tooltip-user {\n  background: #3a3c3c;\n  border: none;\n  color: #FFF;\n  margin-top: 0;\n  left: 0;\n  right: 0;\n  width: auto;\n  margin-left: 0;\n  padding: 0;\n  text-align: left;\n  border-radius: 0 0 2px 2px;\n  pointer-events: auto;\n  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.4);\n}\n.butter-tooltip.tooltip-user:after,\n.butter-tooltip.tooltip-user:before {\n  display: none;\n}\n.butter-tooltip.tooltip-user ul {\n  padding: 0;\n  margin: 0;\n  list-style: none;\n}\n.butter-tooltip.tooltip-user ul > li {\n  padding: 10px;\n  padding-left: 10px;\n  border-bottom: 1px solid #535656;\n  box-shadow: inset 0 -1px 0 0 rgba(0, 0, 0, 0.2);\n}\n.butter-tooltip.tooltip-user ul > li:last-child {\n  border-bottom: none;\n}\n.butter-tooltip.tooltip-user ul > li a {\n  cursor: pointer;\n  text-decoration: none;\n}\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */
define('ui/webmakernav/webmakernav', [ "util/lang", "text!./webmakernav.html", "text!./webmakernav.css" ],
  function( Lang,  BASE_LAYOUT, BASE_CSS ) {

  var NULL_FUNCTION = function() {};

      // Added to tab when it's open
  var TAB_ACTIVE_CLASS = "webmaker-tab-active",
      // Added to elements in primary nav when they are active
      BTN_ACTIVE_CLASS = "webmaker-btn-active",
      // Added to body when secondary nav is expanded
      EXPANDED_CLASS = "webmaker-expanded",
       // The class prefix for each individual tab
      TAB_PREFIX = "tab-",
      // Transition used for the user menu dropdown
      USER_MENU_TRANSITION = "tooltip-no-transition-on";

  return function( options ) {
    options = options || {};

    var container = options.container,
        root = Lang.domFragment( BASE_LAYOUT ),
        feedbackBtn = root.querySelector( ".webmaker-feedback-btn" ),
        personaBtnGroup = root.querySelector( ".login-join" ),
        loginBtn = root.querySelector( ".login" ),
        logoutBtn = root.querySelector( ".logout-btn" ),
        userMenu = root.querySelector( ".tooltip-user" ),
        username = root.querySelector( ".user-name" ),
        usernameInner = root.querySelector( ".user-name-container" ),
        usernameContainer= root.querySelector( ".user" ),
        primary = root.querySelector( ".primary" ),
        tabContainer = root.querySelector( ".webmaker-tabs" ),
        feedbackCallback,
        onLogin,
        onLogout,
        appendStyles,
        webmakerTabSetup,
        userMenuSetup;

    this.views = {
      login: function( usernameContainerText ) {
        personaBtnGroup.style.display = "none";
        usernameContainer.style.display = "";
        usernameInner.innerHTML = usernameContainerText;
      },
      logout: function() {
        personaBtnGroup.style.display = "";
        usernameContainer.style.display = "none";
      }
    };

    feedbackCallback = options.feedbackCallback;
    onLogin = options.onLogin || NULL_FUNCTION;
    onLogout = options.onLogout || NULL_FUNCTION;

    appendStyles = function() {
      var styleTag = document.createElement( "style" ),
          styles = document.createTextNode( BASE_CSS );
      styleTag.appendChild( styles );
      document.head.appendChild( styleTag );
    };

    webmakerTabSetup = function( e ) {
      var currentActiveBtn = primary.querySelector( "." + BTN_ACTIVE_CLASS ),
          currentActiveTab = tabContainer.querySelector( "." + TAB_ACTIVE_CLASS ),
          el = e.target,
          tabName,
          tab;

      tabName = el.getAttribute( "data-tab" );
      tab = tabContainer.querySelector( "." + TAB_PREFIX + tabName );

      if ( !tab ) {
        return;
      }
      if ( currentActiveBtn ) {
        currentActiveBtn.classList.remove( BTN_ACTIVE_CLASS );
      }
      if ( currentActiveTab === tab ) {
        currentActiveTab.classList.remove( TAB_ACTIVE_CLASS );
        document.body.classList.remove( EXPANDED_CLASS );
        return;
      }
      else if ( currentActiveTab ) {
        currentActiveTab.classList.remove( TAB_ACTIVE_CLASS );
      }

      document.body.classList.add( EXPANDED_CLASS );
      tab.classList.add( TAB_ACTIVE_CLASS );
      el.classList.add( BTN_ACTIVE_CLASS );
    };

    userMenuSetup = function() {
      userMenu.addEventListener( "click", function( e ) {
        e.stopPropagation();
      }, false );
      
      username.addEventListener( "mouseout", function() {
        userMenu.classList.remove( USER_MENU_TRANSITION );
        username.classList.remove( BTN_ACTIVE_CLASS );
      }, false );

      username.addEventListener( "mouseover", function() {
        userMenu.classList.add( USER_MENU_TRANSITION );
        username.classList.add( BTN_ACTIVE_CLASS );
      }, false );
    };

    appendStyles();
    container.appendChild( root );
    userMenuSetup();

    feedbackBtn.addEventListener( "click", feedbackCallback, false );
    loginBtn.addEventListener( "click", onLogin, false );
    logoutBtn.addEventListener( "click", onLogout, false );
    primary.addEventListener( "click", webmakerTabSetup, false );

    // Default view
    this.views.logout();

    if ( options.hideLogin ) {
      personaBtnGroup.parentNode.removeChild( personaBtnGroup );
    }

    if ( options.hideFeedback ) {
      feedbackBtn.parentNode.removeChild( feedbackBtn );
    }

  };
});


function init( window, document ) {
  var require = requirejs.config({
    context: "webmakernav",
    baseUrl: "/src",
    paths: {
      text: "../external/require/text"
    }
  });

  require( [ "ui/webmakernav/webmakernav" ], function( WebmakerNav ) {
    WebmakerNav.call({}, {
      hideLogin: true,
      hideFeedback: true,
      container: document.getElementById( 'webmaker-nav' ),
      feedbackCallback: function() {}
    });
  });
}

document.addEventListener( "DOMContentLoaded", function() {
  // Source tree case vs. require-built case.
  if ( typeof require === "undefined" ) {
    var requireScript = document.createElement( "script" );
    requireScript.src = "../../external/require/require.js";
    requireScript.onload = function() {
      init( window, window.document );
    };
    document.head.appendChild( requireScript );
  } else {
    init( window, window.document );
  }
}, false );
define("webmakernav", function(){});

}());
