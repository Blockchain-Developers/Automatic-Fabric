let express = require("express");
let router = express.Router();
let randomstring = require("randomstring");
const fileUpload = require('express-fileupload');
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
    res.render("chaincode-new", { id: req.params.id });
});
router.post("/", async function (req, res, next) {
  req.files.chaincodefile.data;
});
module.exports = router;
