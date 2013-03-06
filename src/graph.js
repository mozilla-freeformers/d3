(function(){

  var PRETRANSITION_DELAY = 700;

  window.demo = window.demo || {};

  // Requires d3.v2.
  var Graph = window.demo.Graph = function(initOptions) {
    initOptions = initOptions || {};

    var that = this;

    var graphContainerSelector = initOptions.container;

    var margin = initOptions.margin || {top: 20, right: 0, bottom: 0, left: 0},
        width = this.width = initOptions.width || 620,
        height = this.height = ( initOptions.height || 500 ) - margin.top - margin.bottom;

    this.treemap = d3.layout.treemap()
        .children(function(d, depth) { return depth ? null : d.children; })
        .sort(function(a, b) { return a.value - b.value; })
        .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
        .round(false);

    /* create svg */
    var svg = this.svg = d3.select(graphContainerSelector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .style("margin-left", -margin.left + "px")
        .style("margin.right", -margin.right + "px")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .style("shape-rendering", "crispEdges");

    var grandparent = this.grandparent = svg.append("g")
        .attr("class", "grandparent");

    grandparent.append("rect")
        .attr("y", -margin.top)
        .attr("width", width)
        .attr("height", margin.top);

    grandparent.append("text")
        .attr("x", 6)
        .attr("y", 6 - margin.top)
        .attr("dy", ".75em");

    /* create x and y scales */
    var x = d3.scale.linear()
        .domain([0, this.width])
        .range([0, this.width]);

    var y = d3.scale.linear()
        .domain([0, this.height])
        .range([0, this.height]);

    this.contentTypes = {
      text: function(text) {
        text.attr("x", function(d) { return x(d.x) + 6; })
            .attr("y", function(d) { return y(d.y) + 6; });
      },
      rect: function(rect) {
        rect.attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
            .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });     
      },
      foreign: function(foreign){  /* added */
        foreign.attr("x", function(d) { return x(d.x); })
               .attr("y", function(d) { return y(d.y); })
               .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
               .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
      },
      name: function(d) {
        return d.parent
            ? that.contentTypes.name(d.parent) + "." + d.name
            : d.name;
      }
    };

    this.updateDomains = function(data){
      x.domain([data.x, data.x + data.dx]);
      y.domain([data.y, data.y + data.dy]);
    };

    initOptions = initOptions || {};

    if ( initOptions.data ) {
      this.initialize( initOptions.data );
    }
  };

  Graph.prototype.drawSubTree = function(data){
    var grandparent = this.grandparent;
    var svg = this.svg;
    var that = this;

    var formatNumber = d3.format(",d");

    /* create grandparent bar at top */
    grandparent
        .datum(data.parent)
        .on("click", function(d){
          if(d){
            g1.remove();
            that.transition(d);
          }
        })
      .select("text")
        .text(that.contentTypes.name(data));

    var g1 = svg.insert("g", ".grandparent")
        .datum(data)
        .attr("class", "depth");

    /* add in data */
    var g = g1.selectAll("g")
        .data(data.children)
        .enter().append("g");

    g.g1 = g1;

    /* transition on child click */
    g.filter(function(d) { return d.children; })
      .classed("children", true)
      .on("click", function(e){
        that.transition(e);
      });

    /* write children rectangles */
    g.selectAll(".child")
        .data(function(d) { return d.children || [d]; })
      .enter().append("rect")
        .attr("class", "child")
        .call(that.contentTypes.rect);

    /* write parent rectangle */
    g.append("rect")
        .attr("class", "parent")
        .call(that.contentTypes.rect)
        /* open new window based on the json's URL value for leaf nodes */
        /* Chrome displays this on top */
        .on("click", function(d) { 
            if(!d.children){
                window.open(d.url); 
            }
        })
      .append("title")
        .text(function(d) { return formatNumber(d.value); });
    
    /* Adding a foreign object instead of a text object, allows for text wrapping */
    g.append("foreignObject")
        .call(that.contentTypes.rect)
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

    return g;
  };

  Graph.prototype.initialize = function(root) {  
    var root = JSON.parse(JSON.stringify(root));
    var treemap = this.treemap;

    root.x = root.y = 0;
    root.dx = this.width;
    root.dy = this.height;
    root.depth = 0;

    function accumulate(d) {
      return d.children
        ? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
    }

    function layout(d) {
      if (d.children) {
        treemap.nodes({children: d.children});
        d.children.forEach(function(c) {
          c.x = d.x + c.x * d.dx;
          c.y = d.y + c.y * d.dy;
          c.dx *= d.dx;
          c.dy *= d.dy;
          c.parent = d;
          layout(c);
        });
      }
    }

    accumulate(root);
    layout(root);

    this.root = root;
  };

  Graph.prototype.transition = function(data){
    var iframes = document.querySelectorAll('iframe');
    Array.prototype.forEach.call(iframes, function(iframe){
      iframe.parentNode.removeChild(iframe);
    });

    var that = this;
    var svg = this.svg;
    var g2 = this.drawSubTree(data);
    var g1 = g2.g1;
    var t1 = g1.transition().duration(200),
        t2 = g2.transition().duration(200);

    // Update the domain only after entering new elements.
    this.updateDomains(data);

    // Enable anti-aliasing during the transition.
    svg.style("shape-rendering", null);

    // Draw child nodes on top of parent nodes.
    svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

    // Fade-in entering text.
    g2.selectAll("text").style("fill-opacity", 0);
    g2.selectAll("foreignObject div").style("display", "none"); /*added*/

    // Transition to the new view.
    t1.selectAll("text").call(that.contentTypes.text).style("fill-opacity", 0);
    t2.selectAll("text").call(that.contentTypes.text).style("fill-opacity", 1);
    t1.selectAll("rect").call(that.contentTypes.rect);
    t2.selectAll("rect").call(that.contentTypes.rect);
    
    t1.selectAll(".textdiv").style("display", "none"); /* added */
    t1.selectAll(".foreignobj").call(that.contentTypes.foreign);
    t2.selectAll(".textdiv").style("display", "block"); /* added */
    t2.selectAll(".foreignobj").call(that.contentTypes.foreign); /* added */      

    // Remove the old node when the transition is finished.
    t1.each("end", function() {
      t1.remove();
      svg.style("shape-rendering", "crispEdges");
    });
  };

  Graph.prototype.navigateTo = function(path) {
    var root = this.root;
    var that = this;
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

    function step(element){
      that.transition(element);
      setTimeout(function(){
        if(childrenStack.length){
          step(childrenStack.shift());
        }
      }, PRETRANSITION_DELAY);
    }

    childrenStack.shift();
    step(childrenStack.shift());
  };

  Graph.prototype.draw = function(){
    this.rootG = this.drawSubTree(this.root);
  };

}());