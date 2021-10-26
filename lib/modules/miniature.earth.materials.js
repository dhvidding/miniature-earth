// Materials v1.0
// Advanced material options for the earth surface 

window.addEventListener( "earthjsload", function() {

	Earth.Materials = {};
	
	// options
	var displacement_resolution = 12;
	
	
	// add draw methods to earth instance
	
	Earth.Materials.enable = function( earth ) {
	
	
		// normal map
		
		earth.loadNormalMap = function( url, scale, complete ) {
			
			if ( ! scale ) scale = 1;

			var map = new THREE.TextureLoader().load( url, function(){
				map.wrapS = THREE.RepeatWrapping;
				map.offset = new THREE.Vector2( -0.25, 0 );
			
				earth.sphere.material.normalMap = map;
				earth.sphere.material.normalScale = new THREE.Vector2( scale, scale );
				earth.sphere.material.needsUpdate = true;
				
				if ( typeof complete == 'function' ) {
					complete();
				}
				
			} );

		};	
	
	
		// displacement map
		
		earth.loadDisplacementMap = function( url, scale, complete ) {
			
			if ( ! scale ) scale = 1;

			// replace earth sphere with more detailed geometry
			this.sphere.geometry = new THREE.SphereBufferGeometry( Earth.earthRadius, displacement_resolution*16, displacement_resolution*12 );
		
			var map = new THREE.TextureLoader().load( url, function(){
				map.wrapS = THREE.RepeatWrapping;
			
				earth.sphere.material.displacementMap = map;
				earth.sphere.material.displacementScale = scale;
				earth.sphere.material.needsUpdate = true;
				
				if ( typeof complete == 'function' ) {
					complete();
				}
				
			} );

		};

		
	
		
		// add a sphere for use as a new map layer

		earth.addMapLayer = function( url, offset, complete, alpha_map, color ) {
			
			if ( ! offset ) offset = 0.01;
			if ( ! color ) color = 0xFFFFFF;
			
			var map = new THREE.TextureLoader().load( url, function(){
				
				map.wrapS = THREE.RepeatWrapping;
				map.anisotropy = Earth.anisotropy[ earth.quality ];
				map.offset = new THREE.Vector2( -0.25, 0 );		
				
				var layer = new THREE.Mesh(
					new THREE.SphereBufferGeometry( Earth.earthRadius + offset, earth.options.quality*16, earth.options.quality*12 ),
					new THREE.MeshPhongMaterial( {
						map : (alpha_map) ? null : map,
						alphaMap : (alpha_map) ? map : null,
						transparent : true,
						depthWrite : false,
						color: new THREE.Color( color )
					} )
				);
				earth.scene.add( layer );
				
				if ( typeof complete == 'function' ) {
					complete( layer );
				}				
				
			} );
			
		};
		
	
	
	};
	

} );