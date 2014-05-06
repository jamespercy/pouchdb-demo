"use strict"

var app = {
	replicationStatus: 'UNKNOWN',
	couchUrl: 'http://localhost:5984/pouchdemo',
	replicationOptions: {
		    continuous: false,
		    attachments: false,
		    complete: function(err, res) {
		    	if (err) {
		      		app.updateStatus('DISCONNECTED');
		      	} else {
		      		app.updateStatus('CONNECTED');
		    	   	// console.log('replication done');
		      	}
		  	}
		},

	init: function() {
		PouchDB.destroy('pouchdemo', function(err, info) { 
			app.db = new PouchDB('pouchdemo', {complete: function() {app.refreshList()}});
		});
		app.addButton = document.querySelector('#add-button');
		app.textInput = document.querySelector('#text-input');
		app.resultList = document.querySelector('#result-list');
		app.addButton.addEventListener('click', app.addText, false);

		//set timer to periodically sync pouch and couch
		setInterval(app.sync, 2000);
	},

	sync: function() {
			//fetch remote docuemnts
			PouchDB.replicate(app.couchUrl,app.db, app.replicationOptions);

			//replicate local documents
			PouchDB.replicate(app.db, app.couchUrl, app.replicationOptions);
			app.refreshList();
		},

	addText: function() {
		  var textEntry = {_id: String((new Date()).getTime()), content: app.textInput.value };

		  if (!textEntry.content) {return;}

		 app.db.put(textEntry, function callback(err, result) {
		    if (err) {
		    	console.log(err);
		    }
		    if (result) {
		      	console.log("document stored in pouch");
		      	app.textInput.value = '';
		      	app.refreshList();
		    }
		});
	},

	refreshList: function() {
		app.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
			app.resultList.innerHTML = '';
    		for (var item in doc.rows) {
    			var li = document.createElement('li');
    			var textSpan = document.createElement('span');
    			textSpan.textContent = doc.rows[item].doc.content;
    			var input = document.createElement('input');
    			input.type = 'button';
    			input.value = 'Delete (id=' + doc.rows[item].doc._id + ')';
    			input.setAttribute('data-id', doc.rows[item].doc._id);

    			li.appendChild(textSpan);
    			li.appendChild(input);
    			app.resultList.appendChild(li);
    		}
  		});
	},
	updateStatus: function(status) {
		app.replicationStatus = status;
		var statusSpan = document.querySelector('#status-indicator');
		statusSpan.textContent = status;
	}
};

window.addEventListener("load", app.init, false);
