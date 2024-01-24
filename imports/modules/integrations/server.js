import { Random } from 'meteor/random';
import {Router} from 'meteor/iron:router';
import {ServerPaymentTools} from "../../utils/payments/server-payments";
import {WebHookPayload} from './api/collections';
import {logger} from "../../utils/logger";
import {RecoverAccount} from "../users/api/collections";
import {Utils} from "../../utils/utils";


Router.onBeforeAction(function (req, res, next) {
    var rawBody = "";
    req.on('data', function (chunk) {
        rawBody += chunk;
        req.rawBody = rawBody;
    });
    req.on('end', function () {
        req.rawBody = rawBody;
    });
    next();
}, { only: 'strip-webhook' });


Router.route('/api/webhooks/stripe', {where: 'server', name: 'strip-webhook'})
    .get(function () {
        // GET /webhooks/stripe

        // NodeJS request object
        var request = this.request;

        this.response.writeHead(200, { 'Content-Type': 'text/plain',
            'Trailer': 'Content-MD5' });
        this.response.end('OK');
    })
    .post(function (message) {
        const content = message.body;
        let data = content.data;
        let valid = ServerPaymentTools.validateWebhook(message.rawBody, message.headers['stripe-signature']);

        new WebHookPayload(null,valid ? WebHookPayload.sources().STRIPE : WebHookPayload.sources().UNKNOWN
            , {type: content.type, data: data.object}).insert();

        if (!valid) {
            logger.info('call on webhook that did not match stripe');
        }

        this.response.end('OK');
    })
    .put(function () {
        let request = this.request;
        let response = this.response;

        let body = [];
        request.on('error', (err) => {
            console.error(err);
        }).on('data', (chunk) => {
            body.push(chunk);
        }).on('end', () => {
            body = Buffer.concat(body).toString();
            console.log(body);
            // At this point, we have the headers, method, url and body, and can now
            // do whatever we need to in order to respond to this request.
            response.end('OK');
        });
    });

// this is not the correct place for this route, but given it's the only server routing
// available this far, it has to be placed here
Router.route('/account-recovery/:token', {where: 'server', name: 'account-recovery'})
    .get(function () {
        // NodeJS request object
        let request = this.request;
        const url = request.url;
        const token = url.split('/').pop();

        const recover = RecoverAccount.findByToken(token);
        if (!recover || recover.used) {
            this.response.writeHead(307, { 'Location': '/email-validated'});
            this.response.end('OK' + request.url);
            return;
        }
        const salt = Random.id();
        Meteor.users.update({_id: recover.newAccountId}, {
            $set: {
                "profile.deprecated": true,
                "profile.salt": salt,
                "profile.migratedTo": recover.existingAccountId,
                "profile.migratedAt": Date.now()
            }
        });

        Accounts.setUsername(recover.existingAccountId, recover.email);
        Accounts.setPassword(recover.existingAccountId, Utils.SHA1(`${recover.newAccountId}+${salt}`));
        //TODO: migrate statistics from new account to existing account?!?!?

        recover.markAsUsed();

        this.response.writeHead(307, { 'Location': '/email-validated'});
        this.response.end('OK' + request.url);
    });




