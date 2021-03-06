'use strict';

var main = function main(app) {
    app.service("LoginService", ['baseUrl', function (baseUrl) {
        /* passport相关的东西 */
        var loginCallbackStack = [];
        var intervalVar;
        var currentLocation;

        var config = {
            base: baseUrl + '',
            loginTheme: "sncd"
        };

        function jumpLogin(data) {
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else {
                var newlocationHref = location.origin + config.base + 'auth?targetUrl=' + location.href;

                if (location.host.match('sit') || location.host.match('dev') || location.host == 'my.cnsuning.com') {
                    if (self !== top) {
                        newlocationHref = "http://phoebussit.cnsuning.com/phoebus/auth?targetUrl=http://phoebussit.cnsuning.com/" + top.location.hash;
                        top.location.href = 'https://ssosit.cnsuning.com/ids/login?loginTheme=' + config.loginTheme + '&service=' + encodeURIComponent(newlocationHref);
                    } else {
                        location.href = 'https://ssosit.cnsuning.com/ids/login?loginTheme=' + config.loginTheme + '&service=' + encodeURIComponent(newlocationHref);
                    }
                } else {
                    if (self !== top) {
                        newlocationHref = "http://phoebus.cnsuning.com/phoebus/auth?targetUrl=http://phoebus.cnsuning.com/" + top.location.hash;
                        top.location.href = 'https://sso.cnsuning.com/ids/login?loginTheme=' + config.loginTheme + '&service=' + encodeURIComponent(newlocationHref);
                    } else {
                        location.href = 'https://sso.cnsuning.com/ids/login?loginTheme=' + config.loginTheme + '&service=' + encodeURIComponent(newlocationHref);
                    }
                }
            }
        }

        function popupLoginContainer() {
            if (typeof intervalVar == 'undefined') {
                currentLocation = window.location.href;
                var src = (typeof config.successCallbackUrl == 'undefined' ? config.base + "popupLoginSuccess?" : config.successCallbackUrl) + "topLocation=" + encodeURIComponent(currentLocation) + "&loginTheme=" + config.loginTheme;

                document.getElementById('modalOverlay').style.display = 'block';
                document.getElementById('modalContainer').style.display = 'block';
                document.getElementById("iframeLogin").src = src;

                intervalVar = window.setInterval(checkMsgFromLoginIframe, 200);
            }
        }

        function resizeContainer(widthAndHeight) {
            //        document.getElementById("modalOverlay").style.display = "block";
            var value = widthAndHeight.split(",");
            var width = value[0];
            var height = value[1];
            var loginIframe = document.getElementById("iframeLogin");
            loginIframe.style.width = width + 'px';
            loginIframe.style.height = height + 'px';
            loginIframe.style.marginLeft = -width / 2 + 'px';
            loginIframe.style.marginTop = -height / 2 + 'px';
        }

        function closeContainer() {
            document.getElementById('modalOverlay').style.display = 'none';
            document.getElementById('modalContainer').style.display = 'none';
            document.getElementById("iframeLogin").src = '';
            window.location.href = currentLocation.indexOf('#') == -1 ? currentLocation + "#unknown" : currentLocation;
            clearInterval(intervalVar);
            intervalVar = undefined;
        }

        function loginSuccess() {
            closeContainer();
            dequeue();
        }

        function popupClose() {
            closeContainer();
            reject();
        }

        function checkMsgFromLoginIframe() {
            var newHash = window.location.hash;
            if (newHash.length > 1) {
                var value = newHash.split('#');
                var params = value[1].split(':');
                switch (params[0]) {
                    case 'resize':
                        resizeContainer(params[1]);
                        break;
                    case 'close':
                        closeContainer();
                        break;
                    case 'loginSuccess':
                        loginSuccess();
                        break;
                    default:
                        break;
                }
            }
        }

        function enqueue(resolve, reject) {
            loginCallbackStack.push({
                resolve: resolve,
                reject: reject
            });
        }

        function dequeue() {
            // 这里面还需要修改
            var callbacks = loginCallbackStack.pop() || {};
            if (callbacks.resolve) {
                callbacks.resolve();
            }
        }

        function reject() {
            var callbacks = loginCallbackStack.pop() || {};
            if (callbacks.reject) {
                callbacks.reject();
            }
        }

        return {
            checkMsgFromLoginIframe: checkMsgFromLoginIframe,
            closeContainer: closeContainer,
            loginSuccess: loginSuccess,
            resizeContainer: resizeContainer,
            popupLoginContainer: popupLoginContainer,
            enqueue: enqueue,
            config: config,
            //add hw 2015-06-30
            popupClose: popupClose,
            jumpLogin: jumpLogin,
            logout: logout
        };
    }]);
};

var authId, env;

function cupidlogout() {
    var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    //非sn passport
    document.cookie = 'is_cupid_auth=false; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.cnsuning.com; path=/;';
    location.href = 'http://cupidsit.cnsuning.com/cupid/session/logout?' + authId + (option.beforeService ? '&' + option.beforeService : '') + '&service=' + encodeURIComponent(option.service ? option.service : location.origin + '/cupid/auth?targetUrl=' + location.href);
}

function snlogout() {
    var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    //sn passport
    if (location.hostname.match('sit') || location.hostname.match('dev')) {
        location.href = 'https://ssosit.cnsuning.com/ids/logout?service=' + encodeURIComponent(option.service ? option.service : location.href);
    } else if (location.hostname.match('pre')) {
        location.href = 'https://ssopre.cnsuning.com/ids/logout?service=' + encodeURIComponent(option.service ? option.service : location.href);
    } else {
        //location.href = 'http://sso.cnsuning.com/ids/logout?service=http://snds.cnsuning.com/'
        location.href = 'https://sso.cnsuning.com/ids/logout?service=' + encodeURIComponent(option.service ? option.service : location.href);
    }
}

function detectEnv() {
    var cookies = document.cookie.split(';');
    var is_cupid_auth = false;
    if (cookies) {
        cookies.forEach(function (e) {
            if (/authId/.test(e)) {
                authId = e.trim();
            }
            if (/is_cupid_auth/.test(e)) {
                is_cupid_auth = true;
            }
        });
    }
    if (is_cupid_auth) {
        return 'cupid';
    } else {
        return 'sn';
    }
}

function logout(option) {
    if (!env) {
        env = detectEnv();
    }
    switch (env) {
        case 'sn':
            snlogout(option);
            return;
        case 'cupid':
            cupidlogout(option);
            return;
        default:
            break;
    }
}

main.fn = {
    logout: logout
};

module.exports = main;
//# sourceMappingURL=loginService.js.map