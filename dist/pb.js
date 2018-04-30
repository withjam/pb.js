(function() {

	var pb = {};

	pb.log = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift('default');
		pb.log.level.apply(this,args);		
	}
	pb.log.level = function() {
		var args = Array.prototype.slice.call(arguments);
		var lvl = args.shift();
		args.unshift('pb_log_' + lvl + ':');
		console.log.apply(this,args);
	}
	pb.log.warn = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift('warn');
		pb.log.level.apply(this,args);
	}
	pb.log.debug = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift('debug');
		pb.log.level.apply(this,args);
	}
	pb.log.trace = function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift('trace');
		pb.log.level.apply(this,args);
	}

	pb.ajax = function(opts) {
		if (typeof opts === 'string') {
			opts = { url: opts, method: 'GET' };
		}
		if (!opts.url) {
			pb.log('no url for ajax');
		}
		var deferred = Q.defer();
		var req = new XMLHttpRequest();
		req.addEventListener('error', function() {
			pb.log('ajax error', arguments);
			deferred.reject(arguments);
		});
		req.addEventListener('load', function(e) {
			pb.log('ajax load', arguments);
			deferred.resolve(req.response);
		});
		req.open(opts.method || 'GET', opts.url);
		req.send();
		return deferred.promise;
	}


	// execute an ajax request and reload portions of the page
	pb.ajax.navigate = function(url, silent) {
		return pb.ajax({
			method: 'GET',
			url: url
		}).then(function(resp) {
			var page = pb.mvc.loadPage(resp);
			var title = page.querySelector('title').innerHTML;
			// reset selected page
			pb.dom.removeClass(document.querySelectorAll('.current-page'), 'current-page');
			pb.dom.addClass(document.querySelectorAll('[href="' + url + '"]'), 'current-page');
			console.log('pushing state', title);
			document.title = title;
			if (!silent) {
				history.pushState( { html: page.innerHTML } ,page.querySelector('title').innerHTML,url);
			}
		});
	}

	pb.util = {};

	pb.dom = {};
	pb.dom.matches = function(el, selector) {
		var p = Element.prototype;
		var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
			return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
		};
		return f.call(el, selector);
	}
	pb.dom.matchParent = function(ele, sel) {
		try {
			while (ele && !pb.dom.matches(ele,sel)) {
				ele = ele.parentElement;
			}
			return ele;
		} catch(ex) {
			pb.log.warn('matchParent error', ex);
			return null;
		}

	}
	pb.dom.replace = function(sel, el) {
		var t = document.querySelector(sel);
		console.log('t', t);
		if (t) {
			t.innerHTML = el.innerHTML;
		}
	}
	pb.dom.removeClass = function(items, className) {
		console.log('removing class', items);
		items.forEach(function(element) {
			var names = element.className ? element.className.split(' ') : [];
			var ind = names.indexOf(className);
			if (ind > -1) {
				names.splice(ind,1);
			}
			element.className = names.join(' ');
		});
	}
	pb.dom.addClass = function(items, className) {
		items.forEach(function(element) {
			var names = element.className ? element.className.split(' ') : [];
			names.push(className);
			element.className = names.join(' ');
		});
	}

	pb.mvc = {};
	pb.mvc.loadPage = function(resp) {
		pb.log.trace('load page', resp);
		var v = document.createDocumentFragment();
		var dom = document.createElement('div');
		v.appendChild(dom);
		dom.innerHTML = resp;
		pb.log.debug('main', dom.querySelectorAll('main'));
		pb.dom.replace('main', dom.querySelector('main'));
		return dom;
	}
	pb.mvc.popstate = function() {
		pb.ajax.navigate(document.location, true);
	}
	window.onpopstate = pb.mvc.popstate;

	pb._clicker = function(e) {
		pb.log.debug('clicked', e.target);
		var href = pb.dom.matchParent(e.target,'a[href]');
		if (href) {
			var url = href.getAttribute('href');
			// capture navigation links and perform via ajax
			try {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			} catch(ex) {
				console.log(ex);
			}
			pb.ajax.navigate(url);
		}
	}

	// intercept all clicks
	console.log('listening for clicks');
	document.addEventListener('click', pb._clicker);

})();