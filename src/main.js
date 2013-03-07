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
                children: [
                  {
                    name: 'subsubsubchild1',
                    value: 1
                  }
                ],
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
        "baseDir": "lib/butter/",
        "editor": {
        },
        "wrapper": {
          "wrappers": []
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

    function updatePath(d){
      var pathList = document.querySelector('.path');
      var pathEntries = [];
      var currentNode = d;
      var entry, li;

      while(pathList.childNodes.length){
        pathList.removeChild(pathList.firstChild);
      }

      function createPathListItem(node){
        li = document.createElement('li');
        li.innerHTML = node.name;
        li.classList.add('entry');
        li.onclick = function(){
          graph.transition(node);
          updatePath(node);
        };
        return li;
      }

      while(currentNode){
        pathList.insertBefore(createPathListItem(currentNode), pathList.firstChild);
        currentNode = currentNode.parent;

        if(currentNode){
          li = document.createElement('li');
          li.innerHTML = '.';
          pathList.insertBefore(li, pathList.firstChild);
        }
      }

      pathEntries.reverse();
    }

    var graph = demo.createGraph(inputData, '.graph-container', {
      onclick: function(d){
      },
      onchange: function(d){
        updatePath(d);
        //console.log(createPath(d));
      }
    });

    //graph.navigateTo('root.child1.subchild1');
  }, false);

}());