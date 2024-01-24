import {HTTP} from "meteor/http";

const API_KEY = Meteor.settings.maps.key;

export default class GeocodingTools {
    static async location(lat, lng) {

        const URL = `https://eu1.locationiq.com/v1/reverse.php`;

        return new Promise((resolve, reject) => {
            if (lat === null || lng === null) return reject('no coordinates found');
            try {
                const result = HTTP.call('GET', URL, {
                    params: { lat: lat,lon: lng, key: API_KEY , format: "json"}
                });

                if (result.data.error)
                    return reject({error: result.data.error});

                return resolve(GeocodingTools.findCountryAndCity(result.data.address));

            } catch (e) {
                // Got a network error, timeout, or HTTP error in the 400 or 500 range.
                return reject(e);
            }
        })
    }

    /**
     * @private
     * @param address
     * @return {{country: String|null, city: String | null}}
     */
    static findCountryAndCity(address) {
        address = address || {};

        // TODO: change country to country_code
        // supported country code = https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements
        let city = address.city || address.county || address.state
            , country = address.country;

        return {city, country}
    }


    /**
     *
     * @param {TrainingSession} session
     * @return {Promise<void>}
     */
    static async processSession(session) {
        if (session.location) return;
        const coordinates = session.randomLatLng();
        if (coordinates.lat === null || coordinates.lng === null) {
            session.updateWithNoLocationFound();
        }

        try {
            const position = await GeocodingTools.location(coordinates.lat, coordinates.lng);
            session.setLocationInfo(position);
        } catch (err) {
            session.updateWithNoLocationFound();
        }
    }
}