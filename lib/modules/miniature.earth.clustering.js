// Clustering v1.0
// Creates collapsible groups of Markers, Sprites or Images
// The hotspot property of the objects must be true

window.addEventListener( "earthjsload", function() {

	Earth.Clustering = {};
	
	// cluster settings
	var collapse_siblings = true;
	
	
	// setup cluster
	
	Earth.Clustering.enable = function( earth ) {


		// create cluster group
		
		earth.cluster = function( obj, children ) {
		
			// store in clusters array
			if ( ! this.clusters ) this.clusters = []; 
			this.clusters.push( obj );
			
			// expand on click
			obj.addEventListener( 'click', expandCluster );
			if (! obj.originalScale) obj.originalScale = obj.scale;
			obj.expanded = false;
			obj.clusterChildren = children;
			obj.expand = expandCluster.bind( obj );
			obj.collapse = collapseCluster.bind( obj );
			
			// set object location to the children average location if location not set
			if ( obj.location.lat == 0 && obj.location.lng == 0) {
				obj.location = getAverageLocation( children );
			}
			
			// setup children
			for ( var i = 0; i < children.length; i++ ) {
				children[i].clusterParent = obj;
				if (! children[i].originalScale) children[i].originalScale = children[i].scale;
				children[i].scale = 0.01;
				if (! children[i].originalLocation) children[i].originalLocation = children[i].location;
				children[i].location = obj.originalLocation || obj.location;
				children[i].visible = false;
			}
			
		};
		
		
		// collapse all clusters of top level
		
		earth.collapseAll = function() {
			for ( var i = 0; i < this.clusters.length; i++ ) {
				if ( this.clusters[i].clusterParent ) continue; // only top level
				this.clusters[i].collapse();
			}
		};
		
		
	};

	
	function expandCluster() {
		
		if ( this.expanded ) return;
		this.expanded = true;
		
		// hide marker
		this.animate( 'scale', 0.01, { complete: function(){ this.visible=false; } } );
		
		// show children
		for ( var i = 0; i < this.clusterChildren.length; i++ ) {
			this.clusterChildren[i].visible = true;
			this.clusterChildren[i].animate( 'scale', this.clusterChildren[i].originalScale );
			this.clusterChildren[i].location = this.location;
			this.clusterChildren[i].animate( 'location', this.clusterChildren[i].originalLocation );
		}
		
		if ( collapse_siblings ) {
			var siblings = getSiblings( this );
			for ( var i = 0; i < siblings.length; i++ ) {
				siblings[i].collapse();
			}
		}
		
	}
	
	function collapseCluster( multi_collapse_location ) {
		
		if ( ! this.expanded ) return;
		this.expanded = false;
		
		if ( ! multi_collapse_location ) {
			// show marker
			this.visible = true;
			this.animate( 'scale', this.originalScale );
		}
		
		// hide children
		for ( var i = 0; i < this.clusterChildren.length; i++ ) {
			this.clusterChildren[i].visible = true;
			this.clusterChildren[i].animate( 'scale', 0.01, { complete: function(){ this.visible=false; } } );
			this.clusterChildren[i].animate( 'location', multi_collapse_location || this.location );
			
			// collapse sub levels
			if ( this.clusterChildren[i].clusterChildren ) collapseCluster.bind( this.clusterChildren[i] )( multi_collapse_location || this.location );
		}
		
	}
	
	
	function getSiblings( cluster ) {
		
		var clusters = cluster.earth.clusters;
		var siblings = [];
		
		for ( var i = 0; i < clusters.length; i++ ) {
			
			if ( cluster.clusterParent == clusters[i].clusterParent && cluster != clusters[i] ) siblings.push( clusters[i] );
			
		}
		
		return siblings;
		
	}
	
	
	function getAverageLocation( children ) {
		
		var lat = 0, lng = 0;
		
		for ( var i = 0; i < children.length; i++ ) {
			lat += children[i].location.lat;
			lng += children[i].location.lng;
		}
		
		return {
			lat : lat / children.length,
			lng : lng / children.length
		};
		
	}
	

} );