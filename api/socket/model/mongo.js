
var mongoose    =   require("mongoose");
mongoose.connect('mongodb://localhost:27017/chatDb');
// create instance of Schema
var mongoSchema =   mongoose.Schema;
// create schema
var userSchema  = {
	"msgid":{"type":String,"trim":true,"default":''},
    "from" : {"type":String,"trim":true,"default":''},
    "to":{"type":String,"trim":true,"default":''},
    "msg" : {"type":String,"trim":true,"default":''},
    "room" : {"type":String,"trim":true,"default":''},
    "CreatedAt":{"type":String,"default":Date.now}
};
// create model if not exists.
module.exports = mongoose.model('chat',userSchema);