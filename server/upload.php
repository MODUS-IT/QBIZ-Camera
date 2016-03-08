<?php
	$access = [];
    
    function revokeAccess( $msg ) {
        $access["isGood"] = false;
        $access["msg"] = $msg;
        echo json_encode($access);
        exit();
    }
    
    function grantAccess() {
        $access["isGood"] = true;
        echo json_encode($access);
    }
    
    $fileName = $_FILES['file']['name'];
    if(move_uploaded_file( $_FILES['file']['tmp_name'], $_POST["srvToken"]."/".$fileName )) {
        $filesToUploadPath = $_POST["srvToken"]."/files.json";
        if(!file_exists( $filesToUploadPath ) ) {
            file_put_contents( $filesToUploadPath, "[]" );
        }
        
        $filesToUpload = file_get_contents( $filesToUploadPath );
        // $filesToUpload = base64_decode( $filesToUpload );
        $filesToUpload = json_decode( $filesToUpload );
        array_push( $filesToUpload, $fileName );
        
        $filesToUpload = json_encode( $filesToUpload );
        // $filesToUpload = base64_encode( $filesToUpload );
        file_put_contents( $filesToUploadPath, $filesToUpload );
        grantAccess();
        
    } else revokeAccess( "Move" );
    
?>