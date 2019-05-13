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
// HTTP Request Class
//	
//	Utility class providing static method for sending HTTP messages; based from the browser's XMLHttpRequest class
//
///////////////////////////////////////////////////////////////////////////////////////////////////

class HttpRequest {
	static send(url, method, body, headers, callback) {
		method = method.toUpperCase();
		let methods = ['GET','POST','UPDATE','DELETE','OPTIONS','FILE'];
		
		let setRequestHeaders = function(xhr, headers) {
			if (headers) {
				for(var key in headers) {
					xhr.setRequestHeader(key, headers[key]);
				}
			}
			return xhr;
		};
		let convertBody = function(body, headers) {
			if (headers['Content-Type']) {
				switch (headers['Content-Type']) {
					case 'application/json': body = (typeof body === 'string') ? body : JSON.stringify(body); break;
				}
			}
			return body;
		};

		let pr = new Promise((resolve, reject) => {
			let res = null;
			if (methods.includes(method)) {
				let xhr = new XMLHttpRequest();
				switch (method) {
					case 'FILE':
						xhr.open('GET', url, true);
						xhr.responseType = 'arraybuffer';
						xhr = setRequestHeaders(xhr, headers);
						xhr.onload = function(e) {
							if (this.status == 200) {
								res = { code: this.status, data: new Uint8Array(this.response) };
								if (callback) callback(null, res);
								resolve(res);
							}
							else {
								res = { code: this.status, error: xhr.response };
								if (callback) callback(res);
								reject(res);
							}
						};
						xhr.onerror = function(e) {
							res = { code: this.status, error: xhr.response };
							if (callback) callback(res);
							reject(res);
						};
						xhr.send();
						break;
					default:
						xhr.onreadystatechange = function() {
							if (this.readyState == 4) {
								if (this.status == 200) {
									res = { code: this.status, data: xhr.responseText };
									if (callback) callback(null, res);
									resolve(res);
								}
								else {
									res = { code: this.status, error: xhr.response };
									if (callback) callback(res);
									reject(res);
								}
							}
						};
						xhr.onerror = function(e) {
							res = { code: this.status, error: xhr.response };
							if (callback) callback(res);
							reject(res);
						};
						xhr.open(method, url, true);
						xhr = setRequestHeaders(xhr, headers);
						switch (method) {
							case 'GET':
							case 'DELETE':
								xhr.send();
								break;
							case 'POST':
							case 'UPDATE':
							case 'OPTIONS':
								body = convertBody(body, headers);
								xhr.send(body);
								break;
						}
						break;
				}
			}
			else {
				res = { code: 0, error: 'Method parameter is not valid' };
				if (callback) callback(res);
				reject(res);
			}
		});
		return pr;
	}
}