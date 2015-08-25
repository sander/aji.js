// aji.js - goban visualizations as text/plain to image/svg+xml transformations
// Copyright (c) 2015 Sander Dijkhuis <mail@sanderdijkhuis.nl>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var SVG = 'http://www.w3.org/2000/svg';

var config = {
  tileSize: 22,
  outerBorder: 2,
  innerBorder: 1,
  padding: 12,
  stoneRadius: 9.5,
  stoneStrokeWidth: 1,
  fg: getComputedStyle(document.body).color,
  bg: getComputedStyle(document.body).backgroundColor,
  starRadius: 3,
  markingSize: 6
};

function arr(v, start) { return Array.prototype.splice.call(v, start || 0); }
function curry(fn) {
  var args = Array.prototype.splice.call(arguments, 1);
  return function() { return fn.apply(this, args.concat(arr(arguments))); };
}
function range(n) {
  var res = [];
  for (var i = 0; i < n; i++) res.push(i);
  return res;
}
function str() {
  return arr(arguments).join('');
}

function el(ns, name, attrs) {
  var node = document.createElementNS(ns, name);
  var children = arr(arguments, 3);
  function addChildren(cn) {
    cn.forEach(function(c) {
      if (Array.isArray(c)) {
        addChildren(c);
      } else if (c) {
        node.appendChild(c);
      } else {
      }
    });
  }
  addChildren(children);
  if (attrs) {
    for (var i in attrs) {
      if (i == 'style') {
        for (var j in attrs[i]) {
          node.style[j] = attrs[i][j];
        }
      } else if (i == 'className') {
        node.classList.add(attrs[i]);
      } else {
        node.setAttribute(i, attrs[i]);
      }
    }
  }
  return node;
}

var dom = {
  svg: curry(el, SVG, 'svg'),
  circle: curry(el, SVG, 'circle'),
  rect: curry(el, SVG, 'rect'),
  line: curry(el, SVG, 'line'),
  g: curry(el, SVG, 'g')
};

function renderGrid(c, board) {
  var nv = board.width;
  var nh = board.height;
  var pad = {
    t: !board.borders.top,
    r: !board.borders.right,
    b: !board.borders.bottom,
    l: !board.borders.left
  };
  var style = {
    stroke: c.fg,
    strokeWidth: c.innerBorder
  };
  var vlines = range(nv).map(function(col) {
    var x = (pad.l / 2 + col) * c.tileSize + col * c.innerBorder + .5;
    var height = (nh - 1 + (pad.t + pad.b) / 2) * c.tileSize + nh * c.innerBorder;
    return dom.line({ x1: x, x2: x, y1: 0, y2: height, style: style });
  });
  var hlines = range(nh).map(function(row) {
    var y = (pad.t / 2 + row) * c.tileSize + row * c.innerBorder + .5;
    var width = (nv - 1 + (pad.l + pad.r) / 2) * c.tileSize + nv * c.innerBorder;
    return dom.line({ x1: 0, x2: width, y1: y, y2: y, style: style });
  });
  return dom.g({}, vlines, hlines);
}

function renderBorders(c, board, width, height) {
  var outerBorderStyle = {
    stroke: c.fg,
    strokeWidth: c.outerBorder
  };
  var bpp = c.outerBorder + c.padding;
  return dom.g(
    {},
    board.borders.top
      ? dom.line({ x1: 0, x2: width,
                   y1: c.outerBorder / 2,
                   y2: c.outerBorder / 2,
                   style: outerBorderStyle }) : null,
    board.borders.left
      ? dom.line({ x1: c.outerBorder / 2,
                    x2: c.outerBorder / 2,
                    y1: 0, y2: height,
                   style: outerBorderStyle }) : null,
    board.borders.right
      ? dom.line({ x1: width - c.outerBorder / 2,
                   x2: width - c.outerBorder / 2,
                   y1: 0, y2: height,
                   style: outerBorderStyle }) : null,
    board.borders.bottom
      ? dom.line({ x1: 0, x2: width,
                   y1: height - c.outerBorder / 2,
                   y2: height - c.outerBorder / 2,
                   style: outerBorderStyle }) : null
  ); 
}

var itemRenderers = {
  'b': function(c) {
    return dom.circle({ r: c.stoneRadius + c.stoneStrokeWidth,
                        fill: c.fg });
  },
  'w': function(c) {
    return dom.circle({ r: c.stoneRadius,
                        fill: c.bg,
                        style: { stroke: c.fg,
                                 strokeWidth: c.stoneStrokeWidth }});
  },
  '+': function(c) {
    return null;
  },
  '*': function(c) {
    return dom.circle({ r: c.starRadius,
                        fill: c.fg });
  },
  'o': function(c) {
    return dom.rect({ width: c.markingSize,
                      height: c.markingSize,
                      x: -c.markingSize / 2,
                      y: -c.markingSize / 2,
                      style: { fill: 'none',
                               stroke: c.fg,
                               strokeWidth: c.innerBorder } });
  }
};

function translate(x, y) {
  return { transform: str('translate(', x, ', ', y, ')') };
}

function renderItems(c, board) {
  return board.places.map(function(row, i) {
    return row.map(function(item, j) {
      return dom.g(translate(j * c.tileSize + j * c.innerBorder,
                             i * c.tileSize + i * c.innerBorder),
                   itemRenderers[item](c));
    });
  });
}

function renderBoard(c, board) {
  var width =
      (board.borders.left ? (c.outerBorder + c.padding) : (c.tileSize / 2))
      + (board.width - 1) * c.tileSize
      + board.width * c.innerBorder
      + (board.borders.right ? (c.padding + c.outerBorder) : (c.tileSize / 2));
  var height =
      (board.borders.top ? (c.outerBorder + c.padding) : (c.tileSize / 2))
      + (board.height - 1) * c.tileSize
      + board.height * c.innerBorder
      + (board.borders.bottom
         ? (c.padding + c.innerBorder + c.outerBorder)
         : c.tileSize / 2);

  return (
    dom.svg(
      { className: 'go', width: width, height: height },
      renderBorders(c, board, width, height),
      dom.g(
        translate(board.borders.left
                  * (c.outerBorder + c.padding + c.innerBorder),
                  board.borders.top
                  * (c.outerBorder + c.padding + c.innerBorder)),
        renderGrid(c, board),
        dom.g(
          translate(!board.borders.left * c.tileSize / 2 + c.innerBorder / 2,
                    !board.borders.top * c.tileSize / 2 + c.innerBorder / 2),
          renderItems(c, board)
        )
      )
    )
  );
}

function parseBoard(code) {
  function noBorder(s) { return !/[-|]/.test(s); }
  function notEmpty(a) { return a.length; }
  var borders = {
    top: /^\s*\+?-/.test(code),
    right: /\|\s*$/m.test(code),
    bottom: /-\+?\s*$/.test(code),
    left: /^\s*\|/m.test(code)
  };
  var places = code.trim().split(/\n/).map(function(row) {
    return row.trim().split(/\s+/).filter(noBorder);
  }).filter(notEmpty);
  var width = places[0].length;
  var height = places.length;
  return {
    places: places,
    width: width,
    height: height,
    borders: borders
  };
}

function visualize(node) {
  var board = parseBoard(node.innerHTML);
  node.parentNode.insertBefore(renderBoard(config, board), node);
  node.parentNode.removeChild(node);
}

function aji(selector) {
  var boards = document.querySelectorAll(selector);
  for (var i = 0; i < boards.length; i++) {
    visualize(boards[i]);
  }
}
