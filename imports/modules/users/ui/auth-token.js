import './auth-token.html'


Template.appRedirectRoute.onRendered(function () {
    Accounts.callLoginMethod({
        methodArguments: [{'login.usingUtterToken': this.data.token}],
        userCallback: () => {
            Router.go(this.data.route)
        }
    });
});