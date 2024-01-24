import './coach-payment-method.html'
import './coach-payment-method.scss'
import ClientPaymentTools from "../../../utils/payments/client-payments";

let paymentInfoResolver = null;
/**@type Promise<StripePaymentMethod> */
let paymentInfoPromise = new Promise((resolve) => {
    paymentInfoResolver = resolve;
});

Template.coachPaymentMethod.onCreated(function () {
    ClientPaymentTools.retrievePaymentInfo().then((info) => {
        paymentInfoResolver(info);
    });
});

Template.coachPaymentMethod.onRendered(async function () {
    const stripe = await ClientPaymentTools.getStripe();
    let stripePaymentMethodHandler = new StripePaymentMethodHandler(document.querySelector('.coach-billing-payment-method-form'), stripe);
    stripePaymentMethodHandler.mount(stripe);

    $('div[data-selector="back"]').off('click').on('click', function () {
        Router.go('coach-billing');
    });

    $('button.secondary').off('click').on('click', function (e) {
        e.preventDefault();
        Router.go('coach-billing');
    });

    paymentInfoPromise.then((info) => {
        if (!info) return;
        stripePaymentMethodHandler.fill(info);
    });
});

class StripePaymentMethodHandler {
    constructor(container, stripe) {
        this._container = container;
        this._form = container.querySelector('form');
        this._stripe = stripe;
    }

    mount(stripe) {
        let elements = stripe.elements({
            fonts: [
                {
                    cssSrc: 'https://fonts.googleapis.com/css?family=Source+Code+Pro',
                },
            ],
            // Stripe's examples are localized to specific languages, but if
            // you wish to have Elements automatically detect your user's locale,
            // use `locale: 'auto'` instead.
            locale: 'auto'
        });

        let elementStyles = {
            base: {
                color: '#32325D',
                fontWeight: 500,
                fontFamily: 'Source Code Pro, Consolas, Menlo, monospace',
                fontSize: '16px',
                fontSmoothing: 'antialiased',

                '::placeholder': {
                    color: '#CFD7DF',
                },
                ':-webkit-autofill': {
                    color: '#e39f48',
                },
            },
            invalid: {
                color: '#E25950',

                '::placeholder': {
                    color: '#FFCCA5',
                },
            },
        };

        let elementClasses = {
            focus: 'focused',
            empty: 'empty',
            invalid: 'invalid',
        };

        let cardNumber = elements.create('cardNumber', {
            style: elementStyles,
            classes: elementClasses,
        });
        cardNumber.mount('#card-number');

        let cardExpiry = elements.create('cardExpiry', {
            style: elementStyles,
            classes: elementClasses,
        });
        cardExpiry.mount('#card-expiry');

        let cardCvc = elements.create('cardCvc', {
            style: elementStyles,
            classes: elementClasses,
        });
        cardCvc.mount('#card-cvc');

        this.labels();
        this.handleSubmit(elements);

        const $country = $('#country');
        this.getUserLocation().then((code) => {
            $country.val(code);
            if ($country.val()) {
                $country.removeClass('empty');
            }
        });

    }

    async getUserLocation() {
        return new Promise((resolve, reject) => {
            const endpoint = 'https://iplist.cc/api/';
            fetch(endpoint).then((response) => {
                return response.json();
            }).then((data) => {
                console.log(data);
                resolve(data.countrycode);
            });
        });
    }

    enableAll() {
        Array.prototype.forEach.call(
            this.form.querySelectorAll(
                "input[type='text'], input[type='email'], input[type='tel']"
            ),
            function(input) {
                input.removeAttribute('disabled');
            }
        );
    }

    disableAll() {
        Array.prototype.forEach.call(
            this.form.querySelectorAll(
                "input[type='text'], input[type='email'], input[type='tel']"
            ),
            function(input) {
                input.setAttribute('disabled', 'true');
            }
        );
    }

    triggerBrowserValidation() {
        // The only way to trigger HTML5 form validation UI is to fake a user submit
        // event.
        let submit = document.createElement('input');
        submit.type = 'submit';
        submit.style.display = 'none';
        this.form.appendChild(submit);
        submit.click();
        submit.remove();
    }

    labels() {
        // Floating labels
        let inputs = this.form.querySelectorAll('.coach-billing-payment-method-form .input');
        Array.prototype.forEach.call(inputs, function(input) {
            input.addEventListener('focus', function() {
                input.classList.add('focused');
            });
            input.addEventListener('blur', function() {
                input.classList.remove('focused');
            });
            input.addEventListener('keyup', function() {
                if (input.value.length === 0) {
                    input.classList.add('empty');
                } else {
                    input.classList.remove('empty');
                }
            });
        });
    }

    handleSubmit(elements) {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();

            // Trigger HTML5 validation UI on the form if any of the inputs fail
            // validation.
            let plainInputsValid = true;
            Array.prototype.forEach.call(this.form.querySelectorAll('input'), function (
                input
            ) {
                if (input.checkValidity && !input.checkValidity()) {
                    plainInputsValid = false;
                }
            });
            if (!plainInputsValid) {
                this.triggerBrowserValidation();
                return;
            }

            // Show a loading screen...
            this.container.classList.add('submitting');

            // Disable all inputs.
            this.disableAll();

            // Gather additional customer data we may have collected in our form.
            let name = this.form.querySelector('#name');
            let address1 = this.form.querySelector('#address');
            let address2 = this.form.querySelector('#address-2');
            let city = this.form.querySelector('#city');
            let country = this.form.querySelector('#country');
            let postalCode = this.form.querySelector('#postal-code');
            let address = {
                name: name ? name.value : undefined,
                line1: address1 ? address1.value : undefined,
                line2: address2 ? address2.value : undefined,
                city: city ? city.value : undefined,
                zip: postalCode ? postalCode.value : undefined,
                country: country ? country.value : undefined,
            };

            this.stripe.createToken(elements.getElement('cardNumber')).then((result) => {
                // Stop loading!
                this.container.classList.remove('submitting');

                if (result.token) {
                    this.createPaymentMethod(result.token, address);
                    this.container.classList.add('submitted');
                } else {
                    // Otherwise, un-disable inputs.
                    this.enableAll();
                }
            });

        });
    }

    createPaymentMethod(token, address) {
        this.stripe.createPaymentMethod({
            type: 'card',
            card: {token: token.id},
            billing_details: {
                name: address.name,
                address: {
                    city: address.city,
                    country: address.country,
                    line1: address.line1,
                    line2: address.line2,
                    postal_code: address.zip,
                    state: address.state
                },
            },
        }).then((result) => {
            this.container.classList.remove('submitting');

            if (result.error) {
                this.enableAll();
                console.error(result.error.message);
                return;
            }

            this.container.classList.add('submitted');
            Meteor.call('updateCoachPaymentMethod', result.paymentMethod.id, (err, result) => {
                Router.go('coach-billing');
            });
        });
    }

    reset() {
        this.form.reset();

        // Clear each Element.
        elements.forEach(function(element) {
            element.clear();
        });

        // Reset error state as well.
        error.classList.remove('visible');

        // Resetting the form does not un-disable inputs, so we need to do it separately:
        this.enableAll();
        this.container.classList.remove('submitted');
    }

    /**
     *
     * @param {StripePaymentMethod} payment
     */
    fill(payment) {
        this.name = payment.name;
        this.addressLine1 = payment.address.line1;
        this.addressLine2 = payment.address.line2;
        this.city = payment.address.city;
        this.postalCode = payment.address.postalCode;
        this.country = payment.address.country;
    }

    set name(value) { $('#name').val(value).removeClass('empty') }

    set addressLine1(value) { $('#address').val(value).removeClass('empty') }

    set addressLine2(value) { $('#address-2').val(value).removeClass('empty') }

    set city(value) { $('#city').val(value).removeClass('empty') }

    set postalCode(value) { $('#postal-code').val(value).removeClass('empty') }

    set country(value) { $('#country').val(value).removeClass('empty') }

    get form() {
        return this._form;
    }

    set form(value) {
        this._form = value;
    }

    get container() {
        return this._container;
    }

    set container(value) {
        this._container = value;
    }

    get stripe() {
        return this._stripe;
    }
}