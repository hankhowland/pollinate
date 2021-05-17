const mongo = require('mongodb');
var nodemailer = require('nodemailer');
var ObjectId = require('mongodb').ObjectID;
const assert = require('assert');

function zeroFormat(hour) {
    hour = hour.toString();
    if (hour.length == 1) {
        return "0" + hour.toString();
    }
    else {
        return hour.toString();
    }
}

var today = new Date();
var mongoToday = today.getFullYear().toString()+zeroFormat(today.getMonth())+zeroFormat(today.getDate());
var transporter = nodemailer.createTransport({
    service: 'gmail',
    //replace with pollinate work email
    auth: {
        user: 'hankhowland@gmail.com',
        pass: 'jojo3302'
    }
});


function send_reminder_email(session, dest) {
    var str = `Hey ${dest}, \n\n
Reminder that you have a Pollinate Study Meeting today at ${timeToText(session.startTime)} CST!!
Here is your meeting link:
https://uchicago.zoom.us/j/96641521682?pwd=RFJqcmJvL285c3RSd3FHcmhpWnA1dz09\n

Work is inevitable, procrastination doesn’t have to be.
www.pollinate.work/routes/\n\n
If you have any questions shoot us an email, text, or call.\n
The Pollinate Team
Jack Ogle: jackogle@uchicago.edu (612) 670-7721
Jonathan Merril: jrmerril@uchicago.edu (703) 762-6410
Henry Myers: hankhowland@gmail.com (971) 283-9172
Joshua Weisskopf: jweisskopf@uchicago.edu (847) 721-2501\n
P.S. Call us for all your procrastination needs or if you’re lonely!`

    var mailOptions = {
        from: 'hankhowland@gmail.com',
        to: dest,
        subject: 'Pollinate Meeting Reminder',
        text: str
    };
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}


function work() {
    //db connection url
    const url = 'mongodb+srv://hankhowland:jojo3302@lists.9qsfv.mongodb.net/<dbname>?retryWrites=true&w=majority'

    mongo.connect(url, { promiseLibrary: Promise }, async (err, client) => {
        if (err) {
            logger.warn(`Failed to connect to the database. ${err.stack}`);
            return;
        }

        db = client.db('pollinate');
        min_hour = today.getHours() + 1; //current time + 1 hours

        var mySessionsArray = [];
        mySessionsArray = await db.collection('meetings').find(
            {$and: [
                {"date": {$eq: parseInt(mongoToday)}}, //change to eq
            ]}   
        ).toArray();

        console.log("today's sessions:");
        console.log(mySessionsArray);
        
        console.log(`searching for sessions where start time = ${min_hour}`)
        mySessionsArray.forEach(async (session) => {
            startHour = session.startTime.split(':')[0];
            //figure out if reminded
            var reminded = 0;
            if ('reminded' in session) {
                console.log ('already reminded');
                if (session.reminded = 1) {
                    reminded = 1;
                }
            }
            else {
                console.log("haven't reminded yet");
            }

            if (startHour == min_hour && !reminded) {
                console.log('sending reminder emails for session');
                send_reminder_email(session, session.motivatorEmail);
                send_reminder_email(session, session.studierEmail);
                var newvalues = {$set: {reminded: 1}};
                await db.collection('meetings').updateOne({"_id": ObjectId(session.id)}, newvalues, function(err, result) {
                    assert.equal(null, err);
                    console.log('reminded set to 1');
                });
            }
        });
        return;
    }); 
}

work();




//turn 00:00 -> x am/pm
function timeToText(time) {
    var timeArr = time.split(':');
    var hour = timeArr[0];
    var mins = ':' + timeArr[1].toString();
    if (mins == ':00') {
        mins='';
    }
    if (hour < 12) {
        return `${parseInt(hour).toString()}${mins}am`;
    }
    else if (hour == 12) {
        return `12${mins}pm`;
    }
    else {
        normal_hour = parseInt(hour) - 12
        return `${normal_hour.toString()}${mins}pm`;
    }
};