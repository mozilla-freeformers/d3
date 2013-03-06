Popcorn.plugin( "freeformers", (function(){
  return {
    _setup : function( options ) {
    },
    start: function( event, options ){
      options.graph.navigateTo( options.path );
    },
    end: function( event, options ){
    },
    toString: function( options ){
      return options.path;
    }
  };
}()));