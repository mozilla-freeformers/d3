/*
 * popcorn.js version v1.3-93-gc492f16
 * http://popcornjs.org
 *
 * Copyright 2011, Mozilla Foundation
 * Licensed under the MIT license
 */



(function(){

/**
 * Cross-browser full element.classList implementation for IE9 and friends.
 * 2011-06-15
 *
 * By Eli Grey, http://purl.eligrey.com/github/classList.js/blob/master/classList.js
 * Public Domain.
 * NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
 **/

if (typeof document !== "undefined" && !("classList" in document.createElement("a"))) {
  (function (view) {
    "use strict";

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
}());
(function() {

  document.addEventListener = document.addEventListener || function( event, callBack ) {

    event = ( event === "DOMContentLoaded" ) ? "onreadystatechange" : "on" + event;

    document.attachEvent( event, callBack );
  };

  document.removeEventListener = document.removeEventListener || function( event, callBack ) {

    event = ( event === "DOMContentLoaded" ) ? "onreadystatechange" : "on" + event;

    document.detachEvent( event, callBack );
  };

  HTMLScriptElement.prototype.addEventListener = HTMLScriptElement.prototype.addEventListener || function( event, callBack ) {

    event = ( event === "load" ) ? "onreadystatechange" : "on" + event;

    this.attachEvent( event, callBack );
  };

  HTMLScriptElement.prototype.removeEventListener = HTMLScriptElement.prototype.removeEventListener || function( event, callBack ) {

    event = ( event === "load" ) ? "onreadystatechange" : "on" + event;

    this.detachEvent( event, callBack );
  };

  document.createEvent = document.createEvent || function ( type ) {

    return {
      type : null,
      target : null,
      currentTarget : null,
      cancelable : false,
      bubbles : false,
      initEvent : function (type, bubbles, cancelable)  {
          this.type = type;
      },
      stopPropagation : function () {},
      stopImmediatePropagation : function () {}
    }
  };

  Array.prototype.forEach = Array.prototype.forEach || function( fn, context ) {

    var obj = this,
        hasOwn = Object.prototype.hasOwnProperty;

    if ( !obj || !fn ) {
      return {};
    }

    context = context || this;

    var key, len;

    for ( key in obj ) {
      if ( hasOwn.call( obj, key ) ) {
        fn.call( context, obj[ key ], key, obj );
      }
    }
    return obj;
  };

  // Production steps of ECMA-262, Edition 5, 15.4.4.19
  // Reference: http://es5.github.com/#x15.4.4.19
  if ( !Array.prototype.map ) {

    Array.prototype.map = function( callback, thisArg ) {

      var T, A, k;

      if ( this == null ) {
        throw new TypeError( "this is null or not defined" );
      }

      // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
      var O = Object( this );

      // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
      // 3. Let len be ToUint32(lenValue).
      var len = O.length >>> 0;

      // 4. If IsCallable(callback) is false, throw a TypeError exception.
      // See: http://es5.github.com/#x9.11
      if ( {}.toString.call( callback ) != "[object Function]" ) {
        throw new TypeError( callback + " is not a function" );
      }

      // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
      if ( thisArg ) {
        T = thisArg;
      }

      // 6. Let A be a new array created as if by the expression new Array(len) where Array is
      // the standard built-in constructor with that name and len is the value of len.
      A = new Array( len );

      // 7. Let k be 0
      k = 0;

      // 8. Repeat, while k < len
      while( k < len ) {

        var kValue, mappedValue;

        // a. Let Pk be ToString(k).
        //   This is implicit for LHS operands of the in operator
        // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
        //   This step can be combined with c
        // c. If kPresent is true, then
        if ( k in O ) {

          // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
          kValue = O[ k ];

          // ii. Let mappedValue be the result of calling the Call internal method of callback
          // with T as the this value and argument list containing kValue, k, and O.
          mappedValue = callback.call( T, kValue, k, O );

          // iii. Call the DefineOwnProperty internal method of A with arguments
          // Pk, Property Descriptor {Value: mappedValue, Writable: true, Enumerable: true, Configurable: true},
          // and false.

          // In browsers that support Object.defineProperty, use the following:
          // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

          // For best browser support, use the following:
          A[ k ] = mappedValue;
        }
        // d. Increase k by 1.
        k++;
      }

      // 9. return A
      return A;
    };
  }

  if ( !Array.prototype.indexOf ) {

    Array.prototype.indexOf = function ( searchElement /*, fromIndex */ ) {

      if ( this == null) {

        throw new TypeError();
      }

      var t = Object( this ),
          len = t.length >>> 0;

      if ( len === 0 ) {

        return -1;
      }

      var n = 0;

      if ( arguments.length > 0 ) {

        n = Number( arguments[ 1 ] );

        if ( n != n ) { // shortcut for verifying if it's NaN

          n = 0;
        } else if ( n != 0 && n != Infinity && n != -Infinity ) {

          n = ( n > 0 || -1 ) * Math.floor( Math.abs( n ) );
        }
      }

      if ( n >= len ) {
        return -1;
      }

      var k = n >= 0 ? n : Math.max( len - Math.abs( n ), 0 );

      for (; k < len; k++ ) {

        if ( k in t && t[ k ] === searchElement ) {

          return k;
        }
      }

      return -1;
    }
  }
})();

(function(global, document) {

  // Popcorn.js does not support archaic browsers
  if ( !document.addEventListener ) {
    global.Popcorn = {
      isSupported: false
    };

    var methods = ( "byId forEach extend effects error guid sizeOf isArray nop position disable enable destroy" +
          "addTrackEvent removeTrackEvent getTrackEvents getTrackEvent getLastTrackEventId " +
          "timeUpdate plugin removePlugin compose effect xhr getJSONP getScript" ).split(/\s+/);

    while ( methods.length ) {
      global.Popcorn[ methods.shift() ] = function() {};
    }
    return;
  }

  var

  AP = Array.prototype,
  OP = Object.prototype,

  forEach = AP.forEach,
  slice = AP.slice,
  hasOwn = OP.hasOwnProperty,
  toString = OP.toString,

  // Copy global Popcorn (may not exist)
  _Popcorn = global.Popcorn,

  //  Ready fn cache
  readyStack = [],
  readyBound = false,
  readyFired = false,

  //  Non-public internal data object
  internal = {
    events: {
      hash: {},
      apis: {}
    }
  },

  //  Non-public `requestAnimFrame`
  //  http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  requestAnimFrame = (function(){
    return global.requestAnimationFrame ||
      global.webkitRequestAnimationFrame ||
      global.mozRequestAnimationFrame ||
      global.oRequestAnimationFrame ||
      global.msRequestAnimationFrame ||
      function( callback, element ) {
        global.setTimeout( callback, 16 );
      };
  }()),

  //  Non-public `getKeys`, return an object's keys as an array
  getKeys = function( obj ) {
    return Object.keys ? Object.keys( obj ) : (function( obj ) {
      var item,
          list = [];

      for ( item in obj ) {
        if ( hasOwn.call( obj, item ) ) {
          list.push( item );
        }
      }
      return list;
    })( obj );
  },

  Abstract = {
    // [[Put]] props from dictionary onto |this|
    // MUST BE CALLED FROM WITHIN A CONSTRUCTOR:
    //  Abstract.put.call( this, dictionary );
    put: function( dictionary ) {
      // For each own property of src, let key be the property key
      // and desc be the property descriptor of the property.
      Object.getOwnPropertyNames( dictionary ).forEach(function( key ) {
        this[ key ] = dictionary[ key ];
      }, this);
    }
  },


  //  Declare constructor
  //  Returns an instance object.
  Popcorn = function( entity, options ) {
    //  Return new Popcorn object
    return new Popcorn.p.init( entity, options || null );
  };

  //  Popcorn API version, automatically inserted via build system.
  Popcorn.version = "v1.3-93-gc492f16";

  //  Boolean flag allowing a client to determine if Popcorn can be supported
  Popcorn.isSupported = true;

  //  Instance caching
  Popcorn.instances = [];

  //  Declare a shortcut (Popcorn.p) to and a definition of
  //  the new prototype for our Popcorn constructor
  Popcorn.p = Popcorn.prototype = {

    init: function( entity, options ) {

      var matches, nodeName,
          self = this;

      //  Supports Popcorn(function () { /../ })
      //  Originally proposed by Daniel Brooks

      if ( typeof entity === "function" ) {

        //  If document ready has already fired
        if ( document.readyState === "complete" ) {

          entity( document, Popcorn );

          return;
        }
        //  Add `entity` fn to ready stack
        readyStack.push( entity );

        //  This process should happen once per page load
        if ( !readyBound ) {

          //  set readyBound flag
          readyBound = true;

          var DOMContentLoaded  = function() {

            readyFired = true;

            //  Remove global DOM ready listener
            document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );

            //  Execute all ready function in the stack
            for ( var i = 0, readyStackLength = readyStack.length; i < readyStackLength; i++ ) {

              readyStack[ i ].call( document, Popcorn );

            }
            //  GC readyStack
            readyStack = null;
          };

          //  Register global DOM ready listener
          document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );
        }

        return;
      }

      if ( typeof entity === "string" ) {
        try {
          matches = document.querySelector( entity );
        } catch( e ) {
          throw new Error( "Popcorn.js Error: Invalid media element selector: " + entity );
        }
      }

      //  Get media element by id or object reference
      this.media = matches || entity;

      //  inner reference to this media element's nodeName string value
      nodeName = ( this.media.nodeName && this.media.nodeName.toLowerCase() ) || "video";

      //  Create an audio or video element property reference
      this[ nodeName ] = this.media;

      this.options = Popcorn.extend( {}, options ) || {};

      //  Resolve custom ID or default prefixed ID
      this.id = this.options.id || Popcorn.guid( nodeName );

      //  Throw if an attempt is made to use an ID that already exists
      if ( Popcorn.byId( this.id ) ) {
        throw new Error( "Popcorn.js Error: Cannot use duplicate ID (" + this.id + ")" );
      }

      this.isDestroyed = false;

      this.data = {

        // data structure of all
        running: {
          cue: []
        },

        // Executed by either timeupdate event or in rAF loop
        timeUpdate: Popcorn.nop,

        // Allows disabling a plugin per instance
        disabled: {},

        // Stores DOM event queues by type
        events: {},

        // Stores Special event hooks data
        hooks: {},

        // Store track event history data
        history: [],

        // Stores ad-hoc state related data]
        state: {
          volume: this.media.volume
        },

        // Store track event object references by trackId
        trackRefs: {},

        // Playback track event queues
        trackEvents: new TrackEvents( this )
      };

      //  Register new instance
      Popcorn.instances.push( this );

      //  function to fire when video is ready
      var isReady = function() {

        // chrome bug: http://code.google.com/p/chromium/issues/detail?id=119598
        // it is possible the video's time is less than 0
        // this has the potential to call track events more than once, when they should not
        // start: 0, end: 1 will start, end, start again, when it should just start
        // just setting it to 0 if it is below 0 fixes this issue
        if ( self.media.currentTime < 0 ) {

          self.media.currentTime = 0;
        }

        self.media.removeEventListener( "loadedmetadata", isReady, false );

        var duration, videoDurationPlus,
            runningPlugins, runningPlugin, rpLength, rpNatives;

        //  Adding padding to the front and end of the arrays
        //  this is so we do not fall off either end
        duration = self.media.duration;

        //  Check for no duration info (NaN)
        videoDurationPlus = duration != duration ? Number.MAX_VALUE : duration + 1;

        Popcorn.addTrackEvent( self, {
          start: videoDurationPlus,
          end: videoDurationPlus
        });

        if ( self.options.frameAnimation ) {

          //  if Popcorn is created with frameAnimation option set to true,
          //  requestAnimFrame is used instead of "timeupdate" media event.
          //  This is for greater frame time accuracy, theoretically up to
          //  60 frames per second as opposed to ~4 ( ~every 15-250ms)
          self.data.timeUpdate = function () {

            Popcorn.timeUpdate( self, {} );

            // fire frame for each enabled active plugin of every type
            Popcorn.forEach( Popcorn.manifest, function( key, val ) {

              runningPlugins = self.data.running[ val ];

              // ensure there are running plugins on this type on this instance
              if ( runningPlugins ) {

                rpLength = runningPlugins.length;
                for ( var i = 0; i < rpLength; i++ ) {

                  runningPlugin = runningPlugins[ i ];
                  rpNatives = runningPlugin._natives;
                  rpNatives && rpNatives.frame &&
                    rpNatives.frame.call( self, {}, runningPlugin, self.currentTime() );
                }
              }
            });

            self.emit( "timeupdate" );

            !self.isDestroyed && requestAnimFrame( self.data.timeUpdate );
          };

          !self.isDestroyed && requestAnimFrame( self.data.timeUpdate );

        } else {

          self.data.timeUpdate = function( event ) {
            Popcorn.timeUpdate( self, event );
          };

          if ( !self.isDestroyed ) {
            self.media.addEventListener( "timeupdate", self.data.timeUpdate, false );
          }
        }
      };

      Object.defineProperty( this, "error", {
        get: function() {

          return self.media.error;
        }
      });

      // http://www.whatwg.org/specs/web-apps/current-work/#dom-media-readystate
      //
      // If media is in readyState (rS) >= 1, we know the media's duration,
      // which is required before running the isReady function.
      // If rS is 0, attach a listener for "loadedmetadata",
      // ( Which indicates that the media has moved from rS 0 to 1 )
      //
      // This has been changed from a check for rS 2 because
      // in certain conditions, Firefox can enter this code after dropping
      // to rS 1 from a higher state such as 2 or 3. This caused a "loadeddata"
      // listener to be attached to the media object, an event that had
      // already triggered and would not trigger again. This left Popcorn with an
      // instance that could never start a timeUpdate loop.
      if ( self.media.readyState >= 1 ) {

        isReady();
      } else {

        self.media.addEventListener( "loadedmetadata", isReady, false );
      }

      return this;
    }
  };

  //  Extend constructor prototype to instance prototype
  //  Allows chaining methods to instances
  Popcorn.p.init.prototype = Popcorn.p;

  Popcorn.byId = function( str ) {
    var instances = Popcorn.instances,
        length = instances.length,
        i = 0;

    for ( ; i < length; i++ ) {
      if ( instances[ i ].id === str ) {
        return instances[ i ];
      }
    }

    return null;
  };

  Popcorn.forEach = function( obj, fn, context ) {

    if ( !obj || !fn ) {
      return {};
    }

    context = context || this;

    var key, len;

    // Use native whenever possible
    if ( forEach && obj.forEach === forEach ) {
      return obj.forEach( fn, context );
    }

    if ( toString.call( obj ) === "[object NodeList]" ) {
      for ( key = 0, len = obj.length; key < len; key++ ) {
        fn.call( context, obj[ key ], key, obj );
      }
      return obj;
    }

    for ( key in obj ) {
      if ( hasOwn.call( obj, key ) ) {
        fn.call( context, obj[ key ], key, obj );
      }
    }
    return obj;
  };

  Popcorn.extend = function( obj ) {
    var dest = obj, src = slice.call( arguments, 1 );

    Popcorn.forEach( src, function( copy ) {
      for ( var prop in copy ) {
        dest[ prop ] = copy[ prop ];
      }
    });

    return dest;
  };


  // A Few reusable utils, memoized onto Popcorn
  Popcorn.extend( Popcorn, {
    noConflict: function( deep ) {

      if ( deep ) {
        global.Popcorn = _Popcorn;
      }

      return Popcorn;
    },
    error: function( msg ) {
      throw new Error( msg );
    },
    guid: function( prefix ) {
      Popcorn.guid.counter++;
      return  ( prefix ? prefix : "" ) + ( +new Date() + Popcorn.guid.counter );
    },
    sizeOf: function( obj ) {
      var size = 0;

      for ( var prop in obj ) {
        size++;
      }

      return size;
    },
    isArray: Array.isArray || function( array ) {
      return toString.call( array ) === "[object Array]";
    },

    nop: function() {},

    position: function( elem ) {

      if ( !elem.parentNode ) {
        return null;
      }

      var clientRect = elem.getBoundingClientRect(),
          bounds = {},
          doc = elem.ownerDocument,
          docElem = document.documentElement,
          body = document.body,
          clientTop, clientLeft, scrollTop, scrollLeft, top, left;

      //  Determine correct clientTop/Left
      clientTop = docElem.clientTop || body.clientTop || 0;
      clientLeft = docElem.clientLeft || body.clientLeft || 0;

      //  Determine correct scrollTop/Left
      scrollTop = ( global.pageYOffset && docElem.scrollTop || body.scrollTop );
      scrollLeft = ( global.pageXOffset && docElem.scrollLeft || body.scrollLeft );

      //  Temp top/left
      top = Math.ceil( clientRect.top + scrollTop - clientTop );
      left = Math.ceil( clientRect.left + scrollLeft - clientLeft );

      for ( var p in clientRect ) {
        bounds[ p ] = Math.round( clientRect[ p ] );
      }

      return Popcorn.extend({}, bounds, { top: top, left: left });
    },

    disable: function( instance, plugin ) {

      if ( instance.data.disabled[ plugin ] ) {
        return;
      }

      instance.data.disabled[ plugin ] = true;

      if ( plugin in Popcorn.registryByName &&
           instance.data.running[ plugin ] ) {

        for ( var i = instance.data.running[ plugin ].length - 1, event; i >= 0; i-- ) {

          event = instance.data.running[ plugin ][ i ];
          event._natives.end.call( instance, null, event  );

          instance.emit( "trackend",
            Popcorn.extend({}, event, {
              plugin: event.type,
              type: "trackend"
            })
          );
        }
      }

      return instance;
    },
    enable: function( instance, plugin ) {

      if ( !instance.data.disabled[ plugin ] ) {
        return;
      }

      instance.data.disabled[ plugin ] = false;

      if ( plugin in Popcorn.registryByName &&
           instance.data.running[ plugin ] ) {

        for ( var i = instance.data.running[ plugin ].length - 1, event; i >= 0; i-- ) {

          event = instance.data.running[ plugin ][ i ];
          event._natives.start.call( instance, null, event  );

          instance.emit( "trackstart",
            Popcorn.extend({}, event, {
              plugin: event.type,
              type: "trackstart",
              track: event
            })
          );
        }
      }

      return instance;
    },
    destroy: function( instance ) {
      var events = instance.data.events,
          trackEvents = instance.data.trackEvents,
          singleEvent, item, fn, plugin;

      //  Iterate through all events and remove them
      for ( item in events ) {
        singleEvent = events[ item ];
        for ( fn in singleEvent ) {
          delete singleEvent[ fn ];
        }
        events[ item ] = null;
      }

      // remove all plugins off the given instance
      for ( plugin in Popcorn.registryByName ) {
        Popcorn.removePlugin( instance, plugin );
      }

      // Remove all data.trackEvents #1178
      trackEvents.byStart.length = 0;
      trackEvents.byEnd.length = 0;

      if ( !instance.isDestroyed ) {
        instance.data.timeUpdate && instance.media.removeEventListener( "timeupdate", instance.data.timeUpdate, false );
        instance.isDestroyed = true;
      }

      Popcorn.instances.splice( Popcorn.instances.indexOf( instance ), 1 );
    }
  });

  //  Memoized GUID Counter
  Popcorn.guid.counter = 1;

  //  Factory to implement getters, setters and controllers
  //  as Popcorn instance methods. The IIFE will create and return
  //  an object with defined methods
  Popcorn.extend(Popcorn.p, (function() {

      var methods = "load play pause currentTime playbackRate volume duration preload playbackRate " +
                    "autoplay loop controls muted buffered readyState seeking paused played seekable ended",
          ret = {};


      //  Build methods, store in object that is returned and passed to extend
      Popcorn.forEach( methods.split( /\s+/g ), function( name ) {

        ret[ name ] = function( arg ) {
          var previous;

          if ( typeof this.media[ name ] === "function" ) {

            // Support for shorthanded play(n)/pause(n) jump to currentTime
            // If arg is not null or undefined and called by one of the
            // allowed shorthandable methods, then set the currentTime
            // Supports time as seconds or SMPTE
            if ( arg != null && /play|pause/.test( name ) ) {
              this.media.currentTime = Popcorn.util.toSeconds( arg );
            }

            this.media[ name ]();

            return this;
          }

          if ( arg != null ) {
            // Capture the current value of the attribute property
            previous = this.media[ name ];

            // Set the attribute property with the new value
            this.media[ name ] = arg;

            // If the new value is not the same as the old value
            // emit an "attrchanged event"
            if ( previous !== arg ) {
              this.emit( "attrchange", {
                attribute: name,
                previousValue: previous,
                currentValue: arg
              });
            }
            return this;
          }

          return this.media[ name ];
        };
      });

      return ret;

    })()
  );

  Popcorn.forEach( "enable disable".split(" "), function( method ) {
    Popcorn.p[ method ] = function( plugin ) {
      return Popcorn[ method ]( this, plugin );
    };
  });

  Popcorn.extend(Popcorn.p, {

    //  Rounded currentTime
    roundTime: function() {
      return Math.round( this.media.currentTime );
    },

    //  Attach an event to a single point in time
    exec: function( id, time, fn ) {
      var length = arguments.length,
          eventType = "trackadded",
          trackEvent, sec, options;

      // Check if first could possibly be a SMPTE string
      // p.cue( "smpte string", fn );
      // try/catch avoid awful throw in Popcorn.util.toSeconds
      // TODO: Get rid of that, replace with NaN return?
      try {
        sec = Popcorn.util.toSeconds( id );
      } catch ( e ) {}

      // If it can be converted into a number then
      // it's safe to assume that the string was SMPTE
      if ( typeof sec === "number" ) {
        id = sec;
      }

      // Shift arguments based on use case
      //
      // Back compat for:
      // p.cue( time, fn );
      if ( typeof id === "number" && length === 2 ) {
        fn = time;
        time = id;
        id = Popcorn.guid( "cue" );
      } else {
        // Support for new forms

        // p.cue( "empty-cue" );
        if ( length === 1 ) {
          // Set a time for an empty cue. It's not important what
          // the time actually is, because the cue is a no-op
          time = -1;

        } else {

          // Get the TrackEvent that matches the given id.
          trackEvent = this.getTrackEvent( id );

          if ( trackEvent ) {

            // remove existing cue so a new one can be added via trackEvents.add
            this.data.trackEvents.remove( id );
            TrackEvent.end( this, trackEvent );
            // Update track event references
            Popcorn.removeTrackEvent.ref( this, id );

            eventType = "cuechange";

            // p.cue( "my-id", 12 );
            // p.cue( "my-id", function() { ... });
            if ( typeof id === "string" && length === 2 ) {

              // p.cue( "my-id", 12 );
              // The path will update the cue time.
              if ( typeof time === "number" ) {
                // Re-use existing TrackEvent start callback
                fn = trackEvent._natives.start;
              }

              // p.cue( "my-id", function() { ... });
              // The path will update the cue function
              if ( typeof time === "function" ) {
                fn = time;
                // Re-use existing TrackEvent start time
                time = trackEvent.start;
              }
            }
          } else {

            if ( length >= 2 ) {

              // p.cue( "a", "00:00:00");
              if ( typeof time === "string" ) {
                try {
                  sec = Popcorn.util.toSeconds( time );
                } catch ( e ) {}

                time = sec;
              }

              // p.cue( "b", 11 );
              // p.cue( "b", 11, function() {} );
              if ( typeof time === "number" ) {
                fn = fn || Popcorn.nop();
              }

              // p.cue( "c", function() {});
              if ( typeof time === "function" ) {
                fn = time;
                time = -1;
              }
            }
          }
        }
      }

      options = {
        id: id,
        start: time,
        end: time + 1,
        _running: false,
        _natives: {
          start: fn || Popcorn.nop,
          end: Popcorn.nop,
          type: "cue"
        }
      };

      if ( trackEvent ) {
        options = Popcorn.extend( trackEvent, options );
      }

      if ( eventType === "cuechange" ) {

        //  Supports user defined track event id
        options._id = options.id || options._id || Popcorn.guid( options._natives.type );

        this.data.trackEvents.add( options );
        TrackEvent.start( this, options );

        this.timeUpdate( this, null, true );

        // Store references to user added trackevents in ref table
        Popcorn.addTrackEvent.ref( this, options );

        this.emit( eventType, Popcorn.extend({}, options, {
          id: id,
          type: eventType,
          previousValue: {
            time: trackEvent.start,
            fn: trackEvent._natives.start
          },
          currentValue: {
            time: time,
            fn: fn || Popcorn.nop
          },
          track: trackEvent
        }));
      } else {
        //  Creating a one second track event with an empty end
        Popcorn.addTrackEvent( this, options );
      }

      return this;
    },

    // Mute the calling media, optionally toggle
    mute: function( toggle ) {

      var event = toggle == null || toggle === true ? "muted" : "unmuted";

      // If `toggle` is explicitly `false`,
      // unmute the media and restore the volume level
      if ( event === "unmuted" ) {
        this.media.muted = false;
        this.media.volume = this.data.state.volume;
      }

      // If `toggle` is either null or undefined,
      // save the current volume and mute the media element
      if ( event === "muted" ) {
        this.data.state.volume = this.media.volume;
        this.media.muted = true;
      }

      // Trigger either muted|unmuted event
      this.emit( event );

      return this;
    },

    // Convenience method, unmute the calling media
    unmute: function( toggle ) {

      return this.mute( toggle == null ? false : !toggle );
    },

    // Get the client bounding box of an instance element
    position: function() {
      return Popcorn.position( this.media );
    },

    // Toggle a plugin's playback behaviour (on or off) per instance
    toggle: function( plugin ) {
      return Popcorn[ this.data.disabled[ plugin ] ? "enable" : "disable" ]( this, plugin );
    },

    // Set default values for plugin options objects per instance
    defaults: function( plugin, defaults ) {

      // If an array of default configurations is provided,
      // iterate and apply each to this instance
      if ( Popcorn.isArray( plugin ) ) {

        Popcorn.forEach( plugin, function( obj ) {
          for ( var name in obj ) {
            this.defaults( name, obj[ name ] );
          }
        }, this );

        return this;
      }

      if ( !this.options.defaults ) {
        this.options.defaults = {};
      }

      if ( !this.options.defaults[ plugin ] ) {
        this.options.defaults[ plugin ] = {};
      }

      Popcorn.extend( this.options.defaults[ plugin ], defaults );

      return this;
    }
  });

  Popcorn.Events  = {
    UIEvents: "blur focus focusin focusout load resize scroll unload",
    MouseEvents: "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave click dblclick",
    Events: "loadstart progress suspend emptied stalled play pause error " +
            "loadedmetadata loadeddata waiting playing canplay canplaythrough " +
            "seeking seeked timeupdate ended ratechange durationchange volumechange"
  };

  Popcorn.Events.Natives = Popcorn.Events.UIEvents + " " +
                           Popcorn.Events.MouseEvents + " " +
                           Popcorn.Events.Events;

  internal.events.apiTypes = [ "UIEvents", "MouseEvents", "Events" ];

  // Privately compile events table at load time
  (function( events, data ) {

    var apis = internal.events.apiTypes,
    eventsList = events.Natives.split( /\s+/g ),
    idx = 0, len = eventsList.length, prop;

    for( ; idx < len; idx++ ) {
      data.hash[ eventsList[idx] ] = true;
    }

    apis.forEach(function( val, idx ) {

      data.apis[ val ] = {};

      var apiEvents = events[ val ].split( /\s+/g ),
      len = apiEvents.length,
      k = 0;

      for ( ; k < len; k++ ) {
        data.apis[ val ][ apiEvents[ k ] ] = true;
      }
    });
  })( Popcorn.Events, internal.events );

  Popcorn.events = {

    isNative: function( type ) {
      return !!internal.events.hash[ type ];
    },
    getInterface: function( type ) {

      if ( !Popcorn.events.isNative( type ) ) {
        return false;
      }

      var eventApi = internal.events,
        apis = eventApi.apiTypes,
        apihash = eventApi.apis,
        idx = 0, len = apis.length, api, tmp;

      for ( ; idx < len; idx++ ) {
        tmp = apis[ idx ];

        if ( apihash[ tmp ][ type ] ) {
          api = tmp;
          break;
        }
      }
      return api;
    },
    //  Compile all native events to single array
    all: Popcorn.Events.Natives.split( /\s+/g ),
    //  Defines all Event handling static functions
    fn: {
      trigger: function( type, data ) {
        var eventInterface, evt, clonedEvents,
            events = this.data.events[ type ];

        //  setup checks for custom event system
        if ( events ) {
          eventInterface  = Popcorn.events.getInterface( type );

          if ( eventInterface ) {
            evt = document.createEvent( eventInterface );
            evt.initEvent( type, true, true, global, 1 );

            this.media.dispatchEvent( evt );

            return this;
          }

          // clone events in case callbacks remove callbacks themselves
          clonedEvents = events.slice();

          // iterate through all callbacks
          while ( clonedEvents.length ) {
            clonedEvents.shift().call( this, data );
          }
        }

        return this;
      },
      listen: function( type, fn ) {
        var self = this,
            hasEvents = true,
            eventHook = Popcorn.events.hooks[ type ],
            origType = type,
            clonedEvents,
            tmp;

        if ( typeof fn !== "function" ) {
          throw new Error( "Popcorn.js Error: Listener is not a function" );
        }

        // Setup event registry entry
        if ( !this.data.events[ type ] ) {
          this.data.events[ type ] = [];
          // Toggle if the previous assumption was untrue
          hasEvents = false;
        }

        // Check and setup event hooks
        if ( eventHook ) {
          // Execute hook add method if defined
          if ( eventHook.add ) {
            eventHook.add.call( this, {}, fn );
          }

          // Reassign event type to our piggyback event type if defined
          if ( eventHook.bind ) {
            type = eventHook.bind;
          }

          // Reassign handler if defined
          if ( eventHook.handler ) {
            tmp = fn;

            fn = function wrapper( event ) {
              eventHook.handler.call( self, event, tmp );
            };
          }

          // assume the piggy back event is registered
          hasEvents = true;

          // Setup event registry entry
          if ( !this.data.events[ type ] ) {
            this.data.events[ type ] = [];
            // Toggle if the previous assumption was untrue
            hasEvents = false;
          }
        }

        //  Register event and handler
        this.data.events[ type ].push( fn );

        // only attach one event of any type
        if ( !hasEvents && Popcorn.events.all.indexOf( type ) > -1 ) {
          this.media.addEventListener( type, function( event ) {
            if ( self.data.events[ type ] ) {
              // clone events in case callbacks remove callbacks themselves
              clonedEvents = self.data.events[ type ].slice();

              // iterate through all callbacks
              while ( clonedEvents.length ) {
                clonedEvents.shift().call( self, event );
              }
            }
          }, false );
        }
        return this;
      },
      unlisten: function( type, fn ) {
        var ind,
            events = this.data.events[ type ];

        if ( !events ) {
          return; // no listeners = nothing to do
        }

        if ( typeof fn === "string" ) {
          // legacy support for string-based removal -- not recommended
          for ( var i = 0; i < events.length; i++ ) {
            if ( events[ i ].name === fn ) {
              // decrement i because array length just got smaller
              events.splice( i--, 1 );
            }
          }

          return this;
        } else if ( typeof fn === "function" ) {
          while( ind !== -1 ) {
            ind = events.indexOf( fn );
            if ( ind !== -1 ) {
              events.splice( ind, 1 );
            }
          }

          return this;
        }

        // if we got to this point, we are deleting all functions of this type
        this.data.events[ type ] = null;

        return this;
      }
    },
    hooks: {
      canplayall: {
        bind: "canplaythrough",
        add: function( event, callback ) {

          var state = false;

          if ( this.media.readyState ) {

            // always call canplayall asynchronously
            setTimeout(function() {
              callback.call( this, event );
            }.bind(this), 0 );

            state = true;
          }

          this.data.hooks.canplayall = {
            fired: state
          };
        },
        // declare special handling instructions
        handler: function canplayall( event, callback ) {

          if ( !this.data.hooks.canplayall.fired ) {
            // trigger original user callback once
            callback.call( this, event );

            this.data.hooks.canplayall.fired = true;
          }
        }
      }
    }
  };

  //  Extend Popcorn.events.fns (listen, unlisten, trigger) to all Popcorn instances
  //  Extend aliases (on, off, emit)
  Popcorn.forEach( [ [ "trigger", "emit" ], [ "listen", "on" ], [ "unlisten", "off" ] ], function( key ) {
    Popcorn.p[ key[ 0 ] ] = Popcorn.p[ key[ 1 ] ] = Popcorn.events.fn[ key[ 0 ] ];
  });

  // Internal Only - construct simple "TrackEvent"
  // data type objects
  function TrackEvent( track ) {
    Abstract.put.call( this, track );
  }

  // Determine if a TrackEvent's "start" and "trackstart" must be called.
  TrackEvent.start = function( instance, track ) {

    if ( track.end > instance.media.currentTime &&
        track.start <= instance.media.currentTime && !track._running ) {

      track._running = true;
      instance.data.running[ track._natives.type ].push( track );

      if ( !instance.data.disabled[ track._natives.type ] ) {

        track._natives.start.call( instance, null, track );

        instance.emit( "trackstart",
          Popcorn.extend( {}, track, {
            plugin: track._natives.type,
            type: "trackstart",
            track: track
          })
        );
      }
    }
  };

  // Determine if a TrackEvent's "end" and "trackend" must be called.
  TrackEvent.end = function( instance, track ) {

    var runningPlugins;

    if ( ( track.end <= instance.media.currentTime ||
        track.start > instance.media.currentTime ) && track._running ) {

      runningPlugins = instance.data.running[ track._natives.type ];

      track._running = false;
      runningPlugins.splice( runningPlugins.indexOf( track ), 1 );

      if ( !instance.data.disabled[ track._natives.type ] ) {

        track._natives.end.call( instance, null, track );

        instance.emit( "trackend",
          Popcorn.extend( {}, track, {
            plugin: track._natives.type,
            type: "trackend",
            track: track
          })
        );
      }
    }
  };

  // Internal Only - construct "TrackEvents"
  // data type objects that are used by the Popcorn
  // instance, stored at p.data.trackEvents
  function TrackEvents( parent ) {
    this.parent = parent;

    this.byStart = [{
      start: -1,
      end: -1
    }];

    this.byEnd = [{
      start: -1,
      end: -1
    }];
    this.animating = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.previousUpdateTime = -1;

    Object.defineProperty( this, "count", {
      get: function() {
        return this.byStart.length;
      }
    });
  }

  function isMatch( obj, key, value ) {
    return obj[ key ] && obj[ key ] === value;
  }

  TrackEvents.prototype.where = function( params ) {
    return ( this.parent.getTrackEvents() || [] ).filter(function( event ) {
      var key, value;

      // If no explicit params, match all TrackEvents
      if ( !params ) {
        return true;
      }

      // Filter keys in params against both the top level properties
      // and the _natives properties
      for ( key in params ) {
        value = params[ key ];
        if ( isMatch( event, key, value ) || isMatch( event._natives, key, value ) ) {
          return true;
        }
      }
      return false;
    });
  };

  TrackEvents.prototype.add = function( track ) {

    //  Store this definition in an array sorted by times
    var byStart = this.byStart,
        byEnd = this.byEnd,
        startIndex, endIndex;

    //  Push track event ids into the history
    if ( track && track._id ) {
      this.parent.data.history.push( track._id );
    }

    track.start = Popcorn.util.toSeconds( track.start, this.parent.options.framerate );
    track.end   = Popcorn.util.toSeconds( track.end, this.parent.options.framerate );

    for ( startIndex = byStart.length - 1; startIndex >= 0; startIndex-- ) {

      if ( track.start >= byStart[ startIndex ].start ) {
        byStart.splice( startIndex + 1, 0, track );
        break;
      }
    }

    for ( endIndex = byEnd.length - 1; endIndex >= 0; endIndex-- ) {

      if ( track.end > byEnd[ endIndex ].end ) {
        byEnd.splice( endIndex + 1, 0, track );
        break;
      }
    }

    // update startIndex and endIndex
    if ( startIndex <= this.parent.data.trackEvents.startIndex &&
      track.start <= this.parent.data.trackEvents.previousUpdateTime ) {

      this.parent.data.trackEvents.startIndex++;
    }

    if ( endIndex <= this.parent.data.trackEvents.endIndex &&
      track.end < this.parent.data.trackEvents.previousUpdateTime ) {

      this.parent.data.trackEvents.endIndex++;
    }

  };

  TrackEvents.prototype.remove = function( removeId, state ) {

    if ( removeId instanceof TrackEvent ) {
      removeId = removeId.id;
    }

    if ( typeof removeId === "object" ) {
      // Filter by key=val and remove all matching TrackEvents
      this.where( removeId ).forEach(function( event ) {
        // |this| refers to the calling Popcorn "parent" instance
        this.removeTrackEvent( event._id );
      }, this.parent );

      return this;
    }

    var start, end, animate, historyLen, track,
        length = this.byStart.length,
        index = 0,
        indexWasAt = 0,
        byStart = [],
        byEnd = [],
        animating = [],
        history = [],
        comparable = {};

    state = state || {};

    while ( --length > -1 ) {
      start = this.byStart[ index ];
      end = this.byEnd[ index ];

      // Padding events will not have _id properties.
      // These should be safely pushed onto the front and back of the
      // track event array
      if ( !start._id ) {
        byStart.push( start );
        byEnd.push( end );
      }

      // Filter for user track events (vs system track events)
      if ( start._id ) {

        // If not a matching start event for removal
        if ( start._id !== removeId ) {
          byStart.push( start );
        }

        // If not a matching end event for removal
        if ( end._id !== removeId ) {
          byEnd.push( end );
        }

        // If the _id is matched, capture the current index
        if ( start._id === removeId ) {
          indexWasAt = index;

          // cache the track event being removed
          track = start;
        }
      }
      // Increment the track index
      index++;
    }

    // Reset length to be used by the condition below to determine
    // if animating track events should also be filtered for removal.
    // Reset index below to be used by the reverse while as an
    // incrementing counter
    length = this.animating.length;
    index = 0;

    if ( length ) {
      while ( --length > -1 ) {
        animate = this.animating[ index ];

        // Padding events will not have _id properties.
        // These should be safely pushed onto the front and back of the
        // track event array
        if ( !animate._id ) {
          animating.push( animate );
        }

        // If not a matching animate event for removal
        if ( animate._id && animate._id !== removeId ) {
          animating.push( animate );
        }
        // Increment the track index
        index++;
      }
    }

    //  Update
    if ( indexWasAt <= this.startIndex ) {
      this.startIndex--;
    }

    if ( indexWasAt <= this.endIndex ) {
      this.endIndex--;
    }

    this.byStart = byStart;
    this.byEnd = byEnd;
    this.animating = animating;

    historyLen = this.parent.data.history.length;

    for ( var i = 0; i < historyLen; i++ ) {
      if ( this.parent.data.history[ i ] !== removeId ) {
        history.push( this.parent.data.history[ i ] );
      }
    }

    // Update ordered history array
    this.parent.data.history = history;

  };

  // Helper function used to retrieve old values of properties that
  // are provided for update.
  function getPreviousProperties( oldOptions, newOptions ) {
    var matchProps = {};

    for ( var prop in oldOptions ) {
      if ( hasOwn.call( newOptions, prop ) && hasOwn.call( oldOptions, prop ) ) {
        matchProps[ prop ] = oldOptions[ prop ];
      }
    }

    return matchProps;
  }

  // Internal Only - Adds track events to the instance object
  Popcorn.addTrackEvent = function( obj, track ) {

    if ( track instanceof TrackEvent ) {
      return;
    }

    track = new TrackEvent( track );

    // Determine if this track has default options set for it
    // If so, apply them to the track object
    if ( track && track._natives && track._natives.type &&
        ( obj.options.defaults && obj.options.defaults[ track._natives.type ] ) ) {

      track = Popcorn.extend( {}, obj.options.defaults[ track._natives.type ], track );
    }

    if ( track._natives ) {
      //  Supports user defined track event id
      track._id = track.id || track._id || Popcorn.guid( track._natives.type );

      // Trigger _setup method if exists
      if ( track._natives._setup ) {

        track._natives._setup.call( obj, track );

        obj.emit( "tracksetup", Popcorn.extend( {}, track, {
          plugin: track._natives.type,
          type: "tracksetup",
          track: track
        }));
      }
    }

    obj.data.trackEvents.add( track );
    TrackEvent.start( obj, track );

    this.timeUpdate( obj, null, true );

    // Store references to user added trackevents in ref table
    if ( track._id ) {
      Popcorn.addTrackEvent.ref( obj, track );
    }

    obj.emit( "trackadded", Popcorn.extend({}, track,
      track._natives ? { plugin: track._natives.type } : {}, {
        type: "trackadded",
        track: track
    }));
  };

  // Internal Only - Adds track event references to the instance object's trackRefs hash table
  Popcorn.addTrackEvent.ref = function( obj, track ) {
    obj.data.trackRefs[ track._id ] = track;

    return obj;
  };

  Popcorn.removeTrackEvent = function( obj, removeId ) {
    var track = obj.getTrackEvent( removeId );

    if ( !track ) {
      return;
    }

    // If a _teardown function was defined,
    // enforce for track event removals
    if ( track._natives._teardown ) {
      track._natives._teardown.call( obj, track );
    }

    obj.data.trackEvents.remove( removeId );

    // Update track event references
    Popcorn.removeTrackEvent.ref( obj, removeId );

    if ( track._natives ) {

      // Fire a trackremoved event
      obj.emit( "trackremoved", Popcorn.extend({}, track, {
        plugin: track._natives.type,
        type: "trackremoved",
        track: track
      }));
    }
  };

  // Internal Only - Removes track event references from instance object's trackRefs hash table
  Popcorn.removeTrackEvent.ref = function( obj, removeId ) {
    delete obj.data.trackRefs[ removeId ];

    return obj;
  };

  // Return an array of track events bound to this instance object
  Popcorn.getTrackEvents = function( obj ) {

    var trackevents = [],
      refs = obj.data.trackEvents.byStart,
      length = refs.length,
      idx = 0,
      ref;

    for ( ; idx < length; idx++ ) {
      ref = refs[ idx ];
      // Return only user attributed track event references
      if ( ref._id ) {
        trackevents.push( ref );
      }
    }

    return trackevents;
  };

  // Internal Only - Returns an instance object's trackRefs hash table
  Popcorn.getTrackEvents.ref = function( obj ) {
    return obj.data.trackRefs;
  };

  // Return a single track event bound to this instance object
  Popcorn.getTrackEvent = function( obj, trackId ) {
    return obj.data.trackRefs[ trackId ];
  };

  // Internal Only - Returns an instance object's track reference by track id
  Popcorn.getTrackEvent.ref = function( obj, trackId ) {
    return obj.data.trackRefs[ trackId ];
  };

  Popcorn.getLastTrackEventId = function( obj ) {
    return obj.data.history[ obj.data.history.length - 1 ];
  };

  Popcorn.timeUpdate = function( obj, event ) {
    var currentTime = obj.media.currentTime,
        previousTime = obj.data.trackEvents.previousUpdateTime,
        tracks = obj.data.trackEvents,
        end = tracks.endIndex,
        start = tracks.startIndex,
        byStartLen = tracks.byStart.length,
        byEndLen = tracks.byEnd.length,
        registryByName = Popcorn.registryByName,
        trackstart = "trackstart",
        trackend = "trackend",

        byEnd, byStart, byAnimate, natives, type, runningPlugins;

    //  Playbar advancing
    if ( previousTime <= currentTime ) {

      while ( tracks.byEnd[ end ] && tracks.byEnd[ end ].end <= currentTime ) {

        byEnd = tracks.byEnd[ end ];
        natives = byEnd._natives;
        type = natives && natives.type;

        //  If plugin does not exist on this instance, remove it
        if ( !natives ||
            ( !!registryByName[ type ] ||
              !!obj[ type ] ) ) {

          if ( byEnd._running === true ) {

            byEnd._running = false;
            runningPlugins = obj.data.running[ type ];
            runningPlugins.splice( runningPlugins.indexOf( byEnd ), 1 );

            if ( !obj.data.disabled[ type ] ) {

              natives.end.call( obj, event, byEnd );

              obj.emit( trackend,
                Popcorn.extend({}, byEnd, {
                  plugin: type,
                  type: trackend,
                  track: byEnd
                })
              );
            }
          }

          end++;
        } else {
          // remove track event
          Popcorn.removeTrackEvent( obj, byEnd._id );
          return;
        }
      }

      while ( tracks.byStart[ start ] && tracks.byStart[ start ].start <= currentTime ) {

        byStart = tracks.byStart[ start ];
        natives = byStart._natives;
        type = natives && natives.type;
        //  If plugin does not exist on this instance, remove it
        if ( !natives ||
            ( !!registryByName[ type ] ||
              !!obj[ type ] ) ) {
          if ( byStart.end > currentTime &&
                byStart._running === false ) {

            byStart._running = true;
            obj.data.running[ type ].push( byStart );

            if ( !obj.data.disabled[ type ] ) {

              natives.start.call( obj, event, byStart );

              obj.emit( trackstart,
                Popcorn.extend({}, byStart, {
                  plugin: type,
                  type: trackstart,
                  track: byStart
                })
              );
            }
          }
          start++;
        } else {
          // remove track event
          Popcorn.removeTrackEvent( obj, byStart._id );
          return;
        }
      }

    // Playbar receding
    } else if ( previousTime > currentTime ) {

      while ( tracks.byStart[ start ] && tracks.byStart[ start ].start > currentTime ) {

        byStart = tracks.byStart[ start ];
        natives = byStart._natives;
        type = natives && natives.type;

        // if plugin does not exist on this instance, remove it
        if ( !natives ||
            ( !!registryByName[ type ] ||
              !!obj[ type ] ) ) {

          if ( byStart._running === true ) {

            byStart._running = false;
            runningPlugins = obj.data.running[ type ];
            runningPlugins.splice( runningPlugins.indexOf( byStart ), 1 );

            if ( !obj.data.disabled[ type ] ) {

              natives.end.call( obj, event, byStart );

              obj.emit( trackend,
                Popcorn.extend({}, byStart, {
                  plugin: type,
                  type: trackend,
                  track: byStart
                })
              );
            }
          }
          start--;
        } else {
          // remove track event
          Popcorn.removeTrackEvent( obj, byStart._id );
          return;
        }
      }

      while ( tracks.byEnd[ end ] && tracks.byEnd[ end ].end > currentTime ) {

        byEnd = tracks.byEnd[ end ];
        natives = byEnd._natives;
        type = natives && natives.type;

        // if plugin does not exist on this instance, remove it
        if ( !natives ||
            ( !!registryByName[ type ] ||
              !!obj[ type ] ) ) {

          if ( byEnd.start <= currentTime &&
                byEnd._running === false ) {

            byEnd._running = true;
            obj.data.running[ type ].push( byEnd );

            if ( !obj.data.disabled[ type ] ) {

              natives.start.call( obj, event, byEnd );

              obj.emit( trackstart,
                Popcorn.extend({}, byEnd, {
                  plugin: type,
                  type: trackstart,
                  track: byEnd
                })
              );
            }
          }
          end--;
        } else {
          // remove track event
          Popcorn.removeTrackEvent( obj, byEnd._id );
          return;
        }
      }
    }

    tracks.endIndex = end;
    tracks.startIndex = start;
    tracks.previousUpdateTime = currentTime;

    //enforce index integrity if trackRemoved
    tracks.byStart.length < byStartLen && tracks.startIndex--;
    tracks.byEnd.length < byEndLen && tracks.endIndex--;

  };

  //  Map and Extend TrackEvent functions to all Popcorn instances
  Popcorn.extend( Popcorn.p, {

    getTrackEvents: function() {
      return Popcorn.getTrackEvents.call( null, this );
    },

    getTrackEvent: function( id ) {
      return Popcorn.getTrackEvent.call( null, this, id );
    },

    getLastTrackEventId: function() {
      return Popcorn.getLastTrackEventId.call( null, this );
    },

    removeTrackEvent: function( id ) {

      Popcorn.removeTrackEvent.call( null, this, id );
      return this;
    },

    removePlugin: function( name ) {
      Popcorn.removePlugin.call( null, this, name );
      return this;
    },

    timeUpdate: function( event ) {
      Popcorn.timeUpdate.call( null, this, event );
      return this;
    },

    destroy: function() {
      Popcorn.destroy.call( null, this );
      return this;
    }
  });

  //  Plugin manifests
  Popcorn.manifest = {};
  //  Plugins are registered
  Popcorn.registry = [];
  Popcorn.registryByName = {};
  //  An interface for extending Popcorn
  //  with plugin functionality
  Popcorn.plugin = function( name, definition, manifest ) {

    if ( Popcorn.protect.natives.indexOf( name.toLowerCase() ) >= 0 ) {
      Popcorn.error( "'" + name + "' is a protected function name" );
      return;
    }

    //  Provides some sugar, but ultimately extends
    //  the definition into Popcorn.p
    var isfn = typeof definition === "function",
        blacklist = [ "start", "end", "type", "manifest" ],
        methods = [ "_setup", "_teardown", "start", "end", "frame" ],
        plugin = {},
        setup;

    // combines calls of two function calls into one
    var combineFn = function( first, second ) {

      first = first || Popcorn.nop;
      second = second || Popcorn.nop;

      return function() {
        first.apply( this, arguments );
        second.apply( this, arguments );
      };
    };

    //  If `manifest` arg is undefined, check for manifest within the `definition` object
    //  If no `definition.manifest`, an empty object is a sufficient fallback
    Popcorn.manifest[ name ] = manifest = manifest || definition.manifest || {};

    // apply safe, and empty default functions
    methods.forEach(function( method ) {
      definition[ method ] = safeTry( definition[ method ] || Popcorn.nop, name );
    });

    var pluginFn = function( setup, options ) {

      if ( !options ) {
        return this;
      }

      // When the "ranges" property is set and its value is an array, short-circuit
      // the pluginFn definition to recall itself with an options object generated from
      // each range object in the ranges array. (eg. { start: 15, end: 16 } )
      if ( options.ranges && Popcorn.isArray(options.ranges) ) {
        Popcorn.forEach( options.ranges, function( range ) {
          // Create a fresh object, extend with current options
          // and start/end range object's properties
          // Works with in/out as well.
          var opts = Popcorn.extend( {}, options, range );

          // Remove the ranges property to prevent infinitely
          // entering this condition
          delete opts.ranges;

          // Call the plugin with the newly created opts object
          this[ name ]( opts );
        }, this);

        // Return the Popcorn instance to avoid creating an empty track event
        return this;
      }

      //  Storing the plugin natives
      var natives = options._natives = {},
          compose = "",
          originalOpts, manifestOpts;

      Popcorn.extend( natives, setup );

      options._natives.type = options._natives.plugin = name;
      options._running = false;

      natives.start = natives.start || natives[ "in" ];
      natives.end = natives.end || natives[ "out" ];

      if ( options.once ) {
        natives.end = combineFn( natives.end, function() {
          this.removeTrackEvent( options._id );
        });
      }

      // extend teardown to always call end if running
      natives._teardown = combineFn(function() {

        var args = slice.call( arguments ),
            runningPlugins = this.data.running[ natives.type ];

        // end function signature is not the same as teardown,
        // put null on the front of arguments for the event parameter
        args.unshift( null );

        // only call end if event is running
        args[ 1 ]._running &&
          runningPlugins.splice( runningPlugins.indexOf( options ), 1 ) &&
          natives.end.apply( this, args );

        args[ 1 ]._running = false;
        this.emit( "trackend",
          Popcorn.extend( {}, options, {
            plugin: natives.type,
            type: "trackend",
            track: Popcorn.getTrackEvent( this, options.id || options._id )
          })
        );
      }, natives._teardown );

      // extend teardown to always trigger trackteardown after teardown
      natives._teardown = combineFn( natives._teardown, function() {

        this.emit( "trackteardown", Popcorn.extend( {}, options, {
          plugin: name,
          type: "trackteardown",
          track: Popcorn.getTrackEvent( this, options.id || options._id )
        }));
      });

      // default to an empty string if no effect exists
      // split string into an array of effects
      options.compose = options.compose || [];
      if ( typeof options.compose === "string" ) {
        options.compose = options.compose.split( " " );
      }
      options.effect = options.effect || [];
      if ( typeof options.effect === "string" ) {
        options.effect = options.effect.split( " " );
      }

      // join the two arrays together
      options.compose = options.compose.concat( options.effect );

      options.compose.forEach(function( composeOption ) {

        // if the requested compose is garbage, throw it away
        compose = Popcorn.compositions[ composeOption ] || {};

        // extends previous functions with compose function
        methods.forEach(function( method ) {
          natives[ method ] = combineFn( natives[ method ], compose[ method ] );
        });
      });

      //  Ensure a manifest object, an empty object is a sufficient fallback
      options._natives.manifest = manifest;

      //  Checks for expected properties
      if ( !( "start" in options ) ) {
        options.start = options[ "in" ] || 0;
      }

      if ( !options.end && options.end !== 0 ) {
        options.end = options[ "out" ] || Number.MAX_VALUE;
      }

      // Use hasOwn to detect non-inherited toString, since all
      // objects will receive a toString - its otherwise undetectable
      if ( !hasOwn.call( options, "toString" ) ) {
        options.toString = function() {
          var props = [
            "start: " + options.start,
            "end: " + options.end,
            "id: " + (options.id || options._id)
          ];

          // Matches null and undefined, allows: false, 0, "" and truthy
          if ( options.target != null ) {
            props.push( "target: " + options.target );
          }

          return name + " ( " + props.join(", ") + " )";
        };
      }

      // Resolves 239, 241, 242
      if ( !options.target ) {

        //  Sometimes the manifest may be missing entirely
        //  or it has an options object that doesn't have a `target` property
        manifestOpts = "options" in manifest && manifest.options;

        options.target = manifestOpts && "target" in manifestOpts && manifestOpts.target;
      }

      if ( !options._id && options._natives ) {
        // ensure an initial id is there before setup is called
        options._id = Popcorn.guid( options._natives.type );
      }

      if ( options instanceof TrackEvent ) {

        if ( options._natives ) {
          //  Supports user defined track event id
          options._id = options.id || options._id || Popcorn.guid( options._natives.type );

          // Trigger _setup method if exists
          if ( options._natives._setup ) {

            options._natives._setup.call( this, options );

            this.emit( "tracksetup", Popcorn.extend( {}, options, {
              plugin: options._natives.type,
              type: "tracksetup",
              track: options
            }));
          }
        }

        this.data.trackEvents.add( options );
        TrackEvent.start( this, options );

        this.timeUpdate( this, null, true );

        // Store references to user added trackevents in ref table
        if ( options._id ) {
          Popcorn.addTrackEvent.ref( this, options );
        }
      } else {
        // Create new track event for this instance
        Popcorn.addTrackEvent( this, options );
      }

      //  Future support for plugin event definitions
      //  for all of the native events
      Popcorn.forEach( setup, function( callback, type ) {
        // Don't attempt to create events for certain properties:
        // "start", "end", "type", "manifest". Fixes #1365
        if ( blacklist.indexOf( type ) === -1 ) {
          this.on( type, callback );
        }
      }, this );

      return this;
    };

    //  Extend Popcorn.p with new named definition
    //  Assign new named definition
    Popcorn.p[ name ] = plugin[ name ] = function( id, options ) {
      var length = arguments.length,
          trackEvent, defaults, mergedSetupOpts, previousOpts, newOpts;

      // Shift arguments based on use case
      //
      // Back compat for:
      // p.plugin( options );
      if ( id && !options ) {
        options = id;
        id = null;
      } else {

        // Get the trackEvent that matches the given id.
        trackEvent = this.getTrackEvent( id );

        // If the track event does not exist, ensure that the options
        // object has a proper id
        if ( !trackEvent ) {
          options.id = id;

        // If the track event does exist, merge the updated properties
        } else {

          newOpts = options;
          previousOpts = getPreviousProperties( trackEvent, newOpts );

          // Call the plugins defined update method if provided. Allows for
          // custom defined updating for a track event to be defined by the plugin author
          if ( trackEvent._natives._update ) {

            this.data.trackEvents.remove( trackEvent );

            // It's safe to say that the intent of Start/End will never change
            // Update them first before calling update
            if ( hasOwn.call( options, "start" ) ) {
              trackEvent.start = options.start;
            }

            if ( hasOwn.call( options, "end" ) ) {
              trackEvent.end = options.end;
            }

            TrackEvent.end( this, trackEvent );

            if ( isfn ) {
              definition.call( this, trackEvent );
            }

            trackEvent._natives._update.call( this, trackEvent, options );

            this.data.trackEvents.add( trackEvent );
            TrackEvent.start( this, trackEvent );
          } else {
            // This branch is taken when there is no explicitly defined
            // _update method for a plugin. Which will occur either explicitly or
            // as a result of the plugin definition being a function that _returns_
            // a definition object.
            //
            // In either case, this path can ONLY be reached for TrackEvents that
            // already exist.

            // Directly update the TrackEvent instance.
            // This supports TrackEvent invariant enforcement.
            Popcorn.extend( trackEvent, options );

            this.data.trackEvents.remove( id );

            // If a _teardown function was defined,
            // enforce for track event removals
            if ( trackEvent._natives._teardown ) {
              trackEvent._natives._teardown.call( this, trackEvent );
            }

            // Update track event references
            Popcorn.removeTrackEvent.ref( this, id );

            if ( isfn ) {
              pluginFn.call( this, definition.call( this, trackEvent ), trackEvent );
            } else {

              //  Supports user defined track event id
              trackEvent._id = trackEvent.id || trackEvent._id || Popcorn.guid( trackEvent._natives.type );

              if ( trackEvent._natives && trackEvent._natives._setup ) {

                trackEvent._natives._setup.call( this, trackEvent );

                this.emit( "tracksetup", Popcorn.extend( {}, trackEvent, {
                  plugin: trackEvent._natives.type,
                  type: "tracksetup",
                  track: trackEvent
                }));
              }

              this.data.trackEvents.add( trackEvent );
              TrackEvent.start( this, trackEvent );

              this.timeUpdate( this, null, true );

              // Store references to user added trackevents in ref table
              Popcorn.addTrackEvent.ref( this, trackEvent );
            }

            // Fire an event with change information
            this.emit( "trackchange", {
              id: trackEvent.id,
              type: "trackchange",
              previousValue: previousOpts,
              currentValue: trackEvent,
              track: trackEvent
            });

            return this;
          }

          if ( trackEvent._natives.type !== "cue" ) {
            // Fire an event with change information
            this.emit( "trackchange", {
              id: trackEvent.id,
              type: "trackchange",
              previousValue: previousOpts,
              currentValue: newOpts,
              track: trackEvent
            });
          }

          return this;
        }
      }

      this.data.running[ name ] = this.data.running[ name ] || [];

      // Merge with defaults if they exist, make sure per call is prioritized
      defaults = ( this.options.defaults && this.options.defaults[ name ] ) || {};
      mergedSetupOpts = Popcorn.extend( {}, defaults, options );

      pluginFn.call( this, isfn ? definition.call( this, mergedSetupOpts ) : definition,
                                  mergedSetupOpts );

      return this;
    };

    // if the manifest parameter exists we should extend it onto the definition object
    // so that it shows up when calling Popcorn.registry and Popcorn.registryByName
    if ( manifest ) {
      Popcorn.extend( definition, {
        manifest: manifest
      });
    }

    //  Push into the registry
    var entry = {
      fn: plugin[ name ],
      definition: definition,
      base: definition,
      parents: [],
      name: name
    };
    Popcorn.registry.push(
       Popcorn.extend( plugin, entry, {
        type: name
      })
    );
    Popcorn.registryByName[ name ] = entry;

    return plugin;
  };

  // Storage for plugin function errors
  Popcorn.plugin.errors = [];

  // Returns wrapped plugin function
  function safeTry( fn, pluginName ) {
    return function() {

      //  When Popcorn.plugin.debug is true, do not suppress errors
      if ( Popcorn.plugin.debug ) {
        return fn.apply( this, arguments );
      }

      try {
        return fn.apply( this, arguments );
      } catch ( ex ) {

        // Push plugin function errors into logging queue
        Popcorn.plugin.errors.push({
          plugin: pluginName,
          thrown: ex,
          source: fn.toString()
        });

        // Trigger an error that the instance can listen for
        // and react to
        this.emit( "pluginerror", Popcorn.plugin.errors );
      }
    };
  }

  // Debug-mode flag for plugin development
  // True for Popcorn development versions, false for stable/tagged versions
  Popcorn.plugin.debug = ( Popcorn.version === "@" + "VERSION" );

  //  removePlugin( type ) removes all tracks of that from all instances of popcorn
  //  removePlugin( obj, type ) removes all tracks of type from obj, where obj is a single instance of popcorn
  Popcorn.removePlugin = function( obj, name ) {

    //  Check if we are removing plugin from an instance or from all of Popcorn
    if ( !name ) {

      //  Fix the order
      name = obj;
      obj = Popcorn.p;

      if ( Popcorn.protect.natives.indexOf( name.toLowerCase() ) >= 0 ) {
        Popcorn.error( "'" + name + "' is a protected function name" );
        return;
      }

      var registryLen = Popcorn.registry.length,
          registryIdx;

      // remove plugin reference from registry
      for ( registryIdx = 0; registryIdx < registryLen; registryIdx++ ) {
        if ( Popcorn.registry[ registryIdx ].name === name ) {
          Popcorn.registry.splice( registryIdx, 1 );
          delete Popcorn.registryByName[ name ];
          delete Popcorn.manifest[ name ];

          // delete the plugin
          delete obj[ name ];

          // plugin found and removed, stop checking, we are done
          return;
        }
      }

    }

    var byStart = obj.data.trackEvents.byStart,
        byEnd = obj.data.trackEvents.byEnd,
        animating = obj.data.trackEvents.animating,
        idx, sl;

    // remove all trackEvents
    for ( idx = 0, sl = byStart.length; idx < sl; idx++ ) {

      if ( byStart[ idx ] && byStart[ idx ]._natives && byStart[ idx ]._natives.type === name ) {

        byStart[ idx ]._natives._teardown && byStart[ idx ]._natives._teardown.call( obj, byStart[ idx ] );

        byStart.splice( idx, 1 );

        // update for loop if something removed, but keep checking
        idx--; sl--;
        if ( obj.data.trackEvents.startIndex <= idx ) {
          obj.data.trackEvents.startIndex--;
          obj.data.trackEvents.endIndex--;
        }
      }

      // clean any remaining references in the end index
      // we do this seperate from the above check because they might not be in the same order
      if ( byEnd[ idx ] && byEnd[ idx ]._natives && byEnd[ idx ]._natives.type === name ) {

        byEnd.splice( idx, 1 );
      }
    }

    //remove all animating events
    for ( idx = 0, sl = animating.length; idx < sl; idx++ ) {

      if ( animating[ idx ] && animating[ idx ]._natives && animating[ idx ]._natives.type === name ) {

        animating.splice( idx, 1 );

        // update for loop if something removed, but keep checking
        idx--; sl--;
      }
    }

  };

  Popcorn.compositions = {};

  //  Plugin inheritance
  Popcorn.compose = function( name, definition, manifest ) {

    //  If `manifest` arg is undefined, check for manifest within the `definition` object
    //  If no `definition.manifest`, an empty object is a sufficient fallback
    Popcorn.manifest[ name ] = manifest = manifest || definition.manifest || {};

    // register the effect by name
    Popcorn.compositions[ name ] = definition;
  };

  Popcorn.plugin.effect = Popcorn.effect = Popcorn.compose;

  var rnaiveExpr = /^(?:\.|#|\[)/;

  //  Basic DOM utilities and helpers API. See #1037
  Popcorn.dom = {
    debug: false,
    //  Popcorn.dom.find( selector, context )
    //
    //  Returns the first element that matches the specified selector
    //  Optionally provide a context element, defaults to `document`
    //
    //  eg.
    //  Popcorn.dom.find("video") returns the first video element
    //  Popcorn.dom.find("#foo") returns the first element with `id="foo"`
    //  Popcorn.dom.find("foo") returns the first element with `id="foo"`
    //     Note: Popcorn.dom.find("foo") is the only allowed deviation
    //           from valid querySelector selector syntax
    //
    //  Popcorn.dom.find(".baz") returns the first element with `class="baz"`
    //  Popcorn.dom.find("[preload]") returns the first element with `preload="..."`
    //  ...
    //  See https://developer.mozilla.org/En/DOM/Document.querySelector
    //
    //
    find: function( selector, context ) {
      var node = null;

      //  Default context is the `document`
      context = context || document;

      if ( selector ) {

        //  If the selector does not begin with "#", "." or "[",
        //  it could be either a nodeName or ID w/o "#"
        if ( !rnaiveExpr.test( selector ) ) {

          //  Try finding an element that matches by ID first
          node = document.getElementById( selector );

          //  If a match was found by ID, return the element
          if ( node !== null ) {
            return node;
          }
        }
        //  Assume no elements have been found yet
        //  Catch any invalid selector syntax errors and bury them.
        try {
          node = context.querySelector( selector );
        } catch ( e ) {
          if ( Popcorn.dom.debug ) {
            throw new Error(e);
          }
        }
      }
      return node;
    }
  };

  //  Cache references to reused RegExps
  var rparams = /\?/,
  //  XHR Setup object
  setup = {
    url: "",
    data: "",
    dataType: "",
    success: Popcorn.nop,
    type: "GET",
    async: true,
    xhr: function() {
      return new global.XMLHttpRequest();
    }
  };

  Popcorn.xhr = function( options ) {

    options.dataType = options.dataType && options.dataType.toLowerCase() || null;

    if ( options.dataType &&
         ( options.dataType === "jsonp" || options.dataType === "script" ) ) {

      Popcorn.xhr.getJSONP(
        options.url,
        options.success,
        options.dataType === "script"
      );
      return;
    }

    var settings = Popcorn.extend( {}, setup, options );

    //  Create new XMLHttpRequest object
    settings.ajax  = settings.xhr();

    if ( settings.ajax ) {

      if ( settings.type === "GET" && settings.data ) {

        //  append query string
        settings.url += ( rparams.test( settings.url ) ? "&" : "?" ) + settings.data;

        //  Garbage collect and reset settings.data
        settings.data = null;
      }


      settings.ajax.open( settings.type, settings.url, settings.async );
      settings.ajax.send( settings.data || null );

      return Popcorn.xhr.httpData( settings );
    }
  };


  Popcorn.xhr.httpData = function( settings ) {

    var data, json = null,
        parser, xml = null;

    settings.ajax.onreadystatechange = function() {

      if ( settings.ajax.readyState === 4 ) {

        try {
          json = JSON.parse( settings.ajax.responseText );
        } catch( e ) {
          //suppress
        }

        data = {
          xml: settings.ajax.responseXML,
          text: settings.ajax.responseText,
          json: json
        };

        // Normalize: data.xml is non-null in IE9 regardless of if response is valid xml
        if ( !data.xml || !data.xml.documentElement ) {
          data.xml = null;

          try {
            parser = new DOMParser();
            xml = parser.parseFromString( settings.ajax.responseText, "text/xml" );

            if ( !xml.getElementsByTagName( "parsererror" ).length ) {
              data.xml = xml;
            }
          } catch ( e ) {
            // data.xml remains null
          }
        }

        //  If a dataType was specified, return that type of data
        if ( settings.dataType ) {
          data = data[ settings.dataType ];
        }


        settings.success.call( settings.ajax, data );

      }
    };
    return data;
  };

  Popcorn.xhr.getJSONP = function( url, success, isScript ) {

    var head = document.head || document.getElementsByTagName( "head" )[ 0 ] || document.documentElement,
      script = document.createElement( "script" ),
      isFired = false,
      params = [],
      rjsonp = /(=)\?(?=&|$)|\?\?/,
      replaceInUrl, prefix, paramStr, callback, callparam;

    if ( !isScript ) {

      // is there a calback already in the url
      callparam = url.match( /(callback=[^&]*)/ );

      if ( callparam !== null && callparam.length ) {

        prefix = callparam[ 1 ].split( "=" )[ 1 ];

        // Since we need to support developer specified callbacks
        // and placeholders in harmony, make sure matches to "callback="
        // aren't just placeholders.
        // We coded ourselves into a corner here.
        // JSONP callbacks should never have been
        // allowed to have developer specified callbacks
        if ( prefix === "?" ) {
          prefix = "jsonp";
        }

        // get the callback name
        callback = Popcorn.guid( prefix );

        // replace existing callback name with unique callback name
        url = url.replace( /(callback=[^&]*)/, "callback=" + callback );
      } else {

        callback = Popcorn.guid( "jsonp" );

        if ( rjsonp.test( url ) ) {
          url = url.replace( rjsonp, "$1" + callback );
        }

        // split on first question mark,
        // this is to capture the query string
        params = url.split( /\?(.+)?/ );

        // rebuild url with callback
        url = params[ 0 ] + "?";
        if ( params[ 1 ] ) {
          url += params[ 1 ] + "&";
        }
        url += "callback=" + callback;
      }

      //  Define the JSONP success callback globally
      window[ callback ] = function( data ) {
        // Fire success callbacks
        success && success( data );
        isFired = true;
      };
    }

    script.addEventListener( "load",  function() {

      //  Handling remote script loading callbacks
      if ( isScript ) {
        //  getScript
        success && success();
      }

      //  Executing for JSONP requests
      if ( isFired ) {
        //  Garbage collect the callback
        delete window[ callback ];
      }
      //  Garbage collect the script resource
      head.removeChild( script );
    }, false );

    script.src = url;

    head.insertBefore( script, head.firstChild );

    return;
  };

  Popcorn.getJSONP = Popcorn.xhr.getJSONP;

  Popcorn.getScript = Popcorn.xhr.getScript = function( url, success ) {

    return Popcorn.xhr.getJSONP( url, success, true );
  };

  Popcorn.util = {
    // Simple function to parse a timestamp into seconds
    // Acceptable formats are:
    // HH:MM:SS.MMM
    // HH:MM:SS;FF
    // Hours and minutes are optional. They default to 0
    toSeconds: function( timeStr, framerate ) {
      // Hours and minutes are optional
      // Seconds must be specified
      // Seconds can be followed by milliseconds OR by the frame information
      var validTimeFormat = /^([0-9]+:){0,2}[0-9]+([.;][0-9]+)?$/,
          errorMessage = "Invalid time format",
          digitPairs, lastIndex, lastPair, firstPair,
          frameInfo, frameTime;

      if ( typeof timeStr === "number" ) {
        return timeStr;
      }

      if ( typeof timeStr === "string" &&
            !validTimeFormat.test( timeStr ) ) {
        Popcorn.error( errorMessage );
      }

      digitPairs = timeStr.split( ":" );
      lastIndex = digitPairs.length - 1;
      lastPair = digitPairs[ lastIndex ];

      // Fix last element:
      if ( lastPair.indexOf( ";" ) > -1 ) {

        frameInfo = lastPair.split( ";" );
        frameTime = 0;

        if ( framerate && ( typeof framerate === "number" ) ) {
          frameTime = parseFloat( frameInfo[ 1 ], 10 ) / framerate;
        }

        digitPairs[ lastIndex ] = parseInt( frameInfo[ 0 ], 10 ) + frameTime;
      }

      firstPair = digitPairs[ 0 ];

      return {

        1: parseFloat( firstPair, 10 ),

        2: ( parseInt( firstPair, 10 ) * 60 ) +
              parseFloat( digitPairs[ 1 ], 10 ),

        3: ( parseInt( firstPair, 10 ) * 3600 ) +
            ( parseInt( digitPairs[ 1 ], 10 ) * 60 ) +
              parseFloat( digitPairs[ 2 ], 10 )

      }[ digitPairs.length || 1 ];
    }
  };

  // alias for exec function
  Popcorn.p.cue = Popcorn.p.exec;

  //  Protected API methods
  Popcorn.protect = {
    natives: getKeys( Popcorn.p ).map(function( val ) {
      return val.toLowerCase();
    })
  };

  // Setup logging for deprecated methods
  Popcorn.forEach({
    // Deprecated: Recommended
    "listen": "on",
    "unlisten": "off",
    "trigger": "emit",
    "exec": "cue"

  }, function( recommend, api ) {
    var original = Popcorn.p[ api ];
    // Override the deprecated api method with a method of the same name
    // that logs a warning and defers to the new recommended method
    Popcorn.p[ api ] = function() {
      if ( typeof console !== "undefined" && console.warn ) {
        console.warn(
          "Deprecated method '" + api + "', " +
          (recommend == null ? "do not use." : "use '" + recommend + "' instead." )
        );

        // Restore api after first warning
        Popcorn.p[ api ] = original;
      }
      return Popcorn.p[ recommend ].apply( this, [].slice.call( arguments ) );
    };
  });


  //  Exposes Popcorn to global context
  global.Popcorn = Popcorn;

})(window, window.document);

// PLUGIN: text

(function ( Popcorn ) {

  /**
   * text Popcorn plug-in
   * Based on popcorn.text.js by @humph
   * @param {Object} options
   *
   * Example:

   **/

  var DEFAULT_FONT_COLOR = "#000000",
      DEFAULT_SHADOW_COLOR = "#444444",
      DEFAULT_BACKGROUND_COLOR = "#888888";

  function newlineToBreak( string ) {
    // Deal with both \r\n and \n
    return string.replace( /\r?\n/gm, "<br>" );
  }

  Popcorn.plugin( "text", {

    manifest: {
      about: {
        name: "Popcorn text Plugin",
        version: "0.1",
        author: "@k88hudson, @mjschranz"
      },
      options: {
        text: {
          elem: "textarea",
          label: "Text",
          "default": "Popcorn Maker"
        },
        linkUrl: {
          elem: "input",
          type: "text",
          label: "Link URL"
        },
        position: {
          elem: "select",
          options: [ "Custom", "Middle", "Bottom", "Top" ],
          values: [ "custom", "middle", "bottom", "top" ],
          label: "Text Position",
          "default": "custom"
        },
        alignment: {
          elem: "select",
          options: [ "Center", "Left", "Right" ],
          values: [ "center", "left", "right" ],
          label: "Text Alignment",
          "default": "left"
        },
        start: {
          elem: "input",
          type: "text",
          label: "In",
          group: "advanced",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "text",
          label: "Out",
          group: "advanced",
          "units": "seconds"
        },
        transition: {
          elem: "select",
          options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
          values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
          label: "Transition",
          "default": "popcorn-fade"
        },
        fontFamily: {
          elem: "select",
          label: "Font",
          styleClass: "",
          googleFonts: true,
          group: "advanced",
          "default": "Merriweather"
        },
        fontSize: {
          elem: "input",
          type: "number",
          label: "Font Size",
          "default": 10,
          units: "%",
          group: "advanced"
        },
        fontColor: {
          elem: "input",
          type: "color",
          label: "Font colour",
          "default": DEFAULT_FONT_COLOR,
          group: "advanced"
        },
        shadow: {
          elem: "input",
          type: "checkbox",
          label: "Shadow",
          "default": false,
          group: "advanced"
        },
        shadowColor: {
          elem: "input",
          type: "color",
          label: "Shadow colour",
          "default": DEFAULT_SHADOW_COLOR,
          group: "advanced"
        },
        background: {
          elem: "input",
          type: "checkbox",
          label: "Background",
          "default": false,
          group: "advanced"
        },
        backgroundColor: {
          elem: "input",
          type: "color",
          label: "Background colour",
          "default": DEFAULT_BACKGROUND_COLOR,
          group: "advanced"
        },
        fontDecorations: {
          elem: "checkbox-group",
          labels: { bold: "Bold", italics: "Italics" },
          "default": { bold: false, italics: false },
          group: "advanced"
        },
        left: {
          elem: "input",
          type: "number",
          label: "Left",
          units: "%",
          "default": 25,
          hidden: true
        },
        top: {
          elem: "input",
          type: "number",
          label: "Top",
          units: "%",
          "default": 0,
          hidden: true
        },
        width: {
          elem: "input",
          type: "number",
          units: "%",
          label: "Width",
          "default": 50,
          hidden: true
        },
        zindex: {
          hidden: true
        }
      }
    },

    _setup: function( options ) {
      var target = Popcorn.dom.find( options.target ),
          text = newlineToBreak( options.text ),
          container = options._container = document.createElement( "div" ),
          innerContainer = document.createElement( "div" ),
          innerSpan = document.createElement( "span" ),
          innerDiv = document.createElement( "div" ),
          fontSheet,
          fontDecorations = options.fontDecorations || options._natives.manifest.options.fontDecorations[ "default" ],
          position = options.position || options._natives.manifest.options.position[ "default" ],
          alignment = options.alignment,
          transition = options.transition || options._natives.manifest.options.transition[ "default" ],
          link,
          linkUrl = options.linkUrl,
          shadowColor = options.shadowColor || DEFAULT_SHADOW_COLOR,
          backgroundColor = options.backgroundColor || DEFAULT_BACKGROUND_COLOR,
          context = this;

      if ( !target ) {
        target = this.media.parentNode;
      }

      options._target = target;
      container.style.position = "absolute";
      container.classList.add( "popcorn-text" );

      // backwards comp
      if ( "center left right".match( position ) ) {
        alignment = position;
        position = "middle";
      }

      // innerDiv inside innerSpan is to allow zindex from layers to work properly.
      // if you mess with this code, make sure to check for zindex issues.
      innerSpan.appendChild( innerDiv );
      innerContainer.appendChild( innerSpan );
      container.appendChild( innerContainer );
      target.appendChild( container );

      // Add transition class
      // There is a special case where popup has to be added to the innerDiv, not the outer container.
      options._transitionContainer = ( position !== "custom" && ( transition === "popcorn-pop" || "popcorn-fade" ) ) ? innerDiv : container;

      options._transitionContainer.classList.add( transition );
      options._transitionContainer.classList.add( "off" );

      // Handle all custom fonts/styling

      options.fontColor = options.fontColor || DEFAULT_FONT_COLOR;
      innerContainer.classList.add( "text-inner-div" );
      innerContainer.style.color = options.fontColor;
      innerContainer.style.fontStyle = fontDecorations.italics ? "italic" : "normal";
      innerContainer.style.fontWeight = fontDecorations.bold ? "bold" : "normal";

      if ( options.background ) {
        innerDiv.style.backgroundColor = backgroundColor;
      }
      if ( options.shadow ) {
        innerDiv.style.textShadow = "0 1px 5px " + shadowColor + ", 0 1px 10px " + shadowColor;
      }

      fontSheet = document.createElement( "link" );
      fontSheet.rel = "stylesheet";
      fontSheet.type = "text/css";
      options.fontFamily = options.fontFamily ? options.fontFamily : options._natives.manifest.options.fontFamily[ "default" ];
      // Store reference to generated sheet for removal later, remove any existing ones
      options._fontSheet = fontSheet;
      document.head.appendChild( fontSheet );

      fontSheet.onload = function () {
        innerContainer.style.fontFamily = options.fontFamily;
        innerContainer.style.fontSize = options.fontSize + "%";
        if ( position === "custom" ) {
          container.classList.add( "text-custom" );
          innerContainer.classList.add( alignment );
          container.style.left = options.left + "%";
          container.style.top = options.top + "%";
          if ( options.width ) {
            container.style.width = options.width + "%";
          }
          container.style.zIndex = +options.zindex;
        }
        else {
          container.classList.add( "text-fixed" );
          innerContainer.classList.add( position );
          innerContainer.classList.add( alignment );
          innerDiv.style.zIndex = +options.zindex;
        }

        if ( linkUrl ) {

          if ( !linkUrl.match( /^http(|s):\/\// ) ) {
            linkUrl = "//" + linkUrl;
          }

          link = document.createElement( "a" );
          link.href = linkUrl;
          link.target = "_blank";
          link.innerHTML = text;

          link.addEventListener( "click", function() {
            context.media.pause();
          }, false );

          link.style.color = innerContainer.style.color;

          innerDiv.appendChild( link );
        } else {
          innerDiv.innerHTML = text;
        }
      };
      fontSheet.href = "//fonts.googleapis.com/css?family=" + options.fontFamily.replace( /\s/g, "+" ) + ":400,700";

      options.toString = function() {
        // use the default option if it doesn't exist
        return options.text || options._natives.manifest.options.text[ "default" ];
      };
    },

    start: function( event, options ) {
      var transitionContainer = options._transitionContainer,
          redrawBug;

      if ( transitionContainer ) {
        transitionContainer.classList.add( "on" );
        transitionContainer.classList.remove( "off" );

        // Safari Redraw hack - #3066
        transitionContainer.style.display = "none";
        redrawBug = transitionContainer.offsetHeight;
        transitionContainer.style.display = "";
      }
    },

    end: function( event, options ) {
      if ( options._transitionContainer ) {
        options._transitionContainer.classList.remove( "on" );
        options._transitionContainer.classList.add( "off" );
      }
    },

    _teardown: function( options ) {
      if ( options._target ) {
        options._target.removeChild( options._container );
      }

      if ( options._fontSheet ) {
        document.head.removeChild( options._fontSheet );
      }
    }
  });
}( window.Popcorn ));

// PLUGIN: Popup

(function ( Popcorn ) {

  var sounds = {},
      events = [],
      soundIndex = 0,
      MAX_AUDIO_TIME = 2,
      _pluginRoot = "/templates/assets/plugins/popup/",
      FILL_STYLE = "rgb(255, 255, 255)",
      innerDivTriangles = {},
      DEFAULT_FONT = "Tangerine";

  // Set up speech innerDiv triangles
  innerDivTriangles.speech = document.createElement( "canvas" );
  innerDivTriangles.thought = document.createElement( "canvas" );

  // Creates a triangle for a speech innerDiv
  function drawSpeech( canvas, lineWidth ) {
    var ctx  = canvas.getContext( "2d" );
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0.4, 0.3);
    ctx.bezierCurveTo(0.4, 0.3, 17.8, 26.3, 15.1, 41.9);
    ctx.bezierCurveTo(15.1, 41.9, 26.2, 26.3, 23.4, 0.3);
    ctx.fillStyle = FILL_STYLE;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  // Creates three innerDivs for a "thought" speech innerDiv
  function drawThought( canvas, lineWidth ) {
    var ctx  = canvas.getContext( "2d" );
    // circle1
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(13.5, 7.0);
    ctx.bezierCurveTo(13.5, 10.6, 10.6, 13.5, 7.0, 13.5);
    ctx.bezierCurveTo(3.4, 13.5, 0.5, 10.6, 0.5, 7.0);
    ctx.bezierCurveTo(0.5, 3.4, 3.4, 0.5, 7.0, 0.5);
    ctx.bezierCurveTo(10.6, 0.5, 13.5, 3.4, 13.5, 7.0);
    ctx.closePath();
    ctx.fillStyle = FILL_STYLE;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // circle2
    ctx.beginPath();
    ctx.moveTo(17.5, 23.8);
    ctx.bezierCurveTo(17.5, 26.1, 15.6, 28.0, 13.2, 28.0);
    ctx.bezierCurveTo(10.9, 28.0, 9.0, 26.1, 9.0, 23.8);
    ctx.bezierCurveTo(9.0, 21.4, 10.9, 19.5, 13.2, 19.5);
    ctx.bezierCurveTo(15.6, 19.5, 17.5, 21.4, 17.5, 23.8);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // circle3
    ctx.beginPath();
    ctx.moveTo(27.5, 31.8);
    ctx.bezierCurveTo(27.5, 33.5, 26.0, 35.0, 24.2, 35.0);
    ctx.bezierCurveTo(22.5, 35.0, 21.0, 33.5, 21.0, 31.8);
    ctx.bezierCurveTo(21.0, 30.0, 22.5, 28.5, 24.2, 28.5);
    ctx.bezierCurveTo(26.0, 28.5, 27.5, 30.0, 27.5, 31.8);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  drawSpeech( innerDivTriangles.speech, 2 );
  drawThought( innerDivTriangles.thought, 2 );

  Popcorn.plugin( "popup", {
    manifest: {
      about: {
        name: "Popcorn Maker Popup Plugin",
        version: "0.1",
        author: "Kate Hudson @k88hudson, Matthew Schranz @mjschranz, Brian Chirls @bchirls",
        website: "http://github.com/k88hudson, http://github.com/mjschranz, https://github.com/brianchirls/"
      },
      options: {
        start: {
          elem: "input",
          type: "number",
          label: "In",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "number",
          label: "Out",
          "units": "seconds"
        },
        text: {
          elem: "textarea",
          label: "Text",
          "default": "Pop!"
        },
        linkUrl: {
          elem: "input",
          type: "text",
          label: "Link URL"
        },
        type: {
          elem: "select",
          options: [ "Popup", "Speech", "Thought Bubble" ],
          values: [ "popup", "speech", "thought" ],
          label: "Type",
          "default": "popup"
        },
        triangle: {
          elem: "select",
          options: [ "Top Left", "Top Right", "Bottom Left", "Bottom Right" ],
          values: [ "top left", "top right", "bottom left", "bottom right" ],
          label: "Tail Position",
          "default": "bottom left",
          optional: true
        },
        sound: {
          elem: "input",
          type: "checkbox",
          label: "Sound",
          "default": false,
          optional: true
        },
        icon: {
          elem: "select",
          options: [ "Error", "Audio", "Broken Heart", "Cone", "Earth",
                     "Eye", "Heart", "Info", "Man", "Money", "Music", "Net",
                     "Skull", "Star", "Thumbs Down", "Thumbs Up", "Time",
                     "Trophy", "Tv", "User", "Virus", "Women", "None" ],
          values: [ "error", "audio", "brokenheart", "cone", "earth",
                     "eye", "heart", "info", "man", "money", "music", "net",
                     "skull", "star", "thumbsdown", "thumbsup", "time",
                     "trophy", "tv", "user", "virus", "women", "none" ],
          label: "Pop Icon",
          "default": "error",
          optional: true
        },
        flip: {
          elem: "input",
          type: "checkbox",
          label: "Flip Tail?",
          "default": false,
          optional: true
        },
        top: {
          elem: "input",
          type: "number",
          label: "Top",
          units: "%",
          "default": 5,
          hidden: true
        },
        left: {
          elem: "input",
          type: "number",
          label: "Left",
          units: "%",
          "default": 20,
          hidden: true
        },
        width: {
          elem: "input",
          type: "number",
          units: "%",
          label: "Width",
          "default": 30,
          hidden: true
        },
        transition: {
          elem: "select",
          options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
          values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
          label: "Transition",
          "default": "popcorn-fade"
        },
        fontFamily: {
          elem: "select",
          label: "Font",
          styleClass: "",
          googleFonts: true,
          "default": "Merriweather",
          group: "advanced"
        },
        // font size is deprecated
        fontSize: {
          elem: "input",
          type: "number",
          label: "Font Size",
          units: "px",
          group: "advanced"
        },
        fontPercentage: {
          elem: "input",
          type: "number",
          label: "Font Size",
          "default": 4,
          units: "%",
          group: "advanced"
        },
        fontColor: {
          elem: "input",
          type: "color",
          label: "Font colour",
          "default": "#668B8B",
          group: "advanced"
        },
        fontDecorations: {
          elem: "checkbox-group",
          labels: { bold: "Bold", italics: "Italics", underline: "Underline" },
          "default": { bold: false, italics: false, underline: false },
          group: "advanced"
        },
        zindex: {
          hidden: true
        }
      }
    },

    _setup: function( options ) {

      var target = document.getElementById( options.target ),
          container = document.createElement( "div" ),
          context = this,
          audio,
          width = options.width + "%",
          top = options.top + "%",
          left = options.left + "%",
          fontSheet,
          originalFamily = options.fontFamily,
          flip = options.flip ? " flip" : "",
          innerDiv = document.createElement( "div" ),
          textContainer = document.createElement( "div" ),
          link = document.createElement( "a" ),
          img,
          TRIANGLE_WIDTH = 40,
          TRIANGLE_HEIGHT = 60,
          text = options.text.replace( /\r?\n/gm, "<br>" ),
          innerSpan = document.createElement( "span" ),
          linkUrl = options.linkUrl;

      if ( !target ) {
        target = context.media.parentNode;
      }

      options._target = target;

      function selectAudio( id, sources ) {
        var i, j, event, diff,
            eligibleAudio,
            audio,
            source;

        function resetAudio() {
          this.currentTime = 0;
          this.pause();
        }

        if ( !sounds[ id ] ) {
          audio = document.createElement( "audio" );
          for ( i = 0; i < sources.length; i ++ ) {
            source = document.createElement( "source" );
            source.src = _pluginRoot + sources[ i ];
            audio.appendChild( source );
          }
          audio.id = "popcorn-pop-sound-" + soundIndex;
          soundIndex++;
          audio.preload = true;
          audio.style.display = "none";
          audio.addEventListener( "ended", resetAudio, false );

          document.body.appendChild( audio );
          sounds[ id ] = [ audio ];
          return audio;
        }

        audio = sounds[ id ][ 0 ];
        if ( audio.duration ) {
          diff = Math.min( audio.duration, MAX_AUDIO_TIME );
        } else {
          diff = MAX_AUDIO_TIME;
        }

        //make sure there are no other events using this sound at the same time
        eligibleAudio = sounds[ id ].slice( 0 );
        for ( i = 0; i < events.length; i++ ) {
          event = events[ i ];
          if ( event.sound === options.sound &&
            event.start <= options.start + diff &&
            event.start + diff >= options.start ) {

            j = eligibleAudio.indexOf( event.audio );
            if ( j >= 0 ) {
              eligibleAudio.splice( j, 1 );
            }
          }
        }

        if ( eligibleAudio.length ) {
          audio = eligibleAudio[ 0 ];
        } else {
          audio = sounds[ id ][ 0 ].cloneNode( true );
          audio.id = "popcorn-pop-sound-" + soundIndex;
          soundIndex++;

          // not sure whether cloning copies the events in all browsers,
          // so remove it and add again just in case
          audio.removeEventListener( "ended", resetAudio, false );
          audio.addEventListener( "ended", resetAudio, false );

          document.body.appendChild( audio );
          sounds[ id ].push( audio );
        }

        return audio;
      }

      function makeTriangle( innerDiv ) {

        var triangle,
            ctx;

        //Set the base classes
        innerDiv.className =  "speechBubble " + options.type + " " + options.triangle + " " + flip;

        triangle = document.createElement( "canvas" );
        ctx = triangle.getContext( "2d" );

        triangle.width = TRIANGLE_WIDTH;
        triangle.height = TRIANGLE_HEIGHT;
        triangle.className = "canvas";
        innerDiv.appendChild( triangle );

        //Draw according to the style
        if ( options.type === "speech" ) {
          triangle.getContext( "2d" ).drawImage( innerDivTriangles.speech, 0, 0 );
        }
        if ( options.type === "thought" ) {
          triangle.getContext( "2d" ).drawImage( innerDivTriangles.thought, 0, 0 );
        }
      } //makeTriangle

      container.style.position = "absolute";
      container.style.top = top;
      container.style.left = left;
      container.style.width = width;
      container.style.zIndex = +options.zindex;

      innerDiv = document.createElement( "div" );
      textContainer = document.createElement( "div" );

      textContainer.style.fontStyle = options.fontDecorations.italics ? "italic" : "normal";
      textContainer.style.color = options.fontColor ? options.fontColor : "#668B8B";
      textContainer.style.textDecoration = options.fontDecorations.underline ? "underline" : "none";
      if ( options.fontSize ) {
        textContainer.style.fontSize = options.fontSize + "px";
      } else {
        textContainer.style.fontSize = options.fontPercentage + "%";
      }
      textContainer.style.fontWeight = options.fontDecorations.bold ? "bold" : "normal";

      if ( linkUrl ) {

        if ( !linkUrl.match( /^http(|s):\/\// ) ) {
          linkUrl = "//" + linkUrl;
        }

        link = document.createElement( "a" );
        link.href = linkUrl;
        link.target = "_blank";
        link.innerHTML = text;

        link.addEventListener( "click", function() {
          context.media.pause();
        }, false );

        link.style.color = textContainer.style.color;

        innerSpan.appendChild( link );
      } else {
        innerSpan.innerHTML = text;
      }

      textContainer.appendChild( innerSpan );
      innerDiv.appendChild( textContainer );
      container.appendChild( innerDiv );

      if ( options.type === "popup" ) {
        innerDiv.classList.add( "popup-inner-div" );
        container.classList.add( "popcorn-popup" );

        if ( options.icon && options.icon !== "none" ) {
          img = document.createElement( "img" );
          img.setAttribute( "class", "popup-icon" );
          img.addEventListener( "load", function() {
            var width = img.width || img.naturalWidth,
              height = img.height || img.naturalHeight;

            if ( options.fontSize ) {
              if ( height > 60 ) {
                width = 60 * width / height;
                height = 60;
                img.style.width = width + "px";
              }
              img.style.left = -( width - 16 ) + "px";
              // make sure container is still non-null
              // if _teardown is called too quickly, it will become null before img loads
              if ( container && container.offsetHeight ) {
                img.style.top = ( container.offsetHeight - height ) / 2 - 4 + "px";
              }
            } else {
              img.classList.add( "popcorn-responsive-image-position" );
            }

            if ( container ) {
              container.insertBefore( img, container.firstChild );
            }
          }, false );
          img.src = _pluginRoot + "images/" + options.icon + ".png";
        }

        //load up sound.
        if ( options.sound ) {
          if ( !audio ) {
            audio = selectAudio( "popup", [ "sounds/mouthpop.ogg", "sounds/mouthpop.wav" ] );
            options.audio = audio;
          }
        }
      }
      else {
        makeTriangle( innerDiv );
      }

      // Add transition
      container.classList.add( options.transition );
      container.classList.add( "off" );
      target.appendChild( container );
      options._container = container;

      fontSheet = document.createElement( "link" );
      fontSheet.rel = "stylesheet";
      fontSheet.type = "text/css";
      options.fontFamily = options.fontFamily ? options.fontFamily : options._natives.manifest.options.fontFamily[ "default" ];
      // Store reference to generated sheet for removal later, remove any existing ones
      options._fontSheet = fontSheet;
      document.head.appendChild( fontSheet );

      fontSheet.onload = function () {
        // Apply all the styles
        textContainer.style.fontFamily = options.fontFamily ? originalFamily : DEFAULT_FONT;
      };
      fontSheet.href = "//fonts.googleapis.com/css?family=" + options.fontFamily.replace( /\s/g, "+" );

      options.toString = function() {
        return options.text || options._natives.manifest.options.text[ "default" ];
      };
    },

    start: function( event, options ) {
      var audio = options.audio,
          video = this.media,
          container = options._container,
          redrawBug;

      if ( container ) {
        container.classList.add( "on" );
        container.classList.remove( "off" );

        // Safari Redraw hack - #3066
        container.style.display = "none";
        redrawBug = container.offsetHeight;
        container.style.display = "";
      }

      if ( audio && audio.duration && !video.paused &&
        video.currentTime - 1 < options.start ) {

        audio.volume = video.volume;
        audio.muted = video.muted;
        audio.play();
        if ( !audio.duration || isNaN( audio.duration ) || audio.duration > MAX_AUDIO_TIME ) {
          setTimeout(function() {
            audio.currentTime = 0;
            audio.pause();
          }, MAX_AUDIO_TIME );
        }
      }
    },

    end: function( event, options ) {
      if ( options._container ) {
        options._container.classList.add( "off" );
        options._container.classList.remove( "on" );
      }
    },

    _teardown: function( options ) {
      if ( options._container && options._target ) {
        options._target.removeChild( options._container );
      }

      if ( options._fontSheet ) {
        document.head.removeChild( options._fontSheet );
      }
    }
  });
}( Popcorn ));

// PLUGIN: Google Maps
/*global google*/

var googleCallback;
(function ( Popcorn ) {

  // We load our own cached copy of this in order to deal with mix-content (http vs. https).
  // At some point the stamen API is going to change, and this will break.
  // We'll need to watch for this. NOTE: if you change the location of this file, the path
  // below needs to reflect that change.
  var STAMEN_BUTTER_CACHED_URL = "/external/stamen/tile.stamen-1.2.0.js";

  var _mapFired = false,
      _mapLoaded = false,
      // Store location objects in case the same string location is used multiple times.
      _cachedGeoCode = {},
      MAP_FAILURE_TIMEOUT = 100,
      geocoder;

  //google api callback
  window.googleCallback = function( data ) {
    // ensure all of the maps functions needed are loaded
    // before setting _maploaded to true
    if ( typeof google !== "undefined" && google.maps && google.maps.Geocoder && google.maps.LatLng ) {
      geocoder = new google.maps.Geocoder();
      Popcorn.getScript( STAMEN_BUTTER_CACHED_URL, function() {
        _mapLoaded = true;
      });
    } else {
      setTimeout(function () {
        googleCallback( data );
      }, 10);
    }
  };
  // function that loads the google api
  function loadMaps() {
    // for some reason the Google Map API adds content to the body
    if ( document.body ) {
      _mapFired = true;
      Popcorn.getScript( "//maps.google.com/maps/api/js?sensor=false&callback=googleCallback" );
    } else {
      setTimeout(function () {
        loadMaps();
      }, 10);
    }
  }

  function buildMap( options, mapDiv, pluginInstance ) {
    var type = options.type ? options.type.toUpperCase() : "ROADMAP",
        layer;

    // See if we need to make a custom Stamen map layer
    if ( type === "STAMEN-WATERCOLOR" ||
         type === "STAMEN-TERRAIN"    ||
         type === "STAMEN-TONER" ) {
      // Stamen types are lowercase
      layer = type.replace( "STAMEN-", "" ).toLowerCase();
    }

    var map = new google.maps.Map( mapDiv, {
      // If a custom layer was specified, use that, otherwise use type
      mapTypeId: layer ? layer : google.maps.MapTypeId[ type ],
      // Hide the layer selection UI
      mapTypeControlOptions: {
        mapTypeIds: []
      }
    });

    // Used to notify any users of the plugin when the maps has completely loaded
    google.maps.event.addListenerOnce( map, "idle", function() {
      pluginInstance.emit( "googlemaps-loaded" );
    });

    if ( layer ) {
      map.mapTypes.set( layer, new google.maps.StamenMapType( layer ) );
    }

    return map;
  }

  /**
   * googlemap popcorn plug-in
   * Adds a map to the target div centered on the location specified by the user
   * Options parameter will need a start, end, target, type, zoom, lat and lng, and location
   * -Start is the time that you want this plug-in to execute
   * -End is the time that you want this plug-in to stop executing
   * -Target is the id of the DOM element that you want the map to appear in. This element must be in the DOM
   * -Type [optional] either: HYBRID (default), ROADMAP, SATELLITE, TERRAIN, STREETVIEW, or one of the
   *                          Stamen custom map types (http://http://maps.stamen.com): STAMEN-TONER,
   *                          STAMEN-WATERCOLOR, or STAMEN-TERRAIN.
   * -Zoom [optional] defaults to 10
   * -Heading [optional] STREETVIEW orientation of camera in degrees relative to true north (0 north, 90 true east, ect)
   * -Pitch [optional] STREETVIEW vertical orientation of the camera (between 1 and 3 is recommended)
   * -Lat and Lng: the coordinates of the map must be present if location is not specified.
   * -Height [optional] the height of the map, in "px" or "%". Defaults to "100%".
   * -Width [optional] the width of the map, in "px" or "%". Defaults to "100%".
   * -Location: the adress you want the map to display, must be present if lat and lng are not specified.
   * Note: using location requires extra loading time, also not specifying both lat/lng and location will
   * cause and error.
   *
   * Tweening works using the following specifications:
   * -location is the start point when using an auto generated route
   * -tween when used in this context is a string which specifies the end location for your route
   * Note that both location and tween must be present when using an auto generated route, or the map will not tween
   * -interval is the speed in which the tween will be executed, a reasonable time is 1000 ( time in milliseconds )
   * Heading, Zoom, and Pitch streetview values are also used in tweening with the autogenerated route
   *
   * -tween is an array of objects, each containing data for one frame of a tween
   * -position is an object with has two paramaters, lat and lng, both which are mandatory for a tween to work
   * -pov is an object which houses heading, pitch, and zoom paramters, which are all optional, if undefined, these values default to 0
   * -interval is the speed in which the tween will be executed, a reasonable time is 1000 ( time in milliseconds )
   *
   * @param {Object} options
   *
   * Example:
   var p = Popcorn("#video")
   .googlemap({
    start: 5, // seconds
    end: 15, // seconds
    type: "ROADMAP",
    target: "map"
   } )
   *
   */
  Popcorn.plugin( "googlemap", function ( options ) {
    var outerdiv, innerdiv, map, location,
        target = Popcorn.dom.find( options.target ),
        that = this,
        ranOnce = false;

    if ( !target ) {
      target = that.media.parentNode;
    }

    options._target = target;

    options.type = options.type || "ROADMAP";
    options.lat = options.lat || 0;
    options.lng = options.lng || 0;

    // if this is the first time running the plugins
    // call the function that gets the sctipt
    if ( !_mapFired ) {
      loadMaps();
    }

    // create a new div this way anything in the target div is left intact
    // this is later passed on to the maps api
    innerdiv = document.createElement( "div" );
    innerdiv.style.width = "100%";
    innerdiv.style.height = "100%";

    outerdiv = document.createElement( "div" );
    outerdiv.id = Popcorn.guid( "googlemap" );
    outerdiv.style.width = options.width + "%";
    outerdiv.style.height = options.height + "%";
    outerdiv.style.left = options.left + "%";
    outerdiv.style.top = options.top + "%";
    outerdiv.style.zIndex = +options.zindex;
    outerdiv.style.position = "absolute";
    outerdiv.classList.add( options.transition );
    outerdiv.classList.add( "off" );

    outerdiv.appendChild( innerdiv );
    options._container = outerdiv;

    if ( target ) {
      target.appendChild( outerdiv );
    }

    function geoCodeCallback( results, status ) {
      // second check for innerdiv since it could have disappeared before
      // this callback is actually run
      if ( !innerdiv ) {
        return;
      }

      if ( status === google.maps.GeocoderStatus.OK ) {
        options.lat = results[ 0 ].geometry.location.lat();
        options.lng = results[ 0 ].geometry.location.lng();
        _cachedGeoCode[ options.location ] = location = new google.maps.LatLng( options.lat, options.lng );

        map = buildMap( options, innerdiv, that );
      } else if ( status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT ) {
        setTimeout(function() {
          // calls an anonymous google function called on separate thread
          geocoder.geocode({
            "address": options.location
          }, geoCodeCallback );
        }, MAP_FAILURE_TIMEOUT );
      } else {
        // Some other failure occured
        console.warn( "Google maps geocoder returned status: " + status );
      }
    }

    // ensure that google maps and its functions are loaded
    // before setting up the map parameters
    var isMapReady = function () {
      if ( _mapLoaded ) {
        if ( innerdiv ) {
          if ( options.location ) {
            location = _cachedGeoCode[ options.location ];

            if ( location ) {
              map = buildMap( options, innerdiv, that );
            } else {
              // calls an anonymous google function called on separate thread
              geocoder.geocode({
                "address": options.location
              }, geoCodeCallback );
            }

          } else {
            location = new google.maps.LatLng( options.lat, options.lng );
            map = map = buildMap( options, innerdiv, that );
          }
        }
      } else {
          setTimeout(function () {
            isMapReady();
          }, 5);
        }
      };

    isMapReady();

    options.toString = function() {
      return options.location || ( ( options.lat && options.lng ) ? options.lat + ", " + options.lng : options._natives.manifest.options.location[ "default" ] );
    };

    return {
      /**
       * @member webpage
       * The start function will be executed when the currentTime
       * of the video reaches the start time provided by the
       * options variable
       */
      start: function( event, options ) {
        var that = this,
            sView,
            redrawBug,
            MAX_MAP_ZOOM_VALUE = 22,
            DEFAULT_MAP_ZOOM_VALUE = options._natives.manifest.options.zoom[ "default" ],
            MAX_MAP_PITCH_VALUE = 12,
            DEFAULT_MAP_PITCH_VALUE = options._natives.manifest.options.pitch[ "default" ],
            MAX_MAP_HEADING_VALUE = 12,
            DEFAULT_MAP_HEADING_VALUE = options._natives.manifest.options.heading[ "default" ];

        // ensure the map has been initialized in the setup function above
        var isMapSetup = function() {

          function tween( rM, t ) {

            var computeHeading = google.maps.geometry.spherical.computeHeading;
            setTimeout(function() {

              var current_time = that.media.currentTime;

              //  Checks whether this is a generated route or not
              if ( typeof options.tween === "object" ) {

                for ( var i = 0, m = rM.length; i < m; i++ ) {

                  var waypoint = rM[ i ];

                  //  Checks if this position along the tween should be displayed or not
                  if ( current_time >= ( waypoint.interval * ( i + 1 ) ) / 1000 &&
                     ( current_time <= ( waypoint.interval * ( i + 2 ) ) / 1000 ||
                       current_time >= waypoint.interval * ( m ) / 1000 ) ) {

                    sView3.setPosition( new google.maps.LatLng( waypoint.position.lat, waypoint.position.lng ) );

                    sView3.setPov({
                      heading: waypoint.pov.heading || computeHeading( waypoint, rM[ i + 1 ] ) || 0,
                      zoom: waypoint.pov.zoom || 0,
                      pitch: waypoint.pov.pitch || 0
                    });
                  }
                }

                //  Calls the tween function again at the interval set by the user
                tween( rM, rM[ 0 ].interval );
              } else {

                for ( var k = 0, l = rM.length; k < l; k++ ) {

                  var interval = options.interval;

                  if( current_time >= (interval * ( k + 1 ) ) / 1000 &&
                    ( current_time <= (interval * ( k + 2 ) ) / 1000 ||
                      current_time >= interval * ( l ) / 1000 ) ) {

                    sView2.setPov({
                      heading: computeHeading( rM[ k ], rM[ k + 1 ] ) || 0,
                      zoom: options.zoom,
                      pitch: options.pitch || 0
                    });
                    sView2.setPosition( checkpoints[ k ] );
                  }
                }

                tween( checkpoints, options.interval );
                }
            }, t );
          }

          if ( map && !ranOnce ) {
            options._map = map;
            ranOnce = true;
            // reset the location and zoom just in case the user played with the map
            outerdiv.classList.remove( "off" );
            outerdiv.classList.add( "on" );
            google.maps.event.trigger( map, "resize" );
            map.setCenter( location );

            // make sure options.zoom is a number
            if ( options.zoom && typeof options.zoom !== "number" ) {
              options.zoom = +options.zoom >= 0 && +options.zoom <= MAX_MAP_ZOOM_VALUE ? +options.zoom : DEFAULT_MAP_ZOOM_VALUE;
            }

            map.setZoom( options.zoom );

            //Make sure heading is a number
            if ( options.heading && typeof options.heading !== "number" ) {
              options.heading = +options.heading >= 0 && +options.heading <= MAX_MAP_HEADING_VALUE ? +options.heading : DEFAULT_MAP_HEADING_VALUE;
            }
            //Make sure pitch is a number
            if ( options.pitch && typeof options.pitch !== "number" ) {
              options.pitch = +options.pitch >= 0 && +options.pitch <= MAX_MAP_PITCH_VALUE ? +options.pitch : DEFAULT_MAP_PITCH_VALUE;
            }

            if ( options.type === "STREETVIEW" ) {
              // Switch this map into streeview mode
              map.setStreetView(
                // Pass a new StreetViewPanorama instance into our map
                sView = new google.maps.StreetViewPanorama( innerdiv, {
                  position: location,
                  pov: {
                    heading: options.heading,
                    pitch: options.pitch,
                    zoom: options.zoom
                  }
                })
              );

              //  Determines if we should use hardcoded values ( using options.tween ),
              //  or if we should use a start and end location and let google generate
              //  the route for us
              if ( options.location && typeof options.tween === "string" ) {

              //  Creating another variable to hold the streetview map for tweening,
              //  Doing this because if there was more then one streetview map, the tweening would sometimes appear in other maps
              var sView2 = sView;

                //  Create an array to store all the lat/lang values along our route
                var checkpoints = [];

                //  Creates a new direction service, later used to create a route
                var directionsService = new google.maps.DirectionsService();

                //  Creates a new direction renderer using the current map
                //  This enables us to access all of the route data that is returned to us
                var directionsDisplay = new google.maps.DirectionsRenderer( sView2 );

                var request = {
                  origin: options.location,
                  destination: options.tween,
                  travelMode: google.maps.TravelMode.DRIVING
                };

                //  Create the route using the direction service and renderer
                directionsService.route( request, function( response, status ) {

                  if ( status === google.maps.DirectionsStatus.OK ) {
                    directionsDisplay.setDirections( response );
                    showSteps( response, that );
                  }

                });

                var showSteps = function ( directionResult ) {

                  //  Push new google map lat and lng values into an array from our list of lat and lng values
                  var routes = directionResult.routes[ 0 ].overview_path;
                  for ( var j = 0, k = routes.length; j < k; j++ ) {
                    checkpoints.push( new google.maps.LatLng( routes[ j ].lat(), routes[ j ].lng() ) );
                  }

                  //  Check to make sure the interval exists, if not, set to a default of 1000
                  options.interval = options.interval || 1000;
                  tween( checkpoints, 10 );

                };
              } else if ( typeof options.tween === "object" ) {

                //  Same as the above to stop streetview maps from overflowing into one another
                var sView3 = sView;

                for ( var i = 0, l = options.tween.length; i < l; i++ ) {

                  //  Make sure interval exists, if not, set to 1000
                  options.tween[ i ].interval = options.tween[ i ].interval || 1000;
                  tween( options.tween, 10 );
                }
              }
            }

            // For some reason, in some cases the map can wind up being undefined at this point
            if ( options.onmaploaded && map ) {
              options.onmaploaded( options, map );
            }

          } else if ( ranOnce ) {
            outerdiv.classList.remove( "off" );
            outerdiv.classList.add( "on" );

            // Safari Redraw hack - #3066
            outerdiv.style.display = "none";
            redrawBug = outerdiv.offsetHeight;
            outerdiv.style.display = "";
          } else {
            setTimeout(function () {
              isMapSetup();
            }, 50 );
          }

        };
        isMapSetup();
      },
      /**
       * @member webpage
       * The end function will be executed when the currentTime
       * of the video reaches the end time provided by the
       * options variable
       */
      end: function () {
        // if the map exists hide it do not delete the map just in
        // case the user seeks back to time b/w start and end
        if ( map ) {
          outerdiv.classList.remove( "on" );
          outerdiv.classList.add( "off" );
        }
      },
      _teardown: function ( options ) {
        // the map must be manually removed
        options._target.removeChild( outerdiv );
        innerdiv = map = location = null;

        options._map = null;
      }
    };
  }, {
    about: {
      name: "Popcorn Google Map Plugin",
      version: "0.1",
      author: "@annasob, Matthew Schranz @mjschranz",
      website: "annasob.wordpress.com, http://github.com/mjschranz",
      attribution: "Map tiles by <a target=\"_blank\" href=\"http://stamen.com\">Stamen Design</a>," +
        "under <a target=\"_blank\" href=\"http://creativecommons.org/licenses/by/3.0\">CC BY 3.0</a>. " +
        "Data by <a target=\"_blank\" href=\"http://openstreetmap.org\">OpenStreetMap</a>, " +
        "under <a target=\"_blank\" href=\"http://creativecommons.org/licenses/by-sa/3.0\">CC BY SA</a>."
    },
    options: {
      start: {
        elem: "input",
        type: "number",
        label: "Start",
        "units": "seconds"
      },
      end: {
        elem: "input",
        type: "number",
        label: "End",
        "units": "seconds"
      },
      type: {
        elem: "select",
        options: [ "Road Map", "Satellite", "Street View", "Hybrid", "Terrain", "Stamen - Water Color", "Stamen - Terrain", "Stamen - Toner" ],
        values: [ "ROADMAP", "SATELLITE", "STREETVIEW", "HYBRID", "TERRAIN", "STAMEN-WATERCOLOR", "STAMEN-TERRAIN", "STAMEN-TONER" ],
        label: "Map Type",
        "default": "ROADMAP",
        optional: true
      },
      location: {
        elem: "input",
        type: "text",
        label: "Location",
        "default": "Toronto, Ontario, Canada"
      },
      fullscreen: {
        elem: "input",
        type: "checkbox",
        label: "Full-Screen",
        "default": false,
        optional: true
      },
      heading: {
        elem: "input",
        type: "number",
        label: "Heading",
        "default": 0,
        optional: true
      },
      pitch: {
        elem: "input",
        type: "number",
        label: "Pitch",
        "default": 1,
        optional: true
      },
      zoom: {
        elem: "input",
        type: "number",
        label: "Zoom",
        "default": 10,
        optional: true
      },
      transition: {
        elem: "select",
        options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
        values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
        label: "Transition",
        "default": "popcorn-fade"
      },
      left: {
        elem: "input",
        type: "number",
        label: "Left",
        units: "%",
        "default": 15,
        hidden: true
      },
      top: {
        elem: "input",
        type: "number",
        label: "Top",
        units: "%",
        "default": 15,
        hidden: true
      },
      width: {
        elem: "input",
        type: "number",
        label: "Width",
        units: "%",
        "default": 70,
        hidden: true
      },
      height: {
        elem: "input",
        type: "number",
        label: "height",
        units: "%",
        "default": 70,
        hidden: true
      },
      lat: {
        elem: "input",
        type: "number",
        label: "Lat",
        optional: true,
        hidden: true
      },
      lng: {
        elem: "input",
        type: "number",
        label: "Lng",
        optional: true,
        hidden: true
      },
      zindex: {
        hidden: true
      }
    }
  });
}( Popcorn ));

// PLUGIN: Twitter

(function ( Popcorn ) {

  var CACHED_RESULTS = {},
      MAX_TWEETS = 100,
      TWEETS_TIMER = 4000,
      TRANSITION_MARGIN_TOP = "-4.8em",
      TRANSITION_TIMEOUT = 700;

  Popcorn.plugin( "twitter", {
    manifest: {
      about: {
        name: "Popcorn Maker Twitter Plugin",
        version: "0.1",
        author: "Matthew Schranz, @mjschranz",
        website: "mschranz.wordpress.com, http://github.com/mjschranz"
      },
      options: {
        start: {
          elem: "input",
          type: "number",
          label: "Start",
          units: "seconds"
        },
        end: {
          elem: "input",
          type: "number",
          label: "End",
          units: "seconds"
        },
        search: {
          elem: "input",
          type: "text",
          label: "Search",
          "default": "Kittens",
          optional: true
        },
        username: {
          elem: "input",
          type: "text",
          label: "Tweets from User",
          optional: true
        },
        searchType: {
          elem: "select",
          options: [ "Mixed", "Recent", "Popular" ],
          values: [ "mixed", "recent", "popular" ],
          label: "Search Results",
          "default": "mixed",
          "hidden": true
        },
        numberOfTweets: {
          elem: "input",
          type: "number",
          label: "Number of Tweets",
          "default": 10,
          optional: true,
          maxTweets: MAX_TWEETS
        },
        transition: {
          elem: "select",
          options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
          values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
          label: "Transition",
          "default": "popcorn-fade"
        },
        layout: {
          elem: "select",
          options: [ "Ticker", "Feed" ],
          values: [ "ticker", "feed" ],
          label: "Tweet Layout",
          "default": "feed",
          optional: true
        },
        left: {
          hidden: true,
          elem: "input",
          type: "number",
          units: "%",
          "default": 0
        },
        width: {
          hidden: true,
          "default": 35,
        },
        zindex: {
          hidden: true
        }
      }
    },
    _setup: function( options ) {
      var target = Popcorn.dom.find( options.target ),
          requestString = "//api.twitter.com/1/statuses/user_timeline.json?screen_name=",
          titleText = document.createElement( "span" ),
          outerTweetsContainer = document.createElement( "div" ),
          tweetsContainer = document.createElement( "ul" ),
          img,
          tweetContainer,
          imgLink,
          tweetTextCont,
          tweetUser,
          tweetText,
          allTweets = [],
          query,
          numberOfTweets = options.numberOfTweets,
          searchType = options.searchType || "recent";

      if ( !target ) {
        target = this.media.parentNode;
      }

      options._target = target;

      if ( !numberOfTweets ) {
        numberOfTweets = options._natives.manifest.options.numberOfTweets[ "default" ];
      } else if ( numberOfTweets > MAX_TWEETS ) {
        numberOfTweets = MAX_TWEETS;
      }

      // safeguard against no search/username being provided
      if ( !options.search && !options.username ) {
        options.search = options._natives.manifest.options.search[ "default" ];
      }

      options._container = document.createElement( "div" );
      options._container.classList.add( "popcorn-twitter" );
      options._container.id = Popcorn.guid( "twitter" );
      options._container.style.left = options.left + "%";
      options._container.style.zIndex = +options.zindex;
      titleText.classList.add( "popcorn-twitter-title" );
      titleText.appendChild( document.createTextNode( options.search || options.username || "Twitter" ) );

      // Set layout class for container
      if ( options.layout ) {
        options._container.classList.add( options.layout );
      }

      // Set transitions for container
      if ( options.transition ) {
        options._container.classList.add( options.transition );
        options._container.classList.add( "off" );
      }
      options._container.appendChild( titleText );

      query = ( options.search || options.username ) + numberOfTweets + searchType;

      function buildTheTweets( tweets ) {
        var currTweet,
            twitterHandle,
            twitterName,
            imageLinkSource,
            i,
            len = tweets.length;

        if ( len ) {
          // If we made it here, the query was a new one so store it in our cache
          CACHED_RESULTS[ query ] = tweets;
        }

        for ( i = 0; i < len; i++ ) {
          currTweet = tweets[ i ];
          tweetContainer = document.createElement( "li" );
          img = document.createElement( "img" );
          imgLink = document.createElement( "a" );
          tweetTextCont = document.createElement( "div" );
          tweetUser = document.createElement( "div" );
          tweetUser.classList.add( "popcorn-twitter-tweet-user" );
          tweetText = document.createElement( "div" );
          tweetText.classList.add( "popcorn-twitter-tweet-text" );
          imageLinkSource = currTweet.profile_image_url || currTweet.user.profile_image_url;
          twitterHandle = currTweet.from_user || currTweet.user.screen_name;
          twitterName = currTweet.from_user_name || currTweet.user.name;

          imgLink.classList.add( "popcorn-twitter-tweet-image" );
          imgLink.href = img.src = imageLinkSource;
          imgLink.target = "_blank"; // Ensure it opens in new tab/window
          imgLink.appendChild( img );
          tweetContainer.appendChild( imgLink );

          // Text Setup
          tweetText.innerHTML = currTweet.text;
          tweetUser.innerHTML = "<a href=\"http://www.twitter.com/" + twitterHandle + "\" target=_blank>" +
                                twitterName + "</a>&nbsp;@" + twitterHandle;
          tweetTextCont.appendChild( tweetUser );
          tweetTextCont.appendChild( tweetText );
          tweetContainer.appendChild( tweetTextCont );
          tweetsContainer.appendChild( tweetContainer );
        }

        // Set layout class for container
        if ( options.layout ) {
          options._container.classList.add( options.layout );
          if ( options.layout === "ticker" && tweetsContainer.childNodes.length ) {
            var elem;

            options._tickerInterval = setInterval(function() {
              elem = tweetsContainer.firstChild;
              if ( !elem ) {
                return;
              }

              elem.style.marginTop = TRANSITION_MARGIN_TOP;
              setTimeout(function() {
                tweetsContainer.removeChild( elem );
                tweetsContainer.appendChild( elem );
                elem.style.marginTop = "";
              }, TRANSITION_TIMEOUT );
            }, TWEETS_TIMER );
          }
        }

        outerTweetsContainer.classList.add( "popcorn-twitter-tweets" );
        outerTweetsContainer.appendChild( tweetsContainer );
        options._container.appendChild( outerTweetsContainer );
      }

      function twitterCallback( e ) {
        var results = e.results || e,
            k,
            rLen = results.length;

        for ( k = 0; k < rLen && allTweets.length < numberOfTweets; k++ ) {
          allTweets.push( results[ k ] );
        }

        buildTheTweets( allTweets );
      }

      target.appendChild( options._container );

      // We stored the results objects we get to save API calls being made
      if ( !CACHED_RESULTS[ query ] ) {
        if ( options.username ) {
          Popcorn.xhr({
            url: "//api.twitter.com/1/account/rate_limit_status.json",
            dataType: "jsonp",
            success: function( e ) {
              if ( e.remaining_hits === 0 ) {
                var warningText = document.createElement( "div" );

                warningText.innerHTML = "You have hit the request limit for the hour. This will reset at " +
                  e.reset_time.substring( 0, e.reset_time.indexOf( "+" ) ) + " GMT.";

                options._container.appendChild( warningText );
              } else {
                // Append various query options here
                requestString += options.username +
                               "&count=" + numberOfTweets + "&include_rts=true";

                Popcorn.xhr( { url: requestString, dataType: "jsonp", success: twitterCallback } );
              }
          }});
        } else if ( options.search ) {
          requestString = "//search.twitter.com/search.json?q=";

          requestString += escape( options.search ) +
                         "&result_type=" + options.searchType + "&rpp=" + numberOfTweets;

          Popcorn.xhr( { url: requestString, dataType: "jsonp", success: twitterCallback } );

        }
      } else {
        buildTheTweets( CACHED_RESULTS[ query ] );
      }

      options.toString = function() {
        return options.username || options.search || options._natives.manifest.options.search[ "default" ];
      };
    },
    start: function( event, options ) {
      var container = options._container,
          redrawBug;

      if ( container ) {
        container.classList.add( "on" );
        container.classList.remove( "off" );

        // Safari Redraw hack - #3066
        container.style.display = "none";
        redrawBug = container.offsetHeight;
        container.style.display = "";
      }
    },
    end: function( event, options ) {
      if ( options._container ) {
        options._container.classList.add( "off" );
        options._container.classList.remove( "on" );
      }
    },
    _teardown: function( options ) {
      // Remove the plugins container when being destroyed
      if ( options._container && options._target ) {
        options._target.removeChild( options._container );
      }

      if ( options._tickerInterval ) {
        clearInterval( options._tickerInterval );
      }
    }
  });
}( Popcorn, this ));

"use strict";

// PLUGIN: IMAGE
// Key
(function ( Popcorn ) {

  var APIKEY = "&api_key=b939e5bd8aa696db965888a31b2f1964",
      flickrUrl = window.location.protocol === "https:" ? "https://secure.flickr.com/services/" : "http://api.flickr.com/services/",
      searchPhotosCmd = flickrUrl + "rest/?method=flickr.photos.search&page=1&extras=url_m&media=photos&safe_search=1",
      getPhotosetCmd = flickrUrl + "rest/?method=flickr.photosets.getPhotos&extras=url_m&media=photos",
      getPhotoSizesCmd = flickrUrl + "rest/?method=flickr.photos.getSizes",
      jsonBits = "&format=json&jsoncallback=flickr",
      FLICKR_SINGLE_CHECK = "flickr.com/photos/";

  function searchImagesFlickr( tags, count, userId, ready ) {
    var uri = searchPhotosCmd + APIKEY + "&per_page=" + count + "&";
    if ( userId && typeof userId !== "function" ) {
      uri += "&user_id=" + userId;
    }
    if ( tags ) {
      uri += "&tags=" + tags;
    }
    uri += jsonBits;
    Popcorn.getJSONP( uri, ready || userId );
  }

  function getPhotoSet( photosetId , ready, pluginInstance ) {
    var photoSplit,
        ln,
        url,
        uri,
        i;

    /* Allow for a direct gallery URL to be passed or just a gallery ID. This will accept:
     *
     * http://www.flickr.com/photos/etherworks/sets/72157630563520740/
     * or
     * 72157630563520740
     */
    if ( isNaN( photosetId ) ) {

      if ( photosetId.indexOf( "flickr.com" ) === -1 ) {

        pluginInstance.emit( "invalid-flickr-image" );
        return;
      }

      photoSplit = photosetId.split( "/" );

      // Can't always look for the ID in the same spot depending if the user includes the
      // last slash
      for ( i = 0, ln = photoSplit.length; i < ln; i++ ) {
        url = photoSplit[ i ];
        if ( !isNaN( url ) && url !== "" ) {
          photosetId = url;
          break;
        }
      }
    }

    uri = getPhotosetCmd + "&photoset_id=" + photosetId + APIKEY + jsonBits;
    Popcorn.getJSONP( uri, ready );
  }

  function calculateInOutTimes( start, duration, count ) {
    var inArr = [],
        i = 0,
        last = start,
        interval = duration / count;

    while ( i < count ) {
      inArr.push({
        "in": last = Math.round( ( start + ( interval * i++ ) ) * 100 ) / 100,
        out: i < count ? Math.round( ( last + interval ) * 100 ) / 100 : start + duration
      });
    }
    return inArr;
  }

  function validateDimension( value, fallback ) {
    if ( typeof value === "number" ) {
      return value;
    }
    return fallback;
  }

  function createImageDiv( imageUrl, linkUrl, instance ) {
    var div = document.createElement( "div" ),
        link = document.createElement( "a" );

    div.style.backgroundImage = "url( \"" + imageUrl + "\" )";
    div.classList.add( "image-plugin-img" );

    if ( linkUrl ) {
      link.setAttribute( "href", linkUrl );

      link.onclick = function() {
        instance.media.pause();
      };
    }
    link.setAttribute( "target", "_blank" );
    link.classList.add( "image-plugin-link" );

    link.appendChild( div );
    return link;
  }

  Popcorn.plugin( "image", {

    _setup: function( options ) {

      var _target,
          _container,
          _flickrCallback,
          _this = this;

      options._target = _target = Popcorn.dom.find( options.target );
      options._container = _container = document.createElement( "div" );

      _container.classList.add( "image-plugin-container" );
      _container.style.width = validateDimension( options.width, "100" ) + "%";
      _container.style.height = validateDimension( options.height, "100" ) + "%";
      _container.style.top = validateDimension( options.top, "0" ) + "%";
      _container.style.left = validateDimension( options.left, "0" ) + "%";
      _container.style.zIndex = +options.zindex;
      _container.classList.add( options.transition );
      _container.classList.add( "off" );

      if ( _target ) {

        _target.appendChild( _container );

        if ( options.src ) {

          if ( options.src.indexOf( FLICKR_SINGLE_CHECK ) > -1 ) {
            var url = options.src,
                urlSplit,
                uri,
                ln,
                _flickrStaticImage,
                photoId,
                i;

            urlSplit = url.split( "/" );

            for ( i = 0, ln = urlSplit.length; i < ln; i++ ) {
              url = urlSplit[ i ];
              if ( !isNaN( url ) && url !== "" ) {
                photoId = url;
                break;
              }
            }

            uri = getPhotoSizesCmd + APIKEY + "&photo_id=" + photoId + jsonBits;


            _flickrStaticImage = function( data ) {

              if ( data.stat === "ok" ) {

                // Unfortunately not all requests contain an "Original" size option
                // so I'm always taking the second last one. This has it's upsides and downsides
                _container.appendChild( createImageDiv( data.sizes.size[ data.sizes.size.length - 2 ].source, options.linkSrc, _this ) );
              }
            };

            Popcorn.getJSONP( uri, _flickrStaticImage );
          } else {
            _container.appendChild( createImageDiv( options.src, options.linkSrc, _this ) );
          }

        } else {

          _flickrCallback = function( data ) {

            var _collection = ( data.photos || data.photoset ),
                _photos,
                _inOuts,
                _lastVisible,
                _url,
                _link,
                _tagRefs = [],
                _count = options.count || _photos.length;

            if ( !_collection ) {
              return;
            }

            _photos = _collection.photo;

            if ( !_photos ) {
              return;
            }

            Popcorn.forEach( _photos, function ( item, i ) {

              _url = ( item.media && item.media.m ) || window.unescape( item.url_m );

              if ( i < _count ) {
                _link = createImageDiv( _url, _url, _this );
                _link.classList.add( "image-plugin-hidden" );
                _container.appendChild( _link );
                _tagRefs.push( _link );
              }
            });

            _inOuts = calculateInOutTimes( options.start, options.end - options.start, _count );

            options._updateImage = function() {
              var io,
                  ref,
                  currTime = _this.currentTime(),
                  i = _tagRefs.length - 1;
              for ( ; i >= 0; i-- ) {
                io = _inOuts[ i ];
                ref = _tagRefs[ i ];
                if ( currTime >= io[ "in" ] && currTime < io.out && ref.classList.contains( "image-plugin-hidden" ) ) {
                  if ( _lastVisible ) {
                    _lastVisible.classList.add( "image-plugin-hidden" );
                  }
                  ref.classList.remove( "image-plugin-hidden" );
                  _lastVisible = ref;
                  break;
                }
              }
            };

            // Check if should be currently visible
            options._updateImage();

            //  Check if should be updating
            if ( _this.currentTime() >= options.start && _this.currentTime() <= options.end ) {
              _this.on( "timeupdate", options._updateImage );
            }
          };

          if ( options.tags ) {
            searchImagesFlickr( options.tags, options.count || 10, _flickrCallback );
          } else if ( options.photosetId ) {
            getPhotoSet( options.photosetId, _flickrCallback, _this );
          }
        }

        options.toString = function() {
          if ( /^data:/.test( options.src ) ) {
            // might ba a data URI
            return options.src.substring( 0 , 30 ) + "...";
          } else if ( options.src ) {
            return options.src;
          } else if ( options.tags ) {
            return options.tags;
          } else if ( options.photosetId ) {
            return options.photosetId;
          }

          return "Image Plugin";
        };
      }
    },

    start: function( event, options ) {
      var container = options._container,
          redrawBug;

      if ( container ) {
        if ( options._updateImage ) {
          this.on( "timeupdate", options._updateImage );
        }

        container.classList.add( "on" );
        container.classList.remove( "off" );

        // Safari Redraw hack - #3066
        container.style.display = "none";
        redrawBug = container.offsetHeight;
        container.style.display = "";
      }
    },

    end: function( event, options ) {
      if( options._container ) {
        if ( options._updateImage ) {
          this.off( "timeupdate", options._updateImage );
        }

        options._container.classList.add( "off" );
        options._container.classList.remove( "on" );
      }
    },

    _teardown: function( options ) {
      if ( options._updateImage ) {
        this.off( options._updateImage );
      }
      options._container.parentNode.removeChild( options._container );
      delete options._container;
    },

    manifest: {
      about: {
        name: "Popcorn image Plugin",
        version: "0.1",
        author: "cadecairos",
        website: "https://chrisdecairos.ca/"
      },
      options: {
        target: "video-overlay",
        src: {
          elem: "input",
          type: "url",
          label: "Source URL",
          "default": "http://www.mozilla.org/media/img/home/firefox.png"
        },
        linkSrc: {
          elem: "input",
          type: "url",
          label: "Link URL"
        },
        tags: {
          elem: "input",
          type: "text",
          label: "Flickr: Tags",
          optional: true,
          "default": "Mozilla"
        },
        photosetId: {
          elem: "input",
          type: "text",
          label: "Flickr: Photoset Id",
          optional: true,
          "default": "http://www.flickr.com/photos/etherworks/sets/72157630563520740/"
        },
        count: {
          elem: "input",
          type: "number",
          label: "Flickr: Count",
          optional: true,
          "default": 3,
          MAX_COUNT: 20
        },
        width: {
          elem: "input",
          type: "number",
          label: "Width",
          "default": 80,
          "units": "%",
          hidden: true
        },
        height: {
          elem: "input",
          type: "number",
          label: "Height",
          "default": 80,
          "units": "%",
          hidden: true
        },
        top: {
          elem: "input",
          type: "number",
          label: "Top",
          "default": 10,
          "units": "%",
          hidden: true
        },
        left: {
          elem: "input",
          type: "number",
          label: "Left",
          "default": 10,
          "units": "%",
          hidden: true
        },
        transition: {
          elem: "select",
          options: [ "None", "Pop", "Slide Up", "Slide Down", "Fade" ],
          values: [ "popcorn-none", "popcorn-pop", "popcorn-slide-up", "popcorn-slide-down", "popcorn-fade" ],
          label: "Transition",
          "default": "popcorn-fade"
        },
        start: {
          elem: "input",
          type: "number",
          label: "Start",
          units: "seconds"
        },
        end: {
          elem: "input",
          type: "number",
          label: "End",
          units: "seconds"
        },
        zindex: {
          hidden: true
        }
      }
    }
  });
}( window.Popcorn ));

(function( Popcorn ) {
  Popcorn.plugin( "loopPlugin", function() {
    return {
      _setup: function( options ) {
        options.loop = options.loop || 0;
        options.count = +options.loop;
        options.toString = function() {
          return "Loop: " + ( options.loop > 0 ? options.count : "forever" );
        };
      },
      start: function() {
      },
      end: function( event, options ) {
          if ( ( this.currentTime() > options.end + 1 || this.currentTime() < options.end - 1 ) || this.seeking() || this.paused() ) {
            options.count = +options.loop;
            return;
          }
          if ( options.count > 0 || +options.loop === 0 ) {
            this.currentTime( options.start );
            if ( options.loop ) {
              options.count--;
            }
          } else {
            options.count = +options.loop;
          }
      }
    };
  },
  {
    "displayName": "loop",
    "options": {
      "start": {
        "elem": "input",
        "type": "text",
        "label": "In",
        "units": "seconds"
      },
      "end": {
        "elem": "input",
        "type": "text",
        "label": "Out",
        "units": "seconds"
      },
      "target": {
        "hidden": true
      },
      "loop": {
        "label": "Number of loops (0 = forever)",
        "elem": "input",
        "type": "number",
        "default": 0
      }
    }
  });
}( Popcorn ));

(function( Popcorn ) {
  Popcorn.plugin( "skip", function() {

    return {
      _setup: function( options ) {
        var skipTime = options.end;
        
        options.skipRange = function() {
          var ct = this.currentTime();
          if ( !this.paused() && ct > options.start && ct < options.end ) {
            this.currentTime( skipTime );
          }
        };
        options.toString = function() {
          return "Skip";
        };

        this.on( "timeupdate", options.skipRange );
       
      },
      start: function() {
      },
      end: function() {
      },
      _teardown: function( options ) {
        this.off( "timeupdate", options.skipRange );
      }
    };
  },
  {
    "options": {
      "start": {
        "elem": "input",
        "type": "text",
        "label": "In",
        "units": "seconds"
      },
      "end": {
        "elem": "input",
        "type": "text",
        "label": "Out",
        "units": "seconds"
      },
      "target": {
        "hidden": true
      }
    }
  });
}( Popcorn ));

(function( Popcorn ) {
  Popcorn.plugin( "pausePlugin", function() {
    var _this = this,
        _timeout,
        _seekedFunc = function() {
          if ( _timeout ) {
            clearTimeout( _timeout );
          }
          this.off( "seeked", _seekedFunc );
        };
    return {
      _setup: function( options ) {
        options.toString = function() {
          return "Pause " + ( options.duration > 0 ? options.duration : "forever" );
        };
      },
      start: function( event, options ) {
        // we need to add this on start as well because we can run into a race condition where 'seeked' is fired before
        // end is fired, or vice versa
        this.on( "seeked", _seekedFunc );
        this.pause();
        if ( +options.duration > 0 ) {
          _timeout = setTimeout(function() {
            _this.play();
            _this.off( "seeked", _seekedFunc );
          }, options.duration * 1000 );
        }
      },
      end: function() {
        // we need to add this on end instead of start because when seeking outside of an active trackevent,
        // end automatically gets fired
        this.on( "seeked", _seekedFunc );
      }
    };
  },
  {
    "displayName": "Pause",
    "options": {
      "start": {
        "elem": "input",
        "type": "text",
        "label": "In",
        "units": "seconds"
      },
      "end": {
        "elem": "input",
        "type": "text",
        "label": "Out",
        "units": "seconds"
      },
      "duration": {
        "elem": "input",
        "type": "number",
        "label": "Pause Duration (0 = forever)",
        "units": "seconds",
        "default": "0"
      },
      "target": {
        "hidden": true
      }
    }
  });
}( Popcorn ));

(function ( Popcorn ) {

  var allWikiLangLinks, allWikiLangNames,
      cachedArticles = [];

  // shortcut
  function create( type ) {
    return document.createElement( type );
  }

  function getFragment( inputString ) {
    //grabbed from butter util methods
    var range = document.createRange(),
        // For particularly speedy loads, 'body' might not exist yet, so try to use 'head'
        container = document.body || document.head,
        fragment;

    range.selectNode( container );
    fragment = range.createContextualFragment( inputString );

    if( fragment.childNodes.length === 1 ){
      var child = fragment.firstChild;
      fragment.removeChild( child );
      return child;
    }

    return fragment;
  }

  function validateDimension( value, fallback ) {
    if ( typeof value === "number" ) {
      return value;
    }
    return fallback;
  }

  function sanitize( text ) {
    return text.replace( /\(/g, "&lpar;" )
               .replace( /\)/g, "&rpar;" )
               .replace( /-/g, "&hyphen;" )
               .replace( /\s/g, "&nbsp;" )
               .replace( /,/g, "&comma;" )
               .replace( /'/g, "&apos" );
  }

  function areValidElements( element ) {
    while( element && !element.textContent ){
      element = element.nextElementSibling;
      if ( !element || element.nodeName !== "P" ) {
        return false;
      }
    }
    return true;
  }

  function setupWiki( options ) {
    // declare needed variables
    // get a guid to use for the global wikicallback function
    var _title,
        _titleDiv,
        _titleTextArea,
        _mainContentDiv,
        _contentArea,
        _toWikipedia,
        _inner,
        _href,
        _query,
        _guid = Popcorn.guid( "wikiCallback" ),
        _this = this;

    if ( options._container && options._inner ) {
      options._container.removeChild( options._inner );
    }

    options._inner = _inner = create( "div" );
    _inner.classList.add( "wikipedia-inner-container" );

    _titleDiv = create( "div" );
    _titleDiv.classList.add( "wikipedia-title" );

    _titleTextArea = create( "div" );
    _titleTextArea.classList.add( "wikipedia-title-text" );
    _titleTextArea.classList.add( "wikipedia-ellipsis" );

    _titleDiv.appendChild( _titleTextArea );

    _mainContentDiv = create( "div" );
    _mainContentDiv.classList.add( "wikipedia-main-content" );

    _contentArea = create( "div" );
    _contentArea.classList.add( "wikipedia-content" );

    _mainContentDiv.appendChild( _contentArea );

    _toWikipedia = create( "a" );
    _toWikipedia.classList.add( "wikipedia-to-wiki" );

    _inner.appendChild( _titleDiv );
    _inner.appendChild( _mainContentDiv );
    _inner.appendChild( _toWikipedia );

    options._container.appendChild( _inner );
    options._target.appendChild( options._container );

    if ( !options.lang ) {
      options.lang = "en";
    }

    function buildArticle( data ) {
      var childIndex = 1,
          responseFragment = getFragment( "<div>" + data.parse.text + "</div>" ),
          element = responseFragment.querySelector( "div > p:nth-of-type(" + childIndex + ")" ),
          mainText = "";

      _titleTextArea.appendChild( getFragment( "<a href=\"" + options._link + "\" target=\"_blank\">" + sanitize( data.parse.title ) + "</a>" ) );
      _toWikipedia.href = options._link;
      _toWikipedia.onclick = function() {
        _this.media.pause();
      };
      _toWikipedia.setAttribute( "target", "_blank" );

      while ( !areValidElements( element ) ) {
        element = responseFragment.querySelector( "div > p:nth-of-type(" + ( ++childIndex ) + ")" );
      }

      while ( element && element.nodeName === "P" ) {
        mainText += element.textContent + "<br />";
        element = element.nextElementSibling;
      }

      _contentArea.innerHTML = mainText;
    }

    window[ _guid ] = function ( data ) {

      cachedArticles[ _query ] = data;

      if ( data.error ) {
        _titleTextArea.innerHTML = "Article Not Found";
        _contentArea.innerHTML = data.error.info;
        return;
      }

      buildArticle( data );
    };

    if ( options.src ) {

      _query = options.src + options.lang;
      _href = "//" + window.escape( options.lang ) + ".wikipedia.org/w/";
      _title = options.src.slice( options.src.lastIndexOf( "/" ) + 1 );
      options._link = "//" + window.escape( options.lang + ".wikipedia.org/wiki/" + _title );

      if ( !cachedArticles[ _query ] ) {
        // gets the mobile format, so that we don't load unwanted images when the respose is turned into a documentFragment
        Popcorn.getScript( _href + "api.php?action=parse&prop=text&redirects&page=" +
          window.escape( _title ) + "&noimages=1&mobileformat=html&format=json&callback=" + _guid );
      } else {
        buildArticle( cachedArticles[ _query ] );
      }
    }
  }

  var WikipediaDefinition = {

    _setup : function( options ) {
      var _outer;

      options._target = Popcorn.dom.find( options.target );

      if ( !options._target ) {
        return;
      }

      options._container = _outer = create( "div" );
      _outer.classList.add( "wikipedia-outer-container" );
      _outer.classList.add( options.transition );
      _outer.classList.add( "off" );

      _outer.style.width = validateDimension( options.width, "100" ) + "%";
      _outer.style.height = validateDimension( options.height, "100" ) + "%";
      _outer.style.top = validateDimension( options.top, "0" ) + "%";
      _outer.style.left = validateDimension( options.left, "0" ) + "%";
      _outer.style.zIndex = +options.zindex;

      setupWiki( options );

      options.toString = function() {
        return options.src || options._natives.manifest.options.src[ "default" ];
      };
    },

    start: function( event, options ){
      var container = options._container,
          redrawBug;

      if ( container ) {
        container.classList.add( "on" );
        container.classList.remove( "off" );

        // Safari Redraw hack - #3066
        container.style.display = "none";
        redrawBug = container.offsetHeight;
        container.style.display = "";
      }
    },

    end: function( event, options ){
      if ( options._container ) {
        options._container.classList.add( "off" );
        options._container.classList.remove( "on" );
      }
    },

    _teardown: function( options ){
      if ( options._target && options._container ) {
        options._target.removeChild( options._container );
      }
    },

    _update: function( trackEvent, options ) {

      if ( options.transition && options.transition !== trackEvent.transition ) {
        trackEvent._container.classList.remove( trackEvent.transition );
        trackEvent.transition = options.transition;
        trackEvent._container.classList.add( trackEvent.transition );
      }

      if ( options.src && options.src !== trackEvent.src ) {
        trackEvent.src = options.src;
        setupWiki( trackEvent );
      }

      if ( options.lang && options.lang !== trackEvent.lang ) {
        trackEvent.lang = options.lang;
        setupWiki( trackEvent );
      }

      if ( options.top && options.top !== trackEvent.top ) {
        trackEvent.top = options.top;
        trackEvent._container.style.top = trackEvent.top + "%";
      }

      if ( options.left && options.left !== trackEvent.left ) {
        trackEvent.left = options.left;
        trackEvent._container.style.left = trackEvent.left + "%";
      }

      if ( options.width && options.width !== trackEvent.width ) {
        trackEvent.width = options.width;
        trackEvent._container.style.width = trackEvent.width + "%";
      }

      if ( options.height && options.height !== trackEvent.height ) {
        trackEvent.height = options.height;
        trackEvent._container.style.height = trackEvent.height + "%";
      }

    }
  };

  // Language codes: http://stats.wikimedia.org/EN/TablesDatabaseWikiLinks.htm

  allWikiLangLinks = ( "en,ja,es,de,ru,fr,it,pt,pl,zh,nl,tr,ar,sv,id,cs,fi,ko,th,fa,hu,he,no,vi,uk,da,ro" +
                         ",bg,hr,ca,el,sk,ms,sr,lt,sl,simple,eo,tl,et,hi,kk,sh,nn,ta,az,bs,af,eu,ka,lv,gl" +
                         ",zh_yue,tpi,mk,mr,la,ml,sq,be,cy,br,is,an,bn,war,oc,hy,arz,te,jv,ceb,sw" +
                         ",lb,als,ur,vo,fy,kn,gan,mg,ang,vec,gd,gu,ast,io,uz,qu,wuu,su,ku,yo,ga" +
                         ",tt,scn,bar,nds,se,ht,ne,ia,sco,lmo,mn,cv,ckb,diq,my,pnb,new,pms,zh-min-nan,yi,am" +
                         ",bpy,li,si,os,mt,nah,ps,fo,hsb,ilo,nap,wa,gv,ky,pam,sah,co,tg,ba,bcl" +
                         ",hif,km,sa,vls,or,mzn,ig,so,bo,kl,ksh,as,mi,szl,mwl,nrm,dsb,fiu-vro,dv,stq" +
                         ",tk,roa-rup,bug,mhr,kw,fur,sc,lad,csb,pa,rue,frr,gn,rm,ace,nv,bjn,arc,krc,ext,ug,nov" +
                         ",frp,crh,ab,lij,jbo,kv,ay,ce,ln,pdc,udm,eml,ie,mrj,xal,bh,hak,lo,wo" +
                         ",glk,myv,sn,chr,pag,rw,pcd,pap,zea,lbe,vep,koi,na,haw,cu,to,pi,av,zu,lez,kab,mdf," +
                         "tet,kaa,za,bm,rmy,kbd,iu,bi,kg,pih,ss,chy,ee,om,cr,cdo,srn,got,ha,bxr,ch,ty,sm,ltg," +
                         "pnt,ak,dz,st,sd,ik,ts,nso,y,tn,ki,ff,rn,xh,sg,ve,tw,ks,tum,fj,ti,lg" ).split( "," );

  allWikiLangNames = ( "English,Japanese,Spanish,German,Russian,French,Italian,Portuguese,Polish," +
                           "Chinese,Dutch,Turkish,Arabic,Swedish,Indonesian,Czech,Finnish,Korean,Thai," +
                           "Persian,Hungarian,Hebrew,Norwegian,Vietnamese,Ukrainian,Danish,Romanian," +
                           "Bulgarian,Croatian,Catalan,Greek,Slovak,Malay,Serbian,Lithuanian,Slovene," +
                           "Simple English,Esperanto,Tagalog,Estonian,Hindi,Kazakh,Serbo-Croatian,Nynorsk," +
                           "Tamil,Azeri,Bosnian,Afrikaans,Basque,Georgian,Latvian,Galician,Cantonese," +
                           "Tok Pisin,Macedonian,Marathi,Latin,Malayalam,Albanian,Welsh,Breton," +
                           "Icelandic,Aragonese,Bengali,Waray-Waray,Occitan,Armenian,Egyptian Arabic," +
                           "Belarusian,Telugu,Javanese,Cebuano,Swahili,Luxembourgish,Alemannic,Urdu," +
                           "Volapuk,Frisian,Kannada,Gan,Malagasy,Anglo Saxon,Venetian," +
                           "Scots Gaelic,Gujarati,Asturian,Ido,Uzbek,Quechua,Wu,Sundanese,Kurdish,Yoruba," +
                           "Irish,Tatar,Sicilian,Bavarian,Low Saxon,Northern Sami,Haitian,Nepali," +
                           "Interlingua,Scots,Lombard,Mongolian,Chuvash,Sorani,Zazaki,Burmese,Western Panjabi" +
                           ",Nepal Bhasa,Piedmontese,Min Nan,Yiddish,Amharic,Bishnupriya Manipuri,Limburgish," +
                           "Sinhala,Ossetic,Maltese,Nahuatl,Pashto,Faroese,Upper Sorbian,Ilokano,Neapolitan," +
                           "Walloon,Manx,Kirghiz,Kapampangan,Sakha,Corsican,Tajik,Bashkir," +
                           "Central Bicolano,Fiji Hindi,Khmer,Sanskrit,West Flemish,Oriya,Mazandarani," +
                           "Igbo,Somali,Tibetan,Greenlandic,Ripuarian,Assamese,Maori,Silesian," +
                           "Mirandese,Norman,Lower Sorbian,Voro,Divehi,Saterland Frisian,Turkmen,Aromanian," +
                           "Buginese,Eastern Mari,Cornish,Friulian,Sardinian,Ladino,Cassubian,Punjabi,Rusyn," +
                           "North Frisian,Guarani,Romansh,Acehnese,Navajo,Banjar,Aramaic,Karachay-Balkar," +
                           "Extremaduran,Uyghur,Novial,Arpitan,Crimean Tatar,Abkhazian,Ligurian," +
                           "Lojban,Komi,Aymara,Chechen,Lingala,Pennsylvania German,Udmurt,Emilian-Romagnol," +
                           "Interlingue,Western Mari,Kalmyk,Bihari,Hakka,Laotian,Wolof,Gilaki," +
                           "Erzya,Shona,Cherokee,Pangasinan,Kinyarwanda,Picard,Papiamentu,Zealandic,Lak," +
                           "Vepsian,Komi Permyak,Nauruan,Hawai'ian,Old Church Slavonic,Tongan,Pali,Avar," +
                           "Zulu,Lezgian,Kabyle,Moksha,Tetum,Karakalpak,Zhuang,Bambara,Romani,Karbadian," +
                           "Inuktitut,Bislama,Kongo,Norfolk,Siswati,Cheyenne,Ewe,Oromo,Cree,Min Dong," +
                           "Sranan,Gothic,Hausa,Buryat,Chamorro,Tahitian,Samoan,Latgalian,Pontic,Akan," +
                           "Dzongkha,Sesotho,Sindhi,Inupiak,Tsonga,Northern Sotho,Chichewa,Setswana,Kikuyu," +
                           "Fulfulde,Kirundi,Xhosa,Sangro,Venda,Twi,Kashmiri,Tumbuka,Fijian,Tigrinya,Ganda" ).split( "," );

  Popcorn.plugin( "wikipedia", WikipediaDefinition, {
    about:{
      name: "Popcorn Wikipedia Plugin",
      version: "0.1",
      author: "@ChrisDeCairos",
      website: "https://chrisdecairos.ca/"
    },
    options:{
      start: {
        elem: "input",
        type: "number",
        label: "Start",
        "units": "seconds"
      },
      end: {
        elem: "input",
        type: "number",
        label: "End",
        "units": "seconds"
      },
      lang: {
        elem: "select",
        options: allWikiLangNames,
        values: allWikiLangLinks,
        label: "Language",
        "default": "en"
      },
      src: {
        elem: "input",
        type: "text",
        label: "Article Link/Title",
        "default": "Popcorn.js"
      },
      width: {
        elem: "input",
        type: "number",
        label: "Width",
        "default": 40,
        "units": "%",
        "hidden": true
      },
      height: {
        elem: "input",
        type: "number",
        label: "Height",
        "default": 50,
        "units": "%",
        "hidden": true
      },
      top: {
        elem: "input",
        type: "number",
        label: "Top",
        "default": 25,
        "units": "%",
        "hidden": true
      },
      left: {
        elem: "input",
        type: "number",
        label: "Left",
        "default": 30,
        "units": "%",
        "hidden": true
      },
      target: {
        hidden: true
      },
      transition: {
        elem: "select",
        options: [ "None", "Pop", "Fade", "Slide Up", "Slide Down" ],
        values: [ "popcorn-none", "popcorn-pop", "popcorn-fade", "popcorn-slide-up", "popcorn-slide-down" ],
        label: "Transition",
        "default": "popcorn-fade"
      },
      zindex: {
        hidden: true
      }
    }
  });

}( Popcorn ));

// PLUGIN: sequencer

(function ( Popcorn ) {

  // XXX: SoundCloud has a bug (reported by us, but as yet unfixed) which blocks
  // loading of a second iframe/player if the iframe for the first is removed
  // from the DOM.  We can simply move old ones to a quarantine div, hidden from
  // the user for now (see #2630).  We lazily create and memoize the instance.
  // I am seeing this on other iframes as well. Going to do this on all cases.
  function getElementQuarantine() {
    if ( getElementQuarantine.instance ) {
      return getElementQuarantine.instance;
    }

    var quarantine = document.createElement( "div" );
    quarantine.style.width = "0px";
    quarantine.style.height = "0px";
    quarantine.style.overflow = "hidden";
    quarantine.style.visibility = "hidden";
    document.body.appendChild( quarantine );

    getElementQuarantine.instance = quarantine;
    return quarantine;
  }

  var MEDIA_LOAD_TIMEOUT = 10000;

  Popcorn.plugin( "sequencer", {
    _setup: function( options ) {
      var _this = this;

      options.setupContainer = function() {
        var container = document.createElement( "div" ),
            target = Popcorn.dom.find( options.target );

        if ( !target ) {
          target = _this.media.parentNode;
        }

        options._target = target;
        options._container = container;

        container.style.zIndex = 0;
        container.className = "popcorn-sequencer";
        container.style.position = "absolute";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.top = 0;
        container.style.left = 0;

        target.appendChild( container );
      };
      options.displayLoading = function() {
        _this.on( "play", options._surpressPlayEvent );
        document.querySelector( ".loading-message" ).classList.add( "show-media" );
      };
      options.hideLoading = function() {
        _this.off( "play", options._surpressPlayEvent );
        document.querySelector( ".loading-message" ).classList.remove( "show-media" );
      };

      if ( !options.from || options.from > options.duration ) {
        options.from = 0;
      }

      options._volumeEvent = function() {
        if ( _this.muted() ) {
          options._clip.mute();
        } else {
          if ( !options.mute ) {
            options._clip.unmute();
            options._clip.volume( ( options.volume / 100 ) * _this.volume() );
          } else {
            options._clip.mute();
          }
        }
      };

      options.readyEvent = function() {
        clearTimeout( options.loadTimeout );
        // If teardown was hit before ready, ensure we teardown.
        if ( options._cancelLoad ) {
          options._cancelLoad = false;
          options.tearDown();
        }
        options.failed = false;
        options._clip.off( "loadedmetadata", options.readyEvent );
        options.ready = true;
        options._container.style.width = ( options.width || "100" ) + "%";
        options._container.style.height = ( options.height || "100" ) + "%";
        options._container.style.top = ( options.top || "0" ) + "%";
        options._container.style.left = ( options.left || "0" ) + "%";
        _this.on( "volumechange", options._volumeEvent );
        if ( options.active ) {
          options._startEvent();
        }
      };

      // Function to ensure the mixup as to if a clip is an array
      // or string is normalized to an array as often as possible.
      options.sourceToArray = function( updates ) {
        // If our src is not an array, create an array of one.
        options.source = typeof options.source === "string" ? [ options.source ] : options.source;
        if ( options.fallback ) {
          if ( !Array.isArray( options.fallback ) ) {
            options.fallback = [ options.fallback ];
          }
          if ( updates && !Array.isArray( updates.source ) ) {
            updates.source = [ updates.source ];
          }
          options.source = options.source.concat( options.fallback );
        }
      };

      // If loading times out, we want to let the media continue to play.
      // The clip that failed to load would be ignored,
      // and everything else playable.
      options.fail = function() {
        _this.off( "play", options._playWhenReadyEvent );
        options.failed = true;
        options.hideLoading();
        if ( !options.hidden && options.active ) {
          options._container.style.zIndex = +options.zindex;
        }
        if ( options.playWhenReady ) {
          _this.play();
        }
      };

      options.tearDown = function() {
        _this.off( "volumechange", options._volumeEvent );
        // If we have no options._clip, no source was given to this track event,
        // and it is being torn down.
        if ( options._clip ) {
          // XXX: pull the SoundCloud iframe element out of our video div, and quarantine
          // so we don't delete it, and block loading future SoundCloud instances. See above.
          // This is also fixing an issue in youtube, so we do it for all medias with iframes now.
          // If you remove the iframe, there is potential that other services
          // are still referencing these iframes. Keeping them around protects us.
          var elementParent = options._clip.media.parentNode,
              element = elementParent.querySelector( "iframe" ) ||
                        elementParent.querySelector( "video" ) ||
                        elementParent.querySelector( "audio" );
          if ( element ) {
            getElementQuarantine().appendChild( element );
          }
          options._clip.destroy();
        }

        // Tear-down old instances, special-casing iframe removal, see above.
        if ( options._container && options._container.parentNode ) {
          options._container.parentNode.removeChild( options._container );
        }
      };

      options.clearEvents = function() {
        _this.off( "play", options._playWhenReadyEvent );
        _this.off( "play", options._playEvent );
        _this.off( "pause", options._pauseEvent );
        _this.off( "seeked", options._seekedEvent );
      };

      options.addSource = function() {
        if ( options.loadTimeout ) {
          clearTimeout( options.loadTimeout );
        }
        // if the video is denied for any reason, most cases youtube embedding disabled,
        // don't bother waiting and display fail case.
        if ( options.denied ) {
          options.fail();
        } else {
          options.loadTimeout = setTimeout( options.fail, MEDIA_LOAD_TIMEOUT );
        }
        options._clip = Popcorn.smart( options._container, options.source, { frameAnimation: true } );
        options._clip.media.style.width = "100%";
        options._clip.media.style.height = "100%";
        options._container.style.width = "100%";
        options._container.style.height = "100%";
        if ( options._clip.media.readyState >= 1 ) {
          options.readyEvent();
        } else {
          options._clip.on( "loadedmetadata", options.readyEvent );
        }
      };

      // Ensures seek time is seekable, and not already seeked.
      // Returns true for successful seeks.
      options._setClipCurrentTime = function( time ) {
        if ( !time && time !== 0 ) {
          time = _this.currentTime() - options.start + (+options.from);
        }
        if ( time !== options._clip.currentTime() &&
             time >= (+options.from) && time <= options.duration ) {
          options._clip.currentTime( time );
          // Seek was successful.
          return true;
        }
      };

      // While clip is loading, do not let the timeline play.
      options._surpressPlayEvent = function() {
        _this.pause();
      };

      options.setupContainer();
      if ( options.source ) {
        options.sourceToArray();
        options.addSource();
      }

      options._startEvent = function() {
        // wait for this seek to finish before displaying it
        // we then wait for a play as well, because youtube has no seek event,
        // but it does have a play, and won't play until after the seek.
        // so we know if the play has finished, the seek is also finished.
        var seekedEvent = function () {
          var playedEvent = function() {
            options._clip.off( "play", playedEvent );
            _this.off( "play", options._playWhenReadyEvent );
            _this.on( "play", options._playEvent );
            _this.on( "pause", options._pauseEvent );
            _this.on( "seeked", options._seekedEvent );
            options.hideLoading();
            if ( !options.hidden && options.active ) {
              options._container.style.zIndex = +options.zindex;
            } else {
              options._container.style.zIndex = 0;
            }
            if ( options.playWhenReady ) {
              _this.play();
            } else {
              options._clip.pause();
            }
            options._clip.on( "play", options._clipPlayEvent );
            options._clip.on( "pause", options._clipPauseEvent );
            if ( options.active ) {
              options._volumeEvent();
            }
          };
          options._clip.off( "seeked", seekedEvent );
          options._clip.on( "play", playedEvent );
          options._clip.play();
        };
        options._clip.mute();
        options._clip.on( "seeked", seekedEvent);
        // If the seek failed, we're already at the desired time.
        // fire the seekedEvent right away.
        if ( !options._setClipCurrentTime() ) {
          seekedEvent();
        }
      };

      options._playWhenReadyEvent = function() {
        options.playWhenReady = true;
      };

      // Two events for playing the main timeline if the clip is playing.
      options._clipPlayEvent = function() {
        if ( _this.paused() ) {
          _this.off( "play", options._playEvent );
          _this.on( "play", options._playEventSwitch );
          _this.play();
        }
      };

      // Switch event is used to ensure we don't listen in loops.
      options._clipPlayEventSwitch = function() {
        options._clip.off( "play", options._clipPlayEventSwitch );
        options._clip.on( "play", options._clipPlayEvent );
      };

      // Two events for playing the clip timeline if the main is playing.
      options._playEvent = function() {
        if ( options._clip.paused() ) {
          options._clip.off( "play", options._clipPlayEvent );
          options._clip.on( "play", options._clipPlayEventSwitch );
          options._clip.play();
        }
      };

      // Switch event is used to ensure we don't listen in loops.
      options._playEventSwitch = function() {
        _this.off( "play", options._playEventSwitch );
        _this.on( "play", options._playEvent );
      };

      // Two events for pausing the main timeline if the clip is paused.
      options._clipPauseEvent = function() {
        if ( !_this.paused() ) {
          _this.off( "pause", options._pauseEvent );
          _this.on( "pause", options._pauseEventSwitch );
          _this.pause();
        }
      };

      // Switch event is used to ensure we don't listen in loops.
      options._clipPauseEventSwitch = function() {
        options._clip.off( "pause", options._clipPauseEventSwitch );
        options._clip.on( "pause", options._clipPauseEvent );
      };

      // Two events for pausing the clip timeline if the main is paused.
      options._pauseEvent = function() {
        if ( !options._clip.paused() ) {
          options._clip.off( "pause", options._clipPauseEvent );
          options._clip.on( "pause", options._clipPauseEventSwitch );
          options._clip.pause();
        }
      };

      // Switch event is used to ensure we don't listen in loops.
      options._pauseEventSwitch = function() {
        _this.off( "pause", options._pauseEventSwitch );
        _this.on( "pause", options._pauseEvent );
      };

      // event to seek the slip if the main timeline seeked.
      options._seekedEvent = function() {
        options._setClipCurrentTime();
      };

      options.toString = function() {
        return options.title || options.source || "";
      };

      if ( options.duration > 0 &&
           options.end - ( options.start - ( +options.from ) ) > options.duration ) {
        options.end = options.duration + ( options.start - ( +options.from ) );
      }
    },
    _update: function( options, updates ) {
      if ( updates.hasOwnProperty( "duration" ) ) {
        options.duration = updates.duration;
      }
      if ( updates.hasOwnProperty( "from" ) && updates.from < options.duration ) {
        options.from = updates.from;
      }
      if ( options.end - ( options.start - ( +options.from ) ) > options.duration ) {
        options.end = options.duration + ( options.start - ( +options.from ) );
      }
      if ( updates.hasOwnProperty( "zindex" ) ) {
        options.zindex = updates.zindex;
        if ( !options.hidden && options.active ) {
          options._container.style.zIndex = +options.zindex;
        } else {
          options._container.style.zIndex = 0;
        }
      }
      if ( updates.title ) {
        options.title = updates.title;
      }
      if ( updates.denied ) {
        options.denied = updates.denied;
      }
      if ( updates.hasOwnProperty( "hidden" ) ) {
        options.hidden = updates.hidden;
        if ( !options.hidden && options.active ) {
          options._container.style.zIndex = +options.zindex;
        } else {
          options._container.style.zIndex = 0;
        }
      }
      if ( updates.fallback ) {
        options.fallback = updates.fallback;
      }
      if ( updates.source ) {
        options.sourceToArray( updates );
        if ( updates.source.toString() !== options.source.toString() ) {
          options.ready = false;
          options.playWhenReady = false;
          if ( options.active ) {
            options.displayLoading();
          }
          options.source = updates.source;
          options.clearEvents();
          // TODO: ensure any pending loads are torn down.
          options.tearDown();
          options.setupContainer();
          this.on( "play", options._playWhenReadyEvent );
          if ( !this.paused() ) {
            options.playWhenReady = true;
            this.pause();
            if ( options._clip && !options._clip.paused() ) {
              options._clip.pause();
            }
          }
          options.addSource();
        }
      }
      if ( updates.hasOwnProperty( "mute" ) ) {
        options.mute = updates.mute;
        options._volumeEvent();
      }
      if ( updates.hasOwnProperty( "top" ) ) {
        options.top = updates.top;
        options._container.style.top = ( options.top || "0" ) + "%";
      }
      if ( updates.hasOwnProperty( "left" ) ) {
        options.left = updates.left;
        options._container.style.left = ( options.left || "0" ) + "%";
      }
      if ( updates.hasOwnProperty( "height" ) ) {
        options.height = updates.height;
        options._container.style.height = ( options.height || "100" ) + "%";
      }
      if ( updates.hasOwnProperty( "width" ) ) {
        options.width = updates.width;
        options._container.style.width = ( options.width || "100" ) + "%";
      }
      if ( options.ready ) {
        if ( updates.hasOwnProperty( "volume" ) ) {
          options.volume = updates.volume;
          options._volumeEvent();
        }
        options._setClipCurrentTime();
      }
    },
    _teardown: function( options ) {
      // If we're ready, or never going to be, simply teardown.
      if ( options.ready || !options.source ) {
        options.tearDown();
      } else {
        // If we're not ready yet, ensure we do the proper teardown once ready.
        options._cancelLoad = true;
      }
    },
    start: function( event, options ) {
      options.active = true;
      if ( options.source ) {
        if ( !options.hidden && options.failed ) {
          // display player in case any external players show a fail message.
          // eg. youtube embed disabled by uploader.
          options._container.style.zIndex = +options.zindex;
          return;
        }
        this.on( "play", options._playWhenReadyEvent );
        if ( !this.paused() ) {
          options.playWhenReady = true;
          options._clip.pause();
        }
        if ( options.ready ) {
          options._startEvent();
        } else {
          this.pause();
          options.displayLoading();
        }
      }
    },
    end: function( event, options ) {
      options.clearEvents();
      options.hideLoading();
      // cancel any pending or future starts
      options.active = false;
      options.playWhenReady = false;
      if ( options.ready ) {
        // video element can be clicked on. Keep them in sync with the main timeline.
        // We need to also clear these events.
        options._clip.off( "play", options._clipPlayEvent );
        options._clip.off( "pause", options._clipPauseEvent );
        if ( !options._clip.paused() ) {
          options._clip.pause();
        }
        // reset current time so next play from start is smooth. We've pre seeked.
        options._setClipCurrentTime( +options.from );
      }
      options._container.style.zIndex = 0;
      if ( options.ready ) {
        options._clip.mute();
      }
    },
    manifest: {
      about: {},
      options: {
        start: {
          elem: "input",
          type: "text",
          label: "In",
          "units": "seconds"
        },
        end: {
          elem: "input",
          type: "text",
          label: "Out",
          "units": "seconds"
        },
        source: {
          elem: "input",
          type: "url",
          label: "Source URL"
        },
        fallback: {
          elem: "input",
          type: "url",
          label: "Fallback URL (only applies to exported projects)"
        },
        title: {
          elem: "input",
          type: "text",
          label: "Clip title"
        },
        width: {
          elem: "input",
          type: "number",
          label: "Width",
          "default": 100,
          "units": "%",
          hidden: true
        },
        height: {
          elem: "input",
          type: "number",
          label: "Height",
          "default": 100,
          "units": "%",
          hidden: true
        },
        top: {
          elem: "input",
          type: "number",
          label: "Top",
          "default": 0,
          "units": "%",
          hidden: true
        },
        left: {
          elem: "input",
          type: "number",
          label: "Left",
          "default": 0,
          "units": "%",
          hidden: true
        },
        from: {
          elem: "input",
          type: "seconds",
          "units": "seconds",
          "label": "Start at",
          "default": "0"
        },
        volume: {
          elem: "input",
          type: "number",
          units: "%",
          label: "Volume",
          "default": 100
        },
        hidden: {
          elem: "input",
          type: "checkbox",
          label: "Sound only",
          "default": false
        },
        mute: {
          elem: "input",
          type: "checkbox",
          label: "Mute",
          "default": false
        },
        zindex: {
          hidden: true
        },
        denied: {
          hidden: true
        },
        duration: {
          hidden: true
        }
      }
    }
  });

}( Popcorn ));


/**
 * The Popcorn._MediaElementProto object is meant to be used as a base
 * prototype for HTML*VideoElement and HTML*AudioElement wrappers.
 * MediaElementProto requires that users provide:
 *   - parentNode: the element owning the media div/iframe
 *   - _eventNamespace: the unique namespace for all events
 */
(function( Popcorn, document ) {

  /*********************************************************************************
   * parseUri 1.2.2
   * http://blog.stevenlevithan.com/archives/parseuri
   * (c) Steven Levithan <stevenlevithan.com>
   * MIT License
   */
  function parseUri (str) {
    var	o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) {
      uri[o.key[i]] = m[i] || "";
    }

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
      if ($1) {
        uri[o.q.name][$1] = $2;
      }
    });

    return uri;
  }

  parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
      name:   "queryKey",
      parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
      strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
      loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
  };
  /*********************************************************************************/

  // Fake a TimeRanges object
  var _fakeTimeRanges = {
    length: 0,
    start: Popcorn.nop,
    end: Popcorn.nop
  };

  // Make sure the browser has MediaError
  MediaError = MediaError || (function() {
    function MediaError(code, msg) {
      this.code = code || null;
      this.message = msg || "";
    }
    MediaError.MEDIA_ERR_NONE_ACTIVE    = 0;
    MediaError.MEDIA_ERR_ABORTED        = 1;
    MediaError.MEDIA_ERR_NETWORK        = 2;
    MediaError.MEDIA_ERR_DECODE         = 3;
    MediaError.MEDIA_ERR_NONE_SUPPORTED = 4;

    return MediaError;
  }());


  function MediaElementProto(){}
  MediaElementProto.prototype = {

    _util: {

      // Each wrapper stamps a type.
      type: "HTML5",

      // How often to trigger timeupdate events
      TIMEUPDATE_MS: 250,

      // Standard width and height
      MIN_WIDTH: 300,
      MIN_HEIGHT: 150,

      // Check for attribute being set or value being set in JS.  The following are true:
      //   autoplay
      //   autoplay="true"
      //   v.autoplay=true;
      isAttributeSet: function( value ) {
        return ( typeof value === "string" || value === true );
      },

      parseUri: parseUri

    },

    // Mimic DOM events with custom, namespaced events on the document.
    // Each media element using this prototype needs to provide a unique
    // namespace for all its events via _eventNamespace.
    addEventListener: function( type, listener, useCapture ) {
      document.addEventListener( this._eventNamespace + type, listener, useCapture );
    },

    removeEventListener: function( type, listener, useCapture ) {
      document.removeEventListener( this._eventNamespace + type, listener, useCapture );
    },

    dispatchEvent: function( name ) {
      var customEvent = document.createEvent( "CustomEvent" ),
        detail = {
          type: name,
          target: this.parentNode,
          data: null
        };

      customEvent.initCustomEvent( this._eventNamespace + name, false, false, detail );
      document.dispatchEvent( customEvent );
    },

    load: Popcorn.nop,

    canPlayType: function( url ) {
      return "";
    },

    // Popcorn expects getBoundingClientRect to exist, forward to parent node.
    getBoundingClientRect: function() {
      return this.parentNode.getBoundingClientRect();
    },

    NETWORK_EMPTY: 0,
    NETWORK_IDLE: 1,
    NETWORK_LOADING: 2,
    NETWORK_NO_SOURCE: 3,

    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4

  };

  MediaElementProto.prototype.constructor = MediaElementProto;

  Object.defineProperties( MediaElementProto.prototype, {

    currentSrc: {
      get: function() {
        return this.src !== undefined ? this.src : "";
      }
    },

    // We really can't do much more than "auto" with most of these.
    preload: {
      get: function() {
        return "auto";
      },
      set: Popcorn.nop
    },

    controls: {
      get: function() {
        return true;
      },
      set: Popcorn.nop
    },

    // TODO: it would be good to overlay an <img> using this URL
    poster: {
      get: function() {
        return "";
      },
      set: Popcorn.nop
    },

    crossorigin: {
      get: function() {
        return "";
      }
    },

    played: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    seekable: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    buffered: {
      get: function() {
        return _fakeTimeRanges;
      }
    },

    defaultMuted: {
      get: function() {
        return false;
      }
    },

    defaultPlaybackRate: {
      get: function() {
        return 1.0;
      }
    },

    style: {
      get: function() {
        return this.parentNode.style;
      }
    },

    id: {
      get: function() {
        return this.parentNode.id;
      }
    }

    // TODO:
    //   initialTime
    //   playbackRate
    //   startOffsetTime

  });

  Popcorn._MediaElementProto = MediaElementProto;

}( Popcorn, window.document ));

/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, document ) {

  function canPlaySrc( src ) {
    // We can't really know based on URL.
    return "maybe";
  }

  function wrapMedia( id, mediaType ) {
    var parent = typeof id === "string" ? document.querySelector( id ) : id,
      media = document.createElement( mediaType );

    parent.appendChild( media );

    // Add the helper function _canPlaySrc so this works like other wrappers.
    media._canPlaySrc = canPlaySrc;

    return media;
  }

  Popcorn.HTMLVideoElement = function( id ) {
    return wrapMedia( id, "video" );
  };
  Popcorn.HTMLVideoElement._canPlaySrc = canPlaySrc;


  Popcorn.HTMLAudioElement = function( id ) {
    return wrapMedia( id, "audio" );
  };
  Popcorn.HTMLAudioElement._canPlaySrc = canPlaySrc;

}( Popcorn, window.document ));

(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 16,
  EMPTY_STRING = "",

  // Setup for SoundCloud API
  scReady = false,
  scLoaded = false,
  scCallbacks = [];

  function isSoundCloudReady() {
    // If the SoundCloud Widget API + JS SDK aren't loaded, do it now.
    if( !scLoaded ) {
      Popcorn.getScript( "//w.soundcloud.com/player/api.js", function() {
        Popcorn.getScript( "//connect.soundcloud.com/sdk.js", function() {
          scReady = true;

          // XXX: SoundCloud won't let us use real URLs with the API,
          // so we have to lookup the track URL, requiring authentication.
          SC.initialize({
            client_id: "PRaNFlda6Bhf5utPjUsptg"
          });

          var i = scCallbacks.length;
          while( i-- ) {
            scCallbacks[ i ]();
            delete scCallbacks[ i ];
          }
        });
      });
      scLoaded = true;
    }
    return scReady;
  }

  function addSoundCloudCallback( callback ) {
    scCallbacks.unshift( callback );
  }


  function HTMLSoundCloudAudioElement( id ) {

    // SoundCloud API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLSoundCloudAudioElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? Popcorn.dom.find( id ) : id,
      elem = document.createElement( "iframe" ),
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        // SC Volume values are 0-100, we remap to 0-1 in volume getter/setter
        volume: 100,
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : self._util.MIN_WIDTH,
        height: parent.height|0 ? parent.height : self._util.MIN_HEIGHT,
        error: null
      },
      playerReady = false,
      player,
      playerReadyCallbacks = [],
      timeUpdateInterval,
      currentTimeInterval,
      lastCurrentTime = 0;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLSoundCloudAudioElement::" );

    self.parentNode = parent;

    // Mark this as SoundCloud
    self._util.type = "SoundCloud";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    // SoundCloud's widget fires its READY event too early for the audio
    // to be used (i.e., the widget is setup, but not the audio decoder).
    // To deal with this we have to wait on loadProgress to fire with a
    // loadedProgress > 0.
    function onLoaded() {
      // Wire-up runtime listeners
      player.bind( SC.Widget.Events.LOAD_PROGRESS, function( data ) {
        onStateChange({
          type: "loadProgress",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.PLAY_PROGRESS, function( data ) {
        onStateChange({
          type: "playProgress",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.PLAY, function( data ) {
        onStateChange({
          type: "play"
        });
      });

      player.bind( SC.Widget.Events.PAUSE, function( data ) {
        onStateChange({
          type: "pause"
        });
      });

      player.bind( SC.Widget.Events.SEEK, function( data ) {
        onStateChange({
          type: "seek",
          // currentTime is in ms vs. s
          data: data.currentPosition / 1000
        });
      });

      player.bind( SC.Widget.Events.FINISH, function() {
        onStateChange({
          type: "finish"
        });
      });

      playerReady = true;
      player.getDuration( updateDuration );
    }

    // When the player widget is ready, kick-off a play/pause
    // in order to get the data loading.  We'll wait on loadedProgress.
    // It's possible for the loadProgress to take time after play(), so
    // we don't call pause() right away, but wait on loadedProgress to be 1
    // before we do.
    function onPlayerReady( data ) {
      player.bind( SC.Widget.Events.LOAD_PROGRESS, function( data ) {

        // If we're getting the HTML5 audio, loadedProgress will be 0 or 1.
        // If we're getting Flash, it will be 0 or > 0.  Prefer > 0 to make
        // both happy.
        if( data.loadedProgress > 0 ) {
          player.unbind( SC.Widget.Events.LOAD_PROGRESS );
          player.pause();
        }
      });

      player.bind( SC.Widget.Events.PLAY, function( data ) {
        player.unbind( SC.Widget.Events.PLAY );

        player.bind( SC.Widget.Events.PAUSE, function( data ) {
          player.unbind( SC.Widget.Events.PAUSE );

          // Play/Pause cycle is done, restore volume and continue loading.
          player.setVolume( 100 );
          onLoaded();
        });
      });

      // Turn down the volume and kick-off a play to force load
      player.setVolume( 0 );
      player.play();
    }

    function updateDuration( newDuration ) {
      // SoundCloud gives duration in ms vs. s
      newDuration = newDuration / 1000;

      var oldDuration = impl.duration;

      if( oldDuration !== newDuration ) {
        impl.duration = newDuration;
        self.dispatchEvent( "durationchange" );

        // Deal with first update of duration
        if( isNaN( oldDuration ) ) {
          impl.networkState = self.NETWORK_IDLE;
          impl.readyState = self.HAVE_METADATA;
          self.dispatchEvent( "loadedmetadata" );

          self.dispatchEvent( "loadeddata" );

          impl.readyState = self.HAVE_FUTURE_DATA;
          self.dispatchEvent( "canplay" );

          impl.readyState = self.HAVE_ENOUGH_DATA;
          self.dispatchEvent( "canplaythrough" );

          var i = playerReadyCallbacks.length;
          while( i-- ) {
            playerReadyCallbacks[ i ]();
            delete playerReadyCallbacks[ i ];
          }

          // Auto-start if necessary
          if( impl.paused && impl.autoplay ) {
            self.play();
          }
        }
      }
    }

    function getDuration() {
      if( !playerReady ) {
        // Queue a getDuration() call so we have correct duration info for loadedmetadata
        addPlayerReadyCallback( function() { getDuration(); } );
      }

      player.getDuration( updateDuration );
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.pause();

      player.unbind( SC.Widget.Events.READY );
      player.unbind( SC.Widget.Events.LOAD_PROGRESS );
      player.unbind( SC.Widget.Events.PLAY_PROGRESS );
      player.unbind( SC.Widget.Events.PLAY );
      player.unbind( SC.Widget.Events.PAUSE );
      player.unbind( SC.Widget.Events.SEEK );
      player.unbind( SC.Widget.Events.FINISH );

      parent.removeChild( elem );
      elem = document.createElement( "iframe" );
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }
      if( impl.ended ) {
        changeCurrentTime( 0 );
      }
      player.play();
    };

    function changeCurrentTime( aTime ) {
      impl.currentTime = aTime;

      // Convert to ms
      aTime = aTime * 1000;

      function seek() {
        onSeeking();
        player.seekTo( aTime );
        onSeeked();
      }

      if( !playerReady ) {
        addMediaReadyCallback( seek );
        return;
      }

      seek();
    }

    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      // XXX: make sure seeks don't hold us in the ended state
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }

      player.pause();
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onPlay() {
      if ( !currentTimeInterval ) {
        currentTimeInterval = setInterval( monitorCurrentTime,
                                           CURRENT_TIME_MONITOR_MS ) ;

        // Only 1 play when video.loop=true
        if ( impl.loop ) {
          self.dispatchEvent( "play" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );

      if( impl.paused ) {
        impl.paused = false;

        // Only 1 play when video.loop=true
        if ( !impl.loop ) {
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        // XXX: SoundCloud doesn't manage end/paused state well.  We have to
        // simulate a pause or we leave the player in a state where it can't
        // restart playing after ended.  Also, the onPause callback won't get
        // called when we do self.pause() here, so we manually set impl.paused
        // to get the state right.
        impl.ended = true;
        self.pause();
        onPause();
        self.dispatchEvent( "timeupdate" );
        self.dispatchEvent( "ended" );
      }
    }

    function onCurrentTime( currentTime ) {
      impl.currentTime = currentTime;

      if( currentTime !== lastCurrentTime ) {
        self.dispatchEvent( "timeupdate" );
      }

      lastCurrentTime = currentTime;
    }

    function onStateChange( event ) {
      switch ( event.type ) {
        case "loadProgress":
          self.dispatchEvent( "progress" );
          break;
        case "playProgress":
          onCurrentTime( event.data );
          break;
        case "play":
          onPlay();
          break;
        case "pause":
          onPause();
          break;
        case "finish":
          onEnded();
          break;
        case "seek":
          onCurrentTime( event.data );
          break;
      }
    }

    function monitorCurrentTime() {
      if ( impl.ended ) {
        return;
      }
      player.getPosition( function( currentTimeInMS ) {
        // Convert from ms to s
        onCurrentTime( currentTimeInMS / 1000 );
      });
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      // Make sure SoundCloud is ready, and if not, register a callback
      if( !isSoundCloudReady() ) {
        addSoundCloudCallback( function() { changeSrc( aSrc ); } );
        return;
      }

      playerReady = false;

      SC.get( "/resolve", { url: aSrc }, function( data ) {
        elem.id = Popcorn.guid( "soundcloud-" );
        elem.width = impl.width;
        elem.height = impl.height;
        elem.frameBorder = 0;
        elem.webkitAllowFullScreen = true;
        elem.mozAllowFullScreen = true;
        elem.allowFullScreen = true;

        // Apply the current controls state, since iframe wasn't ready yet.
        setControls( impl.controls );

        parent.appendChild( elem );

        elem.onload = function() {
          elem.onload = null;

          player = SC.Widget( elem );
          player.bind( SC.Widget.Events.READY, onPlayerReady );

          impl.networkState = self.NETWORK_LOADING;
          self.dispatchEvent( "loadstart" );
          self.dispatchEvent( "progress" );
        };
        elem.src = "https://w.soundcloud.com/player/?url=" + data.uri +
          "&show_artwork=false" +
          "&buying=false" +
          "&liking=false" +
          "&sharing=false" +
          "&download=false" +
          "&show_comments=false" +
          "&show_user=false";
      });
    }

    function setVolume( aValue ) {
      impl.volume = aValue;

      if( !playerReady ) {
        addPlayerReadyCallback( function() {
          setVolume( aValue );
        });
        return;
      }
      player.setVolume( aValue );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // If we're muted, the volume is cached on impl.muted.
      return impl.muted > 0 ? impl.muted : impl.volume;
    }

    function setMuted( aMute ) {
      if( !playerReady ) {
        impl.muted = aMute ? 1 : 0;
        addPlayerReadyCallback( function() {
          setMuted( aMute );
        });
        return;
      }

      // Move the existing volume onto muted to cache
      // until we unmute, and set the volume to 0.
      if( aMute ) {
        impl.muted = impl.volume;
        setVolume( 0 );
      } else {
        impl.muted = 0;
        setVolume( impl.muted );
      }
    }

    function getMuted() {
      return impl.muted > 0;
    }

    function setControls( controls ) {
      // Due to loading issues with hidden content, we have to be careful
      // about how we hide the player when controls=false.  Using opacity:0
      // will let the content load, but allow mouse events.  When it's totally
      // loaded we can visibility:hidden + position:absolute it.
      if ( playerReady ) {
        elem.style.position = "absolute";
        elem.style.visibility = controls ? "visible" : "hidden";
      } else {
        elem.style.opacity = controls ? "1" : "0";
        // Try to stop mouse events over the iframe while loading. This won't
        // work in current Opera or IE, but there's not much I can do
        elem.style.pointerEvents = controls ? "auto" : "none";
      }
      impl.controls = controls;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          elem.width = aValue;
          impl.width = elem.width;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          elem.height = aValue;
          impl.height = elem.height;
        }
      },

      currentTime: {
        get: function() {
          return impl.currentTime;
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return impl.duration;
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          // Remap from HTML5's 0-1 to SoundCloud's 0-100 range
          var volume = getVolume();
          return volume / 100;
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          // Remap from HTML5's 0-1 to SoundCloud's 0-100 range
          aValue = aValue * 100;
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      },

      // Similar to HTML5 Audio Elements, with SoundCloud you can
      // hide all visible UI for the player by setting controls=false.
      controls: {
        get: function() {
          return impl.controls;
        },
        set: function( aValue ) {
          setControls( !!aValue );
        }
      }
    });
  }

  HTMLSoundCloudAudioElement.prototype = new Popcorn._MediaElementProto();

  // Helper for identifying URLs we know how to play.
  HTMLSoundCloudAudioElement.prototype._canPlaySrc = function( url ) {
    return (/(?:https?:\/\/www\.|https?:\/\/|www\.|\.|^)(soundcloud)/).test( url ) ?
      "probably" : EMPTY_STRING;
  };

  // We'll attempt to support a mime type of audio/x-soundcloud
  HTMLSoundCloudAudioElement.prototype.canPlayType = function( type ) {
    return type === "audio/x-soundcloud" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLSoundCloudAudioElement = function( id ) {
    return new HTMLSoundCloudAudioElement( id );
  };
  Popcorn.HTMLSoundCloudAudioElement._canPlaySrc = HTMLSoundCloudAudioElement.prototype._canPlaySrc;

}( Popcorn, window, document ));

(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 10,
  EMPTY_STRING = "",

  // Example: http://www.youtube.com/watch?v=12345678901
  regexYouTube = /^.*(?:\/|v=)(.{11})/,

  ABS = Math.abs,

  // Setup for YouTube API
  ytReady = false,
  ytLoaded = false,
  ytCallbacks = [];

  function isYouTubeReady() {
    // If the YouTube iframe API isn't injected, to it now.
    if( !ytLoaded ) {
      var tag = document.createElement( "script" );
      var protocol = window.location.protocol === "file:" ? "http:" : "";

      tag.src = protocol + "//www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName( "script" )[ 0 ];
      firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
      ytLoaded = true;
    }
    return ytReady;
  }

  function addYouTubeCallback( callback ) {
    ytCallbacks.unshift( callback );
  }

  // An existing YouTube references can break us.
  // Remove it and use the one we can trust.
  if ( window.YT ) {
    window.quarantineYT = window.YT;
    window.YT = null;
  }

  window.onYouTubeIframeAPIReady = function() {
    ytReady = true;
    var i = ytCallbacks.length;
    while( i-- ) {
      ytCallbacks[ i ]();
      delete ytCallbacks[ i ];
    }
  };

  function HTMLYouTubeVideoElement( id ) {

    // YouTube iframe API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLYouTubeVideoElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? document.querySelector( id ) : id,
      elem = document.createElement( "div" ),
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: false,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        error: null
      },
      playerReady = false,
      catchRoguePauseEvent = false,
      mediaReady = false,
      loopedPlay = false,
      player,
      playerPaused = true,
      mediaReadyCallbacks = [],
      currentTimeInterval,
      timeUpdateInterval,
      firstPlay = true;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLYouTubeVideoElement::" );

    self.parentNode = parent;

    // Mark this as YouTube
    self._util.type = "YouTube";

    function addMediaReadyCallback( callback ) {
      mediaReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( event ) {
      playerReady = true;
      // XXX: this should really live in cued below, but doesn't work.

      // Browsers using flash will have the pause() call take too long and cause some
      // sound to leak out. Muting before to prevent this.
      player.mute();

      // force an initial play on the video, to remove autostart on initial seekTo.
      player.playVideo();
    }

    function getDuration() {
      if( !mediaReady ) {
        // loadedmetadata properly sets the duration, so nothing to do here yet.
        return impl.duration;
      }

      var oldDuration = impl.duration,
          newDuration = player.getDuration();

      // Deal with duration=0 from YouTube
      if( newDuration ) {
        if( oldDuration !== newDuration ) {
          impl.duration = newDuration;
          self.dispatchEvent( "durationchange" );
        }
      } else {
        setTimeout( getDuration, 50 );
      }

      return newDuration;
    }

    function onPlayerError(event) {
      // There's no perfect mapping to HTML5 errors from YouTube errors.
      var err = { name: "MediaError" };

      switch( event.data ) {

        // invalid parameter
        case 2:
          err.message = "Invalid video parameter.";
          err.code = MediaError.MEDIA_ERR_ABORTED;
          break;

        // HTML5 Error
        case 5:
          err.message = "The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.";
          err.code = MediaError.MEDIA_ERR_DECODE;

        // requested video not found
        case 100:
          err.message = "Video not found.";
          err.code = MediaError.MEDIA_ERR_NETWORK;
          break;

        // video can't be embedded by request of owner
        case 101:
        case 150:
          err.message = "Video not usable.";
          err.code = MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
          break;

        default:
          err.message = "Unknown error.";
          err.code = 5;
      }

      impl.error = err;
      self.dispatchEvent( "error" );
    }

    function onPlayerStateChange( event ) {
      switch( event.data ) {

        // unstarted
        case -1:
          break;

        // ended
        case YT.PlayerState.ENDED:
          onEnded();
          // Seek back to the start of the video to reset the player,
          // otherwise the player can become locked out.
          // I do not see this happen all the time or on all systems.
          player.seekTo( 0 );
          break;

        // playing
        case YT.PlayerState.PLAYING:
          if( firstPlay ) {
            // fake ready event
            firstPlay = false;

            // Set initial paused state
            if( impl.autoplay || !impl.paused ) {
              impl.paused = false;
              addMediaReadyCallback( function() { onPlay(); } );
            } else {
              // if a pause happens while seeking, ensure we catch it.
              // in youtube seeks fire pause events, and we don't want to listen to that.
              // except for the case of an actual pause.
              catchRoguePauseEvent = false;
              player.pauseVideo();
            }

            // Ensure video will now be unmuted when playing due to the mute on initial load.
            if( !impl.muted ) {
              player.unMute();
            }

            impl.duration = player.getDuration();
            impl.readyState = self.HAVE_METADATA;
            self.dispatchEvent( "loadedmetadata" );
            currentTimeInterval = setInterval( monitorCurrentTime,
                                               CURRENT_TIME_MONITOR_MS );
            
            self.dispatchEvent( "loadeddata" );

            impl.readyState = self.HAVE_FUTURE_DATA;
            self.dispatchEvent( "canplay" );

            mediaReady = true;
            var i = mediaReadyCallbacks.length;
            while( i-- ) {
              mediaReadyCallbacks[ i ]();
              delete mediaReadyCallbacks[ i ];
            }

            // We can't easily determine canplaythrough, but will send anyway.
            impl.readyState = self.HAVE_ENOUGH_DATA;
            self.dispatchEvent( "canplaythrough" );
          } else {
            onPlay();
          }
          break;

        // paused
        case YT.PlayerState.PAUSED:
          // a seekTo call fires a pause event, which we don't want at this point.
          // as long as a seekTo continues to do this, we can safly toggle this state.
          if ( catchRoguePauseEvent ) {
            catchRoguePauseEvent = false;
            break;
          }
          onPause();
          break;

        // buffering
        case YT.PlayerState.BUFFERING:
          impl.networkState = self.NETWORK_LOADING;
          self.dispatchEvent( "waiting" );
          break;

        // video cued
        case YT.PlayerState.CUED:
          // XXX: cued doesn't seem to fire reliably, bug in youtube api?
          break;
      }
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.stopVideo();
      player.clearVideo();

      parent.removeChild( elem );
      elem = document.createElement( "div" );
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      // Make sure YouTube is ready, and if not, register a callback
      if( !isYouTubeReady() ) {
        addYouTubeCallback( function() { changeSrc( aSrc ); } );
        return;
      }

      if( playerReady ) {
        destroyPlayer();
      }

      parent.appendChild( elem );

      // Use any player vars passed on the URL
      var playerVars = self._util.parseUri( aSrc ).queryKey;

      // Remove the video id, since we don't want to pass it
      delete playerVars.v;

      // Sync autoplay, but manage internally
      impl.autoplay = playerVars.autoplay === "1" || impl.autoplay;
      delete playerVars.autoplay;

      // Sync loop, but manage internally
      impl.loop = playerVars.loop === "1" || impl.loop;
      delete playerVars.loop;

      // Don't show related videos when ending
      playerVars.rel = playerVars.rel || 0;

      // Don't show YouTube's branding
      playerVars.modestbranding = playerVars.modestbranding || 1;

      // Don't show annotations by default
      playerVars.iv_load_policy = playerVars.iv_load_policy || 3;

      // Don't show video info before playing
      playerVars.showinfo = playerVars.showinfo || 0;

      // Specify our domain as origin for iframe security
      var domain = window.location.protocol === "file:" ? "*" :
        window.location.protocol + "//" + window.location.host;
      playerVars.origin = playerVars.origin || domain;

      // Show/hide controls. Sync with impl.controls and prefer URL value.
      playerVars.controls = playerVars.controls || impl.controls ? 2 : 0;
      impl.controls = playerVars.controls;

      // Set wmode to transparent to show video overlays
      playerVars.wmode = playerVars.wmode || "transparent";

      // Get video ID out of youtube url
      aSrc = regexYouTube.exec( aSrc )[ 1 ];

      player = new YT.Player( elem, {
        width: "100%",
        height: "100%",
        wmode: playerVars.wmode,
        videoId: aSrc,
        playerVars: playerVars,
        events: {
          'onReady': onPlayerReady,
          'onError': onPlayerError,
          'onStateChange': onPlayerStateChange
        }
      });

      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );

      // Queue a get duration call so we'll have duration info
      // and can dispatch durationchange.
      getDuration();
    }

    function monitorCurrentTime() {
      var playerTime = player.getCurrentTime();
      if ( !impl.seeking ) {
        impl.currentTime = playerTime;
        if ( ABS( impl.currentTime - playerTime ) > CURRENT_TIME_MONITOR_MS ) {
          onSeeking();
          onSeeked();
        }
      } else if ( ABS( playerTime - impl.currentTime ) < 1 ) {
        onSeeked();
      }
    }

    function getCurrentTime() {
      return impl.currentTime;
    }

    function changeCurrentTime( aTime ) {
      impl.currentTime = aTime;
      if( !mediaReady ) {
        addMediaReadyCallback( function() {

          onSeeking();
          player.seekTo( aTime );
        });
        return;
      }

      onSeeking();
      player.seekTo( aTime );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onSeeking() {
      // a seek in youtube fires a paused event.
      // we don't want to listen for this, so this state catches the event.
      catchRoguePauseEvent = true;
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    function onPlay() {

      if( impl.ended ) {
        changeCurrentTime( 0 );
        impl.ended = false;
      }
      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );
      impl.paused = false;
      if( playerPaused ) {
        playerPaused = false;

        // Only 1 play when video.loop=true
        if ( ( impl.loop && !loopedPlay ) || !impl.loop ) {
          loopedPlay = true;
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    self.play = function() {
      impl.paused = false;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.play(); } );
        return;
      }
      player.playVideo();
    };

    function onPause() {
      impl.paused = true;
      if ( !playerPaused ) {
        playerPaused = true;
        clearInterval( timeUpdateInterval );
        self.dispatchEvent( "pause" );
      }
    }

    self.pause = function() {
      impl.paused = true;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { self.pause(); } );
        return;
      }
      // if a pause happens while seeking, ensure we catch it.
      // in youtube seeks fire pause events, and we don't want to listen to that.
      // except for the case of an actual pause.
      catchRoguePauseEvent = false;
      player.pauseVideo();
    };

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        onPause();
        self.dispatchEvent( "timeupdate" );
        self.dispatchEvent( "ended" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;
      if( !mediaReady ) {
        addMediaReadyCallback( function() {
          setVolume( impl.volume );
        });
        return;
      }
      player.setVolume( impl.volume * 100 );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // YouTube has getVolume(), but for sync access we use impl.volume
      return impl.volume;
    }

    function setMuted( aValue ) {
      impl.muted = aValue;
      if( !mediaReady ) {
        addMediaReadyCallback( function() { setMuted( impl.muted ); } );
        return;
      }
      player[ aValue ? "mute" : "unMute" ]();
      self.dispatchEvent( "volumechange" );
    }

    function getMuted() {
      // YouTube has isMuted(), but for sync access we use impl.muted
      return impl.muted;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return self.parentNode.offsetWidth;
        }
      },

      height: {
        get: function() {
          return self.parentNode.offsetHeight;
        }
      },

      currentTime: {
        get: function() {
          return getCurrentTime();
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return getDuration();
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          // Remap from HTML5's 0-1 to YouTube's 0-100 range
          var volume = getVolume();
          return volume / 100;
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLYouTubeVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLYouTubeVideoElement.prototype.constructor = HTMLYouTubeVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLYouTubeVideoElement.prototype._canPlaySrc = function( url ) {
    return (/(?:http:\/\/www\.|http:\/\/|www\.|\.|^)(youtu).*(?:\/|v=)(.{11})/).test( url ) ?
      "probably" :
      EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-youtube
  HTMLYouTubeVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-youtube" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLYouTubeVideoElement = function( id ) {
    return new HTMLYouTubeVideoElement( id );
  };
  Popcorn.HTMLYouTubeVideoElement._canPlaySrc = HTMLYouTubeVideoElement.prototype._canPlaySrc;

}( Popcorn, window, document ));

(function( Popcorn, window, document ) {

  var

  CURRENT_TIME_MONITOR_MS = 16,
  EMPTY_STRING = "",
  VIMEO_HOST = window.location.protocol + "//player.vimeo.com";

  // Utility wrapper around postMessage interface
  function VimeoPlayer( vimeoIFrame ) {
    var self = this,
      url = vimeoIFrame.src.split('?')[0],
      muted = 0;

    if( url.substr(0, 2) === '//' ) {
      url = window.location.protocol + url;
    }

    function sendMessage( method, params ) {
      var data = JSON.stringify({
        method: method,
        value: params
      });

      // The iframe has been destroyed, it just doesn't know it
      if ( !vimeoIFrame.contentWindow ) {
        return;
      }

      vimeoIFrame.contentWindow.postMessage( data, url );
    }

    var methods = ( "play pause paused seekTo unload getCurrentTime getDuration " +
                    "getVideoEmbedCode getVideoHeight getVideoWidth getVideoUrl " +
                    "getColor setColor setLoop getVolume setVolume addEventListener" ).split(" ");
    methods.forEach( function( method ) {
      // All current methods take 0 or 1 args, always send arg0
      self[ method ] = function( arg0 ) {
        sendMessage( method, arg0 );
      };
    });
  }


  function HTMLVimeoVideoElement( id ) {

    // Vimeo iframe API requires postMessage
    if( !window.postMessage ) {
      throw "ERROR: HTMLVimeoVideoElement requires window.postMessage";
    }

    var self = this,
      parent = typeof id === "string" ? Popcorn.dom.find( id ) : id,
      elem = document.createElement( "iframe" ),
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        // Vimeo seems to use .77 as default
        volume: 1,
        // Vimeo has no concept of muted, store volume values
        // such that muted===0 is unmuted, and muted>0 is muted.
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        error: null
      },
      playerReady = false,
      playerUID = Popcorn.guid(),
      player,
      playerReadyCallbacks = [],
      timeUpdateInterval,
      currentTimeInterval,
      lastCurrentTime = 0;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLVimeoVideoElement::" );

    self.parentNode = parent;

    // Mark type as Vimeo
    self._util.type = "Vimeo";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( event ) {
      player.addEventListener( 'loadProgress' );
      player.addEventListener( 'playProgress' );
      player.addEventListener( 'play' );
      player.addEventListener( 'pause' );
      player.addEventListener( 'finish' );
      player.addEventListener( 'seek' );

      player.getDuration();

      impl.networkState = self.NETWORK_LOADING;
      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
    }

    function updateDuration( newDuration ) {
      var oldDuration = impl.duration;

      if( oldDuration !== newDuration ) {
        impl.duration = newDuration;
        self.dispatchEvent( "durationchange" );

        // Deal with first update of duration
        if( isNaN( oldDuration ) ) {
          impl.networkState = self.NETWORK_IDLE;
          impl.readyState = self.HAVE_METADATA;
          self.dispatchEvent( "loadedmetadata" );

          self.dispatchEvent( "loadeddata" );

          impl.readyState = self.HAVE_FUTURE_DATA;
          self.dispatchEvent( "canplay" );

          impl.readyState = self.HAVE_ENOUGH_DATA;
          self.dispatchEvent( "canplaythrough" );
          // Auto-start if necessary
          if( impl.autoplay ) {
            self.play();
          }

          var i = playerReadyCallbacks.length;
          while( i-- ) {
            playerReadyCallbacks[ i ]();
            delete playerReadyCallbacks[ i ];
          }
        }
      }
    }

    function getDuration() {
      if( !playerReady ) {
        // Queue a getDuration() call so we have correct duration info for loadedmetadata
        addPlayerReadyCallback( function() { getDuration(); } );
      }

      player.getDuration();
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      clearInterval( currentTimeInterval );
      player.pause();

      window.removeEventListener( 'message', onStateChange, false );
      parent.removeChild( elem );
      elem = document.createElement( "iframe" );
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }

      player.play();
    };

    function changeCurrentTime( aTime ) {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      onSeeking();
      player.seekTo( aTime );
    }

    function onSeeking() {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }

      player.pause();
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onPlay() {
      if( impl.ended ) {
        changeCurrentTime( 0 );
      }

      if ( !currentTimeInterval ) {
        currentTimeInterval = setInterval( monitorCurrentTime,
                                           CURRENT_TIME_MONITOR_MS ) ;

        // Only 1 play when video.loop=true
        if ( impl.loop ) {
          self.dispatchEvent( "play" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );

      if( impl.paused ) {
        impl.paused = false;

        // Only 1 play when video.loop=true
        if ( !impl.loop ) {
          self.dispatchEvent( "play" );
        }
        self.dispatchEvent( "playing" );
      }
    }

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        self.dispatchEvent( "ended" );
      }
    }

    function onCurrentTime( aTime ) {
      var currentTime = impl.currentTime = aTime;

      if( currentTime !== lastCurrentTime ) {
        self.dispatchEvent( "timeupdate" );
      }

      lastCurrentTime = impl.currentTime;
    }

    // We deal with the startup load messages differently than
    // we will once the player is fully ready and loaded.
    // When the player is "ready" it is playable, but not
    // yet seekable.  We need to force a play() to get data
    // to download (mimic preload=auto), or seeks will fail.
    function startupMessage( event ) {
      if( event.origin !== VIMEO_HOST ) {
        return;
      }

      var data;
      try {
        data = JSON.parse( event.data );
      } catch ( ex ) {
        console.warn( ex );
      }

      if ( data.player_id != playerUID ) {
        return;
      }

      switch ( data.event ) {
        case "ready":
          player = new VimeoPlayer( elem );
          player.addEventListener( "loadProgress" );
          player.addEventListener( "pause" );
          player.setVolume( 0 );
          player.play();
          break;
        case "loadProgress":
          var duration = parseFloat( data.data.duration );
          if( duration > 0 && !playerReady ) {
            playerReady = true;
            player.pause();
          }
          break;
        case "pause":
          player.setVolume( 1 );
          // Switch message pump to use run-time message callback vs. startup
          window.removeEventListener( "message", startupMessage, false );
          window.addEventListener( "message", onStateChange, false );
          onPlayerReady();
          break;
      }
    }

    function onStateChange( event ) {
      if( event.origin !== VIMEO_HOST ) {
        return;
      }

      var data;
      try {
        data = JSON.parse( event.data );
      } catch ( ex ) {
        console.warn( ex );
      }

      if ( data.player_id != playerUID ) {
        return;
      }

      // Methods
      switch ( data.method ) {
        case "getCurrentTime":
          onCurrentTime( parseFloat( data.value ) );
          break;
        case "getDuration":
          updateDuration( parseFloat( data.value ) );
          break;
        case "getVolume":
          onVolume( parseFloat( data.value ) );
          break;
      }

      // Events
      switch ( data.event ) {
        case "loadProgress":
          self.dispatchEvent( "progress" );
          updateDuration( parseFloat( data.data.duration ) );
          break;
        case "playProgress":
          onCurrentTime( parseFloat( data.data.seconds ) );
          break;
        case "play":
          onPlay();
          break;
        case "pause":
          onPause();
          break;
        case "finish":
          onEnded();
          break;
        case "seek":
          onCurrentTime( parseFloat( data.data.seconds ) );
          onSeeked();
          // Deal with Vimeo playing when paused after a seek
          if( impl.paused ) {
            self.pause();
          }
          break;
      }
    }

    function monitorCurrentTime() {
      player.getCurrentTime();
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      playerReady = false;

      var src = self._util.parseUri( aSrc ),
        queryKey = src.queryKey,
        key,
        optionsArray = [
          // Vimeo API options first
          "api=1",
          "player_id=" + playerUID,
          // Turn off as much of the metadata/branding as possible
          "title=0",
          "byline=0",
          "portrait=0"
        ];

      // Sync loop and autoplay based on URL params, and delete.
      // We'll manage both internally.
      impl.loop = queryKey.loop === "1" || impl.loop;
      delete queryKey.loop;
      impl.autoplay = queryKey.autoplay === "1" || impl.autoplay;
      delete queryKey.autoplay;

      // Create the base vimeo player string. It will always have query string options
      src = VIMEO_HOST + '/video/' + ( /\d+$/ ).exec( src.path ) + "?";
      for( key in queryKey ) {
        if ( queryKey.hasOwnProperty( key ) ) {
          optionsArray.push( encodeURIComponent( key ) + "=" +
                             encodeURIComponent( queryKey[ key ] ) );
        }
      }
      src += optionsArray.join( "&" );

      elem.id = playerUID;
      elem.style.width = "100%";
      elem.style.height = "100%";
      elem.frameBorder = 0;
      elem.webkitAllowFullScreen = true;
      elem.mozAllowFullScreen = true;
      elem.allowFullScreen = true;
      parent.appendChild( elem );
      elem.src = src;

      window.addEventListener( "message", startupMessage, false );
    }

    function onVolume( aValue ) {
      if( impl.volume !== aValue ) {
        impl.volume = aValue;
        self.dispatchEvent( "volumechange" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;

      if( !playerReady ) {
        addPlayerReadyCallback( function() {
          setVolume( aValue );
        });
        return;
      }
      player.setVolume( aValue );
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      // If we're muted, the volume is cached on impl.muted.
      return impl.muted > 0 ? impl.muted : impl.volume;
    }

    function setMuted( aMute ) {
      if( !playerReady ) {
        impl.muted = aMute ? 1 : 0;
        addPlayerReadyCallback( function() {
          setMuted( aMute );
        });
        return;
      }

      // Move the existing volume onto muted to cache
      // until we unmute, and set the volume to 0.
      if( aMute ) {
        impl.muted = impl.volume;
        setVolume( 0 );
      } else {
        impl.muted = 0;
        setVolume( impl.muted );
      }
    }

    function getMuted() {
      return impl.muted > 0;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return self.parentNode.offsetWidth;
        }
      },

      height: {
        get: function() {
          return self.parentNode.offsetHeight;
        }
      },

      currentTime: {
        get: function() {
          return impl.currentTime;
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return impl.duration;
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          return getVolume();
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }

          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLVimeoVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLVimeoVideoElement.prototype.constructor = HTMLVimeoVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLVimeoVideoElement.prototype._canPlaySrc = function( url ) {
    return ( (/player.vimeo.com\/video\/\d+/).test( url ) ||
             (/vimeo.com\/\d+/).test( url ) ) ? "probably" : EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-vimeo
  HTMLVimeoVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-vimeo" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLVimeoVideoElement = function( id ) {
    return new HTMLVimeoVideoElement( id );
  };
  Popcorn.HTMLVimeoVideoElement._canPlaySrc = HTMLVimeoVideoElement.prototype._canPlaySrc;

}( Popcorn, window, document ));

/**
 * Simplified Media Fragments (http://www.w3.org/TR/media-frags/) Null player.
 * Valid URIs include:
 *
 *   #t=,100   -- a null video of 100s
 *   #t=5,100  -- a null video of 100s, which starts at 5s (i.e., 95s duration)
 *
 */
(function( Popcorn, document ) {

  var

  // How often (ms) to update the video's current time,
  // and by how much (s).
  DEFAULT_UPDATE_RESOLUTION_MS = 16,
  DEFAULT_UPDATE_RESOLUTION_S = DEFAULT_UPDATE_RESOLUTION_MS / 1000,

  EMPTY_STRING = "",

  // We currently support simple temporal fragments:
  //   #t=,100   -- a null video of 100s (starts at 0s)
  //   #t=5,100  -- a null video of 100s, which starts at 5s (i.e., 95s duration)
  temporalRegex = /#t=(\d+)?,?(\d+)?/;

  function NullPlayer( options ) {
    this.startTime = 0;
    this.currentTime = options.currentTime || 0;
    this.duration = options.duration || NaN;
    this.playInterval = null;
    this.paused = true;
    this.ended = options.endedCallback || Popcorn.nop;
  }

  function nullPlay( video ) {
    video.currentTime += ( Date.now() - video.startTime ) / 1000;
    video.startTime = Date.now();
    if( video.currentTime >= video.duration ) {
      video.currentTime = video.duration;
      video.pause();
      video.ended();
    }
  }

  NullPlayer.prototype = {

    play: function() {
      var video = this;
      if ( this.paused ) {
        this.paused = false;
        this.startTime = Date.now();
        this.playInterval = setInterval( function() { nullPlay( video ); },
                                         DEFAULT_UPDATE_RESOLUTION_MS );
      }
    },

    pause: function() {
      if ( !this.paused ) {
        this.paused = true;
        clearInterval( this.playInterval );
      }
    },

    seekTo: function( aTime ) {
      aTime = aTime < 0 ? 0 : aTime;
      aTime = aTime > this.duration ? this.duration : aTime;
      this.currentTime = aTime;
    }

  };

  function HTMLNullVideoElement( id ) {

    var self = this,
      parent = typeof id === "string" ? document.querySelector( id ) : id,
      elem = document.createElement( "div" ),
      playerReady = false,
      player,
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: EMPTY_STRING,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: false,
        width: parent.width|0   ? parent.width  : self._util.MIN_WIDTH,
        height: parent.height|0 ? parent.height : self._util.MIN_HEIGHT,
        seeking: false,
        ended: false,
        paused: 1, // 1 vs. true to differentiate first time access
        error: null
      },
      playerReadyCallbacks = [],
      timeUpdateInterval;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLNullVideoElement::" );

    // Attach parentNode
    self.parentNode = parent;

    // Mark type as NullVideo
    self._util.type = "NullVideo";

    function addPlayerReadyCallback( callback ) {
      playerReadyCallbacks.unshift( callback );
    }

    function onPlayerReady( ) {
      playerReady = true;

      impl.networkState = self.NETWORK_IDLE;
      impl.readyState = self.HAVE_METADATA;
      self.dispatchEvent( "loadedmetadata" );

      self.dispatchEvent( "loadeddata" );

      impl.readyState = self.HAVE_FUTURE_DATA;
      self.dispatchEvent( "canplay" );

      impl.readyState = self.HAVE_ENOUGH_DATA;
      self.dispatchEvent( "canplaythrough" );

      var i = playerReadyCallbacks.length;
      while( i-- ) {
        playerReadyCallbacks[ i ]();
        delete playerReadyCallbacks[ i ];
      }

      // Auto-start if necessary
      if( impl.autoplay ) {
        self.play();
      }
    }

    function getDuration() {
      return player ? player.duration : NaN;
    }

    function destroyPlayer() {
      if( !( playerReady && player ) ) {
        return;
      }
      player.pause();
      player = null;
      parent.removeChild( elem );
      elem = document.createElement( "div" );
    }

    function changeSrc( aSrc ) {
      if( !self._canPlaySrc( aSrc ) ) {
        impl.error = {
          name: "MediaError",
          message: "Media Source Not Supported",
          code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        self.dispatchEvent( "error" );
        return;
      }

      impl.src = aSrc;

      if( playerReady ) {
        destroyPlayer();
      }

      elem.width = impl.width;
      elem.height = impl.height;
      parent.appendChild( elem );

      // Parse out the start and duration, if specified
      var fragments = temporalRegex.exec( aSrc ),
          start = fragments[ 1 ],
          duration = fragments [ 2 ];

      player = new NullPlayer({
        currentTime: start,
        duration: duration,
        endedCallback: onEnded
      });

      self.dispatchEvent( "loadstart" );
      self.dispatchEvent( "progress" );
      self.dispatchEvent( "durationchange" );
      onPlayerReady();
    }

    function getCurrentTime() {
      if( !playerReady ) {
        return 0;
      }

      return player.currentTime;
    }

    function changeCurrentTime( aTime ) {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { changeCurrentTime( aTime ); } );
        return;
      }

      onSeeking();
      player.seekTo( aTime );
      onSeeked();
    }

    function onTimeUpdate() {
      self.dispatchEvent( "timeupdate" );
    }

    function onSeeking( target ) {
      impl.seeking = true;
      self.dispatchEvent( "seeking" );
    }

    function onSeeked() {
      impl.ended = false;
      impl.seeking = false;
      self.dispatchEvent( "timeupdate" );
      self.dispatchEvent( "seeked" );
      self.dispatchEvent( "canplay" );
      self.dispatchEvent( "canplaythrough" );
    }

    function onPlay() {
      // Deal with first time play vs. subsequent.
      if( impl.paused === 1 ) {
        impl.paused = false;
        self.dispatchEvent( "play" );
        self.dispatchEvent( "playing" );
      } else {
        if( impl.ended ) {
          changeCurrentTime( 0 );
          impl.ended = false;
        }

        if ( impl.paused ) {
          impl.paused = false;
          if ( !impl.loop ) {
            self.dispatchEvent( "play" );
          }
          self.dispatchEvent( "playing" );
        }
      }

      timeUpdateInterval = setInterval( onTimeUpdate,
                                        self._util.TIMEUPDATE_MS );
    }

    self.play = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.play(); } );
        return;
      }
      player.play();
      if ( impl.paused ) {
        onPlay();
      }
    };

    function onPause() {
      impl.paused = true;
      clearInterval( timeUpdateInterval );
      self.dispatchEvent( "pause" );
    }

    self.pause = function() {
      if( !playerReady ) {
        addPlayerReadyCallback( function() { self.pause(); } );
        return;
      }
      player.pause();
      if ( !impl.paused ) {
        onPause();
      }
    };

    function onEnded() {
      if( impl.loop ) {
        changeCurrentTime( 0 );
        self.play();
      } else {
        impl.ended = true;
        onPause();
        self.dispatchEvent( "timeupdate" );
        self.dispatchEvent( "ended" );
      }
    }

    function setVolume( aValue ) {
      impl.volume = aValue;
      self.dispatchEvent( "volumechange" );
    }

    function getVolume() {
      return impl.volume;
    }

    function setMuted( aValue ) {
      impl.muted = aValue;
      self.dispatchEvent( "volumechange" );
    }

    function getMuted() {
      return impl.muted;
    }

    Object.defineProperties( self, {

      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },

      autoplay: {
        get: function() {
          return impl.autoplay;
        },
        set: function( aValue ) {
          impl.autoplay = self._util.isAttributeSet( aValue );
        }
      },

      loop: {
        get: function() {
          return impl.loop;
        },
        set: function( aValue ) {
          impl.loop = self._util.isAttributeSet( aValue );
        }
      },

      width: {
        get: function() {
          return elem.width;
        },
        set: function( aValue ) {
          elem.width = aValue;
          impl.width = elem.width;
        }
      },

      height: {
        get: function() {
          return elem.height;
        },
        set: function( aValue ) {
          elem.height = aValue;
          impl.height = elem.height;
        }
      },

      currentTime: {
        get: function() {
          return getCurrentTime();
        },
        set: function( aValue ) {
          changeCurrentTime( aValue );
        }
      },

      duration: {
        get: function() {
          return getDuration();
        }
      },

      ended: {
        get: function() {
          return impl.ended;
        }
      },

      paused: {
        get: function() {
          return impl.paused;
        }
      },

      seeking: {
        get: function() {
          return impl.seeking;
        }
      },

      readyState: {
        get: function() {
          return impl.readyState;
        }
      },

      networkState: {
        get: function() {
          return impl.networkState;
        }
      },

      volume: {
        get: function() {
          return getVolume();
        },
        set: function( aValue ) {
          if( aValue < 0 || aValue > 1 ) {
            throw "Volume value must be between 0.0 and 1.0";
          }
          setVolume( aValue );
        }
      },

      muted: {
        get: function() {
          return getMuted();
        },
        set: function( aValue ) {
          setMuted( self._util.isAttributeSet( aValue ) );
        }
      },

      error: {
        get: function() {
          return impl.error;
        }
      }
    });
  }

  HTMLNullVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLNullVideoElement.prototype.constructor = HTMLNullVideoElement;

  // Helper for identifying URLs we know how to play.
  HTMLNullVideoElement.prototype._canPlaySrc = function( url ) {
    return ( /#t=\d*,?\d+?/ ).test( url ) ?
      "probably" :
      EMPTY_STRING;
  };

  // We'll attempt to support a mime type of video/x-nullvideo
  HTMLNullVideoElement.prototype.canPlayType = function( type ) {
    return type === "video/x-nullvideo" ? "probably" : EMPTY_STRING;
  };

  Popcorn.HTMLNullVideoElement = function( id ) {
    return new HTMLNullVideoElement( id );
  };
  Popcorn.HTMLNullVideoElement._canPlaySrc = HTMLNullVideoElement.prototype._canPlaySrc;

}( Popcorn, document ));

(function( Popcorn ) {

  // combines calls of two function calls into one
  var combineFn = function( first, second ) {

    first = first || Popcorn.nop;
    second = second || Popcorn.nop;

    return function() {

      first.apply( this, arguments );
      second.apply( this, arguments );
    };
  };

  //  ID string matching
  var rIdExp  = /^(#([\w\-\_\.]+))$/;

  Popcorn.player = function( name, player ) {

    // return early if a player already exists under this name
    if ( Popcorn[ name ] ) {

      return;
    }

    player = player || {};

    var playerFn = function( target, src, options ) {

      options = options || {};

      // List of events
      var date = new Date() / 1000,
          baselineTime = date,
          currentTime = 0,
          readyState = 0,
          volume = 1,
          muted = false,
          events = {},

          // The container div of the resource
          container = typeof target === "string" ? Popcorn.dom.find( target ) : target,
          basePlayer = {},
          timeout,
          popcorn;

      if ( !Object.prototype.__defineGetter__ ) {

        basePlayer = container || document.createElement( "div" );
      }

      // copies a div into the media object
      for( var val in container ) {

        // don't copy properties if using container as baseplayer
        if ( val in basePlayer ) {

          continue;
        }

        if ( typeof container[ val ] === "object" ) {

          basePlayer[ val ] = container[ val ];
        } else if ( typeof container[ val ] === "function" ) {

          basePlayer[ val ] = (function( value ) {

            // this is a stupid ugly kludgy hack in honour of Safari
            // in Safari a NodeList is a function, not an object
            if ( "length" in container[ value ] && !container[ value ].call ) {

              return container[ value ];
            } else {

              return function() {

                return container[ value ].apply( container, arguments );
              };
            }
          }( val ));
        } else {

          Popcorn.player.defineProperty( basePlayer, val, {
            get: (function( value ) {

              return function() {

                return container[ value ];
              };
            }( val )),
            set: Popcorn.nop,
            configurable: true
          });
        }
      }

      var timeupdate = function() {

        date = new Date() / 1000;

        if ( !basePlayer.paused ) {

          basePlayer.currentTime = basePlayer.currentTime + ( date - baselineTime );
          basePlayer.dispatchEvent( "timeupdate" );
          timeout = setTimeout( timeupdate, 10 );
        }

        baselineTime = date;
      };

      basePlayer.play = function() {

        this.paused = false;

        if ( basePlayer.readyState >= 4 ) {

          baselineTime = new Date() / 1000;
          basePlayer.dispatchEvent( "play" );
          timeupdate();
        }
      };

      basePlayer.pause = function() {

        this.paused = true;
        basePlayer.dispatchEvent( "pause" );
      };

      Popcorn.player.defineProperty( basePlayer, "currentTime", {
        get: function() {

          return currentTime;
        },
        set: function( val ) {

          // make sure val is a number
          currentTime = +val;
          basePlayer.dispatchEvent( "timeupdate" );

          return currentTime;
        },
        configurable: true
      });

      Popcorn.player.defineProperty( basePlayer, "volume", {
        get: function() {

          return volume;
        },
        set: function( val ) {

          // make sure val is a number
          volume = +val;
          basePlayer.dispatchEvent( "volumechange" );
          return volume;
        },
        configurable: true
      });

      Popcorn.player.defineProperty( basePlayer, "muted", {
        get: function() {

          return muted;
        },
        set: function( val ) {

          // make sure val is a number
          muted = +val;
          basePlayer.dispatchEvent( "volumechange" );
          return muted;
        },
        configurable: true
      });

      Popcorn.player.defineProperty( basePlayer, "readyState", {
        get: function() {

          return readyState;
        },
        set: function( val ) {

          readyState = val;
          return readyState;
        },
        configurable: true
      });

      // Adds an event listener to the object
      basePlayer.addEventListener = function( evtName, fn ) {

        if ( !events[ evtName ] ) {

          events[ evtName ] = [];
        }

        events[ evtName ].push( fn );
        return fn;
      };

      // Removes an event listener from the object
      basePlayer.removeEventListener = function( evtName, fn ) {

        var i,
            listeners = events[ evtName ];

        if ( !listeners ){

          return;
        }

        // walk backwards so we can safely splice
        for ( i = events[ evtName ].length - 1; i >= 0; i-- ) {

          if( fn === listeners[ i ] ) {

            listeners.splice(i, 1);
          }
        }

        return fn;
      };

      // Can take event object or simple string
      basePlayer.dispatchEvent = function( oEvent ) {

        var evt,
            self = this,
            eventInterface,
            eventName = oEvent.type;

        // A string was passed, create event object
        if ( !eventName ) {

          eventName = oEvent;
          eventInterface  = Popcorn.events.getInterface( eventName );

          if ( eventInterface ) {

            evt = document.createEvent( eventInterface );
            evt.initEvent( eventName, true, true, window, 1 );
          }
        }

        if ( events[ eventName ] ) {

          for ( var i = events[ eventName ].length - 1; i >= 0; i-- ) {

            events[ eventName ][ i ].call( self, evt, self );
          }
        }
      };

      // Attempt to get src from playerFn parameter
      basePlayer.src = src || "";
      basePlayer.duration = 0;
      basePlayer.paused = true;
      basePlayer.ended = 0;

      options && options.events && Popcorn.forEach( options.events, function( val, key ) {

        basePlayer.addEventListener( key, val, false );
      });

      // true and undefined returns on canPlayType means we should attempt to use it,
      // false means we cannot play this type
      if ( player._canPlayType( container.nodeName, src ) !== false ) {

        if ( player._setup ) {

          player._setup.call( basePlayer, options );
        } else {

          // there is no setup, which means there is nothing to load
          basePlayer.readyState = 4;
          basePlayer.dispatchEvent( "loadedmetadata" );
          basePlayer.dispatchEvent( "loadeddata" );
          basePlayer.dispatchEvent( "canplaythrough" );
        }
      } else {

        // Asynchronous so that users can catch this event
        setTimeout( function() {
          basePlayer.dispatchEvent( "error" );
        }, 0 );
      }

      popcorn = new Popcorn.p.init( basePlayer, options );

      if ( player._teardown ) {

        popcorn.destroy = combineFn( popcorn.destroy, function() {

          player._teardown.call( basePlayer, options );
        });
      }

      return popcorn;
    };

    playerFn.canPlayType = player._canPlayType = player._canPlayType || Popcorn.nop;

    Popcorn[ name ] = Popcorn.player.registry[ name ] = playerFn;
  };

  Popcorn.player.registry = {};

  Popcorn.player.defineProperty = Object.defineProperty || function( object, description, options ) {

    object.__defineGetter__( description, options.get || Popcorn.nop );
    object.__defineSetter__( description, options.set || Popcorn.nop );
  };

  // player queue is to help players queue things like play and pause
  // HTML5 video's play and pause are asynch, but do fire in sequence
  // play() should really mean "requestPlay()" or "queuePlay()" and
  // stash a callback that will play the media resource when it's ready to be played
  Popcorn.player.playerQueue = function() {

    var _queue = [],
        _running = false;

    return {
      next: function() {

        _running = false;
        _queue.shift();
        _queue[ 0 ] && _queue[ 0 ]();
      },
      add: function( callback ) {

        _queue.push(function() {

          _running = true;
          callback && callback();
        });

        // if there is only one item on the queue, start it
        !_running && _queue[ 0 ]();
      }
    };
  };

  // Popcorn.smart will attempt to find you a wrapper or player. If it can't do that,
  // it will default to using an HTML5 video in the target.
  Popcorn.smart = function( target, src, options ) {
    var node = typeof target === "string" ? Popcorn.dom.find( target ) : target,
        i, srci, j, media, mediaWrapper, popcorn, srcLength, 
        // We leave HTMLVideoElement and HTMLAudioElement wrappers out
        // of the mix, since we'll default to HTML5 video if nothing
        // else works.  Waiting on #1254 before we add YouTube to this.
        wrappers = "HTMLVimeoVideoElement HTMLSoundCloudAudioElement HTMLNullVideoElement".split(" ");

    if ( !node ) {
      Popcorn.error( "Specified target `" + target + "` was not found." );
      return;
    }

    // If our src is not an array, create an array of one.
    src = typeof src === "string" ? [ src ] : src;

    // Loop through each src, and find the first playable.
    for ( i = 0, srcLength = src.length; i < srcLength; i++ ) {
      srci = src[ i ];

      // See if we can use a wrapper directly, if not, try players.
      for ( j = 0; j < wrappers.length; j++ ) {
        mediaWrapper = Popcorn[ wrappers[ j ] ];
        if ( mediaWrapper && mediaWrapper._canPlaySrc( srci ) === "probably" ) {
          media = mediaWrapper( node );
          popcorn = Popcorn( media, options );
          // Set src, but not until after we return the media so the caller
          // can get error events, if any.
          setTimeout( function() {
            media.src = srci;
          }, 0 );
          return popcorn;
        }
      }

      // No wrapper can play this, check players.
      for ( var key in Popcorn.player.registry ) {
        if ( Popcorn.player.registry.hasOwnProperty( key ) ) {
          if ( Popcorn.player.registry[ key ].canPlayType( node.nodeName, srci ) ) {
            // Popcorn.smart( player, src, /* options */ )
            return Popcorn[ key ]( node, srci, options );
          }
        }
      }
    }

    // If we don't have any players or wrappers that can handle this,
    // Default to using HTML5 video.  Similar to the HTMLVideoElement
    // wrapper, we put a video in the div passed to us via:
    // Popcorn.smart( div, src, options )
    var videoHTML, videoID = Popcorn.guid( "popcorn-video-" );

    // IE9 doesn't like dynamic creation of source elements on <video>
    // so we do it in one shot via innerHTML.
    videoHTML = '<video id="' +  videoID + '" preload=auto autobuffer>';
    for ( i = 0, srcLength = src.length; i < srcLength; i++ ) {
      videoHTML += '<source src="' + src[ i ] + '">';
    }
    videoHTML += "</video>";
    node.innerHTML = videoHTML;

    if ( options && options.events && options.events.error ) {
      node.addEventListener( "error", options.events.error, false );
    }
    return Popcorn( '#' + videoID, options );
  };
})( Popcorn );

(function( window, Popcorn ) {

  var canPlayType = function( nodeName, url ) {
    return ( typeof url === "string" &&
             Popcorn.HTMLYouTubeVideoElement._canPlaySrc( url ) );
  };

  Popcorn.player( "youtube", {
    _canPlayType: canPlayType
  });

  Popcorn.youtube = function( container, url, options ) {
    if ( typeof console !== "undefined" && console.warn ) {
      console.warn( "Deprecated player 'youtube'. Please use Popcorn.HTMLYouTubeVideoElement directly." );
    }

    var media = Popcorn.HTMLYouTubeVideoElement( container ),
        popcorn = Popcorn( media, options );

    // Set the src "soon" but return popcorn instance first, so
    // the caller can listen for error events.
    setTimeout( function() {
      media.src = url;
    }, 0 );

    return popcorn;
  };

  Popcorn.youtube.canPlayType = canPlayType;

}( window, Popcorn ));

(function( window, Popcorn ) {

  Popcorn.player( "soundcloud", {
    _canPlayType: function( nodeName, url ) {
      return ( typeof url === "string" &&
               Popcorn.HTMLSoundCloudAudioElement._canPlaySrc( url ) &&
               nodeName.toLowerCase() !== "audio" );
    }
  });

  Popcorn.soundcloud = function( container, url, options ) {
    if ( typeof console !== "undefined" && console.warn ) {
      console.warn( "Deprecated player 'soundcloud'. Please use Popcorn.HTMLSoundCloudAudioElement directly." );
    }

    var media = Popcorn.HTMLSoundCloudAudioElement( container ),
        popcorn = Popcorn( media, options );

    // Set the src "soon" but return popcorn instance first, so
    // the caller can get get error events.
    setTimeout( function() {
      media.src = url;
    }, 0 );

    return popcorn;
  };

}( window, Popcorn ));

(function( window, Popcorn ) {

  Popcorn.player( "vimeo", {
    _canPlayType: function( nodeName, url ) {
      return ( typeof url === "string" &&
               Popcorn.HTMLVimeoVideoElement._canPlaySrc( url ) );
    }
  });

  Popcorn.vimeo = function( container, url, options ) {
    if ( typeof console !== "undefined" && console.warn ) {
      console.warn( "Deprecated player 'vimeo'. Please use Popcorn.HTMLVimeoVideoElement directly." );
    }

    var media = Popcorn.HTMLVimeoVideoElement( container ),
      popcorn = Popcorn( media, options );

    // Set the src "soon" but return popcorn instance first, so
    // the caller can get get error events.
    setTimeout( function() {
      media.src = url;
    }, 0 );

    return popcorn;
  };

}( window, Popcorn ));
