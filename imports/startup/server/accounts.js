Accounts.emailTemplates.from = "Utter Coach <noreply@uttercoach.com>";

Accounts.validateLoginAttempt(function (attempt) {
    attempt.allowed = true;
    return true;
});


Accounts.urls.resetPassword = (token) => {
    return Meteor.absoluteUrl(`reset-password/${token}`);
};

Accounts.config({
    loginExpirationInDays: null
});
