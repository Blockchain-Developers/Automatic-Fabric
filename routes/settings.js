let express = require('express');
let router = express.Router();
const mysql = require('mysql');
let passwordHash = require('password-hash');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});

/* GET home page. */

router.get('/', async function(req, res) {
    res.render('settings');
});
router.post('/', async function(req, res) {
  con.query('select passwordhash from users where username=?', req.session.user, async function(err, results){
    let check = await passwordHash.verify(req.body.oldpwd, results[0].passwordhash);
    if(check){
      let hashedPassword = passwordHash.generate(req.body.newpwd);
      con.query('update users set passwordhash=? where username=?', [hashedPassword, req.session.user]);
      res.redirect('/');
    }
    else
    {
      res.redirect('/settings');
    }
  });
});
module.exports = router;
