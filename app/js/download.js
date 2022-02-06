const url = window.location.href
const replacedURL = url.replace('#', '&')
const finalURL = new URLSearchParams(replacedURL)
var accessToken = finalURL.get('access_token')
var idToken = finalURL.get("id_token")
var expiresIn = finalURL.get('expires_in')
var tokenType = finalURL.get('token_type')
var UserID, UserName, UserEmail;
var no_of_output;

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
        let s3PdfBucket = data.S3PdfBucket

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
            } else {
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

                var s3 = new AWS.S3({apiVersion: '2006-03-01'});
                var params = {
                    Bucket: s3PdfBucket, 
                    Prefix: UserID,
                };
        
                const s3Stream = s3.listObjects(params, function(err, data){
                    if(err) {
                        console.log(err)
                    } else {
                        var download_img_tr = $('#download_img_tr')
                        $("#tablebody").empty(download_img_tr);
        
                        if(data.Contents.length != 0) {
                            for(let row = 0; row < data.Contents.length; row++) {
                                var tr = document.createElement("tr");
        
                                var td1 = document.createElement("td");
                                var td1_text = document.createTextNode(row + 1);
                                td1.append(td1_text);
        
                                var td2 = document.createElement("td");
                                var filenm = data.Contents[row].Key.split("/")
                                var td2_text = document.createTextNode(filenm[1]);
                                td2.classList.add('word-wrap', 'file-name');
                                td2.append(td2_text);
        
                                var td3 = document.createElement("td");
                                var date = data.Contents[row].LastModified.toUTCString()
                                var td3_text = document.createTextNode(date);
                                td3.append(td3_text);
        
                                var td4 = document.createElement("td");
                                var size = bytesToSize(data.Contents[row].Size)
                                var td4_text = document.createTextNode(size);
                                td4.classList.add('word-wrap');
                                td4.append(td4_text);
        
                                var td5 = document.createElement("td");
                                var td5_btn = document.createElement("button");
                                var td5_text = document.createTextNode('Download');
                                td5_btn.classList.add('download-btn');
                                td5_btn.setAttribute("onclick", `downloadFile(closest('tr'), '${s3PdfBucket}')`)
                                td5_btn.append(td5_text);
                                td5.append(td5_btn);
        
                                var td6 = document.createElement("td");
                                var td6_btn = document.createElement("button");
                                var td6_text = document.createTextNode('Delete');
                                td6_btn.classList.add('delete-btn');
                                td6_btn.setAttribute("onclick", `deleteFile(closest('tr'), '${s3PdfBucket}')`)
                                td6_btn.append(td6_text);
                                td6.append(td6_btn);
        
                                tr.append(td1);
                                tr.append(td2);
                                tr.append(td3);
                                tr.append(td4);
                                tr.append(td5);
                                tr.append(td6);
        
                                $("#tablebody").append(tr);
                            }
                        } else {
                            var nodatatr = document.createElement("tr");
        
                            var nodatatd = document.createElement("td");
                            var nodatatd_text = document.createTextNode("No record found.");
                            nodatatd.colSpan = "6";
                            nodatatd.append(nodatatd_text);
        
                            nodatatr.append(nodatatd);
                            $("#tablebody").append(nodatatr);
                        }
                            
                    }
                })
            }
        })

        $('#logout-btn').attr('href', cognitoUserPoolLogoutUrl)
    })  
});

//function for convert file size from bit to Bytes, KB, MB, GB, TB
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

//function for download file from s3 bucket 
function downloadFile(event, s3PdfBucket) {
    console.log(event)
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
    var params = {
        Bucket: s3PdfBucket, 
        Key: UserID + '/' + event.cells[1].firstChild.textContent,
        Expires: 360,
        ResponseContentDisposition : 'attachment; filename=' + event.cells[1].firstChild.textContent
    };
    
    var promise = s3.getSignedUrlPromise('getObject', params);
        
    promise.then(function(url) {
        swal({
            title: "Success",
            text: "Downloadalbe file generated successfully, This generated downloadable file valid for next 2 min.",
            icon: "success",
            button: {
                text: "Cancel",
                value: null,
                visible: true,
                className: "swal-button",
                closeModal: true
            },
            content: {
                element: "a",
                attributes: {
                    text: "Download",
                    download: event.cells[1].firstChild.textContent,
                    href: url,
                    className: "swal-content__a"
                },
            }
        })
    }, function(err) {
        console.log(err)
    });
}


//function for delete file from s3 bucket 
function deleteFile(event, s3PdfBucket) {
    console.log(event.data)
    var s3 = new AWS.S3({apiVersion: '2006-03-01'});
        var params = {
            Bucket: s3PdfBucket, 
            Key: UserID + '/' + event.cells[1].firstChild.textContent
        };

    swal({
        title: "Success",
        text: "Please wait, we are deleting your this file.",
        icon: "success",
        closeOnClickOutside: false,
        closeOnEsc: false,
        buttons: false
    });

    s3.deleteObject(params, function(err, data) {
        if (err) {
            swal.close()
            swal({
                title: "Error",
                text: err + err.stack ,
                icon: "error",
                buttons: false
            });
        }
        else     
        {
            location.reload(); 
        }     
    });
}
