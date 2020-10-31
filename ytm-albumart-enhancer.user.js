'use strict;'
// ==UserScript==
// @name YTM Album Art Enhancer
// @description Makes YTM show higher resolution album art when possible on the now playing screen
// @match https://music.youtube.com/*
// @version 0.1.1
// ==/UserScript==

class ArtEnhancer {
	constructor(ytmapp) {
		this.ytm = ytmapp;

		this.playerNode = null;
		this.songThumb = null;
		this.nodeSearchTries = 20000 / 50;  // 20 seconds worth of 50ms tries

		this.window_resized = this.window_resized.bind(this);
		this.nodes_changed = this.nodes_changed.bind(this);
		this.player_update = this.player_update.bind(this);
		this.thumb_load = this.thumb_load.bind(this);
		this.fs_change = this.fs_change.bind(this);
		this.dpi_change = this.dpi_change.bind(this);
		this.size_change = this.size_change.bind(this);

		this.findNodes = this.findNodes.bind(this);
		this.updateImage = this.updateImage.bind(this);

		this.pendingResize = null;
		this.queuedResizes = 0;
		this.pendingUpdate = null;

		this.observer = null;
		this.highDPIQuery = null;

		console.info("Art Enhancer initialized");

		console.debug("finding nodes");
		this.findNodes();
	}

	findNodes() {
		if(this.nodeSearchTries-- <= 0) {
			console.error("Art Enhancer failed: could not find nodes!");
			return;
		}
		this.playerNode = this.playerNode || this.ytm.querySelector('ytmusic-player');
		if(!this.playerNode) {
			setTimeout(this.findNodes, 50);
			return;
		}
		this.songThumb = this.playerNode.querySelector('#song-image #thumbnail');
		if(!this.songThumb) {
			setTimeout(this.findNodes, 50);
			return;
		}
		console.debug("nodes found");
		this.setHooks();
	}

	setHooks() {
		console.debug("setting hooks");
		this.observer = new MutationObserver(this.nodes_changed);
		this.highDPIQuery = matchMedia('(resolution: 1dppx)');

		this.observer.observe(this.playerNode, {attributeFilter: ['playable_', 'player-ui-state_']});
		this.observer.observe(this.songThumb, {attributeFilter: ['loaded']});
		this.highDPIQuery.addEventListener('change', this.dpi_change);
		window.addEventListener('resize', this.window_resized);
		document.addEventListener('fullscreenchange', this.fs_change);

		console.debug("hooks set");
		console.info("Art Enhancer started");
	}

	window_resized() {
		if(!this.pendingResize)
			this.pendingResize = setInterval(this.size_change, 100);
		this.queuedResizes++;
	}

	nodes_changed(changes) {
		let matched = [];
		for(let change of changes) {
			if(matched.includes(change.target))
				continue;
			matched.push(change.target);
			if(change.target == this.playerNode)
				this.player_update();
			else if(change.target == this.songThumb)
				this.thumb_load();
		}
	}

	player_update() {
		if(!this.playerNode.attributes.playable_)
			return;
		console.debug("player state changed");
		this.queueUpdate();
	}

	thumb_load() {
		if(!this.songThumb.attributes.loaded)
			return;
		console.debug("new thumb");
		this.immediateUpdate();
	}

	fs_change() {
		console.debug("fullscreen change");
		this.immediateUpdate();
	}

	dpi_change() {
		console.debug("DPI change");
		this.queueUpdate();
	}

	size_change() {
		if(this.pendingResize) {
			if(this.queuedResizes) {
				this.queuedResizes = 0;
				return;
			}
			clearInterval(this.pendingResize);
			this.pendingResize = null;
		}
		console.debug("size change");
		this.queueUpdate();
	}

	updateImage() {
		this.pendingUpdate = null;

		let img = this.songThumb.querySelector('img#img');
		let [width, height] = this.thumbSizeNeeded();
		if(!width || !height) {
			console.debug("thumb update skipped since size is not valid");
			return;
		}
		if(width == img.naturalWidth && height == img.naturalHeight) {
			console.debug("thumb is already the optimal resolution of %dx%d", width, height);
			return;
		}
		if(/^https:\/\/[^/]*\.googleusercontent\.com\/./i.test(img.src) == false) {
			console.debug("thumb is not an updateable image");
			return;
		}
		img.src = img.src.replace(/(=[^=]*)?$/, `=w${width}-h${height}-l93-rj`);
		console.info("thumb updated to resolution %dx%d", width, height);
	}

	queueUpdate() {
		if(this.pendingUpdate)
			clearTimeout(this.pendingUpdate);
		this.pendingUpdate = setTimeout(this.updateImage, 500);
	}

	immediateUpdate() {
		if(this.pendingUpdate)
			clearTimeout(this.pendingUpdate);
		this.updateImage();
	}

	thumbSizeNeeded() {
		return [Math.floor(this.songThumb.clientWidth * devicePixelRatio), Math.floor(this.songThumb.clientHeight * devicePixelRatio)];
	}
}


let enhancer = new ArtEnhancer(document.querySelector('ytmusic-app'));
