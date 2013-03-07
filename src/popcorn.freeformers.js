Popcorn.plugin( "freeformers", (function(){
  return {
    _setup : function( options ) {
      options.toString = function(){
        return options.path;
      };
    },
    start: function( event, options ){
      options.callback( options.path );
    },
    end: function( event, options ){
    }
  };
}()));