"use strict";
const student = require('./student');
let user = [];
const token_time_limit = 7;
let expiry_flag = false;
module.exports = class Token {
  constructor(db) {
    this.client = db.redis;
    this.db = db;
    this.token = '';
  }

  static createRandomString(length, chars) {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    let currentTimestamp = new Date().getTime();
    let partA = result.substr(0, 58);
    let partB = result.substr(58, 57);
    result = partA + currentTimestamp + partB;
    return result;
  }

  static makeid() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 15; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
  }

  tokenGeneration(student_id) {
    const token = Token.createRandomString(128, Token.makeid());
    this.token = token
    return this.client.hsetAsync("tokens", token, student_id)
  }

  tokenGeneration2(user_id) {
    let self = this;
    return student.getUser(user_id, self.db.mysql.read, self.client).then(
      (res) => {
        console.log(JSON.parse(res));
        user = JSON.parse(res);
        let token = '';
        let old_token = user[0].access_token;
// {/*<<<<<<< HEAD*/}
//         {/*if (old_token != '') {*/}
//           {/*let token_date_pre = user[0].token_creation_time.split("T")[0];*/}
//           {/*let token_dd_mm_yy = token_date_pre.split("-");*/}
//           {/*let token_date = token_dd_mm_yy[1] + "/" + token_dd_mm_yy[2] + "/" + token_dd_mm_yy[0];*/}
//           {/*let today = new Date();*/}
//           {/*let dd = today.getDate();*/}
//           {/*let mm = today.getMonth() + 1; //January is 0!*/}
//           {/*let yyyy = today.getFullYear();*/}
//
//           {/*if (dd < 10) {*/}
//             {/*dd = '0' + dd*/}
//           {/*}*/}
//           {/*if (mm < 10) {*/}
//             {/*mm = '0' + mm*/}
//           {/*}*/}
//           {/*today = mm + '/' + dd + '/' + yyyy;*/}
//           {/*let date1 = new Date(token_date);*/}
//           {/*let date2 = new Date(today);*/}
//           {/*let timeDiff = Math.abs(date2.getTime() - date1.getTime());*/}
// {/*=======*/}
        if (old_token != '') {
          let token_date = user[0].token_creation_time;
          let date1 = new Date(token_date.replace(' ', 'T')).getTime();
          let date2 = new Date().getTime();
          let timeDiff = Math.abs(date2 - date1.getTime());
// >>>>>>> rahul-course-version2
          let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
          if (parseInt(diffDays) < token_time_limit) {
            expiry_flag = false;
            token = user[0].access_token;
          }
          else {
            expiry_flag = true;
            token = Token.createRandomString(128, Token.makeid());
          }
        }
        else if (old_token == '') {
          expiry_flag = true;
          token = Token.createRandomString(128, Token.makeid());
        }
        self.token = token
        return self.client.setAsync("doubtnut_token_" + token, user_id)
      }
    ).then(
      (res) => {
        if (expiry_flag) {
          self.client.zremAsync("doubtnut_tokens", user[0].access_token);
          let d = new Date();
          return self.client.zaddAsync("doubtnut_tokens", d.getTime(), self.token);
        }
        else {
          let d = new Date();
          return self.client.zaddAsync("doubtnut_tokens", d.getTime(), self.token);
        }
      }
    ).then(
      (res) => {
        if (expiry_flag)
          return student.updateUserToken(user_id, self.token, self.db.mysql.write, self.client)
        else
          return new Promise((resolve, reject) => {
            resolve(self)
          });
      }
    ).then(
      (res) => {
        console.log(self.token);
        return self.token;
      }
    ).catch((error) => {
      console.log(error);
    });

  }

  tokenVerification(token) {
    return this.client.hgetAsync("tokens" , token);
  }
  tokenVerification2(token) {
    return this.client.hgetAsync("doubtnut_token_" + token);
  }
  otpCreate(session_id, contact_number, email, class1, language, app_version) {

    // return this.client.hsetAsync("otp_sessions",session_id,contact_number+"_"+email);

    return this.client.hsetAsync("otp_sessions", session_id, JSON.stringify({
      'contact_number': contact_number,
      'email': email,
      'class': class1,
      'language': language,
      'app_version': app_version
    }));

  }

  getContact(session_id) {
    return this.client.hgetAsync("otp_sessions", session_id);
  }
}
