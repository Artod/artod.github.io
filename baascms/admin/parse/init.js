/*
 * Init Admin panel BaasCMS Parse
 * Copyright (c) 2014 Artod gartod@gmail.com
*/

;(function(window, document, _, $, BaasCMS, undefined) {
    BaasCMS.loadHomePage = function() {
        var $context = $('#main');
        
        $context.html( _.template( $('#template-baascms-home').html(), {} ) ); 
    
        var $formKeys = $context.find('form:eq(0)');    
    
        var appid = BaasCMS.cookie.get('appid'),
            jskey = BaasCMS.cookie.get('jskey'),
            $appid = $formKeys.find('input[name="appid"]').val(appid),
            $jskey = $formKeys.find('input[name="jskey"]').val(jskey);

        $formKeys.on('submit', function() {
            var appid = $appid.val(),
                jskey = $jskey.val();

            BaasCMS.cookie.set('appid', appid);
            BaasCMS.cookie.set('jskey', jskey);
            
            window.location.hash = '#/baascms/category/add';
            window.location.reload();
            
            return false
        });
        
        
        var $formSignUp = $context.find('form:eq(1)');
        
        $formSignUp.on('submit', function() {        
            var $form = $(this),
                $username = $form.find('input[name="username"]'),
                $password = $form.find('input[name="password"]'),
                $button = $form.find('button'),
                $error = $form.next(),
                $success = $error.next(),
                username = $username.val(),
                password = $password.val();
                
            if ($button.data('busy') == 1) {
                return false;
            }
                
            $error.hide();               
                
            $button.data('busy', 1).text('wait...');
            
            var query = new Parse.Query(Parse.Role),
                adminRole;
            
            query.equalTo('name', 'admin').find().then(function(roles) {
                if (roles.length) {
                    adminRole = roles[0];
                } else {
                    var ACL = new Parse.ACL();
                    ACL.setPublicReadAccess(true);
                    ACL.setPublicWriteAccess(true);
                
                    adminRole = new Parse.Role('admin', ACL);
                }
                
                return adminRole.save(); // check if we have permissions for working with class _ Role
            }).then(function() {
                var user = new Parse.User();
                user.set('username', username);
                user.set('password', password);
                
                return user.save();
            }).then(function(user) {
                adminRole.getUsers().add(user);
                
                return adminRole.save();
            }).done(function() {
                $success.html('New admin was created successful.').show();
                
                setTimeout(function() {
                    $success.fadeOut('fast');
                }, 2000);
            }).fail(function(error) {            
                var errors = _.isArray(error) ? error : [error];
                
                var errorMessage = '';
                _.each(errors, function(error) {
                    errorMessage += '<p>' + error.message + (error.message === 'unauthorized' ? ' (check your Application ID and Javascript Key above)' : '') + '</p>'
                });
                
                $error.show().html(errorMessage);
            }).always(function() {
                $button.data('busy', 0).text('Create');
            });
            
            return false;
        });            
            
        var $formLogIn = $context.find('form:eq(2)');
        
        if ( Parse.User.current() ) {
            $formLogIn.hide().parent().find('p[data-marker="log-out"]').show().html( $('#logged-in').html() );
        }
        
        $formLogIn.on('submit', function() {
            var $form = $(this),
                $username = $form.find('input[name="username"]'),
                $password = $form.find('input[name="password"]'),
                $button = $form.find('button'),
                $error = $form.next(),
                username = $username.val(),
                password = $password.val();
            
            if ($button.data('busy') == 1) {
                return false;
            }
            
            $error.hide();

            $button.data('busy', 1).text('wait...');
                
            Parse.User.logIn(username, password).done(function(user) {
                window.location.reload();
            }).fail(function(error) {
                $error.show().html(error.message);
            }).always(function() {
                $button.data('busy', 0).text('Log In');
            });
            
            return false;
        });
        
        return false;
    };
    
    var appid = BaasCMS.cookie.get('appid'),
        jskey = BaasCMS.cookie.get('jskey');

    if (!appid || !jskey) {
        $(function() {
            BaasCMS.loadHomePage();
        });
        
        return;
    }

    Parse.initialize(appid, jskey);

    BaasCMS.init({
        baas: 'Parse'
    });

    $(function() {
        if ( !Parse.User.current() ) {
            BaasCMS.loadHomePage();
        } else {
            $('#logged-in').html('Logged in as <strong>' + Parse.User.current().get('username') + '</strong> <a href="#" data-marker="logout" title="Log out"><span class="glyphicon glyphicon-log-out"></span></a>');
            
            $(document).on('click', 'a[data-marker="logout"]', function() {
                Parse.User.logOut();
                window.location.reload();
                
                return false;
            });
        }
    });
})(window, document, window._, window.jQuery, window.BaasCMS);