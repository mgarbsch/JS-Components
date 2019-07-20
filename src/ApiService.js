/**************************************************************************************************
MIT License

Copyright (c) 2019 Marcus Garbsch

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
**************************************************************************************************/

///////////////////////////////////////////////////////////////////////////////////////////////////
// API Service Class
//	
//	Provides methods for encapsulating server API endpoints by attaching functions directly to the
//	instantiated object. Endpoints are specified by the HTTP method and URL route required to call
//	the API. Each created endpoint method allows for use of both callback and promise to gather 
//	returned data asynchronously for the outside caller.
//
//	Sample code to use endpoint API route:
//		let addUserInfo = (data) => { data.forEach(d => { d.username += ' TESTED'; }) };
//		let service = new ApiServiceSubclass({ contentType: 'application/json', accessToken: '123abc456def' });
//		service.baseUrl = 'http://randomurl.com';
//		service.addEndpoint('users.get', 'GET', '/user/:userId, ['Content-Type','Authorization'], addUserInfo, 'users');
//		service.users.get({ userId: 'abc123' }, (res) => {
//			console.log('Server Response: '+res.status);
//			console.log(res.data);
//		});
//
//	Additional features include: 
//		- specifying of required header values per API route, 
//		- providing a data transform method to shape response data before delivery to the outside caller,
//		- providing a collection name where response data can be accessed within the instantiated object,
//		- providing a callApi method for direct calling to a full URL,
//		- giving option to attach external event handlers which would then be generated within the endpoint code
//
//	Dependencies:
//		- HttpRequest.js
//
///////////////////////////////////////////////////////////////////////////////////////////////////
class ApiService {
	constructor(name, config) {
		// Public Properties
		this._name = name;
		this._config = config;
		this._baseUrl = '';
		// Private Properties
		this._events = {
			names: ['onerror'],
			listeners: {}
		};
		this._collections = {};
	}
	///////////////////////////////////////////////////////////////////////////////////////////////
	// PUBLIC METHODS
	///////////////////////////////////////////////////////////////////////////////////////////////
	get name() { return this._name; }
	get baseURL() { return this._baseUrl; }
	set baseURL(url) { this._baseUrl = url; }
	
	addEndpoint(path, method, route, headerNames, transform, collectionName) {
		method = method.toUpperCase();
		headerNames = headerNames || null;
		transform = transform || null;
		collectionName = collectionName || null;
		let parts = path.split('.');
		let i9 = parts.length-1;
		
		let ref = this;
		for (var i=0; i<i9; i++) {
			ref[parts[i]] = ref[parts[i]] !== undefined ? ref[parts[i]] : {};
			ref = ref[parts[i]];
		}
		switch(method) {
			case 'GET':
				ref[parts[i9]] = this._genGet(route, headerNames, transform, collectionName);
				break;
			case 'POST':
				ref[parts[i9]] = this._genPost(route, headerNames, transform, collectionName);
				break;
			case 'PUT':
				ref[parts[i9]] = this._genPut(route, headerNames, transform);
				break;
			case 'DELETE':
				ref[parts[i9]] = this._genDelete(route, headerNames);
				break;
			case 'MOCK':
				ref[parts[i9]] = this._genMock(route, transform);
				break;
		}
	}
	callApi(method, url, params, body, headerNames, transform, callback) {
		method = method.toUpperCase();
		headerNames = headerNames || null;
		transform = transform || null;

		let self = this;
		return new Promise((resolve, reject) => {
			let headers = self._buildHeaders(headerNames);
			url = self._genUrlSuffix(url, params);
			HttpRequest.send(url, method.toUpperCase(), body, headers).then((res) => {
				res.data = self._parseObj(res.data);
				if (callback) {
					transform ? callback(transform(res)) : callback(res); 
				}
				resolve(transform ? transform(res) : res);
			}).catch((err) => {
				err.info = {
					url: url,
					params: params
				};
				self._handleError(err);
				reject(err);
			});
		});
	}
	getCaller(path, delim) {
		if (!Array.isArray(path) && typeof path === 'string') {
			delim = delim || ',';
			path = path.split(delim);
		}
		
		let ref = this;
		if (Array.isArray(path)) {
			for (var i=0; i<path.length; i++) {
				if (ref[path[i]]) ref = ref[path[i]];
				else return null;
			}
		}
		return ref;
	}
	registerEventName(name) {
		if (!this._events.names.includes(name)) {
			this._events.names.push(name);
		}
	}
	addEventListener(name, destName, handler) {
		name = name.toLowerCase();
		if (this._events.names.includes(name)) {
			if (!this._events.listeners[name]) {
				this._events.listeners[name] = { subscribers: {} };
			}
			this._events.listeners[name].subscribers[destName] = { name: destName, handler: handler };
		}
	}
	collection(name, data) {
		if (data && Array.isArray(data)) {
			this._collections[name] = data;
		}
		return this._collections[name];
	}
	///////////////////////////////////////////////////////////////////////////////////////////////
	// OVERRIDEABLE METHODS
	///////////////////////////////////////////////////////////////////////////////////////////////
	_mapConfigValue(name, config) {
		return null;
	}
	_handleError(err) {
		return this._triggerEvent('onerror', err);
	}
	///////////////////////////////////////////////////////////////////////////////////////////////
	// PROTECTED METHODS
	///////////////////////////////////////////////////////////////////////////////////////////////
	_triggerEvent(name, data) {
		if (this._events.listeners[name]) {
			for (var key in this._events.listeners[name].subscribers) {
				this._events.listeners[name].subscribers[key].handler(data);
			}
			return true;
		}
		return false;
	}
	///////////////////////////////////////////////////////////////////////////////////////////////
	// PRIVATE METHODS
	///////////////////////////////////////////////////////////////////////////////////////////////
	_genGet(route, headerNames, transform, collectionName) {
		return (params, callback) => {
			let self = this;
			return new Promise((resolve, reject) => {
				let headers = self._buildHeaders(headerNames);
				let url = self._baseUrl + self._genUrlSuffix(route, params);
				HttpRequest.send(url, 'GET', null, headers).then((res) => {
					res.data = self._parseObj(res.data);
					if (collectionName && typeof collectionName === 'string' && Array.isArray(res.data)) {
						self._collections[collectionName] = res.data;
					}
					if (callback) {
						transform ? callback(transform(res)) : callback(res); 
					}
					resolve(transform ? transform(res) : res);
				}).catch((err) => {
					err.info = {
						url: url,
						params: params
					};
					self._handleError(err);
					reject(err);
				});
			});
		};
	}
	_genPost(route, headerNames, transform, collectionName) {
		return (params, body, callback) => {
			let self = this;
			return new Promise((resolve, reject) => {
				let headers = self._buildHeaders(headerNames);
				let url = self._baseUrl + self._genUrlSuffix(route, params);
				HttpRequest.send(url, 'POST', body, headers).then((res) => { 
					res.data = self._parseObj(res.data);
					if (collectionName && typeof collectionName === 'string' && Array.isArray(res.data)) {
						self._collections[collectionName] = res.data;
					}
					if (callback) {
						transform ? callback(transform(res)) : callback(res); 
					}
					resolve(transform ? transform(res) : res);
				}).catch((err) => {
					err.info = {
						url: url,
						params: params,
						body: body
					};
					self._handleError(err);
					reject(err);
				});
			});
		};
	}
	_genPut(route, headerNames, transform) {
		return (params, body, callback) => {
			let self = this;
			return new Promise((resolve, reject) => {
				let headers = self._buildHeaders(headerNames);
				let url = self._baseUrl + self._genUrlSuffix(route, params);
				HttpRequest.send(url, 'PUT', body, headers).then((res) => {
					res.data = self._parseObj(res.data);
					if (callback) {
						transform ? callback(transform(res)) : callback(res); 
					}
					resolve(transform ? transform(res) : res);
				}).catch((err) => {
					err.info = {
						url: url,
						params: params,
						body: body
					};
					self._handleError(err);
					reject(err);
				});
			});
		};
	}
	_genDelete(route, headerNames) {
		return (params, callback) => {
			let self = this;
			return new Promise((resolve, reject) => {
				let headers = self._buildHeaders(headerNames);
				let url = self._baseUrl + self._genUrlSuffix(route, params);
				HttpRequest.send(url, 'DELETE', null, headers).then((res) => {
					res.data = self._parseObj(res.data);
					if (callback) callback(res);
					resolve(res);
				}).catch((err) => {
					err.info = {
						url: url,
						params: params
					};
					self._handleError(err);
					reject(err);
				});
			});
		};
	}
	_genMock(url, transform) {
		return (params, callback) => {
			let self = this;
			HttpRequest.send(url, 'GET', null, null).then((res) => {
				res.data = self._parseObj(res.data);
				if (callback) {
					transform ? callback(transform(res)) : callback(res); 
				}
				resolve(transform ? transform(res) : res);
			}).catch((err) => {
				err.info = {
					url: url,
					params: params
				};
				if (!self._handleError(err)) reject(err);
			});
		};
	}
	_buildHeaders(names) {
		let headers = null;
		if (names !== null) {
			headers = {};
			for (var i=0; i<names.length; i++) {
				headers[names[i]] = this._mapConfigValue(names[i], this._config);
			}
		}
		return headers;
	}
	_parseObj(obj) {
		try {
			if (typeof obj === 'string') {
				obj = obj.trim();
				if ((obj[0] == '{' && obj[obj.length-1] == '}') || (obj[0] == '[' && obj[obj.length-1] == ']')) {
					return JSON.parse(obj);
				}
				else return obj;
			}
			else return obj;
		}
		catch (err) {
			console.log('ApiService Error -> _parseObj Error: '+err);
			throw err;
		}
		return obj;
	}
	_genUrlSuffix(route, params) {
		if (params) {
			let pcount = 0, ucount= 0;
			for (var key0 in params) { pcount++; }
			let used = {};

			let tokens = this._parseParamTokens(route, ':');
			if (tokens.length) {
				for (var i=0; i<tokens.length; i++) {
					if (params[tokens[i]] !== undefined) {
						route = route.replace(':'+tokens[i], params[tokens[i]].toString());
						used[tokens[i]] = params[tokens[i]];
						ucount++;
					}
				}
			}
			if (tokens.length == 0 || pcount-ucount > 0) {
				let sfx = '?';
				for (var key in params) {
					if (used[key] === undefined) {
						if (sfx.length > 1) sfx += '&';
						sfx += key+'='+params[key].toString();
					}
				}
				if (sfx.length > 1) {
					route += sfx;
				}
			}
		}
		return route;
	}
	_parseParamTokens(text, pfx) {
		let tokens = [];
		let i=0;
		do {
			i = text.indexOf(pfx, i);
			if (i >= 0) {
				i++;
				let d = this._findNextDelimiter(text, i, ['&','/']);
				if (d >= 0) tokens.push(text.substr(i,Math.max(d,text.length)-i));
				else tokens.push(text.substr(i));
			}
		} while (i >= 0);
		return tokens;
	}
	_findNextDelimiter(text, i0, dels) {
		let pos = text.length+1;
		for (var i=0; i<dels.length; i++) {
			let d = text.indexOf(dels[i], i0);
			if (d >= 0) pos = Math.min(pos, d);
		}
		return (pos < text.length) ? pos : -1;
	}
}
///////////////////////////////////////////////////////////////////////////////////////////////////
