'use strict;'
// ==UserScript==
// @name YTM Album Art Enhancer
// @description Makes YTM show higher resolution album art when possible on the now playing screen
// @match https://music.youtube.com/*
// @version 0.1
// ==/UserScript==

class ArtEnhancer {
	constructor(ytmapp) {
		this.ytm = ytmapp;
		this.playerNode = this.ytm.querySelector('ytmusic-player');
		this.songThumb = this.playerNode.querySelector('#song-image #thumbnail');

		this.window_resized = this.window_resized.bind(this);
		this.thumb_load = this.thumb_load.bind(this);
		this.dpi_change = this.dpi_change.bind(this);
		this.size_change = this.size_change.bind(this);
		this.updateImage = this.updateImage.bind(this);

		this.pendingResize = null;
		this.queuedResizes = 0;
		this.pendingUpdate = null;
		this.observer = new MutationObserver(this.thumb_load);
		this.highDPIQuery = matchMedia('(resolution: 1dppx)');

		this.observer.observe(this.songThumb, {attributeFilter: ['loaded']});
		this.highDPIQuery.addEventListener('change', this.dpi_change);
		window.addEventListener('resize', this.window_resized);

		console.info("Art Enhancer started");
	}

	window_resized() {
		if(!this.pendingResize)
			this.pendingResize = setInterval(this.size_change, 100);
		this.queuedResizes++;
	}

	thumb_load() {
		if(!this.songThumb.attributes.loaded)
			return;
		console.debug("new thumb");
		this.updateImage();
	}

	dpi_change() {
		console.debug("DPI change");
		if(this.pendingUpdate)
			clearTimeout(this.pendingUpdate);
		this.pendingUpdate = setTimeout(this.updateImage, 500);
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
		if(this.pendingUpdate)
			clearTimeout(this.pendingUpdate);
		this.pendingUpdate = setTimeout(this.updateImage, 500);
	}

	updateImage() {
		this.pendingUpdate = null;

		let img = this.songThumb.querySelector('img#img');
		if(/^https:\/\/[^/]*\.googleusercontent\.com\/./i.test(img.src) == false) {
			console.debug("thumb is not an updateable image");
			return;
		}
		let size = this.thumbSizeNeeded();
		if(size == [img.naturalWidth, img.naturalHeight]) {
			console.debug("thumb is already the optimal resolution of %dx%d", size[0], size[1]);
			return;
		}

		img.src = img.src.replace(/(=[^=]*)?$/, `=w${size[0]}-h${size[1]}-l93-rj`);
		console.info("thumb updated to resolution %dx%d", size[0], size[1]);
	}

	thumbSizeNeeded() {
		return [this.songThumb.clientWidth * devicePixelRatio, this.songThumb.clientHeight * devicePixelRatio];
	}
}


let enhancer = new ArtEnhancer(document.querySelector('ytmusic-app'));