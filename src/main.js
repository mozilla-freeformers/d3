(function(){

  var inputData = {
    foo1: {
      bar: 'baz',
      boop: {
        beep1: [
          'borpy',
          'borpy',
        ],
        beep2: [
          'borpy',
          'borpy',
          'borpy',
          'borpy',
        ]
      }
    },
    foo2: [
      'bar',
      'bar',
      'bar',
      'baz',
      'beep'
    ]
  };

  document.addEventListener('DOMContentLoaded', function(e){
    var butterTrack;

    var currentPath = 'root';

    var jsonView = document.querySelector('.json-view');

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

    var graph = demo.createGraph(gtty.parseData(inputData), '.graph-container', {
      onclick: function(d){
      },
      onchange: function(d){
        updatePath(d);

        jsonView.value = JSON.stringify(d, function(key, value){
          if ( ['parent', 'x', 'y', 'dx', 'dy', 'depth', 'z', 'area', ].indexOf(key) > -1 ) {
            return;
          }
          return value;
        }, 2);
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

    var toggleJSONButton = document.querySelector('*[data-function="toggle-json"]');
    toggleJSONButton.onclick = function(e){
      jsonView.classList.toggle('open');
    };

  }, false);

}());