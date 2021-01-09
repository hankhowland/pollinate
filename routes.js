const express = require('express');
const router = express.Router();
const assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var nodemailer = require('nodemailer');

//GLOBAL UTILITY VARS
var today = new Date();
var mongoToday = today.getFullYear().toString()+zeroFormat(today.getMonth())+zeroFormat(today.getDate());
var cost_per_hour = 4;

//serve sign in page
router.get('/', async function(req, res, next){
    res.render('sign_in');
});

//serve sign up page
router.get('/signup_page', async function(req, res, next){
    res.render('sign_up');
});

//serve study page
router.get('/study', async function(req, res, next){
    if (req.query.user == undefined || req.query.user == '') {
        //check that the user is logged in
        res.redirect('/routes/');
    }
    else {
        var week_array = makeWeekArray();
        const db = req.app.locals.db;

        //get users study sessions
        var sessionsCursor = db.collection('studyTimes').find(
            {$and: [
                {"date": {$gte: parseInt(mongoToday)}},
                {"email": {$eq: req.query.user}}
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
                {"studierEmail": {$eq: req.query.user}},
            ]}   
        ).toArray();
        for (i in mySessionsArray) {
            var doc = mySessionsArray[i];
            doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
            doc.startTime = doc.startTime.toString().slice(0,5);
            doc.endTime = doc.endTime.toString().slice(0,5);
            mySessionsArray[i] = doc;
        }
        
        res.render('study', {daysArray: week_array, sessionsArr: sessionsArray, user: req.query.user, myMeetings: mySessionsArray});
    }
});

//serve motivate page
router.get('/motivate', async function(req, res, next){
    var week_array = makeWeekArray();
    //get all sessions where user != current user, date >= today, and motivator != 0
    const db = req.app.locals.db;

    //available sessions to motivate for
    var sessionsCursor = db.collection('studyTimes').find(
        {$and: [
            {"date": {$gte: parseInt(mongoToday)}},
            {"email": {$ne: req.query.user}},
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
            {"motivatorEmail": {$eq: req.query.user}},
        ]}   
    ).toArray();
    for (i in mySessionsArray) {
        var doc = mySessionsArray[i];
        doc.date = parseInt(doc.date.toString().slice(4,6)) + '/' + parseInt(doc.date.toString().slice(6,8)) + '/' + doc.date.toString().slice(0,4);
        doc.startTime = doc.startTime.toString().slice(0,5);
        doc.endTime = doc.endTime.toString().slice(0,5);
        mySessionsArray[i] = doc;
    }
    
    res.render('motivate', {sessions: sessionsArray, daysArray: week_array, myMeetings: mySessionsArray});
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
        res.redirect('/routes/study?user=' + req.body.email);     
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
        res.redirect('/routes/study?user=' + req.body.email);     
    });

//delete Study Session
//add Study Session
router.get('/deleteSession', async function(req, res, next) {
    const db = req.app.locals.db;
    await db.collection('studyTimes').deleteOne({"_id": ObjectId(req.query.id)}, function(err, result) {
        assert.equal(null, err);
        console.log('doc deleted');
    });
    res.redirect('/routes/study?user=' + req.query.email);     
});

//make meeting from motivate page
router.get('/confirmMotivate', async function(req, res, next) {
        //enter req.body into meetings table
        //find studyTime and make "motivator": 1
        const db = req.app.locals.db;
        var date = req.query.date;
        var dateArr = req.query.date.split('/');
        var dateString = dateArr[2] + zeroFormat(dateArr[0]) + zeroFormat(dateArr[1]);
        req.query.date = parseInt(dateString);

        var studier = await db.collection('users').find({"email": {$eq: req.query.studierEmail}}).limit(1).toArray();
        var motivator = await db.collection('users').find({"email": {$eq: req.query.motivatorEmail}}).limit(1).toArray();
        req.query.studierVenmo = studier[0].venmo;
        req.query.motivatorVenmo = motivator[0].venmo;
        

        await db.collection('meetings').insertOne(req.query, function(err, result) {
            assert.equal(null, err);
            console.log('doc inserted');
        });
        var newvalues = {$set: {motivator: 1}}
        await db.collection('studyTimes').updateOne({"_id": ObjectId(req.query.studyTimeID)}, newvalues, function(err, result) {
            assert.equal(null, err);
            console.log('motivator set to 1');
        });

        //send email to motivator
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            //replace with pollinate work email
            auth: {
              user: 'hankhowland',
              pass: 'jojo3302'
            }
          });
          
          var mailOptions = {
            from: 'hankhowland@gmail.com',
            to: 'hankhowland@gmail.com',
            subject: 'Pollinate Meeting Confirmed!!',
            text: `A motivator was found for your study session!\n\nYou are all set to study from ${timeToText(req.query.startTime)} - ${timeToText(req.query.endTime)} on ${date}. The zoom link for your meeting will be emailed to you soon.\n\nTo see all your confirmed and desired study sessions, go to www.pollinate.work/routes/.`
          };
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
          //send email to studier
        res.redirect('/routes/motivate?user=' + req.query.motivatorEmail);   
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
            res.redirect('/routes/signup_page?passwordShort=True');
        }
        else if (req.body.password != req.body.confirmPassword) { //passwords don't match
            res.redirect('/routes/signup_page?passwordsMatch=False');
        }
        else {
            var exists = 0;
            var existsCursor = db.collection('users').find({"email" : {$eq: req.body.email}})
            await existsCursor.forEach(function(doc, err) {
                exists++;
            });
            if (exists > 0) {
                //this email already has an account
                res.redirect('/routes/signup_page?userExists=True'); 
            }
            else { //all good, create account
                const item = {
                    email: req.body.email,
                    password: req.body.password,
                    venmo: req.body.venmo
                }
        
                db.collection('users').insertOne(item, function(err, result) {
                    assert.equal(null, err);
                    console.log('user inserted');
                });
                res.redirect('/routes/?accountCreated=True');
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
            res.redirect('/routes/?accountExists=False'); 
        }
        else { //all good, create account
            if (req.body.password == dbPassword) {
                res.redirect('/routes/study?user=' + req.body.email);
            }
            else {
                res.redirect('/routes/?passwordIncorrect=True'); 
            }
        }
});

//serve about page
router.get("/about", function(req, res, next) {
    res.render("about");
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