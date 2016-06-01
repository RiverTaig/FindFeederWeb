
/* Begin Script: Modules/FindFeeder/colors.js ------------------------- */ 
(function (root, factory) {
	if (typeof exports === 'object') {
		module.exports = factory(root);
	} else if (typeof define === 'function' && define.amd) {
		define('colors', [], function () {
			return factory(root);
		});
	} else {
		root.Colors = factory(root);
	}
}(this, function(window, undefined) {
	"use strict"

	var _valueRanges = {
			rgb:   {r: [0, 255], g: [0, 255], b: [0, 255]},
			hsv:   {h: [0, 360], s: [0, 100], v: [0, 100]},
			hsl:   {h: [0, 360], s: [0, 100], l: [0, 100]},
			alpha: {alpha: [0, 1]},
			HEX:   {HEX: [0, 16777215]} // maybe we don't need this
		},

		_Math = window.Math,
		_round = _Math.round,

		_instance = {},
		_colors = {},

		grey = {r: 0.298954, g: 0.586434, b: 0.114612}, // CIE-XYZ 1931
		luminance = {r: 0.2126, g: 0.7152, b: 0.0722}, // W3C 2.0

		Colors = function(options) {
			this.colors = {RND: {}};
			this.options = {
				color: 'rgba(204, 82, 37, 0.8)', // init value(s)...
				grey: grey,
				luminance: luminance,
				valueRanges: _valueRanges
				// customBG: '#808080'
				// convertCallback: undefined,
				// allMixDetails: false
			};
			initInstance(this, options || {});
		},
		initInstance = function(THIS, options) {
			var importColor,
				_options = THIS.options,
				customBG;

			focusInstance(THIS);
			for (var option in options) {
				if (options[option] !== undefined) _options[option] = options[option];
			}
			customBG = _options.customBG;
			_options.customBG = (typeof customBG === 'string') ? ColorConverter.txt2color(customBG).rgb : customBG;
			_colors = setColor(THIS.colors, _options.color, undefined, true); // THIS.colors = _colors = 
		},
		focusInstance = function(THIS) {
			if (_instance !== THIS) {
				_instance = THIS;
				_colors = THIS.colors;
			}
		};

	Colors.prototype.setColor = function(newCol, type, alpha) {
		focusInstance(this);
		if (newCol) {
			return setColor(this.colors, newCol, type, undefined, alpha);
		} else {
			if (alpha !== undefined) {
				this.colors.alpha = limitValue(alpha, 0, 1);
			}
			return convertColors(type);
		}
	};

	Colors.prototype.setCustomBackground = function(col) { // wild gues,... check again...
		focusInstance(this); // needed???
		this.options.customBG = (typeof col === 'string') ? ColorConverter.txt2color(col).rgb : col;
		// return setColor(this.colors, this.options.customBG, 'rgb', true); // !!!!RGB
		return setColor(this.colors, undefined, 'rgb'); // just recalculate existing
	};

	Colors.prototype.saveAsBackground = function() { // alpha
		focusInstance(this); // needed???
		// return setColor(this.colors, this.colors.RND.rgb, 'rgb', true);
		return setColor(this.colors, undefined, 'rgb', true);
	};

	Colors.prototype.toString = function(colorMode, forceAlpha) {
		return ColorConverter.color2text((colorMode || 'rgb').toLowerCase(), this.colors, forceAlpha);
	};

	// ------------------------------------------------------ //
	// ---------- Color calculation related stuff  ---------- //
	// -------------------------------------------------------//

	function setColor(colors, color, type, save, alpha) { // color only full range
		if (typeof color === 'string') {
			var color = ColorConverter.txt2color(color); // new object
			type = color.type;
			_colors[type] = color[type];
			alpha = alpha !== undefined ? alpha : color.alpha;
		} else if (color) {
			for (var n in color) {
				colors[type][n] = limitValue(color[n] / _valueRanges[type][n][1], 0 , 1);
			}
		}
		if (alpha !== undefined) {
			colors.alpha = limitValue(+alpha, 0, 1);
		}
		return convertColors(type, save ? colors : undefined);
	}

	function saveAsBackground(RGB, rgb, alpha) {
		var grey = _instance.options.grey,
			color = {};

		color.RGB = {r: RGB.r, g: RGB.g, b: RGB.b};
		color.rgb = {r: rgb.r, g: rgb.g, b: rgb.b};
		color.alpha = alpha;
		// color.RGBLuminance = getLuminance(RGB);
		color.equivalentGrey = _round(grey.r * RGB.r + grey.g * RGB.g + grey.b * RGB.b);

		color.rgbaMixBlack = mixColors(rgb, {r: 0, g: 0, b: 0}, alpha, 1);
		color.rgbaMixWhite = mixColors(rgb, {r: 1, g: 1, b: 1}, alpha, 1);
		color.rgbaMixBlack.luminance = getLuminance(color.rgbaMixBlack, true);
		color.rgbaMixWhite.luminance = getLuminance(color.rgbaMixWhite, true);

		if (_instance.options.customBG) {
			color.rgbaMixCustom = mixColors(rgb, _instance.options.customBG, alpha, 1);
			color.rgbaMixCustom.luminance = getLuminance(color.rgbaMixCustom, true);
			_instance.options.customBG.luminance = getLuminance(_instance.options.customBG, true);
		}

		return color;
	}

	function convertColors(type, colorObj) {
		// console.time('convertColors');
		var colors = colorObj || _colors,
			convert = ColorConverter,
			options = _instance.options,
			ranges = _valueRanges,
			RND = colors.RND,
			// type = colorType, // || _mode.type,
			modes, mode = '', from = '', // value = '',
			exceptions = {hsl: 'hsv', rgb: type},
			RGB = RND.rgb, SAVE, SMART;

		if (type !== 'alpha') {
			for (var typ in ranges) {
				if (!ranges[typ][typ]) { // no alpha|HEX
					if (type !== typ) {
						from = exceptions[typ] || 'rgb';
						colors[typ] = convert[from + '2' + typ](colors[from]);
					}

					if (!RND[typ]) RND[typ] = {};
					modes = colors[typ];
					for(mode in modes) {
						RND[typ][mode] = _round(modes[mode] * ranges[typ][mode][1]);
					}
				}
			}

			RGB = RND.rgb;
			colors.HEX = convert.RGB2HEX(RGB);
			colors.equivalentGrey =
				options.grey.r * colors.rgb.r +
				options.grey.g * colors.rgb.g +
				options.grey.b * colors.rgb.b;
			colors.webSave = SAVE = getClosestWebColor(RGB, 51);
			// colors.webSave.HEX = convert.RGB2HEX(colors.webSave);
			colors.webSmart = SMART = getClosestWebColor(RGB, 17);
			// colors.webSmart.HEX = convert.RGB2HEX(colors.webSmart);
			colors.saveColor =
				RGB.r === SAVE.r && RGB.g === SAVE.g && RGB.b === SAVE.b  ? 'web save' :
				RGB.r === SMART.r && RGB.g === SMART.g && RGB.b === SMART.b  ? 'web smart' : '';
			colors.hueRGB = ColorConverter.hue2RGB(colors.hsv.h);

			if (colorObj) {
				colors.background = saveAsBackground(RGB, colors.rgb, colors.alpha);
			}
		} // else RGB = RND.rgb;

		var rgb = colors.rgb, // for better minification...
			alpha = colors.alpha,
			luminance = 'luminance',
			background = colors.background,
			rgbaMixBlack, rgbaMixWhite, rgbaMixCustom, 
			rgbaMixBG, rgbaMixBGMixBlack, rgbaMixBGMixWhite, rgbaMixBGMixCustom;

		rgbaMixBlack = mixColors(rgb, {r: 0, g: 0, b: 0}, alpha, 1);
		rgbaMixBlack[luminance] = getLuminance(rgbaMixBlack, true);
		colors.rgbaMixBlack = rgbaMixBlack;

		rgbaMixWhite = mixColors(rgb, {r: 1, g: 1, b: 1}, alpha, 1);
		rgbaMixWhite[luminance] = getLuminance(rgbaMixWhite, true);
		colors.rgbaMixWhite = rgbaMixWhite;

		if (options.customBG) {
			rgbaMixBGMixCustom = mixColors(rgb, background.rgbaMixCustom, alpha, 1);
			rgbaMixBGMixCustom[luminance] = getLuminance(rgbaMixBGMixCustom, true);
			rgbaMixBGMixCustom.WCAG2Ratio = getWCAG2Ratio(rgbaMixBGMixCustom[luminance],
				background.rgbaMixCustom[luminance]);
			colors.rgbaMixBGMixCustom = rgbaMixBGMixCustom;
			/* ------ */
			rgbaMixBGMixCustom.luminanceDelta = _Math.abs(
				rgbaMixBGMixCustom[luminance] - background.rgbaMixCustom[luminance]);
			rgbaMixBGMixCustom.hueDelta = getHueDelta(background.rgbaMixCustom, rgbaMixBGMixCustom, true);
			/* ------ */
		}

		colors.RGBLuminance = getLuminance(RGB);
		colors.HUELuminance = getLuminance(colors.hueRGB);

		// renderVars.readyToRender = true;
		if (options.convertCallback) {
			options.convertCallback(colors, type); //, convert); //, _mode);
		}

		// console.timeEnd('convertColors')
		// if (colorObj)
		return colors;
	}


	// ------------------------------------------------------ //
	// ------------------ color conversion ------------------ //
	// -------------------------------------------------------//

	var ColorConverter = {
		txt2color: function(txt) {
			var color = {},
				parts = txt.replace(/(?:#|\)|%)/g, '').split('('),
				values = (parts[1] || '').split(/,\s*/),
				type = parts[1] ? parts[0].substr(0, 3) : 'rgb',
				m = '';

			color.type = type;
			color[type] = {};
			if (parts[1]) {
				for (var n = 3; n--; ) {
					m = type[n] || type.charAt(n); // IE7
					color[type][m] = +values[n] / _valueRanges[type][m][1];
				}
			} else {
				color.rgb = ColorConverter.HEX2rgb(parts[0]);
			}
			// color.color = color[type];
			color.alpha = values[3] ? +values[3] : 1;

			return color;
		},

		color2text: function(colorMode, colors, forceAlpha) {
			var alpha = forceAlpha !== false && _round(colors.alpha * 100) / 100,
				hasAlpha = typeof alpha === 'number' &&
					forceAlpha !== false && (forceAlpha || alpha !== 1),
				RGB = colors.RND.rgb,
				HSL = colors.RND.hsl,
				shouldBeHex = colorMode === 'hex' && hasAlpha,
				isHex = colorMode === 'hex' && !shouldBeHex,
				isRgb = colorMode === 'rgb' || shouldBeHex,
				innerText = isRgb ? RGB.r + ', ' + RGB.g + ', ' + RGB.b :
					!isHex ? HSL.h + ', ' + HSL.s + '%, ' + HSL.l + '%' :
					'#' + colors.HEX;

			return isHex ? innerText : (shouldBeHex ? 'rgb' : colorMode) + 
					(hasAlpha ? 'a' : '') + '(' + innerText + (hasAlpha ? ', ' + alpha : '') + ')';
		},

		RGB2HEX: function(RGB) {
			return (
				(RGB.r < 16 ? '0' : '') + RGB.r.toString(16) +
				(RGB.g < 16 ? '0' : '') + RGB.g.toString(16) +
				(RGB.b < 16 ? '0' : '') + RGB.b.toString(16)
			).toUpperCase();
		},

		HEX2rgb: function(HEX) {
			HEX = HEX.split(''); // IE7
			return {
				r: +('0x' + HEX[0] + HEX[HEX[3] ? 1 : 0]) / 255,
				g: +('0x' + HEX[HEX[3] ? 2 : 1] + (HEX[3] || HEX[1])) / 255,
				b: +('0x' + (HEX[4] || HEX[2]) + (HEX[5] || HEX[2])) / 255
			};
		},

		hue2RGB: function(hue) {
			var h = hue * 6,
				mod = ~~h % 6, // _Math.floor(h) -> faster in most browsers
				i = h === 6 ? 0 : (h - mod);

			return {
				r: _round([1, 1 - i, 0, 0, i, 1][mod] * 255),
				g: _round([i, 1, 1, 1 - i, 0, 0][mod] * 255),
				b: _round([0, 0, i, 1, 1, 1 - i][mod] * 255)
			};
		},

		// ------------------------ HSV ------------------------ //

		rgb2hsv: function(rgb) { // faster
			var r = rgb.r,
				g = rgb.g,
				b = rgb.b,
				k = 0, chroma, min, s;

			if (g < b) {
				g = b + (b = g, 0);
				k = -1;
			}
			min = b;
			if (r < g) {
				r = g + (g = r, 0);
				k = -2 / 6 - k;
				min = _Math.min(g, b); // g < b ? g : b; ???
			}
			chroma = r - min;
			s = r ? (chroma / r) : 0;
			return {
				h: s < 1e-15 ? ((_colors && _colors.hsl && _colors.hsl.h) || 0) :
					chroma ? _Math.abs(k + (g - b) / (6 * chroma)) : 0,
				s: r ? (chroma / r) : ((_colors && _colors.hsv && _colors.hsv.s) || 0), // ??_colors.hsv.s || 0
				v: r
			};
		},

		hsv2rgb: function(hsv) {
			var h = hsv.h * 6,
				s = hsv.s,
				v = hsv.v,
				i = ~~h, // _Math.floor(h) -> faster in most browsers
				f = h - i,
				p = v * (1 - s),
				q = v * (1 - f * s),
				t = v * (1 - (1 - f) * s),
				mod = i % 6;

			return {
				r: [v, q, p, p, t, v][mod],
				g: [t, v, v, q, p, p][mod],
				b: [p, p, t, v, v, q][mod]
			};
		},

		// ------------------------ HSL ------------------------ //

		hsv2hsl: function(hsv) {
			var l = (2 - hsv.s) * hsv.v,
				s = hsv.s * hsv.v;

			s = !hsv.s ? 0 : l < 1 ? (l ? s / l : 0) : s / (2 - l);

			return {
				h: hsv.h,
				s: !hsv.v && !s ? ((_colors && _colors.hsl && _colors.hsl.s) || 0) : s, // ???
				l: l / 2
			};
		},

		rgb2hsl: function(rgb, dependent) { // not used in Color
			var hsv = ColorConverter.rgb2hsv(rgb);

			return ColorConverter.hsv2hsl(dependent ? hsv : (_colors.hsv = hsv));
		},

		hsl2rgb: function(hsl) {
			var h = hsl.h * 6,
				s = hsl.s,
				l = hsl.l,
				v = l < 0.5 ? l * (1 + s) : (l + s) - (s * l),
				m = l + l - v,
				sv = v ? ((v - m) / v) : 0,
				sextant = ~~h, // _Math.floor(h) -> faster in most browsers
				fract = h - sextant,
				vsf = v * sv * fract,
				t = m + vsf,
				q = v - vsf,
				mod = sextant % 6;

			return {
				r: [v, q, m, m, t, v][mod],
				g: [t, v, v, q, m, m][mod],
				b: [m, m, t, v, v, q][mod]
			};
		}
	};

	// ------------------------------------------------------ //
	// ------------------ helper functions ------------------ //
	// -------------------------------------------------------//

	function getClosestWebColor(RGB, val) {
		var out = {},
			tmp = 0,
			half = val / 2;

		for (var n in RGB) {
			tmp = RGB[n] % val; // 51 = 'web save', 17 = 'web smart'
			out[n] = RGB[n] + (tmp > half ? val - tmp : -tmp);
		}
		return out;
	}

	function getHueDelta(rgb1, rgb2, nominal) {
		return (_Math.max(rgb1.r - rgb2.r, rgb2.r - rgb1.r) +
				_Math.max(rgb1.g - rgb2.g, rgb2.g - rgb1.g) +
				_Math.max(rgb1.b - rgb2.b, rgb2.b - rgb1.b)) * (nominal ? 255 : 1) / 765;
	}

	function getLuminance(rgb, normalized) {
		var div = normalized ? 1 : 255,
			RGB = [rgb.r / div, rgb.g / div, rgb.b / div],
			luminance = _instance.options.luminance;

		for (var i = RGB.length; i--; ) {
			RGB[i] = RGB[i] <= 0.03928 ? RGB[i] / 12.92 : _Math.pow(((RGB[i] + 0.055) / 1.055), 2.4);
		}
		return ((luminance.r * RGB[0]) + (luminance.g * RGB[1]) + (luminance.b * RGB[2]));
	}

	function mixColors(topColor, bottomColor, topAlpha, bottomAlpha) {
		var newColor = {},
			alphaTop = (topAlpha !== undefined ? topAlpha : 1),
			alphaBottom = (bottomAlpha !== undefined ? bottomAlpha : 1),
			alpha = alphaTop + alphaBottom * (1 - alphaTop); // 1 - (1 - alphaTop) * (1 - alphaBottom);

		for(var n in topColor) {
			newColor[n] = (topColor[n] * alphaTop + bottomColor[n] * alphaBottom * (1 - alphaTop)) / alpha;
		}
		newColor.a = alpha;
		return newColor;
	}

	function getWCAG2Ratio(lum1, lum2) {
		var ratio = 1;

		if (lum1 >= lum2) {
			ratio = (lum1 + 0.05) / (lum2 + 0.05);
		} else {
			ratio = (lum2 + 0.05) / (lum1 + 0.05);
		}
		return _round(ratio * 100) / 100;
	}

	function limitValue(value, min, max) {
		// return _Math.max(min, _Math.min(max, value)); // faster??
		return (value > max ? max : value < min ? min : value);
	}

	return Colors;
}));

/* End Script: Modules/FindFeeder/colors.js ------------------------- */ 


/* Begin Script: Modules/FindFeeder/index.js ------------------------- */ 

/* End Script: Modules/FindFeeder/index.js ------------------------- */ 


/* Begin Script: Modules/FindFeeder/JavaScript1.js ------------------------- */ 
/// <reference path="JavaScript1.js" />

/* End Script: Modules/FindFeeder/JavaScript1.js ------------------------- */ 


/* Begin Script: Resources/TSout/accordion.js ------------------------- */ 
/*
 * Accordion 1.3 - jQuery menu widget
 *
 * Copyright (c) 2006 J�rn Zaefferer, Frank Marcia
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Revision: $Id: jquery.accordion.js 1524 2007-03-13 20:09:19Z joern $
 *
 */

/**
 * Make the selected elements Accordion widgets.
 *
 * Semantic requirements:
 *
 * If the structure of your container is flat with unique
 * tags for header and content elements, eg. a definition list
 * (dl > dt + dd), you don't have to specify any options at
 * all.
 *
 * If your structure uses the same elements for header and
 * content or uses some kind of nested structure, you have to
 * specify the header elements, eg. via class, see the second example.
 *
 * Use activate(Number) to change the active content programmatically.
 *
 * A change event is triggered everytime the accordion changes. Apart from
 * the event object, all arguments are jQuery objects.
 * Arguments: event, newHeader, oldHeader, newContent, oldContent
 *
 * @example jQuery('#nav').Accordion();
 * @before <dl id="nav">
 *   <dt>Header 1</dt>
 *   <dd>Content 1</dd>
 *   <dt>Header 2</dt>
 *   <dd>Content 2</dd>
 * </dl>
 * @desc Creates an Accordion from the given definition list
 *
 * @example jQuery('#nav').Accordion({
 *   header: 'div.title'
 * });
 * @before <div id="nav">
 *  <div>
 *    <div class="title">Header 1</div>
 *    <div>Content 1</div>
 *  </div>
 *  <div>
 *    <div class="title">Header 2</div>
 *    <div>Content 2</div>
 *  </div>
 * </div>
 * @desc Creates an Accordion from the given div structure
 *
 * @example jQuery('#nav').Accordion({
 *   header: 'a.head'
 * });
 * @before <ul id="nav">
 *   <li>
 *     <a class="head">Header 1</a>
 *     <ul>
 *       <li><a href="#">Link 1</a></li>
 *       <li><a href="#">Link 2></a></li>
 *     </ul>
 *   </li>
 *   <li>
 *     <a class="head">Header 2</a>
 *     <ul>
 *       <li><a href="#">Link 3</a></li>
 *       <li><a href="#">Link 4></a></li>
 *     </ul>
 *   </li>
 * </ul>
 * @desc Creates an Accordion from the given navigation list
 *
 * @example jQuery('#accordion').Accordion().change(function(event, newHeader, oldHeader, newContent, oldContent) {
 *   jQuery('#status').html(newHeader.text());
 * });
 * @desc Updates the element with id status with the text of the selected header every time the accordion changes
 *
 * @param Map options key/value pairs of optional settings.
 * @option String|Element|jQuery|Boolean active Selector for the active element, default is the first child, set to false to display none at start
 * @option String|Element|jQuery header Selector for the header element, eg. div.title, a.head, default is the first child's tagname
 * @option String|Number showSpeed Speed for the slideIn, default is 'slow' (for numbers: smaller = faster)
 * @option String|Number hideSpeed Speed for the slideOut, default is 'fast' (for numbers: smaller = faster)
 * @option String selectedClass Class for active header elements, default is 'selected'
 * @option Boolean alwaysOpen Whether there must be one content element open, default is true.
 * @option Boolean animated Set to false to disable animations. Default: true
 * @option String event The event on which to trigger the accordion, eg. "mouseover". Default: "click"
 *
 * @type jQuery
 * @see activate(Number)
 * @name Accordion
 * @cat Plugins/Accordion
 */

/**
 * Activate a content part of the Accordion programmatically at the given zero-based index.
 *
 * If the index is not specified, it defaults to zero, if it is an invalid index, eg. a string,
 * nothing happens.
 *
 * @example jQuery('#accordion').activate(1);
 * @desc Activate the second content of the Accordion contained in <div id="accordion">.
 *
 * @example jQuery('#nav').activate();
 * @desc Activate the first content of the Accordion contained in <ul id="nav">.
 *
 * @param Number index (optional) An Integer specifying the zero-based index of the content to be
 *				 activated. Default: 0
 *
 * @type jQuery
 * @name activate
 * @cat Plugins/Accordion
 */
 
/**
 * Override the default settings of the Accordion. Affects only following plugin calls.
 *
 * @example jQuery.Accordion.setDefaults({
 * 	showSpeed: 1000,
 * 	hideSpeed: 150
 * });
 *
 * @param Map options key/value pairs of optional settings, see Accordion() for details
 *
 * @type jQuery
 * @name setDefaults
 * @cat Plugins/Accordion
 */

jQuery.fn.extend({
	// nextUntil is necessary, would be nice to have this in jQuery core
	nextUntil: function(expr) {
	    var match = [];
	
	    // We need to figure out which elements to push onto the array
	    this.each(function(){
	        // Traverse through the sibling nodes
	        for( var i = this.nextSibling; i; i = i.nextSibling ) {
	            // Make sure that we're only dealing with elements
	            if ( i.nodeType != 1 ) continue;
	
	            // If we find a match then we need to stop
	            if ( jQuery.filter( expr, [i] ).r.length ) break;
	
	            // Otherwise, add it on to the stack
	            match.push( i );
	        }
	    });
	
	    return this.pushStack( match );
	},
	// the plugin method itself
	Accordion: function(settings) {
		// setup configuration
		settings = jQuery.extend({}, jQuery.Accordion.defaults, {
			// define context defaults
			header: jQuery(':first-child', this)[0].tagName // take first childs tagName as header
		}, settings);

		// calculate active if not specified, using the first header
		var container = this,
			active = settings.active
				? jQuery(settings.active, this)
				: settings.active === false
					? jQuery("<div>")
					: jQuery(settings.header, this).eq(0),
			running = 0;

		container.find(settings.header)
			.not(active || "")
			.nextUntil(settings.header)
			.hide();
		active.addClass(settings.selectedClass);

		function clickHandler(event) {
			// get the click target
			var clicked = jQuery(event.target);
			
			// due to the event delegation model, we have to check if one
			// of the parent elements is our actual header, and find that
			if ( clicked.parents(settings.header).length ) {
				while ( !clicked.is(settings.header) ) {
					clicked = clicked.parent();
				}
			}
			
			var clickedActive = clicked[0] == active[0];
			
			// if animations are still active, or the active header is the target, ignore click
			if(running || (settings.alwaysOpen && clickedActive) || !clicked.is(settings.header))
				return;

			// switch classes
			active.toggleClass(settings.selectedClass);
			if ( !clickedActive ) {
				clicked.addClass(settings.selectedClass);
			}

			// find elements to show and hide
			var toShow = clicked.nextUntil(settings.header),
				toHide = active.nextUntil(settings.header),
				data = [clicked, active, toShow, toHide];
			active = clickedActive ? jQuery([]) : clicked;
			// count elements to animate
			running = toHide.size() + toShow.size();
			var finished = function(cancel) {
				running = cancel ? 0 : --running;
				if ( running )
					return;

				// trigger custom change event
				container.trigger("change", data);
			};
			// TODO if hideSpeed is set to zero, animations are crappy
			// workaround: use hide instead
			// solution: animate should check for speed of 0 and do something about it
			if ( settings.animated ) {
				if ( !settings.alwaysOpen && clickedActive ) {
					toShow.slideToggle(settings.showSpeed);
					finished(true);
				} else {
					toHide.filter(":hidden").each(finished).end().filter(":visible").slideUp(settings.hideSpeed, finished);
					toShow.slideDown(settings.showSpeed, finished);
				}
			} else {
				if ( !settings.alwaysOpen && clickedActive ) {
					toShow.toggle();
				} else {
					toHide.hide();
					toShow.show();
				}
				finished(true);
			}

			return false;
		};
		function activateHandlder(event, index) {
			// call clickHandler with custom event
			clickHandler({
				target: jQuery(settings.header, this)[index]
			});
		};

		return container
			.bind(settings.event, clickHandler)
			.bind("activate", activateHandlder);
	},
	// programmatic triggering
	activate: function(index) {
		return this.trigger('activate', [index || 0]);
	}
});

jQuery.Accordion = {};
jQuery.extend(jQuery.Accordion, {
	defaults: {
		selectedClass: "selected",
		showSpeed: 'slow',
		hideSpeed: 'fast',
		alwaysOpen: true,
		animated: true,
		event: "click"
	},
	setDefaults: function(settings) {
		jQuery.extend(jQuery.Accordion.defaults, settings);
	}
});

/* End Script: Resources/TSout/accordion.js ------------------------- */ 


/* Begin Script: Resources/TSout/AcmeUtilities_Modules_ts_out.js ------------------------- */ 
/// <reference path="../Resources/Libs/Framework.d.ts" />
/// <reference path="../Resources/Libs/Mapping.Infrastructure.d.ts" />
var GeocortexCore;
(function (GeocortexCore) {
    var Utilities = (function () {
        function Utilities() {
        }
        Utilities.createNewGcxFeature = function (layerName, site, type, templateName, geometry) {
            if (!templateName) {
                return this.createNewGcxFeature(layerName, site, "default", "default", geometry);
            }
            var featureServices = site.getFeatureServices();
            //debugger;
            var layer;
            var featureTemplate;
            for (var i = 0; i < featureServices.length; i++) {
                if (featureServices[i].serviceLayer && featureServices[i].serviceLayer.name === layerName) {
                    var featureLayer = featureServices[i].serviceLayer;
                    var featureType;
                    if (featureLayer.types.length > 0) {
                        if (type.toLowerCase() === "default") {
                            // Get the first type if we are looking for default
                            featureType = featureLayer.types[0];
                        }
                        else {
                            // Loop through the types to find the one that we want.
                            for (var j = 0; j < featureLayer.types.length; j++) {
                                if (featureLayer.types[j].name === type) {
                                    featureType = featureLayer.types[j];
                                    break; //River added this line
                                }
                            }
                        }
                    }
                    var featureTemplates;
                    if (featureType) {
                        featureTemplates = featureType.templates;
                    }
                    else {
                        featureTemplates = featureLayer.templates;
                    }
                    // If there's more than 1 feature template we need to find the right one.
                    if (featureTemplates && featureTemplates.length > 0) {
                        if (templateName.toLowerCase() === "default") {
                            featureTemplate = featureTemplates[0];
                        }
                        else {
                            for (var k = 0; k < featureLayer.types[j].templates.length; k++) {
                                if (featureLayer.types[j].templates[k].name === templateName) {
                                    featureTemplate = featureLayer.types[j].templates[k];
                                    break;
                                }
                            }
                            if (!featureTemplate) {
                                featureTemplate = featureTemplates[0];
                            }
                        }
                    }
                    layer = featureServices[i].layers[0];
                    if (featureTemplate) {
                        var feature = new esri.Graphic(featureTemplate.prototype.toJson());
                        if (geometry) {
                            feature.setGeometry(geometry);
                        }
                    }
                    else {
                        var feature = new esri.Graphic(null);
                        feature.attributes = {};
                        if (geometry) {
                            feature.setGeometry(geometry);
                        }
                    }
                    var gcxFeature = new geocortex.essentialsHtmlViewer.mapping.infrastructure.Feature({ graphic: feature, layer: layer, resolveLayerFields: true });
                    return gcxFeature;
                }
            }
            return null;
        };
        Utilities.getFeatureService = function (layerName, site) {
            if (!site)
                return;
            var mapServices = site.getFeatureServices();
            if (mapServices && mapServices.length > 0) {
                for (var s in mapServices) {
                    var mapService = mapServices[s];
                    if (mapService.serviceLayer && mapService.serviceLayer.name === layerName) {
                        return mapService.serviceLayer;
                    }
                }
            }
            return null;
        };
        Utilities.getFeatureLayer = function (name, site) {
            var featureServices = site.getFeatureServices();
            var featureLayer;
            featureServices.forEach(function (featureService) {
                if (featureService.serviceLayer && featureService.serviceLayer.name === name) {
                    featureLayer = featureService.serviceLayer;
                    return;
                }
            });
            return featureLayer;
        };
        Utilities.getEssentialsLayer = function (name, site) {
            var essentialsLayer;
            var featureServices = site.getFeatureServices();
            featureServices.forEach(function (featureService) {
                if (featureService.findLayerByName(name)) {
                    essentialsLayer = featureService.findLayerByName(name);
                    return;
                }
            });
            return essentialsLayer;
        };
        Utilities.getMapServiceByLayer = function (layer, site) {
            // If the layer URL is null, it's an offline layer and will have layer metadata containing the online service URL.
            var layerUrl = layer.url || layer["_essentialsMetadata"]["serviceUrl"];
            if (!layerUrl) {
                return null;
            }
            var tokenIx = layerUrl.indexOf("?token=");
            // If the layer is token secured that token will be part of the url
            // If other parameters can be part of the url they may also need to be accounted for here
            // layer._url contains the url without any parameters but as a "private" variable I'd rather not touch it
            if (tokenIx != -1) {
                layerUrl = layerUrl.substring(0, tokenIx);
            }
            for (var i = 0; i < site.essentialsMap.mapServices.length; ++i) {
                var mapService = site.essentialsMap.mapServices[i];
                if (mapService.serviceUrl === layerUrl) {
                    return mapService;
                }
            }
            return null;
        };
        // Copied from geocortex.workflow.DefaultActivityHandlers (Essentials.js)
        Utilities.findMapServiceByMap = function (map, serviceId) {
            if (!map || !serviceId) {
                return null;
            }
            // Search regular layers
            if (map.layerIds != null) {
                for (var i = 0; i < map.layerIds.length; i++) {
                    var layer = map.getLayer(map.layerIds[i]);
                    if (layer != null && geocortex.essentials.utilities.SiteResourceIdComparer.equals(layer.id, serviceId)) {
                        // Found matching map service
                        return layer;
                    }
                }
            }
            // Search graphics layers
            if (map.graphicsLayerIds != null) {
                for (var i = 0; i < map.graphicsLayerIds.length; i++) {
                    var layer = map.getLayer(map.graphicsLayerIds[i]);
                    if (layer != null && geocortex.essentials.utilities.SiteResourceIdComparer.equals(layer.id, serviceId)) {
                        // Found matching map service
                        return layer;
                    }
                }
            }
            return null;
        };
        return Utilities;
    })();
    GeocortexCore.Utilities = Utilities;
})(GeocortexCore || (GeocortexCore = {}));
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../utilities/utilities.ts" />
/// <reference path="../../resources/libs/arcgis-js-api.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederModule = (function (_super) {
        __extends(FindFeederModule, _super);
        function FindFeederModule(app, lib) {
            _super.call(this, app, lib);
            this.viewModel = null;
            this._tieDevices = [];
            this._size = 15;
            this._data = null;
            this._feederExtent = null;
            this._upstreamEIDS = null;
            this._downstreamEIDS = null;
            this.downstreamLayer = null;
            this.upstreamstreamLayer = null;
            this.feederLayer = null;
            this._feederGraphic = null;
            this._upstreamGraphic = null;
            this._downstreamGraphic = null;
            this.esriQuery = null;
            this.esriQueryTask = null;
            this._circleGraphicLayer = null;
            this._token = "";
        }
        FindFeederModule.prototype.clearResults = function () {
            this._data = null;
            this._upstreamEIDS = null;
            this._downstreamEIDS = null;
            this._feederGraphic = null;
            this._upstreamGraphic = null;
            this._downstreamGraphic = null;
            this.upstreamstreamLayer.clear();
            this.downstreamLayer.clear();
            this.feederLayer.clear();
        };
        FindFeederModule.prototype.zoomToFeederClick = function () {
            this.zoomToFeeder(true);
        };
        FindFeederModule.prototype.zoomToFeeder = function (forceZoom) {
            if (this.viewModel.autoZoom.get() || forceZoom) {
                if (this._feederExtent != null) {
                    this.app.map.setExtent(this._feederExtent);
                }
                else if (forceZoom) {
                    alert("Unable to zoom to the feeder.");
                }
            }
        };
        FindFeederModule.prototype.getJson = function () {
            var selectedFeederID = $("#cboFindFeederFeederList").val().split(":")[1];
            this.viewModel.selectedFeeder.set("Looking for Feeder " + $("#cboFindFeederFeederList").val());
            $("#imgSpinner").css("display", "inline");
            //setTimeout(this.getJson2, 1000, this, selectedFeederID);
            this.getJson2(this, selectedFeederID);
        };
        FindFeederModule.prototype.hexToRgb = function (hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        FindFeederModule.prototype.drawJunctionFeederGraphics = function (data) {
        };
        FindFeederModule.prototype.drawFeederGraphics = function () {
            //this._data = data;
            var data = this._data;
            if (data === undefined) {
                return;
            }
            if ($.inArray("feederLayer", this.app.map.graphicsLayerIds) === -1) {
                var fl = new esri.layers.GraphicsLayer();
                fl.id = "feederLayer";
                var dn = new esri.layers.GraphicsLayer();
                dn.id = "downstreamLayer";
                var us = new esri.layers.GraphicsLayer();
                us.id = "upstreamLayer";
                this.app.map.addLayers([fl, dn, us]);
                this.feederLayer = fl;
                this.upstreamstreamLayer = us;
                this.downstreamLayer = dn;
            }
            //this.feederLayer.clear();
            //this.app.map.graphics.clear();
            var lineSymbol = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var rgb = this.hexToRgb(this.viewModel.feederColor.get());
            var red = rgb.r;
            var green = rgb.g;
            var blue = rgb.b;
            lineSymbol.setColor(new esri.Color([red, green, blue, 0.5]));
            var eidToLineGeometry = data.feeder.eidToLineGeometry;
            if (this._feederGraphic === null) {
                var combinedPaths = [];
                for (var i = 0; i < eidToLineGeometry.length; i++) {
                    var singlePath = eidToLineGeometry[i][1];
                    combinedPaths.push(singlePath[0]);
                }
                var polyLine = new esri.geometry.Polyline({
                    "paths": combinedPaths,
                    "spatialReference": { "wkid": 102100 }
                });
                var g = new esri.Graphic(polyLine, lineSymbol);
                this._feederGraphic = g;
                this.feederLayer.add(g);
            }
            this._feederGraphic.setSymbol(lineSymbol);
            //this.app.map.graphics.add(g);
        };
        FindFeederModule.prototype.getJson2 = function (context, selectedFeeder) {
            //var context = this;
            var map = context.app.map;
            var vm = this.viewModel;
            var context = this;
            var urlToJson = "/Html5Viewer260/Resources/Feeders/" + selectedFeeder + ".json";
            $.ajax({
                url: urlToJson
            }).then(function (data) {
                try {
                    vm.data.set(data);
                    /*var tds: any[] = data.feeder.tieDevices[0];
                    //context._tieDevices = tds;
                    vm.tieDevices.set(tds);
                    $('#cboTieDevices').empty()
                    var firstFacID = "";
                    for (var tdIndex = 0; tdIndex < tds.length; tdIndex++)
                    {
                        var facID = tds[tdIndex].FACILITYID;
                        if (firstFacID === "") {
                            firstFacID = facID;
                        }
                        $('#cboTieDevices').append($('<option>', {
                            value: facID,
                            text: facID
                        }));
                    }
                    $("#cboTieDevices").val(firstFacID);*/
                    var feederExtent = new eg.Extent(data.feeder.extent);
                    context._feederExtent = feederExtent;
                    context._data = data;
                    //ffPriOH,ffSecOH,ffOHTotal,ffPriUG,ffSecUG,ffUGTotal
                    vm.ffCustomersA.set(data.feeder.customers.PhaseACustomers);
                    vm.ffCustomersB.set(data.feeder.customers.PhaseBCustomers);
                    vm.ffCustomersC.set(data.feeder.customers.PhaseCCustomers);
                    vm.ffCustomersTotal.set(data.feeder.customers.Total);
                    vm.ffPriOH.set(data.feeder.conductor.priOH);
                    vm.ffPriUG.set(data.feeder.conductor.priUG);
                    vm.ffSecOH.set(data.feeder.conductor.secOH);
                    vm.ffSecUG.set(data.feeder.conductor.secUG);
                    vm.ffOHTotal.set(data.feeder.conductor.ohTotal);
                    vm.ffUGTotal.set(data.feeder.conductor.ugTotal);
                    vm.ffPriTotal.set(data.feeder.conductor.priTotal);
                    vm.ffSecTotal.set(data.feeder.conductor.secTotal);
                    vm.ffConductorTotal.set(data.feeder.conductor.conductorTotal);
                    /*
                    var load: any = data.feeder.load;
                    var customers = data.feeder.customers;
                    var conductor = data.feeder.conductor;
                    var tieDevices = data.feeder.tieDevices;
                    context.viewModel.ffLoadA.set(load["A"].toString());
                    context.viewModel.ffLoadB.set(load["B"].toString());
                    context.viewModel.ffLoadC.set(load["C"].toString());
                    context.viewModel.ffLoadTotal.set(load["Total"].toString());
                    context.viewModel.ffCustomersA.set(customers["A"].toString());
                    context.viewModel.ffCustomersB.set(customers["B"].toString());
                    context.viewModel.ffCustomersC.set(customers["C"].toString());
                    context.viewModel.ffCustomersTotal.set(customers["Total"].toString());
                    context.viewModel.ffConductorA.set(conductor["A"].toString());
                    context.viewModel.ffConductorB.set(conductor["B"].toString());
                    context.viewModel.ffConductorC.set(conductor["C"].toString());
                    context.viewModel.ffConductorTotal.set(conductor["Total"].toString());*/
                    context.drawFeederGraphics();
                }
                finally {
                    $("#imgSpinner").css("display", "none");
                    context.viewModel.selectedFeeder.set("Found Feeder " + selectedFeeder);
                    context.zoomToFeeder(false);
                }
            });
        };
        FindFeederModule.prototype.initialize = function (config) {
            var _this = this;
            this.app.command("doShowArrows").register(this, this.showArrows);
            this.app.command("doClearResults").register(this, this.clearResults);
            this.app.command("doZoomToFeeder").register(this, this.zoomToFeederClick);
            this.app.command("doGetJson").register(this, this.getJson);
            this.app.event("FindFeederViewModelAttached").subscribe(this, function (model) {
                _this.app.map.on("extent-change", function (evt) { _this.FindFeedermapExtentChangeHandler(_this, evt); });
                _this.app.map.on("click", function (evt) { _this.FindFeederMapClickHandler(_this, evt); });
                //alert("from the module");
                _this.viewModel = model;
                var graphicLayers = _this.app.map.graphicsLayerIds;
                for (var i = 0; i < graphicLayers.length; i++) {
                    console.log(graphicLayers[i]);
                }
                //this.viewModel.notifyView(this.app);
            });
        };
        FindFeederModule.prototype.FindFeederMapClickHandler = function (context, evt) {
            if (this.viewModel.showTraceUpDown.get()) {
                //this.viewModel.ffFlowDirectionTraceMode.set(false);
                var eidToUpstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.uptopology.length; eidIndex++) {
                    var eid_upEIDPair = this._data.feeder.uptopology[eidIndex];
                    eidToUpstreamAssocArray[eid_upEIDPair[0]] = eid_upEIDPair[1];
                }
                var eidToDownstreamAssocArray = [];
                for (var eidIndex = 0; eidIndex < this._data.feeder.downTopology.length; eidIndex++) {
                    var eid_downEIDSPair = this._data.feeder.downTopology[eidIndex];
                    eidToDownstreamAssocArray[eid_downEIDSPair[0]] = eid_downEIDSPair[1];
                }
                var eidToLineGeometry = this._data.feeder.eidToLineGeometry;
                var mapPoint = evt.mapPoint;
                var mapPointX = mapPoint.x;
                var mapPointY = mapPoint.y;
                var closestSoFar = 9999;
                var startEID = -9999;
                for (var i = 0; i < eidToLineGeometry.length; i++) {
                    var verticiesOnLineSegment = eidToLineGeometry[i][1][0];
                    for (var j = 0; j < verticiesOnLineSegment.length; j++) {
                        var pointOnLine = verticiesOnLineSegment[j];
                        var pointOnLineX = pointOnLine[0];
                        var pointOnLineY = pointOnLine[1];
                        var dist = ((pointOnLineX - mapPointX) * (pointOnLineX - mapPointX)) + ((pointOnLineY - mapPointY) * (pointOnLineY - mapPointY));
                        if (dist < closestSoFar) {
                            closestSoFar = dist;
                            startEID = eidToLineGeometry[i][0];
                        }
                    }
                }
                //Now that we know the startEID, get the eids that are upstream from it. 
                var currentEID = -1 * startEID;
                var upstreamEdgeEidsToDraw = [];
                while (currentEID != -99999999) {
                    if (currentEID === undefined) {
                        alert("No path found");
                        break;
                    }
                    if (currentEID < 0) {
                        upstreamEdgeEidsToDraw.push(-1 * currentEID);
                    }
                    currentEID = eidToUpstreamAssocArray[currentEID];
                }
                //Now get the downstreamEIDS
                var eidsToVisit = [];
                var downstreamEidsToDraw = [];
                eidsToVisit.push(-1 * startEID);
                var visitIndexPoint = 0;
                while (visitIndexPoint < eidsToVisit.length) {
                    var eid = eidsToVisit[visitIndexPoint];
                    if (eidToDownstreamAssocArray[eid] !== undefined) {
                        for (var i = 0; i < eidToDownstreamAssocArray[eid].length; i++) {
                            var downstreamEID = eidToDownstreamAssocArray[eid][i];
                            eidsToVisit.push(downstreamEID);
                            if (downstreamEID < 0) {
                                downstreamEidsToDraw.push(-1 * downstreamEID);
                            }
                        }
                    }
                    visitIndexPoint++;
                }
                this._upstreamEIDS = upstreamEdgeEidsToDraw;
                this._downstreamEIDS = downstreamEidsToDraw;
                //Now draw the upstream line
                this.drawUpstreamDownstreamLine(true);
            }
        };
        FindFeederModule.prototype.drawUpstreamDownstreamLine = function (refresh) {
            var upstreamEids = this._upstreamEIDS;
            var downstreamEids = this._downstreamEIDS;
            if (upstreamEids === null && downstreamEids === null) {
                return;
            }
            if ((this._upstreamGraphic === null || this._downstreamGraphic === null) || (refresh)) {
                var eidLineGeomAssocArray = [];
                for (var j = 0; j < this._data.feeder.eidToLineGeometry.length; j++) {
                    var edgeEID = this._data.feeder.eidToLineGeometry[j][0];
                    eidLineGeomAssocArray[edgeEID] = this._data.feeder.eidToLineGeometry[j][1];
                }
                var combinedPathsUp = [];
                for (var i = 0; i < upstreamEids.length; i++) {
                    var eid = upstreamEids[i];
                    var singlePath = eidLineGeomAssocArray[eid];
                    combinedPathsUp.push(singlePath[0]);
                }
                var combinedPathsDown = [];
                for (var i = 0; i < downstreamEids.length; i++) {
                    var eid = downstreamEids[i];
                    var singlePath = eidLineGeomAssocArray[eid];
                    combinedPathsDown.push(singlePath[0]);
                }
                var lineSymbolUp = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
                var lineSymbolDown = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
                var rgbUp = this.hexToRgb(this.viewModel.upstreamColor.get());
                var red = rgbUp.r;
                var green = rgbUp.g;
                var blue = rgbUp.b;
                lineSymbolUp.setColor(new esri.Color([red, green, blue, 1]));
                var rgbDown = this.hexToRgb(this.viewModel.downstreamColor.get());
                red = rgbDown.r;
                green = rgbDown.g;
                blue = rgbDown.b;
                lineSymbolDown.setColor(new esri.Color([red, green, blue, 1]));
                var polyLineUp = new esri.geometry.Polyline({
                    "paths": combinedPathsUp,
                    "spatialReference": { "wkid": 102100 }
                });
                var polyLineDown = new esri.geometry.Polyline({
                    "paths": combinedPathsDown,
                    "spatialReference": { "wkid": 102100 }
                });
                var gUp = new esri.Graphic(polyLineUp, lineSymbolUp);
                var gDown = new esri.Graphic(polyLineDown, lineSymbolDown);
                this.upstreamstreamLayer.clear();
                this.downstreamLayer.clear();
                this.upstreamstreamLayer.add(gUp);
                this.downstreamLayer.add(gDown);
                this._upstreamGraphic = gUp;
                this._downstreamGraphic = gDown;
            }
            var lineSymbolUp = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var lineSymbolDown = new esri.symbol.CartographicLineSymbol(esri.symbol.CartographicLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0, .5]), this._size, esri.symbol.CartographicLineSymbol.CAP_ROUND, esri.symbol.CartographicLineSymbol.JOIN_ROUND, "3");
            var rgbUp = this.hexToRgb(this.viewModel.upstreamColor.get());
            var red = rgbUp.r;
            var green = rgbUp.g;
            var blue = rgbUp.b;
            lineSymbolUp.setColor(new esri.Color([red, green, blue, 0.5]));
            var rgbDown = this.hexToRgb(this.viewModel.downstreamColor.get());
            red = rgbDown.r;
            green = rgbDown.g;
            blue = rgbDown.b;
            lineSymbolDown.setColor(new esri.Color([red, green, blue, 0.5]));
            if (this._upstreamGraphic !== null) {
                this._upstreamGraphic.setSymbol(lineSymbolUp);
            }
            if (this._downstreamGraphic !== null) {
                this._downstreamGraphic.setSymbol(lineSymbolDown);
            }
        };
        FindFeederModule.prototype.FindFeedermapExtentChangeHandler = function (context, evt) {
            var w = this.app.map.extent.xmax - this.app.map.extent.xmin;
            var relativeSize = (2000 / w);
            var bufferSize = this.viewModel.numBufferSize.get();
            $('#numBufferChange').val;
            this._size = bufferSize * relativeSize;
            if (this._data !== null) {
                //this._size = 10;
                this.drawFeederGraphics();
                this.drawUpstreamDownstreamLine(false);
            }
        };
        FindFeederModule.prototype.mercatorToLatLon = function (mercX, mercY) {
            var rMajor = 6378137; //Equatorial Radius, WGS84
            var shift = Math.PI * rMajor;
            var lon = mercX / shift * 180.0;
            var lat = mercY / shift * 180.0;
            lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180.0)) - Math.PI / 2.0);
            lon = Math.round(lon * 10000) / 10000;
            lat = Math.round(lat * 10000) / 10000;
            return { 'Lon': lon, 'Lat': lat };
        };
        FindFeederModule.prototype.showArrows = function () {
            alert("No implemented yet");
        };
        FindFeederModule.prototype.drawFlagGraphic = function (pnt) {
            var markerSymbol = new esri.symbol.SimpleMarkerSymbol();
            if (this.flagGraphic !== null) {
                this.app.map.graphics.remove(this.flagGraphic);
            }
            markerSymbol.setPath("M9.5,3v10c8,0,8,4,16,4V7C17.5,7,17.5,3,9.5,3z M6.5,29h2V3h-2V29z");
            markerSymbol.size = 30;
            markerSymbol.setColor(new esri.Color([0, 255, 0, .5]));
            this.flagGraphic = new esri.Graphic(pnt, markerSymbol);
            this.app.map.graphics.add(this.flagGraphic);
        };
        return FindFeederModule;
    })(geocortex.framework.application.ModuleBase);
    FindFeederModules.FindFeederModule = FindFeederModule;
})(FindFeederModules || (FindFeederModules = {}));
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
/// <reference path="../../resources/libs/jquery.d.ts" />
/// <reference path="typeahead.d.ts" />
/// <reference path="../../resources/libs/jqueryui.d.ts" />
/// <reference path="../../resources/libs/jquery.colorpicker.d.ts" />
var eg = esri.geometry;
var et = esri.tasks;
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederView = (function (_super) {
        __extends(FindFeederView, _super);
        function FindFeederView(app, lib) {
            _super.call(this, app, lib);
            this._tieDeviceLayer = null;
            this.states = ['Aa', 'Bb', 'Cc', 'Dd', 'Ee'];
            this._viewModel = null;
        }
        FindFeederView.prototype.PopulateFeederList = function () {
            var _this = this;
            var query = new et.Query();
            query.outFields = ["ID", "CIRCUITNAME"];
            query.where = "1=1";
            query.orderByFields = ["CIRCUITNAME"];
            query.returnDistinctValues = true;
            var url = "http://52.1.143.233/arcgis103/rest/services/Schneiderville/AcmeElectric/MapServer/17";
            var qTasks = new et.QueryTask(url);
            qTasks.execute(query, function (fs) {
                //alert("in complete");
                var cboFindFeederFeederList = $("#cboFindFeederFeederList");
                cboFindFeederFeederList.empty();
                var firstID = fs.features[0].attributes["ID"]; //Used later to trigger a change on the combo box
                _this.states = [];
                for (var i = 0; i < fs.features.length; i++) {
                    var name = fs.features[i].attributes["CIRCUITNAME"];
                    var id = fs.features[i].attributes["ID"];
                    //cboFindFeederFeederList.append("<option value='" + id + "'>" + name + ":" + id + "</option>");
                    _this.states.push(name + ":" + id);
                }
                var substringMatcher = function (strs) {
                    return function findMatches(q, cb) {
                        var matches, substringRegex;
                        // an array that will be populated with substring matches
                        matches = [];
                        // regex used to determine if a string contains the substring `q`
                        var substrRegex = new RegExp(q, 'i');
                        // iterate through the pool of strings and for any string that
                        // contains the substring `q`, add it to the `matches` array
                        $.each(strs, function (i, str) {
                            if (substrRegex.test(str)) {
                                matches.push(str);
                            }
                        });
                        cb(matches);
                    };
                };
                $('#the-basics .typeahead').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 1
                }, {
                    name: 'states',
                    source: substringMatcher(_this.states)
                });
                //$('#cboFindFeederFeederList').val(firstID).trigger('change');
            }, function (err) {
                alert(err.toString());
            });
        };
        FindFeederView.prototype.setTieDeviceData = function () {
            //alert("1");
            var tieDevices = this._viewModel.data.get().feeder.tieDevices[0];
            var tieDevice = $("#cboTieDevices option:selected").index();
            var facID = tieDevices[tieDevice].FACILITYID;
            var feederIDS = tieDevices[tieDevice].FEEDERIDS;
            var streetAddress = tieDevices[tieDevice].STREETADDRESS;
            $('#lblTieDeviceFacilityID').text(facID);
            //$('#lblTieDeviceAddress').text(streetAddress);
            this._viewModel.tieDeviceAddress.set(streetAddress);
            var selectedEID = tieDevices[tieDevice].EID;
            this._viewModel.tieDeviceEID.set(selectedEID);
            //loop through the graphics in the graphics layer and set the selected property = true or false
            if (this._tieDeviceLayer != null) {
                for (var i = 0; i < this._tieDeviceLayer.graphics.length; i++) {
                    var gr = this._tieDeviceLayer.graphics[i];
                    if (gr.attributes["EID"] === selectedEID) {
                        gr.setAttributes({ "SELECTED": "True", "EID": gr.attributes["EID"] });
                    }
                    else {
                        gr.setAttributes({ "SELECTED": "False", "EID": gr.attributes["EID"] });
                    }
                }
                this._tieDeviceLayer.redraw();
            }
            $('#lblTieDeviceFeederIDs').text(feederIDS);
        };
        FindFeederView.prototype.DrawTieDevices = function () {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
                this._tieDeviceLayer.setInfoTemplate;
            }
            this._tieDeviceLayer.clear();
            var tieDevicePointSymbol1 = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 30, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new esri.Color([255, 255, 0]), 2), new esri.Color([255, 255, 0, 0.9]));
            var tieDevicePointSymbol2 = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 20, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new esri.Color([0, 255, 255]), 2), new esri.Color([0, 255, 255, 0.5]));
            var uniqueValuerenderer = new esri.renderer.UniqueValueRenderer(tieDevicePointSymbol1, "SELECTED");
            uniqueValuerenderer.addValue("True", tieDevicePointSymbol1);
            uniqueValuerenderer.addValue("False", tieDevicePointSymbol2);
            //var tieDeviceRenderer = new esri.renderer.SimpleRenderer(tieDevicePointSymbol);
            this._tieDeviceLayer.setRenderer(uniqueValuerenderer);
            var tieDevices = this._viewModel.data.get().feeder.tieDevices[0];
            var eidsToHighlight = {};
            for (var i = 0; i < tieDevices.length; i++) {
                eidsToHighlight[tieDevices[i].EID.toString()] = 1;
            }
            var eid = this._viewModel.tieDeviceEID.get();
            var eidToPointGeoms = this._viewModel.data.get().feeder.eidToPointGeometry;
            for (var i = 0; i < eidToPointGeoms.length; i++) {
                var eidInJson = eidToPointGeoms[i][0];
                if (eidInJson.toString() in eidsToHighlight) {
                    var xy = eidToPointGeoms[i][1];
                    var map = this.app.map;
                    var gra = new esri.Graphic(new esri.geometry.Point(xy[0], xy[1], map.spatialReference));
                    gra.setAttributes({ "SELECTED": "False", "EID": eidInJson.toString() });
                    //gra.setAttributes({ "EID": eidInJson.toString() });
                    /*if (i < 1000) {
                        gra.setAttributes({ "SELECTED": "True" });
                    }
                    else {
                        gra.setAttributes({ "SELECTED": "False" });
                    }*/
                    this._tieDeviceLayer.add(gra);
                }
            }
            this.app.map.addLayer(this._tieDeviceLayer);
        };
        FindFeederView.prototype.ClearTieDevices = function () {
            if (this._tieDeviceLayer == null) {
                this._tieDeviceLayer = new esri.layers.GraphicsLayer();
            }
            this._tieDeviceLayer.clear();
        };
        FindFeederView.prototype.attach = function (viewModel) {
            var _this = this;
            this._viewModel = viewModel;
            _super.prototype.attach.call(this, viewModel);
            this.PopulateFeederList();
            viewModel.data.bind(this, function (data) {
                var tds = data.feeder.tieDevices[0];
                $('#cboTieDevices').empty();
                var firstFacID = "";
                for (var tdIndex = 0; tdIndex < tds.length; tdIndex++) {
                    var facID = tds[tdIndex].FACILITYID;
                    if (firstFacID === "") {
                        firstFacID = facID;
                    }
                    $('#cboTieDevices').append($('<option>', {
                        value: facID,
                        text: facID
                    }));
                }
                $("#cboTieDevices").val(firstFacID);
                _this.setTieDeviceData();
                //this.DrawTieDevices();
            });
            $('#btnZoomToTie').on('click', function (e) {
                var scale = 1;
                if (e.shiftKey) {
                    scale = 2;
                }
                if (e.ctrlKey) {
                    scale = .5;
                }
                if (e.altKey) {
                    if (scale === .5) {
                        scale = .25;
                    }
                    else if (scale === 2) {
                        scale = 4;
                    }
                }
                var eid = viewModel.tieDeviceEID.get();
                var eidToPointGeoms = viewModel.data.get().feeder.eidToPointGeometry;
                for (var i = 0; i < eidToPointGeoms.length; i++) {
                    var eidInJson = eidToPointGeoms[i][0];
                    if (eidInJson.toString() == eid) {
                        var xy = eidToPointGeoms[i][1];
                        var map = _this.app.map;
                        var pnt = new esri.geometry.Point(xy[0], xy[1], map.spatialReference);
                        map.setScale(map.getScale() * scale);
                        map.centerAt(pnt);
                        return;
                    }
                }
            });
            $("#cboTieDevices").on('change', function () {
                _this.setTieDeviceData();
                //this.DrawTieDevices();
            });
            $("#btnSelect").on('click', function () {
                _this.app.command("doSelectFeatures").execute();
            });
            $("#btnZoomTo").on('click', function () {
                _this.app.command("doZoomToFeeder").execute();
            });
            $("#numBuffer").on('change', function () {
                //this.app.command("doZoomToFeeder").execute();
                //var xmin: number = this.app.map.extent.xmin - .001;
                //var xmax: number = this.app.map.extent.xmax - .001;
                //var ymin: number = this.app.map.extent.ymin - .001;
                //var ymax: number = this.app.map.extent.ymax - .001;
                var ext = _this.app.map.extent;
                _this.app.map.setExtent(ext);
            });
            $("#downstreamColor").on('change', function () {
                //this.app.command("doZoomToFeeder").execute();
                var xmin = _this.app.map.extent.xmin - .001;
                var xmax = _this.app.map.extent.xmax - .001;
                var ymin = _this.app.map.extent.ymin - .001;
                var ymax = _this.app.map.extent.ymax - .001;
                var ext = new eg.Extent(xmin, ymin, xmax, ymax, _this.app.map.spatialReference);
                _this.app.map.setExtent(ext);
            });
            $("#btnGetJson").on('click', function () {
                _this.app.command("doGetJson").execute();
            });
            var map = this.app.map;
            $(".lblShowArrows").on('click', function () {
                $(".lblShowArrows").toggleClass("off");
                $(".showArrows").toggleClass("off");
                $(".showArrowsBox").toggleClass("off");
                if ($(".lblShowArrows").hasClass("off")) {
                    viewModel.showArrows.set(false);
                }
                else {
                    viewModel.showArrows.set(true);
                }
            });
            $("#btnClear").on('click', function () {
                _this.app.command("doClearResults").execute();
            });
            $(".lblAutoZoom").on('click', function () {
                //alert(viewModel.autoZoom.get());
                $(".lblAutoZoom").toggleClass("off");
                $(".showAutoZoom").toggleClass("off");
                $(".showAutoZoomBox").toggleClass("off");
                if ($(".lblAutoZoom").hasClass("off")) {
                    viewModel.autoZoom.set(false);
                }
                else {
                    viewModel.autoZoom.set(true);
                }
            });
            $(".lblTraceUpDown").on('click', function () {
                $(".lblTraceUpDown").toggleClass("off");
                $(".traceUpDown").toggleClass("off");
                $(".traceUpDownBox").toggleClass("off");
                if ($(".lblTraceUpDown").hasClass("off")) {
                    viewModel.showTraceUpDown.set(true);
                }
                else {
                    viewModel.showTraceUpDown.set(false);
                }
            });
            $(".lblZoomToUpstream").on('click', function () {
                $(".lblZoomToUpstream").toggleClass("off");
                $(".zoomToUpstream").toggleClass("off");
                $(".zoomToUpstreamBox").toggleClass("off");
                if ($(".lblZoomToUpstream").hasClass("off")) {
                    viewModel.zoomToUpstream.set(true);
                }
                else {
                    viewModel.zoomToUpstream.set(false);
                }
            });
            $(".lblZoomToDownstream").on('click', function () {
                $(".lblZoomToDownstream").toggleClass("off");
                $(".zoomToDownstream").toggleClass("off");
                $(".zoomToDownstreamBox").toggleClass("off");
                if ($(".lblZoomToDownstream").hasClass("off")) {
                    viewModel.zoomToDownstream.set(true);
                }
                else {
                    viewModel.zoomToDownstream.set(false);
                }
            });
            $(".lblTraceFromCache").on('click', function () {
                $(".lblTraceFromCache").toggleClass("off");
                $(".showTrace").toggleClass("off");
                $(".showTraceBox").toggleClass("off");
                if ($(".lblTraceFromCache").hasClass("off")) {
                    viewModel.traceFromCache.set(false);
                }
                else {
                    viewModel.traceFromCache.set(true);
                }
            });
            var context = this;
            this.app.event("FindFeederViewModelAttached").subscribe(this, function (model) {
                //InitJS(window, $,null);
                //Set up accordion control
                var that = _this;
                jQuery('.accordion-section-title').click(function (e) {
                    // Grab current anchor value
                    var currentAttrValue = jQuery(this).attr('href');
                    if (jQuery(e.target).is('.active')) {
                        jQuery('.accordion .accordion-section-title').removeClass('active');
                        jQuery('.accordion .accordion-section-content').slideUp(300).removeClass('open');
                    }
                    else {
                        if ($("#accSelection select option").length == 0) {
                            var mapService = null;
                            for (var i = 0; i < that.app.site.essentialsMap.mapServices.length; i++) {
                                mapService = that.app.site.essentialsMap.mapServices[i];
                                var layers = mapService.layers;
                                for (var j = 0; j < layers.length; j++) {
                                    $('#accSelection select').append($('<option>', {
                                        value: mapService.id + ":" + j,
                                        text: layers[j].name
                                    }));
                                }
                            }
                        }
                        jQuery('.accordion .accordion-section-title').removeClass('active');
                        jQuery('.accordion .accordion-section-content').slideUp(300).removeClass('open');
                        // Add active class to section title
                        jQuery(this).addClass('active');
                        // Open up the hidden content panel
                        jQuery('.accordion ' + currentAttrValue).slideDown(300).addClass('open');
                        if (currentAttrValue.toUpperCase().indexOf("TIEDEVICE") > -1) {
                            that.DrawTieDevices();
                            that.setTieDeviceData();
                        }
                        else {
                            that.ClearTieDevices();
                        }
                    }
                    e.preventDefault();
                });
                var substringMatcher = function (strs) {
                    return function findMatches(q, cb) {
                        var matches, substringRegex;
                        // an array that will be populated with substring matches
                        matches = [];
                        // regex used to determine if a string contains the substring `q`
                        var substrRegex = new RegExp(q, 'i');
                        // iterate through the pool of strings and for any string that
                        // contains the substring `q`, add it to the `matches` array
                        $.each(strs, function (i, str) {
                            if (substrRegex.test(str)) {
                                matches.push(str);
                            }
                        });
                        cb(matches);
                    };
                };
                //var states = ['A', 'B', 'C', 'D', 'E'];
                /*
                $('#the-basics .typeahead').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 1
                },
                {
                    name: 'states',
                    source: substringMatcher(context.states)
                });
                */
            });
            this.app.event("FindFeederViewModelAttached").publish(viewModel);
        };
        return FindFeederView;
    })(geocortex.framework.ui.ViewBase);
    FindFeederModules.FindFeederView = FindFeederView;
})(FindFeederModules || (FindFeederModules = {}));
function AttachTypeAhead() {
}
/// <reference path="../../Resources/Libs/Framework.d.ts" />
/// <reference path="../../Resources/Libs/Mapping.Infrastructure.d.ts" />
var FindFeederModules;
(function (FindFeederModules) {
    var FindFeederViewModel = (function (_super) {
        __extends(FindFeederViewModel, _super);
        function FindFeederViewModel(app, lib) {
            _super.call(this, app, lib);
            this.numRadius = new Observable();
            this.tieDevices = new Observable();
            this.tieDeviceEID = new Observable();
            this.tieDeviceAddress = new Observable();
            this.showArrows = new Observable();
            this.downstreamColor = new Observable();
            this.feederColor = new Observable();
            this.upstreamColor = new Observable();
            this.showTraceUpDown = new Observable();
            this.zoomToUpstream = new Observable();
            this.zoomToDownstream = new Observable();
            this.autoZoom = new Observable();
            this.traceFromCache = new Observable();
            this.zoomToSource = new Observable();
            this.urlToLayerWeWantToSelect = new Observable();
            this.selectedFeeder = new Observable();
            this.ffLoadA = new Observable();
            this.ffLoadB = new Observable();
            this.ffLoadC = new Observable();
            this.ffLoadTotal = new Observable();
            this.ffCustomersA = new Observable();
            this.ffCustomersB = new Observable();
            this.ffCustomersC = new Observable();
            this.ffCustomersTotal = new Observable();
            this.numBuffer = new Observable();
            this.ffConductorTotal = new Observable();
            this.numBufferSize = new Observable();
            this.ffPriUG = new Observable();
            this.ffSecUG = new Observable();
            this.ffPriOH = new Observable();
            this.ffSecOH = new Observable();
            this.ffUGTotal = new Observable();
            this.ffOHTotal = new Observable();
            this.data = new Observable();
            this.ffPriTotal = new Observable();
            this.ffSecTotal = new Observable();
            this.ffFlowDirectionTraceMode = new Observable();
        }
        FindFeederViewModel.prototype.initialize = function (config) {
            this.autoZoom.set(true);
            this.feederColor.set("#FF0000");
            this.upstreamColor.set("#00FF00");
            this.downstreamColor.set("#0000FF");
            this.numBufferSize.set(25);
        };
        return FindFeederViewModel;
    })(geocortex.framework.ui.ViewModelBase);
    FindFeederModules.FindFeederViewModel = FindFeederViewModel;
})(FindFeederModules || (FindFeederModules = {}));
//# sourceMappingURL=AcmeUtilities_Modules_ts_out.js.map

/* End Script: Resources/TSout/AcmeUtilities_Modules_ts_out.js ------------------------- */ 

geocortex.resourceManager.register("FindFeederModules","inv","Modules/FindFeeder/acc.html","html","PGh0bWw+DQo8aGVhZD4NCgk8bGluayByZWw9InN0eWxlc2hlZXQiIHR5cGU9InRleHQvY3NzIiBocmVmPSIuLi9hc3NldHMtMi9jc3MvcmVzZXQuY3NzIj4NCgk8bGluayByZWw9InN0eWxlc2hlZXQiIHR5cGU9InRleHQvY3NzIiBocmVmPSJodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2Nzcz9mYW1pbHk9QWJlZXplZTo0MDB8T3BlbitTYW5zOjQwMCw2MDAsNzAwfFNvdXJjZStTYW5zK1Bybzo0MDAsNjAwIj4NCgk8bGluayByZWw9InN0eWxlc2hlZXQiIHR5cGU9InRleHQvY3NzIiBocmVmPSJkZWZhdWx0cy5jc3MiPg0KCTxsaW5rIHJlbD0ic3R5bGVzaGVldCIgdHlwZT0idGV4dC9jc3MiIGhyZWY9ImRlbW8uY3NzIj4NCg0KCTxzY3JpcHQgdHlwZT0idGV4dC9qYXZhc2NyaXB0IiBzcmM9ImpxLW1pbi5qcyI+PC9zY3JpcHQ+DQoJPHNjcmlwdCB0eXBlPSJ0ZXh0L2phdmFzY3JpcHQiIHNyYz0iYWNjb3JkaW9uLmpzIj48L3NjcmlwdD4NCg0KDQo8L2hlYWQ+DQo8Ym9keT4NCnRpdGxlDQoJPGRpdiBjbGFzcz0ibWFpbiI+DQoJCTxkaXYgY2xhc3M9ImFjY29yZGlvbiI+DQoJCQk8ZGl2IGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbiI+DQoJCQkJPGEgY2xhc3M9ImFjY29yZGlvbi1zZWN0aW9uLXRpdGxlIiBocmVmPSIjYWNjb3JkaW9uLTEiPkFjY29yZGlvbiBTZWN0aW9uICMxPC9hPg0KCQkJCTxkaXYgaWQ9ImFjY29yZGlvbi0xIiBjbGFzcz0iYWNjb3JkaW9uLXNlY3Rpb24tY29udGVudCI+DQoJCQkJCTxwPk1hdXJpcyBpbnRlcmR1bSBmcmluZ2lsbGEgYXVndWUgdml0YWUgdGluY2lkdW50LiBDdXJhYml0dXIgdml0YWUgdG9ydG9yIGlkIGVyb3MgZXVpc21vZCB1bHRyaWNlcy4gQ3VtIHNvY2lpcyBuYXRvcXVlIHBlbmF0aWJ1cyBldCBtYWduaXMgZGlzIHBhcnR1cmllbnQgbW9udGVzLCBuYXNjZXR1ciByaWRpY3VsdXMgbXVzLiBQcmFlc2VudCBudWxsYSBtaSwgcnV0cnVtIHV0IGZldWdpYXQgYXQsIHZlc3RpYnVsdW0gdXQgbmVxdWU/IENyYXMgdGluY2lkdW50IGVuaW0gdmVsIGFsaXF1ZXQgZmFjaWxpc2lzLiBEdWlzIGNvbmd1ZSB1bGxhbWNvcnBlciB2ZWhpY3VsYS4gUHJvaW4gbnVuYyBsYWN1cywgc2VtcGVyIHNpdCBhbWV0IGVsaXQgc2l0IGFtZXQsIGFsaXF1ZXQgcHVsdmluYXIgZXJhdC4gTnVuYyBwcmV0aXVtIHF1aXMgc2FwaWVuIGV1IHJob25jdXMuIFN1c3BlbmRpc3NlIG9ybmFyZSBncmF2aWRhIG1pLCBldCBwbGFjZXJhdCB0ZWxsdXMgdGVtcG9yIHZpdGFlLjwvcD4NCgkJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi1jb250ZW50LS0+DQoJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi0tPg0KDQoJCQk8ZGl2IGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbiI+DQoJCQkJPGEgY2xhc3M9ImFjY29yZGlvbi1zZWN0aW9uLXRpdGxlIiBocmVmPSIjYWNjb3JkaW9uLTIiPkFjY29yZGlvbiBTZWN0aW9uICMyPC9hPg0KCQkJCTxkaXYgaWQ9ImFjY29yZGlvbi0yIiBjbGFzcz0iYWNjb3JkaW9uLXNlY3Rpb24tY29udGVudCI+DQoJCQkJCTxwPk1hdXJpcyBpbnRlcmR1bSBmcmluZ2lsbGEgYXVndWUgdml0YWUgdGluY2lkdW50LiBDdXJhYml0dXIgdml0YWUgdG9ydG9yIGlkIGVyb3MgZXVpc21vZCB1bHRyaWNlcy4gQ3VtIHNvY2lpcyBuYXRvcXVlIHBlbmF0aWJ1cyBldCBtYWduaXMgZGlzIHBhcnR1cmllbnQgbW9udGVzLCBuYXNjZXR1ciByaWRpY3VsdXMgbXVzLiBQcmFlc2VudCBudWxsYSBtaSwgcnV0cnVtIHV0IGZldWdpYXQgYXQsIHZlc3RpYnVsdW0gdXQgbmVxdWU/IENyYXMgdGluY2lkdW50IGVuaW0gdmVsIGFsaXF1ZXQgZmFjaWxpc2lzLiBEdWlzIGNvbmd1ZSB1bGxhbWNvcnBlciB2ZWhpY3VsYS4gUHJvaW4gbnVuYyBsYWN1cywgc2VtcGVyIHNpdCBhbWV0IGVsaXQgc2l0IGFtZXQsIGFsaXF1ZXQgcHVsdmluYXIgZXJhdC4gTnVuYyBwcmV0aXVtIHF1aXMgc2FwaWVuIGV1IHJob25jdXMuIFN1c3BlbmRpc3NlIG9ybmFyZSBncmF2aWRhIG1pLCBldCBwbGFjZXJhdCB0ZWxsdXMgdGVtcG9yIHZpdGFlLjwvcD4NCgkJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi1jb250ZW50LS0+DQoJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi0tPg0KDQoJCQk8ZGl2IGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbiI+DQoJCQkJPGEgY2xhc3M9ImFjY29yZGlvbi1zZWN0aW9uLXRpdGxlIiBocmVmPSIjYWNjb3JkaW9uLTMiPkFjY29yZGlvbiBTZWN0aW9uICMzPC9hPg0KCQkJCTxkaXYgaWQ9ImFjY29yZGlvbi0zIiBjbGFzcz0iYWNjb3JkaW9uLXNlY3Rpb24tY29udGVudCI+DQoJCQkJCTxwPk1hdXJpcyBpbnRlcmR1bSBmcmluZ2lsbGEgYXVndWUgdml0YWUgdGluY2lkdW50LiBDdXJhYml0dXIgdml0YWUgdG9ydG9yIGlkIGVyb3MgZXVpc21vZCB1bHRyaWNlcy4gQ3VtIHNvY2lpcyBuYXRvcXVlIHBlbmF0aWJ1cyBldCBtYWduaXMgZGlzIHBhcnR1cmllbnQgbW9udGVzLCBuYXNjZXR1ciByaWRpY3VsdXMgbXVzLiBQcmFlc2VudCBudWxsYSBtaSwgcnV0cnVtIHV0IGZldWdpYXQgYXQsIHZlc3RpYnVsdW0gdXQgbmVxdWU/IENyYXMgdGluY2lkdW50IGVuaW0gdmVsIGFsaXF1ZXQgZmFjaWxpc2lzLiBEdWlzIGNvbmd1ZSB1bGxhbWNvcnBlciB2ZWhpY3VsYS4gUHJvaW4gbnVuYyBsYWN1cywgc2VtcGVyIHNpdCBhbWV0IGVsaXQgc2l0IGFtZXQsIGFsaXF1ZXQgcHVsdmluYXIgZXJhdC4gTnVuYyBwcmV0aXVtIHF1aXMgc2FwaWVuIGV1IHJob25jdXMuIFN1c3BlbmRpc3NlIG9ybmFyZSBncmF2aWRhIG1pLCBldCBwbGFjZXJhdCB0ZWxsdXMgdGVtcG9yIHZpdGFlLjwvcD4NCgkJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi1jb250ZW50LS0+DQoJCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tc2VjdGlvbi0tPg0KCQk8L2Rpdj48IS0tZW5kIC5hY2NvcmRpb24tLT4NCgk8L2Rpdj4NCjwvYm9keT4NCjwvaHRtbD4NCg==");
geocortex.resourceManager.register("FindFeederModules","inv","Modules/FindFeeder/FindFeederView.html","html","PGRpdiBjbGFzcz0iRmluZEZlZWRlci1tb2R1bGUtdmlldyI+DQogICAgPGRpdiBjbGFzcz0iaGVsbG9PZmZzZXQiPg0KICAgICAgICA8YnIgLz4NCiAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbFRleHQiIGlkPSJsYmxTZWN0aW9uSGFuZGxlciI+U2VsZWN0IGEgRmVlZGVyIDwvbGFiZWw+PGJyIC8+PGJyIC8+DQogICAgICAgIDxkaXYgaWQ9InRoZS1iYXNpY3MiPg0KICAgICAgICAgICAgPGlucHV0IGlkPSJjYm9GaW5kRmVlZGVyRmVlZGVyTGlzdCIgY2xhc3M9InR5cGVhaGVhZCIgdHlwZT0idGV4dCIgcGxhY2Vob2xkZXI9IkZlZWRlcnMiPg0KICAgICAgICAgICAgPGltZyBjbGFzcz0iYWxsaWduZWRJbWFnZSIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL2Fycm93LXJpZ2h0LTI0LnBuZyIgaWQ9ImJ0bkdldEpzb24iIC8+DQogICAgICAgIDwvZGl2Pg0KICAgICAgICA8ZGl2Pg0KICAgICAgICAgICAgPCEtLQ0KICAgICAgICAgICAgPHNlbGVjdCBpZD0iY2JvRmluZEZlZWRlckZlZWRlckxpc3QiIHN0eWxlPSJ3aWR0aDo3MCUiPg0KDQogICAgICAgICAgICA8L3NlbGVjdD4NCiAgICAgICAgICAgIDxpbWcgY2xhc3M9ImFsbGlnbmVkSW1hZ2UiIHNyYz0iLi4vR2VvY29ydGV4L0Vzc2VudGlhbHMvQXJjRk1XZWI0NTAvUkVTVC9zaXRlcy9GaW5kX0ZlZWRlcnMvVmlld2Vycy9GaW5kX0ZlZWRlcnMvVmlydHVhbERpcmVjdG9yeS9SZXNvdXJjZXMvSW1hZ2VzL0N1c3RvbS9hcnJvdy1yaWdodC0yNC5wbmciIGlkPSJidG5HZXRKc29uIiAvPi0tPg0KICAgICAgICAgICAgPGJyIC8+DQogICAgICAgICAgICA8ZGl2Pg0KICAgICAgICAgICAgICAgIDxzcGFuPg0KICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPSJhbGxpZ25lZEltYWdlIiBzcmM9Ii4uL0dlb2NvcnRleC9Fc3NlbnRpYWxzL0FyY0ZNV2ViNDUwL1JFU1Qvc2l0ZXMvRmluZF9GZWVkZXJzL1ZpZXdlcnMvRmluZF9GZWVkZXJzL1ZpcnR1YWxEaXJlY3RvcnkvUmVzb3VyY2VzL0ltYWdlcy9DdXN0b20vZ3JlZW5fcm90LmdpZiIgc3R5bGU9ImRpc3BsYXk6bm9uZTttYXJnaW4tcmlnaHQ6NXB4OyIgaWQ9ImltZ1NwaW5uZXIiIC8+DQogICAgICAgICAgICAgICAgICAgIDxsYWJlbCBpZD0iZmluZEZlZWRlclNlbGVjdGVkRmVlZGVyIiBkYXRhLWJpbmRpbmc9IntAdGV4dDogc2VsZWN0ZWRGZWVkZXJ9Ij48L2xhYmVsPg0KICAgICAgICAgICAgICAgIDwvc3Bhbj4NCiAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPGJyIC8+DQogICAgICAgIDwvZGl2Pg0KICAgICAgICA8ZGl2IGlkPSJhY2NvcmRpb25Db250cm9sIiBjbGFzcz0iYWNjb3JkaW9uIj4NCiAgICAgICAgICAgIDxkaXYgY2xhc3M9ImNvbnRhaW5lciBhY2NvcmRpb24tc2VjdGlvbiI+DQoNCiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9InNlY3Rpb25IZWFkZXIgYWNjb3JkaW9uLXNlY3Rpb24tdGl0bGUiIGhyZWY9IiNhY2NMb2NhdGlvbiIgaWQ9ImxibFNlY3Rpb25IYW5kbGVyIj5WSUVXIDwvbGFiZWw+DQogICAgICAgICAgICAgICAgPGRpdiBpZD0iYWNjTG9jYXRpb24iIGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbi1jb250ZW50Ij4NCiAgICAgICAgICAgICAgICAgICAgPGRpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGFiZWxUZXh0Ij5GZWVkZXIgQ29sb3I6IDwvbGFiZWw+PGlucHV0IGlkPSJkb3duc3RyZWFtQ29sb3IiIHN0eWxlPSJ3aWR0aDozNXB4O2hlaWdodDozNXB4OyIgdmFsdWU9IiNGRjMzMTEiIHR5cGU9ImNvbG9yIiBkYXRhLWJpbmRpbmc9IntAdmFsdWU6IGZlZWRlckNvbG9yfSIgLz4NCiAgICAgICAgICAgICAgICAgICAgPC9kaXY+DQogICAgICAgICAgICAgICAgICAgIDxkaXY+DQogICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9ImxibEF1dG9ab29tIj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPSJzaG93QXV0b1pvb21Cb3ggb2ZmIiBzcmM9Ii4uL0dlb2NvcnRleC9Fc3NlbnRpYWxzL0FyY0ZNV2ViNDUwL1JFU1Qvc2l0ZXMvRmluZF9GZWVkZXJzL1ZpZXdlcnMvRmluZF9GZWVkZXJzL1ZpcnR1YWxEaXJlY3RvcnkvUmVzb3VyY2VzL0ltYWdlcy9DdXN0b20vYm94LnBuZyIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPSJzaG93QXV0b1pvb20iIHNyYz0iLi4vR2VvY29ydGV4L0Vzc2VudGlhbHMvQXJjRk1XZWI0NTAvUkVTVC9zaXRlcy9GaW5kX0ZlZWRlcnMvVmlld2Vycy9GaW5kX0ZlZWRlcnMvVmlydHVhbERpcmVjdG9yeS9SZXNvdXJjZXMvSW1hZ2VzL0N1c3RvbS90aWNrLnBuZyIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICBBdXRvLVpvb20gdG8gRmVlZGVyDQogICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPg0KICAgICAgICAgICAgICAgICAgICAgICAgPGltZyBjbGFzcz0iYWxsaWduZWRJbWFnZSIgc3R5bGU9Im1hcmdpbi1sZWZ0OjVweDsiIHNyYz0iLi4vR2VvY29ydGV4L0Vzc2VudGlhbHMvQXJjRk1XZWI0NTAvUkVTVC9zaXRlcy9GaW5kX0ZlZWRlcnMvVmlld2Vycy9GaW5kX0ZlZWRlcnMvVmlydHVhbERpcmVjdG9yeS9SZXNvdXJjZXMvSW1hZ2VzL0N1c3RvbS9ab29tVG8ucG5nIiBpZD0iYnRuWm9vbVRvIiAvPg0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj48YnIgLz4NCiAgICAgICAgICAgICAgICAgICAgPGRpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGJsQnVmZmVyU2l6ZSI+QnVmZmVyIFNpemU6IDwvbGFiZWw+DQogICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgaWQ9Im51bUJ1ZmZlciIgY2xhc3M9InNtYWxsVGV4dEJveCIgdHlwZT0ibnVtYmVyIiB2YWx1ZT0iMjUiIGRhdGEtYmluZGluZz0ie0B2YWx1ZTogbnVtQnVmZmVyU2l6ZX0iIG1pbj0iMSIgbWF4PSIzMCIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxiciAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9ImJ1dHRvbiIgY2xhc3M9ImxhcmdlQnV0dG9uIiBpZD0iYnRuQ2xlYXIiIHZhbHVlPSJDbGVhciIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0NCiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYmxTaG93QXJyb3dzIj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9InNob3dBcnJvd3NCb3giIHNyYz0iLi4vR2VvY29ydGV4L0Vzc2VudGlhbHMvQXJjRk1XZWI0NTAvUkVTVC9zaXRlcy9GaW5kX0ZlZWRlcnMvVmlld2Vycy9GaW5kX0ZlZWRlcnMvVmlydHVhbERpcmVjdG9yeS9SZXNvdXJjZXMvSW1hZ2VzL0N1c3RvbS9ib3gucG5nIiAgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9InNob3dBcnJvd3Mgb2ZmIiBzcmM9Ii4uL0dlb2NvcnRleC9Fc3NlbnRpYWxzL0FyY0ZNV2ViNDUwL1JFU1Qvc2l0ZXMvRmluZF9GZWVkZXJzL1ZpZXdlcnMvRmluZF9GZWVkZXJzL1ZpcnR1YWxEaXJlY3RvcnkvUmVzb3VyY2VzL0ltYWdlcy9DdXN0b20vdGljay5wbmciICAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgU2hvdyBGbG93IEFycm93cw0KICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPi0tPg0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj48YnIgLz4NCiAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPGRpdiBjbGFzcz0iY29udGFpbmVyIGFjY29yZGlvbi1zZWN0aW9uIj4NCiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9InNlY3Rpb25IZWFkZXIgYWNjb3JkaW9uLXNlY3Rpb24tdGl0bGUiIGhyZWY9IiNhY2NUaWVEZXZpY2VzIj5USUUgREVWSUNFUzwvbGFiZWw+DQogICAgICAgICAgICAgICAgPGRpdiBpZD0iYWNjVGllRGV2aWNlcyIgY2xhc3M9ImFjY29yZGlvbi1zZWN0aW9uLWNvbnRlbnQiPg0KICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9ImxhYmVsVGV4dCI+U2VsZWN0IFRpZSBEZXZpY2U8L2xhYmVsPg0KICAgICAgICAgICAgICAgICAgICA8ZGl2Pg0KICAgICAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCBpZD0iY2JvVGllRGV2aWNlcyI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLTxvcHRpb24gdmFsdWU9IngiIGNvbnRleHRtZW51PSJ4Ij5TVzEyMzQgfCBBQkMgLSBERUY8L29wdGlvbj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9InkiIGNvbnRleHRtZW51PSJ5Ij5TVzEyMzUgfCBBQkMgLSBERUY8L29wdGlvbj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9InoiIGNvbnRleHRtZW51PSJ6Ij5TVzEyMzYgfCBBQkMgLSBERUY8L29wdGlvbj4tLT4NCiAgICAgICAgICAgICAgICAgICAgICAgIDwvc2VsZWN0Pg0KICAgICAgICAgICAgICAgICAgICAgICAgPGltZyBjbGFzcz0iYWxsaWduZWRJbWFnZSIgaWQ9ImJ0blpvb21Ub1RpZSIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL1pvb21Jbk91dC5wbmciIC8+DQogICAgICAgICAgICAgICAgICAgICAgICA8IS0tPGltZyBjbGFzcz0iYWxsaWduZWRJbWFnZSIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL2hhbmQucG5nIiAvPi0tPg0KDQogICAgICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgICAgICAgICA8IS0tPGRpdiBpZD0idGllRGV2aWNlQXR0cmlidXRlcyI+QXR0cmlidXRlcyBvZiBzZWxlY3RlZCBUaWUgRGV2aWNlOiA8c3BhbiBpZD0iYXR0cmlidXRlc09mVGV4dCI+LS0tPC9zcGFuPjwvZGl2Pi0tPg0KICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPSJ0YWJsZSI+DQogICAgICAgICAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9ImZpbmRGZWVkZXJUYWJsZSBmaXJzdENoaWxkQm9sZCIgYm9yZGVyPSIwIj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGg+RklFTEQ8L3RoPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0aD5WQUxVRTwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5GYWNpbGl0eUlEPC90ZD48dGQ+PGxhYmVsIGlkPSJsYmxUaWVEZXZpY2VGYWNpbGl0eUlEIiBkYXRhLWJpbmRpbmc9IntAdGV4dDogdGllRGV2aWNlRmFjaWxpdHlJRH0iPjwvbGFiZWw+PC90ZD48L3RyPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+RmVlZGVySURzPC90ZD48dGQ+PGxhYmVsIGlkPSJsYmxUaWVEZXZpY2VGZWVkZXJJRHMiIGRhdGEtYmluZGluZz0ie0B0ZXh0OiB0aWVEZXZpY2VGZWVkZXJJRHN9Ij48L2xhYmVsPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPkFkZHJlc3M8L3RkPjx0ZD48bGFiZWwgaWQ9Inh4eCIgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IHRpZURldmljZUFkZHJlc3N9Ij48L2xhYmVsPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8IS0tPHRyPjx0ZD5YLFk8L3RkPjx0ZD48bGFiZWwgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IHRpZURldmljZVhZfSI+PC9sYWJlbD48L3RkPjwvdHI+LS0+DQoNCiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGFibGU+DQogICAgICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPC9kaXY+DQogICAgICAgICAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIgYWNjb3JkaW9uLXNlY3Rpb24iPg0KICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ic2VjdGlvbkhlYWRlciBhY2NvcmRpb24tc2VjdGlvbi10aXRsZSIgaHJlZj0iI2FjY0xvYWQiPkxPQUQ8L2xhYmVsPg0KICAgICAgICAgICAgICAgIDxkaXYgaWQ9ImFjY0xvYWQiIGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbi1jb250ZW50Ij4NCiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbFRleHQiPkxvYWQgRG93bnN0cmVhbSBmcm9tIFNvdXJjZTwvbGFiZWw+PGJyIC8+DQogICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9InRhYmxlIj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDx0YWJsZSBjbGFzcz0iZmluZEZlZWRlclRhYmxlIGZpcnN0Q2hpbGRCb2xkIiBib3JkZXI9IjAiPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0aD5QSEFTRTwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoPktWQTwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5BPC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZkxvYWRBfSI+PC9sYWJlbD48L3RkPjwvdHI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5CPC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZkxvYWRCfSI+PC9sYWJlbD48L3RkPjwvdHI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5DPC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZkxvYWRDfSI+PC9sYWJlbD48L3RkPjwvdHI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UT1RBTDwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZMb2FkVG90YWx9Ij48L2xhYmVsPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGFibGU+DQogICAgICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPC9kaXY+DQogICAgICAgICAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIgYWNjb3JkaW9uLXNlY3Rpb24iPg0KICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ic2VjdGlvbkhlYWRlciBhY2NvcmRpb24tc2VjdGlvbi10aXRsZSIgaHJlZj0iI2FjY0NvbmR1Y3RvciI+Q09ORFVDVE9SPC9sYWJlbD4NCiAgICAgICAgICAgICAgICA8ZGl2IGlkPSJhY2NDb25kdWN0b3IiIGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbi1jb250ZW50Ij4NCiAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYWJlbFRleHQiPkNvbmR1Y3RvciBEb3duc3RyZWFtIGZyb20gU291cmNlPC9sYWJlbD48YnIgLz4NCiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD0idGFibGUiPg0KICAgICAgICAgICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPSJmaW5kRmVlZGVyVGFibGUgZmlyc3RDaGlsZEJvbGQiIGJvcmRlcj0iMCI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoPlR5cGU8L3RoPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0aD5PdmVyaGVhZDwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoPlVuZGVyZ3JvdW5kPC90aD4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGg+VG90YWw8L3RoPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+UHJpbWFyeTwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZQcmlPSH0iPjwvbGFiZWw+PC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZlByaVVHfSI+PC9sYWJlbD48L3RkPjx0ZD48bGFiZWwgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IGZmUHJpVG90YWx9Ij48L2xhYmVsPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPlNlY29uZGFyeTwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZTZWNPSH0iPC9sYWJlbD48L3RkPjx0ZD48bGFiZWwgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IGZmU2VjVUd9Ij48L2xhYmVsPjwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZTZWNUb3RhbH0iPjwvbGFiZWw+PC90ZD48L3RyPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VE9UQUxTPC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZk9IVG90YWx9Ij48L3RkPjx0ZD48bGFiZWwgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IGZmVUdUb3RhbH0iPjwvbGFiZWw+PC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZkNvbmR1Y3RvclRvdGFsfSI+PC9sYWJlbD48L3RkPjwvdHI+DQogICAgICAgICAgICAgICAgICAgICAgICA8L3RhYmxlPg0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPGRpdiBjbGFzcz0iY29udGFpbmVyIGFjY29yZGlvbi1zZWN0aW9uIj4NCiAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9InNlY3Rpb25IZWFkZXIgYWNjb3JkaW9uLXNlY3Rpb24tdGl0bGUiIGhyZWY9IiNhY2NDdXN0b21lcnMiPkNVU1RPTUVSUzwvbGFiZWw+DQogICAgICAgICAgICAgICAgPGRpdiBpZD0iYWNjQ3VzdG9tZXJzIiBjbGFzcz0iYWNjb3JkaW9uLXNlY3Rpb24tY29udGVudCI+DQogICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGFiZWxUZXh0Ij5DdXN0b21lcnMgRG93bnN0cmVhbSBmcm9tIFNvdXJjZTwvbGFiZWw+PGJyIC8+DQogICAgICAgICAgICAgICAgICAgIDxkaXYgaWQ9InRhYmxlIj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDx0YWJsZSBjbGFzcz0iZmluZEZlZWRlclRhYmxlIGZpcnN0Q2hpbGRCb2xkIiBib3JkZXI9IjAiPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0aD5QSEFTRTwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoPkN1c3RvbWVyczwvdGg+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5BPC90ZD48dGQ+PGxhYmVsIGRhdGEtYmluZGluZz0ie0B0ZXh0OiBmZkN1c3RvbWVyc0F9Ij48L2xhYmVsPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPkI8L3RkPjx0ZD48bGFiZWwgZGF0YS1iaW5kaW5nPSJ7QHRleHQ6IGZmQ3VzdG9tZXJzQn0iPjwvbGFiZWw+PC90ZD48L3RyPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+QzwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZDdXN0b21lcnNDfSI+PC9sYWJlbD48L3RkPjwvdHI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UT1RBTDwvdGQ+PHRkPjxsYWJlbCBkYXRhLWJpbmRpbmc9IntAdGV4dDogZmZDdXN0b21lcnNUb3RhbH0iPjwvdGQ+PC90cj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGFibGU+DQogICAgICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgPC9kaXY+DQogICAgICAgICAgICA8ZGl2IGNsYXNzPSJjb250YWluZXIgYWNjb3JkaW9uLXNlY3Rpb24iPg0KICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ic2VjdGlvbkhlYWRlciBhY2NvcmRpb24tc2VjdGlvbi10aXRsZSIgaHJlZj0iI2FjY0ZlZWRlclRyYWNlIj5GTE9XIERJUkVDVElPTjwvbGFiZWw+DQogICAgICAgICAgICAgICAgPGRpdiBpZD0iYWNjRmVlZGVyVHJhY2UiIGNsYXNzPSJhY2NvcmRpb24tc2VjdGlvbi1jb250ZW50Ij4NCiAgICAgICAgICAgICAgICAgICAgPGRpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz0ibGFiZWxUZXh0Ij5VcHN0cmVhbSBDb2xvcjogPC9sYWJlbD48aW5wdXQgaWQ9InVwc3RyZWFtQ29sb3IiIHN0eWxlPSJ3aWR0aDozNXB4O2hlaWdodDozNXB4OyIgdHlwZT0iY29sb3IiIHZhbHVlPSIjMTEyMkZGIiBkYXRhLWJpbmRpbmc9IntAdmFsdWU6IHVwc3RyZWFtQ29sb3J9IiAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgPGJyIC8+DQogICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9ImxhYmVsVGV4dCI+RG93bnN0cmVhbSBDb2xvcjogPC9sYWJlbD48aW5wdXQgaWQ9ImRvd25zdHJlYW1Db2xvciIgc3R5bGU9IndpZHRoOjM1cHg7aGVpZ2h0OjM1cHg7IiB0eXBlPSJjb2xvciIgdmFsdWU9IiMxMTIyRkYiIGRhdGEtYmluZGluZz0ie0B2YWx1ZTogZG93bnN0cmVhbUNvbG9yfSIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxiciAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgPGRpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgY2xhc3M9ImxibFRyYWNlVXBEb3duIj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLWxibFNob3dTZXJ2aWNlLS0+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9InRyYWNlVXBEb3duQm94IiBzcmM9Ii4uL0dlb2NvcnRleC9Fc3NlbnRpYWxzL0FyY0ZNV2ViNDUwL1JFU1Qvc2l0ZXMvRmluZF9GZWVkZXJzL1ZpZXdlcnMvRmluZF9GZWVkZXJzL1ZpcnR1YWxEaXJlY3RvcnkvUmVzb3VyY2VzL0ltYWdlcy9DdXN0b20vYm94LnBuZyIgLz4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGltZyBjbGFzcz0idHJhY2VVcERvd24gb2ZmIiBzcmM9Ii4uL0dlb2NvcnRleC9Fc3NlbnRpYWxzL0FyY0ZNV2ViNDUwL1JFU1Qvc2l0ZXMvRmluZF9GZWVkZXJzL1ZpZXdlcnMvRmluZF9GZWVkZXJzL1ZpcnR1YWxEaXJlY3RvcnkvUmVzb3VyY2VzL0ltYWdlcy9DdXN0b20vdGljay5wbmciIC8+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFRyYWNlIFVwL0Rvd25zdHJlYW0gRnJvbSBDbGljayBQb2ludA0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+DQogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYmxab29tVG9VcHN0cmVhbSI+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwhLS1sYmxTaG93U2VydmljZS0tPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPSJ6b29tVG9VcHN0cmVhbUJveCIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL2JveC5wbmciIC8+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9Inpvb21Ub1Vwc3RyZWFtIG9mZiIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL3RpY2sucG5nIiAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBdXRvLVpvb20gdG8gVXBzdHJlYW0gUmVzdWx0cw0KICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+DQogICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXY+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPSJsYmxab29tVG9Eb3duc3RyZWFtIj4NCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLWxibFNob3dTZXJ2aWNlLS0+DQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbWcgY2xhc3M9Inpvb21Ub0Rvd25zdHJlYW1Cb3giIHNyYz0iLi4vR2VvY29ydGV4L0Vzc2VudGlhbHMvQXJjRk1XZWI0NTAvUkVTVC9zaXRlcy9GaW5kX0ZlZWRlcnMvVmlld2Vycy9GaW5kX0ZlZWRlcnMvVmlydHVhbERpcmVjdG9yeS9SZXNvdXJjZXMvSW1hZ2VzL0N1c3RvbS9ib3gucG5nIiAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW1nIGNsYXNzPSJ6b29tVG9Eb3duc3RyZWFtIG9mZiIgc3JjPSIuLi9HZW9jb3J0ZXgvRXNzZW50aWFscy9BcmNGTVdlYjQ1MC9SRVNUL3NpdGVzL0ZpbmRfRmVlZGVycy9WaWV3ZXJzL0ZpbmRfRmVlZGVycy9WaXJ0dWFsRGlyZWN0b3J5L1Jlc291cmNlcy9JbWFnZXMvQ3VzdG9tL3RpY2sucG5nIiAvPg0KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBdXRvLVpvb20gdG8gRG93bnN0cmVhbSBSZXN1bHRzDQogICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD4NCiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2Pg0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgICAgICAgICAgICAgPCEtLTxkaXYgaWQ9IkJ1dHRvbnMiPg0KICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT0iYnV0dG9uIiBjbGFzcz0ibGFyZ2VCdXR0b24iIGlkPSJidG5GZWVkZXJUcmFjZSIgdmFsdWU9IlRhcCBvbiBNYXAiIC8+DQogICAgICAgICAgICAgICAgPC9kaXY+LS0+DQogICAgICAgICAgICAgICAgPC9kaXY+DQogICAgICAgICAgICA8L2Rpdj4NCiAgICAgICAgPC9kaXY+DQogICAgPC9kaXY+DQoNCjwvZGl2Pg0K");
geocortex.resourceManager.register("FindFeederModules","inv","Modules/FindFeeder/defaults.css","css","LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXA0KLS0tLS0tLS0gQmFzZQ0KXCotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLw0KLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXA0KLS0tLS0tLS0gVHlwcG9ncmFwaHkNClwqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8NCi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlwNCi0tLS0tLS0tIFVJDQpcKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovDQovKiBsaW5lIDIsIC4uL3Njc3MvMS1iYXNlL19leHRlbmRzLnNjc3MgKi8NCi5zaXRlLWhlYWRlcjphZnRlciwgLm1haW46YWZ0ZXIsIC5jbGVhcmZpeDphZnRlciwgLmNsZWFyZml4IHsNCiAgZGlzcGxheTogYmxvY2s7DQogIGNsZWFyOiBib3RoOw0KICBjb250ZW50OiAnJzsNCn0NCg0KLyogbGluZSAyNSwgLi4vc2Nzcy8xLWJhc2UvX2V4dGVuZHMuc2NzcyAqLw0KLmZhLWljb24sIFtjbGFzc149ImZhLSJdOmJlZm9yZSB7DQogIGRpc3BsYXk6IGlubGluZS1ibG9jazsNCiAgcG9zaXRpb246IHJlbGF0aXZlOw0KICBmb250LWZhbWlseTogIkZvbnRBd2Vzb21lIjsNCiAgZm9udC13ZWlnaHQ6IG5vcm1hbDsNCiAgbGluZS1oZWlnaHQ6IDk1JTsNCn0NCg0KLyogbGluZSAyLCAuLi9zY3NzLzEtYmFzZS9fcmVzZXQuc2NzcyAqLw0KKiwgKjpiZWZvcmUsICo6YWZ0ZXIgew0KICBtYXJnaW46IDBweDsNCiAgcGFkZGluZzogMHB4Ow0KICAtd2Via2l0LWJveC1zaXppbmc6IGJvcmRlci1ib3g7DQogIC1tb3otYm94LXNpemluZzogYm9yZGVyLWJveDsNCiAgYm94LXNpemluZzogYm9yZGVyLWJveDsNCiAgYm9yZGVyOiAwcHg7DQogIGZvbnQtc2l6ZTogMTAwJTsNCiAgZm9udDogaW5oZXJpdDsNCn0NCg0KLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXA0KLS0tLS0tLS0gRnJhbWV3b3JrDQpcKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovDQovKiBsaW5lIDIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KYm9keSwgaW5wdXQgew0KICBmb250LWZhbWlseTogIkd1ZGVhIjsNCiAgZm9udC1zaXplOiAxNnB4Ow0KICBjb2xvcjogIzUyNTI1MjsNCiAgbGluZS1oZWlnaHQ6IDEwMCU7DQp9DQoNCi8qIGxpbmUgNSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fdHlwb2dyYXBoeS5zY3NzICovDQpoMSwgaDEgYSwNCmgyLCBoMiBhLA0KaDMsIGgzIGEsDQpoNCwgaDQgYSwNCmg1LCBoNSBhIHsNCiAgZm9udC1mYW1pbHk6ICJBc2FwIjsNCiAgY29sb3I6ICMyNjI2MjY7DQogIGxpbmUtaGVpZ2h0OiAxLjIwMGVtOw0KICBtYXJnaW4tYm90dG9tOiAyMHB4Ow0KfQ0KDQovKiBsaW5lIDExLCAuLi9zY3NzLzItZnJhbWV3b3JrL190eXBvZ3JhcGh5LnNjc3MgKi8NCmgxIHsNCiAgZm9udC1zaXplOiAzOC4wOHB4Ow0KfQ0KDQovKiBsaW5lIDEyLCAuLi9zY3NzLzItZnJhbWV3b3JrL190eXBvZ3JhcGh5LnNjc3MgKi8NCmgyIHsNCiAgZm9udC1zaXplOiAyLjAwMGVtOw0KfQ0KDQovKiBsaW5lIDEzLCAuLi9zY3NzLzItZnJhbWV3b3JrL190eXBvZ3JhcGh5LnNjc3MgKi8NCmgzIHsNCiAgZm9udC1zaXplOiAyNS42cHg7DQp9DQoNCi8qIGxpbmUgMTQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KaDQgew0KICBmb250LXNpemU6IDIycHg7DQp9DQoNCi8qIGxpbmUgMTUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KaDUgew0KICBmb250LXNpemU6IDE3LjZweDsNCn0NCg0KLyogbGluZSAxOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fdHlwb2dyYXBoeS5zY3NzICovDQpwIHsNCiAgZm9udC1zaXplOiAxOHB4Ow0KICBsaW5lLWhlaWdodDogMS43NTBlbTsNCn0NCg0KLyogbGluZSAxOSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fdHlwb2dyYXBoeS5zY3NzICovDQpwICsgcCB7DQogIG1hcmdpbi10b3A6IDIwcHg7DQp9DQoNCi8qIGxpbmUgMjEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KdWwgbGksIG9sIGxpIHsNCiAgbWFyZ2luOiAxMHB4IDBweCAxMHB4IDQwcHg7DQogIGZvbnQtc2l6ZTogMC45MzNlbTsNCiAgbGluZS1oZWlnaHQ6IDEuNjUwZW07DQp9DQoNCi8qIGxpbmUgMjMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KdWwgKyBwLCBvbCArIHAsDQpwICsgaDEsIHAgKyBoMiwgcCArIGgzLCBwICsgaDQsIHAgKyBoNSB7DQogIG1hcmdpbi10b3A6IDMwcHg7DQp9DQoNCi8qIGxpbmUgMjYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KcCArIHVsLCBwICsgb2wgew0KICBtYXJnaW4tdG9wOiAxMHB4Ow0KfQ0KDQovKiBsaW5lIDI4LCAuLi9zY3NzLzItZnJhbWV3b3JrL190eXBvZ3JhcGh5LnNjc3MgKi8NCnN0cm9uZyB7DQogIGZvbnQtd2VpZ2h0OiA3MDA7DQp9DQoNCi8qIGxpbmUgMjksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KZW0gew0KICBmb250LXN0eWxlOiBpdGFsaWM7DQp9DQoNCi8qIGxpbmUgMzAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KYSB7DQogIGNvbG9yOiAjM0M4RkM3Ow0KICB0ZXh0LWRlY29yYXRpb246IG5vbmU7DQp9DQoNCi8qIGxpbmUgMzEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX3R5cG9ncmFwaHkuc2NzcyAqLw0KYTpob3ZlciB7DQogIHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOw0KfQ0KDQpAZm9udC1mYWNlIHsNCiAgZm9udC1mYW1pbHk6ICJGb250QXdlc29tZSI7DQogIHNyYzogdXJsKCIuLi9mb250cy9mb250YXdlc29tZS13ZWJmb250LmVvdCIpOw0KICBzcmM6IHVybCgiLi4vZm9udHMvZm9udGF3ZXNvbWUtd2ViZm9udC5lb3Q/I2llZml4IikgZm9ybWF0KCJlbWJlZGRlZC1vcGVudHlwZSIpLCB1cmwoIi4uL2ZvbnRzL2ZvbnRhd2Vzb21lLXdlYmZvbnQud29mZiIpIGZvcm1hdCgid29mZiIpLCB1cmwoIi4uL2ZvbnRzL2ZvbnRhd2Vzb21lLXdlYmZvbnQudHRmPyIpIGZvcm1hdCgidHJ1ZXR5cGUiKSwgdXJsKCIuLi9mb250cy9mb250YXdlc29tZS13ZWJmb250LnN2ZyNmb250YXdlc29tZXJlZ3VsYXIiKSBmb3JtYXQoInN2ZyIpOw0KICBmb250LXdlaWdodDogbm9ybWFsOw0KICBmb250LXN0eWxlOiBub3JtYWw7DQp9DQovKiBsaW5lIDE4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdsYXNzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwMCI7DQp9DQoNCi8qIGxpbmUgMjEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbXVzaWM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDAxIjsNCn0NCg0KLyogbGluZSAyNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zZWFyY2g6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDAyIjsNCn0NCg0KLyogbGluZSAyNywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1lbnZlbG9wZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwMyI7DQp9DQoNCi8qIGxpbmUgMzAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaGVhcnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDA0IjsNCn0NCg0KLyogbGluZSAzMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdGFyOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwNSI7DQp9DQoNCi8qIGxpbmUgMzYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3Rhci1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwNiI7DQp9DQoNCi8qIGxpbmUgMzksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdXNlcjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMDciOw0KfQ0KDQovKiBsaW5lIDQyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZpbG06YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDA4IjsNCn0NCg0KLyogbGluZSA0NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10aC1sYXJnZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMDkiOw0KfQ0KDQovKiBsaW5lIDQ4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRoOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwYSI7DQp9DQoNCi8qIGxpbmUgNTEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGgtbGlzdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMGIiOw0KfQ0KDQovKiBsaW5lIDU0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNoZWNrOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAwYyI7DQp9DQoNCi8qIGxpbmUgNTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGltZXM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDBkIjsNCn0NCg0KLyogbGluZSA2MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zZWFyY2gtcGx1czpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMGUiOw0KfQ0KDQovKiBsaW5lIDYzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNlYXJjaC1taW51czpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTAiOw0KfQ0KDQovKiBsaW5lIDY2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXBvd2VyLW9mZjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTEiOw0KfQ0KDQovKiBsaW5lIDY5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNpZ25hbDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTIiOw0KfQ0KDQovKiBsaW5lIDcyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdlYXI6YmVmb3JlLA0KLmZhLWNvZzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTMiOw0KfQ0KDQovKiBsaW5lIDc2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRyYXNoLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDE0IjsNCn0NCg0KLyogbGluZSA3OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1ob21lOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAxNSI7DQp9DQoNCi8qIGxpbmUgODIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmlsZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAxNiI7DQp9DQoNCi8qIGxpbmUgODUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2xvY2stbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTciOw0KfQ0KDQovKiBsaW5lIDg4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJvYWQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDE4IjsNCn0NCg0KLyogbGluZSA5MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1kb3dubG9hZDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMTkiOw0KfQ0KDQovKiBsaW5lIDk0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFycm93LWNpcmNsZS1vLWRvd246YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDFhIjsNCn0NCg0KLyogbGluZSA5NywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvdy1jaXJjbGUtby11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMWIiOw0KfQ0KDQovKiBsaW5lIDEwMCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1pbmJveDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMWMiOw0KfQ0KDQovKiBsaW5lIDEwMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wbGF5LWNpcmNsZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAxZCI7DQp9DQoNCi8qIGxpbmUgMTA2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJvdGF0ZS1yaWdodDpiZWZvcmUsDQouZmEtcmVwZWF0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAxZSI7DQp9DQoNCi8qIGxpbmUgMTEwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJlZnJlc2g6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDIxIjsNCn0NCg0KLyogbGluZSAxMTMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGlzdC1hbHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDIyIjsNCn0NCg0KLyogbGluZSAxMTYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbG9jazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMjMiOw0KfQ0KDQovKiBsaW5lIDExOSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mbGFnOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAyNCI7DQp9DQoNCi8qIGxpbmUgMTIyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWhlYWRwaG9uZXM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDI1IjsNCn0NCg0KLyogbGluZSAxMjUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdm9sdW1lLW9mZjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMjYiOw0KfQ0KDQovKiBsaW5lIDEyOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS12b2x1bWUtZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMjciOw0KfQ0KDQovKiBsaW5lIDEzMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS12b2x1bWUtdXA6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDI4IjsNCn0NCg0KLyogbGluZSAxMzQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcXJjb2RlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAyOSI7DQp9DQoNCi8qIGxpbmUgMTM3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWJhcmNvZGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDJhIjsNCn0NCg0KLyogbGluZSAxNDAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGFnOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAyYiI7DQp9DQoNCi8qIGxpbmUgMTQzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRhZ3M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDJjIjsNCn0NCg0KLyogbGluZSAxNDYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYm9vazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMmQiOw0KfQ0KDQovKiBsaW5lIDE0OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1ib29rbWFyazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMmUiOw0KfQ0KDQovKiBsaW5lIDE1MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wcmludDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMmYiOw0KfQ0KDQovKiBsaW5lIDE1NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jYW1lcmE6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDMwIjsNCn0NCg0KLyogbGluZSAxNTgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZm9udDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMzEiOw0KfQ0KDQovKiBsaW5lIDE2MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1ib2xkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAzMiI7DQp9DQoNCi8qIGxpbmUgMTY0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWl0YWxpYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMzMiOw0KfQ0KDQovKiBsaW5lIDE2NywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10ZXh0LWhlaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwMzQiOw0KfQ0KDQovKiBsaW5lIDE3MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10ZXh0LXdpZHRoOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAzNSI7DQp9DQoNCi8qIGxpbmUgMTczLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFsaWduLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDM2IjsNCn0NCg0KLyogbGluZSAxNzYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYWxpZ24tY2VudGVyOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAzNyI7DQp9DQoNCi8qIGxpbmUgMTc5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFsaWduLXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAzOCI7DQp9DQoNCi8qIGxpbmUgMTgyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFsaWduLWp1c3RpZnk6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDM5IjsNCn0NCg0KLyogbGluZSAxODUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGlzdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwM2EiOw0KfQ0KDQovKiBsaW5lIDE4OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1kZWRlbnQ6YmVmb3JlLA0KLmZhLW91dGRlbnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDNiIjsNCn0NCg0KLyogbGluZSAxOTIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaW5kZW50OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjAzYyI7DQp9DQoNCi8qIGxpbmUgMTk1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXZpZGVvLWNhbWVyYTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwM2QiOw0KfQ0KDQovKiBsaW5lIDE5OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1waWN0dXJlLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDNlIjsNCn0NCg0KLyogbGluZSAyMDEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGVuY2lsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0MCI7DQp9DQoNCi8qIGxpbmUgMjA0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1hcC1tYXJrZXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDQxIjsNCn0NCg0KLyogbGluZSAyMDcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYWRqdXN0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0MiI7DQp9DQoNCi8qIGxpbmUgMjEwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRpbnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDQzIjsNCn0NCg0KLyogbGluZSAyMTMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZWRpdDpiZWZvcmUsDQouZmEtcGVuY2lsLXNxdWFyZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0NCI7DQp9DQoNCi8qIGxpbmUgMjE3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNoYXJlLXNxdWFyZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0NSI7DQp9DQoNCi8qIGxpbmUgMjIwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNoZWNrLXNxdWFyZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0NiI7DQp9DQoNCi8qIGxpbmUgMjIzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFycm93czpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNDciOw0KfQ0KDQovKiBsaW5lIDIyNiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdGVwLWJhY2t3YXJkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0OCI7DQp9DQoNCi8qIGxpbmUgMjI5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZhc3QtYmFja3dhcmQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDQ5IjsNCn0NCg0KLyogbGluZSAyMzIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYmFja3dhcmQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDRhIjsNCn0NCg0KLyogbGluZSAyMzUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGxheTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNGIiOw0KfQ0KDQovKiBsaW5lIDIzOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wYXVzZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNGMiOw0KfQ0KDQovKiBsaW5lIDI0MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdG9wOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA0ZCI7DQp9DQoNCi8qIGxpbmUgMjQ0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZvcndhcmQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDRlIjsNCn0NCg0KLyogbGluZSAyNDcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmFzdC1mb3J3YXJkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA1MCI7DQp9DQoNCi8qIGxpbmUgMjUwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXN0ZXAtZm9yd2FyZDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNTEiOw0KfQ0KDQovKiBsaW5lIDI1MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1lamVjdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNTIiOw0KfQ0KDQovKiBsaW5lIDI1NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGV2cm9uLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDUzIjsNCn0NCg0KLyogbGluZSAyNTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2hldnJvbi1yaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNTQiOw0KfQ0KDQovKiBsaW5lIDI2MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wbHVzLWNpcmNsZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNTUiOw0KfQ0KDQovKiBsaW5lIDI2NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1taW51cy1jaXJjbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDU2IjsNCn0NCg0KLyogbGluZSAyNjgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGltZXMtY2lyY2xlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA1NyI7DQp9DQoNCi8qIGxpbmUgMjcxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNoZWNrLWNpcmNsZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNTgiOw0KfQ0KDQovKiBsaW5lIDI3NCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1xdWVzdGlvbi1jaXJjbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDU5IjsNCn0NCg0KLyogbGluZSAyNzcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaW5mby1jaXJjbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDVhIjsNCn0NCg0KLyogbGluZSAyODAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY3Jvc3NoYWlyczpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNWIiOw0KfQ0KDQovKiBsaW5lIDI4MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10aW1lcy1jaXJjbGUtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNWMiOw0KfQ0KDQovKiBsaW5lIDI4NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGVjay1jaXJjbGUtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNWQiOw0KfQ0KDQovKiBsaW5lIDI4OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1iYW46YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDVlIjsNCn0NCg0KLyogbGluZSAyOTIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3ctbGVmdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNjAiOw0KfQ0KDQovKiBsaW5lIDI5NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvdy1yaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNjEiOw0KfQ0KDQovKiBsaW5lIDI5OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvdy11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNjIiOw0KfQ0KDQovKiBsaW5lIDMwMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvdy1kb3duOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA2MyI7DQp9DQoNCi8qIGxpbmUgMzA0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1haWwtZm9yd2FyZDpiZWZvcmUsDQouZmEtc2hhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDY0IjsNCn0NCg0KLyogbGluZSAzMDgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZXhwYW5kOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA2NSI7DQp9DQoNCi8qIGxpbmUgMzExLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvbXByZXNzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA2NiI7DQp9DQoNCi8qIGxpbmUgMzE0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXBsdXM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDY3IjsNCn0NCg0KLyogbGluZSAzMTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbWludXM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDY4IjsNCn0NCg0KLyogbGluZSAzMjAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXN0ZXJpc2s6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDY5IjsNCn0NCg0KLyogbGluZSAzMjMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZXhjbGFtYXRpb24tY2lyY2xlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA2YSI7DQp9DQoNCi8qIGxpbmUgMzI2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdpZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDZiIjsNCn0NCg0KLyogbGluZSAzMjksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGVhZjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNmMiOw0KfQ0KDQovKiBsaW5lIDMzMiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1maXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA2ZCI7DQp9DQoNCi8qIGxpbmUgMzM1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWV5ZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwNmUiOw0KfQ0KDQovKiBsaW5lIDMzOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1leWUtc2xhc2g6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDcwIjsNCn0NCg0KLyogbGluZSAzNDEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtd2FybmluZzpiZWZvcmUsDQouZmEtZXhjbGFtYXRpb24tdHJpYW5nbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDcxIjsNCn0NCg0KLyogbGluZSAzNDUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGxhbmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDcyIjsNCn0NCg0KLyogbGluZSAzNDgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2FsZW5kYXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDczIjsNCn0NCg0KLyogbGluZSAzNTEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcmFuZG9tOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA3NCI7DQp9DQoNCi8qIGxpbmUgMzU0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvbW1lbnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDc1IjsNCn0NCg0KLyogbGluZSAzNTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbWFnbmV0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA3NiI7DQp9DQoNCi8qIGxpbmUgMzYwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNoZXZyb24tdXA6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDc3IjsNCn0NCg0KLyogbGluZSAzNjMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2hldnJvbi1kb3duOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA3OCI7DQp9DQoNCi8qIGxpbmUgMzY2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJldHdlZXQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDc5IjsNCn0NCg0KLyogbGluZSAzNjksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc2hvcHBpbmctY2FydDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwN2EiOw0KfQ0KDQovKiBsaW5lIDM3MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mb2xkZXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDdiIjsNCn0NCg0KLyogbGluZSAzNzUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZm9sZGVyLW9wZW46YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDdjIjsNCn0NCg0KLyogbGluZSAzNzgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3dzLXY6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDdkIjsNCn0NCg0KLyogbGluZSAzODEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3dzLWg6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDdlIjsNCn0NCg0KLyogbGluZSAzODQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYmFyLWNoYXJ0LW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDgwIjsNCn0NCg0KLyogbGluZSAzODcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdHdpdHRlci1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDgxIjsNCn0NCg0KLyogbGluZSAzOTAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmFjZWJvb2stc3F1YXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA4MiI7DQp9DQoNCi8qIGxpbmUgMzkzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNhbWVyYS1yZXRybzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwODMiOw0KfQ0KDQovKiBsaW5lIDM5NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1rZXk6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDg0IjsNCn0NCg0KLyogbGluZSAzOTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZ2VhcnM6YmVmb3JlLA0KLmZhLWNvZ3M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDg1IjsNCn0NCg0KLyogbGluZSA0MDMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY29tbWVudHM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDg2IjsNCn0NCg0KLyogbGluZSA0MDYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGh1bWJzLW8tdXA6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDg3IjsNCn0NCg0KLyogbGluZSA0MDksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGh1bWJzLW8tZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwODgiOw0KfQ0KDQovKiBsaW5lIDQxMiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdGFyLWhhbGY6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDg5IjsNCn0NCg0KLyogbGluZSA0MTUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaGVhcnQtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOGEiOw0KfQ0KDQovKiBsaW5lIDQxOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zaWduLW91dDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOGIiOw0KfQ0KDQovKiBsaW5lIDQyMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1saW5rZWRpbi1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDhjIjsNCn0NCg0KLyogbGluZSA0MjQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGh1bWItdGFjazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOGQiOw0KfQ0KDQovKiBsaW5lIDQyNywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1leHRlcm5hbC1saW5rOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA4ZSI7DQp9DQoNCi8qIGxpbmUgNDMwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNpZ24taW46YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDkwIjsNCn0NCg0KLyogbGluZSA0MzMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdHJvcGh5OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA5MSI7DQp9DQoNCi8qIGxpbmUgNDM2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdpdGh1Yi1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDkyIjsNCn0NCg0KLyogbGluZSA0MzksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdXBsb2FkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA5MyI7DQp9DQoNCi8qIGxpbmUgNDQyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWxlbW9uLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDk0IjsNCn0NCg0KLyogbGluZSA0NDUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGhvbmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDk1IjsNCn0NCg0KLyogbGluZSA0NDgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3F1YXJlLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDk2IjsNCn0NCg0KLyogbGluZSA0NTEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYm9va21hcmstbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOTciOw0KfQ0KDQovKiBsaW5lIDQ1NCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1waG9uZS1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDk4IjsNCn0NCg0KLyogbGluZSA0NTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdHdpdHRlcjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOTkiOw0KfQ0KDQovKiBsaW5lIDQ2MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mYWNlYm9vazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOWEiOw0KfQ0KDQovKiBsaW5lIDQ2MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1naXRodWI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMDliIjsNCn0NCg0KLyogbGluZSA0NjYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdW5sb2NrOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA5YyI7DQp9DQoNCi8qIGxpbmUgNDY5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNyZWRpdC1jYXJkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjA5ZCI7DQp9DQoNCi8qIGxpbmUgNDcyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJzczpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwOWUiOw0KfQ0KDQovKiBsaW5lIDQ3NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1oZGQtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYTAiOw0KfQ0KDQovKiBsaW5lIDQ3OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1idWxsaG9ybjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYTEiOw0KfQ0KDQovKiBsaW5lIDQ4MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1iZWxsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBmMyI7DQp9DQoNCi8qIGxpbmUgNDg0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNlcnRpZmljYXRlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBhMyI7DQp9DQoNCi8qIGxpbmUgNDg3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWhhbmQtby1yaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYTQiOw0KfQ0KDQovKiBsaW5lIDQ5MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1oYW5kLW8tbGVmdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYTUiOw0KfQ0KDQovKiBsaW5lIDQ5MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1oYW5kLW8tdXA6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGE2IjsNCn0NCg0KLyogbGluZSA0OTYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaGFuZC1vLWRvd246YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGE3IjsNCn0NCg0KLyogbGluZSA0OTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3ctY2lyY2xlLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGE4IjsNCn0NCg0KLyogbGluZSA1MDIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3ctY2lyY2xlLXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBhOSI7DQp9DQoNCi8qIGxpbmUgNTA1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFycm93LWNpcmNsZS11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYWEiOw0KfQ0KDQovKiBsaW5lIDUwOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvdy1jaXJjbGUtZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYWIiOw0KfQ0KDQovKiBsaW5lIDUxMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1nbG9iZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYWMiOw0KfQ0KDQovKiBsaW5lIDUxNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS13cmVuY2g6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGFkIjsNCn0NCg0KLyogbGluZSA1MTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGFza3M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGFlIjsNCn0NCg0KLyogbGluZSA1MjAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmlsdGVyOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBiMCI7DQp9DQoNCi8qIGxpbmUgNTIzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWJyaWVmY2FzZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYjEiOw0KfQ0KDQovKiBsaW5lIDUyNiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcnJvd3MtYWx0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBiMiI7DQp9DQoNCi8qIGxpbmUgNTI5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdyb3VwOmJlZm9yZSwNCi5mYS11c2VyczpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYzAiOw0KfQ0KDQovKiBsaW5lIDUzMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGFpbjpiZWZvcmUsDQouZmEtbGluazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYzEiOw0KfQ0KDQovKiBsaW5lIDUzNywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jbG91ZDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYzIiOw0KfQ0KDQovKiBsaW5lIDU0MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mbGFzazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYzMiOw0KfQ0KDQovKiBsaW5lIDU0MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jdXQ6YmVmb3JlLA0KLmZhLXNjaXNzb3JzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBjNCI7DQp9DQoNCi8qIGxpbmUgNTQ3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvcHk6YmVmb3JlLA0KLmZhLWZpbGVzLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGM1IjsNCn0NCg0KLyogbGluZSA1NTEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGFwZXJjbGlwOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBjNiI7DQp9DQoNCi8qIGxpbmUgNTU0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNhdmU6YmVmb3JlLA0KLmZhLWZsb3BweS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBjNyI7DQp9DQoNCi8qIGxpbmUgNTU4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwYzgiOw0KfQ0KDQovKiBsaW5lIDU2MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1iYXJzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBjOSI7DQp9DQoNCi8qIGxpbmUgNTY0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWxpc3QtdWw6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGNhIjsNCn0NCg0KLyogbGluZSA1NjcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGlzdC1vbDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwY2IiOw0KfQ0KDQovKiBsaW5lIDU3MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdHJpa2V0aHJvdWdoOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBjYyI7DQp9DQoNCi8qIGxpbmUgNTczLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXVuZGVybGluZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwY2QiOw0KfQ0KDQovKiBsaW5lIDU3NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10YWJsZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwY2UiOw0KfQ0KDQovKiBsaW5lIDU3OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1tYWdpYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZDAiOw0KfQ0KDQovKiBsaW5lIDU4MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10cnVjazpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZDEiOw0KfQ0KDQovKiBsaW5lIDU4NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1waW50ZXJlc3Q6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGQyIjsNCn0NCg0KLyogbGluZSA1ODgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGludGVyZXN0LXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZDMiOw0KfQ0KDQovKiBsaW5lIDU5MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1nb29nbGUtcGx1cy1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGQ0IjsNCn0NCg0KLyogbGluZSA1OTQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZ29vZ2xlLXBsdXM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGQ1IjsNCn0NCg0KLyogbGluZSA1OTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbW9uZXk6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGQ2IjsNCn0NCg0KLyogbGluZSA2MDAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2FyZXQtZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZDciOw0KfQ0KDQovKiBsaW5lIDYwMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jYXJldC11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZDgiOw0KfQ0KDQovKiBsaW5lIDYwNiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jYXJldC1sZWZ0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBkOSI7DQp9DQoNCi8qIGxpbmUgNjA5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNhcmV0LXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBkYSI7DQp9DQoNCi8qIGxpbmUgNjEyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvbHVtbnM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGRiIjsNCn0NCg0KLyogbGluZSA2MTUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdW5zb3J0ZWQ6YmVmb3JlLA0KLmZhLXNvcnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGRjIjsNCn0NCg0KLyogbGluZSA2MTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc29ydC1kb3duOmJlZm9yZSwNCi5mYS1zb3J0LWFzYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZGQiOw0KfQ0KDQovKiBsaW5lIDYyMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zb3J0LXVwOmJlZm9yZSwNCi5mYS1zb3J0LWRlc2M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGRlIjsNCn0NCg0KLyogbGluZSA2MjcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZW52ZWxvcGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGUwIjsNCn0NCg0KLyogbGluZSA2MzAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGlua2VkaW46YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGUxIjsNCn0NCg0KLyogbGluZSA2MzMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcm90YXRlLWxlZnQ6YmVmb3JlLA0KLmZhLXVuZG86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGUyIjsNCn0NCg0KLyogbGluZSA2MzcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGVnYWw6YmVmb3JlLA0KLmZhLWdhdmVsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBlMyI7DQp9DQoNCi8qIGxpbmUgNjQxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWRhc2hib2FyZDpiZWZvcmUsDQouZmEtdGFjaG9tZXRlcjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZTQiOw0KfQ0KDQovKiBsaW5lIDY0NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jb21tZW50LW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGU1IjsNCn0NCg0KLyogbGluZSA2NDgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY29tbWVudHMtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZTYiOw0KfQ0KDQovKiBsaW5lIDY1MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mbGFzaDpiZWZvcmUsDQouZmEtYm9sdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZTciOw0KfQ0KDQovKiBsaW5lIDY1NSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zaXRlbWFwOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBlOCI7DQp9DQoNCi8qIGxpbmUgNjU4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXVtYnJlbGxhOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBlOSI7DQp9DQoNCi8qIGxpbmUgNjYxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXBhc3RlOmJlZm9yZSwNCi5mYS1jbGlwYm9hcmQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGVhIjsNCn0NCg0KLyogbGluZSA2NjUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGlnaHRidWxiLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGViIjsNCn0NCg0KLyogbGluZSA2NjgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZXhjaGFuZ2U6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGVjIjsNCn0NCg0KLyogbGluZSA2NzEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2xvdWQtZG93bmxvYWQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGVkIjsNCn0NCg0KLyogbGluZSA2NzQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2xvdWQtdXBsb2FkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBlZSI7DQp9DQoNCi8qIGxpbmUgNjc3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXVzZXItbWQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGYwIjsNCn0NCg0KLyogbGluZSA2ODAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3RldGhvc2NvcGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGYxIjsNCn0NCg0KLyogbGluZSA2ODMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3VpdGNhc2U6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGYyIjsNCn0NCg0KLyogbGluZSA2ODYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYmVsbC1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBhMiI7DQp9DQoNCi8qIGxpbmUgNjg5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvZmZlZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZjQiOw0KfQ0KDQovKiBsaW5lIDY5MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jdXRsZXJ5OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBmNSI7DQp9DQoNCi8qIGxpbmUgNjk1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZpbGUtdGV4dC1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBmNiI7DQp9DQoNCi8qIGxpbmUgNjk4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWJ1aWxkaW5nLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGY3IjsNCn0NCg0KLyogbGluZSA3MDEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaG9zcGl0YWwtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYwZjgiOw0KfQ0KDQovKiBsaW5lIDcwNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hbWJ1bGFuY2U6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGY5IjsNCn0NCg0KLyogbGluZSA3MDcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbWVka2l0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBmYSI7DQp9DQoNCi8qIGxpbmUgNzEwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZpZ2h0ZXItamV0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjBmYiI7DQp9DQoNCi8qIGxpbmUgNzEzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWJlZXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGZjIjsNCn0NCg0KLyogbGluZSA3MTYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaC1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGZkIjsNCn0NCg0KLyogbGluZSA3MTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGx1cy1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMGZlIjsNCn0NCg0KLyogbGluZSA3MjIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYW5nbGUtZG91YmxlLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTAwIjsNCn0NCg0KLyogbGluZSA3MjUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYW5nbGUtZG91YmxlLXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwMSI7DQp9DQoNCi8qIGxpbmUgNzI4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFuZ2xlLWRvdWJsZS11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMDIiOw0KfQ0KDQovKiBsaW5lIDczMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hbmdsZS1kb3VibGUtZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMDMiOw0KfQ0KDQovKiBsaW5lIDczNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hbmdsZS1sZWZ0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwNCI7DQp9DQoNCi8qIGxpbmUgNzM3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFuZ2xlLXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwNSI7DQp9DQoNCi8qIGxpbmUgNzQwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFuZ2xlLXVwOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwNiI7DQp9DQoNCi8qIGxpbmUgNzQzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFuZ2xlLWRvd246YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTA3IjsNCn0NCg0KLyogbGluZSA3NDYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZGVza3RvcDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMDgiOw0KfQ0KDQovKiBsaW5lIDc0OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1sYXB0b3A6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTA5IjsNCn0NCg0KLyogbGluZSA3NTIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGFibGV0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwYSI7DQp9DQoNCi8qIGxpbmUgNzU1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1vYmlsZS1waG9uZTpiZWZvcmUsDQouZmEtbW9iaWxlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwYiI7DQp9DQoNCi8qIGxpbmUgNzU5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNpcmNsZS1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEwYyI7DQp9DQoNCi8qIGxpbmUgNzYyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXF1b3RlLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTBkIjsNCn0NCg0KLyogbGluZSA3NjUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcXVvdGUtcmlnaHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTBlIjsNCn0NCg0KLyogbGluZSA3NjgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3Bpbm5lcjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMTAiOw0KfQ0KDQovKiBsaW5lIDc3MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaXJjbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTExIjsNCn0NCg0KLyogbGluZSA3NzQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbWFpbC1yZXBseTpiZWZvcmUsDQouZmEtcmVwbHk6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTEyIjsNCn0NCg0KLyogbGluZSA3NzgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZ2l0aHViLWFsdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMTMiOw0KfQ0KDQovKiBsaW5lIDc4MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mb2xkZXItbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMTQiOw0KfQ0KDQovKiBsaW5lIDc4NCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mb2xkZXItb3Blbi1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjExNSI7DQp9DQoNCi8qIGxpbmUgNzg3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNtaWxlLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTE4IjsNCn0NCg0KLyogbGluZSA3OTAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZnJvd24tbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMTkiOw0KfQ0KDQovKiBsaW5lIDc5MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1tZWgtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMWEiOw0KfQ0KDQovKiBsaW5lIDc5NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1nYW1lcGFkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjExYiI7DQp9DQoNCi8qIGxpbmUgNzk5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWtleWJvYXJkLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTFjIjsNCn0NCg0KLyogbGluZSA4MDIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmxhZy1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjExZCI7DQp9DQoNCi8qIGxpbmUgODA1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZsYWctY2hlY2tlcmVkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjExZSI7DQp9DQoNCi8qIGxpbmUgODA4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRlcm1pbmFsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyMCI7DQp9DQoNCi8qIGxpbmUgODExLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNvZGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTIxIjsNCn0NCg0KLyogbGluZSA4MTQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcmVwbHktYWxsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyMiI7DQp9DQoNCi8qIGxpbmUgODE3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1haWwtcmVwbHktYWxsOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyMiI7DQp9DQoNCi8qIGxpbmUgODIwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXN0YXItaGFsZi1lbXB0eTpiZWZvcmUsDQouZmEtc3Rhci1oYWxmLWZ1bGw6YmVmb3JlLA0KLmZhLXN0YXItaGFsZi1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyMyI7DQp9DQoNCi8qIGxpbmUgODI1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWxvY2F0aW9uLWFycm93OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyNCI7DQp9DQoNCi8qIGxpbmUgODI4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNyb3A6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTI1IjsNCn0NCg0KLyogbGluZSA4MzEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY29kZS1mb3JrOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyNiI7DQp9DQoNCi8qIGxpbmUgODM0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXVubGluazpiZWZvcmUsDQouZmEtY2hhaW4tYnJva2VuOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyNyI7DQp9DQoNCi8qIGxpbmUgODM4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXF1ZXN0aW9uOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyOCI7DQp9DQoNCi8qIGxpbmUgODQxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWluZm86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTI5IjsNCn0NCg0KLyogbGluZSA4NDQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZXhjbGFtYXRpb246YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTJhIjsNCn0NCg0KLyogbGluZSA4NDcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3VwZXJzY3JpcHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTJiIjsNCn0NCg0KLyogbGluZSA4NTAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3Vic2NyaXB0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEyYyI7DQp9DQoNCi8qIGxpbmUgODUzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWVyYXNlcjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMmQiOw0KfQ0KDQovKiBsaW5lIDg1NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wdXp6bGUtcGllY2U6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTJlIjsNCn0NCg0KLyogbGluZSA4NTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbWljcm9waG9uZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzAiOw0KfQ0KDQovKiBsaW5lIDg2MiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1taWNyb3Bob25lLXNsYXNoOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzMSI7DQp9DQoNCi8qIGxpbmUgODY1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNoaWVsZDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzIiOw0KfQ0KDQovKiBsaW5lIDg2OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jYWxlbmRhci1vOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzMyI7DQp9DQoNCi8qIGxpbmUgODcxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWZpcmUtZXh0aW5ndWlzaGVyOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzNCI7DQp9DQoNCi8qIGxpbmUgODc0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJvY2tldDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzUiOw0KfQ0KDQovKiBsaW5lIDg3NywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1tYXhjZG46YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTM2IjsNCn0NCg0KLyogbGluZSA4ODAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY2hldnJvbi1jaXJjbGUtbGVmdDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzciOw0KfQ0KDQovKiBsaW5lIDg4MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGV2cm9uLWNpcmNsZS1yaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzgiOw0KfQ0KDQovKiBsaW5lIDg4NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGV2cm9uLWNpcmNsZS11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxMzkiOw0KfQ0KDQovKiBsaW5lIDg4OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jaGV2cm9uLWNpcmNsZS1kb3duOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzYSI7DQp9DQoNCi8qIGxpbmUgODkyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWh0bWw1OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzYiI7DQp9DQoNCi8qIGxpbmUgODk1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNzczM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTNjIjsNCn0NCg0KLyogbGluZSA4OTgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYW5jaG9yOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjEzZCI7DQp9DQoNCi8qIGxpbmUgOTAxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXVubG9jay1hbHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTNlIjsNCn0NCg0KLyogbGluZSA5MDQsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYnVsbHNleWU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTQwIjsNCn0NCg0KLyogbGluZSA5MDcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZWxsaXBzaXMtaDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNDEiOw0KfQ0KDQovKiBsaW5lIDkxMCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1lbGxpcHNpcy12OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0MiI7DQp9DQoNCi8qIGxpbmUgOTEzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJzcy1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTQzIjsNCn0NCg0KLyogbGluZSA5MTYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGxheS1jaXJjbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTQ0IjsNCn0NCg0KLyogbGluZSA5MTksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGlja2V0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0NSI7DQp9DQoNCi8qIGxpbmUgOTIyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1pbnVzLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNDYiOw0KfQ0KDQovKiBsaW5lIDkyNSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1taW51cy1zcXVhcmUtbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNDciOw0KfQ0KDQovKiBsaW5lIDkyOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1sZXZlbC11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNDgiOw0KfQ0KDQovKiBsaW5lIDkzMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1sZXZlbC1kb3duOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0OSI7DQp9DQoNCi8qIGxpbmUgOTM0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWNoZWNrLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNGEiOw0KfQ0KDQovKiBsaW5lIDkzNywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1wZW5jaWwtc3F1YXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0YiI7DQp9DQoNCi8qIGxpbmUgOTQwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWV4dGVybmFsLWxpbmstc3F1YXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0YyI7DQp9DQoNCi8qIGxpbmUgOTQzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNoYXJlLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNGQiOw0KfQ0KDQovKiBsaW5lIDk0NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1jb21wYXNzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE0ZSI7DQp9DQoNCi8qIGxpbmUgOTQ5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRvZ2dsZS1kb3duOmJlZm9yZSwNCi5mYS1jYXJldC1zcXVhcmUtby1kb3duOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE1MCI7DQp9DQoNCi8qIGxpbmUgOTUzLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRvZ2dsZS11cDpiZWZvcmUsDQouZmEtY2FyZXQtc3F1YXJlLW8tdXA6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTUxIjsNCn0NCg0KLyogbGluZSA5NTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdG9nZ2xlLXJpZ2h0OmJlZm9yZSwNCi5mYS1jYXJldC1zcXVhcmUtby1yaWdodDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNTIiOw0KfQ0KDQovKiBsaW5lIDk2MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1ldXJvOmJlZm9yZSwNCi5mYS1ldXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTUzIjsNCn0NCg0KLyogbGluZSA5NjUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZ2JwOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE1NCI7DQp9DQoNCi8qIGxpbmUgOTY4LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWRvbGxhcjpiZWZvcmUsDQouZmEtdXNkOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE1NSI7DQp9DQoNCi8qIGxpbmUgOTcyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJ1cGVlOmJlZm9yZSwNCi5mYS1pbnI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTU2IjsNCn0NCg0KLyogbGluZSA5NzYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtY255OmJlZm9yZSwNCi5mYS1ybWI6YmVmb3JlLA0KLmZhLXllbjpiZWZvcmUsDQouZmEtanB5OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE1NyI7DQp9DQoNCi8qIGxpbmUgOTgyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJ1YmxlOmJlZm9yZSwNCi5mYS1yb3VibGU6YmVmb3JlLA0KLmZhLXJ1YjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNTgiOw0KfQ0KDQovKiBsaW5lIDk4NywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS13b246YmVmb3JlLA0KLmZhLWtydzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNTkiOw0KfQ0KDQovKiBsaW5lIDk5MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1iaXRjb2luOmJlZm9yZSwNCi5mYS1idGM6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTVhIjsNCn0NCg0KLyogbGluZSA5OTUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZmlsZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNWIiOw0KfQ0KDQovKiBsaW5lIDk5OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1maWxlLXRleHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTVjIjsNCn0NCg0KLyogbGluZSAxMDAxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNvcnQtYWxwaGEtYXNjOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE1ZCI7DQp9DQoNCi8qIGxpbmUgMTAwNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zb3J0LWFscGhhLWRlc2M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTVlIjsNCn0NCg0KLyogbGluZSAxMDA3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXNvcnQtYW1vdW50LWFzYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNjAiOw0KfQ0KDQovKiBsaW5lIDEwMTAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc29ydC1hbW91bnQtZGVzYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNjEiOw0KfQ0KDQovKiBsaW5lIDEwMTMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc29ydC1udW1lcmljLWFzYzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNjIiOw0KfQ0KDQovKiBsaW5lIDEwMTYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc29ydC1udW1lcmljLWRlc2M6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTYzIjsNCn0NCg0KLyogbGluZSAxMDE5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRodW1icy11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNjQiOw0KfQ0KDQovKiBsaW5lIDEwMjIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdGh1bWJzLWRvd246YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTY1IjsNCn0NCg0KLyogbGluZSAxMDI1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXlvdXR1YmUtc3F1YXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2NiI7DQp9DQoNCi8qIGxpbmUgMTAyOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS15b3V0dWJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2NyI7DQp9DQoNCi8qIGxpbmUgMTAzMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS14aW5nOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2OCI7DQp9DQoNCi8qIGxpbmUgMTAzNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS14aW5nLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNjkiOw0KfQ0KDQovKiBsaW5lIDEwMzcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEteW91dHViZS1wbGF5OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2YSI7DQp9DQoNCi8qIGxpbmUgMTA0MCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1kcm9wYm94OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2YiI7DQp9DQoNCi8qIGxpbmUgMTA0MywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdGFjay1vdmVyZmxvdzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNmMiOw0KfQ0KDQovKiBsaW5lIDEwNDYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtaW5zdGFncmFtOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE2ZCI7DQp9DQoNCi8qIGxpbmUgMTA0OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mbGlja3I6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTZlIjsNCn0NCg0KLyogbGluZSAxMDUyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFkbjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNzAiOw0KfQ0KDQovKiBsaW5lIDEwNTUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYml0YnVja2V0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE3MSI7DQp9DQoNCi8qIGxpbmUgMTA1OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1iaXRidWNrZXQtc3F1YXJlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE3MiI7DQp9DQoNCi8qIGxpbmUgMTA2MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS10dW1ibHI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTczIjsNCn0NCg0KLyogbGluZSAxMDY0LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXR1bWJsci1zcXVhcmU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTc0IjsNCn0NCg0KLyogbGluZSAxMDY3LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWxvbmctYXJyb3ctZG93bjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNzUiOw0KfQ0KDQovKiBsaW5lIDEwNzAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbG9uZy1hcnJvdy11cDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNzYiOw0KfQ0KDQovKiBsaW5lIDEwNzMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbG9uZy1hcnJvdy1sZWZ0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE3NyI7DQp9DQoNCi8qIGxpbmUgMTA3NiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1sb25nLWFycm93LXJpZ2h0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE3OCI7DQp9DQoNCi8qIGxpbmUgMTA3OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1hcHBsZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxNzkiOw0KfQ0KDQovKiBsaW5lIDEwODIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtd2luZG93czpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxN2EiOw0KfQ0KDQovKiBsaW5lIDEwODUsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYW5kcm9pZDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxN2IiOw0KfQ0KDQovKiBsaW5lIDEwODgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtbGludXg6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTdjIjsNCn0NCg0KLyogbGluZSAxMDkxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWRyaWJiYmxlOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE3ZCI7DQp9DQoNCi8qIGxpbmUgMTA5NCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1za3lwZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxN2UiOw0KfQ0KDQovKiBsaW5lIDEwOTcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtZm91cnNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxODAiOw0KfQ0KDQovKiBsaW5lIDExMDAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdHJlbGxvOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE4MSI7DQp9DQoNCi8qIGxpbmUgMTEwMywgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1mZW1hbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTgyIjsNCn0NCg0KLyogbGluZSAxMTA2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1hbGU6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTgzIjsNCn0NCg0KLyogbGluZSAxMTA5LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWdpdHRpcDpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxODQiOw0KfQ0KDQovKiBsaW5lIDExMTIsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtc3VuLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTg1IjsNCn0NCg0KLyogbGluZSAxMTE1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLW1vb24tbzpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxODYiOw0KfQ0KDQovKiBsaW5lIDExMTgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJjaGl2ZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxODciOw0KfQ0KDQovKiBsaW5lIDExMjEsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYnVnOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE4OCI7DQp9DQoNCi8qIGxpbmUgMTEyNCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS12azpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxODkiOw0KfQ0KDQovKiBsaW5lIDExMjcsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtd2VpYm86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMThhIjsNCn0NCg0KLyogbGluZSAxMTMwLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXJlbnJlbjpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxOGIiOw0KfQ0KDQovKiBsaW5lIDExMzMsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtcGFnZWxpbmVzOmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE4YyI7DQp9DQoNCi8qIGxpbmUgMTEzNiwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1zdGFjay1leGNoYW5nZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxOGQiOw0KfQ0KDQovKiBsaW5lIDExMzksIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtYXJyb3ctY2lyY2xlLW8tcmlnaHQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMThlIjsNCn0NCg0KLyogbGluZSAxMTQyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLWFycm93LWNpcmNsZS1vLWxlZnQ6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTkwIjsNCn0NCg0KLyogbGluZSAxMTQ1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXRvZ2dsZS1sZWZ0OmJlZm9yZSwNCi5mYS1jYXJldC1zcXVhcmUtby1sZWZ0OmJlZm9yZSB7DQogIGNvbnRlbnQ6ICJcZjE5MSI7DQp9DQoNCi8qIGxpbmUgMTE0OSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fZm9udC1hd2Vzb21lLnNjc3MgKi8NCi5mYS1kb3QtY2lyY2xlLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTkyIjsNCn0NCg0KLyogbGluZSAxMTUyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXdoZWVsY2hhaXI6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTkzIjsNCn0NCg0KLyogbGluZSAxMTU1LCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXZpbWVvLXNxdWFyZTpiZWZvcmUgew0KICBjb250ZW50OiAiXGYxOTQiOw0KfQ0KDQovKiBsaW5lIDExNTgsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2ZvbnQtYXdlc29tZS5zY3NzICovDQouZmEtdHVya2lzaC1saXJhOmJlZm9yZSwNCi5mYS10cnk6YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTk1IjsNCn0NCg0KLyogbGluZSAxMTYyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19mb250LWF3ZXNvbWUuc2NzcyAqLw0KLmZhLXBsdXMtc3F1YXJlLW86YmVmb3JlIHsNCiAgY29udGVudDogIlxmMTk2IjsNCn0NCg0KLyogbGluZSAyLCAuLi9zY3NzLzItZnJhbWV3b3JrL19idXR0b25zLnNjc3MgKi8NCi5idG4sICNzdWJtaXQgew0KICBwYWRkaW5nOiAxMnB4IDE2cHg7DQogIGRpc3BsYXk6IGlubGluZS1ibG9jazsNCiAgb3V0bGluZTogMDsNCiAgYm94LXNoYWRvdzogaW5zZXQgMHB4IDBweCAwcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4zKSwgaW5zZXQgMHB4IDJweCAwcHggcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjE1KSwgMHB4IDFweCAycHggcmdiYSgwLCAwLCAwLCAwLjEpOw0KICBib3JkZXItcmFkaXVzOiAzcHg7DQogIGJvcmRlcjogbm9uZTsNCiAgYmFja2dyb3VuZDogIzNDOEZDNzsNCiAgLW1vei10cmFuc2l0aW9uOiBhbGwgbGluZWFyIDAuMTVzOw0KICAtd2Via2l0LXRyYW5zaXRpb246IGFsbCBsaW5lYXIgMC4xNXM7DQogIC1vLXRyYW5zaXRpb246IGFsbCBsaW5lYXIgMC4xNXM7DQogIC1tcy10cmFuc2l0aW9uOiBhbGwgbGluZWFyIDAuMTVzOw0KICBmb250LWZhbWlseTogIkd1ZGVhIjsNCiAgZm9udC1zaXplOiAwLjkzOGVtOw0KICBmb250LXdlaWdodDogNjAwOw0KICB0ZXh0LXNoYWRvdzogLTFweCAxcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4yKTsNCiAgbGluZS1oZWlnaHQ6IDEwMCU7DQogIGNvbG9yOiAjZmZmOw0KfQ0KLyogbGluZSAxOSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQouYnRuOmhvdmVyLCAuYnRuOmFjdGl2ZSwgI3N1Ym1pdDpob3ZlciwgI3N1Ym1pdDphY3RpdmUgew0KICBjdXJzb3I6IHBvaW50ZXI7DQogIGJhY2tncm91bmQ6ICM2M2E1ZDI7DQogIHRleHQtZGVjb3JhdGlvbjogbm9uZTsNCn0NCi8qIGxpbmUgMjYsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2J1dHRvbnMuc2NzcyAqLw0KLmJ0bjphY3RpdmUsICNzdWJtaXQ6YWN0aXZlIHsNCiAgYm94LXNoYWRvdzogaW5zZXQgMHB4IDBweCAwcHggMXB4IHJnYmEoMCwgMCwgMCwgMC4zKSwgaW5zZXQgMHB4IDFweCAzcHggcmdiYSgwLCAwLCAwLCAwLjUpOw0KfQ0KLyogbGluZSAzMSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQouYnRuIFtjbGFzc149ImZhLSJdLCAjc3VibWl0IFtjbGFzc149ImZhLSJdIHsNCiAgbGluZS1oZWlnaHQ6IDBweDsNCn0NCg0KLyogbGluZSAzOCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQpidXR0b24uYnRuIHsNCiAgcGFkZGluZy10b3A6IDEycHggIWltcG9ydGFudDsNCiAgcGFkZGluZy1ib3R0b206IDEycHggIWltcG9ydGFudDsNCn0NCg0KLyogbGluZSA0NCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQouYnRuLnNtYWxsIHsNCiAgcGFkZGluZzogOHB4IDEycHggMTBweDsNCiAgZm9udC1zaXplOiAwLjc1MGVtOw0KfQ0KDQovKiBsaW5lIDUxLCAuLi9zY3NzLzItZnJhbWV3b3JrL19idXR0b25zLnNjc3MgKi8NCi5idG4ubGFyZ2Ugew0KICBwYWRkaW5nOiAxN3B4IDI0cHg7DQogIGZvbnQtc2l6ZTogMS41MDBlbTsNCn0NCg0KLyogbGluZSA1OCwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQouYnRuLWdyb3VwIHsNCiAgZGlzcGxheTogaW5saW5lLWJsb2NrOw0KfQ0KLyogbGluZSA2MSwgLi4vc2Nzcy8yLWZyYW1ld29yay9fYnV0dG9ucy5zY3NzICovDQouYnRuLWdyb3VwIC5idG4gew0KICBtYXJnaW4tcmlnaHQ6IC0xcHg7DQogIGZsb2F0OiBsZWZ0Ow0KICBib3JkZXItcmFkaXVzOiAwcHg7DQp9DQovKiBsaW5lIDY2LCAuLi9zY3NzLzItZnJhbWV3b3JrL19idXR0b25zLnNjc3MgKi8NCi5idG4tZ3JvdXAgLmJ0bjpmaXJzdC1jaGlsZCB7DQogIGJvcmRlci1yYWRpdXM6IDNweCAwcHggMHB4IDNweDsNCn0NCi8qIGxpbmUgNzAsIC4uL3Njc3MvMi1mcmFtZXdvcmsvX2J1dHRvbnMuc2NzcyAqLw0KLmJ0bi1ncm91cCAuYnRuOmxhc3QtY2hpbGQgew0KICBib3JkZXItcmFkaXVzOiAwcHggM3B4IDNweCAwcHg7DQp9DQoNCi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlwNCi0tLS0tLS0tIENvbXBvbmVudHMNClwqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8NCi8qIGxpbmUgMSwgLi4vc2Nzcy8zLWNvbXBvbmVudHMvZ2xvYmFsL19zaXRlLWhlYWRlci5zY3NzICovDQouc2l0ZS1oZWFkZXItd3JhcCB7DQogIG1hcmdpbi1ib3R0b206IDYwcHg7DQogIHBhZGRpbmc6IDQ1cHggMHB4IDQwcHg7DQogIHBvc2l0aW9uOiByZWxhdGl2ZTsNCiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMwMDA7DQogIGJhY2tncm91bmQ6ICMxYjFiMWIgdXJsKCIuLi9pbWcvZGFyay1iZy5wbmciKTsNCn0NCi8qIGxpbmUgOCwgLi4vc2Nzcy8zLWNvbXBvbmVudHMvZ2xvYmFsL19zaXRlLWhlYWRlci5zY3NzICovDQouc2l0ZS1oZWFkZXItd3JhcDphZnRlciB7DQogIHdpZHRoOiAxMDAlOw0KICBoZWlnaHQ6IDRweDsNCiAgcG9zaXRpb246IGFic29sdXRlOw0KICB0b3A6IDBweDsNCiAgbGVmdDogMHB4Ow0KICBjb250ZW50OiAnJzsNCiAgYmFja2dyb3VuZDogdXJsKCIuLi9pbWcvc3RyaXBlLWJnLnBuZyIpIHJlcGVhdC14Ow0KfQ0KDQovKiBsaW5lIDE5LCAuLi9zY3NzLzMtY29tcG9uZW50cy9nbG9iYWwvX3NpdGUtaGVhZGVyLnNjc3MgKi8NCi5zaXRlLWhlYWRlciB7DQogIHdpZHRoOiAxMDAwcHg7DQogIG1hcmdpbjogMHB4IGF1dG87DQogIHRleHQtYWxpZ246IGNlbnRlcjsNCn0NCg0KLyogbGluZSAxLCAuLi9zY3NzLzMtY29tcG9uZW50cy9nbG9iYWwvX3NpdGUtbG9nby5zY3NzICovDQouc2l0ZS1sb2dvIHsNCiAgZm9udC1mYW1pbHk6ICJBc2FwIjsNCiAgZm9udC1zaXplOiAzLjAwMGVtOw0KICBjb2xvcjogIzc3NzsNCiAgbGluZS1oZWlnaHQ6IDEwMCU7DQogIC1tb3otdHJhbnNpdGlvbjogY29sb3IgbGluZWFyIDAuMTVzOw0KICAtd2Via2l0LXRyYW5zaXRpb246IGNvbG9yIGxpbmVhciAwLjE1czsNCiAgLW8tdHJhbnNpdGlvbjogY29sb3IgbGluZWFyIDAuMTVzOw0KICAtbXMtdHJhbnNpdGlvbjogY29sb3IgbGluZWFyIDAuMTVzOw0KfQ0KLyogbGluZSA5LCAuLi9zY3NzLzMtY29tcG9uZW50cy9nbG9iYWwvX3NpdGUtbG9nby5zY3NzICovDQouc2l0ZS1sb2dvOmhvdmVyIHsNCiAgdGV4dC1kZWNvcmF0aW9uOiBub25lOw0KICBjb2xvcjogI2ZmZjsNCn0NCi8qIGxpbmUgMTUsIC4uL3Njc3MvMy1jb21wb25lbnRzL2dsb2JhbC9fc2l0ZS1sb2dvLnNjc3MgKi8NCi5zaXRlLWxvZ28gc3BhbiB7DQogIGRpc3BsYXk6IGJsb2NrOw0KICBmb250LXNpemU6IDAuNTAwZW07DQp9DQoNCi8qIGxpbmUgMSwgLi4vc2Nzcy8zLWNvbXBvbmVudHMvZ2xvYmFsL19zaXRlLW5hdi5zY3NzICovDQouc2l0ZS1oZWFkZXIgLnNpdGUtbmF2IHsNCiAgd2lkdGg6IDEwMCU7DQogIG1hcmdpbi10b3A6IDMwcHg7DQogIHBhZGRpbmctdG9wOiAzMHB4Ow0KICBib3gtc2hhZG93OiBpbnNldCAwcHggMXB4IDBweCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpOw0KICBib3JkZXItdG9wOiAxcHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjc1KTsNCn0NCi8qIGxpbmUgOCwgLi4vc2Nzcy8zLWNvbXBvbmVudHMvZ2xvYmFsL19zaXRlLW5hdi5zY3NzICovDQouc2l0ZS1oZWFkZXIgLnNpdGUtbmF2IGEgew0KICBtYXJnaW4tcmlnaHQ6IDQwcHg7DQogIGZvbnQtd2VpZ2h0OiA2MDA7DQogIGNvbG9yOiAjNzc3Ow0KICAtbW96LXRyYW5zaXRpb246IGNvbG9yIGxpbmVhciAwLjE1czsNCiAgLXdlYmtpdC10cmFuc2l0aW9uOiBjb2xvciBsaW5lYXIgMC4xNXM7DQogIC1vLXRyYW5zaXRpb246IGNvbG9yIGxpbmVhciAwLjE1czsNCiAgLW1zLXRyYW5zaXRpb246IGNvbG9yIGxpbmVhciAwLjE1czsNCn0NCi8qIGxpbmUgMTUsIC4uL3Njc3MvMy1jb21wb25lbnRzL2dsb2JhbC9fc2l0ZS1uYXYuc2NzcyAqLw0KLnNpdGUtaGVhZGVyIC5zaXRlLW5hdiBhOmhvdmVyIHsNCiAgdGV4dC1kZWNvcmF0aW9uOiBub25lOw0KICBjb2xvcjogI2ZmZjsNCn0NCi8qIGxpbmUgMjEsIC4uL3Njc3MvMy1jb21wb25lbnRzL2dsb2JhbC9fc2l0ZS1uYXYuc2NzcyAqLw0KLnNpdGUtaGVhZGVyIC5zaXRlLW5hdiBhIFtjbGFzc149ImZhLSJdIHsNCiAgbWFyZ2luLXJpZ2h0OiA1cHg7DQogIGZvbnQtc2l6ZTogMS4yMDBlbTsNCn0NCg0KLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXA0KLS0tLS0tLS0gR2VuZXJhbCBTdHlsZXMNClwqLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi8NCi8qIGxpbmUgMzYsIC4uL3Njc3MvbWFpbi5zY3NzICovDQpodG1sLCBib2R5IHsNCiAgaGVpZ2h0OiAxMDAlOw0KICBiYWNrZ3JvdW5kOiAjZmZmOw0KfQ0KDQovKiBsaW5lIDQxLCAuLi9zY3NzL21haW4uc2NzcyAqLw0KLm1haW4gew0KICB3aWR0aDogMTAwMHB4Ow0KICBtYXJnaW46IDBweCBhdXRvOw0KfQ0KDQovKiBsaW5lIDQ3LCAuLi9zY3NzL21haW4uc2NzcyAqLw0KaW1nIHsNCiAgbWF4LXdpZHRoOiAxMDAlOw0KICBoZWlnaHQ6IGF1dG87DQp9DQoNCi8qIGxpbmUgNTIsIC4uL3Njc3MvbWFpbi5zY3NzICovDQoucGFnZS10aXRsZSB7DQogIG1hcmdpbi1ib3R0b206IDQwcHg7DQogIHBhZGRpbmctYm90dG9tOiA0MHB4Ow0KICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZTJlMjsNCiAgdGV4dC1hbGlnbjogY2VudGVyOw0KfQ0K");
geocortex.resourceManager.register("FindFeederModules","inv","Modules/FindFeeder/demo.css","css","LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qXA0KLS0tLS0tLS0gUGFnZSBTdHlsZXM6IEFjY29yZGlvbg0KXCotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qLw0KYm9keSB7DQoJcG9zaXRpb246cmVsYXRpdmU7DQoJei1pbmRleDowOw0KfQ0KLm1haW46YmVmb3JlIHsNCgl3aWR0aDoxMDAlOw0KCWhlaWdodDoxMDAlOw0KCXBvc2l0aW9uOmFic29sdXRlOw0KCXRvcDowcHg7DQoJbGVmdDowcHg7DQoJei1pbmRleDotMTsNCgljb250ZW50OicnOw0KCWJhY2tncm91bmQ6LXdlYmtpdC1yYWRpYWwtZ3JhZGllbnQoMzAlLCByZ2JhKDI1NSwyNTUsMjU1LDAuMTUpLCByZ2JhKDAsMCwwLDApKSwgdXJsKCdpbWcvYm9keS1iZy5wbmcnKTsNCgliYWNrZ3JvdW5kOi1tb3otcmFkaWFsLWdyYWRpZW50KDMwJSwgcmdiYSgyNTUsMjU1LDI1NSwwLjE1KSwgcmdiYSgwLDAsMCwwKSksIHVybCgnaW1nL2JvZHktYmcucG5nJyk7DQoJYmFja2dyb3VuZDotby1yYWRpYWwtZ3JhZGllbnQoMzAlLCByZ2JhKDI1NSwyNTUsMjU1LDAuMTUpLCByZ2JhKDAsMCwwLDApKSwgdXJsKCdpbWcvYm9keS1iZy5wbmcnKTsNCgliYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudCgzMCUsIHJnYmEoMjU1LDI1NSwyNTUsMC4xNSksIHJnYmEoMCwwLDAsMCkpLCB1cmwoJ2ltZy9ib2R5LWJnLnBuZycpOw0KfQ0KDQouc2l0ZS1oZWFkZXItd3JhcCB7DQoJbWFyZ2luLWJvdHRvbTo2MHB4Ow0KCWJvcmRlci1ib3R0b206MXB4IHNvbGlkICNjZDlhZDY7DQp9DQoNCi8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKlwNCi0tLS0tLS0tIERFTU8gQ29kZTogYWNjb3JkaW9uDQpcKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovDQovKi0tLS0tIEFjY29yZGlvbiAtLS0tLSovDQouYWNjb3JkaW9uLCAuYWNjb3JkaW9uICogew0KCS13ZWJraXQtYm94LXNpemluZzpib3JkZXItYm94OyANCgktbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDsgDQoJYm94LXNpemluZzpib3JkZXItYm94Ow0KfQ0KDQouYWNjb3JkaW9uIHsNCglvdmVyZmxvdzpoaWRkZW47DQoJYm94LXNoYWRvdzowcHggMXB4IDNweCByZ2JhKDAsMCwwLDAuMjUpOw0KCWJvcmRlci1yYWRpdXM6M3B4Ow0KCWJhY2tncm91bmQ6I2Y3ZjdmNzsNCn0NCg0KLyotLS0tLSBTZWN0aW9uIFRpdGxlcyAtLS0tLSovDQouYWNjb3JkaW9uLXNlY3Rpb24tdGl0bGUgew0KCXdpZHRoOjEwMCU7DQoJcGFkZGluZzo1cHg7DQoJZGlzcGxheTppbmxpbmUtYmxvY2s7DQoJYmFja2dyb3VuZDojZWZlZmVmOw0KCXRyYW5zaXRpb246YWxsIGxpbmVhciAwLjE1czsNCgkvKiBUeXBlICovDQoJZm9udC1zaXplOjEuMjAwZW07DQoJDQoJY29sb3I6IzAwMDsNCn0NCg0KLmFjY29yZGlvbi1zZWN0aW9uLXRpdGxlLmFjdGl2ZSwgLmFjY29yZGlvbi1zZWN0aW9uLXRpdGxlOmhvdmVyIHsNCgliYWNrZ3JvdW5kOiMyRkI0RTk7DQoJYm9yZGVyLXJhZGl1czo3cHg7DQoJdGV4dC1kZWNvcmF0aW9uOm5vbmU7DQp9DQoNCi5hY2NvcmRpb24tc2VjdGlvbjpsYXN0LWNoaWxkIC5hY2NvcmRpb24tc2VjdGlvbi10aXRsZSB7DQoJYm9yZGVyLWJvdHRvbTpub25lOw0KfQ0KDQovKi0tLS0tIFNlY3Rpb24gQ29udGVudCAtLS0tLSovDQouYWNjb3JkaW9uLXNlY3Rpb24tY29udGVudCB7DQoJcGFkZGluZzo3cHg7DQoJZGlzcGxheTpub25lOw0KfQ0K");
geocortex.resourceManager.register("FindFeederModules","inv","Modules/FindFeeder/FindFeederModule.css","css","LyouRmluZEZlZWRlci1tb2R1bGUtdmlld3s8aW5wdXQgdHlwZT0iYnV0dG9uIiBpZD0iYnRuVHJhY2VVcHN0cmVhbSIgdmFsdWU9IlRyYWNlIFVwc3RyZWFtIiAvPg0KICAgIHotaW5kZXg6IDA7DQogICAgd2lkdGg6IDUwJTsNCiAgICBkaXNwbGF5OmlubGluZTsNCiAgICBiYWNrZ3JvdW5kOiB3aGl0ZTsNCiAgICBjb2xvcjogYmxhY2s7DQogICAgbWFyZ2luLWxlZnQ6IDE1cHg7DQp9Ki8NCg0KI2ZpbmRGZWVkZXJTZWxlY3RlZEZlZWRlcnsNCiAgICBjb2xvcjpibHVlOw0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgLmNvbnRhaW5lciB7DQogICAgYmFja2dyb3VuZC1jb2xvcjojZWZlZmVmOw0KICAgIGJvcmRlci1yYWRpdXM6NHB4Ow0KICAgIGJvcmRlci13aWR0aDogdGhpbjsNCiAgICBib3JkZXItc3R5bGU6IGdyb292ZTsNCiAgICBib3JkZXItcmFkaXVzOjdweDsNCiAgICBtYXJnaW4tYm90dG9tOiA1cHg7DQogICAgb3ZlcmZsb3c6IGhpZGRlbjsNCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IC5zZWN0aW9uSGVhZGVyIHsNCiAgICAgZm9udC13ZWlnaHQ6NjAwIDsNCiAgICAgZGlzcGxheTogaW5saW5lLWJsb2NrOw0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgLmdwc1NlY3Rpb24gew0KICAgICBtYXJnaW4tYm90dG9tOiA1cHg7DQp9DQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAubG9jYXRpb25DaGVja2JveHsNCiAgICBtYXJnaW4tdG9wOiAxMXB4Ow0KICAgIG1hcmdpbi1sZWZ0OiA1cHg7DQogICAgbWFyZ2luLWJvdHRvbTogMTBweDsNCiAgICB2ZXJ0aWNhbC1hbGlnbjogaW5oZXJpdDsNCiAgICAtbXMtdHJhbnNmb3JtOiBzY2FsZSgxLjUpOw0KICAgIC1tb3otdHJhbnNmb3JtOiBzY2FsZSgxLjUpOw0KICAgIC13ZWJraXQtdHJhbnNmb3JtOiBzY2FsZSgxLjUpOw0KICAgIC1vLXRyYW5zZm9ybTogc2NhbGUoMik7DQogICAgcGFkZGluZzogMTBweDsNCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3ICN3cmFwcGVyIHsNCiAgbWFyZ2luLXJpZ2h0OmluaGVyaXQ7DQp9DQouRmluZEZlZWRlci1tb2R1bGUtdmlldyBzZWxlY3R7DQogICAgbWFyZ2luLXRvcDo0cHg7DQogICAgbWFyZ2luLWJvdHRvbTo2cHg7DQogICAgaGVpZ2h0OjIwcHg7DQogICAgYm9yZGVyLXJhZGl1czogM3B4Ow0KICAgIHdpZHRoOiBhdXRvOw0KICAgIGhlaWdodDphdXRvOw0KfQ0KDQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAubGFiZWxUZXh0ew0KICAgIGNvbG9yOmdyZWVuOw0KICAgIGZvbnQtd2VpZ2h0OjQwMCA7DQogICAgZm9udC1zaXplOm1lZGl1bTsNCg0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgLnNtYWxsTGFiZWxUZXh0ew0KICAgIGNvbG9yOmdyYXk7DQogICAgZm9udC13ZWlnaHQ6NDAwIDsNCiAgICBmb250LXNpemU6c21hbGw7DQp9DQovKi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IC5sYmxTaG93U2VydmljZXsNCiAgICBmb250LXdlaWdodDo2MDAgOw0KICAgIGNvbG9yOmdyYXk7DQogICAgZm9udC1zaXplOnNtYWxsOw0KICAgIA0KfSovDQojY2JvVGllRGV2aWNlc3sNCiAgICB3aWR0aDo3MCUNCn0NCi5maW5kRmVlZGVyVGFibGUgdGh7DQp3aWR0aDoxNTBweDsNCmZvbnQtc2l6ZToxMDsNCnRleHQtYWxpZ246bGVmdDsNCn0NCi5maW5kRmVlZGVyVGFibGUuZmlyc3RDaGlsZEJvbGQgdHI6Zmlyc3QtY2hpbGQgew0KICAgIGZvbnQtd2VpZ2h0OiBib2xkOw0KfQ0KLmZpbmRGZWVkZXJUYWJsZXsNCmxpbmUtaGVpZ2h0OjEuNTsNCn0NCg0KI3RpZURldmljZUF0dHJpYnV0ZXN7DQoNCm1hcmdpbi1ib3R0b20gOiA1cHggOw0KaGVpZ2h0OiAxMjAlOw0KfQ0KDQovKi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IC5sYmxTaG93QXJyb3dzLm9mZnsNCiAgICBjb2xvcjpncmVlbjsNCiAgICBmb250LXNpemU6c21hbGw7DQp9Ki8NCg0KaW1nLmFsbGlnbmVkSW1hZ2Ugew0KICAgIHZlcnRpY2FsLWFsaWduOiB0b3A7DQp9DQoNCi5sYmxTaG93QXJyb3dzLm9mZiwubGJsVHJhY2VVcERvd24ub2ZmLC5sYmxBdXRvWm9vbSwubGJsVHJhY2VGcm9tQ2FjaGUub2ZmLC5sYmxab29tVG9VcHN0cmVhbS5vZmYsLmxibFpvb21Ub0Rvd25zdHJlYW0ub2Zmew0KICAgIGNvbG9yOmdyZWVuOw0KICAgIC8qZm9udC13ZWlnaHQ6NTAwIDsNCiAgICBmb250LXNpemU6c21hbGw7Ki8NCn0NCg0KDQouc2hvd0Fycm93cywuc2hvd0Fycm93c0JveCwudHJhY2VVcERvd24sLnRyYWNlVXBEb3duQm94LC56b29tVG9VcHN0cmVhbSwuem9vbVRvRG93bnN0cmVhbSwuem9vbVRvVXBzdHJlYW1Cb3gsLnpvb21Ub0Rvd25zdHJlYW1Cb3gsLnNob3dUcmFjZSwuc2hvd1RyYWNlQm94LC5zaG93QXV0b1pvb20sLnNob3dBdXRvWm9vbUJveHsNCiAgICBtYXJnaW4tdG9wOjVweDsNCiAgICB2ZXJ0aWNhbC1hbGlnbjotN3B4Ow0KfQ0KLmxibFRyYWNlVXBEb3duLC5sYmxab29tVG9VcHN0cmVhbSwubGJsWm9vbVRvRG93bnN0cmVhbSwubGJsU2hvd0Fycm93cywubGJsVHJhY2VGcm9tQ2FjaGUsLmxibEF1dG9ab29tLm9mZnsNCiAgICBjb2xvcjpncmF5Ow0KICAgIC8qZm9udC13ZWlnaHQ6NDAwIDsNCiAgICBmb250LXNpemU6c21hbGw7Ki8NCn0NCi5zaG93QXJyb3dzLm9mZiwudHJhY2VVcERvd24ub2ZmLC56b29tVG9VcHN0cmVhbS5vZmYsLnpvb21Ub0Rvd25zdHJlYW0ub2ZmLC56b29tVG9VcHN0cmVhbUJveC5vZmYsLnpvb21Ub0Rvd25zdHJlYW1Cb3gub2ZmLC5zaG93VHJhY2Uub2ZmLC5zaG93QXV0b1pvb20ub2ZmLC5zaG93QXJyb3dzQm94Lm9mZiwudHJhY2VVcERvd25Cb3gub2ZmLC5zaG93VHJhY2VCb3gub2ZmLC5zaG93QXV0b1pvb21Cb3gub2Zmew0KICAgIGRpc3BsYXk6bm9uZTsNCn0NCg0KDQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAuc21hbGxUZXh0Qm94ew0KICAgIHdpZHRoOjMwJTsNCiAgICBiYWNrZ3JvdW5kOndoaXRlOw0KICAgIGJvcmRlci1yYWRpdXM6M3B4Ow0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgLmdwc1RleHRCb3h7DQogICAgd2lkdGg6NTAlOw0KICAgIGJhY2tncm91bmQ6d2hpdGU7DQogICAgY29sb3I6Ymx1ZTsNCiAgICBib3JkZXItcmFkaXVzOjNweDsNCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3ICNjb250ZW50IHsNCiAgZmxvYXQ6IGxlZnQ7DQogIHdpZHRoOiAxMDAlOw0KICBiYWNrZ3JvdW5kLWNvbG9yOiAjQ0NGOw0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgI3NpZGViYXIgew0KICBmbG9hdDogcmlnaHQ7DQogIHdpZHRoOiA1NnB4Ow0KICBtYXJnaW4tcmlnaHQ6IC01NnB4Ow0KICBiYWNrZ3JvdW5kLWNvbG9yOiAjRkZBOw0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgI2NsZWFyZWQgew0KICBjbGVhcjogYm90aDsNCn0NCg0KZGl2LmNvbHVtbnMgeyANCiAgICB3aWR0aDogNDAwcHg7IA0KICAgIGxpbmUtaGVpZ2h0OjEuNWVtOw0KfQ0KZGl2LmNvbHVtbnMgZGl2IHt3aWR0aDogMTAwcHg7IGZsb2F0OmxlZnQ7fQ0KZGl2LmNsZWFyIHsNCiAgICBjbGVhcjogYm90aDsNCn0NCmRpdiNkYXRhVmFsdWVzIHsNCiAgICB3aWR0aDogMjIwcHg7DQogICAgb3ZlcmZsb3cteDogaGlkZGVuOw0KICAgIHdoaXRlLXNwYWNlOiBub3dyYXA7DQp9DQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAubGFyZ2VCdXR0b24gew0KICAgIHdpZHRoOiA1MCU7DQogICAgaGVpZ2h0OiAzMHB4Ow0KICAgIGZvbnQtc2l6ZTogbWVkaXVtOw0KICAgIGJhY2tncm91bmQtY29sb3I6ICM0RkE2MDA7DQogICAgYm9yZGVyLXJhZGl1czogM3B4Ow0KICAgIG1hcmdpbi10b3A6MTVweDsNCiAgICBjb2xvcjpibGFjazsNCiAgICBmb250LXdlaWdodDogNDAwOw0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgLnNtYWxsQnV0dG9uIHsNCiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjNEZBNjAwOw0KICAgIGJvcmRlci1yYWRpdXM6IDNweDsNCiAgICBtYXJnaW4tdG9wOjVweDsNCiAgICBjb2xvcjpibGFjazsNCiAgICB3aWR0aDozMCU7DQogICAgZm9udC13ZWlnaHQ6IDQwMDsNCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IGxhYmVsIHsNCiAgIC8qIGZvbnQtc2l6ZTptZWRpdW07Ki8NCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IC5uYXZCdXR0b25zew0KICAgIG1hcmdpbi10b3A6NXB4Ow0KfQ0KLkZpbmRGZWVkZXItbW9kdWxlLXZpZXcgI2Rpc3BsYXlOYW1lcnsNCiAgICBtYXJnaW4tdG9wOjEwcHg7DQogICAgbWFyZ2luLWJvdHRvbToxMHB4Ow0KICAgIGZvbnQtc2l6ZTptZWRpdW07DQogICAgY29sb3I6I0Y0QTEwMCA7DQp9DQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAuZmVhdHVyZXNYT2ZZIHsNCiAgICBmb250LXNpemU6IGxhcmdlOw0KICAgIHZlcnRpY2FsLWFsaWduOiB0b3A7DQogICAgZm9udC1zaXplOiBzbWFsbDsNCiAgICBwb3NpdGlvbjogcmVsYXRpdmU7DQogICAgdG9wOiAtOHB4Ow0KICAgIGNvbG9yOiNDNDAxNEI7DQp9DQoNCi5oZWxsb09mZnNldHsNCiAgICBtYXJnaW4tbGVmdDo1cHg7DQogICAgbWFyZ2luLXJpZ2h0OjVweDsNCn0NCi5sb2NhdGlvbkJ1dHRvbnMgew0KICAgIG1hcmdpbi1sZWZ0OiAxMHB4Ow0KICAgIHZlcnRpY2FsLWFsaWduOiBib3R0b207DQp9DQojY29udGVudCB7DQogIGZsb2F0OiBsZWZ0Ow0KICB3aWR0aDogMTAwJTsNCiAgaGVpZ2h0OiAyNHB4Ow0KICANCn0NCi5GaW5kRmVlZGVyLW1vZHVsZS12aWV3IGlucHV0IHsNCiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZWZlZmVmOw0KfQ0KLmZlYXR1cmVzWE9mWXsNCiAgICB2ZXJ0aWNhbC1hbGlnbjogdG9wOw0KICAgIG1hcmdpbi1sZWZ0OiA1cHg7DQogICAgbWFyZ2luLXJpZ2h0OiA1cHg7DQp9DQouRmluZEZlZWRlci1tb2R1bGUtdmlldyAjYnRuQWRkVGV4dHsNCiAgICAtbW96LWJvcmRlci1yYWRpdXM6IDRweDsNCiAgICAtd2Via2l0LWJvcmRlci1yYWRpdXM6IDRweDsNCiAgICBib3JkZXItcmFkaXVzOiA0cHg7DQogICAgbWFyZ2luLXRvcDo1MHB4Ow0KfQ0KI2NsZWFyZWR7DQoNCn0NCg0KDQouZGl2LXRvZ2dsZXMgew0KCW1hcmdpbi10b3A6IDFlbTsNCn0NCi5kaXYtdG9nZ2xlcyAudHJpZ2dlciB7DQoJcG9zaXRpb246IHJlbGF0aXZlOw0KCWRpc3BsYXk6IGlubGluZS1ibG9jazsNCgl3aWR0aDogNDBweDsNCglwYWRkaW5nOiA0cHg7DQoJaGVpZ2h0OiAyNXB4Ow0KCWJvcmRlcjogMXB4IHNvbGlkICM2NjY7DQoJYm9yZGVyLXJhZGl1czogMnB4Ow0KCWJhY2tncm91bmQ6ICNlZWU7DQoJYm94LXNoYWRvdzogaW5zZXQgMCAtMTdweCA4cHggcmdiYSgwLDAsMCwwLjMpLCBpbnNldCAwIC00cHggN3B4IHJnYmEoMCwwLDAsMC4zKTsNCn0NCi5kaXYtdG9nZ2xlcyAudHJpZ2dlcjphZnRlciB7DQoJY29udGVudDogIiI7DQoJZGlzcGxheTogYmxvY2s7DQoJcG9zaXRpb246IGFic29sdXRlOw0KCXRvcDogNTAlOw0KCXJpZ2h0OiA1cHg7DQoJbWFyZ2luLXRvcDogLTJweDsNCglib3JkZXI6IDVweCBzb2xpZDsNCglib3JkZXItY29sb3I6ICMwMDAgdHJhbnNwYXJlbnQgdHJhbnNwYXJlbnQ7DQp9DQouZGl2LXRvZ2dsZXMgLnRyaWdnZXI6YmVmb3JlIHsNCgljb250ZW50OiAiIjsNCglkaXNwbGF5OiBibG9jazsNCglwb3NpdGlvbjogYWJzb2x1dGU7DQoJdG9wOiA1MCU7DQoJcmlnaHQ6IDRweDsNCgltYXJnaW4tdG9wOiAtMXB4Ow0KCWJvcmRlcjogNXB4IHNvbGlkOw0KCWJvcmRlci1jb2xvcjogI2VlZSB0cmFuc3BhcmVudCB0cmFuc3BhcmVudDsNCn0NCi5kaXYtdG9nZ2xlcyAuYWN0aXZlOmJlZm9yZSB7DQoJbWFyZ2luLXRvcDogLTdweDsNCglib3JkZXItY29sb3I6IHRyYW5zcGFyZW50IHRyYW5zcGFyZW50ICNlZWU7DQp9DQouZGl2LXRvZ2dsZXMgLmFjdGl2ZTphZnRlciB7DQoJbWFyZ2luLXRvcDogLThweDsNCglib3JkZXItY29sb3I6IHRyYW5zcGFyZW50IHRyYW5zcGFyZW50ICMwMDA7DQp9DQouZGl2LXRvZ2dsZXMgLnRyaWdnZXIgZGl2IHsNCglkaXNwbGF5OiBpbmxpbmUtYmxvY2s7DQoJd2lkdGg6IDIzcHg7DQoJaGVpZ2h0OiAyM3B4Ow0KCWJhY2tncm91bmQ6ICNmZmYgdXJsKCdkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhEQUFNQUlBQkFNek16UC8vL3lINUJBRUFBQUVBTEFBQUFBQU1BQXdBQUFJV2hCK3BoNXBzM0lNeVFGQnZ6VlJxM3ptZkdDNVFBUUE3Jyk7DQp9DQouZGl2LXRvZ2dsZXMgLnRyaWdnZXIgZGl2IGRpdiB7DQoJYm9yZGVyOiAxcHggc29saWQgIzY2NjsNCglib3JkZXItY29sb3I6ICM2NjYgI2NjYyAjY2NjICM2NjY7DQoJYmFja2dyb3VuZDogI2FhYTsNCn0NCg==");

geocortex.framework.notifyLibraryDownload("FindFeederModules");
