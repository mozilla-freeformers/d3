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
define('text!layouts/controls.html',[],function () { return '<div id="butter-controls">\n  <div class="controls-left">\n    <span id="controls-play" class="controls-btn controls-paused"></span>\n  </div>\n  <div class="time">\n    <span id="controls-currenttime">00:00:00</span>\n    <span class="divider">/</span>\n    <span id="controls-duration">00:00:00</span>\n  </div>\n  <div class="controls-middle">\n    <div id="controls-timebar">\n      <div id="controls-progressbar"></div>\n    </div>\n  </div>\n  <div id="controls-volume-container">\n    <span id="controls-mute" class="controls-btn controls-unmuted"></span>\n    <div id="controls-volume">\n      <div id="controls-volume-progressbar"></div>\n    </div>\n  </div>\n  <div class="controls-right">\n    <div id="controls-share" title="Share"></div>\n    <div id="controls-remix" title="Remix"></div>\n    <div id="controls-fullscreen" title="Fullscreen"></div>\n  </div>\n  <a id="controls-logo" href="/" target="_blank" title="Popcorn Maker"></a>\n</div>\n';});

/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define('ui/widget/controls', [ "util/lang", "text!layouts/controls.html" ],
  function( LangUtils, CONTROLS_LAYOUT ) {

  function Controls( container, p, options ) {

    var LEFT_MOUSE_BUTTON = 0,
        SPACE_BAR = 32;

    var _controls = LangUtils.domFragment( CONTROLS_LAYOUT ).querySelector( "#butter-controls" ),
        _container = typeof container === "string" ? document.getElementById( container ) : container,
        // variables
        muteButton, playButton, currentTimeDialog, fullscreenButton,
        durationDialog, timebar, progressBar, bigPlayButton,
        scrubber, seeking, playStateCache, active,
        volume, volumeProgressBar, volumeScrubber, position,
        controlsShare, controlsRemix, controlsFullscreen, controlsLogo,
        // functions
        bigPlayClicked, activate, deactivate, volumechange,
        togglePlay, timeMouseMove, timeMouseUp,
        timeMouseDown, volumeMouseMove, volumeMouseUp,
        volumeMouseDown, durationchange, mutechange;

    // Deal with callbacks for various buttons in controls
    options = options || {};
    var nop = function(){},
        onShareClick = options.onShareClick || nop,
        onRemixClick = options.onRemixClick || nop,
        onFullscreenClick = options.onFullscreenClick || nop,
        onLogoClick = options.onLogoClick || nop;

    p.controls( false );
    _container.appendChild( _controls );

    var ready = function() {
      p.media.removeEventListener( "loadedmetadata", ready, false );

      muteButton = document.getElementById( "controls-mute" );
      playButton = document.getElementById( "controls-play" );
      currentTimeDialog = document.getElementById( "controls-currenttime" );
      durationDialog = document.getElementById( "controls-duration" );
      timebar = document.getElementById( "controls-timebar" );
      progressBar = document.getElementById( "controls-progressbar" );
      bigPlayButton = document.getElementById( "controls-big-play-button" );
      scrubber = document.getElementById( "controls-scrubber" );
      volume = document.getElementById( "controls-volume" );
      fullscreenButton = document.getElementById( "controls-fullscreen" );
      volumeProgressBar = document.getElementById( "controls-volume-progressbar" );
      volumeScrubber = document.getElementById( "controls-volume-scrubber" );
      controlsShare = document.getElementById( "controls-share" );
      controlsRemix = document.getElementById( "controls-remix" );
      controlsFullscreen = document.getElementById( "controls-fullscreen" );
      controlsLogo = document.getElementById( "controls-logo" );
      seeking = false;
      playStateCache = false;
      active = false;

      // Wire custom callbacks for right-hand buttons
      controlsShare.addEventListener( "click", onShareClick, false );
      controlsRemix.addEventListener( "click", onRemixClick, false );
      controlsFullscreen.addEventListener( "click", onFullscreenClick, false );
      controlsLogo.addEventListener( "click", onLogoClick, false );

      if ( bigPlayButton ) {

        bigPlayButton.classList.add( "controls-ready" );

        bigPlayClicked = function() {

          p.media.removeEventListener( "play", bigPlayClicked, false );
          bigPlayButton.removeEventListener( "click", bigPlayClicked, false );
          bigPlayButton.classList.remove( "controls-ready" );
          p.media.addEventListener( "mouseover", activate, false );
          if ( p.paused() ) {
            p.play();
          }
        };

        bigPlayButton.addEventListener( "click", bigPlayClicked, false );
        p.media.addEventListener( "play", bigPlayClicked, false );
      }

      // this block is used to ensure that when the video is played on a mobile device that the controls and playButton overlay
      // are in the correct state when it begins playing
      if ( !p.paused() ) {
        if ( bigPlayButton ) {
          bigPlayClicked();
        }
        playButton.classList.remove( "controls-paused" );
        playButton.classList.add( "controls-playing" );
      }

      _controls.classList.add( "controls-ready" );

      activate = function() {

        active = true;
        _controls.classList.add( "controls-active" );
      };

      deactivate = function() {

        active = false;
        if ( !seeking ) {
          _controls.classList.remove( "controls-active" );
        }
      };

      p.media.addEventListener( "mouseout", deactivate, false );
      _controls.addEventListener( "mouseover", activate, false );
      _controls.addEventListener( "mouseout", deactivate, false );

      togglePlay = function( e ) {

        // Only continue if event was triggered by the left mouse button or the spacebar
        if ( e.button !== LEFT_MOUSE_BUTTON && e.which !== SPACE_BAR ) {
          return;
        }

        if ( p.paused() ) {

          p.play();
        } else {

          p.pause();
        }
      };

      p.media.addEventListener( "click", togglePlay, false );
      window.addEventListener( "keypress", togglePlay, false );

      if ( playButton ) {

        playButton.addEventListener( "click", togglePlay, false );

        p.on( "play", function() {

          playButton.classList.remove( "controls-paused" );
          playButton.classList.add( "controls-playing" );
        });
        p.on( "pause", function() {

          playButton.classList.remove( "controls-playing" );
          playButton.classList.add( "controls-paused" );
        });
      }

      if ( muteButton ) {

        muteButton.addEventListener( "click", function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          p[ p.muted() ? "unmute" : "mute" ]();
        }, false );

        mutechange = function() {

          if ( p.muted() ) {

            muteButton.classList.remove( "controls-unmuted" );
            muteButton.classList.add( "controls-muted" );
          } else {

            muteButton.classList.remove( "controls-muted" );
            muteButton.classList.add( "controls-unmuted" );
          }
        };

        p.on( "volumechange", mutechange );
        mutechange();
      }

      if ( volume ) {

        volumeMouseMove = function( e ) {

          e.preventDefault();

          position = e.clientX - volume.getBoundingClientRect().left;

          if ( position <= 0 ) {

            p.mute();
            position = 0;
          } else if ( position > volume.offsetWidth ) {

            position = volume.offsetWidth;
          } else if ( p.muted() ) {

            p.unmute();
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( position / volume.offsetWidth * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( position - ( volumeScrubber.offsetWidth / 2 ) ) / volume.offsetWidth * 100 ) + "%";
          }

          p.volume( position / volume.offsetWidth );
        };

        volumeMouseUp = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          e.preventDefault();
          window.removeEventListener( "mouseup", volumeMouseUp, false );
          window.removeEventListener( "mousemove", volumeMouseMove, false );
        };

        volumeMouseDown = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          position = e.clientX - volume.getBoundingClientRect().left;

          e.preventDefault();
          window.addEventListener( "mouseup", volumeMouseUp, false );
          window.addEventListener( "mousemove", volumeMouseMove, false );

          if ( position === 0 ) {

            p.mute();
          } else if ( p.muted() ) {

            p.unmute();
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( position / volume.offsetWidth * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( position - ( volumeScrubber.offsetWidth / 2 ) ) / volume.offsetWidth * 100 ) + "%";
          }

          p.volume( position / volume.offsetWidth );
        };

        volume.addEventListener( "mousedown", volumeMouseDown, false );

        volumechange = function() {

          var width;

          if ( p.muted() ) {

            width = 0;
          } else {

            width = p.volume();
          }

          if ( width === 0 ) {

            if ( muteButton ) {

              muteButton.classList.remove( "controls-unmuted" );
              muteButton.classList.add( "controls-muted" );
            }
          }

          if ( volumeProgressBar ) {

            volumeProgressBar.style.width = ( width * 100 ) + "%";
          }

          if ( volumeScrubber ) {

            volumeScrubber.style.left = ( ( width - ( volumeScrubber.offsetWidth / 2 ) ) * 100 ) + "%";
          }
        };

        p.on( "volumechange", volumechange );

        // fire to get and set initially volume slider position
        volumechange();
      }

      if ( durationDialog ) {

        durationchange = function() {

          var timeStamp = new Date( 1970, 0, 1 ),
              time = p.duration(),
              seconds;

          timeStamp.setSeconds( Math.round( time ) );
          seconds = timeStamp.toTimeString().substr( 0, 8 );

          durationDialog.innerHTML = seconds;
        };

        durationchange();
      }

      if ( timebar ) {

        timeMouseMove = function( e ) {

          e.preventDefault();

          position = e.clientX - timebar.getBoundingClientRect().left;

          if ( position < 0 ) {

            position = 0;
          } else if ( position > timebar.offsetWidth ) {

            position = timebar.offsetWidth;
          }

          if ( progressBar ) {

            progressBar.style.width = ( position / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {

            scrubber.style.left = ( ( position - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          p.currentTime( position / timebar.offsetWidth * 100 * p.duration() / 100 );
        };

        timeMouseUp = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          e.preventDefault();
          seeking = false;
          if ( !active ) {
            deactivate();
          }
          if ( playStateCache ) {
            p.play();
          }
          window.removeEventListener( "mouseup", timeMouseUp, false );
          window.removeEventListener( "mousemove", timeMouseMove, false );
        };

        timeMouseDown = function( e ) {

          if ( e.button !== 0 ) {

            return;
          }

          position = e.clientX - timebar.getBoundingClientRect().left;

          e.preventDefault();
          seeking = true;
          playStateCache = !p.paused();
          p.pause();
          window.addEventListener( "mouseup", timeMouseUp, false );
          window.addEventListener( "mousemove", timeMouseMove, false );

          if ( progressBar ) {

            progressBar.style.width = ( position / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {

            scrubber.style.left = ( ( position - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          p.currentTime( position / timebar.offsetWidth * 100 * p.duration() / 100 );
        };

        timebar.addEventListener( "mousedown", timeMouseDown, false );

        p.on( "timeupdate", function() {

          var timeStamp = new Date( 1970, 0, 1 ),
              time = p.currentTime(),
              seconds,
              width = ( time / p.duration() * 100 * timebar.offsetWidth / 100 );

          if ( progressBar ) {

            progressBar.style.width = ( width / timebar.offsetWidth * 100 ) + "%";
          }

          if ( scrubber ) {

            scrubber.style.left = ( ( width - ( scrubber.offsetWidth / 2 ) ) / timebar.offsetWidth * 100 ) + "%";
          }

          timeStamp.setSeconds( Math.round( time ) );
          seconds = timeStamp.toTimeString().substr( 0, 8 );

          if ( currentTimeDialog ) {

            currentTimeDialog.innerHTML = seconds;
          }
        });
      }
    };

    if ( !_container ) {

      return;
    }

    if ( p.readyState() >= 1 ) {

      ready();
    } else {

      p.media.addEventListener( "loadedmetadata", ready, false );
    }

    return _container;
  }

  return {
    create: Controls
  };
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

function init( window, document ) {

  var stateClasses = [
    "embed-playing",
    "embed-paused",
    "embed-dialog-open"
  ];

  // Sometimes we want to show the info div when we pause, sometimes
  // we don't (e.g., when we open the share dialog).
  var hideInfoDiv = false;

  /**
   * embed.js is a separate, top-level entry point into the requirejs
   * structure of src/.  We use it in order to cherry-pick modules from
   * Butter as part of our embed scripts.  The embed.js file is meant
   * to be used on its own, without butter.js, and vice versa.  See
   * tools/embed.js and tools/embed.optimized.js, and the `make embed`
   * target for more info.
   */

  function $( id ) {
    if ( typeof id !== "string" ) {
      return id;
    }
    return document.querySelector( id );
  }

  function show( elem ) {
    elem = $( elem );
    if ( !elem ) {
      return;
    }
    elem.style.display = "block";
  }

  function requestFullscreen( elem ) {
    if ( elem.requestFullscreen ) {
      elem.requestFullscreen();
    } else if ( elem.mozRequestFullscreen ) {
      elem.mozRequestFullscreen();
    } else if ( elem.mozRequestFullScreen ) {
      elem.mozRequestFullScreen();
    } else if ( elem.webkitRequestFullscreen ) {
      elem.webkitRequestFullscreen();
    }
  }

  function isFullscreen() {
    return !((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen));
  }

  function cancelFullscreen() {
    if ( document.exitFullScreen ) {
      document.exitFullScreen();
    } else if ( document.mozCancelFullScreen ) {
      document.mozCancelFullScreen();
    } else if ( document.webkitCancelFullScreen ) {
      document.webkitCancelFullScreen();
    }
  }

  function hide( elem ) {
    elem = $( elem );
    if ( !elem ) {
      return;
    }
    elem.style.display = "none";
  }

  function shareClick( popcorn ) {
    if ( !popcorn.paused() ) {
      hideInfoDiv = true;
      popcorn.pause();
    }

    addStateClass( "embed-dialog-open" );
    hide( "#controls-big-play-button" );
    hide( "#post-roll-container" );
    show( "#share-container" );
  }

  function remixClick() {
    window.open( $( "#remix-post" ).href, "_blank" );
  }

  function fullscreenClick() {
    var container = document.getElementById( "container" );
    if( !isFullscreen() ) {
      requestFullscreen( container );
    } else {
      cancelFullscreen();
    }
  }

  function setupClickHandlers( popcorn, config ) {
    function replay() {
      popcorn.play( config.start );
    }

    $( "#replay-post" ).addEventListener( "click", replay, false );
    $( "#replay-share" ).addEventListener( "click", replay, false );
    $( "#share-post" ).addEventListener( "click", function() {
      shareClick( popcorn );
    }, false );
  }

  function buildIFrameHTML() {
    var src = window.location,
      // Sizes are strings: "200x400"
      shareSize = $( ".size-options .current .dimensions" ).textContent.split( "x" ),
      width = shareSize[ 0 ],
      height = shareSize[ 1 ];

    return '<iframe src="' + src + '" width="' + width + '" height="' + height +
           '" frameborder="0" mozallowfullscreen webkitallowfullscreen allowfullscreen></iframe>';
  }

  // We put the embed's cannoncial URL in a <link rel="cannoncial" href="...">
  function getCanonicalURL() {
    var links = document.querySelectorAll( "link" ),
        link;

    for ( var i = 0; i < links.length; i++ ) {
      link = links[ i ];
      if ( link.rel === "canonical" ) {
        return link.href;
      }
    }
    // Should never happen, but for lint...
    return "";
  }

  function addStateClass( state ) {
    var el = $( "#post-roll-container" );

    if ( el.classList.contains( state ) ) {
      return;
    }

    for ( var i = 0; i < stateClasses.length; i++ ) {
      el.classList.remove( stateClasses[ i ] );
    }

    el.classList.add( state );
  }

  function setupEventHandlers( popcorn, config ) {
    var sizeOptions = document.querySelectorAll( ".option" ),
        i, l;

    $( "#share-close" ).addEventListener( "click", function() {
      hide( "#share-container" );

      // If the video is done, go back to the postroll
      if ( popcorn.ended() ) {
        show( "#post-roll-container" );
      }
    }, false );

    function sizeOptionFn( e ) {
      e.preventDefault();
      $( ".size-options .current" ).classList.remove( "current" );
      this.classList.add( "current" );
      $( "#share-iframe" ).value = buildIFrameHTML();
    }

    for ( i = 0, l = sizeOptions.length; i < l; i++ ) {
      sizeOptions[ i ].addEventListener( "click", sizeOptionFn, false );
    }

    popcorn.on( "ended", function() {
      show( "#post-roll-container" );
      addStateClass( "embed-dialog-open" );
    });

    popcorn.on( "pause", function() {
      if ( hideInfoDiv ) {
        addStateClass( "embed-dialog-open" );
        hideInfoDiv = false;
      } else {
        addStateClass( "embed-paused" );
      }
    });

    popcorn.on( "playing", function() {
      hide( "#share-container" );
      hide( "#post-roll-container" );
      addStateClass( "embed-playing" );
    });

    function onCanPlay() {
      if ( config.autoplay ) {
        popcorn.play();
      }
    }
    popcorn.on( "canplay", onCanPlay );

    // See if Popcorn was ready before we got setup
    if ( popcorn.readyState() >= 3 && config.autoplay ) {
      popcorn.off( "canplay", onCanPlay );
      popcorn.play();
    }
  }

  function setupAttribution( popcorn ) {
    var icon = $( ".media-icon" ),
        src = $( ".attribution-media-src" ),
        toggler = $( ".attribution-logo" ),
        closeBtn = $( ".attribution-close" ),
        container = $( ".attribution-info" ),
        extraAttribution = $( ".attribution-extra" ),
        classes = {
          html5: "html5-icon",
          youtube: "youtube-icon",
          vimeo: "vimeo-icon",
          soundcloud: "soundcloud-icon",
          baseplayer: "html5-icon"
        },
        youtubeRegex = /(?:http:\/\/www\.|http:\/\/|www\.|\.|^)youtu/,
        type;

    type = popcorn.media._util ? popcorn.media._util.type.toLowerCase() : "html5";

    extraAttribution.innerHTML = Popcorn.manifest.googlemap.about.attribution;

    // Youtube currently won't have a popcorn.media._util this is a fallback check for YT
    if ( type === "html5" ) {
      type = youtubeRegex.test( src.href ) ? "youtube" : type;
    }

    icon.classList.add( classes[ type ] );

    toggler.addEventListener( "click", function() {
      container.classList.toggle( "attribution-on" );
    }, false );

    closeBtn.addEventListener( "click", function() {
      container.classList.toggle( "attribution-on" );
    }, false );
  }

  var require = requirejs.config({
    context: "embed",
    baseUrl: "/src",
    paths: {
      text: "../external/require/text"
    }
  });

  require([
      "util/uri",
      "ui/widget/controls",
      "ui/widget/textbox",
      // keep this at the end so it doesn't need a spot in the function signature
      "util/shims"
    ],
    function( URI, Controls, TextboxWrapper ) {
      /**
       * Expose Butter so we can get version info out of the iframe doc's embed.
       * This "butter" is never meant to live in a page with the full "butter".
       * We warn then remove if this happens.
       **/
      var Butter = {
            version: "Butter-Embed-v1.0.10-93-g07fefc1"
          },
          popcorn = Popcorn.byId( "Butter-Generated" ),
          config,
          qs = URI.parse( window.location.href ).queryKey,
          container = document.querySelectorAll( ".container" )[ 0 ];

      /**
       * the embed can be configured via the query string:
       *   autohide   = 1{default}|0    automatically hide the controls once playing begins
       *   autoplay   = 1|{default}0    automatically play the video on load
       *   controls   = 1{default}|0    display controls
       *   start      = {integer 0-end} time to start playing (default=0)
       *   end        = {integer 0-end} time to end playing (default={end})
       *   fullscreen = 1{default}|0    whether to allow fullscreen mode (e.g., hide/show button)
       *   loop       = 1|0{default}    whether to loop when hitting the end
       *   showinfo   = 1{default}|0    whether to show video title, author, etc. before playing
       **/
      config = {
        autohide: qs.autohide === "1" ? true : false,
        autoplay: qs.autoplay === "1" ? true : false,
        controls: qs.controls === "0" ? false : true,
        start: qs.start|0,
        end: qs.end|0,
        fullscreen: qs.fullscreen === "0" ? false : (function( document ) {
          // Check for prefixed/unprefixed Fullscreen API support
          if ( "fullScreenElement" in document ) {
            return true;
          }

          var pre = "khtml o ms webkit moz".split( " " ),
              i = pre.length,
              prefix;

          while ( i-- ) {
            prefix = pre[ i ];
            if ( (prefix + "FullscreenElement" ) in document ) {
              return true;
            }
          }
          return false;
        }( document )),
        loop: qs.loop === "1" ? true : false,
        branding: qs.branding === "0" ? false : true,
        showinfo: qs.showinfo === "0" ? false : true
      };

      // Always show controls.  See #2284 and #2298 on supporting
      // options.controls, options.autohide.
      popcorn.controls( true );
      Controls.create( "controls", popcorn, {
        onShareClick: function() {
          shareClick( popcorn );
        },
        onRemixClick: function() {
          remixClick( popcorn );
        },
        onFullscreenClick: function() {
          fullscreenClick();
        }
      });

      // Setup UI based on config options
      if ( !config.showinfo ) {
        var embedInfo = document.getElementById( "embed-info" );
        embedInfo.parentNode.removeChild( embedInfo );
      }
      if ( config.loop ) {
        popcorn.loop( true );
      }

      // Some config options want the video to be ready before we do anything.
      function onLoad() {
        var start = config.start,
            end = config.end;

        if ( config.fullscreen ) {
          // dispatch an event to let the controls know we want to setup a click listener for the fullscreen button
          popcorn.emit( "butter-fullscreen-allowed", container );
        }

        popcorn.off( "load", onLoad );

        // update the currentTime to the embed options start value
        // this is needed for mobile devices as attempting to listen for `canplay` or similar events
        // that let us know it is safe to update the current time seem to be futile
        function timeupdate() {
          popcorn.currentTime( start );
          popcorn.off( "timeupdate", timeupdate );
        }
        // See if we should start playing at a time other than 0.
        // We combine this logic with autoplay, since you either
        // seek+play or play or neither.
        if ( start > 0 && start < popcorn.duration() ) {
          popcorn.on( "seeked", function onSeeked() {
            popcorn.off( "seeked", onSeeked );
            if ( config.autoplay ) {
              popcorn.play();
            }
          });
          popcorn.on( "timeupdate", timeupdate );
        } else if ( config.autoplay ) {
          popcorn.play();
        }

        // See if we should pause at some time other than duration.
        if ( end > 0 && end > start && end <= popcorn.duration() ) {
          popcorn.cue( end, function() {
            popcorn.pause();
            popcorn.emit( "ended" );
          });
        }
      }

      // Either the video is ready, or we need to wait.
      if ( popcorn.readyState() >= 1 ) {
        onLoad();
      } else {
        popcorn.media.addEventListener( "canplay", onLoad );
      }

      if ( config.branding ) {
        setupClickHandlers( popcorn, config );
        setupEventHandlers( popcorn, config );

        // Wrap textboxes so they click-to-highlight and are readonly
        TextboxWrapper.applyTo( $( "#share-url" ), { readOnly: true } );
        TextboxWrapper.applyTo( $( "#share-iframe" ), { readOnly: true } );

        // Write out the iframe HTML necessary to embed this
        $( "#share-iframe" ).value = buildIFrameHTML();

        // Get the page's canonical URL and put in share URL
        $( "#share-url" ).value = getCanonicalURL();
      }

      setupAttribution( popcorn );

      if ( window.Butter && console && console.warn ) {
        console.warn( "Butter Warning: page already contains Butter, removing." );
        delete window.Butter;
      }
      window.Butter = Butter;
    }
  );
}

document.addEventListener( "DOMContentLoaded", function() {
  // Source tree case vs. require-built case.
  if ( typeof require === "undefined" ) {
    Popcorn.getScript( "../../external/require/require.js", function() {
      init( window, window.document );
    });
  } else {
    init( window, window.document );
  }
}, false );

define("embed", function(){});

}());
