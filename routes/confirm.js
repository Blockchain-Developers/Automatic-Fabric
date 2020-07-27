let express = require('express');
let router = express.Router();
const mysql = require('mysql');
const finalize = require('../src/finalize');
const con = mysql.createConnection({
  host: 'localhost',
  user: 'nodejs',
  password: 'nodejspassword',
  database: 'users',
  multipleStatements: true
});
/* GET home page. */

router.get('/:id', async function(req, res) {
  con.query('select data from pending where id=?', req.params.id, async function(err, results) {
    let data = await JSON.parse(results[0].data);
    let decision = 0;
    let orgnum;
    for (let i = 0; i < data.orgcount; i++) {
      if (data.org[i].name == req.session.user) {
        decision = 1;
        orgnum = i;
      }
    }
    if (decision) {
      data.org[orgnum].confirmed = 1;
      con.query('update pending set data=? where id=?', [await JSON.stringify(data), req.params.id]);
      con.query('select data from users where username=?', req.session.user, async function(err, results) {
        let data = await JSON.parse(results[0].data);
        for (let i = 0; i < data.pending.length; i++) {
          if (data.pending[i].id == req.params.id) {
            data.pending[i].filled = 2;
          }
        }
        con.query('update users set data=? where username=?', [JSON.stringify(data), req.session.user]);
      });

      let check_finalize = 1;
      for (let i = 0; i < data.orgcount; i++) {
        if (!data.org[i].confirmed) {
          check_finalize = 0;
        }
      }
      if (check_finalize) {
        finalize.process(req.params.id);
        res.redirect('/');
      } else {
        res.redirect('/');
      }
    } else {
      res.send('Illegal Request');
    }

  });
});
module.exports = router;
