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
			var UID = localStorage.getUID();
			if( UID ) return UID;
			else return generateUID();
		}
		
		/**
		 * Wysyła żądanie do serwera o UID
		 */
		function generateUID() {
			function saveGeneratedUID( PHPCallback ) {
				if( Object.prototype.toString.call( PHPCallback ) == "[object Object]" ) {
					log(PHPCallback, "PHPCall");
					if( PHPCallback.data.created ) {
						localStorage.saveUID( PHPCallback.data.uid );
						return PHPCallback.data.uid;
					}
				}
			}
			
			var config = { generateUID: true }
			$http.post( uniqueIDserverURL, config ).then( saveGeneratedUID, log );
		}
		
		/* STEP 2 */
		
		/**
		 * Wrzuca na serwer informacje o serwerze FTP
		 * 
		 * Deferred
		 * @param {string} UID
		 * @param {Object} ftpConfig
		 */
		function uploadInitialData( UID, ftpConfig ) {
			var deferred = $q.defer();
			var mixedData = {
				uid: UID,
				ftpConfig: ftpConfig
			}
			$http.post( handshakeURL, mixedData ).then( checkCallback, log );
			
			function checkCallback( callback ) {
				if( callback.data.bool ) deferred.resolve( callback.data.bool );
				else deferred.reject( callback.data.bool );
				
			}
			return deferred.promise;
		}
		
		/**
		 * Wrzuca config projetków na serwer
		 */
		function uploadConfig( UID, config ) {
			var deferred = $q.defer();
			log(config, "conf");
			var mixedData = {
				uid: UID,
				config: config
			}
			$http.post( mainJSONURL, mixedData ).then( PHPCallback, AJAXError );

			function PHPCallback( callback ) {
				//ToDO
				log(callback, "call");
				deferred.resolve(callback);
			}

			function AJAXError( error ) {
				log(error, "error");
				deferred.reject(error);
			}
			return deferred.promise;
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
				log( response, "completed");
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
		function cleanUp( UID ) {
			var deferred = $q.defer();
			$http.post( cleanupURL, UID ).then( allOk, AJAXError );
			function allOk( callback ) {
				if( callback.data.ok ) {
					deferred.resolve( callback.data.ok );
				} 
				else {
					deferred.reject( callback.data.ok );    
				}
			}
			
			function AJAXError( err ) {
				deferred.reject( false );
			}
			return deferred.promise;
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