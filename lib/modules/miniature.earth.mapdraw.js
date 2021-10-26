// MapDraw v1.0
// Tools to draw on the map canvas

window.addEventListener( "earthjsload", function() {

	Earth.MapDraw = {};
	
	
	// add draw methods to earth instance
	
	Earth.MapDraw.enable = function( earth ) {
	
		// draw polygon
		
		earth.drawPolygon = function( locations, style ) {

			if ( ! style) style = {};
			
			if ( ! style.color ) style.color = 'RGBA(255,0,0,0.25)';
			if ( ! style.strokeColor ) style.strokeColor = '#FF0000';
			if ( typeof style.strokeWidth == 'undefined' ) style.strokeWidth = 0;
			

			var ctx = earth.mapContext;
			ctx.save();
			

			ctx.beginPath();
			
			var uv = Earth.latLngToUv( locations[0] );
			ctx.moveTo( uv.x * earth.mapCanvas.width, uv.y * earth.mapCanvas.height );
			
			for ( var i=1; i < locations.length; i++ ) {
				var uv = Earth.latLngToUv( locations[i] );
				ctx.lineTo( uv.x * earth.mapCanvas.width, uv.y * earth.mapCanvas.height );
			}
			
			uv = Earth.latLngToUv( locations[0] );
			ctx.lineTo( uv.x * earth.mapCanvas.width, uv.y * earth.mapCanvas.height );
			
			
			// fill
			if ( style.color && style.color != 'transparent' ) {
				ctx.fillStyle = style.color;
				ctx.fill();
			}
					
			// stroke
			if ( style.strokeColor && style.strokeColor != 'transparent' && style.strokeWidth ) {
				ctx.strokeStyle = style.strokeColor;
				ctx.lineWidth = style.strokeWidth * earth.mapCanvas.width / 1024;
				ctx.stroke();
			}
			
			ctx.restore();

		};

		
		// draw line
		
		earth.drawLine = function( locations, style ) {

			if ( ! style) style = {};
			
			if ( ! style.strokeColor ) style.strokeColor = '#FF0000';
			if ( ! style.strokeWidth ) style.strokeWidth = 1;
			

			var ctx = earth.mapContext;
			ctx.save();
			

			ctx.beginPath();
			
			var uv = Earth.latLngToUv( locations[0] );
			ctx.moveTo( uv.x * earth.mapCanvas.width, uv.y * earth.mapCanvas.height );
			
			for ( var i=1; i < locations.length; i++ ) {
				var uv = Earth.latLngToUv( locations[i] );
				ctx.lineTo( uv.x * earth.mapCanvas.width, uv.y * earth.mapCanvas.height );
			}
			
					
			// stroke
			ctx.strokeStyle = style.strokeColor;
			ctx.lineWidth = style.strokeWidth * earth.mapCanvas.width / 1024;
			ctx.stroke();
			
			ctx.restore();

		};
		
		
		// draw point

		earth.drawPoint = function( location, style ) {
		
			if ( ! style) style = {};
			if ( ! style.color ) style.color = '#FF0000';
			if ( ! style.size ) style.size = 1;
			
			
			var uv = Earth.latLngToUv( location );
			
			// compensate map projection/distortion
			var offset = Math.abs( location.lat ) / 90;
			var scale_x = 1 + Earth.Animation.Easing['in-quart'](offset) * 5;
			var scale_y = 1 + Earth.Animation.Easing['in-quart'](offset) * 0.4;
			
			
			var ctx = earth.mapContext;
			ctx.save();
			
			ctx.beginPath();
			
			ctx.ellipse(
				uv.x * earth.mapCanvas.width,
				uv.y * earth.mapCanvas.height,
				style.size * scale_x * earth.mapCanvas.width / 1024,
				style.size * scale_y * earth.mapCanvas.width / 1024,
				0,
				0,
				2 * Math.PI
			);
			
			ctx.fillStyle = style.color;
			ctx.fill();
		
			ctx.restore();
			
		};
		
		
		
		// draw map layer

		earth.loadMapLayer = function( image_url ) {
			
			var layer_img = new Image();
			
			layer_img.onload = function() {
			
				earth.mapContext.drawImage(
					layer_img,
					0, 0, layer_img.width, layer_img.height,
					0, 0, earth.mapCanvas.width, earth.mapCanvas.height
				);
				
				earth.updateMap();
				
			};
			
			layer_img.src = image_url;
			
		};
	
	
	};
	

} );