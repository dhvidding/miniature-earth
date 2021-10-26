// Draggable v1.0
// Makes Markers, Sprites and Images draggable
// The hotspot property of the object must be true

window.addEventListener( "earthjsload", function() {

	Earth.Draggable = {};
	
	// drag settings
	var rotation_speed = 16;	// maximum auto rotation speed
	var start_duration = 1000;	// start auto rotation slowly over this time
	var grab_duration  = 200;	// smoothly move the object to the pointer position
	
	
	var dragging = false;
	var drag_object, start_location, drag_time, grab_time;
	var earth_center_offset = { x: 0, y: 0 }, earth_radius = 0, over_earth;
	var event_pos = { x: 0, y: 0 };

	
	// enable/disable dragging
	
	Earth.Draggable.enable = function( obj ) {
		obj.addEventListener( 'mousedown', startDrag );
	};
	Earth.Draggable.disable = function( obj ) {
		obj.removeEventListener( 'mousedown', startDrag );
	};
	
	
	// handle drag start
	
	function startDrag( event ) {
		
		if ( dragging ) {
			stopDrag();
		}
		
		dragging = true;
		this.earth.addEventListener( "update", updateDrag );
		document.addEventListener( "mouseup", stopDrag );
		document.addEventListener( "touchend", stopDragTouch );
		document.addEventListener( "mousemove", getEventPosition );	
		document.addEventListener( "touchmove", getEventPosition );
		
		document.documentElement.classList.add('earth-dragging');
		
		drag_object = this;
		over_earth = false;
		drag_time = 0;
		grab_time = 0;
		start_location = this.location;
		earth_radius = drag_object.earth.getRadius();
		
		this.earth.draggable = false;
		this.earth.dragMomentum = false;
		this.earth.autoRotate = true;
		this.earth.autoRotateDelay = 0;
		this.earth.autoRotateStart = 0;
		this.earth.autoRotateSpeed = 0;
		this.earth.autoRotateSpeedUp = 0;
		
		getEventPosition( event.originalEvent );
		
		drag_object.dispatchEvent( { type: 'dragstart' } );
		
	};
	
	
	// handle drag stop
	
	function stopDragTouch( event ) {
		if ( ! event.touches.length ) stopDrag(); // no more touches
	}
	
	function stopDrag() {

		if ( ! dragging ) return;
		
		dragging = false;
		drag_object.earth.removeEventListener( "update", updateDrag );
		document.removeEventListener( "mouseup", stopDrag );
		document.removeEventListener( "touchend", stopDragTouch );
		document.removeEventListener( "mousemove", getEventPosition );	
		document.removeEventListener( "touchmove", getEventPosition );
		
		document.documentElement.classList.remove('earth-dragging');
		
		drag_object.earth.draggable = true;
		drag_object.earth.dragMomentum = true;
		drag_object.earth.autoRotate = false;
		
		drag_object.dispatchEvent( { type: 'dragend' } );

	};
	
	
	// handle drag move

	function updateDrag() {

		if ( ! dragging ) return;
		
		drag_time += drag_object.earth.deltaTime;
		grab_time += drag_object.earth.deltaTime;
		
		
		var rect = drag_object.earth.element.getBoundingClientRect();
		earth_center_offset.x = (event_pos.x - rect.left - rect.width / 2) / rect.width;
		earth_center_offset.y = (event_pos.y - rect.top - rect.height / 2) / rect.height;
		

		// determine the location of the dragged object

		var location = drag_object.earth.getLocation( event_pos );

		if ( location ) { // mouse over earth
		
			if ( ! over_earth ) {
				start_location = drag_object.location;
				grab_time = 0;
			}
			over_earth = true;
			
		} else { // mouse not over earth
		
			if ( over_earth ) {
				start_location = drag_object.location;
				grab_time = 0;
			}
			over_earth = false;
		
			// find nearest location on earth edge
			
			var radius = 0.95;
			var magnitude = Math.sqrt( earth_center_offset.x * earth_center_offset.x + earth_center_offset.y * earth_center_offset.y );
			var direction = {
				x : earth_center_offset.x / magnitude,
				y : earth_center_offset.y / magnitude
			};

			while ( ! location && radius > 0.8 ) {
				var client_pos = {
					x : rect.left + rect.width / 2 + direction.x * earth_radius * radius,
					y : rect.top + rect.height / 2 + direction.y * earth_radius * radius
				};
				
				location = drag_object.earth.getLocation( client_pos );
				radius -= 0.01;
			}
			
		}
		
		if ( ! location ) return;

		
		
		// smooth drag location
		if ( grab_time < grab_duration ) {
			location = Earth.lerp( start_location, location, grab_time / grab_duration );
		}

		drag_object.location = location;
		


		// start slowly
		var start_speed = 1;
		if ( drag_time < start_duration ) { 
			start_speed = drag_time / start_duration;
		}
		
		// rotate the earth
		drag_object.earth.autoRotateSpeed =   easeRotationSpeed( earth_center_offset.x ) * - rotation_speed * start_speed;
		drag_object.earth.autoRotateSpeedUp = easeRotationSpeed( earth_center_offset.y ) * - rotation_speed * start_speed * 0.8;

		drag_object.dispatchEvent( { type: 'dragmove' } );
		

	};
	

	// update the mouse/touch position

	function getEventPosition( event ) {
		if ( event.changedTouches ) {			
			event_pos.x = event.changedTouches[0].clientX;
			event_pos.y = event.changedTouches[0].clientY;
		} else {
			event_pos.x = event.clientX;
			event_pos.y = event.clientY;
		}
	}

	
	// ease the auto rotation speed depending on the distance to the earth center

	function easeRotationSpeed( pos ) {
		var sign = Math.sign(pos);
		pos = Math.min( Math.abs(pos)*3, 1 );
		pos -= 0.1;
		if ( pos < 0 ) pos = 0;
		return Earth.Animation.Easing['in-quart']( pos ) * sign;
	}

} );