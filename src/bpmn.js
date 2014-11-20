// ************************************************************************** //
// Html Module //
// ************************************************************************** //

var Html = Html || {};
;(function(ns) {
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
})(this);

// ************************************************************************** //
// Bpmn Module //
// ************************************************************************** //

;(function(ns) {
	'use strict';

	// Types Object
	var Types = {
		isNull: function(ref) {
			return (ref === null);
		},
		isUndefined: function(ref) {
			return (typeof ref === 'undefined');
		},
		isBoolean: function(ref) {
			return (typeof ref === 'boolean');
		},
		isNumber: function(ref) {
			return (typeof ref === 'number');
		},
		isString: function(ref) {
			return (typeof ref === 'string');
		},
		isSymbol: function(ref) {
			return (typeof ref === 'symbol');
		},
		isObject: function(ref) {
			return (typeof ref === 'object');
		},
		isFunction: function(ref) {
			return (typeof ref === 'function');
		}
	};

	ns.Bpmn = (function invocation() {

		// ************************************************************************** //
		// Bpmn Class //
		// ************************************************************************** //

		// Constructor
		function Bpmn(config) {
			// Private Instance Variables
			this._container = config.container; // the DOM element. Either <svg> or <div>
			this._graphics = config.graphics || new QS.SVG(this._container);

			// Public Instance Variables
			this.version = '0.0.1';
			this.model = config.model;
		};

		// Public Methods
		Bpmn.prototype.load = function(data) {
			this.model.load(data);
		};

		Bpmn.prototype.clear = function() {
			this.model.clear(this._graphics);
		};

		Bpmn.prototype.draw = function() {
			this.model.draw(this._graphics);
		};

		// ************************************************************************** //
		// Bpmn.Model Class //
		// ************************************************************************** //

		// Constructor
		function ModelBpmn2(config) {
			// Private Instance Variables
			this._graphics = undefined;
			this._document = undefined;
		};

		// Public Methods
		ModelBpmn2.prototype.load = function(data) {
			// https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
			// https://developer.mozilla.org/en-US/docs/Web/Guide/Parsing_and_serializing_XML
			var xmlDoc;
			if (window.DOMParser) {
				var parser = new DOMParser();
				xmlDoc = parser.parseFromString(data, 'text/xml');
			} else {
				xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
				xmlDoc.async = false;
				xmlDoc.loadXML(data);
			}

			this._document = xmlDoc;
		};

		ModelBpmn2.prototype.clear = function(graphics) {
			this._graphics = this._graphics || graphics;
			this._graphics.clear();
		};

		ModelBpmn2.prototype.draw = function(graphics) {
			var maxWidth = 800;
			var maxHeight = 600;
			this._graphics = this._graphics || graphics;

			// Shapes
			var shapes = this._document.getElementsByTagNameNS(Html.ns.BPMN_DI, 'BPMNShape');
			for (var i = 0; i < shapes.length; i++) {
				var shape = shapes.item(i);
				var bpmnElement = shape.attributes.getNamedItem('bpmnElement').nodeValue;
				var bounds = shape.getElementsByTagNameNS(Html.ns.OMG_DC, 'Bounds').item(0);
				var attrs = bounds.attributes;

				var x = 0;
				var y = 0;
				var width = 0;
				var height = 0;
				if (attrs && attrs.length > 0) {
					x = attrs.getNamedItem('x').nodeValue;
					y = attrs.getNamedItem('y').nodeValue;
					width = parseInt(attrs.getNamedItem('width').nodeValue);
					height = parseInt(attrs.getNamedItem('height').nodeValue);

					x = parseInt(x.substring(0, x.indexOf('.') + 3));
					y = parseInt(y.substring(0, y.indexOf('.') + 3));
				}

				maxWidth = Math.max(maxWidth, x + width);
				maxHeight = Math.max(maxHeight, y + height);
				this._paintShape(bpmnElement, x, y, width, height);
			}

			// Edges
			var edges = this._document.getElementsByTagNameNS(Html.ns.BPMN_DI, 'BPMNEdge');
			for (var i = 0; i < edges.length; i++) {
				var path = '';
				var edge = edges.item(i);
				var bpmnElement = edge.attributes.getNamedItem('bpmnElement').nodeValue;
				var childNodes = edge.childNodes;
				for (var t = 0; t < childNodes.length; t++) {
					var startX, startY;
					var atts1 = childNodes.item(t).attributes;
					if (atts1 && atts1.length > 0) {
						var x1 = atts1.getNamedItem('x').nodeValue;
						var y1 = atts1.getNamedItem('y').nodeValue;
						x1 = parseInt(x1.substring(0, x1.indexOf('.') + 3));
						y1 = parseInt(y1.substring(0, y1.indexOf('.') + 3));
						if (path === ''){
							path = 'M' + x1 + ' ' + y1;
							startX = x1;
							startY = y1;
						} else {
							path += 'L' + x1 + ' ' + y1;
						}
					}
				}
				this._paintEdge(bpmnElement, path, startX, startY);
			}

			this._graphics.attr('width', maxWidth);
			this._graphics.attr('height', maxHeight);
			this._graphics.draw();
		};

		// Private Methods
		ModelBpmn2.prototype._paintShape = function(bpmnElement, x, y, width, height) {
			var element = this._document.querySelectorAll('*[id="' + bpmnElement + '"]').item(0);
			switch(element.localName) {
				case 'participant': this._paintParticipant(x, y, width, height, element); break;
				case 'lane': this._paintLane(x, y, width, height, element); break;
				case 'startEvent': this._paintStartEvent(x, y, width, height, element); break;
				case 'endEvent': this._paintEndEvent(x, y, width, height, element); break;
				case 'exclusiveGateway': this._paintExclusiveGateway(x, y, width, height, element); break;
				case 'serviceTask':
				case 'scriptTask':
				case 'userTask':
				case 'task': this._paintTask(x, y, width, height, element); break;
				case 'sendTask': this._paintSendTask(x, y, width, height, element); break;
				case 'receiveTask': this._paintReceiveTask(x, y, width, height, element); break;
			}
		};

		ModelBpmn2.prototype._paintEdge = function(bpmnElement, path, startX, startY) {
			var element = this._document.querySelectorAll('*[id="' + bpmnElement + '"]').item(0);
			var shape = this._graphics.path(path);
			shape.attr({'arrow-end':'block-wide-long'});
		};

		ModelBpmn2.prototype._paintParticipant = function(x, y, width, height, element) {
			//var name = this.getElementName(element);
			var shape = this._graphics.rect(x, y, width, height);
			shape.attr('class', element.localName);
			//this._graphics.text(x + 15, y + (height / 2), name).transform('r270');
		};

		ModelBpmn2.prototype._paintLane = function(x, y, width, height, element) {
			var shape = this._graphics.rect(x, y, width, height);
			shape.attr('class', element.localName);
		};

		ModelBpmn2.prototype._paintStartEvent = function(x, y, width, height, element) {
			var shape = this._graphics.circle(x + width / 2, y + height / 2, width / 2);
			shape.attr('class', element.localName);
		};

		ModelBpmn2.prototype._paintEndEvent = function(x, y, width, height, element) {
			var shape = this._graphics.circle(x + width / 2, y + height / 2, width / 2);
			shape.attr('class', element.localName);
		};

		ModelBpmn2.prototype._paintExclusiveGateway = function(x, y, width, height, element) {
			var h2 = height / 2;
			var w2 = width / 2;
			var w = width;
			var h = height;
			var path = 'M'+(x+w2) + ' ' + (y) + 'L'+(x+w) + ' ' +(y+h2) + 'L'+(x+w2) + ' ' +(y+h) + 'L'+(x) + ' ' +(y+h2) + 'L'+(x+w2) + ' ' +(y);
			var shape = this._graphics.path(path);
			shape.attr('class', element.localName);
		};

		ModelBpmn2.prototype._paintTask = function(x, y, width, height, element) {
			var shape = this._graphics.rect(x, y, width, height, 5);
			shape.attr('class', element.localName);
		};

		ModelBpmn2.prototype._paintSendTask = function(x, y, width, height, element) {
			this._paintTask(x, y, width, height, element);
			this._graphics.rect(x + 10, y + 10, 20, 15).attr('fill', 'black');
			this._graphics.path("M"+(x+10)+" "+(y+10)+"L"+(x+20)+" "+(y+20)+ "L" +(x+30)+" "+(y+10)).attr('stroke', 'white');
		};

		ModelBpmn2.prototype._paintReceiveTask = function(x, y, width, height, element) {
			this._paintTask(x, y, width, height, element);
			this._graphics.rect(x + 10, y + 10, 20, 15);
			this._graphics.path("M"+(x+10)+" "+(y+10)+"L"+(x+20)+" "+(y+20)+ "L" +(x+30)+" "+(y+10));
		};

		// ************************************************************************** //
		// Return //
		// ************************************************************************** //

		Bpmn.Models = {};
		Bpmn.Models.ModelBpmn2 = ModelBpmn2;

		Bpmn.Graphics = {};
		Bpmn.Graphics.Svg = QS.Svg;

		return Bpmn;
	})();

})(this);
