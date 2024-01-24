const StripeSchema = new SimpleSchema({
    plan: {type: String},
    coupon: {type: String},
    secret_key: {type: String},
    webhook_signing_secret: {type: String}
});

const StravaSchema = new SimpleSchema({
    secret: {type: String},
    client_id: {type: Number},
});

const SportsSchema = new SimpleSchema({
    app_name: {type: String},
    app_preview: {type: String},
    app_link_android: {type: String},
    app_link_ios: {type: String}
});

const PublicSchema = new SimpleSchema({
    stripe: {type: Object},
    "stripe.publishable_key": {type: String},
    sports: {type: Object},
    'sports.canoeing': {type: SportsSchema},
    'sports.cycling': {type: SportsSchema},
    'mochaRuntimeArgs': {type: Object, blackbox: true, optional: true}
});


const SettingsSchema = new SimpleSchema({
    stripe: {type: StripeSchema},
    aggregate_batch_size: {type: Number, label: "number of sessions to be processed each time"},
    create_stripe_customer_batch_size: {type: Number},
    strava: {type: Object},
    'strava.gopaddler': {type: StravaSchema},
    'strava.uttercycling': {type: StravaSchema},
    maps: {type: Object},
    'maps.key': {type: String},
    'maps.batch_size': {type: Number},
    activity_report: {type: Object},
    'activity_report.schedule': {type: String},
    'activity_report.address': {type: String},
    dont_run_batch: {type: Boolean},
    'public': {type: PublicSchema}
});

let clientInstance = null, serverInstance = null;

class UtterCoachSettings {
    /**
     * @return {UtterCoachSettings}
     */
    static getInstance() {
        if (Meteor.isClient) {
            if (clientInstance === null) clientInstance = new UtterCoachSettings(Meteor.settings);
            return clientInstance;
        }

        if (serverInstance === null) serverInstance = new UtterCoachSettings(Meteor.settings);
        return serverInstance;
    }

    /**
     * @private
     * @param settings
     */
    constructor(settings) {
        if (Meteor.isClient) {
            PublicSchema.validate(settings.public);
            this._settings = settings;
            return;
        }

        SettingsSchema.validate(settings);
        this._settings = settings;
    }

    /**
     *
     * @param {String} sport
     * @return {String}
     */
    getAppName(sport) {
        return this.settings.public.sports[sport].app_name;
    }

    getAppAndroidLink(sport) {
        return this.settings.public.sports[sport].app_link_android;
    }

    getAppIOSLink(sport) {
        return this.settings.public.sports[sport].app_link_ios;
    }

    getAppImagePreview(sport) {
        return this.settings.public.sports[sport].app_preview;
    }

    /**
     * @private
     * @return {*}
     */
    get settings() {
        return this._settings;
    }

    set settings(value) {
        this._settings = value;
    }
}

// force validation upon start of the app
UtterCoachSettings.getInstance();
export default UtterCoachSettings;