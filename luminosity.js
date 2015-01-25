navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || function(){};

var Luminosity = function(params){

    var that = this;
    var video = params.video;
    var videoSize = {
        width: video.width,
        height: video.height
    };
    var canvasVideoSource = document.createElement('canvas');
    var contextVideoSource = canvasVideoSource.getContext('2d');
    var canvasLightMap = document.createElement('canvas');
    var contextLightMap = canvasLightMap.getContext('2d');
    var LIGHTNESS_THRESHOLD = 180;
    var cellSize = params.cellSize;
    var handlers = [];

    canvasVideoSource.id = 'video-replica';
    canvasLightMap.id = 'light-map';
    document.body.appendChild(canvasVideoSource);
    document.body.appendChild(canvasLightMap);

    var capturePromise = new Promise(function(resolve, reject){
        navigator.getUserMedia({
                video: true
            }, function(stream){
                console.log('stream success');
                video.src = window.URL.createObjectURL(stream);
                setTimeout(resolve, 1000);
            }, function(err){
                console.log('stream error');
                reject();
            }
        );
    });

    canvasVideoSource.width = videoSize.width;
    canvasVideoSource.height = videoSize.height;

    canvasLightMap.width = videoSize.width;
    canvasLightMap.height = videoSize.height;

    // http://stackoverflow.com/questions/596216/formula-to-determine-brightness-of-rgb-color
    this.getRGBLightness = function(r, g, b){
        return Math.round((r * 2 + g * 3 + b) / 6);
    }

    // returns median value of array
    function getMedianValue(arr) {
        arr.sort(function(a, b){
            return a - b;
        });
        return arr[Math.floor(arr.length / 2)];
    };

    // returns luminosity of canvas pixel
    function getPixelLightness(data, dataWidth, x, y){
        var lightness = 0;
        var i = y * dataWidth * 4 + x * 4;
        return that.getRGBLightness(data[i], data[i + 1], data[i + 2]);
    };

    // returns luminosity of canvas rectangular area
    function getRectLightness(data, dataWidth, x, y, width, height){
        var lightness = [];
        var i = 0;
        var j;

        for (; i < height; i++) {
            for (j = 0; j < width; j++) {
                lightness.push(getPixelLightness(data, dataWidth, x + j, y + i));
            }
        }
        return getMedianValue(lightness);
    };

    // reading video source in a loop
    function updateLightMap(){
        var width = canvasVideoSource.width;
        var height = canvasVideoSource.height;
        var maxCellLightness = 0;
        var lightSourceCoords = [];
        var sourceData;
        var cellLightness;
        var rowC = 0;
        var cellC;
        var map = [];
        var mapRow;

        contextVideoSource.drawImage(video, 0, 0, videoSize.width, videoSize.height);
        sourceData = contextVideoSource.getImageData(0, 0, width, height);

        for (; rowC < height; rowC += cellSize[1]) {
            mapRow = [];
            for (cellC = 0; cellC < width; cellC += cellSize[0]) {
                cellLightness = getRectLightness(sourceData.data, width, cellC, rowC, cellSize[0], cellSize[1]);

                mapRow.unshift({ lightness: cellLightness });

                contextLightMap.fillStyle = 'rgb(' + [cellLightness, cellLightness, cellLightness].join() + ')';
                contextLightMap.fillRect(width - cellC, rowC, cellSize[0], cellSize[1]);
                if (cellLightness >= maxCellLightness) {
                    maxCellLightness = cellLightness;
                    lightSourceCoords = [(width - cellC + cellSize[0] / 2) / width, (rowC + cellSize[1] / 2) / height];
                }
            }
            map.push(mapRow);
        }

        handlers.forEach(function(handler){
            handler(
                map,
                maxCellLightness > LIGHTNESS_THRESHOLD ?
                    {
                        lightness: maxCellLightness,
                        coords: lightSourceCoords
                    } : undefined
            );
        });

        requestAnimationFrame(updateLightMap);
    };

    // public
    // run video capturing
    this.run = function(){
        capturePromise.then(updateLightMap);
        return that;
    };

    // public
    // add handler
    this.addHandler = function(func){
        if (typeof func === 'function') {
            handlers.push(func);
        }
        return that;
    }

};