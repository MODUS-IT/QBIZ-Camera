<?php
    

	$postdata = file_get_contents("php://input");
	$request = json_decode($postdata);
    
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
?>