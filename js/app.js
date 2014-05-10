"use strict"

var pouchToCouch = angular.module('pouchToCouch', []);

pouchToCouch.controller('PouchToCouchController', function PouchToCouchController($scope) {
	var db = {};
	var replicationStatus = 'UNKNOWN';
	var couchUrl = 'http://localhost:5984/pouchdemo';
	$scope.querying = false;

	var timer = {};

	$scope.users = {};
	$scope.userFilter = '';

	var replicationOptions = {
		    continuous: false,
		    attachments: false,
		    complete: function(err, res) {
		    	if (err) {
		      		updateStatus('DISCONNECTED');
		      		$scope.refreshList();
		      	} else {
		      		updateStatus('CONNECTED');
					db.allDocs({include_docs: true, descending: true}, function(err, doc) {
 						_.each(doc.rows, function(msg) {
							$scope.users[msg.doc.from] = msg.doc.from;
							if (msg.doc.synced === false) {
								msg.doc.synced = true;
								db.put(msg.doc);
							}	
 						});
 						$scope.refreshList();
 			  		});
		      	}
		  	}
		};

	var replicate = function() {
			PouchDB.replicate(couchUrl, db, replicationOptions);
			PouchDB.replicate(db, couchUrl, replicationOptions);
	}

	$scope.login = function() {
		if ($scope.name) {
			$scope.loggedIn = true;
		}
		PouchDB.destroy('pouchdemo', function(err, info) { 
			db = new PouchDB('pouchdemo' + $scope.name, {complete: function() {$scope.refreshList()}});
			
		});
		setBusy(false);
	};

	var setBusy = function(busy) {
		$scope.querying = busy;
		if (!busy) {
			if (timer.length) {
				console.log("clearing timer" + timer)
				clearTimeout(timer);
			}
			timer = setTimeout(sync, 2000);
			console.log("started timer" + timer)
		}
	}

	var sync = function() {
			console.log("timer fired" + timer)
			updateStatus('REFRESH');
			replicate();
		};

	$scope.refreshList = function() {
			var userFilter = $scope.userFilter;

			console.log('querying ' + $scope.querying);
			if (!$scope.querying) {
				setBusy(true);
				// 				var filterQuery = function(doc) {		
				// 	if (doc.from === 'fred') 
				// 		{
				// 			emit(doc.time, doc);
				// 		}
				// };
				 // db.query(filterQuery, {include_docs: true}, function(err, result) {
				 //        if(!err) {
				 //        	console.log('updating model from query ' + result.rows);
				 //        	$scope.messages = result.rows;
				 //        } else {
				 //        	console.log(err);
				 //        }
				 //        setBusy(false);
		   		//    		});
	
				reloadLocal();
			}
	};

	var reloadLocal = function() {
			db.allDocs({include_docs: true, descending: true}, function(err, result) {
				if (err) {
					console.log(err);
				} else {
					console.log('updating model from local db' + result.rows);
		 			$scope.messages = _.sortBy(result.rows, function(msg) {
		 				return Date.parse(msg.doc.time);
		 			});
	 			}
	 			setBusy(false);
	   		});
	};

	$scope.addText = function() {
		if (!$scope.message) {return;}
		  setBusy(true);
		  var textEntry = {
		  	from: $scope.name,
		  	content: $scope.message,
		  	time: new Date(),
		  	synced: false
		  }; 
		  console.log('updating messages model');
		 db.post(textEntry, function callback(err, result) {
		 	setBusy(false);
		    if (result) {
		      	console.log("document stored in pouch");
		      	$scope.message = '';
		      	$scope.refreshList();
		    } else {
		    	console.log(err);
		    }
		});
	};

	$scope.delete = function(msg) {
		setBusy(true);
		db.remove(msg.doc, function(err, response) { 
			if (err) {
				console.log(err);
			} else {
				reloadLocal();
			}
		});
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
