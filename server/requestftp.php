<?php

    class Project {
        public $dir;
        private $uid;
        private $config;
        private $ftp;
        private $remoteDir;
        public function __construct( $dir, $uid ) {
            $this -> dir = $dir;
            $this -> uid = $uid;
            $this -> readConfig();
        }
        
        private function readConfig() {
            if( $config = file_get_contents( $this -> uid."/".$this -> dir."/config.json" ) ) {
                $this -> config = json_decode( $config, true );
            }
            else {
                echo "Dahm";
            }
        }
        
        public function UploadFiles( $ftp, $dir ) {
            var_dump("UPLOAD FILES");
            $this -> ftp = $ftp;
            $this -> remoteDir = $dir."/".$this -> uid."/".$this -> dir;
            if( ftp_mkdir( $ftp, $this -> remoteDir ) ) {
                var_dump("BEFORE FOREACH");
                $this -> uploadPhotos();
                $this -> uploadThreesixty();
            }
            else {
                var_dump("DIR NOT CREATED");
            }
        }
        
        private function uploadThreesixty() {
            var_dump("THREESIXTY NO SCOPE");
            $lastErr = "";
            $currentDir = $this -> uid."/".$this -> dir;
            var_dump($currentDir);
            var_dump($this -> remoteDir);
            if(!ftp_put( $this -> ftp, $this -> remoteDir."/index.html", $currentDir."/index.html", FTP_BINARY )) {
                $lastErr .= "index";
            }
            if(!ftp_put( $this -> ftp, $this -> remoteDir."/threesixty.css", $currentDir."/threesixty.css", FTP_BINARY )) {
                $lastErr .= "css";
            }
            if(!ftp_put( $this -> ftp, $this -> remoteDir."/threesixty.min.js", $currentDir."/threesixty.min.js", FTP_BINARY )) {
                $lastErr .= "js";
            }
            if(!ftp_put( $this -> ftp, $this -> remoteDir."/custom.js", $currentDir."/custom.js", FTP_BINARY )) {
                $lastErr .= "custom";
            }
            if(ftp_mkdir($this -> ftp, $this -> remoteDir."/assets/")) {
                if(!ftp_put( $this -> ftp, $this -> remoteDir."/assets/sprites.png", $currentDir."/assets/sprites.png", FTP_BINARY )) {
                    $lastErr .= "sprites";
                }
            }
            else {
                $lastErr = "assets";
            }
            var_dump($lastErr);
        }
        
        private function uploadPhotos() {
            foreach ( $this -> config["images"] as $fName ) {
                $_currentFile = $this -> uid."/".$this -> dir."/".$fName;
                $_remoteFile = $this -> remoteDir."/".$fName;

                $img = imagecreatefromjpeg( $_currentFile );
                $imgSize = getimagesize( $_currentFile );
                $hToWRatio = $imgSize[1]/$imgSize[0];
                var_dump( $hToWRatio );
                $scaledImg = imagecreatetruecolor( 720, 720*$hToWRatio );
                imagecopyresampled( $scaledImg, $img, 0, 0, 0, 0, 720, 720*$hToWRatio, $imgSize[0], $imgSize[1] );
                if( !imagejpeg( $scaledImg, $_currentFile, 100 ) ) {
                    echo "dahm not working";
                }
                var_dump( getimagesize( $_currentFile ) );
                
                if(ftp_put( $this -> ftp, $_remoteFile, $_currentFile, FTP_BINARY )) {
                    var_dump( "uploaded" );
                } else {
                    var_dump( "nie pykło" );
                }
            }
        }
        
    }
    
    class Projects {
        private $config;
        private $projs = [];
        private $ftp;
        private $uid;
        public function __construct( $uid ) {
            $this -> uid = $uid;
            
            if( $this -> connectFtp() ) {
                $this -> getConfig( $uid );
                if( $this -> createDir( "qbiz" ) ) {
                    echo "created qbiz";
                } else {
                    echo "qbiz is on srv";
                }
                
                foreach( $this -> projs as $project ) {
                    $this -> createDir( "qbiz/".$this -> uid );
                    $project -> UploadFiles( $this -> ftp, "qbiz" );
                }
                
                //stwórz katalog QBIZ na serwerze
                //w katalogu qbiz stwórz katalogi projektów
                //do projektów wrzuć pliki z katalogu
                
                $this -> deleteDir( $uid );
                
            }
            else {
                echo "No kurde FU!";
            }
            
        }
        
        private function connectFtp() {
            if( $ftpConfig = file_get_contents( $this -> uid ."/ftp.json" ) ) {
                $ftpConfig = base64_decode( $ftpConfig );
                $ftpConfig = json_decode( $ftpConfig, true );
                
                $this -> ftp = ftp_connect( $ftpConfig[ "server" ] );
                if( $this -> ftp ) {
                    if( ftp_login( $this -> ftp , $ftpConfig["user"], $ftpConfig["password"] ) ) {
                        return true;
                    }
                    else {
                        //TODO
                        return false;
                    }
                } else {
                    return false;
                }
            }
            else {
                //TODO
                return false;
            }
        }
        
        private function getConfig( $uid ) {
            $configStr = file_get_contents( $uid."/folders.json" );
            $this -> config = json_decode( $configStr, true );
            foreach ($this -> config as $dir) {
                $projectInstance = new Project( $dir, $uid );
                array_push( $this -> projs, $projectInstance );
            }
        }
        
        
        private function createDir( $dir ) {
            if( @ftp_mkdir( $this -> ftp, $dir ) ) {
                return true;
            }
            return false;
        }
        
        private function deleteDir( $dir ) {
            $it = new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS);
            $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
            foreach($files as $file) {
                if ($file->isDir()){
                    rmdir($file->getRealPath());
                } else {
                    unlink($file->getRealPath());
                }
            }
            rmdir($dir);
        }
        
    }

	$postdata = file_get_contents("php://input");
    echo $postdata;
    new Projects( $postdata );
    
     /*
    $token = $request -> srvToken;
    $configENC = file_get_contents( $token . "/config.json" );
    
    $config = base64_decode( $configENC );
    $config = json_decode( $config );
    
    $response = [];
    $response['uploadCompleted'] = true;
    $response['uploadErr'] = [];
    
    function rejectFTP( $reason ) {
        $response['uploadCompleted'] = false;
        array_push($response['uploadErr'], $reason ); 
    }
    
    function deleteDir( $dir ) {
        $it = new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS);
        $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
        foreach($files as $file) {
            if ($file->isDir()){
                rmdir($file->getRealPath());
            } else {
                unlink($file->getRealPath());
            }
        }
        rmdir($dir);
    }
    
    function getFilesToUpload( $token ) {
        if(!file_exists( $token ."/files.json" ) ) {
            return false;
        }
        
        if( $filesToUpload = file_get_contents( $token ."/files.json" ) ) {
            $filesToUpload = json_decode( $filesToUpload );    
            ob_start();
            var_dump($filesToUpload);
            file_put_contents ('ftp.txt', ob_get_clean());        
            return $filesToUpload;
        } else return false;
    }
    
    $connection_id = ftp_connect( $config -> server ) or die( "Brak połączenia z hostem" ); 
    if ( ftp_login($connection_id, $config -> user, $config -> password) ) {
        if($filesToUpload = getFilesToUpload( $token )) {
            $zip = new ZipArchive();
            if($zip -> open( $token.'/zip.zip', ZIPARCHIVE::CREATE ) ) {
                foreach ($filesToUpload as $file) {
                    $zip -> addFile( $token."/".$file );
                }
                $zip -> close();
                
                if(!ftp_put( $connection_id, $token.".zip", $token."/zip.zip", FTP_BINARY )) {
                    rejectFTP( "Bład podczas wysyłania plików" );
                } else {
                    deleteDir( $token );
                }
            } else {
                rejectFTP( "Błąd podczas kompresowania plików" );
            }
        } else rejectFTP( "Brak plików do uploadu" );
    } else rejectFTP( "Zły użytkownik i/lub hasło" ); 
    
    echo json_encode($response);
    */
?>