// TextImage v1.0
// Creates images of text for use with Sprite and Image objects

window.addEventListener( "earthjsload", function() {

	Earth.TextImage = {};
	
	// debug mode
	Earth.TextImage.DEBUG = false;
	
	
	// draws text with the given options
	// options
	//		fontFamily	default: sans-serif
	//		fontStyle	default: ""
	//		fontWeight	default: ""
	//		lineHeight	default: 1
	//		quality		default: 1
	// return object
	//		image		dataURI
	//		scale		e.g. 1.5
	//		resolution	e.g. 128
	
	Earth.TextImage.draw = function( text, options ) {
		
		// create canvas for text rendering on first use
		
		if ( ! this.canvas ) {
			this.addCanvas();
		}
		

		if ( ! options ) options = {};
		
		
		// default values
		
		if ( ! options.quality ) options.quality = 1;
		if ( ! options.lineHeight ) options.lineHeight = 1;		
		if ( ! options.fontFamily )	options.fontFamily = "sans-serif";
		
		
		// setup font style
		
		var font_size = 60 * options.quality;		
		var font =	(( options.fontStyle ) ? options.fontStyle+" " : "") +
					(( options.fontWeight ) ? options.fontWeight+" " : "") +
					font_size+"px/"+font_size+"px " +
					options.fontFamily;
		
		this.ctx.font = font;
		
		
		// calculate dimensions
		
		var lines = text.split('\n');
		var lines_width = [];

		var padding = 15 * options.quality;
		var canvas_width = 0;
		var canvas_height = 2 * padding;
		
		for ( var i = 0; i < lines.length; i++ ) {
			var w = this.ctx.measureText( lines[i] ).width;
			lines_width.push( w );
			if ( w > canvas_width ) canvas_width = w;
			
			canvas_height += font_size * ((i==0) ? 1 : options.lineHeight);
		}
		
		// min width = height of one line text
		if ( canvas_width < 2 * padding + font_size ) canvas_width = 2 * padding + font_size;
		
		
		// update canvas size
		
		this.canvas.width = canvas_width;
		this.canvas.height = canvas_height;


		// render text lines
		
		this.ctx.font = font;
		this.ctx.fillStyle = '#ffffff';
		
		var y = Math.round(padding * 0.5 + font_size);
		
		for ( var i = 0; i < lines.length; i++ ) {
			var x = 0;
			if ( lines_width[i] < canvas_width ) { // center text
				x = Math.round( (canvas_width - lines_width[i]  ) / 2 );
			}
			this.ctx.fillText( lines[i], x, y );
		
			y += Math.round(font_size * options.lineHeight);
		}
		
		
		// set resolution to the next power of two of the canvas width
		var cw = canvas_width;
		var resolution = 2;
		while (cw >>= 1) resolution <<= 1;
		
		// limit resolution
		if ( resolution > 1024 ) resolution = 1024;
		
		
		// return image and infos
		
		return {
			image: this.canvas.toDataURL(),
			scale: canvas_width / font_size / 3 * 2,
			resolution : resolution
		};
		
	};
	
	
	// adds a hidden canvas element to the page for text rendering
	
	Earth.TextImage.addCanvas = function() {
		
		this.canvas = document.createElement( 'canvas' );
		document.body.appendChild( this.canvas );
		
		this.canvas.id = 'earth-textrenderer';
		this.canvas.style.position = 'fixed';
		this.canvas.style.top = 0;
		this.canvas.style.left = 0;
		
		if ( Earth.TextImage.DEBUG ) {
			this.canvas.style.backgroundColor = 'magenta';
		} else {
			this.canvas.style.visibility = 'hidden';
			this.canvas.style.pointerEvents = 'none';
			this.canvas.style.width = 0;
			this.canvas.style.height = 0;
		}
		
		this.ctx = this.canvas.getContext( '2d' );
		
	};


} );