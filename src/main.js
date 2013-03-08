(function(){

  var testData = {
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
    if(window.location.search === '?test'){
      init(testData);
    }
    else {
      gtty.get({
        youtube: 'CodeOrg', //DEFINE USERNAME
        soundcloud: 'littleboots' //DEFINE USERNAME
      }, init);
    }
  }, false);

  function init(inputData){
    console.log(inputData);
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

      return pathEntries;
    }

  function produceJSON(pathEntries){
    var currentNode = inputData;

    var lastKey = '';
    while(pathEntries.length){
      lastKey = pathEntries.shift();
      currentNode = currentNode[lastKey];
    }

    var spaces = '                                      ';
    var spaceMultiplier = 4;
    function readObject(object, depth){
      if(depth > 2){
        return '\n' + spaces.substr(0, depth * spaceMultiplier) + '...';
      }
        
      var str = '';

        Object.keys(object).forEach(function(key, index){
          var value = object[key];
          if(index > 0){
            str += ',';
          }
          
          str += '\n' + spaces.substr(0, depth * spaceMultiplier) + key + ': ';
          
          if(value === null){
            str += '<null>';
          }
          else if(Array.isArray(value)){
            str += ' [';
            str += readObject(value, depth + 1);
            str += '\n' + spaces.substr(0, depth * spaceMultiplier) + ']';
          }
          else if(typeof value === 'object'){
            str += ' {';
            str += readObject(value, depth + 1);
            str += '\n' + spaces.substr(0, depth * spaceMultiplier) + '}';
          }
          else if(typeof value === 'string'){
            str += '"' + value + '"';
          }
          else{
            str += value;
          }
        });

        return str;
      }

      if(typeof currentNode === 'object'){
        jsonView.value = readObject(currentNode, 0);
      }
      else {
        jsonView.value = currentNode;
      }
    }

    var graph = demo.createGraph(gtty.parseData(inputData), '.graph-container', {
      onclick: function(d){
      },
      onchange: function(d){
        var pathEntries = updatePath(d).slice(1);
        produceJSON(pathEntries);
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

    produceJSON([]);
  }

}());