(function(){

  var PRETRANSITION_DELAY = 700;

  window.demo = window.demo || {};

  var formatNumber = d3.format(",d");

  function initialize(root, width, height) {  
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
  }

  function accumulate(d) {
    return d.children
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  function layout(treemap, d) {
    if (d.children) {
      treemap.nodes({children: d.children});
      d.children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(treemap, c);
      });
    }
  }

  function draw(svg, treemap, root, grandparent, xScale, yScale, options){

    options = options || {};

    var onclick = options.onclick || function(){};
    var onchange = options.onchange || function(){};

    function drawSubTree(d) {
      var transitioning = false;

      function text(text) {
        text.attr("x", function(d) { return xScale(d.x) + 6; })
            .attr("y", function(d) { return yScale(d.y) + 6; });
      }

      function rect(rect) {
        rect.attr("x", function(d) { return xScale(d.x); })
            .attr("y", function(d) { return yScale(d.y); })
            .attr("width", function(d) { return xScale(d.x + d.dx) - xScale(d.x); })
            .attr("height", function(d) { return yScale(d.y + d.dy) - yScale(d.y); });     
      }

      function foreign(foreign){  /* added */
        foreign.attr("x", function(d) { return xScale(d.x); })
          .attr("y", function(d) { return yScale(d.y); })
          .attr("width", function(d) { return xScale(d.x + d.dx) - xScale(d.x); })
          .attr("height", function(d) { return yScale(d.y + d.dy) - yScale(d.y); });
      }

      function name(d) {
        return d.parent
            ? name(d.parent) + "." + d.name
            : d.name;
      }

      /* create grandparent bar at top */
      grandparent
          .datum(d.parent)
          .on("click", function(e){
            transitionTo(e);
            onchange(e);
          })
        .select("text")
          .text(name(d));

      var g1 = svg.insert("g", ".grandparent")
          .datum(d)
          .attr("class", "depth");
      
      /* add in data */
      var g = g1.selectAll("g")
          .data(d.children)
        .enter().append("g");

      /* transition on child click */
      g.filter(function(d) { return d.children; })
        .classed("children", true)
        .on("click", function(e){
          transitionTo(e);
          onclick(e);
          onchange(e);
        });

      /* write children rectangles */
      g.selectAll(".child")
          .data(function(d) { return d.children || [d]; })
        .enter().append("rect")
          .attr("class", "child")
          .call(rect);

      /* write parent rectangle */
      g.append("rect")
          .attr("class", "parent")
          .call(rect)
          /* open new window based on the json's URL value for leaf nodes */
          /* Chrome displays this on top */
          .on("click", function(d) {
            onclick(d);
          })
        .append("title")
          .text(function(d) { return formatNumber(d.value); });
      
      /* Adding a foreign object instead of a text object, allows for text wrapping */
      g.append("foreignObject")
        .call(rect)
        /* open new window based on the json's URL value for leaf nodes */
        /* Firefox displays this on top */
        .on("click", function(d) { 
          if(!d.children){
            window.open(d.url); 
          }
        })

        .attr("class","foreignobj")
        .append("xhtml:div") 
          .attr("dy", ".75em")
      
        .html(function(d) { return d.name;})
        
        .html(function(d) { return d.data?d.data:d.name;})
          .attr("class","textdiv"); //textdiv class allows us to style the text easily with CSS

      /* create transition function for transitions */
      function transitionTo(d) {
        if (transitioning || !d) return;
        transitioning = true;

        var iframes = document.querySelectorAll('iframe');
        Array.prototype.forEach.call(iframes, function(iframe){
          iframe.parentNode.removeChild(iframe);
        });

        var g2 = drawSubTree(d);

        var t1 = g1.transition().duration(200),
            t2 = g2.transition().duration(200);

        // Update the domain only after entering new elements.
        xScale.domain([d.x, d.x + d.dx]);
        yScale.domain([d.y, d.y + d.dy]);

        // Enable anti-aliasing during the transition.
        svg.style("shape-rendering", null);

        // Draw child nodes on top of parent nodes.
        svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

        // Fade-in entering text.
        g2.selectAll("text").style("fill-opacity", 0);
        g2.selectAll("foreignObject div").style("display", "none"); /*added*/

        // Transition to the new view.
        t1.selectAll("text").call(text).style("fill-opacity", 0);
        t2.selectAll("text").call(text).style("fill-opacity", 1);
        t1.selectAll("rect").call(rect);
        t2.selectAll("rect").call(rect);
        
        t1.selectAll(".textdiv").style("display", "none"); /* added */
        t1.selectAll(".foreignobj").call(foreign);
        t2.selectAll(".textdiv").style("display", "block"); /* added */
        t2.selectAll(".foreignobj").call(foreign); /* added */      

        // Remove the old node when the transition is finished.
        t1.remove().each("end", function() {
          svg.style("shape-rendering", "crispEdges");
          transitioning = false;               
        });
        
        return g2;

      }//endfunc transition

      g.transitionTo = transitionTo;

      return g;
    }
   
    var rootG = drawSubTree(root);

    return {
      transition: rootG.transitionTo
    };
  }

  demo.createGraph = function(inputData, container, options){
    var root = JSON.parse(JSON.stringify(inputData));

    var margin = {top: 20, right: 0, bottom: 0, left: 0};

    width = options.width || 620;
    height = (options.height || 500) - margin.top - margin.bottom;

    /* create x and y scales */
    var xScale = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

    var yScale = d3.scale.linear()
        .domain([0, height])
        .range([0, height]);

    var treemap = d3.layout.treemap()
        .children(function(d, depth) { return depth ? null : d.children; })
        .sort(function(a, b) { return a.value - b.value; })
        .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
        .round(false);

    /* create svg */
    var svg = d3.select(container).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .style("margin-left", -margin.left + "px")
        .style("margin.right", -margin.right + "px")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .style("shape-rendering", "crispEdges");

    var grandparent = svg.append("g")
        .attr("class", "grandparent");

    grandparent.append("rect")
        .attr("y", -margin.top)
        .attr("width", width)
        .attr("height", margin.top);

    grandparent.append("text")
        .attr("x", 6)
        .attr("y", 6 - margin.top)
        .attr("dy", ".75em");

    initialize(root, width, height);
    accumulate(root);
    layout(treemap, root);

    var ctx = draw(svg, treemap, root, grandparent, xScale, yScale, options);

    return {
      navigateTo: function(path) {
        var pathArray = path.split('.').slice(1);
        var childrenStack = [root];

        function collectChildren(currentChild){
          currentChild.children.forEach(function(element){
            if(element.name === pathArray[childrenStack.length - 1]){
              childrenStack.push(element);
              if(element.children){
                collectChildren(element);
              }
            }
          });          
        }        

        collectChildren(root);

        function step(node){
          var next = ctx.transition(node);
          var element = next[0].parentNode.querySelector('.parent');
          element.classList.add('pulsing');
          setTimeout(function(){
            element.classList.remove('pulsing');
            if(childrenStack.length){
              step(childrenStack.shift());
            }
          }, PRETRANSITION_DELAY);
        }

        childrenStack.shift();
        step(childrenStack.shift());
      }
    }
  };

}());