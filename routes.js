const express = require('express');
const router = express.Router();
const assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');
var cookieParser = require('cookie-parser');
var session = require('express-session');

//GLOBAL UTILITY VARS
var today = new Date();
var mongoToday = today.getFullYear().toString()+zeroFormat(today.getMonth())+zeroFormat(today.getDate());
var cost_per_hour = 4;
//every route starts with "domain name/routes..."
//serve sign in page
router.get('/', async function(req, res, next){
    if (req.session.user) {
        return res.redirect('motivate');
    }
    res.render('sign_up');
});

//serve sign up page
router.get('/signin_page', async function(req, res, next){
    if (req.session.user) {
        return res.redirect('motivate');
    }
    res.render('sign_in');
});

//serve study page
router.get('/study', async function(req, res, next){
        if (req.session.user) {
            user = req.session.user
        } else {
            return res.redirect('signin_page');
        }
        
        var week_array = makeWeekArray();
        const db = req.app.locals.db;

        //get users study sessions
        var sessionsCursor = db.collection('studyTimes').find(
            {$and: [
                {"date": {$gte: parseInt(mongoToday)}}, //20210129
                {"email": {$eq: user}}
            ]}   
        );
        var sessionsArray = [];
        await sessionsCursor.forEach((doc) => {
            doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
            doc.startTime = doc.startTime.toString().slice(0,5);
            doc.endTime = doc.endTime.toString().slice(0,5);
            sessionsArray.push(doc);
        });

        //get confirmed meetings
        var mySessionsArray = [];
        mySessionsArray = await db.collection('meetings').find(
            {$and: [
                {"date": {$gte: parseInt(mongoToday)}},
                {"studierEmail": {$eq: user}},
            ]}   
        ).toArray();
        for (i in mySessionsArray) {
            var doc = mySessionsArray[i];
            doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
            doc.startTime = doc.startTime.toString().slice(0,5);
            doc.endTime = doc.endTime.toString().slice(0,5);
            mySessionsArray[i] = doc;
        }
        
        res.render('study', {daysArray: week_array, sessionsArr: sessionsArray, user: user, myMeetings: mySessionsArray});
});

//serve motivate page
router.get('/motivate', async function(req, res, next){
    if (req.session.user) {
        user = req.session.user
    } else {
        return res.redirect('signin_page');
    }

    var week_array = makeWeekArray();
    //get all sessions where user != current user, date >= today, and motivator != 0
    const db = req.app.locals.db;

    //available sessions to motivate for
    var sessionsCursor = db.collection('studyTimes').find(
        {$and: [
            {"date": {$gte: parseInt(mongoToday)}},
            {"email": {$ne: user}},
            {"motivator": {$ne: 1}}
        ]}   
    );
    var sessionsArray = [];
    await sessionsCursor.forEach((doc) => {
        doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
        doc.startTime = doc.startTime.toString().slice(0,5);
        doc.endTime = doc.endTime.toString().slice(0,5);
        //finding cost of session
        var length = (parseInt(doc.endTime.split(':')[0])*60 + parseInt(doc.endTime.split(':')[1])) - (parseInt(doc.startTime.split(':')[0])*60 + parseInt(doc.startTime.split(':')[1])) 
        doc.cost = Math.ceil((length/60)*cost_per_hour);
        if (doc.cost < cost_per_hour) {doc.cost = cost_per_hour;}
        sessionsArray.push(doc);
    });

    //my confirmed meetings
    var mySessionsArray = [];
    mySessionsArray = await db.collection('meetings').find(
        {$and: [
            {"date": {$gte: parseInt(mongoToday)}},
            {"motivatorEmail": {$eq: user}},
        ]}   
    ).toArray();
    for (i in mySessionsArray) {
        var doc = mySessionsArray[i];
        doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
        doc.startTime = doc.startTime.toString().slice(0,5);
        doc.endTime = doc.endTime.toString().slice(0,5);
        mySessionsArray[i] = doc;
    }
    
    res.render('motivate', {sessions: sessionsArray, daysArray: week_array, user: user, myMeetings: mySessionsArray});
});

//add Study Session
router.route('/addStudyTime')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var doc = {
            email: req.body.email,
            date: parseInt(dateString),
            startTime: req.body.startTime,
            endTime: req.body.endTime
        };
        var startInt = parseInt(doc.startTime.split(':')[0]) + parseInt(doc.startTime.split(':')[1]);
        var endInt = parseInt(doc.endTime.split(':')[0]) + parseInt(doc.endTime.split(':')[1]);
        if (startInt < endInt) {
            await db.collection('studyTimes').insertOne(doc, function(err, result) {
                assert.equal(null, err);
                console.log('doc inserted');
            });
        }

        ///alert emails////////////////////////////////////////////
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            //replace with pollinate work email
            auth: {
                user: 'hankhowland@gmail.com',
                pass: 'jojo3302'
            }
        });
        var mailOptions = {
            from: 'hankhowland@gmail.com',
            to: 'jackogle@uchicago.edu',
            subject: 'Pollinate Study Time Creation Alert',
            text: `Someone made an event!!!!! Lets goooooooo`
        };
        var mailOptions2 = {
            from: 'hankhowland@gmail.com',
            to: 'jrmerril@uchicago.edu',
            subject: 'Pollinate Study Time Creation Alert',
            text: `Someone made an event!!!!! Lets goooooooo`
        }; 
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        transporter.sendMail(mailOptions2, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.redirect('/routes/study');     
    });

//edit Study Session
router.route('/editStudyTime')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var dateArr = req.body.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        var newvalues = {$set: {email: req.body.email, date: parseInt(dateString), startTime: req.body.startTime, endTime: req.body.endTime}};
        await db.collection('studyTimes').updateOne({"_id": ObjectId(req.body.id)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('doc edited');
        });
        res.redirect('/routes/study');     
    });

//delete Study Session
//add Study Session
router.get('/deleteSession', async function(req, res, next) {
    const db = req.app.locals.db;
    await db.collection('studyTimes').deleteOne({"_id": ObjectId(req.query.id)}, function(err, result) {
        assert.equal(null, err);
        console.log('doc deleted');
    });
    res.redirect('/routes/study');     
});

function makeConfirmEmailBody(email, date, starttime, endtime) {
    var str = `Hey ${email}, \n\n
Congrats on getting one step closer to beating procrastination!
Here is your meeting link for ${date} at ${starttime} - ${endtime} CST:
https://uchicago.zoom.us/j/96641521682?pwd=RFJqcmJvL285c3RSd3FHcmhpWnA1dz09\n
Here are some quick things:
    1. Begin by expressing one short-term goal and long-term goal. 
    2. Write them in the chat and say them out loud. 
    3. Make sure your audio and video are on during the meeting!
    4. Let us know if you no longer want to attend your meeting; someone else is relying on you    .
    5. Fill out the survey to help us improve! https://forms.gle/31fLyyuBEy72nZLR7\n\n
Work is inevitable, procrastination doesn’t have to be.
www.pollinate.work/routes/\n\n
If you have any questions shoot us an email, text, or call.\n
The Pollinate Team
Jack Ogle: jackogle@uchicago.edu (612) 670-7721
Jonathan Merril: jrmerril@uchicago.edu (703) 762-6410
Henry Myers: hankhowland@gmail.com (971) 283-9172
Joshua Weisskopf: jweisskopf@uchicago.edu (847) 721-2501\n
P.S. Call us for all your procrastination needs or if you’re lonely!`
    return str;
}


//make meeting from motivate page
router.get('/confirmMotivate', async function(req, res, next) {
        //enter req.body into meetings table
        //find studyTime and make "motivator": 1
        console.log(req.query);
        const db = req.app.locals.db;
        var dateArr = req.query.date.split('/');
        var date = `${dateArr[0]+1}/${dateArr[1]}/${dateArr[2]}`
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        req.query.date = parseInt(dateString);
        

        var studier = await db.collection('users').find({"email": {$eq: req.query.studierEmail}}).limit(1).toArray();
        var motivator = await db.collection('users').find({"email": {$eq: req.query.motivatorEmail}}).limit(1).toArray();

        await db.collection('meetings').insertOne(req.query, function(err, result) {
            assert.equal(null, err);
            console.log('doc inserted');
        });
        var newvalues = {$set: {motivator: 1}}
        await db.collection('studyTimes').updateOne({"_id": ObjectId(req.query.studyTimeID)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('motivator set to 1');
        });

        ///alert emails////////////////////////////////////////////
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            //replace with pollinate work email
            auth: {
                user: 'hankhowland@gmail.com',
                pass: 'jojo3302'
            }
        });

        /* emails for studier and motivator================================================= */
        var bodyTextStudier = makeConfirmEmailBody(req.query.studierEmail, date, timeToText(req.query.startTime), timeToText(req.query.endTime));
        var bodyTextMotivator = makeConfirmEmailBody(req.query.motivatorEmail, date, timeToText(req.query.startTime), timeToText(req.query.endTime));
        var mailOptionsS = {
            from: 'hankhowland@gmail.com',
            to: req.query.studierEmail,
            subject: 'Confirmed Meeting on Pollinate',
            text: bodyTextStudier
        };
        var mailOptionsM = {
            from: 'hankhowland@gmail.com',
            to: req.query.motivatorEmail,
            subject: 'Confirmed Meeting on Pollinate',
            text: bodyTextMotivator
        };
        transporter.sendMail(mailOptionsS, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        transporter.sendMail(mailOptionsM, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        /* ============================================================================= */

         /* emails for jack and jon jon================================================= */
        var mailOptions = {
            from: 'hankhowland@gmail.com',
            to: 'jackogle@uchicago.edu',
            subject: 'Pollinate Join Event Alert',
            text: `Someone joined/confirmed an event!!!!! Lets goooooooo`
        };
        var mailOptions2 = {
            from: 'hankhowland@gmail.com',
            to: 'jrmerril@uchicago.edu',
            subject: 'Pollinate Join Event Alert',
            text: `Someone joined/confirmed an event!!!!! Lets goooooooo`
        }; 
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        transporter.sendMail(mailOptions2, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        /* ===================================================================== */

        
        
        res.redirect('/routes/motivate');   
    });

router.get('/utility', async function(req, res, next) {
    //utility function to do db cleaning
    const db = req.app.locals.db;
    //await db.collection('studyTimes').deleteMany({}) 
    res.redirect('/routes/'); 
})


//sign up logic
router.route('/signup')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        if (req.body.password.length < 8) { //password less than 8 chars
            res.redirect('/routes/?passwordShort=True');
        }
        else if (req.body.password != req.body.confirmPassword) { //passwords don't match
            res.redirect('/routes/?passwordsMatch=False');
        }
        else {
            var exists = 0;
            var existsCursor = db.collection('users').find({"email" : {$eq: req.body.email}})
            await existsCursor.forEach(function(doc, err) {
                exists++;
            });
            if (exists > 0) {
                //this email already has an account
                res.redirect('/routes/?userExists=True'); 
            }
            else { //all good, create account
                console.log(req.body);
                const item = {
                    FirstName: req.body.FirstName,
                    LastName: req.body.LastName,
                    email: req.body.email,
                    PhoneNumber: req.body.PhoneNumber,
                    password: req.body.password
                }
        
                db.collection('users').insertOne(item, function(err, result) {
                    assert.equal(null, err);
                    console.log('user inserted');
                });

                ///alert emails////////////////////////////////////////////
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    //replace with pollinate work email
                    auth: {
                        user: 'hankhowland@gmail.com',
                        pass: 'jojo3302'
                    }
                });
                var mailOptions = {
                    from: 'hankhowland@gmail.com',
                    to: 'jackogle@uchicago.edu',
                    subject: 'Pollinate Sign Up Alert',
                    text: `Someone signed up!!!!! Lets goooooooo`
                };
                var mailOptions2 = {
                    from: 'hankhowland@gmail.com',
                    to: 'jrmerril@uchicago.edu',
                    subject: 'Pollinate Sign Up Alert',
                    text: `Someone signed up!!!!! Lets goooooooo`
                }; 
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                transporter.sendMail(mailOptions2, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                req.session.user = req.body.email;
                res.redirect('/routes/motivate');
            }
        }
});

//sign in logic
router.route('/sign_in')
    .post(async function(req, res, next) {
        const db = req.app.locals.db;
        var exists = 0;
        var dbPassword = '';
        var existsCursor = db.collection('users').find({"email" : {$eq: req.body.email}})
        await existsCursor.forEach(function(doc, err) {
            exists++;
            dbPassword = doc.password;
        });
        if (exists <= 0) {
            //no account exists with this email
            res.redirect('/routes/signin_page?accountExists=False'); 
        }
        else { //all good, create account
            if (req.body.password == dbPassword) {
                req.session.user = req.body.email;
                console.log(req.session);
                res.redirect('/routes/motivate');
            }
            else {
                res.redirect('/routes/signin_page?passwordIncorrect=True'); 
            }
        }
});

//serve about page
router.get("/about", function(req, res, next) {
    res.render("about");
})

router.get("/myprofile", function(req, res, next) {
    console.log(req.session);
    res.render("myProfile", {user: req.session.user});
})

router.get("/signout", function(req, res, next) {
    req.session.user = undefined;
    res.render("sign_in");
})

module.exports = router;



///////////////////utility Functions//////////////////////
function zeroFormat(hour) {
    hour = hour.toString();
    if (hour.length == 1) {
        return "0" + hour.toString();
    }
    else {
        return hour.toString();
    }
}

function makeWeekArray() {
    var week_array = [];
    week_array.push(today);
    for(var i=1; i<7; i++) {
        const new_day = new Date();
        new_day.setDate(today.getDate() + i)
        week_array.push(new_day)
    }
    return week_array;
}

//m/d/yyyy string -> yyyymmdd int
function dateStringToInt(date) {
    var dateArr = date.split('/');
    var month = zeroFormat(dateArr[0]);
    var day = zeroFormat(dateArr[1]);
    var year = dateArr[2];
    return parseInt(`${year}${month}${day}`);
}

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