angular.module('uiDirectives')
.directive('uiInViewContainer', ['$uiContext', function($uiContext) {
	return {
		restrict: 'AC',
		controller: [
			'$element', function($element) {
				this.items = [];
				this.addItem = function(item) {
					return this.items.push(item);
				};
				this.removeItem = function(item) {
					for (var i=0; i<this.items.length; i++) {
						if (this.items[i] == item) {
							this.items.splice(i, 1);
							break;
						}
					}
					return this.items;
				};
				this.isInView = function(item) {
					if (typeof jQuery === "function" && item.element instanceof jQuery) {
						item.element = item.element[0];
					}

					var rect = this.getBoundingClientRect(item.element);
					return (
						rect.top >= 0 &&
						rect.left >= 0 &&
						rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
						rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
					);
				};
				this.getBoundingClientRect = function(element) {
					if (element.getBoundingClientRect != null) {
						return element.getBoundingClientRect();
					}
					var rect = {left:0,right:0,top:0,bottom:0};
					var el = element;
					while (el) {
						rect.left += el.offsetLeft;
						rect.top += el.offsetTop;
						el = el.offsetParent;
					}
					var parent = element.parentElement;
					while (parent) {
						if (parent.scrollLeft != null) rect.left -= parent.scrollLeft;
						if (parent.scrollTop != null) rect.top -= parent.scrollTop;
						parent = parent.parentElement;
					}
					rect.right = rect.left + element.offsetWidth;
					rect.bottom = rect.top + element.offsetHeight;
					return rect;
				};
				this.onViewChange = (function(_this) {
					return function(event) {
						_this.viewChange(event);
					};
				})(this);
				this.viewChange = function(event) {
					for (var i=0; i<this.items.length; i++) {
						this.items[i].inView = this.isInView(this.items[i]);
						this.items[i].callback(event, this.items[i].inView, null);
					}
				};
				return this;
			}
		],
		link: function($scope, $element, $attrs, controller) {
			$element.bind('scroll', controller.onViewChange);
			$uiContext.inView.register(controller);
			return $scope.$on('$destroy', function() {
				$element.unbind('scroll', controller.onViewChange);
				return $uiContext.inView.unregister(controller);
			});
		}
	};
}])
.directive('uiInView', ['$parse', 'uiScopeUtils', function($parse, $sUtils) {
	return {
		restrict: 'A',
		require: '^uiInViewContainer',
		link: function($scope, $element, $attrs, containerCtrl, $transclude) {
			var inViewFunc = $parse($attrs.uiInView);
			var ctrlScope = $sUtils.find($scope, $attrs.uiInView);
			var item = {
				element: $element,
				callback: function($event, $isInView, $inViewRect) {
					if ($event == null) {
						$event = {};
					}
					
					return $scope.$evalAsync((function(_this) {
						return function() {
							$event.inViewTarget = $element[0];
							return ctrlScope ? inViewFunc(ctrlScope, {
								'$event': $event,
								'$isInView': $isInView,
								'$inViewRect': $inViewRect
							}) : null;
						};
					})(this));
				}
			};
			if (containerCtrl) {
				containerCtrl.addItem(item);
			}
			return $scope.$on('$destroy', function() {
				if (containerCtrl != null) {
					containerCtrl.removeItem(item);
				}
			});
		}
	};
}]);
