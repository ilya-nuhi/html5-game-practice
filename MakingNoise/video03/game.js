// JavaScript Document
class Game{
	constructor(){
    	this.canvas = document.getElementById("game");
		this.context = this.canvas.getContext("2d");
		this.context.font="30px Verdana";
		this.sprites = [];
		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.correctSfx = new SFX({
			context: this.audioContext,
			src:{mp3:"gliss.mp3", webm:"gliss.webm"},
			loop: false,
			volume: 0.3
		});
		
		this.wrongSfx = new SFX({
			context: this.audioContext,
			src:{mp3:"boing.mp3", webm:"boing.webm"},
			loop: false,
			volume: 0.3
		})
        
		const game = this;
		this.loadJSON("flowers", function(data, game){
			game.spriteData = JSON.parse(data);
			game.spriteImage = new Image();
			game.spriteImage.src = game.spriteData.meta.image;
			game.spriteImage.onload = function(){	
				game.init();
			}
		})
	}
	
	loadJSON(json, callback) {   
		var xobj = new XMLHttpRequest();
			xobj.overrideMimeType("application/json");
		xobj.open('GET', json + '.json', true); // Replace 'my_data' with the path to your file
		const game = this;
		xobj.onreadystatechange = function () {
			  if (xobj.readyState == 4 && xobj.status == "200") {
				// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
				callback(xobj.responseText, game);
			  }
		};
		xobj.send(null);  
	 }
	
	init(){
		this.score = 0;
		this.lastRefreshTime = Date.now();
		this.spawn();
		this.refresh();
			
		const game = this;
		
		function tap(evt){
			game.tap(evt);
		}
		
		if ('ontouchstart' in window){
			this.canvas.addEventListener("touchstart", tap, supportsPassive ? { passive:true } : false );
		}else{
			this.canvas.addEventListener("mousedown", tap);
		}
	}
	
	refresh() {
		const now = Date.now();
		const dt = (now - this.lastRefreshTime) / 1000.0;

		this.update(dt);
		this.render();

		this.lastRefreshTime = now;
		
		const game = this;
		requestAnimationFrame(function(){ game.refresh(); });
	}
	
	getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
		const clientX = evt.targetTouches ? evt.targetTouches[0].clientX : evt.clientX;
		const clientY = evt.targetTouches ? evt.targetTouches[0].clientY : evt.clientY;
		
		const canvasScale = this.canvas.width / rect.width;
		const loc = {};
		
		loc.x = (clientX - rect.left) * canvasScale;
		loc.y = (clientY - rect.top) * canvasScale;
		
        return loc;
    }
	
	tap (evt) {
		const mousePos = this.getMousePos(evt);
		
		for (let sprite of this.sprites) {
			if (sprite.hitTest(mousePos)){
                if (sprite.index==4){
                    this.wrongSfx.play();
                }else{
                    this.correctSfx.play();
				    sprite.kill = true;
				    this.score++;
                }
			}
		}
	}
	
	update(dt){
		this.sinceLastSpawn += dt;
		if (this.sinceLastSpawn>1) this.spawn();
		let removed;
		do{
			removed = false;
			for(let sprite of this.sprites){
				if (sprite.kill){
					const index = this.sprites.indexOf(sprite);
					this.sprites.splice(index, 1);
					removed = true;
					break;
				}
			}
		}while(removed);
		
		for(let sprite of this.sprites){
			if (sprite==null) continue;
			sprite.update(dt);
		}
	}
	
	spawn(){
		const index = Math.floor(Math.random() * 5);
		const frame = this.spriteData.frames[index].frame;
		const sprite = new Sprite({
			context: this.context,
			x: Math.random() * this.canvas.width,
			y: Math.random() * this.canvas.height,
			index: index,
			frame: frame,	
			anchor: { x:0.5, y:0.5 },
			image: this.spriteImage,
			states: [ { mode:"spawn", duration: 0.5 }, {mode:"static", duration:1.5}, {mode:"die", duration:0.8} ]
		});
		
		this.sprites.push(sprite);
		this.sinceLastSpawn = 0;	
	}
	
	render(){
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		for(let sprite of this.sprites){
			sprite.render();
		}
		
		this.context.fillText("Score: " + this.score, 150, 30);
	}
}

class Sprite{
	constructor(options){
		this.context = options.context;
		this.image = options.image;
		this.index = options.index;
		this.frame = options.frame;
		this.x = options.x;
		this.y = options.y;
		this.anchor = (options.anchor==null) ? { x:0.5, y:0.5 } : options.anchor;
		this.states = options.states;
        this.state = 0;
		this.scale = (options.scale==null) ? 1.0 : options.scale;
		this.opacity = (options.opacity==null) ? 1.0 : options.opacity;
		this.currentTime = 0;
		this.kill = false;
	}

	set state(index){
        this.stateIndex = index;
        this.stateTime = 0;
    }
    
    get state(){
        let result;
        
        if (this.stateIndex<this.states.length) result = this.states[this.stateIndex];
        
        return result;
    }
		
	hitTest(pt){
		const centre = { x: this.x, y: this.y };
		const radius = (this.frame.w * this.scale) / 2;
		//Now test if the pt is in the circle
		const dist = distanceBetweenPoints(pt, centre);

		return (dist<radius);
		
		function distanceBetweenPoints(a, b){
			var x = a.x - b.x;
			var y = a.y - b.y;
			
			return Math.sqrt(x * x + y * y);
		}
	}
		
	update(dt){
		this.stateTime += dt;
		const state = this.state;
		if (state==null){
			this.kill = true;
			return;
		}
		const delta = this.stateTime/state.duration;
        if (delta>1) this.state = this.stateIndex + 1;

		switch(state.mode){
			case "spawn":
				//scale and fade in
				this.scale = delta;
				this.opacity = delta;
				break;
			case "static":
				this.scale = 1.0;
				this.opacity = 1.0;
				break;
			case "die":
				this.scale = 1.0 + delta;
				this.opacity = 1.0 - delta;
                if (this.opacity<0) this.opacity = 0;
				break;
		}
	}
	
	render() {
		// Draw the animation
		const alpha = this.context.globalAlpha;
			
		this.context.globalAlpha = this.opacity;
		
		this.context.drawImage(
		   this.image,
		   this.frame.x,
		   this.frame.y,
		   this.frame.w,
		   this.frame.h,
		   this.x - this.frame.w * this.scale * this.anchor.x,
		   this.y - this.frame.h * this.scale * this.anchor.y,
		   this.frame.w * this.scale,
		   this.frame.h * this.scale);
		
		this.context.globalAlpha = alpha;
	}
}

class SFX{
	constructor(options){
		this.context = options.context;
		const volume = (options.volume!=undefined) ? options.volume : 1.0;
		this.gainNode = this.context.createGain();
		this.gainNode.gain.setValueAtTime(volume, this.context.currentTime);
		this.gainNode.connect(this.context.destination);
		this._loop = (options.loop==undefined) ? false : options.loop;
		this.fadeDuration = (options.fadeDuration==undefined) ? 0.5 : options.fadeDuration;
		this.autoplay = (options.autoplay==undefined) ? false : options.autoplay;
		this.buffer = null;
		
		let codec;
		for(let prop in options.src){
			if (prop=="webm" && SFX.supportsVideoType(prop)){
				codec = prop;
				break;
			}
			if (prop=="mp3"){
				codec = prop;
			}
		}
		
		if (codec!=undefined){
			this.url = options.src[codec];
			this.load(this.url);
		}else{
			console.warn("Browser does not support any of the supplied audio files");
		}
	}
	
	static supportsVideoType(type) {
		let video;
	  	// Allow user to create shortcuts, i.e. just "webm"
	  	let formats = {
			ogg: 'video/ogg; codecs="theora"',
			h264: 'video/mp4; codecs="avc1.42E01E"',
			webm: 'video/webm; codecs="vp8, vorbis"',
			vp9: 'video/webm; codecs="vp9"',
			hls: 'application/x-mpegURL; codecs="avc1.42E01E"'
		};

		if(!video) video = document.createElement('video');

	  	return video.canPlayType(formats[type] || type);
	}
	
	load(url) {
  		// Load buffer asynchronously
  		const request = new XMLHttpRequest();
  		request.open("GET", url, true);
  		request.responseType = "arraybuffer";

  		const sfx = this;

  		request.onload = function() {
			// Asynchronously decode the audio file data in request.response
    		sfx.context.decodeAudioData(
      			request.response,
      			function(buffer) {
					if (!buffer) {
						console.error('error decoding file data: ' + sfx.url);
						return;
					}
					sfx.buffer = buffer;
					if (sfx.autoplay) sfx.play();
				},
				function(error) {
					console.error('decodeAudioData error', error);
				}
    		);
  		}

  		request.onerror = function() {
    		console.error('SFX Loader: XHR error');
  		}

  		request.send();
	}
	
	set loop(value){
		this._loop = value;
		if (this.source!=undefined) this.source.loop = value;
	}
	
	play(){
		if (this.source!=undefined) this.source.stop();
		this.source = this.context.createBufferSource();
		this.source.loop = this._loop;
	  	this.source.buffer = this.buffer;
	  	this.source.connect(this.gainNode);
		this.source.start(0);
	}
	
	set volume(value){
		this._volume = value;
		this.gainNode.gain.setTargetAtTime(value, this.context.currentTime + this.fadeDuration, 0);
	}
	
	stop(){
		this.source.stop();
	}
}