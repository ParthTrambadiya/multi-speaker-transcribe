$(document).ready(function(){
    /*===== SHOW NAVBAR  =====*/ 
    const toggle = $('#header-toggle'),
        nav = $('#nav-bar'),
        bodypd = $('#body-pd'),
        headerpd = $('#header')

    // Validate that all variables exist
    if(toggle && nav && bodypd && headerpd){
        toggle.on('click', ()=>{
            // show navbar
            nav.toggleClass('show')
            // change icon
            toggle.toggleClass('bx-x')
            // add padding to body
            bodypd.toggleClass('body-pd')
            // add padding to header
            headerpd.toggleClass('body-pd')
        })
    }

    $.getJSON( "../stack-output.json", function( data ) {
        $('#home-login').attr('href', data.CognitoUserPoolSigninUrl)
    })
})
