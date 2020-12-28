const express = require('express');
const router = express.Router();
const assert = require('assert');

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
    res.render('study');
});

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
                    password: req.body.password
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
                res.redirect('/routes/study');
            }
            else {
                res.redirect('/routes/?passwordIncorrect=True'); 
            }
        }
});

module.exports = router;