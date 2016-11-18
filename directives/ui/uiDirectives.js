(function (angular) {
    'use strict';
    angular.module('uiDirectives', ['ngResource'])
	.factory('$uiContext', function() {
		var _inViewContainers = [];
		var _inViewBound = false;
		var _inViewEventHandler = function(event) {
			for (var i=0; i<_inViewContainers.length; i++) {
				_inViewContainers[i].viewChange(event);
			}
		};
		var _context = {
			inView: {
				containers: _inViewContainers,
				register: function(container) {
					_inViewContainers.push(container);
					if (!_inViewBound) {
						angular.element(window).bind('DOMContentLoaded load ready scroll resize', _inViewEventHandler);
						_inViewBound = true;
					}
				},
				unregister: function(container) {
					for (var i=0; i<_inViewContainers.length; i++) {
						if (_inViewContainers[i] === container) {
							_inViewContainers.splice(i, 1);
							break;
						}
					}
					if (_inViewContainers.length == 0) {
						_inViewBound = false;
						angular.element(window).unbind('DOMContentLoaded load ready scroll resize', _inViewEventHandler);
					}
				},
				trigger: function() {
					_inViewEventHandler({});
				}
			}
		};
		return _context;
	})
	.directive('uiRepeatInsert', function(){
		return {
			link: function($scope, $element, $attrs, controller, $transclude) {
				if (!$transclude) {
					throw minErr('ngTransclude')('orphan',
					 'Illegal use of ngTransclude directive in the template! ' +
					 'No parent directive that requires a transclusion found. ' +
					 'Element: {0}',
					 startingTag($element));
				}
				var innerScope = $scope.$new();
				$transclude(innerScope, function(clone) {
					$element.empty();
					$element.append(clone);
					$element.on('$destroy', function() {
						innerScope.$destroy();
					});
				});
			}
		};
	})
	.factory('uiScopeUtils', function() {
		var _parseMemberName = function(name) {
			if (name.indexOf('(') > 0 && name.indexOf(')') > 0) {
				return name.substr(0, name.indexOf('('));
			}
			else return name;
		};
		var _findScopeWith = function(scope, memberName) {
			if (scope.hasOwnProperty(memberName)) return scope;
			else if (scope.$parent) return _findScopeWith(scope.$parent, memberName);
			else return null;
		};
		
		return {
			find: function(scope, memberName) {
				memberName = _parseMemberName(memberName);
				return _findScopeWith(scope, memberName);
			}
		};
	});
})(angular);
