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
                
                var s3 = new AWS.S3({apiVersion: '2006-03-01'});
                var params = {
                    Bucket: s3CsvBucket, 
                    Key: UserID + '/' + sessionStorage.getItem('s3FileKey')
                };

                const s3Stream = s3.getObject(params, function(err, data){
                    if(err) {
                        console.log(err)
                    }
                    else {
                        var s3output = data.Body.toString('utf8')
                        var removeInvertedCom = s3output.replace(/["]+/g, '')
                        var splitByNewLine = removeInvertedCom.split('\n')
                        var header = splitByNewLine[0].split(',')

                        var time = []
                        var spk = []
                        var set = []

                        for(let i = 1; i < splitByNewLine.length; i++) {
                            var splitByComma = splitByNewLine[i].split(',')
                            var comment = '';
                            if(splitByComma.length > 3) {
                                for(let j = 0; j < splitByComma.length; j++) {
                                    if(j == 0) {
                                        time.push(splitByComma[j])
                                    }
                                    else if(j == 1) {
                                        spk.push(splitByComma[j])
                                    }
                                    else {
                                        comment+= splitByComma[j]
                                    }
                                }
                                set.push(comment.trim())
                            } else {
                                for(let j = 0; j < splitByComma.length; j++) {
                                    if(j == 0) {
                                        time.push(splitByComma[j])
                                    }
                                    else if(j == 1) {
                                        spk.push(splitByComma[j])
                                    }
                                    else {
                                        set.push(splitByComma[j].trim())
                                    }
                                }
                            }
                        }
                        const distinct = (value, index, self) => {
                            return self.indexOf(value) === index
                        }
                        var distinctSpk = spk.filter(distinct)
                        no_of_output = set.length;

                        var spk_wait_img = $('#spk_wait_img')
                        var spk_wait = $('#spk_wait')
                        $("#speakers_dynamic").empty(spk_wait_img);
                        $("#speakers_dynamic").empty(spk_wait);

                        for(let disSpk = 0; disSpk < distinctSpk.length; disSpk++) {
                            var input = document.createElement("input");
                            input.type = "text";
                            input.classList.add("form-control", "form-control-sm",  "my-1")
                            input.setAttribute("data-tag", distinctSpk[disSpk]);
                            input.setAttribute("oninput", "changeSpkName(this)");
                            input.placeholder = distinctSpk[disSpk];
                            input.value = distinctSpk[disSpk];
                            $("#speakers_dynamic").append(input)
                        }

                        var trans_wait_img = $('#trans_wait_img')
                        var trans_wait = $('#trans_wait')
                        $('#transcribe_output').removeClass("d-flex", "flex-column", "justify-content-center", "align-content-center")
                        $("#transcribe_output").empty(trans_wait_img);
                        $("#transcribe_output").empty(trans_wait);

                        for(let tra = 0; tra < set.length; tra++) {
                            var div = document.createElement("div");
                            div.classList.add("form-group");

                            var label_1 = document.createElement("label");
                            label_1.classList.add(spk[tra]);
                            var label_1_text = document.createTextNode(spk[tra] + " ");
                            label_1.append(label_1_text);

                            var label_2 = document.createElement("label");
                            var label_2_text = document.createTextNode(String.fromCharCode(160) + "|" + String.fromCharCode(160) + time[tra]);
                            label_2.append(label_2_text);

                            var textarea = document.createElement("textarea");
                            textarea.classList.add("form-control", "my-1");
                            textarea.id = "textarea-" + tra;
                            textarea.rows = "2";
                            textarea.value = set[tra];

                            var p = document.createElement("p");
                            p.classList.add("d-none");
                            p.id = 'p-' + tra;

                            div.append(label_1);
                            div.append(label_2);
                            div.append(textarea);
                            div.append(p);

                            $("#transcribe_output").append(div)
                        }
                    }
                });

            }
        });
    
        $('#downloadTranscribe').attr('onclick', `exportHTML('${s3PdfBucket}')`)
        $('#logout-btn').attr('href', cognitoUserPoolLogoutUrl)
    })
})

function changeSpkName(e) {
    var data_tag = e.getAttribute("data-tag");
    var arr_spk = document.getElementsByClassName(data_tag)

    for(let i = 0; i < arr_spk.length; i++) {
        arr_spk[i].innerHTML = e.value;
    }
}

function exportHTML(s3PdfBucket) {
    for (let i = 0; i < no_of_output; i++) {
        $('#p-' + i).text($('#textarea-' + i).val());
    }
    var doc = new jsPDF();
    var elementHTML = $('#transcribe_output').html();
    var specialElementHandlers = {
        '#elementH': function (element, renderer) {
            return true;
        }
    };
    doc.fromHTML(elementHTML, 15, 15, {
        'width': 170,
        'elementHandlers': specialElementHandlers
    });
    
    if($('#fileName').val() == '') {
        var upload = new AWS.S3.ManagedUpload({
            params: {
                Bucket: s3PdfBucket,
                Key: UserID + '/' + sessionStorage.getItem('fileName') + '.pdf',
                Body: doc.output('blob')
            }
        })

        swal({
            title: "Success",
            text: "Please wait, we are uploading your transcription for your future use.",
            icon: "success",
            closeOnClickOutside: false,
            closeOnEsc: false,
            buttons: false
        });

        var promise = upload.promise();

        promise.then(
            function(data) {
                swal.close();
                doc.save(sessionStorage.getItem('fileName') + '.pdf');
            });
    }
    else
    {
        var upload = new AWS.S3.ManagedUpload({
            params: {
                Bucket: s3PdfBucket,
                Key: UserID + '/' + $('#fileName').val() + '-' + sessionStorage.getItem('fileName') + '.pdf',
                Body: doc.output('blob')
            }
        })

        swal({
            title: "Success",
            text: "Please wait, we are uploading your transcription for your future use.",
            icon: "success",
            closeOnClickOutside: false,
            closeOnEsc: false,
            buttons: false
        });

        var promise = upload.promise();

        promise.then(
            function(data) {
                swal.close();
                doc.save($('#fileName').val() + '-' + sessionStorage.getItem('fileName') + '.pdf');
            });
    }
}

