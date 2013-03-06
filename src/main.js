(function(){

  var inputData = {
    name: 'root',
    children: [
      {
        name: 'child1',
        children: [
          {
            name: 'subchild1',
            value: 1,
            children: [
              {
                name: 'subsubchild1',
                value: 1
              }
            ]
          },
          {
            name: 'subchild2',
            value: 1
          },
          {
            name: 'subchild3',
            value: 1
          }
        ],
        value: 1
      },
      {
        name: 'child2',
        children: [
          {
            name: 'subchild4',
            value: 1
          },
          {
            name: 'subchild5',
            value: 1
          }
        ],
        value: 1
      }
    ]
  };

  document.addEventListener('DOMContentLoaded', function(e){
    Butter.init({
      config: {
        "name": "basic",
        "template": "index.html",
        "baseDir": "lib/butter",
        "editor": {
        },
        "maxPluginZIndex": 1000
      },
      ready: function( butter ) {
        butter.listen( "mediaready", function mediaReady() {
          console.log('mediaready');
          butter.unlisten( "mediaready", mediaReady );
        });
        butter.addMedia({url: '#t=,20', target: 'popcorn-dummy'});
        console.log('butter ready');
      }
    });

    function createPath(d){
      var pathEntries = [];
      var currentNode = d;
      
      while(currentNode){
        pathEntries.push(currentNode.name);
        currentNode = currentNode.parent;
      }

      pathEntries.reverse();

      return pathEntries.join('.');
    }

    var graph = demo.createGraph(inputData, '.graph-container', {
      onclick: function(d){
      },
      onchange: function(d){
        //console.log(createPath(d));
      }
    });

    graph.navigateTo('root.child1.subchild1');
  }, false);

}());