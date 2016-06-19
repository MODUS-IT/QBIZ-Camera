cordova.define("com.mbppower.camerapreview.CameraPreviewWindows10", function(require, exports, module) {
cordova.define("com.mbppower.camerapreview.CameraPreviewWindows10", function (require, exports, module) {
    var cordova = require('cordova'), QBIZCamera = require('./CameraPreview');

    module.exports = {
        startCamera: function (...noParam) {
            function styleBody() {
                return new Promise(function (resolve, reject) {
                    var body = document.body;
                    body.setAttribute('class', '');
                    body.style.background = '#000';

                    var video = document.createElement("video");
                    video.setAttribute("id", "windowsPreview");
                    video.style.width = "100%";
                    video.style.height = "100%";
                    video.style.display = "block";
                    video.style.position = "fixed";
                    video.style.top = "0";
                    video.style.bottom = "0";
                    video.style.left = "0";
                    video.style.right = "0";
                    body.insertBefore(video, body.firstChild);
                    if (!document.getElementById('windowsPreview')) reject();
                    resolve();
                });
            }

            function enterFullscreen() {
                return new Promise(function (resolve, reject) {
                    var view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
                    view.tryEnterFullScreenMode();
                    resolve();
                });
            }

            function enumerateCameras() {
                return new Promise(function (resolve, reject) {
                    var deviceInfo = Windows.Devices.Enumeration.DeviceInformation;
                    deviceInfo.findAllAsync(Windows.Devices.Enumeration.DeviceClass.videoCapture)
                    .then(function (devices) {
                        settings.videoDeviceId = devices[0]; //Use first device
                        resolve();
                    }, function (err) {
                        throw new Error('No devices available');
                    });
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

            styleBody()
            .then(function () {
                return enterFullscreen();
            })
            .then(function () {
                return enumerateCameras();
            })
           .then(function () {
               return mediaCapture.initializeAsync();
           })
           .then(function () {
               var preview = document.getElementById("windowsPreview");
               preview.src = URL.createObjectURL(mediaCapture);
               preview.play();
               preview.addEventListener("playing", rotateCamera);
               QBIZCamera.mediaCapture = mediaCapture;
           });
        },
        stopCamera: function (callback, error, noParam) {
            QBIZCamera.mediaCapture.close();
            return callback(true);
        },
        takePicture: function (successCallback, errorCallback, ...noParam) {
            var Imaging = Windows.Graphics.Imaging;
            var format = Windows.Media.MediaProperties.ImageEncodingProperties.createJpeg(),
                imageStream = new Windows.Storage.Streams.InMemoryRandomAccessStream(),
                thumbnailStream = new Windows.Storage.Streams.InMemoryRandomAccessStream(),
            //folder = Windows.Storage.ApplicationData.current.localFolder,
                folder = Windows.Storage.KnownFolders.picturesLibrary;
            bitmapDecoder = null,
            bitmapEncoder = null,
            fileName = null,
            outputStream = null;

            function getCurrentDateTime() {
                var d = new Date();
                var datetime = "" + d.getFullYear() + d.getMonth() + d.getDate() + d.getHours() + d.getMinutes() + d.getSeconds();
                return datetime;
            }

            // Capture to stream
            return QBIZCamera.mediaCapture.capturePhotoToStreamAsync(format, imageStream)
            .then(function () {
                return Imaging.BitmapDecoder.createAsync(imageStream);
            })
            .then(function (decoder) {
                bitmapDecoder = decoder;
                return Imaging.BitmapEncoder.createForTranscodingAsync(imageStream, bitmapDecoder);
            })
            .then(function (encoder) {
                bitmapEncoder = encoder;
                bitmapEncoder.bitmapTransform.rotation = Imaging.BitmapRotation.clockwise90Degrees;
                return bitmapEncoder.flushAsync();
            })
            .then(function () {
                fileName = "QBIZCamera" + getCurrentDateTime() + ".jpg";
                return folder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.generateUniqueName);
            })
            .then(function (file) {
                fileName = file.name;
                return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
            })
            .then(function (outStream) {
                outputStream = outStream;
                return Windows.Storage.Streams.RandomAccessStream.copyAsync(imageStream, outputStream);
            })
            .then(function () {
                outputStream.close();
                imageStream.close();
                return folder.getFileAsync(fileName);
                //window.onPictureTaken(["ms-appdata:///local/" + fileName]);
            })
            .then(function (image) {
                console.warn("got file");
                return image.openAsync(Windows.Storage.FileAccessMode.readWrite);
            })
            .then(function (imageBlob) {
                console.warn("got blob");
                return Windows.Storage.Streams.RandomAccessStream.copyAsync(imageBlob, thumbnailStream);
            })
            .then(function () {
                console.warn("created");
                return Imaging.BitmapDecoder.createAsync(thumbnailStream);
            })
            .then(function (decoder) {
                console.warn("got decoder");
                bitmapDecoder = null;
                bitmapDecoder = decoder;
                return Imaging.BitmapEncoder.createForTranscodingAsync(thumbnailStream, bitmapDecoder);
            })
            .then(function (encoder) {
                console.warn("got encoder");
                bitmapEncoder = encoder;
                bitmapEncoder.bitmapTransform.scaledWidth = 240;
                bitmapEncoder.bitmapTransform.scaledHeight = 320;
                bitmapEncoder.bitmapTransform.bounds = {
                    height: 320,
                    width: 240,
                    x: 1,
                    y: 1
                }
                return bitmapEncoder.flushAsync();
            })
            .then(function () {
                return folder.createFileAsync(fileName, Windows.Storage.CreationCollisionOption.generateUniqueName);
            })
            .then(function (file) {
                return file.openAsync(Windows.Storage.FileAccessMode.readWrite);
            })
            .then(function (outStream) {
                outputStream = outStream;
                return Windows.Storage.Streams.RandomAccessStream.copyAsync(thumbnailStream, outputStream);
            })
            .then(function () {
                thumbnailStream.close();
                outputStream.close();
                window.onPictureTaken(["ms-appdata:///local/" + fileName]);
            })
            .done();
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
        switchCamera: function (...noParam) {

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
        motionDetectionStop: function (...noParam) { }
    };

    require("cordova/exec/proxy").add("CameraPreview", module.exports);
});

});
