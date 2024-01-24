// Retrieve
let MongoClient = require('mongodb').MongoClient;
let nodemailer = require('nodemailer');
let MONGO_URL = "mongodb://gopaddler:GoPaddler!Awesome#2@mongo-1:27017/admin?replicaSet=rs0"

let transporter = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
        user: 'postmaster@gopaddler.com',
        pass: '<...>'
    }
});

// Connect to the db
MongoClient.connect(MONGO_URL, function (err, db) {
    if (err) {
        return console.dir(err);
    }

    db.collection('emailNotifications', function (err, collection) {
        if (err) {
            return console.dir(err);
        }

        collection.find({}).toArray(function (err, documents) {
            if (err) {
                return console.dir(err);
            }

            let done = [];

            // loop all documents, asynchronously
            (function loop(list) {

                if (list.length === 0) {
                    finish();
                    return;
                }

                let doc = list.shift();
                sendMail(doc, function (err) {
                    if (err) {
                        console.err(err);
                    } else {
                        done.push(doc._id);
                    }

                    loop(list);
                })
            })(documents);

            // erase all notifications already performed
            function finish() {
                collection.deleteMany({_id: {$in: done}});
                db.close();
            }

        });

    });
});


function sendMail(options, callback) {
    // send mail with defined transport object
    transporter.sendMail(options, (error, info) => {
        console.log('Message %s sent: %s', info.messageId, info.response);
        callback(error);
    });

}
