<?php

    class Project {
        private $dir;
        private $uid;
        private $config;
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
                
            }
        }
        
        private function UploadFiles( $ftp, $dir ) {
            if(ftp_mkdir( $ftp, $dir."/".$this -> uid ) ) {
                foreach ( $this -> config["images"] as $fName ) {
                    ftp_put( $ftp, $this -> dir."/".$this -> uid."/".$fName, $dir."/".$this -> uid."/".$fName );
                }
            }
            else echo "fuck";
        }
        
    }
    
    class Projects {
        private $config;
        private $projects = [];
        private $ftp;
        private $uid;
        public function __construct( $uid ) {
            $this -> uid = $uid;
            var_dump($uid);
            if( $this -> connectFtp() ) {
                $this -> getConfig( $uid );
                if( $this -> createDir( "qbiz" ) ) {
                    foreach( $projects as $project ) {
                        $project -> UploadFiles( $this -> ftp, "qbiz" );
                    }
                }
                //stwórz katalog QBIZ na serwerze
                //w katalogu qbiz stwórz katalogi projektów
                //do projektów wrzuć pliki z katalogu
                var_dump( $this -> projects );
            }
            else {
                echo "No kurde FU!";
            }
        }
        
        private function connectFtp() {
            var_dump( "connectFTP" );
            if( $ftpConfig = file_get_contents( $this -> uid ."/ftp.json" ) ) {
                var_dump( "gotJson" );
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
                array_push( $this -> projects, $projectInstance );
            }
        }
        
        private function createDir( $dir ) {
            if( ftp_mkdir( $this -> ftp, $dir ) ) {
                return true;
            }
            return false;
        }
        
    }

	$postdata = file_get_contents("php://input");
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