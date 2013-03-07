var gtty = {
	_config: {
		parseId: '7Q1tYT4F1vItcXOceW3CY9wLi0zKkUcMkOJJs0yj',
		parseSecret: 'pe5A8m1Pebn0xfLi1oeBhvdkTiHBHYd0s21QdlkK',
		facebookId: '446923285377787',
		facebookNamespace: 'mozilla-dev',
		facebookPermissions: 'email,user_photos',
		soundcloudId: '2e5fbc52194941846c664a23bf45cc16'
	},
	init: {
		parse: function parse(callback){
			Parse.initialize(gtty._config.parseId, gtty._config.parseSecret);
			callback();
		},
		facebook: function facebook(){
			window.fbAsyncInit = function() {
				Parse.FacebookUtils.init({
					appId      : gtty._config.facebookId, // App ID from the App Dashboard
					status     : true, // check the login status upon init?
					cookie     : true, // set sessions cookies to allow your server to access the session?
					xfbml      : true  // parse XFBML tags on this page?
				});
				FB.getLoginStatus(function(response) {
					if (response.status === 'connected') {
						gtty.user.logins({
							facebook: true,
							youtube: true,
							soundcloud: true
						});
					} else {
						gtty.user.logins({
							facebook: true,
							youtube: false,
							soundcloud: false
						});
					}
				});
			}
		},
		soundcloud: function soundcloud(){
			SC.initialize({
				client_id: gtty._config.soundcloudId
			});
		}
	},
	getData: {},
	finalData: {name: "root", value: 1},
	get: function(object, callback){
		this.getData = {};
		if(object.facebook != 'me'){
			return false;
		}
		var facebookDone = false;
		var youtubeDone = false;
		var soundcloudDone = false;
		gtty.user.facebook.getPhotos(object.facebook, function(){
			facebookDone = true;
			ensureCallback();
		});
		gtty.user.youtube.getUserVideos(object.youtube, function(){
			youtubeDone = true;
			ensureCallback();
		});
		gtty.user.soundcloud.getUserData(object.soundcloud, function(){
			soundcloudDone = true;
			ensureCallback();
		});
		function ensureCallback(){
			if(facebookDone === true && youtubeDone === true && soundcloudDone === true){
				gtty.finalData = {name: "root", value: 10};
				gtty.parseData(gtty.getData, gtty.finalData);
				callback(gtty.finalData);	
			}		
		}
	},
	user: {
		logins: function(object){
			if(object.facebook === true){
				$('.gtty-facebook').show();
			} else {
				$('.gtty-facebook').hide();
			}
			if(object.youtube === true){
				$('.gtty-youtube').show();
			} else {
				$('.gtty-youtube').hide();
			}
			if(object.soundcloud === true){
				$('.gtty-soundcloud').show();
			} else {
				$('.gtty-soundcloud').hide();
			}
		},
		facebook: {
			connect: function connect(){
				var _this = this;
				Parse.FacebookUtils.logIn(gtty._config.facebookPermissions, {
					success: function(user) {
						if (!user.existed()) {
							console.log("User signed up and logged in through Facebook!");
							_this.getUserData();
						} else {
							console.log("User logged in through Facebook!");
						}
						gtty.user.logins({
							facebook: false,
							youtube: true,
							soundcloud: true
						});
					},
					error: function(user, error) {
						console.log("User cancelled the Facebook login or did not fully authorize.");
					}
				});
			},
			getUserData: function getUserData(){
				var _this = this;
				FB.api('/me', function(response) {
					_this.saveUserData(response);
				});
			},
			saveUserData: function saveUserData(userData){
				var user = Parse.User.current();
				user.set("name", userData.name);
				user.set("firstname", userData.first_name);
				user.set("lastname", userData.last_name);
				user.set("email", userData.email);
				user.setACL(new Parse.ACL(Parse.User.current()));
				user.save(null, {
					success: function(user) {
						console.log("Userdata saved to Parse");
					},
					error: function(user, error) {
						console.log("Userdata failed to save");
					}
				});
			},
			getPhotos: function getPhotos(user, callback){
				fbuser = Parse.User.current();
				FB.api(user + '/photos?access_token=' + fbuser.attributes.authData.facebook.access_token, function(response){
					gtty.getData.facebook = response;
					callback();
				});
			}
		},
		youtube: {
			getUserData: function getUserData(username, callback){
				var _this = this;
				var url = "http://gdata.youtube.com/feeds/api/users/" + username + "?v=2&alt=json";

				$.ajax({
					url: url,
					success: function(data){
						gtty.getData.youtube = data;
						callback();
					},
					dataType: 'json'
				});
			},
			processUserData: function processUserData(data, textStatus, jqXHR){
				console.log(data);
			},
			getUserVideos: function getUserVideos(username, callback){
				var _this = this;
				var url = "http://gdata.youtube.com/feeds/api/users/" + username + "/uploads?v=2&alt=json";

				$.ajax({
					url: url,
					success: function(data){
						gtty.getData.youtube = data;
						callback();
					},
					dataType: 'json'
				});
			},
			saveUserData: function(userData){
				var user = Parse.User.current();
				user.set("youtube", userData.username);
				user.save(null, {
					success: function(user) {
						console.log("Userdata saved to Parse");
					},
					error: function(user, error) {
						console.log("Userdata failed to save");
					}
				});
			}
		},
		soundcloud: {
			streamSong: function streamSong(trackId){
				SC.stream("/tracks/" + trackId, {
					autoPlay: true
				});
			},
			findUser: function findUser(name){
				SC.get('/users', { q: name, username: name}, function(users) {
					console.log(users);
				});
			},
			getUserData: function getUserData(userId, callback){
				SC.get('/users/' + userId + '/tracks', function(user) {
					gtty.getData.soundcloud = user;
					callback();
				});
			},
			saveUserData: function(userData){
				var user = Parse.User.current();
				user.set("soundcloud", userData.username);
				user.save(null, {
					success: function(user) {
						console.log("Userdata saved to Parse");
					},
					error: function(user, error) {
						console.log("Userdata failed to save");
					}
				});
			}
		}
	},
	detect: function detect(string){
		var returnString = string;
		var imgRegex = new RegExp(/(http(?:s)?:\/\/.*\.(?:png|jpg|gif))/i);
		var youtubeRegex = new RegExp(/(http(?:s)?:\/\/.*(?:youtube\.com))/i);
		var soundcloudRegex = new RegExp(/(http(?:s)?:\/\/.*(?:api\.soundcloud\.com)\/(?:tracks)\/)/i);
		if(imgRegex.test(returnString) === true){
			returnString = '<img width="100%" src="' + returnString + '" />';
		} else if(youtubeRegex.test(returnString) === true){
			returnString = '<iframe width="100%" height="100%" src="' + returnString + '"></iframe>';
		} else if (soundcloudRegex.test(returnString) === true){
			returnString = '<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=' + returnString + '"></iframe>';
		}
		return returnString;
	},
	parseData: function parseData(parent, object){
		if(!object){
			object = {name: "root", value: 1};
		}
		if(typeof parent === 'object'){
			var children = [];
			Object.keys(parent).forEach(function(key){
				var child = {name: key}; //creates the name [for the top 1.1KEY]
				if(parent[key] != null){
					parseData(parent[key], child); //start function again - for the subObj of the response (1.1VALUE)
					console.log(child.name, child.value);
					children.push(child); // pushes the child into the array
				}
				// Next time, the object is (e.g) - {name: friends}
				
			});
			object.children = children; // pushes the {name: friends} into the current object...
			// next time round, it pushes {name: data}  into the new object - but on the children level
		} else {
			object.data = gtty.detect(parent);
			object.value = 1;
		}
		return object;
	}
}

gtty.init.parse(function(){
	gtty.init.facebook();
	gtty.init.soundcloud();
});
