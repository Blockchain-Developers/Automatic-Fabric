let express = require('express');
let router = express.Router();

const mysql = require('mysql');
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
    let decision = 0,
      orgnum;
    for (let i = 0; i < data.orgcount; i++) {
      if (data.org[i].name == req.session.user) {
        decision = 1;
        orgnum = i;
      }
    }
    if (decision) {
      res.render('edit', {
        orginfo: data.org[orgnum],
        id: req.params.id
      });
    } else {
      res.send('Illegal Request');
    }

  });

});
router.post('/:id', async function(req, res) {
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
      data.org[orgnum].peercount = req.body.fields.length / 2;
      data.org[orgnum].orderer = {
        port: req.body.ordererport
      };
      data.org[orgnum].ca = {
        port: req.body.caport
      };
      data.org[orgnum].peer = [];
      for (let i = 0; i < data.org[orgnum].peercount; i++) {
        data.org[orgnum].peer.push({
          name: req.body.fields[2 * i],
          port: req.body.fields[2 * i + 1]
        });
      }
      con.query('update pending set data=? where id=?', [await JSON.stringify(data), req.params.id]);
      con.query('select data from users where username=?', req.session.user, async function(err, results) {
        let data = await JSON.parse(results[0].data);
        for (let i = 0; i < data.pending.length; i++) {
          if (data.pending[i].id == req.params.id) {
            data.pending[i].filled = 1;
          }
        }
        con.query('update users set data=? where username=?', [JSON.stringify(data), req.session.user]);
      });
      res.redirect('/');
    } else {
      res.send('Illegal Request');
    }

  });

});
module.exports = router;
