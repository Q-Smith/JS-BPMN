// ************************************************************************** //
// Html Module //
// ************************************************************************** //

var Html = Html || {};
;(function() {
	'use strict';

	// Static Members
	if (!Html.ns) {
		Html.ns = {
			XMLNS: 'http://www.w3.org/2000/xmlns/',
			XLINK: 'http://www.w3.org/1999/xlink', // This is used for images.
			SVG: 'http://www.w3.org/2000/svg',
			OMG_DI: 'http://www.omg.org/spec/DD/20100524/DI', // Diagram Interchange
			OMG_DC: 'http://www.omg.org/spec/DD/20100524/DC',
			BPMN_DI: 'http://www.omg.org/spec/BPMN/20100524/DI',
			BPMN_MODEL: 'http://www.omg.org/spec/BPMN/20100524/MODEL'
		};
	};

	// JS5 extensions
	if (!Object.getOwnPropertyDescriptors) {
		Object.getOwnPropertyDescriptors = function (obj) {
			var descs = {};
			Object.getOwnPropertyNames(obj).forEach(function(propName) {
				descs[propName] = Object.getOwnPropertyDescriptor(obj, propName);
			});
			return descs;
		};
	};
})();

// ************************************************************************** //
// QS Root Module //
// ************************************************************************** //

var QS = QS || {};
;(function() {
	'use strict';

	QS.Proto = {
		new: function () {
			var instance = Object.create(this);
			if (instance.constructor) {
				instance.constructor.apply(instance, arguments);
			}
			return instance;
		},
		inherit: function (props) {
			// We cannot set the prototype of "props"
			// => copy its contents to a new object that has the right prototype
			var instance = Object.create(this, Object.getOwnPropertyDescriptors(props));
			instance.super = this; // for super-calls
			return instance;
		},
		mixin: function(obj, extension) {
			for (var prop in extension) {
				if (extension.hasOwnProperty(prop)) {
					obj[prop] = extension[prop];
				}
			}
		}
	};

})();

// ************************************************************************** //
// SVG Module //
// ************************************************************************** //

;(function() {
	'use strict';

	// Reduce namespaces
	var Proto = QS.Proto;

	// ---------------------------------------------------------------------- //
	// SVG Factory //

	var SVG = function(element) {

		// Find the DOM element
		var node = (typeof element == 'string') ? document.getElementById(element) : element;

		// Return the SVG document
		return SVG.Document.new(node);
	};
	QS.SVG = SVG;
	QS.SVG.version = '0.0.1';

	// ---------------------------------------------------------------------- //
	// SVG.Element //

	SVG.Element = Proto.inherit({
		// Constructor
		constructor: function (node) {
			this._node = node;
		},
		// Public Members
		attr: function(name, value, ns) {
			if (typeof name === 'object') {
				for (var key in name) {
					this.attr(key, name[key], ns);
				}
			} else {
				if (ns) {
					this._node.setAttributeNS(ns, name, value.toString());
				} else if (value !== null) {
					this._node.setAttribute(name, value.toString());
				}
			}

			return this;
		},
		id: function(id) {
			return this.attr('id', id);
		},
		x: function(x) {
			return this.attr('x', x);
		},
		y: function(y) {
			return this.attr('y', y);
		},
		width: function(width) {
			return this.attr('width', width);
		},
		height: function(height) {
			return this.attr('height', height);
		},
		size: function(width, height) {
			var bbox = this._bbox(this._node);
			var psize = this._proportionallyResize(bbox, width, height);

			return this
				.width(psize.width)
				.height(psize.height);
		},
		move: function(x, y) {
			return this
				.x(x)
				.y(y);
		},
		// Private Members
		_bbox: function(element) {
			// We create a BBox object to hide Native/Workaround implementations of the elements bounded box.
			return SVG.BBox.new(element);
		},
		_proportionallyResize: function (box, width, height) {
			// TODO: FIXME
			// http://www.ajaxblender.com/howto-resize-image-proportionally-using-javascript.html
			if (height == null) {
				height = box.height / box.width * width
			} else if (width == null) {
				width = box.width / box.height * height
			}

			return {
				width: width,
				height: height
			}
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Document Factory //

	SVG.Document = SVG.Element.inherit({
		// Constructor
		constructor: function (node) {
			// Translate into SVG element
			var canvas = this._createFragment(node);

			// Inherit from SVG.Element
			SVG.Document.super.constructor.call(this, canvas.firstChild);

			this._container = node; // will be the DOM element to append canvas
			this._canvas = canvas; // will be the drawing canvas for SVG elements

			// Prepare the SVG node
			this.attr('xmlns', Html.ns.SVG);
			this.attr('version', '1.1');
			this.attr('xmlns:xlink', Html.ns.XLINK, Html.ns.XMLNS);
			this.attr('style', 'overflow:hidden;');
		},
		// Public Members
		clear: function() {
			var svgRoot = this._canvas.firstChild;
			if (svgRoot) {
				var len = svgRoot.childNodes.length;
				for (var i = len - 1; i >= 0 ; i--) {
					svgRoot.removeChild(svgRoot.childNodes.item(i));
				}
			}
			this._container.removeChild(this._container.firstChild);
		},
		draw: function(container) {
			// Note: appendChild() on a fragment moves graph from fragment to target, and leaves the fragment empty!
			// Allow option to draw into a different container.
			if (container) {
				container.appendChild(this._canvas.cloneNode(true));
			} else {
				this._container.appendChild(this._canvas.cloneNode(true));
			}
			return this;
		},
		// Private Members
		_createFragment: function(root) {
			var tag = root;
			if (tag.nodeName !== 'svg') {
				tag = document.createElementNS(Html.ns.SVG, 'svg');
			}

			var fragment = document.createDocumentFragment();
			fragment.appendChild(tag);
			return fragment;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.BBox //

	// https://developer.mozilla.org/en-US/docs/Web/API/element.getBoundingClientRect
	// http://msdn.microsoft.com/en-us/library/ie/ff972173(v=vs.85).aspx
	SVG.BBox = Proto.inherit({
		// Constructor
		constructor: function (element) {
			this.left = 0;
			this.top = 0;
			this.right = 0;
			this.bottom = 0;
			this.width = 0;
			this.height = 0;

			var box;
			if (element) {
				try {
					var rect = element.getBBox();

					box = {
						left: rect.x,
						top: rect.y,
						right: (rect.x + rect.width),
						bottom: (rect.y + rect.height),
						width: rect.width,
						height: rect.height
					}

				} catch(e) {
					var rect;
					if (element.getBoundingClientRect) {
						rect = element.getBoundingClientRect();
					} else {
						// fallback
						rect = element.getClientRects();
					}

					box = {
						left: rect.left,
						top: rect.top,
						right: rect.right,
						bottom: rect.bottom,
						width: rect.width,
						height: rect.height
					}
				}

				this.left = box.left;
				this.top = box.top;
				this.right = box.right;
				this.bottom = box.bottom;
				this.width = box.width;
				this.height = box.height;
			}
		}
	});
})();

// ************************************************************************** //
// SVG MixIns //
// ************************************************************************** //

;(function() {
	'use strict';

	// Reduce namespaces
	var Proto = QS.Proto;
	var SVG = QS.SVG;

	// ---------------------------------------------------------------------- //
	// SVG.Element.Group MixIn //

	Proto.mixin(SVG.Element, {
		group: function () {
			var childNode = document.createElementNS(Html.ns.SVG, 'g');
			this._node.appendChild(childNode);

			// wrap element
			return SVG.Element.new(childNode);
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Rect MixIn //

	Proto.mixin(SVG.Element, {
		rect: function(x, y, w, h, rx, ry) {
			var childNode = document.createElementNS(Html.ns.SVG, 'rect');
			this._node.appendChild(childNode);

			var attrs = {
				x: x || 0,
				y: y || 0,
				width: w || 10,
				height: h || 10,
				fill: 'none',
				stroke: '#000'
			};

			attrs.rx = rx || 0;
			attrs.ry = ry || 0;

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Circle MixIn //

	Proto.mixin(SVG.Element, {
		circle: function(cx, cy, r) {
			var childNode = document.createElementNS(Html.ns.SVG, 'circle');
			this._node.appendChild(childNode);

			var attrs = {
				cx: cx,
				cy: cy,
				r: r,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Ellipse MixIn //

	Proto.mixin(SVG.Element, {
		ellipse: function(cx, cy, rx, ry) {
			var childNode = document.createElementNS(Html.ns.SVG, 'ellipse');
			this._node.appendChild(childNode);

			var attrs = {
				cx: cx,
				cy: cy,
				rx: rx,
				ry: ry,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Line MixIn //

	Proto.mixin(SVG.Element, {
		line: function(x1, y1, x2, y2) {
			var childNode = document.createElementNS(Html.ns.SVG, 'line');
			this._node.appendChild(childNode);

			var attrs = {
				x1: x1,
				x2: x2,
				y1: y1,
				y2: y2,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Polygon MixIn //

	Proto.mixin(SVG.Element, {
		polygon: function(points) {
			var childNode = document.createElementNS(Html.ns.SVG, 'polygon');
			this._node.appendChild(childNode);

			var attrs = {
				points: points,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Polyline MixIn //

	Proto.mixin(SVG.Element, {
		polyline: function(points) {
			var childNode = document.createElementNS(Html.ns.SVG, 'polyline');
			this._node.appendChild(childNode);

			var attrs = {
				points: points,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Path MixIn //

	Proto.mixin(SVG.Element, {
		path: function(d) {
			var childNode = document.createElementNS(Html.ns.SVG, 'path');
			this._node.appendChild(childNode);

			var attrs = {
				d: d,
				fill: 'none',
				stroke: '#000'
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});

	// ---------------------------------------------------------------------- //
	// SVG.Element.Text MixIn //

	Proto.mixin(SVG.Element, {
		text: function(x, y, text) {
			var childNode = document.createElementNS(Html.ns.SVG, 'text');
			childNode.appendChild(document.createTextNode(text || ''));
			this._node.appendChild(childNode);

			var attrs = {
				x: x,
				y: y
			};

			// wrap element
			var self = SVG.Element.new(childNode);
			self.attr(attrs);
			return self;
		}
	});
})();
