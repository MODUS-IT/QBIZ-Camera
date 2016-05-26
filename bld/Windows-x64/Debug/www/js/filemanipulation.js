angular.module('cameraApp.FileManipulation', [])
    .service('FileManipulationService', ['$q', function($q) {
		/**
		 * Zwraca w resolve zawartość katalogu w tablicy.
		 * Jeśli nie znaleziono ściezki wywoła reject z błędem.
		 * @param {string} path - Ściezka do katalogu
		 * @returns {[]} - Zwraca tablicę z obiektami
		 */
		function listDirectory( path ) {
			var deferred = $q.defer();
			
			function rejectError(err) {
				deferred.reject(err);
			}
			
			var dirEntries = [];
			window.resolveLocalFileSystemURL(path, function(fileSystem) {
				var reader = fileSystem.createReader();
				reader.readEntries(function(entries) {
					for (var i = 0; i < entries.length; i++) {
						dirEntries.push(entries[i]);
					}
					deferred.resolve(dirEntries);
				},
				rejectError);
			}, rejectError);

			return deferred.promise;
		}

		/**
		 * Zwraca czy entry jest katalogiem
		 * @param {string} entrypoint
		 */
		function isDir(entrypoint) {
			if ( entrypoint.isDirectory ) return true;
			return;
		}
		/**
		 * Zwraca w resolve czy katalog jest pusty.
		 * Jeśli nie odnaleziono katalogu, reject.
		 * @param {string} entrypoint - Ścieżka do katalogu
		 */
		function isDirEmpty( entrypoint ) {
		    var deferred = $q.defer();
		    listDirectory(entrypoint).then(function (fileList) {
				if( fileList.length == 0) deferred.resolve(true);
				deferred.resolve(false);
			}, function( error ) {
				deferred.reject( error );
			});
			return deferred.promise;
		}
		/**
		 * ###Stwórz katalog z losową nazwą w głównym katalogu i umieść w nim plik konfiguracyjny projektu
		 * ####deferred
		 * dataURI - ścieżka do głównego katalogu
		 * 
		 * Zwraca ścieżkę do nowego katalogu w resolve
		 * 
		 * lub error w reject
		 * @param {string} dataURI
		 */
		function createDirectory( dataURI ) {
			var deferred = $q.defer();
			/**
			 * Zwraca losowy znak z tablicy
			 */
			function getRandomChar() {
				var possibleChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
				var pos = Math.round(Math.random() * possibleChars.length);
				return possibleChars.charAt(pos);
			}
			/**
			 * Zwraca losowego stringa o długości
			 * @param {number} length
			 */
			function getRandomString( length ) {
				var dirName = "";
				for (var i = 0; i <= length; i++) {
					dirName += getRandomChar();
				}
				return dirName;
			}
			
			var dirName = getRandomString(10);
			log(dirName, "new dir name");
			window.resolveLocalFileSystemURL(dataURI, function(rootFS) {
				log(rootFS, "main dir");
				rootFS.getDirectory(dirName, { create: true, exclusive: false }, onGetDirectorySuccess, onGetDirectoryFail);
				function onGetDirectorySuccess(result) {
					deferred.resolve( result.nativeURL );
				}
				
				function onGetDirectoryFail( fail ) {
					deferred.reject(fail);
					log(fail, 'fail');
				}
			});
			return deferred.promise;
		}
		/**
		 * ###Zapisuje plik as-is
		 * 
		 * ####deferred
		 * 
		 * dataURI - ściezka do katalogu
		 * 
		 * fileName - nazwa pliku
		 * 
		 * data - dane do zapisania
		 * 
		 * @param {string} dataURI
		 * @param {string} fileName
		 * @param {string} data
		 */
		function saveFile(dataURI, fileName, data) {
			var deferred = $q.defer();
			window.resolveLocalFileSystemURL(dataURI, function(dirEntry) {
				dirEntry.getFile(fileName, { create: true }, function(fileEntry) {
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function(result) {
							deferred.resolve(result);
						}
						fileWriter.onerror = function(err) {
							deferred.reject(err);
						}

						fileWriter.write(data);
					});
				});
			});
			return deferred.promise;
		}
		/**
		 * Odczytuje plik z lokalizacji za pomocą jednego z trzech trybów
		 * 
		 * getAs - text | binary | dataurl
		 * @param {string} getAs
		 * @param {string} fileName
		 * @param {string} dataURI
		 * TEXT, BINARY, DATAURL
		 */
		function getFile( dataURI, fileName, getAs ) {
			var deferred = $q.defer();
			window.resolveLocalFileSystemURL(dataURI + fileName, function(fileEntry) {
				//fileEntry.file returns File obj connected to selected file
				fileEntry.file(function(file) {
					log( file, "file" );
					var reader = new FileReader();
					reader.onloadend = function(e) {
						deferred.resolve(e.target.result);
					}
					switch( getAs.toUpperCase() ) {
						case "DATAURL": 
							reader.readAsDataURL( file );
							break;
						case "BINARY":
							reader.readAsBinaryString( file );
							break;
						default:
						case "TEXT":
							reader.readAsText( file );
							break;
					}
				});
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		}
		/** 
		 * Zapisuje konfigurację aplikacji
		 * 
		 * config - konfiguracja do zapisania
		 * @param {string} dataURI
		 * @param {Object} config
		 */
		function saveProjects( dataURI, config ) {
			var deferred = $q.defer();
			var data = angular.toJson( config );
			saveFile( dataURI, 'main.json', data ).then(success, fail);

			function success( resolve ) {
				log(resolve, "success");
				deferred.resolve( { saved: true } );
			}
			function fail( err ) {
				log(err, "error");
				deferred.reject( { saved: false } );
			}

			return deferred.promise;
		}
		/**
		 * Odczytuje konfigurację aplikacji (projekty)
		 * @param {string} dataURI
		 */
		function getProjects( dataURI ) {
			var deferred = $q.defer();
			getFile( dataURI, 'main.json', "text" ).then( parseJson, createAndRepeat );

			function parseJson( jsonText ) {
				var obj = angular.fromJson( jsonText );
				deferred.resolve( obj );
			}

			function throwError( err ) {
				deferred.reject( err );
				log(err, "error reading file");
			}

			function createAndRepeat( err ) {
				saveFile( dataURI, 'main.json', "[]" ).then( function( result ) {
					getFile( dataURI, 'main.json', "text" ).then( parseJson, throwError );
				}, throwError );
			}
			
			return deferred.promise;
		}
		/**
		 * Usuwa całą konfigurację i dane aplikacji
		 * @param {string} dataURI
		 */
		function purgeProjects(dataURI) {
		    return new Promise(function (resolve, reject) {
		        listDirectory(dataURI)
                .then(function (entries) {
		            for (var i = 0; i < entries.length; i++) {
		                if (!isDir(entries[i])) {
		                    entries[i].remove();
		                } else {
		                    entries[i].removeRecursively();
		                }
		            }
		            saveProjects(dataURI, [])
                    .then(function (scc) {
                        resolve({ success: true });
                    })
                    .catch(function () {
                        reject();
                    });
                })
		        .catch(function () {
		            reject();
		        });
		    });
		}
		/* --- NOWE FUNCKJE ---  */
		/**
		 * Dostępny z zewnątrz handler do createDirectory
		 * @param {string} dataURI
		 */
		this.createDirectory = function( dataURI ) {
			return createDirectory(dataURI);
		}
		/**
		 * 
		 */
		this.getFile = function( dataURI, fileName, getAs ) {
			return getFile( dataURI, fileName, getAs );
		}
		/**
		 * 
		 */
		this.saveProjects = function( dataURI, config ) {
			return saveProjects( dataURI, config );
		}
		/**
		 * 
		 */
		this.saveFile = function(dataURI, fileName, data) {
			saveFile(dataURI, fileName, data);
		}
		/**
		 * 
		 */
		this.getProjects = function( dataURI ) {
			return getProjects( dataURI );
		}
		/**
		 * 
		 */
		this.purgeProjects = function( dataURI ) {
			return purgeProjects( dataURI );
		}
	}]);