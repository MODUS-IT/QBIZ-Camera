<?php
	$postdata = file_get_contents("php://input");
	$request = json_decode($postdata);
    
    //FTP Connection
    $host = $request -> server;
    
    $access = [];
    
    function rejectFTP() {
        $access['isFTPGood'] = false;
        echo json_encode($access);
        exit();
    }
    
    function rejectSRV() {
        $access['isSRVGood'] = false;
        $access['isFTPGood'] = true;
        echo json_encode($access);
        exit();
    }
    
    function resolveSRV( $token ) {
        $access['isSRVGood'] = true;
        $access['isFTPGood'] = true;
        $access['token'] = $token;
        echo json_encode($access);
        exit();
    }
    
    $connection_id = ftp_connect( $host ) or rejectFTP(); 
    if (ftp_login($connection_id, $request->user, $request->password)) {
        $str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        $dirName = time();
        for( $i = 0; $i < 6; $i++ ) {
            $dirName .= $str[rand(0, strlen($str) -1)];
        }
        
        if(!mkdir( $dirName )) {
            rejectSRV();
        } else {
            file_put_contents( $dirName."/config.json", base64_encode(json_encode( $request )) );
            resolveSRV( $dirName );
        }
        
    } else {
        rejectFTP();
    }
    
?>