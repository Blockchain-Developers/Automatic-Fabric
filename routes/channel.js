var express = require("express");
var router = express.Router();
var randomstring = require("randomstring");
const { promisify } = require("util");

const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "nodejs",
    password: "nodejspassword",
    database: "users",
    multipleStatements: true,
});

const queryAsync = promisify(con.query).bind(con);

/* GET home page. */

router.get("/:id/new", async function (req, res, next) {
  con.query('select * from networks where id=?', req.params.id, function(err, results){
    if(results.length){
      var data=JSON.parse(results[0].data);
      var orgs=[];
      data=data.data;
      for(var i=0;i<data.length;i++){
        orgs.push(data[i].name);
      }
      res.render("channel-new", { id: req.params.id, orgs:orgs, user:req.session.user});
    }
  });
});
router.post("/:id/new", async function (req, res, next) {
  var str = "";
  for (var i = 0; i < req.body.fields.length; i++) {
      if (i != 0) {
          str += ", ";
      }
      str += "'";
      str += req.body.fields[i];
      str += "'";
  }
  let err,
      results = await queryAsync(
          "select username from users where role=? and username in (" +
              str +
              ") and finished like ?",
          ["user", network.params.id]
      );
  var participants=[];
  for(var i=0;i<results.length;i++){
    participants.push(results[0].username);
  }
  var channelid = await randomstring.generate({
      length: 10,
      charset: "numeric",
  });

});
module.exports = router;
