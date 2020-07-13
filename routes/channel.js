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
      for(var i=0;i<data.length;i++){
        orgs.push(data[i].name);
      }
      res.render("channel-new", { id: req.params.id, orgs:orgs, user:req.session.user});
    }
  });
});
router.post("/", async function (req, res, next) {
  console.log(req.body);
});
module.exports = router;
