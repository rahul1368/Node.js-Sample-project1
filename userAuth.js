"use strict";
const Token = require('../modules/tokenAuth')
let db, client
let utility = require('../modules/utility');
let attempt_limit = 5;
let banned_ips = [];
let isuser = true;
let limitflag = false;
module.exports = {
  userAuthByToken: userAuthByToken, checkAccessToken: checkAccessToken
}

function userAuthByToken(req, res, next) {

  let token_auth = req.headers['x-auth-token'];
  if (token_auth) {
    db = req.app.get('db')
    let tokenInstance = new Token(db);
    tokenInstance.tokenVerification(token_auth).then(function (values) {
      console.log('values')
      console.log(values)
      if (values) {
        console.log("student id =" + values);
        req.user = {};
        req.user.id = values;
        next();
      } else {
        let responseData = {
          "meta": {
            "code": 401,
            "success": false,
            "message": "Access denied"
          },
          "error": "Invalid token"
        }
        res.status(responseData.meta.code).json(responseData)
        next();
      }

    }, function (error) {
      let responseData = {
        "meta": {
          "code": 401,
          "success": false,
          "message": "Error with tokenVerification"
        },
        "error": error
      }
      res.status(responseData.meta.code).json(responseData)
      // next()
    });
  } else {
    let responseData = {
      "meta": {
        "code": 401,
        "success": false,
        "message": "No x-auth-token header"
      },
    }
    res.status(responseData.meta.code).json(responseData)
    // next()
  }

}

function checkAccessToken(req, res, next) {
  db = req.app.get('db')
  client = db.redis
  let ip = utility.getClientIp(req).split(":");
  let current_ip = ip[3];
  console.log(current_ip)
  let user = '';
  let token_auth = req.headers['x-auth-token'];
  let self = res;
  client.hgetAsync("doubtnut_user", token_auth).then(
    (res) => {
      // let user = res;
      return res;
    }).then((res) => {
      if (res == null) {
        isuser = false;
        return client.zrangeAsync("doubtnut_banned_ips", 0, -1);
      } else {
        isuser = true;
        return new Promise((resolve, reject) => {
          resolve("validated");
        });
      }
    }
  ).then((res) => {
    if (res == "validated")
      return new Promise((resolve, reject) => {
        resolve("validated");
      });
    if (isuser == true) {
      console.log(res)
      next();
    }
    else if (isuser == false) {
      banned_ips = res;
      if (banned_ips.includes(current_ip) == true) {
        let responseData = {
          "meta": {
            "code": 401,
            "success": false,
            "message": "Your ip is already banned!"
          },
        }
        self.status(responseData.meta.code).json(responseData)
        return new Promise((resolve, reject) => {
          resolve("pass")
        });
      }
      else {
        return client.hgetAsync("doubtnut_incorrect_attempts", current_ip);
      }

    }
  }).then((res) => {
    if (res == "validated")
      return new Promise((resolve, reject) => {
        resolve("validated");
      });
    if (res == "pass") {
      return new Promise((resolve, reject) => {
        resolve("pass")
      });
    }
    else {
      let attempts = res;
      if (attempts == null) {
        limitflag = false;
        attempts = 1;
        return client.hsetAsync("doubtnut_incorrect_attempts", current_ip, attempts);
      }
      else {
        if (attempts < attempt_limit) {
          limitflag = false;
          attempts = parseInt(attempts);
          attempts += 1;
          return client.hsetAsync("doubtnut_incorrect_attempts", current_ip, attempts);
        }
        else if (attempts == attempt_limit) {
          limitflag = true;
          let d = new Date();
          let value = d.getTime();
          return client.zaddAsync("doubtnut_banned_ips", parseInt(value), current_ip);
        }
      }
    }
  }).then((res) => {
    if (res == "validated")
      return next()

    if (res == "pass")
      return next()
    else {
      if (limitflag == true) {
        let responseData = {
          "meta": {
            "code": 401,
            "success": false,
            "message": "Access denied"
          },
          "error": "Your ip is banned from now!"
        }
        return self.status(responseData.meta.code).json(responseData)
        //next();
      }
      else {
        return next();
      }
    }
  }).catch((err) => {
    console.log(err)
    let responseData = {
      "meta": {
        "code": 401,
        "success": false,
        "message": "Access denied"
      },
      "error": err
    }
    return self.status(responseData.meta.code).json(responseData)
  });
}
