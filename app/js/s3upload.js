const url = window.location.href
const replacedURL = url.replace('#', '&')
const finalURL = new URLSearchParams(replacedURL)
var accessToken = finalURL.get('access_token')
var idToken = finalURL.get("id_token")
var expiresIn = finalURL.get('expires_in')
var tokenType = finalURL.get('token_type')
var UserID, UserName, UserEmail;

$(document).ready(function(){
    if(sessionStorage.getItem('accessToken') == null && sessionStorage.getItem('idToken') == null) {
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('idToken', idToken);
        sessionStorage.setItem('expiresIn', expiresIn);
        sessionStorage.setItem('tokenType', tokenType);
    }

    $('#uploadPage').attr('href', "upload.html#access_token=" + sessionStorage.getItem('accessToken') + 
                                                        "&id_token=" + sessionStorage.getItem('idToken') +
                                                        "&expires_in=" + sessionStorage.getItem('expiresIn') +
                                                        "&token_type=" + sessionStorage.getItem('tokenType'));

    $('#transcribePage').attr('href', "transcribe.html#access_token=" + sessionStorage.getItem('accessToken') + 
                                                            "&id_token=" + sessionStorage.getItem('idToken') +
                                                            "&expires_in=" + sessionStorage.getItem('expiresIn') +
                                                            "&token_type=" + sessionStorage.getItem('tokenType'));

    $('#downloadPage').attr('href', "download.html#access_token=" + sessionStorage.getItem('accessToken') + 
                                                        "&id_token=" + sessionStorage.getItem('idToken') +
                                                        "&expires_in=" + sessionStorage.getItem('expiresIn') +
                                                        "&token_type=" + sessionStorage.getItem('tokenType'));

    $.getJSON( "../stack-output.json", function( data ) {
        let cloudFrontUrl = data.CloudFrontDistroUrl
        let stackRegion = data.StackRegion
        let cognitoUserPoolLogoutUrl = data.CognitoUserPoolLogoutUrl
        let identityPoolId = data.CognitoIdentityPoolId
        let identityProvider = data.CognitoIdentityProvider
        let s3AudioBucket = data.S3AudioBucket
        let s3JsonBucket = data.S3JsonBucket
        let s3CsvBucket = data.S3CsvBucket

        var params = {
            AccessToken:  accessToken/* required */
        };
        
        AWS.config.region = stackRegion;
        AWS.config.apiVersions = {
            cognitoidentityserviceprovider: '2016-04-18'
        };
        
        var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
        cognitoidentityserviceprovider.getUser(params, function(err, data) {
            if (err) {
                window.location.href = cloudFrontUrl
            }
            else {
                for(var i = 0; i < data.UserAttributes.length; i++) {
                    if(data.UserAttributes[i].Name == 'sub') {
                        UserID = data.UserAttributes[i].Value;
                    }
                }

                for(var i = 0; i < data.UserAttributes.length; i++) {
                    if(data.UserAttributes[i].Name == 'name') {
                        UserName = data.UserAttributes[i].Value;
                    }
                }
        
                for(var j = 0; j < data.UserAttributes.length; j++) {
                    if(data.UserAttributes[j].Name == 'email') {
                        UserEmail = data.UserAttributes[j].Value;
                    }
                }
        
                $('#UserName').text(UserName);
                $('#UserEmail').text(UserEmail);
        
                let logins = {}
                logins[identityProvider] = idToken
        
                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: identityPoolId,
                    Logins: logins
                });
                
                sessionStorage.setItem('aws', AWS.config.credentials);
                
                AWS.config.credentials.get();        
            }
        });
        
        $('#uploadBtn').attr('onclick', `s3Upload('${s3AudioBucket}', '${s3CsvBucket}')`)
        $('#logout-btn').attr('href', cognitoUserPoolLogoutUrl)
    });
})

function s3Upload(s3AudioBucket, s3CsvBucket) {
    if($('#fileUpload').val() == '') {
        swal({
            title: "Error",
            text: "Please select file or provide .wav file.",
            icon: "error",
        });
        return false;
    } else {
        var d = new Date();
        $("#uploadBtn").prop('disabled', true);
        $("#uploadBtn").css('cursor', 'not-allowed');
        var files = $('#fileUpload')[0];   
        if (files) {
            var file = files.files[0];  
            var fileName = file.name;
            var filename = fileName.split('.').slice(0, -1).join('.') + '-' + d.getTime().toString() + '.' + fileName.split('.').slice(1, 2).join('.');
            sessionStorage.setItem('fileName', fileName.split('.').slice(0, -1).join('.') + '-' + d.getTime().toString())

            var upload = new AWS.S3.ManagedUpload({
                params: {
                Bucket: s3AudioBucket,
                Key: UserID + '/' + filename,
                Body: file
                }
            }).on('httpUploadProgress', function(progress){
                var uploaded = parseInt((progress.loaded*100)/progress.total);
                $('#uploadbar').attr('value', uploaded);
            });

            var promise = upload.promise();

            promise.then(
                function(data) {
                    swal({
                        title: "Success",
                        text: "Audio file uploaded successfully, please wait for few minutes we are generating transcribe.",
                        icon: "success",
                        closeOnClickOutside: false,
                        closeOnEsc: false,
                        buttons: false
                    });
                    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
                    var params = {
                        Bucket: s3CsvBucket, 
                        Key: UserID + '/' + "TransVoice-" + sessionStorage.getItem('fileName') + '.csv'
                    };
                    var myVar = setInterval(callS3, 60000);
                    function callS3()
                    {
                        s3.headObject(params, function(err, data) {
                            if(data != null)
                            {
                                sessionStorage.setItem('s3FileKey', "TransVoice-" + sessionStorage.getItem('fileName') + '.csv');
                                clearInterval(myVar)
                                window.location.href = "transcribe.html#access_token=" + sessionStorage.getItem('accessToken') + 
                                                        "&id_token=" + sessionStorage.getItem('idToken') +
                                                        "&expires_in=" + sessionStorage.getItem('expiresIn') +
                                                        "&token_type=" + sessionStorage.getItem('tokenType');
                            }      
                    });
                    }
                },
                function(err) {
                    console.log(err)
                    return swal({
                        title: "Error",
                        text: "There was an error uploading your photo: " + err.message,
                        icon: "error",
                    });
                }
            );
        }
    }
}