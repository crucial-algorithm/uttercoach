'use strict';

class StripePaymentMethod {
    constructor(name, email, address, card) {
        address = address || {city: null, country: null, line1: null, line2: null, postal_code: null, state: null};
        card = card || {
            brand: null,
            checks: {address_line1_check: null, address_postal_code_check: null, cvc_check: null},
            country: null,
            exp_month: null,
            exp_year: null,
            fingerprint: null,
            funding: null,
            generated_from: null,
            last4: null,
            three_d_secure_usage: {supported: null},
            wallet: null
        };
        this._name = name;
        this._email = email;
        this._brand = card.brand;
        this._country = card.country;
        this._expirationMonth = card.exp_month;
        this._expirationYear = card.exp_year;
        this._last4 = card.last4;
        this._address = new StripeAddress(address.city, address.country
            , address.line1, address.line2, address.postal_code, address.state);
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get email() {
        return this._email;
    }

    set email(value) {
        this._email = value;
    }

    /**
     *
     * @return {StripeAddress}
     */
    get address() {
        return this._address;
    }

    set address(value) {
        this._address = value;
    }

    get brand() {
        return this._brand;
    }

    set brand(value) {
        this._brand = value;
    }

    get country() {
        return this._country;
    }

    set country(value) {
        this._country = value;
    }

    get expirationMonth() {
        return this._expirationMonth;
    }

    set expirationMonth(value) {
        this._expirationMonth = value;
    }

    get expirationYear() {
        return this._expirationYear;
    }

    set expirationYear(value) {
        this._expirationYear = value;
    }

    get last4() {
        return this._last4;
    }

    set last4(value) {
        this._last4 = value;
    }

    toJSON() {
        return {
            name: this.name,
            email: this.email,
            address: this.address.toJSON(),
            card: {
                brand: this.brand,
                country: this.country,
                exp_month: this.expirationMonth,
                exp_year: this.expirationYear,
                last4: this.last4
            }
        }
    }
}

class StripeAddress {
    constructor(city, country, line1, line2, postalCode, state) {
        this._city = city;
        this._country = country;
        this._line1 = line1;
        this._line2 = line2;
        this._postalCode = postalCode;
        this._state = state;
    }


    get city() {
        return this._city;
    }

    set city(value) {
        this._city = value;
    }

    get country() {
        return this._country;
    }

    set country(value) {
        this._country = value;
    }

    get line1() {
        return this._line1;
    }

    set line1(value) {
        this._line1 = value;
    }

    get line2() {
        return this._line2;
    }

    set line2(value) {
        this._line2 = value;
    }

    get postalCode() {
        return this._postalCode;
    }

    set postalCode(value) {
        this._postalCode = value;
    }

    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
    }

    toJSON() {
        return {
            city: this.city,
            country: this.country,
            line1: this.line1,
            line2: this.line2,
            postal_code: this.postalCode,
            state: this.state,

        }
    }
}

class StripeSubscription {

    constructor(stripeSubscriptionObj) {
        stripeSubscriptionObj = stripeSubscriptionObj || {};

        this._applicationFeePercent = stripeSubscriptionObj.application_fee_percent;
        this._billing = stripeSubscriptionObj.billing;
        this._billingCycleAnchor = stripeSubscriptionObj.billing_cycle_anchor;
        this._billingThresholds = stripeSubscriptionObj.billing_thresholds;
        this._canceledAt = stripeSubscriptionObj.canceled_at;
        this._cancelAt = stripeSubscriptionObj.cancel_at;
        this._cancelAtPeriodEnd = stripeSubscriptionObj.cancel_at_period_end;
        this._collectionMethod = stripeSubscriptionObj.collection_method;
        this._created = stripeSubscriptionObj.created;
        this._currentPeriodEnd = stripeSubscriptionObj.current_period_end * 1000;
        this._currentPeriodStart = stripeSubscriptionObj.current_period_start * 1000;
        this._customer = stripeSubscriptionObj.customer;
        this._daysUntilDue = stripeSubscriptionObj.days_until_due;
        this._defaultPaymentMethod = stripeSubscriptionObj.default_payment_method;
        this._defaultSource = stripeSubscriptionObj.default_source;
        this._defaultTaxRates = stripeSubscriptionObj.default_tax_rates;
        this._discount = new StripeSubscriptionDiscount(stripeSubscriptionObj.discount);
        this._endedAt = stripeSubscriptionObj.ended_at;
        this._id = stripeSubscriptionObj.id;
        this._items = stripeSubscriptionObj.items;
        this._lastresponse = stripeSubscriptionObj.lastResponse;
        this._latestInvoice = stripeSubscriptionObj.latest_invoice;
        this._livemode = stripeSubscriptionObj.livemode;
        this._metadata = stripeSubscriptionObj.metadata;
        this._object = stripeSubscriptionObj.object;
        this._pendingSetupIntent = stripeSubscriptionObj.pending_setup_intent;
        this._plan = stripeSubscriptionObj.plan;
        this._quantity = stripeSubscriptionObj.quantity;
        this._schedule = stripeSubscriptionObj.schedule;
        this._start = stripeSubscriptionObj.start;
        this._startDate = stripeSubscriptionObj.start_date;
        this._status = stripeSubscriptionObj.status;
        this._taxPercent = stripeSubscriptionObj.tax_percent;
        this._trialEnd = stripeSubscriptionObj.trial_end;
        this._trialStart = stripeSubscriptionObj.trial_start;
    }


    get applicationFeePercent() {
        return this._applicationFeePercent;
    }

    set applicationFeePercent(value) {
        this._applicationFeePercent = value;
    }

    get billing() {
        return this._billing;
    }

    set billing(value) {
        this._billing = value;
    }

    get billingCycleAnchor() {
        return this._billingCycleAnchor;
    }

    set billingCycleAnchor(value) {
        this._billingCycleAnchor = value;
    }

    get billingThresholds() {
        return this._billingThresholds;
    }

    set billingThresholds(value) {
        this._billingThresholds = value;
    }

    get canceledAt() {
        return this._canceledAt;
    }

    set canceledAt(value) {
        this._canceledAt = value;
    }

    get cancelAt() {
        return this._cancelAt;
    }

    set cancelAt(value) {
        this._cancelAt = value;
    }

    get cancelAtPeriodEnd() {
        return this._cancelAtPeriodEnd;
    }

    set cancelAtPeriodEnd(value) {
        this._cancelAtPeriodEnd = value;
    }

    get collectionMethod() {
        return this._collectionMethod;
    }

    set collectionMethod(value) {
        this._collectionMethod = value;
    }

    get created() {
        return this._created;
    }

    set created(value) {
        this._created = value;
    }

    get currentPeriodEnd() {
        return this._currentPeriodEnd;
    }

    set currentPeriodEnd(value) {
        this._currentPeriodEnd = value;
    }

    get currentPeriodStart() {
        return this._currentPeriodStart;
    }

    set currentPeriodStart(value) {
        this._currentPeriodStart = value;
    }

    get customer() {
        return this._customer;
    }

    set customer(value) {
        this._customer = value;
    }

    get daysUntilDue() {
        return this._daysUntilDue;
    }

    set daysUntilDue(value) {
        this._daysUntilDue = value;
    }

    get defaultPaymentMethod() {
        return this._defaultPaymentMethod;
    }

    set defaultPaymentMethod(value) {
        this._defaultPaymentMethod = value;
    }

    get defaultSource() {
        return this._defaultSource;
    }

    set defaultSource(value) {
        this._defaultSource = value;
    }

    get defaultTaxRates() {
        return this._defaultTaxRates;
    }

    set defaultTaxRates(value) {
        this._defaultTaxRates = value;
    }

    /**
     * @return {StripeSubscriptionDiscount}
     */
    get discount() {
        return this._discount;
    }

    set discount(value) {
        this._discount = value;
    }

    get endedAt() {
        return this._endedAt;
    }

    set endedAt(value) {
        this._endedAt = value;
    }

    get id() {
        return this._id;
    }

    set id(value) {
        this._id = value;
    }

    get items() {
        return this._items;
    }

    set items(value) {
        this._items = value;
    }

    get lastresponse() {
        return this._lastresponse;
    }

    set lastresponse(value) {
        this._lastresponse = value;
    }

    get latestInvoice() {
        return this._latestInvoice;
    }

    set latestInvoice(value) {
        this._latestInvoice = value;
    }

    get livemode() {
        return this._livemode;
    }

    set livemode(value) {
        this._livemode = value;
    }

    get metadata() {
        return this._metadata;
    }

    set metadata(value) {
        this._metadata = value;
    }

    get object() {
        return this._object;
    }

    set object(value) {
        this._object = value;
    }

    get pendingSetupIntent() {
        return this._pendingSetupIntent;
    }

    set pendingSetupIntent(value) {
        this._pendingSetupIntent = value;
    }

    get plan() {
        return this._plan;
    }

    set plan(value) {
        this._plan = value;
    }

    get quantity() {
        return this._quantity;
    }

    set quantity(value) {
        this._quantity = value;
    }

    get schedule() {
        return this._schedule;
    }

    set schedule(value) {
        this._schedule = value;
    }

    get start() {
        return this._start;
    }

    set start(value) {
        this._start = value;
    }

    get startDate() {
        return this._startDate;
    }

    set startDate(value) {
        this._startDate = value;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get taxPercent() {
        return this._taxPercent;
    }

    set taxPercent(value) {
        this._taxPercent = value;
    }

    get trialEnd() {
        return this._trialEnd;
    }

    set trialEnd(value) {
        this._trialEnd = value;
    }

    get trialStart() {
        return this._trialStart;
    }

    set trialStart(value) {
        this._trialStart = value;
    }
}

class StripeSubscriptionDiscount {

    constructor(json) {
        json = json || {};
        this._coupon = json.coupon;
        this._customer = json.customer;
        this._end = json.end * 1000;
        this._object = json.object;
        this._start = json.start * 1000;
        this._subscription = json.subscription;
    }

    get coupon() {
        return this._coupon;
    }

    set coupon(value) {
        this._coupon = value;
    }

    get customer() {
        return this._customer;
    }

    set customer(value) {
        this._customer = value;
    }

    get end() {
        return this._end;
    }

    set end(value) {
        this._end = value;
    }

    get object() {
        return this._object;
    }

    set object(value) {
        this._object = value;
    }

    get start() {
        return this._start;
    }

    set start(value) {
        this._start = value;
    }

    get subscription() {
        return this._subscription;
    }

    set subscription(value) {
        this._subscription = value;
    }
}

export {StripePaymentMethod, StripeAddress, StripeSubscription}