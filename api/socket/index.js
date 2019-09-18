'use strict';
/* api/socket/indjex.js */
const {Users} = require('./users');
//const mysql = require('mysql');
var mongoOp     =   require("./model/mongo");
const mongoose = require("mongoose");
const busboyBodyParser = require('busboy-body-parser');
let conn = mongoose.connection;
let Grid = require("gridfs-stream");
Grid.mongo = mongoose.mongo;
let gfs;

var users = new Users();
// var con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "chat"
// });

/**timer**/
  var timeout;
  var hour = 0;
  var minute = 0;
  var second = 0;

  var timeobj = {
    'hr': hour,
    'min': minute,
    'sec': second
  }

  function startime(user,io) {
    
    timeout = setTimeout(function() {
        second++;
        if (second > 59) {
            second = 0;
            minute++;
        }

        if (minute > 59) {
            second = 0;
            minute++;
            hour++;
        }
        startime(user,io);
        timeobj.hr = (hour > 9)?hour:'0'+hour;
        timeobj.min = (minute > 9)?minute:'0'+minute;
        timeobj.sec = (second > 9)?second:'0'+second;
        ////console.log(io); 
        io.to(user.room).emit('starttimer', timeobj);
        ////console.log(timeobj);
    }, 1000);
  }

  function pausetimer(user,io) {
    clearTimeout(timeout);
    io.to(user.room).emit('pausetimer', timeobj);
  }


/*
  Configure socket.io events.
*/
let bootstrap = (io) => {
  
  // connection event
  io.on('connection', (socket) => {
    
    socket.on('join', (params, callback) => {
        ////console.log(params);
        if(params.name){
          socket.username = params.name;
        }else{
          socket.username = 'toname';
        }

        if(params.fromname){
          socket.fromname = params.fromname;
        }else{
          socket.fromname = 'fromname';
        }
        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, socket.username,socket.fromname, params.room);
        socket.broadcast.to(params.room).emit('notify user', socket.username);
        socket.broadcast.to(params.room).emit('user connected', socket.username);
        var user = users.getUser(socket.id);
        
    });

    

    // disconnect event
    socket.on('disconnect', () => {
      var user = users.removeUser(socket.id);
      if(user){
        io.to(user.room).emit('user disconnected', user.name);
        hour = 0;
        minute = 0;
        second = 0;
        timeobj.hr = 0;
        timeobj.min = 0;
        timeobj.sec = 0;
        clearTimeout(timeout);
        io.to(user.room).emit('stoptimer', timeobj);
      }
    });

    // chat message event
    socket.on('chat message', (params) => {
      let timestamp = (new Date()).toISOString();
      ////console.log(params.message);
      var user = users.getUser(socket.id);
      //console.log(user);
      gfs = Grid(conn.db);
      gfs.collection('fs');
      ////console.log(user);
      // io.to(user.room).emit('chat message', {
      //   nickname: user.name,
      //   message: params.message,
      //   CreatedAt: timestamp
      // });
      // con.connect(function(err) {
      //   if (err) throw err;
      //   //console.log("Connected!");
      //   var sql = "INSERT INTO message (room, from_user,to_user) VALUES ('"+user.room+"','"+user.name+"','"+user.name+"')";
      //   con.query(sql, function (err, result) {
      //     if (err) throw err;
      //     //console.log("1 record inserted");
      //   });
      // });
      
      if(params.message == ""){
        gfs.files.find({
            "metadata.rooms": user.room
        }).toArray((err, files) => {
            mongoOp.find({room: user.room}).then((data) => {
              ////console.log(data);
              var response = [];
              if(!files || files.length === 0){
                  //res.send({data});
                  io.to(user.room).emit('chat message', {data});
              }
              
              ////console.log(files);
              for(var i=0 ; i < files.length ; i++){
                  ////console.log(files[i]);
                  response.push({"room":user.room,"msg":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
              }
              //var maindata = [];
              for(var j = 0 ; j< response.length ; j++){
                  data.push(response[j]);
              }
              ////console.log(data);
              data.sort(function(a,b){
                ////console.log(a.CreatedAt);
                // Turn your strings into dates, and then subtract them
                // to get a value that is either negative, positive, or zero.
                return new Date(a.CreatedAt) - new Date(b.CreatedAt);
              }); 
              io.to(user.room).emit('chat message', {data});
            })
          })
        }else{
          if(user){
            var db = new mongoOp();
            var response = {};
            //console.log(user);
            db.from = user.fromname;  
            db.to =  user.name;
            db.msg =  params.message;
            db.room =  user.room;
            db.msgid =  socket.id;
            db.CreatedAt = timestamp;
            ////console.log(user.room);
            //db.date =  '1/12/2017';
            db.save(function(err){
            
                if(err) {
                    response = {"error" : true,"message" : "Error adding data"};
                } else {
                    
                    //   gfs.files.find({
                    //         "metadata.rooms": user.room
                    //   }).toArray((err, files) => {
                    //     mongoOp.find({room: user.room}).then((data) => {
                    //       var response = [];
                    //       if(!files || files.length === 0){
                    //           //res.send({data});
                    //           io.to(user.room).emit('chat message', {data});
                    //       }
                          
                    //       ////console.log(files);
                    //       for(var i=0 ; i < files.length ; i++){
                    //           ////console.log(files[i]);
                    //           response.push({"room":user.room,"msg":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
                    //       }
                    //       //var maindata = [];
                    //       for(var j = 0 ; j< response.length ; j++){
                    //           data.push(response[j]);
                    //       }
                    //       //console.log(data);
                    //       data.sort(function(a,b){
                    //         ////console.log(a.CreatedAt);
                    //         // Turn your strings into dates, and then subtract them
                    //         // to get a value that is either negative, positive, or zero.
                    //         return new Date(a.CreatedAt) - new Date(b.CreatedAt);
                    //       });
                    //       io.to(user.room).emit('chat message', {data});
                          
                    //     })
                    // })
                    mongoOp.find({room: user.room}).sort({_id:-1}).limit(1).then((data) => {
                      //console.log(data);
                      io.to(user.room).emit('chat message', {data});
                    })
                    //response = {"error" : false,"message" : "Data added"};
                }
                ////console.log(response);
            });
          }
        }
      
    });



    // user typing event
    socket.on('user typing', (isTyping) => {
      ////console.log(isTyping);
      var user = users.getUser(socket.id);
      if(user){ 
        if (isTyping === true) {
          socket.broadcast.to(user.room).emit('user typing', {
            nickname: user.name,
            isTyping: true
          });
        } else {
         socket.broadcast.to(user.room).emit('user typing', {
            nickname: user.name,
            isTyping: false
          });
        }
      }
    });

    
    socket.on('newdata', function(data) {
      var user = users.getUser(socket.id);
      io.to(user.room).emit('newdata', data);
    });

    socket.on('starttimer', function(data) {
      var user = users.getUser(socket.id);
      startime(user,io);
    });  

    socket.on('pausetimer', function(data) {
        var user = users.getUser(socket.id);
        pausetimer(user,io);
    });

    socket.on('stoptimer', function(data) {
      var user = users.getUser(socket.id);
      if(user){
        hour = 0;
        minute = 0;
        second = 0;
        timeobj.hr = 0;
        timeobj.min = 0;
        timeobj.sec = 0;
        clearTimeout(timeout);
        io.to(user.room).emit('stoptimer', timeobj);
      }
    });
    /***tmerend**/
  });
};
module.exports = {
  bootstrap: bootstrap
};
