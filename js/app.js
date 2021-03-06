var SoundCloudAudioSource = function(player) {
    var self = this

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)

    var analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.connect(audioCtx.destination)

    var source = audioCtx.createMediaElementSource(player)
    source.connect(analyser)

    //

    this.raw = new Uint8Array(analyser.frequencyBinCount)

    this.frequency = []

    this.volume = {
        all: 0,
        highs: 0,
        mids: 0,
        lows: 0
    }

    //

    this.playStream = function(streamUrl) {
        player.addEventListener('ended', function(){
            self.directStream('coasting')
        });
        player.setAttribute('src', streamUrl)
        player.play()
    }

    var sampleAudioStream = function() {

        // get raw data
        analyser.getByteFrequencyData(self.raw)

        // frequency
        self.frequency = []
        for(var i=0; i<self.raw.length; i++) {
            self.frequency.push(self.raw[i]/255)
        }

        // volume.all
        var total = 0
        for (var i = 0; i < self.frequency.length; i++) {
            total += self.frequency[i]
        }
        self.volume.all = total/self.frequency.length

        // volume.highs
        var highs = 0
        for(var i=0; i < 42; i++) {
            highs += self.frequency[i]
        }
        self.volume.highs = (highs/42)

        // volume.mids
        var mids = 0
        for(var i=42; i < 84; i++) {
            mids += self.frequency[i] || 0
        }
        self.volume.mids = (mids/42)

        // volume.lows
        var lows = 0
        for(var i=63; i < 128; i++) {
            lows += self.frequency[i] || 0
        }
        self.volume.lows = (lows/42)

        console.log(self.raw.length)

    }
    setInterval(sampleAudioStream, 20)
}

var Visualizer = function() {

    this.init = function(options) {
        var audioSource = options.audioSource

        var field = Field(document.getElementById(options.containerId))
        var centerX = field.getWidth()/2
        var centerY = field.getHeight()/2

        function parseAudioFrame() {
            volume = ((audioSource.volume.mids+audioSource.volume.highs)/2)*1000
            field.click(centerX, centerY, volume, volume*0.90)
        }

        function loop() {
            parseAudioFrame()
            requestAnimationFrame(loop)
        }
        loop()
    }
}

var SoundcloudLoader = function(player,uiUpdater) {
    var self = this
    var client_id = "d38d8b7d0b835ceda81b91cb3482b16a"
    this.sound = {};
    this.streamUrl = ""
    this.errorMessage = ""
    this.player = player
    this.uiUpdater = uiUpdater

    /**
     * Loads the JSON stream data object from the URL of the track (as given in the location bar of the browser when browsing Soundcloud),
     * and on success it calls the callback passed to it (for example, used to then send the stream_url to the audiosource object).
     * @param track_url
     * @param callback
     */
    this.loadStream = function(track_url, successCallback, errorCallback) {
        SC.initialize({
            client_id: client_id
        });
        SC.get('/resolve', { url: track_url }, function(sound) {
            if (sound.errors) {
                self.errorMessage = "";
                for (var i = 0; i < sound.errors.length; i++) {
                    self.errorMessage += sound.errors[i].error_message + '<br>';
                }
                self.errorMessage += 'Make sure the URL has the correct format: https://soundcloud.com/user/title-of-the-track';
                errorCallback();
            } else {

                if(sound.kind=='playlist'){
                    self.sound = sound;
                    self.streamPlaylistIndex = 0;
                    self.streamUrl = function(){
                        return sound.tracks[self.streamPlaylistIndex].stream_url + '?client_id=' + client_id;
                    }
                    successCallback();
                }else{
                    self.sound = sound;
                    self.streamUrl = function(){ return sound.stream_url + '?client_id=' + client_id; };
                    successCallback();
                }
            }
        })
    }

    this.directStream = function(direction){
        if(direction=='toggle'){
            if (this.player.paused) {
                this.player.play()
            } else {
                this.player.pause()
            }
        }
        else if(this.sound.kind=="playlist"){
            if(direction=='coasting') {
                this.streamPlaylistIndex++;
            }else if(direction=='forward') {
                if(this.streamPlaylistIndex>=this.sound.track_count-1) this.streamPlaylistIndex = 0;
                else this.streamPlaylistIndex++;
            }else{
                if(this.streamPlaylistIndex<=0) this.streamPlaylistIndex = this.sound.track_count-1;
                else this.streamPlaylistIndex--;
            }
            if(this.streamPlaylistIndex>=0 && this.streamPlaylistIndex<=this.sound.track_count-1) {
               this.player.setAttribute('src',this.streamUrl());
               this.uiUpdater.update(this);
               this.player.play();
            }
        }
    }
};

/**
 * Class to update the UI when a new sound is loaded
 * @constructor
 */
var UiUpdater = function() {

    var controlPanel = document.getElementById('controlPanel')
    var trackInfoPanel = document.getElementById('trackInfoPanel')
    var infoImage = document.getElementById('infoImage')
    var infoArtist = document.getElementById('infoArtist')
    var infoTrack = document.getElementById('infoTrack')
    var messageBox = document.getElementById('messageBox')

    this.clearInfoPanel = function() {

        infoArtist.innerHTML = ''
        infoTrack.innerHTML = ''
        trackInfoPanel.className = 'hidden'
    }

    this.update = function(loader) {

        var artistLink = document.createElement('a')
        artistLink.setAttribute('href', loader.sound.user.permalink_url)
        artistLink.innerHTML = loader.sound.user.username

        var trackLink = document.createElement('a')
        trackLink.setAttribute('href', loader.sound.permalink_url)

        if(loader.sound.kind=="playlist"){
            trackLink.innerHTML = "<p>" + loader.sound.tracks[loader.streamPlaylistIndex].title + "</p>" + "<p>"+loader.sound.title+"</p>"
        }else{
            trackLink.innerHTML = loader.sound.title
        }

        // if no track artwork exists, use the user's avatar.
        var image = loader.sound.artwork_url ? loader.sound.artwork_url : loader.sound.user.avatar_url 
        infoImage.setAttribute('src', image)

        infoArtist.innerHTML = ''
        infoArtist.appendChild(artistLink)

        infoTrack.innerHTML = ''
        infoTrack.appendChild(trackLink)

        // toggle class from 'hidden'
        trackInfoPanel.className = ''

        // add a hash to the URL so it can be shared or saved
        var trackToken = loader.sound.permalink_url.substr(22)
        window.location = '#' + trackToken;
    };
    this.toggleControlPanel = function() {
        if (controlPanel.className.indexOf('hidden') === 0) {
            controlPanel.className = '';
        } else {
            controlPanel.className = 'hidden';
        }
    };
    this.displayMessage = function(title, message) {
        messageBox.innerHTML = ''; // reset the contents

        var titleElement = document.createElement('h3');
        titleElement.innerHTML = title;

        var messageElement = document.createElement('p');
        messageElement.innerHTML = message;

        var closeButton = document.createElement('a');
        closeButton.setAttribute('href', '#');
        closeButton.innerHTML = 'close';
        closeButton.addEventListener('click', function(e) {
            e.preventDefault();
            messageBox.className = 'hidden';
        });

        messageBox.className = '';
        // stick them into the container div
        messageBox.appendChild(titleElement);
        messageBox.appendChild(messageElement);
        messageBox.appendChild(closeButton);
    }
}

window.onload = function init() {

    var player =  document.getElementById('player');

    var visualizer = new Visualizer();
    var uiUpdater = new UiUpdater();
    var loader = new SoundcloudLoader(player,uiUpdater);

    var audioSource = new SoundCloudAudioSource(player);
    var form = document.getElementById('form');
    var loadAndUpdate = function(trackUrl) {
        loader.loadStream(trackUrl,
            function() {
                uiUpdater.clearInfoPanel();
                audioSource.playStream(loader.streamUrl());
                uiUpdater.update(loader);
                setTimeout(uiUpdater.toggleControlPanel, 500); // auto-hide the control panel
            },
            function() {
                uiUpdater.displayMessage("Error", loader.errorMessage);
            })
    }

    visualizer.init({
        containerId: 'visualizer',
        audioSource: audioSource
    });


    uiUpdater.toggleControlPanel();
    // on load, check to see if there is a track token in the URL, and if so, load that automatically
    if (window.location.hash) {
        var trackUrl = 'https://soundcloud.com/' + window.location.hash.substr(1);
        loadAndUpdate(trackUrl);
    }

    // handle the form submit event to load the new URL
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var trackUrl = document.getElementById('input').value;
        loadAndUpdate(trackUrl);
    })
    var toggleButton = document.getElementById('toggleButton')
    toggleButton.addEventListener('click', function(e) {
        e.preventDefault();
        uiUpdater.toggleControlPanel();
    })
    var aboutButton = document.getElementById('credit');
    aboutButton.addEventListener('click', function(e) {
        e.preventDefault();
        var message = document.getElementById('info').innerHTML;
        uiUpdater.displayMessage("About", message);
    })

    window.addEventListener("keydown", keyControls, false);
     
    function keyControls(e) {
        switch(e.keyCode) {
            case 32:
                // spacebar pressed
                loader.directStream('toggle');
                break;
            case 37:
                // left key pressed
                loader.directStream('backward');
                break;
            case 39:
                // right key pressed
                loader.directStream('forward');
                break;
        }   
    }
};