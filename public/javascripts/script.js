(function($){

    var socket = io.connect(document.location.origin);

    // Player

    var Player = function(id) {
        this.id = id;
        this.x  = 0;
        this.y  = 0;
        this.name = '';
        this.init();
    };

    Player.prototype = function(){
        var init = function(){
            bind.call(this);
        },
        bind = function(){
            $(document).on( 'mousemove', {PlayerObj:this},(function(event) {
                var player = event.data.PlayerObj;
                player.x = ((event.pageX / $(window).width()) * 100).toFixed(2);
                player.y = ((event.pageY / $(window).height()) * 100).toFixed(2);
                socket.emit('move',{ friend: player.id, friendX: player.x, friendY: player.y});
            }));

            $(document).on( 'click', {PlayerObj:this}, (function(event) {
                var player = event.data.PlayerObj;
                // var selector = $(event.target).attr('class');
                var selector = $(event.target).attr('data-element'); // older-style, but OK for now
                console.log('emitting click', selector);
                socket.emit('click',{ friend: player.id, elementToClick: selector });
            }));


            $( "[data-element='button2']" ).click(function() {
                $( "div.hideable" ).toggleClass('hidden');
                // alert( "Handler for .click() called." );
            });
        };

        return {
            init: init
        };
    }();

    // Friends

    var Friends  = function() {
        this.friends = {};
    };

    Friends.prototype = function(){
        var add = function(friend) {
                var label = doLabel.call(this,friend.id);
                this.friends[label] = friend;
            },
            remove = function(id){
                var label = doLabel.call(this,id);
                if ( this.friends[label] ) {
                    this.friends[label].remove();
                    delete(this.friends[label]);
                }
            },
            update = function(data) {
                var label = doLabel.call(this,data.friend);
                if ( this.friends[label] ) {
                    this.friends[label].update(data.friendX,data.friendY);
                }
            },
            click = function(data) {
                var label = doLabel.call(this,data.friend);
                if ( this.friends[label] ) {
                    this.friends[label].click(data.elementToClick, data.friend);
                }
            },
            doLabel = function(id){
                return 'friend-'+id;
            };
        return {
            add: add,
            remove: remove,
            update: update,
            click: click
        };
    }();

    // Friend

    var Friend = function(id) {
        this.id = id;
        this.x  = 0;
        this.y  = 0;
        this.dx = 0;
        this.dy = 0;
        this.idx = 'friend-'+id;
        this.name = '';
        this.element = false;
        this.init();
        this.elementToClick = null;
    };

    Friend.prototype = function(){
        var init = function() {
            if  ( check.call(this) === true ) {
                return false;
            }
        },
        create = function() {
            this.element = $('<div/>').attr('id',this.idx).addClass('friend').hide().appendTo('body').fadeIn();
        },
        remove = function() {
            if ( this.element ){
                this.element.fadeOut('200',function(){
                    $(this).remove();
                });
            }
        },
        check = function(){
            if ( $('#'+this.idx).length > 0 ) {
                return true;
            }
            create.call(this);
            return false;
        },
        update = function(x,y) {
            this.element.css({'left':x+'%','top':y+'%'});
        },
        click = function(elementToClick, id) {
            // .data("id")
            var clickableElement =  `[data-element='${elementToClick}']`;
            console.log('synthetically clicking', clickableElement);
            console.log('via player', id);

            // This will send and receive forever across all connected players
            // without some concept of who's broadcasting and who's listening
            // (see below for playerId check):
            if (elementToClick) { $( clickableElement ).trigger( "click" ); }
        };
        return {
            init: init,
            remove: remove,
            update: update,
            click: click
        };
    }();

    // Functions

    var Meeting = function(socket) {
        this.player = false;
        this.friends = new Friends();
        this.init();
    };

    Meeting.prototype = function(){
        var init = function(){
                bind.call(this);
            },
            bind = function(){
                var self = this;

                // Initalize connected
                socket.on('connected', function (data) {
                    updateTotalConnections(data.connections);
                });

                // Create player and friends
                socket.on('init', function (data) {
                    $.each(data.friends,function(index,item){
                        createFriend.call(self,item,data.player);
                    });
                    self.player = new Player(data.player);
                });

                // New friend
                socket.on('new friend', function (data) {
                    createFriend.call(self,data.friend);
                });

                // Friend gone
                socket.on('bye friend', function (data) {
                    updateTotalConnections(data.connections);
                    removeFriend.call(self,data.friend);
                });

                // Friend move
                socket.on('move', function (data) {
                    self.friends.update(data);
                });

                // Handle inbound clicks from friends:
                socket.on('click', function (data) {
                    var friendIds = []

                    $.each(self.friends, function(key, value){
                        if (key === 'friends') {
                            // console.log( key, value );

                            $.each(value, function(k, v) {
                                friendIds.push(v.id);
                            });
                        }
                    });

                    // console.log('friend IDs', friendIds);
                    // console.log('player ID', self.player.id);
                    // console.log('data friend', data.friend);
                    // Only do anything with the click if it's from the 'friend' with the
                    // the lowest index among all participants (including yourself):

                    // assumes friendIds is already in ascending order:
                    // console.log('friendIds', friendIds)
                    // console.log('data.friend', data.friend)
                    if (friendIds[0] === data.friend && self.player.id > data.friend) {
                        console.log('passing click into friends function');
                        self.friends.click(data);
                    }
                });

            },
            createFriend = function(id,player){
                if ( player && player == id ) {
                    return;
                }
                var friend = new Friend(id);
                if (friend) {
                    this.friends.add(friend);
                }
            },
            removeFriend = function(id) {
                this.friends.remove(id);
            },
            updateTotalConnections = function(total){
                $('#connections').html(total);
            };
        return {
            init: init
        };
    }();

    var app = new Meeting(socket);

})(jQuery);
