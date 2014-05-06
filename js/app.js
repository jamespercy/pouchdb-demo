"use strict"

var app = {

	init: function() {
		PouchDB.destroy('pouchdemo', function(err, info) { 
			app.db = new PouchDB('pouchdemo');
			app.db.replicate.to('http://localhost:5984/pouchdemo');
		});
		app.addButton = document.querySelector('#add-button');
		app.textInput = document.querySelector('#text-input');
		app.resultList = document.querySelector('#result-list');
		app.addButton.addEventListener('click', app.addText, false);
	},

	addText: function() {
		  var textEntry = {
		    _id: new Date().toISOString(),
		    content: app.textInput.value
		  };

		 app.db.put(textEntry, function callback(err, result) {
		    if (err) {
		    	console.log(err);
		    }
		    if (result) {
		      	app.refreshList();
		    }
		});
	},

	refreshList: function() {
		app.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
			app.resultList.innerHTML = '';
    		console.log(doc.rows);
    		for (var item in doc.rows) {
    			var li = document.createElement('li');
    			li.innerHTML = doc.rows[item].doc.content + ' - ' + doc.rows[item].doc._id;
    			app.resultList.appendChild(li);
    		}
  		});
	}
};

window.addEventListener("load", app.init, false);
