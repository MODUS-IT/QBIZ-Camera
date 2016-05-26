angular.module('cameraApp.PHPUpload', [])
    .service('PHPUploadService', ['$q', '$cordovaFileTransfer', 'FileManipulationService', '$http', 'localStorage', function($q, $cordovaFileTransfer, FileManipulationService, $http, localStorage) {
		this.beginTransaction = beginTransaction;
		this.uploadInitialData = uploadInitialData;
		this.uploadConfig = uploadConfig;
		this.uploadPhoto = uploadPhoto;
		this.cleanUp = cleanUp;
		this.uploadToHost = uploadToHost;
		
		/* STEP 1 */
		
		/**
		 * Sprawdza czy aplikacja posiada UID w local storage
		 * 
		 * Jeśli nie, wysyła zapytanie do serwera o wygenerowanie nowego UID
		 * 
		 * Zwraca UID
		 */
		function beginTransaction() {
		    return new Promise(function (resolve, reject) {
		        var UID = localStorage.getUID();
		        if (UID) {
		            resolve(UID);
		        }
		        else {
		            generateUID()
                    .then(function (PHPCallback) {
                        if (Object.prototype.toString.call(PHPCallback) == "[object Object]" && PHPCallback.data.created) {
                            localStorage.saveUID( PHPCallback.data.uid );
                            resolve(PHPCallback.data.uid);
                        }
                        else {
                            reject();
                        }
                    })
		            .catch(function () {
		                reject();
		            });
		        }
		    });
		}
		
		/**
		 * Wysyła żądanie do serwera o UID
		 */
		function generateUID() {
			return $http.post( uniqueIDserverURL, { generateUID: true } );
		}
		
		/* STEP 2 */
		
		/**
		 * Wrzuca na serwer informacje o serwerze FTP
		 * 
		 * Deferred
		 * @param {string} UID
		 * @param {Object} ftpConfig
		 */
		function uploadInitialData(UID, ftpConfig) {
		    return new Promise(function (resolve, reject) {
		        var mixedData = {
		            uid: UID,
		            ftpConfig: ftpConfig
		        }

		        $http.post(handshakeURL, mixedData)
                .then(function ( PHPcallback ) {
                    if (PHPcallback.data.bool) {
                        resolve();
                    }
                    else {
                        reject(PHPcallback.data);
                    }
                }, log);
		    });
		}
		
		/**
		 * Wrzuca config projetków na serwer
		 */
		function uploadConfig(UID, config) {
		    return new Promise(function (resolve, reject) {
		        var mixedData = {
		            uid: UID,
		            config: config
		        };
		        $http.post(mainJSONURL, mixedData)
                .then(function (isOk) {
                    if (isOk.data.bool) {
                        resolve();
                    }
                    else reject();
                });
		    });
		}
		
		/* STEP 3 */
		
		/**
		 * 
		 */
		function uploadPhoto( UID, photoURL ) {
			var deferred = $q.defer();
			var fileName = photoURL.split( "/" );
			var uploadConfig = {
				fileKey: "photo",
				fileName: fileName[fileName.length - 1],
				chunkedMode: false,
				params: { uid: UID }
			}
			
			$cordovaFileTransfer.upload( serverURL, photoURL, uploadConfig ).then( uploadCompleted, uploadError );
			function uploadCompleted( response ) {
				deferred.resolve("ok");
			}
			
			function uploadError( error ) {
				log(error, "err");
				deferred.reject("err");
			}
			
			return deferred.promise;
		}
		
		/* STEP 4 */
		
		/**
		 * Wysyła zapytanie do serwera o uporzadkowanie struktury plików dla UID
		 */
		function cleanUp(UID) {
		    return new Promise(function (resolve, reject) {
		        $http.post(cleanupURL, UID)
                .then(function (isOk) {
                    if (isOk.data.ok) {
                        resolve();
                    }
                    else {
                        reject();
                    }
                })
                .catch(function () {
                    reject();
                });
		    })
		}
		
		
		/* STEP 5 */
		
		/**
		 * Wysyła zapytanie do serwera o upload plików na serwer FTP klienta
		 */
		function uploadToHost( UID ) {
			var deferred = $q.defer();
			$http.post( requestFTPURL, UID ).then( allOk, AJAXError );
			function allOk( callback ) {
				log( callback, "cback" );
				if( callback.data.ok ) {
					deferred.resolve( callback.data.ok );
				} 
				else {
					deferred.reject( callback.data.ok );    
				}
			}
			
			function AJAXError( err ) {
				log(err, "err");
				deferred.reject( false );
			}
			return deferred.promise;
		}
		
		var host = 'http://modus360.qbiz.pl/';
		var cleanupURL = host + 'cleanup.php';
		var uniqueIDserverURL = host + 'generateuid.php';
		var mainJSONURL = host + 'jsonupload.php';
		var serverURL = host + 'upload.php';
		var handshakeURL = host + 'handshake.php';
		var requestFTPURL = host + 'requestftp.php';
	}]);