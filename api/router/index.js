'use strict';
var appRoot = require('app-root-path');
var bodyParser = require('body-parser');
var mongoOp     =   require("../socket/model/mongo");
const fs = require('fs');
const request = require('request');
const mongoose = require("mongoose");
const busboyBodyParser = require('busboy-body-parser');
let conn = mongoose.connection;
let Grid = require("gridfs-stream");
Grid.mongo = mongoose.mongo;
let gfs;
/* api/router/index.js */

/*
  Bootstrap routes on main express app.
*/
let bootstrap = (app) => {
    // for parsing application/json
    app.use(bodyParser.json()); 

    // for parsing application/xwww-
    app.use(bodyParser.urlencoded({ extended: true })); 
    //form-urlencoded

    app.use(busboyBodyParser({ limit: '10mb' }));

    app.use(function(req, res, next) { //allow cross origin requests
        res.header("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
        res.header("Access-Control-Allow-Origin", '*');
        res.header("Access-Control-Allow-Headers","Authorization , Pragma, Content-Type, Content-Range, Content-Disposition, Content-Description , Cache-Control , Expires , userType , userId , accessToken , Process-Data");
        //res.header("Access-Control-Allow-Credentials", true);
        next();
    });

    app.get('/:id', function(req, res){
        res.sendFile(appRoot + '/index.html');
    });

    app.get('/show/showdt/:id/:skip/:limit', function(req, res) {
   
        var id = req.params.id;
        var skips = parseInt(req.params.skip);
        var limits = parseInt(req.params.limit);
        
        var response = {};
        
        mongoOp.find({room: id}).skip(skips).limit(limits).then((data) => {
            res.send({data});
        }).catch((e) => {
            res.status(400).send();
        });
    

    
    });

    app.post('/show/messagelist', function(req, res) {
        var db = new mongoOp();
        gfs = Grid(conn.db);
        gfs.collection('fs');
        var id = req.body.id;
        // var skips = parseInt(req.body.skip);
        // var limits = 5;
        // //console.log(req.body);
        
        
        // mongoOp.find({room: id}).skip(skips).limit(limits).then((data) => {
        //     res.send({data});
        // }).catch((e) => {
        //     res.status(400).send();
        // });
        gfs.files.find({
                "metadata.rooms": id
            }).toArray((err, files) => {
                
                mongoOp.find({room: id}).then((data) => {
                    if(!files || files.length === 0){
                        res.send({data});
                    }
                    var response = [];
                    for(var i=0 ; i < files.length ; i++){
                        response.push({"room":id,"msg":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
                    }
                    
                    for(var j = 0 ; j< response.length ; j++){
                        data.push(response[j]); 
                    }
                    
                    data.sort(function(a,b){
                        
                        return new Date(a.CreatedAt) - new Date(b.CreatedAt);
                    });
                    ////console.log(data);
                    res.send({data});
                });
                ////console.log(files);
                
            });
        // mongoOp.find({room: id}).then((data) => {
        //     res.send({data});
        //     gfs.files.find({
        //         "metadata.rooms": id
        //     }).toArray((err, files) => {
        //         var response = [];
        //         if(!files || files.length === 0){
        //             res.send({data});
        //         }
                
        //         ////console.log(files);
        //         for(var i=0 ; i < files.length ; i++){
        //             ////console.log(files[i]);
        //             response.push({"room":id,"msg":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
        //         }
        //         //var maindata = [];
        //         for(var j = 0 ; j< response.length ; j++){
        //             data.push(response[j]);
        //         }
        //         res.send({data});
                
        //     });
            
            
        // }).catch((e) => {
        //     res.status(400).send();
        // });
    

    
    });

    app.get('/show/showdt/:id', function(req, res) {
    
        var id = req.params.id;
        
        var response = {};
        
        mongoOp.find({room: id}).then((data) => {
            res.send({data});
        }).catch((e) => {
            res.status(400).send();
        });
    });

    app.post('/message/img', (req, res) => {
        //res.send({req});
        ////console.log(req);
        let timestamp = (new Date()).toISOString();
        gfs = Grid(conn.db)
        let from = req.body.fromname;  
        let to =  req.body.name;
        let room =  req.body.room;
      
        let part = req.files.file;
        let writeStream = gfs.createWriteStream({
            //workerid:req.body.workerid,
            filename: 'img_'+Date.now()+'_' + part.name,
            mode: 'w',
            content_type: part.mimetype,
            metadata:{'rooms':room,'from':from,'to':to,'CreatedAt':timestamp}
        });

        writeStream.on('close', (file) => {
          // checking for file
          if(!file) {
            res.status(400).send('No file received');
          }
            // return res.status(200).send({
            //     message: 'Success',
            //     file: file
            // });
            gfs.files.find({"metadata.rooms": room}).sort({_id:-1}).limit(1).toArray((err, files) => {
                
                if(!files || files.length === 0){
                    res.status(400).send('No file received');
                }
                ////console.log(files[0]);
                files = files[0];
                var response = [];
                // var l = (files.length) - 1;
                // for(var i=0 ; i < files.length ; i++){
                //     response.push({"room":room,"msg":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
                // }
                
                // for(var j = 0 ; j< response.length ; j++){
                //     data.push(response[j]); 
                // }
                response.push({"room":room,"msg":files.filename,"from":files.metadata.from,"to":files.metadata.to,"CreatedAt":files.metadata.CreatedAt});
                
                res.send({response});
                
            });
        });
        // using callbacks is important !
        // writeStream should end the operation once all data is written to the DB 
        writeStream.write(part.data, () => {
          writeStream.end();
        });  
    });

    app.get('/file/:room', function(req, res){
        gfs = Grid(conn.db);
        gfs.collection('fs');
        let room = req.params.room;
        ////console.log(req.params.filename);
        gfs.files.find({
            "metadata.rooms": room
        }).toArray((err, files) => {

            if(!files || files.length === 0){
                return res.status(404).json({
                    responseCode: 1,
                    responseMessage: "error"
                });
            }
            var response = [];
            ////console.log(files);
            for(var i=0 ; i < files.length ; i++){
                ////console.log(files[i]);
                response.push({"filename":files[i].filename,"from":files[i].metadata.from,"to":files[i].metadata.to,"CreatedAt":files[i].metadata.CreatedAt});
            }
            res.send(response);
            // var response = {};
            // response = {"from":metadata.from,"to":metadata.to,"CreatedAt":metadata.CreatedAt}
            
            
            // var readstream = gfs.createReadStream({
            //     filename: files[0].filename,
            //     root: "fs"
            // });
            
            // res.set('Content-Type', files[0].contentType)
            
            // return readstream.pipe(res);
        });
    });

    app.get('/file/:room/:filename', function(req, res){
        gfs = Grid(conn.db);
        gfs.collection('fs');
        let room = req.params.room;
        ////console.log(req.params.filename);
        gfs.files.find({
            filename:req.params.filename,"metadata.rooms": room
        }).toArray((err, files) => {

            if(!files || files.length === 0){
                return res.status(404).json({
                    responseCode: 1,
                    responseMessage: "error"
                });
            }
            
            var readstream = gfs.createReadStream({
                filename: files[0].filename,
                root: "fs"
            });

            res.set('Content-Type', files[0].contentType);
            readstream.pipe(res);

            
        });
    });
    
};

module.exports = {
  bootstrap: bootstrap
};
