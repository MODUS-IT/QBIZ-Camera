cordova.define("com.mbppower.camerapreview.CameraPreviewWindows10", function(require, exports, module) {
var cordova = require('cordova'), QBIZCamera = require('./CameraPreview');

module.exports = {
    startCamera: function ( ...noParam ) {
        function styleBody() {
            var body = document.getElementById('body');
            body.setAttribute('class', '');
            body.style.background = '#000';
        }

        function enterFullscreen() {
            var view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
            view.tryEnterFullScreenMode();
        }

        function enumerateCameras() {
            var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
            deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture).then(function (devices) {
                console.log(devices);
                settings.videoDeviceId = devices[0];
            }, function (err) {
                throw new Error('No devices available');
            });
        }

        function rotateCamera() {
            var props = mediaCapture.videoDeviceController.getMediaStreamProperties(Windows.Media.Capture.MediaStreamType.videoPreview);
            props.properties.insert(RotationKey, 90);
            mediaCapture.setEncodingPropertiesAsync(Windows.Media.Capture.MediaStreamType.videoPreview, props, null);
        }

        var mediaCapture = new Windows.Media.Capture.MediaCapture();
        var settings = new Windows.Media.Capture.MediaCaptureInitializationSettings();
        var RotationKey = "C380465D-2271-428C-9B83-ECEA3B4A85C1";

        styleBody();
        enterFullscreen();
        enumerateCameras();
        
        mediaCapture.initializeAsync().then(function () {
            var preview = document.getElementById("windowsPreview");
            preview.src = URL.createObjectURL(mediaCapture);
            preview.play();
            preview.addEventListener("playing", rotateCamera);
            QBIZCamera.mediaCapture = mediaCapture;
        });
    },
    stopCamera: function( callback, error, noParam ) {
        return callback(true);
    },
    takePicture: function (successCallback, errorCallback, maxImgResolution) {
        var Streams = Windows.Storage.Streams;
        var inputStream = new Streams.InMemoryRandomAccessStream();

        function reencodeAndSavePhotoAsync(inputStream, orientation) {
            var Imaging = Windows.Graphics.Imaging;
            var bitmapDecoder = null,
                bitmapEncoder = null,
                outputStream = null;
            var filename = null;
            console.log(orientation);
            return Imaging.BitmapDecoder.createAsync(inputStream)
            .then(function (decoder) {
                bitmapDecoder = decoder;
                var d = new Date();
                var dStr = "";
                    dStr += d.getFullYear();
                    dStr += d.getMonth();
                    dStr += d.getDate();
                    dStr += d.getHours();
                    dStr += d.getMinutes();
                    dStr += d.getSeconds();
                    //return Windows.Storage.ApplicationData.current.localFolder.createFileAsync("QBIZCamera" + dStr + ".jpg", Windows.Storage.CreationCollisionOption.generateUniqueName);
                    return Windows.Storage.KnownFolders.PicturesLibrary.createFileAsync("QBIZCamera" + dStr + ".jpg", Windows.Storage.CreationCollisionOption.generateUniqueName);
            }).then(function (file) {
                filename = file.name;
                return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
            }).then(function (outStream) {
                outputStream = outStream;
                return Imaging.BitmapEncoder.createForTranscodingAsync(outputStream, bitmapDecoder);
            }).then(function (encoder) {
                bitmapEncoder = encoder;
                var properties = new Imaging.BitmapPropertySet();
                properties.insert("System.Photo.Orientation", new Imaging.BitmapTypedValue(Windows.Storage.FileProperties.PhotoOrientation.Normal, Windows.Foundation.PropertyType.uint16));
                return bitmapEncoder.bitmapProperties.setPropertiesAsync(properties)
            }).then(function () {
                return bitmapEncoder.flushAsync();
            }).then(function () {
                console.log(inputStream);
                console.log(outputStream);
                inputStream.close();
                outputStream.close();
                window.onPictureTaken(["ms-appdata:///local/" + filename]);
            });
        }

        // Take the picture
        return window.mediaCapture.capturePhotoToStreamAsync(Windows.Media.MediaProperties.ImageEncodingProperties.createJpeg(), inputStream)
        .then(function () {
            console.log("Photo taken");
            return reencodeAndSavePhotoAsync(inputStream, 0);
        }, function (error) {
            console.log(error.message);
        }).done();
    },
    setOnPictureTakenHandler: function (onTaken) {
        window.onPictureTaken = onTaken;
    },
    show: function (...noParam) {
        var preview = document.getElementById('windowsPreview');
        preview.play();
    },
    hide: function (...noParam) {
        var preview = document.getElementById('windowsPreview');
        preview.pause();
    },
    switchCamera: function(...noParam) {

    },
    logCamera: function (callback, error, noParam) {
        //ToDo
        //Find used resolution
        //Find preview resolution
        return callback({
            resolution: { width: 320, height: 640 },
            previewResolution: { width: 1337, height: 16 }
        });
    },
    useTimer: function (...noParam) { },
    useMotionDetection: function (...noParam) { },
    motionDetectionStart: function (...noParam) { },
    motionDetectionStop: function(...noParam) {}
};

require("cordova/exec/proxy").add("CameraPreview", module.exports);
});
