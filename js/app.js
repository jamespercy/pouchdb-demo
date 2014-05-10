"use strict"

var pouchToCouch = angular.module('pouchToCouch', []);

pouchToCouch.controller('PouchToCouchController', function PouchToCouchController($scope) {
	var db = {};
	var replicationStatus = 'UNKNOWN';
	var couchUrl = 'http://localhost:5984/pouchdemo';
	$scope.users = {};
	$scope.userFilter = '';

	var replicationOptions = {
		    continuous: false,
		    attachments: false,
		    complete: function(err, res) {
		    	if (err) {
		      		updateStatus('DISCONNECTED');
		      	} else {
		      		updateStatus('CONNECTED');
		      		//update all docs status to synced
					db.allDocs({include_docs: true, descending: true}, function(err, doc) {
						_.each(doc.rows, function(msg) {
							$scope.users[msg.doc.from] = msg.doc.from;
							if (!msg.doc.synced) {
								msg.doc.synced = true;
								$scope.users[msg.doc.from] = true;
								db.put(msg.doc);
						 	}
						});
			  		});
		      	}
		  	}
		};

	$scope.login = function() {
		if ($scope.name) {
			$scope.loggedIn = true;
		}
		PouchDB.destroy('pouchdemo', function(err, info) { 
			db = new PouchDB('pouchdemo' + $scope.name, {complete: function() {refreshList()}});
		});

		//set timer to periodically sync pouch and couch
		setInterval(sync, 2000);
	};

	var sync = function() {
			updateStatus('REFRESH');
			//fetch remote docuemnts
			PouchDB.replicate(couchUrl, db, replicationOptions);

			//replicate local documents
			PouchDB.replicate(db, couchUrl, replicationOptions);
			refreshList();
		};

	var refreshList = function() {
		db.allDocs({include_docs: true, descending: true}, function(err, doc) {
			$scope.messages = doc.rows;
  		});
	};

	$scope.addText = function() {
		if (!$scope.message) {return;}

		  var textEntry = {
		  	from: $scope.name,
		  	content: $scope.message,
		  	time: new Date(),
		  	synced: false
		  }; 

		 db.post(textEntry, function callback(err, result) {
		    if (result) {
		      	console.log("document stored in pouch");
		      	$scope.message = '';
		      	refreshList();
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
