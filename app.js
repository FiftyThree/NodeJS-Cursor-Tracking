
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    io = require('socket.io');

var app = module.exports = express.createServer(),
    io = io.listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

// Messages

var totalUsers = 0,
    stepID = 0,
    friendsGroup = [];
    usersGroup = [];

io.sockets.on('connection', function (socket) {
  console.log('woo hoo! about to perform socket setup')
  // new id
  var thisID = getID();
  // step users++
  addUser();
  // new connection ALL
  io.sockets.emit('connected', { connections: totalUsers });
  // new connection friends
  socket.broadcast.emit('new friend', { friend: thisID  });
  // new connection self
  socket.emit('init',{ player:thisID, friends: friendsGroup });
  // disconnect friends
  socket.on('disconnect', function (){
      removeUser(thisID);
      socket.broadcast.emit('bye friend',{connections:totalUsers, friend: thisID});
  });
  // mouse move
  socket.on('move', function(data){
      socket.broadcast.emit('move', data);
  });
  // mouse click
  socket.on('click', function(data){
      // console.log('click data', data);

      // Check data.userId against list of drivers; only pass if isDriver = true;
      // console.log('usersGroup from click', data);
      var shouldPostClick = isUserDriving(thisID, data.userId);
      console.log('shouldPostClick', shouldPostClick);
      if (shouldPostClick) {
        socket.broadcast.emit('click', data);
      }
  });
// mouse click
  socket.on('sendUserId', function(data){
      // console.log('sendUserId data', data )
      console.log('thisID', thisID);
      setUserID(thisID, data.userId);
  });
// change in who's driving
  socket.on('updateDriver', function(data){
      // console.log('updateDriver', thisID);
      // console.log('with data', data);
      checkUserDriver(thisID, data.userId);
      // updateDriver 1
      // with data { friend: 6, userId: '7117854', isDriver: true }

      // setUserID(thisID, data.userId);
  });
  //console.log(friendsGroup);
});

// Functions

function getID() {
    friendsGroup.push(++stepID);
    return stepID;
}

function setUserID(thisID, userID) {
    var player = {playerID: thisID, userID: userID}
    usersGroup.push(player);
    console.log('usersGroup', usersGroup);
}

function checkUserDriver(thisID, userID) {
  console.log('checkUserDriver userID', userID.toString())
  // Find and remove item from an array
  //  var i = usersGroup.indexOf(userID);

  // function findUserId(users, id) {
  //     return users.userId === id;
  // }

  // console.log('usersGroup find', usersGroup.find( findUserId(userId) ));

  usersGroup.forEach(function(element, index) {

      // console.log('element.userID', element.userID)

      if (element.userID === userID.toString()) {
        // console.log('found at index', index)
        var newDriver = {playerID: thisID, userID: userID, isDriver: true}
        usersGroup.splice(index, 1, newDriver);

      } else {
        var newDriver = {playerID: element.playerID, userID: element.userID, isDriver: false}
        usersGroup.splice(index, 1, newDriver);
      }

  });

  console.log('final usersGroup', usersGroup);
  // console.log('i', i);

  // if(i != -1) {
  //   if (usersGroup[i].isDriver) {
  //     console.log('user found and is driver')
  //   } else {
  //     console.log('user found, but not driver')
  //   }
  //   // array.splice(i, 1);
  // }

}

function isUserDriving(thisID, userID) {
  // console.log('checkUserDriver userID', userID.toString())

  var foundDriver = false;

  usersGroup.some(function(element, index) {
      console.log('element.userID', element.userID.toString())

      if (element.userID.toString() === userID && element.isDriver) {
        console.log('user is driving at index', index)
        // var newDriver = {playerID: thisID, userID: userID, isDriver: true}
        // usersGroup.splice(index, 1, newDriver);
        foundDriver = true;
        return true;
      }

      // else {
      //   return false;
      // }

  });

  console.log('foundDriver', foundDriver);
  return foundDriver;

}


function addUser(){
    totalUsers++;
}

function removeUser(thisID){
    friendsGroup = removeFromArray(thisID,friendsGroup);
    totalUsers--;
}

// Helpers

function removeFromArray(string, array) {
  var i = 0;
  for(i in array){
    if(array[i] === string){
      array.splice(i,1);
    }
  }
  return array;
}


app.listen( process.env.PORT || 3000 );
//console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
