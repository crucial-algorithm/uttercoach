import './api/methods.js';
import './api/publications.js';
import {AppAuthToken} from "./api/collections";

Accounts.registerLoginHandler(function (loginRequest) {
    if (!loginRequest || !loginRequest['login.usingUtterToken']) {
        return undefined;
    }

    const token = loginRequest['login.usingUtterToken'];
    const authToken = AppAuthToken.findByToken(token);
    if (!authToken || authToken.used) {
        return undefined;
    }

    return {
        userId: authToken.athleteId
    }
});
