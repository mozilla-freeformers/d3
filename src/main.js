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
    var butterTrack;

    var currentPath = 'root';

    Butter.init({
      config: {
        "name": "basic",
        "template": "index.html",
        "baseDir": "lib/butter/",
        "editor": {
        },
        "wrapper": {
          "wrappers": []
        }
      },
      ready: function( butter ) {
        butter.listen( "mediaready", function mediaReady() {
          butter.unlisten( "mediaready", mediaReady );
        });
        butter.addMedia({url: '#t=,20', target: 'popcorn-dummy'});
        butterTrack = butter.currentMedia.addTrack();
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

      currentPath = '';
      while(currentNode){
        pathList.insertBefore(createPathListItem(currentNode), pathList.firstChild);
        pathEntries.push(currentNode.name);
        currentNode = currentNode.parent;

        if(currentNode){
          li = document.createElement('li');
          li.innerHTML = '.';
          pathList.insertBefore(li, pathList.firstChild);
        }
      }

      pathEntries.reverse();
      currentPath = pathEntries.join('.');
    }

    var graph = demo.createGraph(inputData, '.graph-container', {
      onclick: function(d){
      },
      onchange: function(d){
        updatePath(d);
      }
    });

    var createEventButton = document.querySelector('*[data-function="create-event"]');
    var timelineHighlightTimeout;
    createEventButton.onclick = function(e){
      butterTrack.addTrackEvent({
        type: 'freeformers',
        popcornOptions: {
          start: Butter.app.currentMedia.currentTime,
          end: Butter.app.currentMedia.currentTime + 1,
          callback: function(path){
            if(currentPath !== path){
              graph.navigateTo(path);
            }
          },
          path: currentPath
        }
      });

      var timelineElement = document.querySelector('.butter-tray .media-status-container');
      var tracksElement = document.querySelector('.butter-tray .tracks-container-wrapper');

      if(timelineHighlightTimeout){
        clearTimeout(timelineHighlightTimeout);
      }

      timelineElement.classList.add('outline-pulse');
      tracksElement.classList.add('outline-pulse');
      timelineHighlightTimeout = setTimeout(function(){
        timelineHighlightTimeout = null;
        timelineElement.classList.remove('outline-pulse');
        tracksElement.classList.remove('outline-pulse');
      }, 1000);
    };

    //graph.navigateTo('root.child1.subchild1');
  }, false);

}());