import {
  WebGLRenderer,
  Vector2,
  Vector3,
  Clock,
  Raycaster,
  Scene,
  PerspectiveCamera,
  PCFSoftShadowMap,
  Mesh,
  SphereBufferGeometry,
  MeshBasicMaterial,
  AmbientLight,
  HemisphereLight,
  DirectionalLight,
  Color,
  Math as THREEMath,
  CanvasTexture,
  RepeatWrapping,
  BackSide,
  MeshPhongMaterial,
  Spherical,
  Sprite,
  SpriteMaterial,
  CircleGeometry,
  CylinderBufferGeometry,
  Object3D,
  Quaternion,
  Matrix4,
  PlaneGeometry,
  DoubleSide,
  BufferAttribute,
  ShaderMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  Line,
  MOUSE,
  RawShaderMaterial,
  Material,
  Group,
  DefaultLoadingManager,
  LineDashedMaterial,
  LineBasicMaterial
} from 'three';

export function Earth( element, options ) {

	if ( typeof element == "string" ) {
		element = document.getElementById( element );
	}
	
	if ( ! element ) {
		return false;
	}
	
	
	// check webgl support
	
	if ( ! Earth.isSupported( options.legacySupportIE11 ) ) {		
		element.classList.add( "earth-show-fallback" );
		return false;
	}
	
	
	// remove fallback
	
	var fallback = element.querySelector( ".earth-fallback" );
	if ( fallback ) fallback.style.display = "none";
	
	
	// add required css styles
	
	if ( ! Earth.cssAdded && Earth.css ) {
		Earth.addCss();		
		Earth.cssAdded = true;
	}
	
	
	// add default meshes
	
	if ( ! Earth.meshesAdded && Earth.markerObj ) {
		Earth.addMesh( Earth.markerObj );
		Earth.meshesAdded = true;		
	}
	
	
	// add container css class if not present
	
	element.classList.add( "earth-container" );

	
	// reference to EarthInstance
	element.earth = this;
	
	// reference to dom element
	this.element = element;
	
	
	// default options
	
	var defaults = {
		
		isEarth : true,
		quality: this.getQuality(),

		location: { lat: 0, lng: 0 },
		
		mapLandColor : '#F4F4F4',
		mapSeaColor : '#0099FF',
		mapBorderColor : '',
		mapBorderWidth : 0.3,
		mapStyles : '',
		
		mapSvg : '',
		mapImage : '',
		
		draggable : true,
		grabCursor : true,
		dragMomentum : true,
		dragDamping : 0.7,
		dragPolarLimit : 0.3,
		
		polarLimit : 0.3,
		
		autoRotate : false,
		autoRotateSpeed : 1,
		autoRotateSpeedUp : 0,
		autoRotateDelay : 1000,
		autoRotateStart : 1000,
		autoRotateEasing : 'in-quad',
		
		zoom: 1,
		zoomable : false,
		zoomMin: 0.5,
		zoomMax: 1.25,
		zoomSpeed : 1,
		
		light: 'simple', // none, simple, sun
		lightAmbience: ( options.light == 'none' ) ? 1 : 0.5,
		lightIntensity: 0.5,
		lightColor: '#FFFFFF',
		lightGroundColor: '#999999',
		sunLocation : { lat: 0, lng: 0 },
		sunDirection : false,
		shadows: ( options.light == 'sun' ),
		
		shininess: 0.1,
		transparent : false,
		innerOpacity : 1,
		innerColor : '#FFFFFF',
		
		paused : false,
		showHotspots : false,
		mapHitTest : false,

	};
	
	this.options = Object.assign(defaults, options);
	
	this.animations = [];
	this.overlays = [];
	this.occludables = [];
	
	this.ready = false;
	this.deltaTime = 0;
	
	this.goAnimation = null;
	this.zoomAnimation = null;
	
	this.dragging = false;
	
	this.autoRotating = false;
	this.autoRotateTime = 0;

	this.mouseOver = false;
	this.mouseOverEarth = false;
	this.mouseOverObject = null;	

	this.docMousePosition = false;
	this.lastDocMousePosition = false;
	this.mousePosition = false;
	this.lastMousePosition = false;
	this.lastMouseTime = 0;
	this.mouseVelocity = new Vector2();
	
	this.momentum = new Vector2();
	
	this.elementSize = new Vector2();
	this.elementCenter = new Vector2();
	this.bounds = {
		left: 0,
		top: 0,
		bottom: 0,
		right: 0,
		width: 1,
		height: 1
	};
	this.radius = 0;

	this.init();
	
	return this;
	
}




Earth.ClassicEventDispatcher = function() {};

Object.assign( Earth.ClassicEventDispatcher.prototype, {

	addEventListener ( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

			listeners[ type ].push( listener );

		}

	},

	hasEventListener ( type, listener ) {

		if ( this._listeners === undefined ) return false;

		const listeners = this._listeners;

		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1;

	},

	removeEventListener ( type, listener ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	},

	dispatchEvent ( event ) {

		if ( this._listeners === undefined ) return;

		const listeners = this._listeners;
		const listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice( 0 );

			for ( let i = 0, l = array.length; i < l; i ++ ) {

				array[ i ].call( this, event );

			}

		}

	}

} );





Object.assign( Earth.prototype, Earth.ClassicEventDispatcher.prototype );


// private

Earth.prototype.init = function() {
	
	this.clock = new Clock();
	this.raycaster = new Raycaster();

	// scene
	this.scene = new Scene();
	
	// camera
	this.camera = new PerspectiveCamera( 50, 1, 1, 2000 );
	this.camera.position.z = Earth.camDistance;
	this.scene.add( this.camera );
	
	// renderer
	this.renderer = new WebGLRenderer( {
		alpha: true,
		antialias: true,
		preserveDrawingBuffer: !!( this.options.preserveDrawingBuffer ) 
	} );
	
	if ( this.options.shadows ) {
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFSoftShadowMap;
	}
	
	this.renderer.setPixelRatio( window.devicePixelRatio );
	
	this.canvas = this.renderer.domElement;
	this.element.appendChild( this.canvas );
	
	
	// check capabilities for first instance on page
	if ( ! Earth.capabilitiesChecked ) Earth.checkCapabilities( this.renderer );
	

	// earth
	
	this.sphere = new Mesh(
		new SphereBufferGeometry( Earth.earthRadius, this.options.quality*16, this.options.quality*12 ),
		new MeshBasicMaterial( { visible: false } )
	);
	
	this.sphere.renderOrder = -2;
	
	if ( this.options.shadows ) {
		this.sphere.receiveShadow = true;
		this.sphere.castShadow = true;
	}
	
	this.scene.add( this.sphere );
	
	
	// inner earth
	
	if ( this.options.transparent ) {
		this.innerSphere = new Mesh(
			new SphereBufferGeometry( Earth.earthRadius, this.options.quality*16, this.options.quality*12 ), // - 0.001
			new MeshBasicMaterial( { visible: false } )
		);

		this.innerSphere.renderOrder = -3;
		this.sphere.add( this.innerSphere );
	}
	
	
	this.loadTexture();
	
	
	// light
	
	this.ambientLight = new AmbientLight( 0xFFFFFF, this.options.lightAmbience );
	this.scene.add( this.ambientLight );
	
	if ( this.options.light == 'simple' ) {
		
		this.primaryLight = new HemisphereLight( new Color(this.options.lightColor), new Color(this.options.lightGroundColor), this.options.lightIntensity );
		this.scene.add( this.primaryLight );
		
	} else if ( this.options.light == 'sun' ) {
		
		this.primaryLight = new DirectionalLight( new Color(this.options.lightColor), this.options.lightIntensity );
		
		if ( this.options.shadows ) {
			this.primaryLight.castShadow = true;
			
			this.primaryLight.shadow.mapSize.width =
			this.primaryLight.shadow.mapSize.height = Earth.shadowSize[ this.options.quality ];
			
			var d = 25;
			this.primaryLight.shadow.camera.left = -d;
			this.primaryLight.shadow.camera.right = d;
			this.primaryLight.shadow.camera.top = d;
			this.primaryLight.shadow.camera.bottom = -d;
			this.primaryLight.shadow.camera.far = 3000;
			this.primaryLight.shadow.bias = 0.0001;
		}
		
		this.scene.add( this.primaryLight );
		
	}
	
	
	// events
	
	var dragStartMousePosition;
	var ignoreClicks = false;
	var lastTouchStart;
	
	var clickHandler = (function( event ){
		
		if ( this.paused ) return;
		
		if ( ignoreClicks && event.type == 'click' ) return;
		
		
		// touch to mousevents
		
		var touchEndClick = false;
		
		if ( event.type == 'touchstart' ||  event.type == 'touchend' ) {
		
			if ( event.touches.length > 1 ) return;

			var x = event.changedTouches[0].clientX; var y = event.changedTouches[0].clientY;
		
			if ( event.type == 'touchstart' ) {
				
				var type = 'mousedown';
				lastTouchStart = new Vector2( x, y );
				
			} else if ( event.type == 'touchend' ) {
				
				var type = 'mouseup';
				touchEndClick = ! ignoreClicks && lastTouchStart && lastTouchStart.distanceTo( new Vector2( x, y ) ) < Earth.maxClickDistance;
				
			}
			
		} else {
			
			var {type} = event;
			var x = event.clientX; var y = event.clientY;
			
		}
		

		var mouse = Earth.normalizeMouse( this, x, y );
		var intersects = this.raycast( mouse );
		var intersect_sphere = false;
		
		for ( var i = 0; i < intersects.length; i++ ) {
			
			if ( intersects[ i ].object == this.sphere ) {
				var {uv} = intersects[ i ];
				intersects[ i ].object.material.map.transformUv( uv );
				
				var mouseEvent = { type, x : mouse.x, y : mouse.y, location : Earth.uvToLatLng( uv ), originalEvent: event };
				
				if ( this.mapHitTest ) {
					mouseEvent.id = this.hitTestMap( uv );
				}
				
				this.dispatchEvent( mouseEvent );
				
				if ( touchEndClick ) {
					mouseEvent.type = 'click';
					this.dispatchEvent( mouseEvent );
				}
				
				intersect_sphere = true;

			} else if ( intersects[ i ].object.userData.marker && intersects[ i ].object.userData.marker.hotspot ) {
				
				if ( ! intersect_sphere || (intersects[ i ].object.userData.marker.isSprite && ! intersects[ i ].object.userData.marker.occluded) ) {

					if ( type == 'mousedown' && Earth.hasEvent( intersects[ i ].object.userData.marker, ['mousedown'] ) ) {
						intersects[ i ].object.userData.marker.dispatchEvent( { type: "mousedown", originalEvent: event } );
						event.stopImmediatePropagation();
						event.preventDefault();
						break;
						
					} else if ( type == 'mouseup' && Earth.hasEvent( intersects[ i ].object.userData.marker, ['mouseup'] ) ) {
						intersects[ i ].object.userData.marker.dispatchEvent( { type: "mouseup" } );
						if ( touchEndClick ) {
							intersects[ i ].object.userData.marker.dispatchEvent( { type: "click", originalEvent: event } );
						}
						event.stopImmediatePropagation();
						event.preventDefault();
						break;
						
					} else if ( ( type == 'click' || touchEndClick ) && Earth.hasEvent( intersects[ i ].object.userData.marker, ['click'] ) ) {
						intersects[ i ].object.userData.marker.dispatchEvent( { type: "click", originalEvent: event } );
						event.stopImmediatePropagation();
						event.preventDefault();
						break;
						
					}
				
				}

				
			}
			
		}

	}).bind( this );
	
	this.canvas.addEventListener( 'click', clickHandler );
	this.canvas.addEventListener( 'mousedown', clickHandler );
	this.canvas.addEventListener( 'mouseup', clickHandler );
	this.canvas.addEventListener( 'touchstart', clickHandler );
	this.canvas.addEventListener( 'touchend', clickHandler );
		
	this.canvas.addEventListener( 'mouseover', ((event)=> {
		
		if ( this.paused ) return;
		this.mouseOver = true;
		
	}) );
	
	this.canvas.addEventListener( 'mouseout', ((event)=> {
		
		if ( this.paused ) return;
		this.mouseOver = false;
		this.mouseOverEarth = false;
		
		if ( this.mouseOverObject ) {
			this.mouseOverObject.dispatchEvent( { type: "mouseout", originalEvent: event } );
			this.mouseOverObject = null;
		}
		
	}) );	
	
	this.canvas.addEventListener( 'mousemove', ((event) => {
		
		if ( this.paused ) return;
		this.mousePosition = Earth.normalizeMouse( this, event.clientX, event.clientY );
	
	}) );
	
	this.canvas.addEventListener( 'touchmove', ((event) => {
		
		if ( this.paused ) return;
		this.mousePosition = Earth.normalizeMouse( this, event.touches[0].clientX, event.touches[0].clientY );

	}) );
	
	
	
	document.addEventListener( 'mousemove', ((event) => {
		
		if ( this.paused ) return;
		this.docMousePosition = Earth.getEventPosition( event );
	
	}) );
	
	document.body.addEventListener( 'touchmove', ((event) => {
		
		if ( this.paused ) return;
		this.docMousePosition = Earth.getEventPosition( event );
	
	}) );
	
	
	
	// orbit
	
	this.orbit = new Earth.Orbit( this.camera, this );
	
	this.orbit.addEventListener( "start", (() => {
		
		this.dragging = true;
		if ( this.grabCursor ) document.documentElement.classList.add( 'earth-dragging' );
		
		if ( this.goAnimation ) {
			this.goAnimation.stop();
		}
		
		if ( this.ready ) this.dispatchEvent( { type: 'dragstart' } );
		
		// save mouse position
		dragStartMousePosition = this.docMousePosition;
		
	}) );
	
	this.orbit.addEventListener( "change", (( event ) => {
			
		if ( this.ready ) this.dispatchEvent( { type: 'change' } );
		
		this.radius = this.getRadius();
		
		// beginn to ignore clicks if dragged a little distance
		if ( this.dragging && ! ignoreClicks ) {
			ignoreClicks = dragStartMousePosition && dragStartMousePosition.distanceTo( this.docMousePosition ) > Earth.maxClickDistance;
		}

	}) );

	this.orbit.addEventListener( "end", (() => {
		
		this.momentum.copy( this.mouseVelocity );
		this.mouseVelocity.set(0, 0);
		this.lastDocMousePosition = false;
		
		document.documentElement.classList.remove( 'earth-dragging' );
		
		if ( this.dragging ) {
			this.dragging = false;
			if ( this.ready ) this.dispatchEvent( { type: 'dragend' } );
		}
		
		// enable clicks after dragend
		if ( ignoreClicks ) {
			setTimeout( ()=> { ignoreClicks = false; }, 1 );
		}
		
	}) );
	
	
	// set properties
	
	Object.assign( this, this.options );
	
	this.update();

	setTimeout( (() => {
		this.ready = true;
		this.element.classList.add( 'earth-ready' );
		this.dispatchEvent( { type: 'ready' } );
		this.dispatchEvent( { type: 'change' } );
	}), 1 );
	
};


// PUBLIC
// properties

Object.defineProperties( Earth.prototype, {

	location : {
		get() {
			
			return Earth.worldToLatLng( this.camera.position );			
			
		},
		set( v ) {
			var latlng = {  ...v };
			latlng = Earth.formatLatLng( latlng );
			
			// limit lat
			if ( ! this.goAnimation ) { // no limits during rotation animation
				latlng.lat = Math.min( this.maxLat(), Math.max( this.minLat(), latlng.lat ) );
			}
			
			this.orbit.setPosition( Earth.latLngToWorld( latlng, this.camera.position.length() ) );
			this.resetAutoRotate();
			
		}
	},
	
	paused : {
		get() {
			return this.options.paused;
		},
		set( v ) {
			if ( v ) {
				this.options.paused = true;
				
			} else if ( this.options.paused ) { // resume if paused
				this.options.paused = false;
				
				if ( this.ready ) { // if not ready, update will be called when ready
					this.update();
				}
				
			}
		}
	},
	
	mapLandColor : {
		get() {
			return this.options.mapLandColor;
		},
		set( v ) {
			this.options.mapLandColor = v;
		}
	},	
	mapSeaColor : {
		get() {
			return this.options.mapSeaColor;
		},
		set( v ) {
			this.options.mapSeaColor = v;
		}
	},
	mapBorderColor : {
		get() {
			return this.options.mapBorderColor;
		},
		set( v ) {
			this.options.mapBorderColor = v;
		}
	},
	mapBorderWidth : {
		get() {
			return this.options.mapBorderWidth;
		},
		set( v ) {
			this.options.mapBorderWidth = v;
		}
	},
	mapStyles : {
		get() {
			return this.options.mapStyles;
		},
		set( v ) {
			this.options.mapStyles = v;
		}
	},
	mapSvg : {
		get() {
			return this.options.mapSvg;
		},
		set( v ) {
			this.options.mapSvg = v;
			this.removeHitTester();
		}
	},
	mapImage : {
		get() {
			return this.options.mapImage;
		},
		set( v ) {
			this.options.mapImage = v;
		}
	},
	
	draggable : {
		get() {
			return this.orbit.enableRotate;
		},
		set( v ) {
			this.orbit.enableRotate = v;
			
			if ( ! v && this.dragging ) { // stop dragging
				this.orbit.cancel();
				// this.orbit.enabled = false;
			}
			
		}
	},

	dragPolarLimit : {
		get() {
			return this.options.dragPolarLimit;
		},
		set( v ) {
			this.options.dragPolarLimit = Math.max( 0, Math.min( 1, v ) );
			this.orbit.minPolarAngle = this.options.dragPolarLimit/2 * Math.PI; // radians
			this.orbit.maxPolarAngle = (1-this.options.dragPolarLimit/2) * Math.PI; // radians
		}
	},
	
	polarLimit : {
		get() {
			return this.options.polarLimit;
		},
		set( v ) {
			this.options.polarLimit = Math.max( 0, Math.min( 1, v ) );
		}
	},
	
	
	autoRotate : {
		get() {
			return this.options.autoRotate;
		},
		set( v ) {
			this.options.autoRotate = v;
			if ( ! v ) {
				this.resetAutoRotate();
			}
		}
	},


	zoom : {
		get() {
			return Earth.camDistance / this.camera.position.length();
		},
		set( v ) {
			this.orbit.setPosition( this.camera.position.normalize().multiplyScalar( Earth.camDistance / v ) );
		}
	},
	zoomable : {
		get() {
			return this.orbit.enableZoom;
		},
		set( v ) {
			this.orbit.enableZoom = v;
		}
	},
	zoomMin : {
		get() {
			return 1 / (this.orbit.maxDistance / Earth.camDistance);
		},
		set( v ) {
			this.orbit.maxDistance = Earth.camDistance * (1/v);
		}
	},
	zoomMax : {
		get() {
			return 1 / (this.orbit.minDistance / Earth.camDistance);
		},
		set( v ) {
			this.orbit.minDistance = Earth.camDistance * (1/v);
		}
	},
	zoomSpeed : {
		get() {
			return this.orbit.zoomSpeed;
		},
		set( v ) {
			this.orbit.zoomSpeed = v;
		}
	},
	
	
	lightAmbience : {
		get() {
			return this.ambientLight.intensity;
		},
		set( v ) {
			this.ambientLight.intensity = v;
		}
	},
	
	lightIntensity : {
		get() {
			if ( ! this.primaryLight ) return 1;
			return this.primaryLight.intensity;
		},
		set( v ) {
			if ( ! this.primaryLight ) return;
			this.primaryLight.intensity = v;
		}
	},	
	lightColor : {
		get() {
			if ( ! this.primaryLight ) return '#FFFFFF';
			return '#' + this.primaryLight.color.getHexString();
		},
		set( v ) {
			if ( ! this.primaryLight ) return;
			this.primaryLight.color = new Color(v);
		}
	},
	lightGroundColor : {
		get() {
			if ( ! this.primaryLight || ! this.primaryLight.isHemisphereLight ) return '#FFFFFF';
			return '#' + this.primaryLight.groundColor.getHexString();
		},
		set( v ) {
			if ( ! this.primaryLight || ! this.primaryLight.isHemisphereLight ) return;
			this.primaryLight.groundColor = new Color(v);
		}
	},
	
	sunLocation : {
		get() {
			if ( ! this.primaryLight || ! this.primaryLight.isDirectionalLight ) return { lat: 0, lng: 0 };
			return Earth.worldToLatLng( this.primaryLight.position );	
		},
		set( v ) {
			if ( ! this.primaryLight || ! this.primaryLight.isDirectionalLight ) return;
			this.primaryLight.position.copy( Earth.latLngToWorld( Earth.formatLatLng(v), Earth.camDistance ) );
		}
	},
	
	sunDirection : {
		get() {
			if ( ! this.primaryLight || ! this.primaryLight.isDirectionalLight ) return false;
			return this.options.sunDirection;	
		},
		set( v ) {
			if ( ! this.primaryLight || ! this.primaryLight.isDirectionalLight ) return;
			if ( ! v || typeof v.x == 'undefined' ) return;
			if ( this.primaryLight.parent !== this.camera ) {
				this.camera.add( this.primaryLight );
			}			
			this.primaryLight.position.set( v.x*50, v.y*50, 0);
		}
	},
	

} );


// private
// determine quality based on container size

Earth.prototype.getQuality = function() {
	
	return ( this.element.offsetWidth >= 720 ) ? 4 : 3;
	
};


// private
// get min and max latitude according to polarLimit

Earth.prototype.minLat = function() {
	return (1 - this.options.polarLimit) * -90;
};
Earth.prototype.maxLat = function() {
	return (1 - this.options.polarLimit) * 90;	
};



// private
// handle autoRotate

Earth.prototype.updateAutoRotate = function() {
	
	this.autoRotateTime += this.deltaTime;
	
	if ( this.autoRotateTime > this.autoRotateDelay ) {
		
		if ( ! this.autoRotate ) { // start autoRotate
			this.dispatchEvent( { type: 'autorotate' } );
			this.autoRotate = true;
		}
		
		var t = ( this.autoRotateTime - this.autoRotateDelay ) / this.autoRotateStart;
		
		if ( t > 1 ) {
			this.orbit.autoRotateSpeed = this.autoRotateSpeed;
			this.orbit.autoRotateSpeedUp = this.autoRotateSpeedUp;
		} else {
			this.orbit.autoRotateSpeed = THREEMath.lerp( 0, this.autoRotateSpeed, Earth.Animation.Easing[ this.autoRotateEasing ](t) );
			this.orbit.autoRotateSpeedUp = THREEMath.lerp( 0, this.autoRotateSpeedUp, Earth.Animation.Easing[ this.autoRotateEasing ](t) );
		}
	
	} else {

		this.orbit.autoRotateSpeed = 0;
		this.orbit.autoRotateSpeedUp = 0;
	
	}
	
};


// PUBLIC
// start autoRotate without delay

Earth.prototype.startAutoRotate = function( easeIn ) {
	this.autoRotateTime = this.autoRotateDelay + ( ( easeIn ) ? 0 : this.autoRotateStart );
	this.autoRotate = true;
	this.autoRotating = true;
};

// PUBLIC
// interrupt rotation

Earth.prototype.resetAutoRotate = function() {
	this.autoRotateTime = 0;
	this.autoRotating = false;
};


// private
// handle momentum

Earth.prototype.updateMomentum = function() {
	
	if ( this.dragging ) {
		
		this.resetAutoRotate();
		this.orbit.autoRotateSpeed = 0;
		this.orbit.autoRotateSpeedUp = 0;
		this.momentum.set( 0, 0 );
		
		return;
		
	}
	
	if ( this.momentum.equals( Earth.zeroMomentum ) ) {
		
		if ( this.autoRotate ) {
			
			this.updateAutoRotate();
			
		} else {
			
			this.orbit.autoRotateSpeed = 0;
			this.orbit.autoRotateSpeedUp = 0;
			
		}
		
		return;
		
	}
	
	this.resetAutoRotate();
	
	this.orbit.autoRotateSpeed = this.momentum.x * 10000;
	this.orbit.autoRotateSpeedUp = this.momentum.y * 10000;
	
	this.momentum.set(
		THREEMath.lerp( this.momentum.x, 0, this.deltaTime / (2000 - (this.dragDamping*1999)) ),
		THREEMath.lerp( this.momentum.y, 0, this.deltaTime / (2000 - (this.dragDamping*1999)) )
	);
	
	
	if ( Math.abs(this.momentum.x) < 0.00005 ) {
		this.momentum.x = 0;
	}
	if ( Math.abs(this.momentum.y) < 0.00005 ) {
		this.momentum.y = 0;
	}	
	
};


// private
// calculate velocity for momentum

Earth.prototype.updatePointerVelocity = function() {

	if ( this.dragging && this.dragMomentum && this.docMousePosition && this.lastDocMousePosition ) {
		
		var moveVelocity = this.docMousePosition.clone().sub(
			this.lastDocMousePosition
		).multiplyScalar( 0.00005 );
		
		var max_velocity_x = 0.002;
		var max_velocity_y = 0.0015;
		// limit velocity
		if ( moveVelocity.x < -max_velocity_x ) moveVelocity.x = -max_velocity_x;
		else if ( moveVelocity.x > max_velocity_x ) moveVelocity.x = max_velocity_x;
		if ( moveVelocity.y < -max_velocity_y ) moveVelocity.y = -max_velocity_y;
		else if ( moveVelocity.y > max_velocity_y ) moveVelocity.y = max_velocity_y;
		
		
		// this.mouseVelocity.lerp( moveVelocity, Math.min(1, this.deltaTime/50) );
		this.mouseVelocity.copy( moveVelocity );
		
	} else {
		
		this.mouseVelocity.set( 0, 0 );
		
	}
	
	this.lastDocMousePosition = ( this.docMousePosition ) ? this.docMousePosition.clone() : false;
	
};


// private
// handle mouse over/out events and cursors

Earth.prototype.updatePointer = function() {

	// mouse over / out
	
	var overObject = false;
	this.mouseOverEarth = false;
	
	
	if ( this.mouseOver && ! this.dragging ) {
	
		var intersects = this.raycast( this.mousePosition );
		var intersect_sphere = false;
		
		for ( var i = 0; i < intersects.length; i++ ) {
			
			var obj = intersects[ i ].object;
			
			if ( obj == this.sphere ) {
				this.mouseOverEarth = true;
				intersect_sphere = true;
			
			} else if ( ! overObject && obj.userData.marker && obj.userData.marker.hotspot && Earth.hasEvent( obj.userData.marker, ['click','mousedown','mouseup','mouseover','mouseout'] ) ) {
				
				if ( ! intersect_sphere || (intersects[ i ].object.userData.marker.isSprite && ! intersects[ i ].object.userData.marker.occluded) ) {
					overObject = intersects[ i ].object.userData.marker;
				}
				
			}
		}
		
	}
	
	
	if ( overObject ) {
		
		if ( this.mouseOverObject && this.mouseOverObject != overObject ) {
			this.mouseOverObject.dispatchEvent( { type: "mouseout" } );
		}
		
		this.mouseOverObject = overObject;
		this.mouseOverObject.dispatchEvent( { type: "mouseover" } ); 
		
	} else if ( this.mouseOverObject ) {
		
		this.mouseOverObject.dispatchEvent( { type: "mouseout" } );
		this.mouseOverObject = null;
		
	}
	
	
	if ( this.mouseOverObject && Earth.hasEvent( this.mouseOverObject, ['click'] ) ) {
		this.element.classList.add( 'earth-clickable' );
	} else {
		this.element.classList.remove( 'earth-clickable' );
	}
	
	
	if ( this.draggable && this.grabCursor && this.mouseOverEarth ) {
		this.element.classList.add( 'earth-draggable' );
	} else {
		this.element.classList.remove( 'earth-draggable' );
	}
	
};



// PUBLIC

Earth.prototype.hitTest = function( latlng ) {
	
	return this.hitTestMap( Earth.latLngToUv( latlng ) );
	
};

// private
// hit test a uv position and return path id

Earth.prototype.hitTestMap = function( uv ) {
	
	if ( ! this.mapSvg ) return '';
	
	if ( ! this.hitTester ) {
		this.hitTester = document.createElement( 'div' );
		document.body.appendChild( this.hitTester );
		this.hitTester.className = 'earth-hittest';
		this.hitTester.innerHTML = String( this.mapSvg ).replace(/\sid\s*=/gi, ' data-id=');  // escape IDs
	}
	
	var svgElement = this.hitTester.querySelector('svg');
	if ( ! svgElement ) return '';
	
	this.hitTester.style.display = 'block';
	
	var rect = svgElement.getBoundingClientRect();
	var elem = document.elementFromPoint( uv.x * rect.width, uv.y * rect.height );
	
	this.hitTester.style.display = 'none';

	if ( elem && elem.dataset && elem.dataset.id ) {
		return elem.dataset.id;
	} 
		return '';
	
	
};

// private
// removes hitTester if earth is destroyed or mapSvg is changed

Earth.prototype.removeHitTester = function() {
	if ( this.hitTester ) {
		this.hitTester.remove();
		this.hitTester = null;
	}
};


// private
// raycast of mouse position

Earth.prototype.raycast = function( mouse ) {
	
	this.raycaster.setFromCamera( Earth.normalizeRaycast(mouse), this.camera );
	return this.raycaster.intersectObjects( this.scene.children );
	
};


// PUBLIC
// call redrawMap if map properties have been changed

Earth.prototype.redrawMap = function() {
	
	this.loadTexture();
	
};


// PUBLIC
// updates the map texture after drawing to the mapCanvas

Earth.prototype.updateMap = function() {
	
	if ( this.mapTexture ) this.mapTexture.needsUpdate = true;
	
};


// private
// is svg?

Earth.prototype.mapImageIsSvg = function( url ) {
	
	return String(url).toLowerCase().indexOf('.svg') != -1;
	
};



// private
// load map texture

Earth.prototype.loadTexture = function( useMapSvg, isDefaultMap ) {
	
	if ( useMapSvg ) { // svg map
		
		var svg = this.mapSvg;
		
		if ( isDefaultMap ) {
			var style = '<style type="text/css">';
			style += '#SEA { fill:'+ this.options.mapSeaColor +'; }';
			style += 'path { fill:'+ this.options.mapLandColor +'; ';
			style += 'stroke:'+ ( this.options.mapBorderColor ? this.options.mapBorderColor : this.options.mapLandColor ) +'; ';
			style += 'stroke-width:'+ this.options.mapBorderWidth +'; stroke-miterlimit:1; }';
			style += this.options.mapStyles;
			style += '</style>';
			svg = svg.replace( /(<svg[^>]+>)/i, '$1 ' + style );
		}
		
		this.mapImageElem = document.createElement("img");
		this.mapImageElem.setAttribute( "src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg))) );
		this.mapImageElem.onload = this.drawTexture.bind( this );
		
		
	} else if ( this.options.legacySupportIE11 && Earth.isIE11() && this.options.fallbackMapUrlIE11 ) { // IE fallback map image
	
		this.mapImageElem = document.createElement("img");
		this.mapImageElem.setAttribute( "src", this.options.fallbackMapUrlIE11 );
		this.mapImageElem.onload = this.drawTexture.bind( this );
		
		
	} else if ( this.options.mapImage && ! this.mapImageIsSvg( this.options.mapImage ) ) { // pixel image
	
		this.mapImageElem = document.createElement("img");
		this.mapImageElem.setAttribute( "src", this.options.mapImage );
		this.mapImageElem.onload = this.drawTexture.bind( this );
		
		
	} else if ( this.options.mapImage ) { // custom svg
	
		var thisEarth = this;
		var ajax = new XMLHttpRequest();

		ajax.onreadystatechange = function() {
			if ( this.readyState == 4 ) {
				thisEarth.mapSvg = Earth.fixSvgNamespace( this.responseText );
				thisEarth.loadTexture( true, false );
			}
		};
		
		ajax.open("GET", this.options.mapImage, true);
		ajax.send();
	
	
	} else if ( Earth.mapSvg ) { // default svg
		
		this.mapSvg = Earth.fixSvgNamespace( Earth.mapSvg );
		this.loadTexture( true, true );
		
		
	} else {
		
		setTimeout( this.drawTexture.bind( this ), 1 );
		
		
	}
	
};


// private
// draw the map texture, called by loadTexture

Earth.prototype.drawTexture = function() {
	
	if ( ! this.mapCanvas ) {
		this.mapCanvas = document.createElement( "canvas" );
		this.mapCanvas.width = Earth.textureSize[ this.quality ];
		this.mapCanvas.height = Earth.textureSize[ this.quality ] / 2;
		this.mapContext = this.mapCanvas.getContext("2d");
		
	} else { // already exits
		this.mapContext.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
		
	}
	
	
	// draw map image
	
	if ( this.mapImageElem ) {
		this.mapContext.drawImage( this.mapImageElem, 0, 0, this.mapImageElem.width, this.mapImageElem.height, 0, 0, this.mapCanvas.width, this.mapCanvas.height );
	}
		
	this.dispatchEvent( { type: 'drawtexture', canvas: this.mapCanvas, context : this.mapContext } );
	
	
	if ( ! this.mapTexture ) {
		
		this.mapTexture = new CanvasTexture( this.mapCanvas );
		this.mapTexture.wrapS = RepeatWrapping; // this.mapTexture.wrapT = 
		this.mapTexture.anisotropy = Earth.anisotropy[ this.quality ];
		this.mapTexture.offset = new Vector2( -0.25, 0 );
	
		var earthMaterial = {
			map: this.mapTexture,
			shininess: this.shininess * 100,
			dithering : (this.light != 'none')
		};
		
		// inner earth
		if ( this.transparent ) {
			
			earthMaterial.transparent = true;
			earthMaterial.depthWrite = false;

			this.innerSphere.material = new MeshBasicMaterial( {
				dithering : (this.light != 'none'),
				transparent : true,
				color : this.innerColor,
				opacity : this.innerOpacity,
				side: BackSide,
				depthWrite : false,
				map: this.mapTexture
			} );

		}

		this.sphere.material = new MeshPhongMaterial( earthMaterial );
	
	
	} else { // already exists
	
		this.mapTexture.needsUpdate = true;
		
	}
	
};


// private
// watch for bounding rect changes

Earth.prototype.updateBounds = function() {
	
	this.bounds = this.element.getBoundingClientRect();
	
	this.outOfView = 	this.bounds.right < 0 || this.bounds.bottom < 0 ||
						this.bounds.left > window.innerWidth  || this.bounds.top > window.innerHeight;
						
	this.isVisible = this.bounds.width && this.bounds.height;
	
	
	if ( this.elementSize.x == this.bounds.width && this.elementSize.y == this.bounds.height ) return; // not resized
	
	this.elementSize.set( this.bounds.width, this.bounds.height );
	this.elementCenter.set( this.bounds.width / 2, this.bounds.height / 2 );
	this.containerScale = Math.min( this.elementSize.x, this.elementSize.y ) / 1000; // for overlay scaling
	
	this.camera.aspect = this.bounds.width / this.bounds.height;
	this.camera.updateProjectionMatrix();
	this.renderer.setSize( this.bounds.width, this.bounds.height );
	
	this.radius = this.getRadius();
	
};


// private
// main loop

Earth.prototype.update = function() {
	
	if ( this.paused ) return;
	
	requestAnimationFrame( this.update.bind(this) );
	
	if ( ! this.ready ) return;
	
	this.deltaTime = Math.min( 100, this.clock.getDelta() * 1000 );
	
	this.updateBounds();
	this.updatePointerVelocity();
	this.updatePointer();
	this.updateMomentum();
	this.orbit.update();

	/* >>> */
	this.updateAnimations();
	/* <<< */

	this.dispatchEvent( { type: "update" } );


	if ( ! this.outOfView && this.isVisible ) {		

		this.renderer.render( this.scene, this.camera );
		
		/* >>> */
		this.updateOccludables();
		/* <<< */
		
		this.updateOverlays();	
	
	}
	
};



// PUBLIC
// create and add objects

Earth.prototype.addMarker = function( options ) {
	return new Earth.Marker( options, this );
};

/* >>> */

Earth.prototype.addImage = function( options ) {
	return new Earth.Image( options, this );
};


Earth.prototype.addSprite = function( options ) {
	return new Earth.Sprite( options, this );
};


Earth.prototype.addPoints = function( options ) {
	return new Earth.Points( options, this );
};


Earth.prototype.addLine = function( options ) {
	return new Earth.Line( options, this );
};

/* <<< */

Earth.prototype.addOverlay = function( options ) {
	return new Earth.Overlay( options, this );
};


// private
// handle overlays

Earth.prototype.updateOverlays = function() {
	
	var updateOrder = false;
	var camDistance = this.camera.position.length();
	
	for (var i=0; i < this.overlays.length; i++) {
		
		var overlay = this.overlays[i];
		
		
		updateOrder = true;
	
		// position
		overlay.updatePositions();
		
		if ( overlay.elementPosition.y < overlay.earth.elementSize.y / 2 ) {
			overlay.element.classList.add('earth-overlay-top');
		} else {
			overlay.element.classList.remove('earth-overlay-top');
		}
		
		if ( overlay.elementPosition.x < overlay.earth.elementSize.x / 2 ) {
			overlay.element.classList.add('earth-overlay-left');
		} else {
			overlay.element.classList.remove('earth-overlay-left');
		}
		
		// occlusion
		overlay.updateOcclusion();
		
		if ( overlay.occluded ) {
			overlay.element.classList.add('earth-occluded');
		} else {
			overlay.element.classList.remove('earth-occluded');
		}
		
		
		if ( ! overlay.visible ) continue;
		
		
		// scaling
		var scale = 1;
		
		if ( overlay.depthScale ) {
			scale *= Math.max( 0, 1 - overlay.depthScale + (camDistance-overlay.distance) / Earth.earthRadius * overlay.depthScale );
		}		
		if ( overlay.zoomScale ) {
			scale *= THREEMath.lerp( 1, this.zoom, overlay.zoomScale );
		}
		if ( overlay.containerScale ) {
			scale *= THREEMath.lerp( 1, this.containerScale, overlay.containerScale );
		}
		
		scale = Math.max(0, scale);
		var scaleTransform = ( scale!=1 ) ? ' scale('+ scale +')' : '';
		
		
		// apply transform
		overlay.element.style.transform = 'translate('+ overlay.elementPosition.x +'px, '+ overlay.elementPosition.y +'px)' + scaleTransform;
		
		
		if ( ! overlay.ready ) {
			overlay.ready = true;
			overlay.visible = true;
		}
	
	}
	
	
	if ( updateOrder ) {
	
		// sort by cam distance for z-index
		
		this.overlays.sort( (a, b) => b.distance - a.distance );
	
		for (var i=0; i < this.overlays.length; i++) {
			this.overlays[i].element.style.zIndex = (( this.overlays[i].occluded && this.overlays[i].occlude ) ? 10 : 1010) + i;
		}
		
	}
	
};


// private
// handle occlusion

Earth.prototype.updateOccludables = function() {
	
	for ( var i=0; i < this.occludables.length; i++ ) {
		
		var occludable = this.occludables[i];
		
		occludable.updatePositions();
		occludable.updateOcclusion();

	}
	
};


// private
// handle all animations on this earth
/* >>> */

Earth.prototype.updateAnimations = function() {
	
	var complete_animations = [];
	
	for ( var i in this.animations ) {
		var ani = this.animations[i];
		
		if ( ani.paused ) continue;
		
		if ( ani.target.removed ) {
			complete_animations.push( ani );
			continue;
		}
		
		ani.time += this.deltaTime;
		var p = ani.time / ani.duration; // progress 0-1
		
		ani.step( Math.min( p, 1 ) );
		
		if ( p >= 1 ) { // end of animation
		
			if ( ani.loop ) {
				
				if ( ani.oscillate ) {
					ani.time = Math.max( 0, ani.duration - ani.time );
					var current = ani.to;
					ani.to = ani.from;
					ani.from = current;
				} else {
					ani.time = Math.max( 0, ani.duration - ani.time );
				}
				
				ani.dispatchEvents( true );
				
			} else {
				complete_animations.push( ani );
			}
			
		}
		
	}
	
	for ( var i in complete_animations ) {
		complete_animations[i].stop( true );
	}
	
};

/* <<< */



// PUBLIC
// animate earth location and zoom
// special options: zoom, approachAngle
// returns false or aniInstance

Earth.prototype.goTo = function( location, options ) {
	
	if ( ! options ) options = {};
	
	if ( options.approachAngle ) {
	
		var toPos = Earth.latLngToWorld( location, Earth.earthRadius );
		var camPos = this.camera.position.clone().normalize().multiplyScalar( Earth.earthRadius );
		
		if ( THREEMath.radToDeg( toPos.angleTo( camPos ) ) > options.approachAngle ) {
			
			for ( var i=1; i <= 32; i++ ) {
				
				var midPos = new Vector3().lerpVectors( camPos, toPos, i/32 ).normalize().multiplyScalar( Earth.earthRadius );
				
				if ( THREEMath.radToDeg( toPos.angleTo( midPos ) ) <= options.approachAngle ) {
					
					location = Earth.worldToLatLng( midPos );
					break;
					
				}
				
			}
			
		} else {
		
			return false;
			
		}
		
	}
	
	
	// cancel previous animation
	
	if ( this.goAnimation ) {
		this.goAnimation.stop();
	}
	
	
	var to = {  ...location };	
	
	// limit lat
	to.lat = Math.min( this.maxLat(), to.lat );
	to.lat = Math.max( this.minLat(), to.lat );
	

	var ani = {
		_end() {
			this.goAnimation = null;
			if ( this.zoomAnimation ) this.zoomAnimation.stop();
			this.zoomAnimation = null;
		},
		lerpLatLng : true
	};
	
	Object.assign( ani, options );
	
	this.goAnimation = this.animate( 'location', to, ani );
	
	
	if ( options.zoom ) {
		
		this.zoomAnimation = this.animate( 'zoom', options.zoom, {
			duration : this.goAnimation.duration
		} );
		
	}
	
	return this.goAnimation;
	
};



// PUBLIC
// get position in element container for a lat/lng location with optional earth offset

Earth.prototype.getPoint = function( location, offset ) {
	
	if ( ! offset ) offset = 0;
	
	var worldPos = Earth.latLngToWorld( location, Earth.earthRadius + offset );
	
	return Earth.worldToElement( worldPos, this.elementSize, this.camera );	
	
};



// PUBLIC
// get lat/lng location for a mouse/touch position

Earth.prototype.getLocation = function( point ) {
	
	var mouse = Earth.normalizeMouse( this, point.x, point.y );
	
	this.raycaster.setFromCamera( Earth.normalizeRaycast(mouse), this.camera );
	var intersects = this.raycaster.intersectObjects( [this.sphere] );
	
	for ( var i = 0; i < intersects.length; i++ ) {
		
		var {uv} = intersects[ i ];
		intersects[ i ].object.material.map.transformUv( uv );
		
		return Earth.uvToLatLng( uv );
		
	}
	
	return false;
	
};



// PUBLIC
// get approx. earth radius in pixels

Earth.prototype.getRadius = function() {
	
	return this.elementSize.y / 2 * 0.758 *
		Math.pow( this.zoom, 
			(this.zoom > 1) ? 1.158 : 
			THREEMath.lerp( 1.01, 1.11, this.zoom )
		);
	
};



// static const

Earth.earthRadius = 8;
Earth.camDistance = 24;
Earth.textureSize = [ 0, 512, 1024, 2048, 4096, 8192, 16384 ];
Earth.shadowSize  = [ 0, 512,  512, 1024, 2048, 4096,  8192 ];
Earth.anisotropy = [ 1, 1, 2, 4, 8, 8, 16 ];

Earth.defaultImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGZpbGw9IiNmZmYiIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIvPjwvc3ZnPg';
Earth.spriteHotspot = 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iNjRweCIgaGVpZ2h0PSI2NHB4IiB2aWV3Qm94PSIwIDAgNjQgNjQiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDY0IDY0OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PHBhdGggZmlsbD0iIzAwRkYwMCIgZD0iTTEsMXY2Mmg2MlYxSDF6IE02Miw2MkgyVjJoNjBWNjJ6Ii8+PC9zdmc+';

Earth.invisibleMaterial = new MeshBasicMaterial( {visible: false} );
Earth.hotspotMaterial = new MeshBasicMaterial( {color: 0x00ff00, wireframe: true} );


Earth.up = new Vector3( 0, 1, 0 );
Earth.left = new Vector3( 1, 0, 0 );
Earth.back = new Vector3( 0, 0, 1 );
Earth.zero = new Vector3( 0, 0, 0 );

Earth.zeroMomentum = new Vector2();

Earth.maxClickDistance = 10;


// static vars

Earth.capabilitiesChecked = false;
Earth.cssAdded = false;
Earth.meshesAdded = false;

Earth.meshes = {};
Earth.textures = {};


// static functions


// private
// fix the corrpuption of the svg namespace with some webservers

Earth.fixSvgNamespace = function( svg ) {
	return String(svg).replace('xmlns="https://www.w3.org/2000/svg"', 'xmlns="ht'+'tp://www.w3.org/2000/svg"');
};


// private
// lat/lng values to numbers

Earth.formatLatLng = function( latlng ) {
	if ( typeof latlng != "object" ) {
		return { lat: 0, lng: 0 };
	} 
		latlng.lat = Number(latlng.lat);
		latlng.lng = Number(latlng.lng);
		return latlng;
		
};


// private
// get a simple hash of a string

Earth.hash = function( str ){
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash<<5)-hash) + str.charCodeAt(i);
        hash &= hash;
    }
    return hash;
};


// private
// load a texture or get it from textures array if it exists

Earth.getTexture = function ( src, resolution, alphaOnly ) {
	
	// build a unique key of source and options
	var key = Earth.hash(src) + '#' + resolution + ((alphaOnly)?'#a':'');
	
	// return existing texture
	if ( Earth.textures[key] ) return Earth.textures[key];
	
	
	var canvas = document.createElement("canvas");
	canvas.width = resolution;
	canvas.height = resolution;

	Earth.textures[key] = new CanvasTexture( canvas );
	Earth.textures[key].needsUpdate = false;
	
	
	var img = new Image();

	img.onload = function () {

		// scale to contain

		var ratio = img.naturalHeight / img.naturalWidth;
		var x = 0; var y = 0; var w = canvas.width; var h = canvas.height;
		
		if ( ratio < 1 ) { // landscape
			h = Math.round( w * ratio );
			y = Math.round( canvas.height / 2 - h / 2 );
		} else { // portrait
			w = Math.round( h * (1/ratio) );
			x = Math.round( canvas.width / 2 - w / 2 );
		}
		

		var ctx = canvas.getContext("2d");

		// base color with 1% alpha
		ctx.globalAlpha = 1/256;
		ctx.fillStyle = "#999999";
		ctx.fillRect( 0, 0, canvas.width, canvas.height);
		ctx.globalAlpha = 1;

		// draw original image
		ctx.globalCompositeOperation = "source-over";
		ctx.drawImage( img, x, y, w, h );
		
		
		// only change colors, not alpha
		ctx.globalCompositeOperation = "source-atop";
		
		if ( alphaOnly ) { // tint white
		
			ctx.fillStyle = "white";
			ctx.fillRect( 0, 0, canvas.width, canvas.height );
		
		} else { // bleed colors
			
			var offset = [-1,-1, 0,-1, 1,-1, -1,0, 1,0, -1,1, 0,1, 1,1];
			var s = 2;  // thickness scale
			  
			// draw 8 images at offsets from the array scaled by s
			for (var i=0; i < offset.length; i += 2) ctx.drawImage(img, x + offset[i]*s, y + offset[i+1]*s, w, h);

			// image at original position
			ctx.drawImage( img, x, y, w, h );
			
		}		
		
		Earth.textures[key].needsUpdate = true;
	  
	};

  img.crossOrigin = 'Anonymous';
	img.src = src;
	
	
	return Earth.textures[key];

};


// private
// limit resolution/quality to system capabilities

Earth.checkCapabilities = function( renderer ) {
	
	var maxTex = renderer.capabilities.maxTextureSize;
	var maxAni = renderer.capabilities.getMaxAnisotropy();
	
	for ( var i=0; i < Earth.textureSize.length; i++ ) {
		if ( Earth.textureSize[i] > maxTex ) Earth.textureSize[i] = maxTex;
		if ( Earth.shadowSize[i] > maxTex ) Earth.shadowSize[i] = maxTex;
		
		if ( Earth.anisotropy[i] > maxAni ) Earth.anisotropy[i] = maxAni;
	}

	Earth.capabilitiesChecked = true;
	
};


// private
// register and dispatch custom load event when the script is loaded

Earth.dispatchLoadEvent = function() {
	
	if ( typeof window.CustomEvent === "function" ) {
		var loadedEvent = new CustomEvent( "earthjsload" );	
	} else {
		var loadedEvent = document.createEvent( "CustomEvent" );
		loadedEvent.initCustomEvent( "earthjsload", false, false, undefined );
	}
	
	window.dispatchEvent( loadedEvent );
	
};


// private
// add default css from string

Earth.addCss = function() {

	Earth.styleElement = document.createElement('style');

	if ( Earth.styleElement.styleSheet ) {
		Earth.styleElement.styleSheet.cssText = Earth.css;
	} else {
		Earth.styleElement.appendChild( document.createTextNode( Earth.css ) );
	}
	
	document.getElementsByTagName("head")[0].appendChild( Earth.styleElement );

};


// PUBLIC
// parse meshes from obj file string

Earth.addMesh = function( objString ) {
	 
	var lib = new Earth.ObjParser().parse( objString );
	
	lib.traverse( ( child ) => {
		
		if ( ! child.name ) return;
		
		Earth.meshes[ child.name.split('_')[0] ] = child;
		child.material = new MeshPhongMaterial( { color: 0xFF0000, shininess: 0.3, flatShading: false } );
		
	} );
	
};


// private
// dispose objects

Earth.dispose = function( obj ) {
	
	while (obj.children.length > 0) { 
		Earth.dispose(obj.children[0]);
		obj.remove(obj.children[0]);
	}
	
	if (obj.geometry) obj.geometry.dispose();
	if (obj.material) obj.material.dispose();
	
};


// PUBLIC
// destroy earth to free memory

Earth.prototype.destroy = function() {
	
	this.paused = true;
	
	Earth.dispose( this.scene );
	
	this.renderer.forceContextLoss();
	this.renderer.dispose();
	this.renderer.context = null;
	this.renderer.domElement.remove();
	this.renderer.domElement = null;
	
	this.orbit.dispose();
	
	this.removeHitTester();
	
	this.overlays = null;
	this.occludables = null;
	this.animations = null;
	this.element.earth = null;
	this.element = null;
	this.canvas = null;

};


// PUBLIC
// check for webgl support

Earth.isSupported = function( supportIE11 ) {
	
	try {
		
		if ( ! supportIE11 && Earth.isIE11() ) return false;
		
		var canvas = document.createElement( 'canvas' );
		return window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );

	} catch ( e ) {
		
		return false;

	}
	
};


// private
// check for IE11

Earth.isIE11 = function( ) {
	return !! window.MSInputMethodContext && !! document.documentMode;	
};


// private
// get points of a 3d line

Earth.getPathPoints = function( fromPos, toPos, subdevisions, offset, offsetFlow, offsetEasing ) {
	
	offset += Earth.earthRadius;	
	
	var points = [ fromPos, toPos ];
	
	for (var i=0; i < subdevisions; i++) {
		points = Earth.subdividePath( points, offset );
	}
	
	
	if ( offsetFlow ) {
		for (var i=0; i < points.length; i++) {
			points[i].multiplyScalar( 1 + Earth.Animation.Easing[ offsetEasing ]( i / (points.length-1) ) * offsetFlow/10 );
		}
	}
	
	return points;
	
};


// private
// subdivide a 3d line to smooth it

Earth.subdividePath = function( points, offset ) {

	if ( points.length < 2 ) return [];

	var new_points = [];
	
	new_points.push( points[0] );
	
	// from point
	var fromPoint = points[0];
	
	for (var i=1; i < points.length; i++) {
		
		// to point
		const toPoint = points[i];
		
		// mid point
		new_points.push(
			new Vector3().lerpVectors( fromPoint, toPoint, 0.5 ).normalize().multiplyScalar( offset )
		);
		
		new_points.push( toPoint );
		
		fromPoint = toPoint;
		
	}
	
	return new_points;
	
};


// private
// normalized mouse position relative to element center

Earth.mouseCenterOffset = function( mouse, earth, radius ) {
	var relMouse = new Vector2( mouse.x - earth.bounds.left - earth.bounds.width/2 , mouse.y - earth.bounds.top - earth.bounds.height/2 );
	return Math.min( 1, relMouse.length() / radius );
};


// private
// raycasting helpers

Earth.normalizeMouse = function( earth, x, y ) {
	return  new Vector2( ( x - earth.bounds.left ) / earth.bounds.width, ( y - earth.bounds.top ) / earth.bounds.height );
};
Earth.normalizeElement = function( v2, element ) {
	return new Vector2( v2.x / element.x, v2.y / element.y );
};
Earth.normalizeRaycast = function( v2 ) {
	return new Vector2( ( v2.x * 2 ) - 1, - ( v2.y * 2 ) + 1 );
};


// private
// position conversion

Earth.latLngToWorld = function( location, radius ){
	
	var phi   = THREEMath.degToRad( -location.lat + 90 );
	var theta = THREEMath.degToRad( location.lng + 180 );
   
   return new Vector3().setFromSphericalCoords( radius, phi, theta );
   
};
Earth.worldToLatLng = function( pos ) {
	
	var s = new Spherical().setFromVector3 ( pos );
	   
	var loc = {
		lat: THREEMath.radToDeg( -s.phi ) + 90,
		lng: THREEMath.radToDeg( s.theta ) + 180
	};
	
	Earth.wrapLatLng( loc );
   
	return loc;
   
};


// private
// UV <-> LatLng

Earth.uvToLatLng = function( uv ) {
	
	return {
		lat: (0.5 - uv.y) * 180,
		lng: (uv.x - 0.5) * 360
	};
	
};
Earth.latLngToUv = function( latlng ) {
	
	latlng = Earth.wrapLatLng(  Earth.formatLatLng( latlng ) );
	
	return new Vector2(
		1 - (latlng.lng / -360 + 0.5),
		0.5 + latlng.lat / -180
	);
	
};


// private
// position helpers

Earth.wrapLatLng = function( latlng ) {

	latlng.lat = Earth.wrap( latlng.lat, -90, 90 );
	latlng.lng = Earth.wrap( latlng.lng, -180, 180 );
	
	return latlng;
	
};
Earth.wrapLngForLerp = function( fromLng, toLng ) {
	
	if ( Math.abs( toLng - fromLng ) > 180 ) {
		toLng = ( toLng < 0 ) ? toLng + 360 : toLng - 360;
	}
	
	return toLng;
	
};
Earth.worldToElement = function( position, element, camera ) {
	
	var w = element.x / 2;
	var h = element.y / 2;

	var pos = position.clone().project( camera );
	
	return new Vector2(
		( pos.x * w ) + w,
		- ( pos.y * h ) + h
	);
	
};


// private
// distance in world units for dashed lines

Earth.getLineDistance = function( points ) {
	
	var distance = 0;
	var from = points[0];
	
	for ( var i = 1; i < points.length; i++ ) {
		var to = points[i];
		distance += from.distanceTo( to );
		from = to;
	} 
	
	return distance;
	
};


// private
// lerp angle for animation

Earth.lerpAngle = function( fromA, toA, t ) {
    var fullA = Math.PI * 2;
    var a = (toA - fromA) % fullA;
    return fromA + ( 2 * a % fullA - a ) * t;
};


// private
// wrap number

Earth.wrap = function( val, min, max ) {
	var range = max - min;
	return min + ( ( ( (val - min) % range ) + range ) % range );
};


// PUBLIC
// get distance in km

Earth.getDistance = function( from, to ) {
	
	from =  Earth.formatLatLng( from );
	to =  Earth.formatLatLng( to );
	
	var degLat = THREEMath.degToRad( to.lat - from.lat );
	var degLng = THREEMath.degToRad( to.lng - from.lng );
	
	var a = Math.sin(degLat / 2) * Math.sin(degLat / 2) +
	Math.cos( THREEMath.degToRad( from.lat ) ) * Math.cos( THREEMath.degToRad( to.lat ) ) *
	Math.sin( degLng / 2 ) * Math.sin( degLng / 2 );
	
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	
	return  6378.137 * c; // mean radius in km
	
};


// PUBLIC
// get angle between two latlng positions

Earth.getAngle = function( from, to ) {
	
	from =  Earth.formatLatLng( from );
	to =  Earth.formatLatLng( to );
	
	var fromPos = Earth.latLngToWorld( from, Earth.earthRadius );
	var toPos = Earth.latLngToWorld( to, Earth.earthRadius );
	
	return THREEMath.radToDeg( fromPos.angleTo( toPos ) );
	
};


// PUBLIC		lerp latlng location
// from			latlng
// to			latlng
// t			time 0-1
// lerpLatLng	lerp latlng values or 3d position

Earth.lerp = function( from, to, t, lerpLatLng ) {
	
	from =  Earth.formatLatLng( from );
	to =  Earth.formatLatLng( to );

	if ( lerpLatLng ) {
		
		return Earth.wrapLatLng( {
			lat: THREEMath.lerp( from.lat, to.lat, t ),
			lng: THREEMath.lerp( from.lng, Earth.wrapLngForLerp( from.lng, to.lng ), t )
		} );
		
	} 

		return Earth.worldToLatLng(
			Earth.latLngToWorld( from, Earth.earthRadius ).lerp( Earth.latLngToWorld( to, Earth.earthRadius ), t )
		);
	
	
	
};


// private
// any event in types array registered?

Earth.hasEvent = function( obj, types ) {
	
	if ( ! obj._listeners ) return false;
	
	for ( var i=0; i < types.length; i++ ) {
		if ( obj._listeners[ types[i] ] && obj._listeners[ types[i] ].length ) return true;
	}
	
	return false;
	
};


// private
// get mouse or touch client position

Earth.getEventPosition = function( event ) {
	
	if ( event.type == 'touchstart' || event.type == 'touchmove' ) {
		return new Vector2( event.touches[0].clientX, event.touches[0].clientY );
	
	} if ( event.type == 'touchend' ) {
		return new Vector2( event.changedTouches[0].clientX, event.changedTouches[0].clientY );
		
	} 
		return new Vector2(  event.clientX, event.clientY );
		
	
	
};



/* MARKER */

Earth.Marker = function( initOptions, thisEarth ) {

	this.init( initOptions, thisEarth );

};


// private

Earth.Marker.prototype.init = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isMarker : true,
		earth : thisEarth,
		
		location : { lat : 0, lng : 0 },

		offset: 0,
		
		mesh: ["Pin", "Needle"],
		color: '#FF0000',
		color2: '#AAAAAA',
		color3: '#AAAAAA',
		color4: '#AAAAAA',
		color5: '#AAAAAA',
		color6: '#AAAAAA',
		color7: '#AAAAAA',
		color8: '#AAAAAA',
		
		scale : 1,
		scaleX : 1,
		scaleY : 1,
		scaleZ : 1,
		visible : true,
		
		hotspot : false,
		hotspotRadius : 0.5,
		hotspotHeight : 1.5,

		align : true,
		rotationX : 0,
		rotationY : 0,
		rotationZ : 0,		
		lookAt : false,
		lookAngle: 0, // private
		
		shininess: 0.3,
		flatShading: false,
		castShadow: thisEarth.shadows,
		receiveShadow : false,
		transparent : ( typeof initOptions.opacity != 'undefined' ),
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	
	
	this.createObject();
	
	this.addMeshes();
	
	
	// set props
	Object.assign( this, this.options );

	this.ready = true;
	this.update();
	this.updateScale();

	thisEarth.occludables.push( this );
	
	if ( this.options.transparent ) {
		this.addEventListener( 'occlusion', function() {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].renderOrder = ( this.occluded ) ? -4 : 0;
			}
		} );	
	}
	
	return this;
	
};


// private
// add container object and hotspot

Earth.Marker.prototype.createObject = function() {
	
	if ( this.options.hotspot ) {
	
		if ( this.options.hotspotGeometry == 'sprite' ) { // sprite
			this.object3d = new Sprite( new SpriteMaterial( {
				map : (this.options.earth.showHotspots) ? Earth.getTexture( Earth.spriteHotspot, 64, false ) : null,
				opacity : (this.options.earth.showHotspots) ? 1 : 0,
			} ) );			

		} else if ( this.options.hotspotGeometry == 'circle' ) { // circle
			var geometry = new CircleGeometry( this.options.hotspotRadius * 1.2, 8 );
			geometry.rotateX( THREEMath.degToRad(-90) );
			geometry.translate( 0, 0.01, 0 );

			this.object3d = new Mesh( geometry, (this.options.earth.showHotspots) ? Earth.hotspotMaterial : Earth.invisibleMaterial );

		} else { // cylinder
			var geometry = new CylinderBufferGeometry( this.options.hotspotRadius, this.options.hotspotRadius*0.75, this.options.hotspotHeight, 5 );
			geometry.translate( 0, this.options.hotspotHeight/2, 0 );
			
			this.object3d = new Mesh( geometry, (this.options.earth.showHotspots) ? Earth.hotspotMaterial : Earth.invisibleMaterial );
			
		}
		
	
	} else {

		this.object3d = new Object3D();
		
	}
	
	this.object3d.userData.marker = this;	
	this.options.earth.scene.add( this.object3d );
	
};


// private
// add geometry

Earth.Marker.prototype.addMeshes = function() {
	
	if ( typeof this.options.mesh == "string" ) {
		var meshes = ( this.options.mesh ) ? [ this.options.mesh ] : [];
	} else {
		var meshes = this.options.mesh;
	}
	
	for ( var i = 0; i < meshes.length; i++ ) {
		
		var meshClone = Earth.meshes[ meshes[i] ].clone();
		meshClone.material = meshClone.material.clone();
		this.object3d.add( meshClone );
		
	}
	
};


Object.assign( Earth.Marker.prototype, Earth.ClassicEventDispatcher.prototype );


// PUBLIC
// properties

Earth.sharedObjectProperties = {
	
	color: {
		get() {
			if ( ! this.object3d.children[0] ) return '#FFFFFF';
			return '#' + this.object3d.children[0].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[0] ) return;
			this.object3d.children[0].material.color.set( v );
		}
	},
	
	opacity : {
		get() {
			if ( ! this.object3d.children[0] ) return 1;
			return this.object3d.children[0].material.opacity;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].material.opacity = v;
			}
		}
	},

	visible : {
		get() {
			return this.object3d.visible;
		},
		set( v ) {
			this.object3d.visible = v;
		}
	},

	scale : {
		get() {
			return this.options.scale;
		},
		set( v ) {
			this.options.scale = v;
			if ( this.ready ) this.updateScale();
		}
	},
	scaleX : {
		get() {
			return this.options.scaleX;
		},
		set( v ) {
			this.options.scaleX = v;
			if ( this.ready ) this.updateScale();
		}
	},
	scaleY : {
		get() {
			return this.options.scaleY;
		},
		set( v ) {
			this.options.scaleY = v;
			if ( this.ready ) this.updateScale();
		}
	},
	scaleZ : {
		get() {
			return this.options.scaleZ;
		},
		set( v ) {
			this.options.scaleZ = v;
			if ( this.ready ) this.updateScale();
		}
	},
	
	align : {
		get() {
			return this.options.align;
		},
		set( v ) {
			this.options.align = v;
			if ( this.ready ) this.update();
		}
	},	
	rotationX : {
		get() {
			return this.options.rotationX;
		},
		set( v ) {
			this.options.rotationX = v;
			if ( this.ready ) this.update();
		}
	},
	rotationY : {
		get() {
			return this.options.rotationY;
		},
		set( v ) {
			this.options.rotationY = v;
			if ( this.ready ) this.update();
		}
	},
	rotationZ : {
		get() {
			return this.options.rotationZ;
		},
		set( v ) {
			this.options.rotationZ = v;
			if ( this.ready ) this.update();
		}
	},
	lookAt : {
		get() {
			return this.options.lookAt;
		},
		set( v ) {
			this.options.lookAt = (! v) ? false : Earth.formatLatLng(v);
			if ( this.ready ) this.update();
		}
	},
	lookAngle : {
		get() {
			return this.options.lookAngle;
		},
		set( v ) {
			this.options.lookAngle = v;
			if ( this.ready ) this.update( true );
		}
	},
	
	offset : {
		get() {
			return this.options.offset;
		},
		set( v ) {
			this.options.offset = v;
			if ( this.ready ) this.update();
		}
	},
	
	location : {
		get() {
			return this.options.location;
		},
		set( v ) {
			this.options.location = Earth.formatLatLng(v);
			if ( this.ready ) this.update();
		}
	}
	
};

Object.defineProperties( Earth.Marker.prototype, Earth.sharedObjectProperties );

Object.defineProperties( Earth.Marker.prototype, {
	
	color2: {
		get() {
			if ( ! this.object3d.children[1] ) return '#FFFFFF';
			return '#' + this.object3d.children[1].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[1] ) return;
			this.object3d.children[1].material.color.set( v );
		}
	},
	color3: {
		get() {
			if ( ! this.object3d.children[2] ) return '#FFFFFF';
			return '#' + this.object3d.children[2].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[2] ) return;
			this.object3d.children[2].material.color.set( v );
		}
	},
	color4: {
		get() {
			if ( ! this.object3d.children[3] ) return '#FFFFFF';
			return '#' + this.object3d.children[3].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[3] ) return;
			this.object3d.children[3].material.color.set( v );
		}
	},
	color5: {
		get() {
			if ( ! this.object3d.children[4] ) return '#FFFFFF';
			return '#' + this.object3d.children[4].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[4] ) return;
			this.object3d.children[4].material.color.set( v );
		}
	},
	color6: {
		get() {
			if ( ! this.object3d.children[5] ) return '#FFFFFF';
			return '#' + this.object3d.children[5].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[5] ) return;
			this.object3d.children[5].material.color.set( v );
		}
	},
	color7: {
		get() {
			if ( ! this.object3d.children[6] ) return '#FFFFFF';
			return '#' + this.object3d.children[6].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[6] ) return;
			this.object3d.children[6].material.color.set( v );
		}
	},
	color8: {
		get() {
			if ( ! this.object3d.children[7] ) return '#FFFFFF';
			return '#' + this.object3d.children[7].material.color.getHexString();
		},
		set( v ) {
			if ( ! this.object3d.children[7] ) return;
			this.object3d.children[7].material.color.set( v );
		}
	},
	
	shininess: {
		get() {
			if ( ! this.object3d.children[0] ) return 0.3;
			return this.object3d.children[0].material.shininess / 100;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].material.shininess = v * 100;
			}
		}
	},	
	flatShading: {
		get() {
			if ( ! this.object3d.children[0] ) return 0.3;
			return this.object3d.children[0].material.flatShading;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].material.flatShading = v;
			}
		}
	},
	castShadow : {
		get() {
			if ( ! this.object3d.children[0] ) return false;
			return this.object3d.children[0].castShadow;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].castShadow = v;
			}
		}
	},
	receiveShadow: {
		get() {
			if ( ! this.object3d.children[0] ) return false;
			return this.object3d.children[0].receiveShadow;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].receiveShadow = v;
			}
		}
	},
	
	transparent : {
		get() {
			if ( ! this.object3d.children[0] ) return false;
			return this.object3d.children[0].material.transparent;
		},
		set( v ) {
			for ( var i=0; i < this.object3d.children.length; i++ ) {
				this.object3d.children[i].material.transparent = v;
			}
		}
	},

	
});


// PUBLIC
// remove object

Earth.Marker.prototype.remove = function() {

	this.stopAllAnimations();
	
	if ( this == this.earth.mouseOverObject ) {
		this.earth.mouseOverObject.dispatchEvent( { type: "mouseout" } );
		this.earth.mouseOverObject = null;
	}
	
	Earth.dispose( this.object3d );	
	this.earth.scene.remove( this.object3d );


	this.removed = true;
	
	var objIndex = this.earth.occludables.indexOf( this );
	if ( objIndex == -1 ) return; // already removed
	
	this.earth.occludables.splice( objIndex , 1 );
		
};


// private
// apply scaling

Earth.Marker.prototype.updateScale = function() {
	
	if ( this.isSprite ) {
		
		this.object3d.scale.set(
			this.options.scaleX * this.options.scale * (this.options.hotspotRadius*2),
			this.options.scaleY * this.options.scale * (this.options.hotspotRadius*2),
			1
		);
		
		var reverse_scale = 1 / (this.options.hotspotRadius*2);
		
		this.object3d.children[0].scale.set(
			reverse_scale,
			reverse_scale,
			1
		);
		
		
	} else {
	
		this.object3d.scale.set(
			this.options.scaleX * this.options.scale,
			this.options.scaleY * this.options.scale,
			this.options.scaleZ * this.options.scale
		);
		
	}
	
};


// private
// get object quaternion

Earth.Marker.prototype.getQuaternion = function() {
	
	if ( this.align ) { // rotate to world center

		var qt = new Quaternion().setFromRotationMatrix(
			new Matrix4().lookAt( this.object3d.position, Earth.zero, Earth.up )
		);
		qt.multiply(  new Quaternion().setFromAxisAngle( Earth.left, 1.5707963267948966 ) );  // 90deg
		
	} else {
		
		var qt = new Quaternion();
		
	}
	
	return qt;
	
};


// private
// update object position and rotation

Earth.Marker.prototype.update = function( fixLookAngle) {
	
	var p = Earth.latLngToWorld( this.location, Earth.earthRadius + this.offset );
	
	if ( this.isSprite ) {
		this.object3d.center = new Vector2( this.anchorX, this.anchorY );
		this.object3d.children[0].center = new Vector2( this.anchorX, this.anchorY );
	}
	
	
	this.object3d.position.copy( p );
	
	
	var qt = this.getQuaternion();
	
	if ( this.lookAt ) {
		if ( ! fixLookAngle ) {
			// update angle if lookAt is not same as location
			if ( Math.abs(this.location.lat-this.lookAt.lat) > 0.000001 || Math.abs(this.location.lng-this.lookAt.lng) > 0.000001 ) {
				this.options.lookAngle = this.getLocalAngle( p, qt, Earth.latLngToWorld( this.lookAt, Earth.earthRadius ) );
			}
		}
		qt.multiply(  new Quaternion().setFromAxisAngle( Earth.up, this.options.lookAngle ) );
	}
	
	if ( this.rotationX ) {
		qt.multiply(  new Quaternion().setFromAxisAngle( Earth.left, THREEMath.degToRad(this.rotationX) ) );
	}
	if ( this.rotationY ) {
		qt.multiply(  new Quaternion().setFromAxisAngle( Earth.up, THREEMath.degToRad(this.rotationY) ) );
	}
	if ( this.rotationZ ) {
		qt.multiply(  new Quaternion().setFromAxisAngle( Earth.back, THREEMath.degToRad(this.rotationZ) ) );
	}
	
	this.object3d.setRotationFromQuaternion( qt );
	
};


// private
// get lookAt rotation

Earth.Marker.prototype.getLocalAngle = function( p, qt, lookP ) {

	var startAngle = 0;
	var angle = Math.PI / 2;
	var tests = 9;
	var testPoint = new Vector3( 0.01, 0, 0 );
	var distP; var distM; var prevDist;
	
	for ( var i = 0; i < tests; i++ ) {
		
		var rotP = p.clone().add( testPoint.clone().applyQuaternion(
			qt.clone().multiply(  new Quaternion().setFromAxisAngle( Earth.up, startAngle + angle ) )
		) );
		distP = lookP.distanceToSquared( rotP );
		
		var rotM = p.clone().add( testPoint.clone().applyQuaternion(
			qt.clone().multiply(  new Quaternion().setFromAxisAngle( Earth.up, startAngle - angle ) )
		) );
		distM = lookP.distanceToSquared( rotM );
		
		
		if ( ! prevDist || distP < prevDist || distM < prevDist ) {  // one tested point is closer
		
			if ( distP < distM ) {
				startAngle += angle;
				prevDist = distP;
			} else {
				startAngle -= angle;
				prevDist = distM;				
			}
			
		}
	
		angle /= 2;
	
	}
	
	return startAngle;

};



/* IMAGE */
/* >>> */

Earth.Image = function( initOptions, thisEarth ) {
	
	this.init( initOptions, thisEarth );
	
};
	
Object.assign( Earth.Image.prototype, Earth.Marker.prototype );
Object.defineProperties( Earth.Image.prototype, Earth.sharedObjectProperties );

Earth.Image.prototype.init = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isImage : true,
		earth : thisEarth,
		
		location : { lat : 0, lng : 0 },
		offset: 0,
		
		image: Earth.defaultImage,
		imageResolution: 128,
		imageAlphaOnly: false,
		color: '#FFFFFF',
		
		scale : 1,
		scaleX : 1,
		scaleY : 1, // private
		scaleZ : 1,
		visible : true,
		
		hotspot : false,
		hotspotRadius : 0.5,
		hotspotGeometry : 'circle', // private

		align : true,
		rotationX : 0,
		rotationY : 0,
		rotationZ : 0,		
		lookAt : false,
		lookAngle: 0, // private
		
		shininess: 0.3,
		flatShading: false,
		castShadow: false,
		receiveShadow : false,
		transparent : true,
		
		opacity: 1
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	
	
	this.createObject();
	this.createImage();
	
	
	// set props
	Object.assign( this, this.options );

	this.ready = true;
	this.update();
	this.updateScale();

	thisEarth.occludables.push( this );
	
	if ( this.options.transparent ) {
		this.addEventListener( 'occlusion', function() {
			this.object3d.children[0].renderOrder = ( this.occluded ) ? -4 : 0;
		} );	
	}
	
	return this;
	
};


// private
// add image plane

Earth.Image.prototype.createImage = function() {
	
	var geometry = new PlaneGeometry();
	geometry.rotateX( THREEMath.degToRad(-90) );
	geometry.translate( 0, 0.01, 0 );

	
	var material =  new MeshBasicMaterial( {
		alphaTest: 2/256,
		color: this.options.color,
		opacity : this.options.opacity,
		transparent: true,
		map : ( this.options.image ) ? Earth.getTexture( this.options.image, this.options.imageResolution, this.options.imageAlphaOnly ) : null,
		side: DoubleSide
	} );
	
	material.map.anisotropy = Earth.anisotropy[ this.options.earth.quality ];
	
	var sprite = new Mesh( geometry, material );

	this.object3d.add( sprite );
	
};


/* <<< */



/* SPRITE */
/* >>> */

Earth.Sprite = function( initOptions, thisEarth ) {
	
	this.init( initOptions, thisEarth );
	
};
	
Object.assign( Earth.Sprite.prototype, Earth.Marker.prototype );
Object.defineProperties( Earth.Sprite.prototype, Earth.sharedObjectProperties );


Earth.Sprite.prototype.init = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isSprite : true,
		earth : thisEarth,
		
		location : { lat : 0, lng : 0 },
		
		image : Earth.defaultImage,
		imageResolution: 128,
		imageAlphaOnly: false,
		
		offset: 0,
		anchorX : 0.5,
		anchorY : 0.5,
		
		color: '#FFFFFF',
		
		scale : 1,
		scaleX : 1,
		scaleY : 1,
		scaleZ : 1, // private
		visible : true,
		
		hotspot : false,
		hotspotRadius : 0.5,
		hotspotGeometry : 'sprite', // private

		rotation : 0,
		rotationX : 0, // private
		rotationY : 0, // private
		rotationZ : 0, // private
		
		opacity: 1,
		occlude : true
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	
	
	this.createObject();
	this.createSprite();
	
	
	// set props
	Object.assign( this, this.options );

	this.ready = true;
	this.update();
	this.updateScale();
	
	thisEarth.occludables.push( this );
	
	this.addEventListener( 'occlusion', function() {
		var back = this.occlude && this.occluded;
		
		// hotspot
		if ( this.object3d.material ) {
			this.object3d.material.depthTest = back;
			this.object3d.material.depthWrite = ! back;
			this.object3d.renderOrder = ( back ) ? -5 : 5;
		}
		// image
		this.object3d.children[0].material.depthTest = back;
		this.object3d.children[0].material.depthWrite = ! back;
		this.object3d.children[0].renderOrder = ( back ) ? -5 : 5;
	} );	
	
	return this;
	
};


// private
// add sprite

Earth.Sprite.prototype.createSprite = function() {
	
	var material =  new SpriteMaterial( {
		alphaTest: 2/256,
		color: this.options.color,
		opacity : this.options.opacity,
		map : ( this.options.image ) ? Earth.getTexture( this.options.image, this.options.imageResolution, this.options.imageAlphaOnly ) : null
	} );
	
	var sprite = new Sprite( material );

	this.object3d.add( sprite );
	
};


// PUBLIC
// properties

Object.defineProperties( Earth.Sprite.prototype, {
	
	rotation: {
		get() {
			return THREEMath.radToDeg( this.object3d.material.rotation );
		},
		set( v ) {
			if ( this.object3d.material ) this.object3d.material.rotation = THREEMath.degToRad( v );
			this.object3d.children[0].material.rotation = THREEMath.degToRad( v );
		}
	}

} );


/* <<< */






/* POINTS */
/* >>> */

Earth.Points = function( initOptions, thisEarth ) {
	
	this.init( initOptions, thisEarth );
	
};
	
Object.assign( Earth.Points.prototype, Earth.Marker.prototype );


Earth.Points.prototype.init = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isPoints : true,
		earth : thisEarth,
		
		points : [],
		
		image : Earth.defaultImage,
		imageResolution: 128,
		imageAlphaOnly: false,
		
		color: '#FFFFFF',
		scale : 1,
		opacity : 1,
		clip: 1,		
		visible : true,
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	
	
	this.createObject();
	
	
	// set props
	Object.assign( this, this.options );
	
	
	this.createPoints();
	
	
	var thisPoints = this;
	
	this.sortOnce = function() {
		thisPoints.sort();
		thisEarth.removeEventListener( 'update', this.sortOnce );
	};

	this.sort = function() {

		var vector = new Vector3();

		// model view projection matrix

		var matrix = new Matrix4();
		matrix.multiplyMatrices( thisEarth.camera.projectionMatrix, thisEarth.camera.matrixWorldInverse );
		matrix.multiply( thisPoints.object3d.matrixWorld );

		var {geometry} = thisPoints.object3d.children[0];

		var index = geometry.getIndex();
		var positions = geometry.getAttribute( 'position' ).array;
		var length = positions.length / 3;

		if ( index === null ) {

			var array = new Uint16Array( length );

			for ( var i = 0; i < length; i ++ ) {
				array[ i ] = i;
			}

			index = new BufferAttribute( array, 1 );
			geometry.setIndex( index );

		}

		var sortArray = [];

		for ( var i = 0; i < length; i ++ ) {
			vector.fromArray( positions, i * 3 );
			vector.applyMatrix4( matrix );

			sortArray.push( [ vector.z, i ] );
		}

		function numericalSort( a, b ) {
			return b[ 0 ] - a[ 0 ];
		}

		sortArray.sort( numericalSort );

		var indices = index.array;

		for ( var i = 0; i < length; i ++ ) {
			indices[ i ] = sortArray[ i ][ 1 ];
		}

		geometry.index.needsUpdate = true;

	};
	
	this.removeEvents = function() {
		thisEarth.removeEventListener( 'update', this.sortOnce );
		thisEarth.removeEventListener( 'change', this.sort );
	};
	
	
	thisEarth.addEventListener( 'update', this.sortOnce );
	thisEarth.addEventListener( 'change', this.sort );
	
	
	this.ready = true;
	
	return this;
	
};



// private
// custom points shader

Earth.Points.prototype.createPointsMaterial = function() {
	
	var vertexShaderSource = [
		'attribute float size;',
		'attribute vec3 customColor;',
		'attribute float opacity;',
		'varying float vAlpha;',
		'varying vec3 vColor;',
		'uniform float usize;',
		'void main() {',
		'	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
		'	vColor = customColor;',
		// '	vAlpha = opacity * ( 5.0 / ( mvPosition.z * -1.0 - 15.0 ) );',
		'	vAlpha = opacity;',
		'	gl_PointSize = usize * size * ( 200.0 / -mvPosition.z );',
		'	gl_Position = projectionMatrix * mvPosition;',
		'}'
	];
	
	var fragmentShaderSource = [
		'uniform vec3 ucolor;',
		'uniform float ualpha;',
		'uniform sampler2D pointTexture;',
		'varying float vAlpha;',
		'varying vec3 vColor;',
		'void main() {',
		'	gl_FragColor = vec4( ucolor * vColor, ualpha * vAlpha ) * texture2D( pointTexture, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y) );',
		'}'
	];
	
	return new ShaderMaterial({
		uniforms: {
			ucolor: {value: new Color( this.options.color )},
			ualpha: {value: this.options.opacity },
			usize: {value: this.options.scale },
			pointTexture: {value: ( this.options.image ) ? Earth.getTexture( this.options.image, this.options.imageResolution, this.options.imageAlphaOnly ) : null }
		},
		vertexShader: vertexShaderSource.join( '\r\n' ),
		fragmentShader: fragmentShaderSource.join( '\r\n' ),
		transparent: true,
		depthWrite : false
	});
	
};


// private
// add points

Earth.Points.prototype.createPoints = function() {
	
	var geometry = new BufferGeometry();
	
	var data_pos = [];
	var data_scale = [];
	var data_color = [];
	var data_opacity = [];

	for ( var i = 0; i < this.points.length; i++ ) {
		
		if ( ! this.points[i].location || typeof this.points[i].location.lat == 'undefined' ) this.points[i].location = { lat: 0, lng: 0 };
		
		var p = Earth.latLngToWorld( this.points[i].location, Earth.earthRadius + ((typeof this.points[i].offset != 'undefined') ? this.points[i].offset : 0.1) );
		data_pos.push( p.x, p.y, p.z );
		
		data_scale.push( (typeof this.points[i].scale != 'undefined') ? this.points[i].scale : 1 );
		
		var c =  new Color( this.points[i].color || 0xFFFFFF );
		data_color.push( c.r, c.g, c.b );
		
		data_opacity.push( (typeof this.points[i].opacity != 'undefined') ? this.points[i].opacity : 1 );

	}

	geometry.setAttribute( "position", new Float32BufferAttribute( data_pos, 3 ) );
	geometry.setAttribute( "customColor", new Float32BufferAttribute( data_color, 3 ) );
	geometry.setAttribute( "size", new Float32BufferAttribute( data_scale, 1 ) );
	geometry.setAttribute( "opacity", new Float32BufferAttribute( data_opacity, 1 ) );

	var material = this.createPointsMaterial();

	this.object3d.add( new Points( geometry, material ) );
	
};


// PUBLIC
// properties

Object.defineProperties( Earth.Points.prototype, {
	
	visible : {
		get() {
			return this.object3d.visible;
		},
		set( v ) {
			this.object3d.visible = v;
		}
	},
	
	scale : {
		get() {
			return this.options.scale;
		},
		set( v ) {
			this.options.scale = v;
			if ( this.ready ) this.object3d.children[0].material.uniforms.usize.value = v;
		}
	},
	
	opacity : {
		get() {
			return this.options.opacity;
		},
		set( v ) {
			this.options.opacity = v;
			if ( this.ready ) this.object3d.children[0].material.uniforms.ualpha.value = v;
		}
	},
	
	color : {
		get() {
			return this.options.color;
		},
		set( v ) {
			this.options.color = v;
			if ( this.ready ) this.object3d.children[0].material.uniforms.ucolor.value = new Color( v );
		}
	}

} );


// PUBLIC
// remove points

Earth.Points.prototype.remove = function() {
	
	this.stopAllAnimations();

	this.removeEvents();
	
	Earth.dispose( this.object3d );
	this.earth.scene.remove( this.object3d );
	this.removed = true;
	
};


/* <<< */






/* LINE */
/* >>> */

Earth.Line = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isLine : true,
		earth : thisEarth,
		
		locations : [],
		
		offset : 0.01,
		offsetFlow : 0,
		offsetEasing : 'arc',

		hairline: false,
		width: 1,
		endWidth : -1,
		clip: 1,
		
		dashed : false,
		dashSize : 0.5,
		dashRatio : 0.5,
		dashOffset: 0,
		
		color: '#FF0000',
		opacity: 1,
		visible : true,
		alwaysBehind : false,
		alwaysOnTop : false,
		transparent: ( ( ! initOptions.hairline && initOptions.dashed ) || typeof initOptions.opacity != 'undefined' ) ,
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	this.lineLength = 0;
	
	// create object

	if ( this.options.hairline ) { // native gl line	
	
		this.object3d = new Line();
		this.object3d.material  = ( this.options.dashed ) ? new LineDashedMaterial() : new LineBasicMaterial();
	
	} else {
		
		this.object3d = new Mesh();
		this.meshLine = new Earth.MeshLine();
		this.object3d.geometry = this.meshLine.geometry;
		this.lineGeometry = new BufferGeometry();
		this.object3d.material = new Earth.MeshLineMat();
	
	}
	

	thisEarth.scene.add( this.object3d );
	
	
	// set props
	
	Object.assign( this, this.options );
	
	
	this.ready = true;
	this.updatePoints();

	return this;
	
};


// PUBLIC
// properties

Object.defineProperties( Earth.Line.prototype, {
	
	width : {
		get() {
			return this.options.width;
		},
		set( v ) {
			this.options.width = v;
			if ( ! this.options.hairline ) {
				this.object3d.material.uniforms.lineWidth.value = v / 10;
				if ( this.ready ) this.updateGeometry();
			}
		}
	},
	endWidth : {
		get() {
			return ( this.options.endWidth == -1 ) ? this.options.width : this.options.endWidth;
		},
		set( v ) {
			this.options.endWidth = v;
			if ( ! this.options.hairline ) {
				if ( this.ready ) this.updateGeometry();
			}
		}
	},
	

	dashSize : {
		get() {
			return this.options.dashSize;
		},
		set( v ) {
			this.options.dashSize = v;
			if ( this.options.hairline ) {
				this.object3d.material.dashSize = v;
			} else if ( this.ready ) this.updateDash();
		}
	},
	dashRatio : {
		get() {
			return this.options.dashRatio;
		},
		set( v ) {
			this.options.dashRatio = Math.min(1, Math.max(0, v));
			if ( this.options.hairline ) {
				this.object3d.material.gapSize = this.options.dashSize * v * 2;
			} else {
				this.object3d.material.uniforms.dashRatio.value = v;
			}
		}
	},	
	dashOffset : {
		get() {
			return this.options.dashOffset;
		},
		set( v ) {
			this.options.dashOffset = v;
			if ( ! this.options.hairline ) {
				this.object3d.material.uniforms.dashOffset.value = v;
			}
		}
	},
	
	color : {
		get() {
			return this.options.color;
		},
		set( v ) {
			this.options.color = v;
			if ( this.options.hairline ) {
				this.object3d.material.color = new Color( v );
			} else {
				this.object3d.material.uniforms.color.value = new Color( v );
			}
		}
	},	
	opacity : {
		get() {
			return this.options.opacity;
		},
		set( v ) {
			this.options.opacity = v;
			if ( this.options.hairline ) {
				this.object3d.material.opacity = v;
			} else {
				this.object3d.material.uniforms.opacity.value = v;
			}
		}
	},
	visible : {
		get() {
			return this.object3d.visible;
		},
		set( v ) {
			this.object3d.visible = v;
		}
	},

	alwaysBehind: {
		get() {
			return ! this.object3d.material.depthWrite;
		},
		set( v ) {
			this.object3d.material.depthWrite = ! v;
			this.object3d.renderOrder = ( v ) ? -1 : 0;
		}
	},
	
	transparent : {
		get() {
			return this.object3d.material.transparent;
		},
		set( v ) {
			this.object3d.material.transparent = v;
		}
	},
	
	clip : {
		get() {
			return this.options.clip;
		},
		set( v ) {
			this.options.clip = Math.min(1, Math.max(0, v));
			if ( this.ready ) this.updateClip();
		}
	},
	
	offset : {
		get() {
			return this.options.offset;
		},
		set( v ) {
			this.options.offset = v;
			if ( this.ready ) this.updatePoints();
		}
	},
	offsetFlow : {
		get() {
			return this.options.offsetFlow;
		},
		set( v ) {
			this.options.offsetFlow = v;
			if ( this.ready ) this.updatePoints();
		}
	},
	
	locations : {
		get() {
			return this.options.locations;
		},
		set( v ) {
			for ( var i=0; i < v.length; i++ ) {
				v[i] = Earth.formatLatLng( v[i] );
			}
			this.options.locations = v;
			if ( this.ready ) this.updatePoints();
		}
	},
	
});


// private
// update line segment positions

Earth.Line.prototype.updatePoints = function() {
	
	this.points = [];
	
	if (  this.locations.length ) {
		var fromPos = Earth.latLngToWorld( this.locations[0], Earth.earthRadius + this.offset );
		
		for ( var i = 1; i < this.locations.length; i++ ) {
		
			var toPos = Earth.latLngToWorld( this.locations[i], Earth.earthRadius + this.offset );

			var subdevisions = Math.ceil( Math.sqrt( ( 1 + fromPos.distanceTo(toPos) ) * this.earth.quality ) );

			this.points.pop();
			this.points = this.points.concat( Earth.getPathPoints( fromPos, toPos, subdevisions, this.offset, this.offsetFlow, this.offsetEasing ) );
			
			fromPos = toPos;
			
		}
	}
	
	this.updateGeometry();
	
};


// private
// update line geometry

Earth.Line.prototype.updateGeometry = function() {
	
	if ( this.hairline ) {
		
		this.object3d.geometry.setFromPoints( this.points );
	
	} else {
		
		this.lineGeometry.vertices = this.points;
		
		var thisLine = this;
		this.meshLine.setGeometry( this.lineGeometry, ( p ) => {
			if ( thisLine.endWidth == -1 ) return 1;
			p *= thisLine.clip; // to complete path
			return THREEMath.lerp( thisLine.width, thisLine.endWidth, p ) / thisLine.width;
		} );
		
		if ( this.dashed ) this.lineLength = Earth.getLineDistance( this.points );
		
	}
	
	this.updateClip();
	
	this.updateDash();

};


// private
// handle clip property

Earth.Line.prototype.updateClip = function() {
	
	if ( this.clip < 1 ) {
		this.object3d.geometry.setDrawRange( 0, Math.round( this.points.length * this.clip ) * ( this.hairline ? 1 : 6 ) );
	} else {
		this.object3d.geometry.setDrawRange( 0, Infinity );
	}
	
};


// private
// handle dashed property

Earth.Line.prototype.updateDash = function( options ) {
	
	if ( ! this.dashed ) return;
	
	if ( this.hairline ) {
		this.object3d.computeLineDistances();
	} else {
		this.object3d.material.uniforms.useDash.value = 1;
		this.object3d.material.uniforms.dashArray.value = 1 / this.lineLength * this.dashSize * 3;
	}
	
};


// private
// remove line

Earth.Line.prototype.remove = function() {
	
	this.stopAllAnimations();
	
	Earth.dispose( this.object3d );
	this.earth.scene.remove( this.object3d );
	this.removed = true;
	
};

/* <<< */



/* OVERLAY */

Earth.Overlay = function( initOptions, thisEarth ) {
	
	// default options
	
	var defaults = {
		
		isOverlay: true,
		earth: thisEarth,
		
		location : { lat : 0, lng : 0 },
		offset : 0,
		
		content : '',
		className : '',
		
		visible : true,
		occlude : true,
		
		containerScale : 0,
		zoomScale : 1,
		depthScale : 0
		
	};
	
	this.options = Object.assign(defaults, initOptions);
	
	this.ready = false;
	
	
	// create overlay
	
	var div = document.createElement( 'div' );	
	thisEarth.element.appendChild( div );
	div.overlay = this;
	this.element = div;
	this.element.className = 'earth-overlay';
	
	// inner wrap
	this.element.appendChild( document.createElement( 'div' ) );
	
	
	thisEarth.overlays.push( this );
	
	
	// set props
	Object.assign(this, this.options);

	return this;
	
};

Object.assign( Earth.Overlay.prototype, Earth.ClassicEventDispatcher.prototype );


// PUBLIC
// properties

Object.defineProperties( Earth.Overlay.prototype, {
	
	location : {
		get() {
			return this.options.location;
		},
		set( v ) {
			this.options.location = Earth.formatLatLng(v);
		}
	},
	
	content : {
		get() {
			return this.element.firstChild.innerHTML;
		},
		set( v ) {
			this.element.firstChild.innerHTML = v;
		}
	},
	
	className : {
		get() {
			return this.element.firstChild.className;
		},
		set( v ) {
			this.element.firstChild.className = v;
		}
	},
	
	visible : {
		get() {
			return this.options.visible;
		},
		set( v ) {
			this.options.visible = v;
			this.element.style.display = ( v && this.ready ) ? 'block' : 'none';
		}
	},
	
	occlude : {
		get() {
			return this.options.occlude;
		},
		set( v ) {
			this.options.occlude = v;
		}
	}
	
});


// PUBLIC
// remove overlay

Earth.Overlay.prototype.remove = function() {
	
	this.stopAllAnimations();
	
	this.earth.element.removeChild( this.element );
	this.removed = true;

	var objIndex = this.earth.overlays.indexOf( this );
	if ( objIndex == -1 ) return; // already removed
	this.earth.overlays.splice( objIndex , 1 );
	
};



/* OCCLUDABLE */
// private

Earth.Occludable = function() {};

Earth.Occludable.prototype.updatePositions = function() {
	if ( this.isOverlay ) {
		var world_pos = Earth.latLngToWorld( this.location, Earth.earthRadius + this.offset );
	} else {
		var world_pos = this.object3d.position;
	}
	this.elementPosition = Earth.worldToElement( world_pos, this.earth.elementSize, this.earth.camera );
	this.distance = this.earth.camera.position.distanceTo( world_pos );			
	
};

Earth.Occludable.prototype.updateOcclusion = function() {
	
	if ( this.distance < this.earth.camera.position.length() ) { // between earth and camera	
		var occluded = false;
		
	} else {
		var occluded = this.earth.elementCenter.distanceTo( this.elementPosition ) < this.earth.radius;
		
	}
	
	// check for change and dispatch event
	if ( typeof this.occluded == 'undefined' || this.occluded != occluded ) {
		this.occluded = occluded;
		this.dispatchEvent( { type: 'occlusion' } );
	}
	
};

Object.assign( Earth.Marker.prototype, Earth.Occludable.prototype );
Object.assign( Earth.Image.prototype, Earth.Occludable.prototype );
Object.assign( Earth.Sprite.prototype, Earth.Occludable.prototype );
Object.assign( Earth.Overlay.prototype, Earth.Occludable.prototype );



/* ANIMATION */

Earth.Animation = function( options ) {
	
	Object.assign(this, options);	
	this.earth.animations.push( this );
	return this;

};

/* >>> */


// PUBLIC
// remove animation

Earth.Animation.prototype.stop = function( dispatchComplete, jumpToEnd ) {
	
	if ( jumpToEnd ) {
		this.time = this.duration;
		this.step( 1 );
	}
	
	this.dispatchEvents( dispatchComplete );
	
	var aniIndex = this.earth.animations.indexOf( this );
	if ( aniIndex == -1 ) return; // not found
	
	this.earth.animations.splice( aniIndex , 1 );
	
};


// private
// call end / complete handlers

Earth.Animation.prototype.dispatchEvents = function( dispatchComplete ) {
	
	if ( this._end ) { // internal use
		this._end.bind( this.target )( this );
	}
	
	if ( typeof this.end == 'function' ) {
		this.end.bind( this.target )( this );
	}
	
	if ( typeof this.complete == 'function' && dispatchComplete && ! this.target.removed ) {
		this.complete.bind( this.target )( this );
	}
	
};

/* <<< */

Earth.Animation.Easing = {
	
	'linear' : 		function (t) { return t },
	
	'in-quad' : 	function (t) { return t*t },
	'out-quad' : 	function (t) { return t*(2-t); },
	'in-out-quad' : function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
	
	'in-cubic' : 	function (t) { return t*t*t },
	'out-cubic' : 	function (t) { return (--t)*t*t+1 },
	'in-out-cubic' :function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
	
	'in-quart' :	function (t) { return t*t*t*t },
	'out-quart' :	function (t) { return 1-(--t)*t*t*t },
	'in-out-quart': function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
	
	'in-back' :		function (t) { return t*t*(2.70158*t - 1.70158); },
	'out-back' :	function (t) { return (t-=1)*t*(2.70158*t + 1.70158) + 1; },
	'in-out-back' :	function (t) {
		var s = 1.70158;
		if ((t/=0.5) < 1) return 0.5*(t*t*(((s*=(1.525))+1)*t - s));
		return 0.5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
	},
	
	'elastic' : function (t) {
		var p=.3;
		if (t==0) return 0; if (t==1) return 1;
		var s = p/(2*Math.PI) * Math.asin (1);
		return Math.pow(2,-10*t) * Math.sin( (t-s)*(2*Math.PI)/p ) + 1;
	},
	
	'bounce' : function (t) {
		if (t < (1/2.75)) {
			return (7.5625*t*t);
		} if (t < (2/2.75)) {
			return (7.5625*(t-=(1.5/2.75))*t + .75);
		} if (t < (2.5/2.75)) {
			return (7.5625*(t-=(2.25/2.75))*t + .9375);
		} 
			return (7.5625*(t-=(2.625/2.75))*t + .984375);
		
	},
	
	'arc' : function(t) {
		return t<.5 ? this['out-quad'](t*2) : this['out-quad'](2 - t*2);
	}
	
};



/* ANIMATABLE */

/* >>> */

Earth.Animatable = function() {};

Earth.Animatable.colorProp  = [ 'color', 'color2', 'color3', 'color4', 'color5', 'color6', 'color7', 'color8', 'lightColor', 'lightGroundColor' ];
Earth.Animatable.latlngProp = [ 'location', 'sunLocation' ];
Earth.Animatable.angleProp  = [ 'lookAt' ];


// PUBLIC
// start object animation

Earth.Animatable.prototype.animate = function( prop, val, options ) {
	
	var ani = {
		target: this,
		earth: (this.isEarth) ? this : this.earth,
		prop,
		val,
		time : 0,
		duration : 400,
		relativeDuration : 0,
		easing : 'in-out-quad',
		lerpLatLng : false,
		loop : false,
		oscillate : false,
		paused : false
	};
	
	Object.assign( ani , options );
	
	
	// value type for lerp
	
	if ( Earth.Animatable.colorProp.indexOf( ani.prop ) != -1  ) {
		ani.type = 'color';
		ani.from = new Color( this[ ani.prop ] );
		ani.to = new Color( ani.val );
		
	} else if ( Earth.Animatable.latlngProp.indexOf( ani.prop ) != -1 ) {
		ani.type = 'latlng';
		ani.from = Earth.formatLatLng( {  ...this[ ani.prop ] } );
		ani.to =  Earth.formatLatLng( {  ...ani.val } );		
		
	} else if ( Earth.Animatable.angleProp.indexOf( ani.prop ) != -1 ) {
		this.options.lookAt = Earth.formatLatLng( {  ...ani.val } );
		ani.type = 'angle';
		ani.from = this.lookAngle;
		ani.to = this.getLocalAngle( this.object3d.position, this.getQuaternion(), Earth.latLngToWorld( this.options.lookAt, Earth.earthRadius ) );
		ani.prop = 'lookAngle';

	} else {
		ani.type = 'number';
		ani.from = this[ ani.prop ];
		ani.to = ani.val;
		
	}
	
	
	// ani duration
	
	if ( ani.relativeDuration ) {
		
		if ( ani.type == 'number' ) {
			ani.duration += Math.abs( ani.from - ani.to ) * ani.relativeDuration;
			
		} else if ( ani.type == 'color' ) {
			ani.duration += ( Math.abs( ani.from.r - ani.to.r ) + Math.abs( ani.from.g - ani.to.g ) + Math.abs( ani.from.b - ani.to.b ) ) / 3 * ani.relativeDuration;
			
		} else if ( ani.type == 'latlng' ) {
			ani.duration += Earth.getDistance( ani.from, ani.to ) / 1000 * ani.relativeDuration;
			
		} else if ( ani.type == 'angle' ) {
			ani.duration += Math.abs( Earth.wrap( ani.from, 0, 2 * Math.PI ) - Earth.wrap( ani.to, 0, 2 * Math.PI ) ) * ani.relativeDuration;
			
		}
		
	}
	

	ani.step = function( t ) {
			
		t = Earth.Animation.Easing[ this.easing ]( t );
		
		if ( this.type == 'number' ) {
			ani.target[ this.prop ] = THREEMath.lerp( this.from, this.to, t );
			
		} else if ( this.type == 'color' ) {
			ani.target[ this.prop ] = this.from.clone().lerp( this.to, t );	
			
		} else if ( this.type == 'latlng' ) {
			ani.target[ this.prop ] = Earth.lerp( this.from, this.to, t, ani.lerpLatLng );
			
		} else if ( this.type == 'angle' ) {
			ani.target[ this.prop ] = Earth.lerpAngle( this.from, this.to, t );
		}
		
	};
	
	
	return new Earth.Animation( ani );

};


// PUBLIC
// stop all animations

Earth.Animatable.prototype.stopAllAnimations = function( dispatchComplete, jumpToEnd ) {

	var stop_animations = [];
	
	for ( var i=0; i < this.earth.animations.length; i++ ) {
		if ( this.earth.animations[i].target == this ) stop_animations.push( this.earth.animations[i] );
	}
	
	for ( var i in stop_animations ) {
		stop_animations[i].stop( dispatchComplete, jumpToEnd );
	}
	
};

Object.assign( Earth.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Marker.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Image.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Sprite.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Points.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Line.prototype, Earth.Animatable.prototype );
Object.assign( Earth.Overlay.prototype, Earth.Animatable.prototype );

/* <<< */


/* ORBIT */
// private
// based on OrbitControls

Earth.Orbit = function ( camera, earth ) {

	this.camera = camera;
	this.earth = earth;

	this.enableRotate = true;
	this.enableZoom = true;
	this.zoomSpeed = 1.0;


	// How far you can dolly in and out ( PerspectiveCamera only )
	this.minDistance = 0;
	this.maxDistance = Infinity;

	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 0; // radians
	this.maxPolarAngle = Math.PI; // radians

	// automatically rotate
	this.autoRotateSpeed = 0; 
	this.autoRotateSpeedUp = 0;


	// public methods

	this.setPosition = function ( pos ) {
		
		scope.camera.position.copy( pos );

		scope.camera.updateProjectionMatrix();
		scope.update();
		
		state = STATE.NONE;
		
		scope.dispatchEvent( changeEvent );

	};
	
	
	this.cancel = function () {
		onMouseUp();		
	};
	
	
	this.update = function ( ) {

		var offset = new Vector3();

		// so camera.up is the orbit axis
		var quat = new Quaternion().setFromUnitVectors( camera.up, new Vector3( 0, 1, 0 ) );
		var quatInverse = quat.clone().invert();

		var lastPosition = new Vector3();
		var lastQuaternion = new Quaternion();
		

		return function update( ) {

			var {position} = scope.camera;

			offset.copy( position );
			// rotate offset to "y-axis-is-up" space
			offset.applyQuaternion( quat );

			// angle from z-axis around y-axis
			spherical.setFromVector3( offset );
			

			if ( state == STATE.NONE && scope.autoRotateSpeed != 0 ) {
				rotateLeft( getAutoRotationAngle() * earth.deltaTime / 30 );
			}
			
			if ( state == STATE.NONE && scope.autoRotateSpeedUp != 0 ) {
				rotateUp( getAutoRotationAngleY() * earth.deltaTime / 30 );
			}
			

			spherical.theta += sphericalDelta.theta;
			spherical.phi += sphericalDelta.phi;
			
	
			// restrict phi to be between desired limits
			spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

			spherical.makeSafe();
			

			spherical.radius *= scale;

			// restrict radius to be between desired limits
			spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );
			
			
			offset.setFromSpherical( spherical );

			// rotate offset back to "camera-up-vector-is-up" space
			offset.applyQuaternion( quatInverse );
			

			position.copy( offset );

			scope.camera.lookAt( 0, 0, 0 );

			sphericalDelta.set( 0, 0, 0 );

			scale = 1;
			

			// has changed?

			if ( zoomChanged ||
				lastPosition.distanceToSquared( scope.camera.position ) > EPS ||
				8 * ( 1 - lastQuaternion.dot( scope.camera.quaternion ) ) > EPS ) {

				scope.dispatchEvent( changeEvent );

				lastPosition.copy( scope.camera.position );
				lastQuaternion.copy( scope.camera.quaternion );
				zoomChanged = false;

				return true;

			}

			return false;

		};

	}();


	this.dispose = function () {

		scope.earth.canvas.removeEventListener( 'mousedown', onMouseDown, false );
		scope.earth.canvas.removeEventListener( 'wheel', onMouseWheel, false );

		scope.earth.canvas.removeEventListener( 'touchstart', onTouchStart, false );
		scope.earth.canvas.removeEventListener( 'touchend', onTouchEnd, false );
		document.removeEventListener( 'touchmove', onTouchMove, false );

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );

	};

	
	// internals

	var scope = this;

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };

	var STATE = { NONE: - 1, ROTATE: 0, TOUCHZOOM: 1 };
	var state = STATE.NONE;

	var EPS = 0.000001;

	// current position in spherical coordinates
	var spherical = new Spherical();
	var sphericalDelta = new Spherical();

	var scale = 1;
	var zoomChanged = false;

	var rotateStart = new Vector2();
	var rotateEnd = new Vector2();
	var rotateDelta = new Vector2();
	
	var dollyStart = new Vector2();
	var dollyEnd = new Vector2();
	var dollyDelta = new Vector2();

	
	function getAutoRotationAngle() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}
	function getAutoRotationAngleY() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeedUp;
	}
	
	function getZoomScale() {
		return Math.pow( 0.95, scope.zoomSpeed );
	}

	function rotateLeft( angle ) {
		sphericalDelta.theta -= angle;
	}
	function rotateUp( angle ) {
		sphericalDelta.phi -= angle;
	}

	function dollyIn( dollyScale ) {
		scale /= dollyScale;
	}
	function dollyOut( dollyScale ) {
		scale *= dollyScale;
	}

	
	
	// event callbacks - update the object state

	function handleMouseDownRotate( event ) {
		
		rotateStart = Earth.getEventPosition( event );
		
	}

	function handleMouseMoveRotate( event ) {

		rotateEnd = Earth.getEventPosition( event );
		
		var earthRadiusPx = scope.earth.elementSize.y / 2 * 0.75 * scope.earth.zoom;
		
		var mouseCenterOffset = Earth.mouseCenterOffset( rotateEnd, scope.earth, earthRadiusPx );
		mouseCenterOffset = Earth.Animation.Easing['in-cubic']( mouseCenterOffset );
	
		var speed = 0.75 / earthRadiusPx;
		
		// compensate earth's curvature 
		speed *= 1 + mouseCenterOffset * 0.85;
		
		rotateDelta.subVectors( rotateEnd, rotateStart ).multiplyScalar( speed );
		
		rotateLeft( rotateDelta.x );
		rotateUp( rotateDelta.y );

		rotateStart.copy( rotateEnd );
		scope.update();

	}
	

	function handleMouseWheel( event ) {

		if ( event.deltaY < 0 ) {
			dollyOut( getZoomScale() );
		} else if ( event.deltaY > 0 ) {
			dollyIn( getZoomScale() );
		}

		scope.update();

	}

	
	function handleTouchStartDollyPan( event ) {

		if ( scope.enableZoom ) {

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			var distance = Math.sqrt( dx * dx + dy * dy );
			dollyStart.set( 0, distance );

		}

	}
	
	function handleTouchMoveDollyPan( event ) {

		if ( scope.enableZoom ) {

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyEnd.set( 0, distance );
			dollyDelta.set( 0, Math.pow( dollyEnd.y / dollyStart.y, scope.zoomSpeed ) );
			dollyIn( dollyDelta.y );
			dollyStart.copy( dollyEnd );
			scope.update();
		
		}

	}


	// event handlers

	function onMouseDown( event ) {

		event.preventDefault();

		switch ( event.button ) {

			case MOUSE.LEFT:

				if ( scope.enableRotate === false ) return;
				handleMouseDownRotate( event );
				state = STATE.ROTATE;
				break;

		}

		if ( state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( startEvent );
		}

	}

	function onMouseMove( event ) {

		event.preventDefault();

		switch ( state ) {

			case STATE.ROTATE:

				if ( ! scope.enableRotate ) return;
				handleMouseMoveRotate( event );
				break;

		}

	}

	function onMouseUp( event ) {

		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	function onMouseWheel( event ) {

		if ( ! scope.enableZoom ) return;

		event.preventDefault();
		event.stopPropagation();

		handleMouseWheel( event );

	}


	function onTouchStart( event ) {

		event.preventDefault();

		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				if ( scope.enableRotate === false ) return;
				handleMouseDownRotate( event );
				state = STATE.ROTATE;
				break;

			case 2:	// two-fingered touch: dolly-pan

				if ( scope.enableZoom === false ) return;
				handleTouchStartDollyPan( event );
				state = STATE.TOUCHZOOM;
				break;

			default:
				state = STATE.NONE;

		}

		if ( state !== STATE.NONE ) {
			scope.dispatchEvent( startEvent );
		}

	}

	function onTouchMove( event ) {

		// event.preventDefault(); // removed because of chrome console warning
		event.stopPropagation();

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( ! scope.enableRotate ) return;
				if ( state !== STATE.ROTATE ) return; // is this needed?

				handleMouseMoveRotate( event );
				break;

			case 2: // two-fingered touch: dolly-pan

				if ( ! scope.enableZoom ) return;
				if ( state !== STATE.TOUCHZOOM ) return; // is this needed?

				handleTouchMoveDollyPan( event );
				break;

			default:

				state = STATE.NONE;

		}

	}

	function onTouchEnd( event ) {
		
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	
	scope.earth.canvas.addEventListener( 'mousedown', onMouseDown, false );
	scope.earth.canvas.addEventListener( 'wheel', onMouseWheel, false );

	scope.earth.canvas.addEventListener( 'touchstart', onTouchStart, false );
	scope.earth.canvas.addEventListener( 'touchend', onTouchEnd, false );
	document.addEventListener( 'touchmove', onTouchMove, false );

	// force an update at start
	this.update();

};

Object.assign( Earth.Orbit.prototype, Earth.ClassicEventDispatcher.prototype );



/* MeshLine */
// private
// based on MeshLine

Earth.MeshLine = function() {

	this.positions = [];

	this.previous = [];
	this.next = [];
	this.side = [];
	this.width = [];
	this.indices_array = [];
	this.uvs = [];
	this.counters = [];
	this.geometry = new BufferGeometry();

	this.widthCallback = null;

};

Earth.MeshLine.prototype.setGeometry = function( g, c ) {

	this.widthCallback = c;

	this.positions = [];
	this.counters = [];

	if( g instanceof BufferGeometry ) {
		for( var j = 0; j < g.vertices.length; j++ ) {
			var v = g.vertices[ j ];
			var c = j/g.vertices.length;
			this.positions.push( v.x, v.y, v.z );
			this.positions.push( v.x, v.y, v.z );
			this.counters.push(c);
			this.counters.push(c);
		}
	}

	if( g instanceof Float32Array || g instanceof Array ) {
		for( var j = 0; j < g.length; j += 3 ) {
			var c = j/g.length;
			this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
			this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
			this.counters.push(c);
			this.counters.push(c);
		}
	}

	this.process();

}

Earth.MeshLine.prototype.compareV3 = function( a, b ) {

	var aa = a * 6;
	var ab = b * 6;
	return ( this.positions[ aa ] === this.positions[ ab ] ) && ( this.positions[ aa + 1 ] === this.positions[ ab + 1 ] ) && ( this.positions[ aa + 2 ] === this.positions[ ab + 2 ] );

}

Earth.MeshLine.prototype.copyV3 = function( a ) {

	var aa = a * 6;
	return [ this.positions[ aa ], this.positions[ aa + 1 ], this.positions[ aa + 2 ] ];

}

Earth.MeshLine.prototype.process = function() {

	var l = this.positions.length / 6;

	this.previous = [];
	this.next = [];
	this.side = [];
	this.width = [];
	this.indices_array = [];
	this.uvs = [];

	for( var j = 0; j < l; j++ ) {
		this.side.push( 1 );
		this.side.push( -1 );
	}

	var w;
	for( var j = 0; j < l; j++ ) {
		if( this.widthCallback ) w = this.widthCallback( j / ( l -1 ) );
		else w = 1;
		this.width.push( w );
		this.width.push( w );
	}

	for( var j = 0; j < l; j++ ) {
		this.uvs.push( j / ( l - 1 ), 0 );
		this.uvs.push( j / ( l - 1 ), 1 );
	}

	var v;

	if( this.compareV3( 0, l - 1 ) ){
		v = this.copyV3( l - 2 );
	} else {
		v = this.copyV3( 0 );
	}
	this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
	this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
	for( var j = 0; j < l - 1; j++ ) {
		v = this.copyV3( j );
		this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
	}

	for( var j = 1; j < l; j++ ) {
		v = this.copyV3( j );
		this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
		this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
	}

	if( this.compareV3( l - 1, 0 ) ){
		v = this.copyV3( 1 );
	} else {
		v = this.copyV3( l - 1 );
	}
	this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
	this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );

	for( var j = 0; j < l - 1; j++ ) {
		var n = j * 2;
		this.indices_array.push( n, n + 1, n + 2 );
		this.indices_array.push( n + 2, n + 1, n + 3 );
	}

	// if (! this.attributes) {
		
		this.attributes = {
			position: new BufferAttribute( new Float32Array( this.positions ), 3 ),
			previous: new BufferAttribute( new Float32Array( this.previous ), 3 ),
			next: new BufferAttribute( new Float32Array( this.next ), 3 ),
			side: new BufferAttribute( new Float32Array( this.side ), 1 ),
			width: new BufferAttribute( new Float32Array( this.width ), 1 ),
			uv: new BufferAttribute( new Float32Array( this.uvs ), 2 ),
			index: new BufferAttribute( new Uint16Array( this.indices_array ), 1 ),
			counters: new BufferAttribute( new Float32Array( this.counters ), 1 )
		};
		
		this.geometry.setAttribute( 'position', this.attributes.position );
		this.geometry.setAttribute( 'previous', this.attributes.previous );
		this.geometry.setAttribute( 'next', this.attributes.next );
		this.geometry.setAttribute( 'side', this.attributes.side );
		this.geometry.setAttribute( 'width', this.attributes.width );
		this.geometry.setAttribute( 'uv', this.attributes.uv );
		this.geometry.setIndex( this.attributes.index );
		this.geometry.setAttribute( 'counters', this.attributes.counters );
		
/*	} else {
	
	
		this.attributes.position.setArray( new Float32Array(this.positions) );
		this.attributes.position.needsUpdate = true;
		this.attributes.previous.setArray(new Float32Array(this.previous));
		this.attributes.previous.needsUpdate = true;
		this.attributes.next.setArray(new Float32Array(this.next));
		this.attributes.next.needsUpdate = true;
		this.attributes.side.setArray(new Float32Array(this.side));
		this.attributes.side.needsUpdate = true;
		this.attributes.width.setArray(new Float32Array(this.width));
		this.attributes.width.needsUpdate = true;
		this.attributes.uv.setArray(new Float32Array(this.uvs));
		this.attributes.uv.needsUpdate = true;
		this.attributes.index.setArray(new Uint16Array(this.indices_array));
		this.attributes.index.needsUpdate = true;
		this.attributes.counters.setArray(new Float32Array( this.counters ));
		this.attributes.counters.needsUpdate = true;


    } */

}

 
Earth.MeshLineMat = function( parameters ) {

	var vertexShaderSource = [
'precision highp float;',
'',
'attribute vec3 position;',
'attribute vec3 previous;',
'attribute vec3 next;',
'attribute float side;',
'attribute float width;',
'attribute vec2 uv;',
'attribute float counters;',
'',
'uniform mat4 projectionMatrix;',
'uniform mat4 modelViewMatrix;',
'uniform vec2 resolution;',
'uniform float lineWidth;',
'uniform vec3 color;',
'uniform float opacity;',
'uniform float near;',
'uniform float far;',
'uniform float sizeAttenuation;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'vec2 fix( vec4 i, float aspect ) {',
'',
'    vec2 res = i.xy / i.w;',
'    res.x *= aspect;',
'	 vCounters = counters;',
'    return res;',
'',
'}',
'',
'void main() {',
'',
'    float aspect = resolution.x / resolution.y;',
'	 float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
'',
'    vColor = vec4( color, opacity );',
'    vUV = uv;',
'',
'    mat4 m = projectionMatrix * modelViewMatrix;',
'    vec4 finalPosition = m * vec4( position, 1.0 );',
'    vec4 prevPos = m * vec4( previous, 1.0 );',
'    vec4 nextPos = m * vec4( next, 1.0 );',
'',
'    vec2 currentP = fix( finalPosition, aspect );',
'    vec2 prevP = fix( prevPos, aspect );',
'    vec2 nextP = fix( nextPos, aspect );',
'',
'	 float pixelWidth = finalPosition.w * pixelWidthRatio;',
'    float w = 1.8 * pixelWidth * lineWidth * width;',
'',
'    if( sizeAttenuation == 1. ) {',
'        w = 1.8 * lineWidth * width;',
'    }',
'',
'    vec2 dir;',
'    if( nextP == currentP ) dir = normalize( currentP - prevP );',
'    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
'    else {',
'        vec2 dir1 = normalize( currentP - prevP );',
'        vec2 dir2 = normalize( nextP - currentP );',
'        dir = normalize( dir1 + dir2 );',
'',
'        vec2 perp = vec2( -dir1.y, dir1.x );',
'        vec2 miter = vec2( -dir.y, dir.x );',
'        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
'',
'    }',
'',
'    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
'    vec2 normal = vec2( -dir.y, dir.x );',
'    normal.x /= aspect;',
'    normal *= .5 * w;',
'',
'    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
'    finalPosition.xy += offset.xy;',
'',
'    gl_Position = finalPosition;',
'',
'}' ];

	var fragmentShaderSource = [
		'#extension GL_OES_standard_derivatives : enable',
'precision mediump float;',
'',
'uniform sampler2D map;',
'uniform sampler2D alphaMap;',
'uniform float useMap;',
'uniform float useAlphaMap;',
'uniform float useDash;',
'uniform float dashArray;',
'uniform float dashOffset;',
'uniform float dashRatio;',
'uniform float visibility;',
'uniform float alphaTest;',
'uniform vec2 repeat;',
'',
'varying vec2 vUV;',
'varying vec4 vColor;',
'varying float vCounters;',
'',
'void main() {',
'',
'    vec4 c = vColor;',
'    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
'    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
'    if( c.a < alphaTest ) discard;',
'    if( useDash == 1. ){',
'        c.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));',
'    }',
'    gl_FragColor = c;',
'    gl_FragColor.a *= step(vCounters, visibility);',
'}' ];

	function check( v, d ) {
		if( v === undefined ) return d;
		return v;
	}

	// Material.call( this );
	
	parameters = parameters || {};

	this.lineWidth = check( parameters.lineWidth, 1 );
	this.map = check( parameters.map, null );
	this.useMap = check( parameters.useMap, 0 );
	this.alphaMap = check( parameters.alphaMap, null );
	this.useAlphaMap = check( parameters.useAlphaMap, 0 );
	this.color = check( parameters.color, new Color( 0xffffff ) );
	this.opacity = check( parameters.opacity, 1 );
	this.resolution = check( parameters.resolution, new Vector2( 1, 1 ) );
	this.sizeAttenuation = check( parameters.sizeAttenuation, 1 );
	this.near = check( parameters.near, 1 );
	this.far = check( parameters.far, 1 );
	this.dashArray = check( parameters.dashArray, 0 );
	this.dashOffset = check( parameters.dashOffset, 0 );
	this.dashRatio = check( parameters.dashRatio, 0.5 );
	this.useDash = ( this.dashArray !== 0 ) ? 1 : 0;
	this.visibility = check( parameters.visibility, 1 );
	this.alphaTest = check( parameters.alphaTest, 0 );
	this.repeat = check( parameters.repeat, new Vector2( 1, 1 ) );

	var material = new RawShaderMaterial( {
		uniforms:{
			lineWidth: { type: 'f', value: this.lineWidth },
			map: { type: 't', value: this.map },
			useMap: { type: 'f', value: this.useMap },
			alphaMap: { type: 't', value: this.alphaMap },
			useAlphaMap: { type: 'f', value: this.useAlphaMap },
			color: { type: 'c', value: this.color },
			opacity: { type: 'f', value: this.opacity },
			resolution: { type: 'v2', value: this.resolution },
			sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
			near: { type: 'f', value: this.near },
			far: { type: 'f', value: this.far },
			dashArray: { type: 'f', value: this.dashArray },
			dashOffset: { type: 'f', value: this.dashOffset },
			dashRatio: { type: 'f', value: this.dashRatio },
			useDash: { type: 'f', value: this.useDash },
			visibility: {type: 'f', value: this.visibility},
			alphaTest: {type: 'f', value: this.alphaTest},
			repeat: { type: 'v2', value: this.repeat }
		},
		vertexShader: vertexShaderSource.join( '\r\n' ),
		fragmentShader: fragmentShaderSource.join( '\r\n' )
	});

	material.type = 'MeshLineMaterial';

	material.setValues( parameters );

	return material;

};

Earth.MeshLineMat.prototype = Object.create( Material.prototype );
Earth.MeshLineMat.prototype.constructor = Earth.MeshLineMat;



/* ObjParser */
// private
// based on OBJLoader

Earth.ObjParser = ( function () {

	// o object_name | g group_name
	var object_pattern = /^[og]\s*(.+)?/;

	function ParserState() {

		var state = {
			objects: [],
			object: {},

			vertices: [],
			normals: [],

			startObject ( name, fromDeclaration ) {

				if ( this.object && this.object.fromDeclaration === false ) {
					this.object.name = name;
					this.object.fromDeclaration = ( fromDeclaration !== false );
					return;
				}

				var previousMaterial = ( this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined );

				if ( this.object && typeof this.object._finalize === 'function' ) {
					this.object._finalize( true );
				}

				this.object = {
					name: name || '',
					fromDeclaration: ( fromDeclaration !== false ),

					geometry: {
						vertices: [],
						normals: []
					},
					materials: [],
					smooth: true,

					currentMaterial () {
						if ( this.materials.length > 0 ) {
							return this.materials[ this.materials.length - 1 ];
						}
						return undefined;
					},

					_finalize ( end ) {

						var lastMultiMaterial = this.currentMaterial();
						if ( lastMultiMaterial && lastMultiMaterial.groupEnd === - 1 ) {

							lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
							lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
							lastMultiMaterial.inherited = false;

						}

						// Ignore objects tail materials if no face declarations followed them before a new o/g started.
						if ( end && this.materials.length > 1 ) {
							for ( var mi = this.materials.length - 1; mi >= 0; mi -- ) {
								if ( this.materials[ mi ].groupCount <= 0 ) {
									this.materials.splice( mi, 1 );
								}
							}
						}

						// Guarantee at least one empty material, this makes the creation later more straight forward.
						if ( end && this.materials.length === 0 ) {
							this.materials.push( {
								name: '',
								smooth: this.smooth
							} );
						}

						return lastMultiMaterial;

					}
				};

				// Inherit previous objects material.
				if ( previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function' ) {
					var declared = previousMaterial.clone( 0 );
					declared.inherited = true;
					this.object.materials.push( declared );
				}

				this.objects.push( this.object );

			},

			finalize () {
				if ( this.object && typeof this.object._finalize === 'function' ) {
					this.object._finalize( true );
				}
			},

			parseVertexIndex ( value, len ) {
				var index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
			},

			parseNormalIndex ( value, len ) {
				var index = parseInt( value, 10 );
				return ( index >= 0 ? index - 1 : index + len / 3 ) * 3;
			},

			addVertex ( a, b, c ) {
				var src = this.vertices;
				var dst = this.object.geometry.vertices;

				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
			},

			addNormal ( a, b, c ) {
				var src = this.normals;
				var dst = this.object.geometry.normals;
				
				dst.push( src[ a + 0 ], src[ a + 1 ], src[ a + 2 ] );
				dst.push( src[ b + 0 ], src[ b + 1 ], src[ b + 2 ] );
				dst.push( src[ c + 0 ], src[ c + 1 ], src[ c + 2 ] );
			},

			addFace ( a, b, c, ua, ub, uc, na, nb, nc ) {
				var vLen = this.vertices.length;

				var ia = this.parseVertexIndex( a, vLen );
				var ib = this.parseVertexIndex( b, vLen );
				var ic = this.parseVertexIndex( c, vLen );

				this.addVertex( ia, ib, ic );


				if ( na !== undefined && na !== '' ) {

					// Normals are many times the same. If so, skip function call and parseInt.
					var nLen = this.normals.length;
					ia = this.parseNormalIndex( na, nLen );

					ib = na === nb ? ia : this.parseNormalIndex( nb, nLen );
					ic = na === nc ? ia : this.parseNormalIndex( nc, nLen );

					this.addNormal( ia, ib, ic );

				}
			},

		};

		state.startObject( '', false );

		return state;

	}



	function OBJLoader( manager ) {
		
		this.manager = ( manager !== undefined ) ? manager : DefaultLoadingManager;
		this.materials = null;
		
	}

	OBJLoader.prototype = {

		constructor: OBJLoader,

		parse ( text ) {

			var state = new ParserState();

			if ( text.indexOf( '\r\n' ) !== - 1 ) {
				// This is faster than String.split with regex that splits on both
				text = text.replace( /\r\n/g, '\n' );
			}

			if ( text.indexOf( '\\\n' ) !== - 1 ) {
				// join lines separated by a line continuation character (\)
				text = text.replace( /\\\n/g, '' );
			}

			var lines = text.split( '\n' );
			var line = ''; var lineFirstChar = '';
			var lineLength = 0;
			var result = [];

			// Faster to just trim left side of the line. Use if available.
			var trimLeft = ( typeof ''.trimLeft === 'function' );

			for ( var i = 0, l = lines.length; i < l; i ++ ) {

				line = lines[ i ];
				line = trimLeft ? line.trimLeft() : line.trim();
				lineLength = line.length;

				if ( lineLength === 0 ) continue;

				lineFirstChar = line.charAt( 0 );

				// @todo invoke passed in handler if any
				if ( lineFirstChar === '#' ) continue;

				if ( lineFirstChar === 'v' ) {

					var data = line.split( /\s+/ );

					switch ( data[ 0 ] ) {

						case 'v':
							state.vertices.push(
								parseFloat( data[ 1 ] ),
								parseFloat( data[ 2 ] ),
								parseFloat( data[ 3 ] )
							);
							break;
							
						case 'vn':
							state.normals.push(
								parseFloat( data[ 1 ] ),
								parseFloat( data[ 2 ] ),
								parseFloat( data[ 3 ] )
							);
							break;

					}

				} else if ( lineFirstChar === 'f' ) {

					var lineData = line.substr( 1 ).trim();
					var vertexData = lineData.split( /\s+/ );
					var faceVertices = [];

					// Parse the face vertex data into an easy to work with format

					for ( var j = 0, jl = vertexData.length; j < jl; j ++ ) {
						var vertex = vertexData[ j ];

						if ( vertex.length > 0 ) {
							var vertexParts = vertex.split( '/' );
							faceVertices.push( vertexParts );
						}
					}

					// Draw an edge between the first vertex and all subsequent vertices to form an n-gon

					var v1 = faceVertices[ 0 ];

					for ( var j = 1, jl = faceVertices.length - 1; j < jl; j ++ ) {
						var v2 = faceVertices[ j ];
						var v3 = faceVertices[ j + 1 ];

						state.addFace(
							v1[ 0 ], v2[ 0 ], v3[ 0 ],
							v1[ 1 ], v2[ 1 ], v3[ 1 ],
							v1[ 2 ], v2[ 2 ], v3[ 2 ]
						);
					}

				} else if ( ( result = object_pattern.exec( line ) ) !== null ) {

					// o object_name or g group_name
					var name = ( " " + result[ 0 ].substr( 1 ).trim() ).substr( 1 );
					state.startObject( name );


				} else if ( lineFirstChar === 's' ) {

					result = line.split( ' ' );

					// smooth shading
					if ( result.length > 1 ) {
						var value = result[ 1 ].trim().toLowerCase();
						state.object.smooth = ( value !== '0' && value !== 'off' );

					} else {
						state.object.smooth = true;

					}
					
					var material = state.object.currentMaterial();
					if ( material ) material.smooth = state.object.smooth;

				} else {

					// Handle null terminated files
					if ( line === '\0' ) continue;

				}

			}

			state.finalize();

			var container = new Group();

			for ( var i = 0, l = state.objects.length; i < l; i ++ ) {

				var object = state.objects[ i ];
				var {geometry} = object;

				// Skip o/g line declarations that did not follow with any faces
				if ( geometry.vertices.length === 0 ) continue;

				var buffergeometry = new BufferGeometry();

				buffergeometry.setAttribute( 'position', new Float32BufferAttribute( geometry.vertices, 3 ) );

				if ( geometry.normals.length > 0 ) {
					buffergeometry.setAttribute( 'normal', new Float32BufferAttribute( geometry.normals, 3 ) );
				} else {
					buffergeometry.computeVertexNormals();
				}


				// Create mesh

				var mesh = new Mesh( buffergeometry );
				mesh.name = object.name;
				container.add( mesh );

			}

			return container;

		}

	};

	return OBJLoader;

} )();





/* Earth INIT */

if ( document.readyState == 'loading' ) { // page is still loading
	
	document.addEventListener( "DOMContentLoaded", () => {
		Earth.dispatchLoadEvent();
	} );
	
} else { // async load
	
	setTimeout( ()=> {
		Earth.dispatchLoadEvent();
	}, 1 );
	
}