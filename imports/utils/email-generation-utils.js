/**
 * This file can't be loaded on the client, due to mjml import
 */

import i18n from "../utils/i18n";
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';


function getAssetPath() {
    let meteor_root = fs.realpathSync(process.cwd() + '/../');
    return meteor_root + '/server/assets/app';
}

class MjMl {
    constructor(file) {
        let folder = path.dirname(file);
        this.mjml = fs.readFileSync(file, 'utf8');
        let files = fs.readdirSync(folder);
        files.forEach(function (val) {
            let completePath = path.join(folder, val);
            let chunks = val.split('.');
            if (fs.statSync(completePath).isFile() && chunks.length > 0 && chunks[1] === "mjml") {
                let name = chunks[0];
                Handlebars.registerPartial(name, fs.readFileSync(completePath, 'utf8'));
            }
        });
    }

    helpers(object) {
        this.helpers = object;
    }

    compile() {
        let text = Handlebars.compile(this.mjml)(this.helpers || {});
        return mjml2html(text).html;
    }

    send(mailOptions) {
        mailOptions.html = this.compile();
        Email.send(mailOptions);
    }
}

export default class EmailGenerationUtils {
    /**
     *
     * @param template
     * @param values
     * @param language
     * @returns {html}
     */
    static generate(template, values, language = null) {
        let email = new MjMl(getAssetPath() + "/mjml/" + template + ".mjml");
        values = values || {};
        values.followUs = i18n.translate("email_follow_us", null, language);
        values.social = i18n.translate("email_social", null, language);
        values.year = moment().year();
        values.copyright = i18n.translate("email_copyright", null, language);
        values.footerBackgroundColor = values.footerBackgroundColor || "#ffffff";
        email.helpers(values);
        return email.compile();
    }


    static generateAndSend(to, subject, text, template, values, language) {
        let email = EmailGenerationUtils.generate(template, values, language);
        Email.send({
            to: to,
            subject: subject,
            text: text,
            html: email
        });
    }
}
console.log('finished parsing email-generation-utils', mjml2html);
