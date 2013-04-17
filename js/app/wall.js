// Style: all private methods & objects start with underscore (_)

(function () {

	// Global namespace
	var wall = window.wall = {

		// This is the entry point to the application.
		// It takes care of instantiating the views, models, controllers, etc.
		// 
		//		wall.start()
		start: function(inputId) {
			var searchCollection = new wall.Languages;
			var view = new wall.View({inputId: inputId, collection: searchCollection});
		},

		// demo data
		demoData: [ "java", "php", "coldfusion", "coffeescript", "javascript", "asp", "ruby" ]
	};

	// View that holds the text box and different brick views
	wall.View = Backbone.View.extend({
		initialize: function() {
			this._bricks = new Backbone.Collection;
			this._input  = $("#" + this.options.inputId);
			this._initContainer();
			this._initAutocomplete();
			this._bind();
			var brickView = new wall.BrickView({collection: this._bricks});
			this._input.prop('placeholder', 'Enter a language').focus();
		},

		// The container of the wall is a UL element.
		// The container of a brick is a LI element, and this will be a separate view
		// The input will be stored within its own brick
		// The final markup should be similar to:
		//	```
		//		<div class="wall">
		//			<ul class="wall-ul">
		//				<li class="wall-brick">
		//					<span class="wall-brick-name">Name</span>
		//					<a href="#remove" class="wall-brick-remove">x</a>
		//				</li>
		//				<li class="wall-brick">
		//					<input type="text" class="wall-input" />
		//				</li>
		//			</ul>
		//		</div>
		//	```
		_initContainer: function() {
			this._input
				.addClass('wall-input')
				.wrap(
					'<div class="wall">' +
						'<ul class="wall-ul ui-helper-clearfix">' + 
							'<li class="wall-brick wall-brick-input"></li>' +
						'</ul>' + 
					'</div>'
				);

			// Store these in the global object so they can be accessed by other objects
			wall.container = this._input.parents('div.wall');
			wall.inputListItem = this._input.parent().before('<li class="wall-brick-search"></li>');
		},

		// Typical `jQuery UI autocomplete` options,
		// apart from `source` which is delegated to the search collection;
		// `select` is triggered when an item in the list selected;
		// the `position` is shifted down as the container is padded
		_initAutocomplete: function() {
			var self = this;
			var options = {
				position: { at: "left bottom+7" },
				appendTo: wall.container,
				source:   function(request, response) { self._getData(request, response); },
				focus:    function() { return false; },
				select:   function(e, ui) { self._select(e, ui); }
			};
			this._input.autocomplete(options);
		},

		// Fetch the models from the collection, based on the term entered by the user.
		// This would normallly communicate with a remote server, simply hard coded here.
		// The fetched models are translated to `ui.item` format expected by `jQuery UI autocomplete`.
		_getData: function(request, response) {
			var languages = this.collection.fetch(request.term);
			var models = languages.map(function(language) {
				var name = language.get('name');
				return {
					id:    language.get('id'),
					label: name,
					value: name
				};
			});
			response(models);
		},

		// Create a model from the brick selected, and add it to the collection.
		// The brick view, listening to this event, will be added automatically to the wall.
		// We (almost) never call the brick view directly.
		_select: function(e, ui) {
			e.preventDefault();
			this._bricks.add({
				id: ui.item.id,
				name: ui.item.label
			});
			this._input.val('').focus()
			return false;
		},

		// When the user presses BACKSPACE for the first time, select the last brick,
		// giving the user a cue that the brick is selected; 
		// if the user presses BACKSPACE again, find the last brick, and remove it from collection
		_onkeydown: function(e) {
			if (e.keyCode == $.ui.keyCode.BACKSPACE && this._input.val().length == 0) {
				this._onLastBrickSelected(function(lastBrick) {
					this._input.autocomplete('close');
					var id = lastBrick.data('id');
					var model = this._bricks.get(id);
					this._bricks.remove(model);
				});
			} else {
				this._unselectLastBrick();
			}
		},

		// Remove the selected class from the last brick
		_unselectLastBrick: function() {
			this._onLastBrick(function(lastBrick) {				
				lastBrick.removeClass('wall-brick-selected');
			});
		},

		// If the last brick is selected then call the callback function provided,
		// otherwise select it
		_onLastBrickSelected: function(fn) {
			var self = this;
			this._onLastBrick(function(lastBrick) {				
				if (lastBrick.hasClass('wall-brick-selected')) {
					if (fn) fn.call(self, lastBrick);
				} else {
					lastBrick.addClass('wall-brick-selected');
				}
			});
		},

		// Find the last brick, by checking the sibling before the brick holding the input box.
		_onLastBrick: function(fn) {
			var lastBrick = wall.inputListItem.prev('.wall-brick');
			if (lastBrick && lastBrick.length && fn) fn(lastBrick);
		},

		// Selects the text box anytime the user clicks on the entire box.
		_bind: function() {
			var self = this;
			wall.container
				.click(function() { self._input.focus(); })
				.keydown(function(e) { self._onkeydown(e); });
		}
	});

	wall.BrickView = Backbone.View.extend({
		_markup: 
			'<li class="wall-brick" id="wall-brick-<%= id %>" data-id="<%= id %>">' +
				'<span class="wall-brick-name"><%= name %></span>' + 
				'<a href="#remove" data-id="<%= id %>" class="wall-brick-remove"></a>' + 
		  '</li>',

		initialize: function() {
			var self = this;
			this.collection.on('add', this.render, this);
			this.collection.on('remove', this._remove, this);
			wall.container.click(function(e) { self._onremove(e); });
		},

		render: function(model) {
			if (!wall.inputListItem) return;
			this._tmpl = this._tmpl || _.template(this._markup);
			html = this._tmpl(model.toJSON());
			wall.inputListItem.before(html);
			return this;
		},

		_onremove: function(e) {
			if (e.target.className !== 'wall-brick-remove') return;
			e.preventDefault();
			var id = $(e.target).data('id');
			var model = this.collection.get(id);
			this.collection.remove(model);
		},

		_remove: function(model) {
			var li = wall.container.find('#wall-brick-' + model.get('id'));
			if (li && li.length) {
				li.fadeOut(function() {
					li.remove();
				});
			}
		}
	});

	wall.Languages = Backbone.Collection.extend({
		model: wall.Language,

		// Populate the collection with the dummy data
		initialize: function() {
			models = $.map(wall.demoData, function(language, i) {
				return new wall.Language({
					id: i + 1,
					name: language
				});
			})
			this.reset(models);
		},

		fetch: function(term) {
			var reg = new RegExp(term, 'i');
			return this.filter(function(model) {
				return reg.test(model.get('name'));
			});
		}
	});

	wall.Bricks = Backbone.Collection.extend({
		model: wall.Language
	});

	wall.Language = Backbone.Model.extend({
	});



	// start the app on document ready
	$(function() {
		wall.start('wall-input');
	});
		

}).call(this);
