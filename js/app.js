"use strict"

var pouchToCouch = angular.module('pouchToCouch', []);

pouchToCouch.controller('PouchToCouchController', function PouchToCouchController($scope) {
	var db = {};
	var replicationStatus = 'UNKNOWN';
	var couchUrl = 'http://localhost:5984/pouchdemo';
	var interval;

	$scope.users = {};
	$scope.userFilter = '';

	var replicationOptions = {
		    continuous: false,
		    attachments: false,
		    complete: function(err, res) {
		    	if (err) {
		    		logError(err);
		      		updateStatus('DISCONNECTED');
		      	} else {
		      		updateStatus('CONNECTED');
 					refreshList();
 				}
		  	}
		};

	var replicate = function() {
		//replicate to couch
		PouchDB.replicate(db, couchUrl, function(err, res) {
			logError(err);
			//replicate back from couch
			PouchDB.replicate(couchUrl, db, replicationOptions);
		});
	}

	$scope.login = function() {
		if ($scope.name) {
			$scope.loggedIn = true;
		}
		PouchDB.destroy('pouchdemo', function(err, info) { 
			db = new PouchDB('pouchdemo' + $scope.name, function(err) {
				logError(err);
				refreshList();
				interval = setInterval(sync, 3000);
			});
		});
	};


	var sync = function() {
			console.log("syncing");
			updateStatus('REFRESH');
			replicate();
		};

	var refreshList = function() {
			// 	var filterQuery = function(doc) {		
			// 	if (doc.from === 'fred') 
			// 		{
			// 			emit(doc.time, doc);
			// 		}
			// };
			 // db.query(filterQuery, {include_docs: true}, function(err, result) {
				// logError(err);
				// if (result) {
				// 	refreshView(result);
				// }
	   		//    		});
			db.allDocs({include_docs: true, descending: true}, function(err, result) {
				logError(err);
				if (result) {
					refreshView(result);
				}
	   		});
	};

	var refreshView = function(result) {

		console.log('updating model from local db' + result.rows);
		var restartInterval = false;
		//remove messages which are probably already being deleted
		result.rows = _.filter(result.rows, function(msg){
			var existingMessage = _.find($scope.messages, function(m) {
				return m._id === msg.doc._id;
			});
			var updateThisRow = !existingMessage || !(existingMessage.hasOwnProperty('deleted') && existingMessage.hasOwnProperty('notSynced'));
			return updateThisRow;
		});
		$scope.messages = _.chain(result.rows).map(function(msg) {
		 						var cloned = cloneMessage(msg.doc);
								return cloned;
		 					}).sortBy(function(msg) {
				 				return Date.parse(msg.time)
				 			}).value();
		$scope.$apply();
	};


	var cloneMessage = function(msg) {
		var clone = {_id : msg._id,
				from: msg.from,
				content: msg.content,
			  	time: msg.time
			  };
			  	//only add revision if it exists
		if (msg._rev) {
			clone._rev = msg._rev;
		}
		return clone;
	};

	var logError = function(err) {
			if (err) {
				console.log(err);
			}
		};

	$scope.addText = function() {
		if (!$scope.message) {return;}

		var textEntry = {
			_id : String(new Date().getTime()),
		  	from: $scope.name,
		  	content: $scope.message,
		  	time: new Date(),
		}; 

		$scope.message = '';

		//make a copy for the view
		var viewEntry = cloneMessage(textEntry);
		viewEntry.notSynced = true;
		$scope.messages.push(viewEntry);

		//push the actual document
		console.log('updating messages model');
		db.put(textEntry, function(err, result) {
		    if (result) {
		      	console.log("document stored in pouch");
		    } else {
		    	console.log(err);
		    }
		});
	};

	$scope.delete = function(id, rev) {
		$scope.messages = _.map($scope.messages, function(m) {
							if (m._id === id) {
								m.deleted = true;
								m.notSynced = true;
							}
							return m;
						});

		db.remove(id, rev, logError);
	};

	var updateStatus = function(status) {
		if (status === 'REFRESH') {
			$scope.connectionStyle = function() {return {color: 'black'};};
		} else if (status === 'CONNECTED') {
			$scope.connectionStyle = function() {return {color: 'red'};};
			$scope.connected = true;
		} else if (status === 'DISCONNECTED') {
			$scope.connectionStyle = function() {return {color: 'DarkGray'};};
			$scope.connected = false;
		}
		$scope.$apply();
	};
});
