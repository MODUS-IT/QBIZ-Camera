cordova.define("com.mbppower.camerapreview.CameraPreviewWin10", function(require, exports, module) {
/*
    CameraPreview.js
    Created by Grzegorz Mrózek
    QBIZCamera - 2016

    noParam => useless junk needed by cordova
*/

"use strict";

var cordova = require('cordova'), QBIZCamera = require('./CameraPreview');

var exports = {
    startCamera: function (...noParam) {
        function styleBody() {
            return new Promise(function (resolve, reject) {
                let body = document.body;
                body.setAttribute('class', '');
                body.style.background = '#000';

                let video = document.createElement("video");
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
                if (!document.getElementById('windowsPreview')) {
                    return reject();
                }

                return resolve();
            });
        }

        function enterFullscreen() {
            return new Promise(function (resolve, reject) {
                let view = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
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
                    reject(err);
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
        if (QBIZCamera.mediaCapture) {
            QBIZCamera.mediaCapture.close();
            return callback(true);
        }
        return callback(false);
    },
    takePicture: function (...noParam) {
        var Imaging = Windows.Graphics.Imaging;
        var format = Windows.Media.MediaProperties.ImageEncodingProperties.createJpeg(),
            imageStream = new Windows.Storage.Streams.InMemoryRandomAccessStream(),
            thumbnailStream = new Windows.Storage.Streams.InMemoryRandomAccessStream(),
            folder = Windows.Storage.ApplicationData.current.localFolder,
            //folder = Windows.Storage.KnownFolders.picturesLibrary;
            bitmapDecoder = null,
            bitmapEncoder = null,
            fileName = null,
            outputStream = null;

        /**
        * Used for timestamping photo name
        */
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
        })
        .then(function (image) {
            return image.openAsync(Windows.Storage.FileAccessMode.readWrite);
        })
        .then(function (imageBlob) {
            return Windows.Storage.Streams.RandomAccessStream.copyAsync(imageBlob, thumbnailStream);
        })
        .then(function () {
            return Imaging.BitmapDecoder.createAsync(thumbnailStream);
        })
        .then(function (decoder) {
            bitmapDecoder = decoder;
            return Imaging.BitmapEncoder.createForTranscodingAsync(thumbnailStream, bitmapDecoder);
        })
        .then(function (encoder) {
            bitmapEncoder = encoder;
            bitmapEncoder.bitmapTransform.scaledWidth = screen.width + 1;
            bitmapEncoder.bitmapTransform.scaledHeight = screen.height + 1;
            bitmapEncoder.bitmapTransform.bounds = {
                height: screen.height,
                width: screen.width,
                x: 1,
                y: 1
            };
            return bitmapEncoder.flushAsync();
        })
        .then(function () {
            return folder.createFileAsync(fileName + ".thumb", Windows.Storage.CreationCollisionOption.replaceExisting);
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
            QBIZCamera.onPictureTaken( ["ms-appdata:///local/" + fileName] );
        })
    },
    setOnPictureTakenHandler: function (onTaken) {
        QBIZCamera.onPictureTaken = onTaken;
    },
    setOnMotionUpdate: function(onMotionUpdate) {
        QBIZCamera.onMotionUpdate = onMotionUpdate;
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
        //Here goes nothing!
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
    useTimer: function (...noParam) {
        logger.add("Using Timer");
    },
    useMotionDetection: function (...noParam) {
        logger.add("Using Motion Detection");
        QBIZCamera.motionDetection = new MotionDetection();
    },
    motionDetectionStart: function (...noParam) {
        QBIZCamera.motionDetectionLoop = setInterval(function () {
            var motionDetected = QBIZCamera.motionDetection.detect();
            if (!motionDetected) {
                QBIZCamera.motionDetection.detected++;
                QBIZCamera.onMotionUpdate("Hello");
            }
            else {
                QBIZCamera.motionDetection.detected = 0;
                QBIZCamera.onMotionUpdate("SeeYa");
            }
            if (QBIZCamera.motionDetection.detected >= 3) {
                QBIZCamera.onMotionUpdate("NicePicYouHaveHere");
                QBIZCamera.motionDetection.detected = 0;
                QBIZCamera.takePicture();
            }
        }, 1000);
    },
    motionDetectionStop: function (...noParam) {
        clearInterval(QBIZCamera.motionDetectionLoop);
    }
};

/**
  Class used for comparing windowsPreview on QBIZCamera
 */
class MotionDetection {
    //Can take parameters, doesn't need any to work.
    /**
     * @param {number} colorThreshold Percentage threshold of color difference.
     * @param {number} pixelThreshold Percentage threshold of different pixels on canvas.
     */
    constructor(colorThreshold, pixelThreshold) {
        console.log("MD:I: Creating MotionDetection");
        this.videoElement = document.getElementById("windowsPreview");

        this.colorThreshold = colorThreshold || 7;
        this.pixelThreshold = pixelThreshold || 10;

        this.frameWidth = window.innerWidth;
        this.frameHeight = window.innerHeight;
        this.previousFrame = undefined;

        this.stillFrames = 0;
    }

    /**
     * Wrapper for all functions
     * returns motionDetected
     */
    detect() {
        let currentFrame = this.getCurrentFrame();
        if (!this.previousFrame) {
            this.previousFrame = currentFrame;
            return false;
        }
        let motionDetected = this.isDifferent(currentFrame);
        this.previousFrame = currentFrame;

        return motionDetected;
    }

    /**
     * Returns current video frame from windowsPreview
     */
    getCurrentFrame() {
        console.log("MD:I: Getting current video frame");
        if (!this.videoElement) {
            console.error("MD:E: Video element not found. Aborting.");
            return;
        }

        let frame = document.createElement("canvas");
        frame.width = this.frameWidth;
        frame.height = this.frameHeight;
        frame.getContext("2d").drawImage(this.videoElement, 0, 0, this.frameWidth, this.frameHeight);

        return frame;
    }

    /**
     * Here goes canvas comparison
     */
    isDifferent(currentFrame) {
        var CHANNELS = 4;
        var pixelCount = this.frameWidth * this.frameHeight;

        if (this.previousFrame.width != currentFrame.width || this.previousFrame.height != currentFrame.height) {
            return true;
        }
        
        var currentFrameData = currentFrame.getContext("2d").getImageData(0, 0, currentFrame.width, currentFrame.height).data;
        var previousFrameData = this.previousFrame.getContext("2d").getImageData(0, 0, this.previousFrame.width, this.previousFrame.height).data;

        if (currentFrameData.length != previousFrameData.length) {
            return true;
        }

        var differentPixels = 0;
        var length = pixelCount * CHANNELS;
        for (var i = 0; i < length; i += 4) {
            let R = i;
            let G = i + 1;
            let B = i + 2;

            var or = currentFrameData[R];
            var og = currentFrameData[G];
            var ob = currentFrameData[B];

            var pr = previousFrameData[R];
            var pg = previousFrameData[G];
            var pb = previousFrameData[B];

            var colorTh = Math.round(this.colorThreshold * 255 / 100);
            if (Math.abs(or - pr) > colorTh || Math.abs(og - pg) > colorTh || Math.abs(ob - pb) > colorTh) {
                differentPixels++;
            }
        }

        console.log("MD:I: No of diff pixels:" + differentPixels);
        console.log("MD:I: " + differentPixels / pixelCount * 100 + "% different");

        if (differentPixels == 0 || (differentPixels / pixelCount * 100) < this.pixelThreshold) {
            return false;
        }

        return true;
    }
}

require("cordova/exec/proxy").add("CameraPreview", exports);
});
