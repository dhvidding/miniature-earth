// Input v1.0
// Rotate the earth by mousewheel or keyboard arrows

window.addEventListener( "earthjsload", function() {

	Earth.Input = {};
	
		
	// wheel settings
	
	var wheel_speed = 25;		// add this speed for one wheel turn.  values from 5 to 100
	var wheel_damping = 0.5;	// slow down wheel momentum over time. values from 0.1 to 0.99
	var min_momentum = 0.5;		// stop if momentum is less than this. values from 0.1 to 20
	
	
	Earth.Input.MouseWheel = {}
	
	Earth.Input.MouseWheel.enable = function( earth ) {
		// add mouse wheel event to the earth container element
		earth.element.addEventListener( "wheel", Earth.Input.MouseWheel.start );
	};
	
	Earth.Input.MouseWheel.disable = function( earth ) {
		earth.element.removeEventListener( "wheel", Earth.Input.MouseWheel.start );
	};
	
	
	Earth.Input.MouseWheel.start = function( event ) {
	
		// earth reference from container element
		var earth = this.earth;
		
		// begin rotation
		if ( ! earth.autoRotate ) {
			earth.wheel_momentum = 0;
			earth.autoRotate = true;
			earth.autoRotateDelay = 0;
			earth.autoRotateStart = 0;
			earth.addEventListener( "update", Earth.Input.MouseWheel.update );
		}

		// speed up
		earth.wheel_momentum += Math.sign( event.deltaY ) * - wheel_speed;
		
		// prevent page scroll
		event.preventDefault();
		event.stopPropagation();
		return false;
	
	};


	Earth.Input.MouseWheel.update = function() {
	
		// slow down
		this.wheel_momentum *= 1 - Math.min( this.deltaTime / 100 * wheel_damping, 0.99 );
		
		// stop rotation
		if ( Math.abs(this.wheel_momentum) < min_momentum ) {
			this.wheel_momentum = 0;
			this.autoRotate = false;
			this.autoRotateSpeed = 0;
			this.removeEventListener( "update", Earth.Input.MouseWheel.update );
			return;
		}
		
		// update speed
		this.autoRotateSpeed = this.wheel_momentum;
			
	};
	
	
	
	
	// keyboard settings
	
	var key_speed = 18;
	var key_updown = true;
	var key_l, key_r, key_u, key_d;
	
	
	Earth.Input.Keyboard = {}
	
	Earth.Input.Keyboard.enable = function( earth ) {
		
		earth.autoRotate = true;
		earth.autoRotateSpeed = 0;
		earth.autoRotateSpeedUp = 0;
		earth.autoRotateDelay = 0;
		earth.autoRotateStart = 0;
		

		// add key events
		
		document.addEventListener( "keydown", function( event ) {
		
			if ( event.keyCode == 37 ) { // left
				key_l = true;
				updateSpeed();
				event.preventDefault();				
				
			} else if ( event.keyCode == 39 ) { // right
				key_r = true;
				updateSpeed();
				event.preventDefault();
				
			} else if ( key_updown && event.keyCode == 38 ) { // up
				key_u = true;
				updateSpeed();
				event.preventDefault();				
				
			} else if ( key_updown && event.keyCode == 40 ) { // down
				key_d = true;
				updateSpeed();
				event.preventDefault();
				
			}
			
		} );
		
		
		document.addEventListener( "keyup", function( event ) {
		
			if ( event.keyCode == 37 ) { // left
				key_l = false;
				updateSpeed();
				
			} else if ( event.keyCode == 39 ) { // right
				key_r = false;
				updateSpeed();
				
			} else if ( key_updown &&  event.keyCode == 38 ) { // up
				key_u = false;
				updateSpeed();
				
			} else if ( key_updown && event.keyCode == 40 ) { // down
				key_d = false;
				updateSpeed();
				
			}
			
		} );
		
			
		var updateSpeed = function() {
			
			if ( key_l && ! key_r ) {
				earth.autoRotateSpeed = key_speed;
				
			} else if ( key_r && ! key_l ) {
				earth.autoRotateSpeed = - key_speed;
			
			} else {
				earth.autoRotateSpeed = 0;
			
			}
			
			if ( key_u && ! key_d ) {
				earth.autoRotateSpeedUp = key_speed;
				
			} else if ( key_d && ! key_u ) {
				earth.autoRotateSpeedUp = - key_speed;
			
			} else {
				earth.autoRotateSpeedUp = 0;
			
			}
				
		};

	};
	


} );