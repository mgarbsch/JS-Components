angular.module('uiDirectives')
.factory('uiPresentationGridItemFactory', function() {
	return {
		genItem: function() {
			return {
				index: -1,
				pos: { x: -1, y: -1 },
				size: { cx: -1, cy: -1},
				blocks: { cx: 1, cy: 1},
				content: null,
				resize: function(item, cx, cy) {
					
				}
			};
		}
	}
})
.directive('uiPresentationGrid', ['$sce', '$timeout', 'uiPresentationGridItemFactory', 
	function ($sce, $timeout, gridItemFactory) {
		return {
			restrict: 'E',
			transclude: true,
			controllerAs: 'ctrl',
			template: '<div id="{{id1}}" class="uiPresentationGridContainer">'+
					  '<div id="{{id2}}" class="uiPresentationGrid">' +
					  '<div ng-repeat="item in content track by $index" '+
							'id="gi_{{item.index}}" '+
							'class="uiPresentationGridPanel {{item.content.className}}" '+
							'style="width:{{item.size.cx}}px;height:{{item.size.cy}}px;left:{{item.pos.x}}px;top:{{item.pos.y}}px" '+
							'ui-repeat-insert>'+
					  '</div></div></div>',
			scope: {
				content: '=',
				spacing: '=?',
				panelWidth: '=?',
				panelHeight: '=?',
				panelStyle: '@?',
				maxColumns: '=?',
				refresh: '=?',
				loadDelay: '=?'
			},
			controller: function ($scope) {
				$scope.id1 = 'gcnt' + Math.floor(Math.random() * 1000000);
				$scope.id2 = 'grid' + Math.floor(Math.random() * 1000000);
				$scope.element = document.getElementById($scope.id);

				$scope.content = $scope.content || [];
				$scope.refresh = $scope.refresh || undefined;
				if ($scope.spacing == undefined) $scope.spacing = 10;
				if ($scope.panelWidth == undefined) $scope.panelWidth = 240;
				if ($scope.panelHeight == undefined) $scope.panelHeight = 240;
				if ($scope.maxColumns == undefined) $scope.maxColumns = 6;
				if ($scope.loadDelay == undefined) $scope.loadDelay = 500;

				var _cxContainer = 0;
				var _cyContainer = 0;
				var _cxGrid = 0;
				var _cyGrid = 0;
				var _columnCount = 0;
				var _rowCount = 0;
				var _emptyCount = 0;
				var _blocks = [];

				$(window).on('DOMContentLoaded load resize', _onWindowResize);
				//document.addEventListener("DOMContentLoaded", _onWindowResize, false);
				//window.onresize = _onWindowResize;

				$scope.$watch('content', function () {
					//_resizeGrid();
					//if (_cxContainer > 0) _calcLayout($scope.content);
				});

				$scope.refresh = function () {
					_onWindowResize();
				};
				
				function _calcLayout(items) {
					_cyContainer = _cyGrid = 0;
					_blocks = _emptyBlocks(_blocks);
					for (var i=0; i<$scope.maxColumns; i++) _blocks.push([{filled:false}]);
					_rowCount = 1;
					
					items.splice(items.length-_emptyCount, _emptyCount);
					_emptyCount = 0;
					
					var temp = items.slice(0);
					var i = 0;
					var iNew = null;
					var bx = 0;
					var by = 0;
					var y = 0;
					
					while (temp.length > 0) {
						for (var x=0; x<_columnCount; x++) {
							if (!_blocks[x][y].filled) {
								bx = x==0?Math.min(temp[i].blocks.cx,_columnCount):temp[i].blocks.cx;
								by = temp[i].blocks.cy;
								if (_itemFits(x, y, bx, by)) {
									_assignBlocks(x, y, bx, by);
									_placeItem(temp[i], x, y, bx, by);
									temp.splice(i, 1);
									i = 0;
									x += bx-1;
								}
								else {
									i++;
									if (i >= temp.length) {
										iNew = gridItemFactory.genItem();
										iNew.index = $scope.content.length+1;
										iNew.content = { id: iNew.index, className: 'gi-empty', caption: '' };
										$scope.content.push(iNew);
										_assignBlocks(x, y, 1, 1);
										_placeItem(iNew, x, y, 1, 1);
										_emptyCount++;
										i = 0;
									}
									else {
										x--;
									}
								}
							}
							if (temp.length == 0) break;
						}
						y++;
						if (temp.length > 0 && y >= _rowCount) {
							_blocks = _addBlockRows(_blocks, 1);
						}
					}
				};
				
				function _emptyBlocks(blocks) {
					for (var x=0; x<blocks.length; x++) {
						blocks[x].splice(0, blocks[x].length);
					}
					blocks.splice(0, blocks.length);
					return blocks;
				}
				function _itemFits(x, y, cx, cy) {
					var ret = true;
					if (x+cx <= _columnCount) {
						for (var bx=0; bx<cx; bx++) {
							for (var by=0; by<cy; by++) {
								if (_blocks[x+bx] == undefined || _blocks[x+bx][y+by] == undefined) {
									_blocks = _addBlockRows(_blocks, cy-by);
								}
								if (_blocks[x+bx][y+by].filled) {
									ret = false;
									break;
								}
							}
						}
					}
					else ret = false;
					return ret;
				};
				function _assignBlocks(x, y, cx, cy) {
					for (var bx=0; bx<cx; bx++) {
						for (var by=0; by<cy; by++) {
							if (_blocks[x+bx] == undefined || _blocks[x+bx][y+by] == undefined) {
								_blocks = _addBlockRows(_blocks, cy-by);
							}
							_blocks[x+bx][y+by].filled = true;
						}
					}
				}
				function _placeItem(item, x, y, bx, by) {
					item.pos.x = (x * $scope.panelWidth) + ((x+1) * $scope.spacing);
					item.pos.y = (y * $scope.panelHeight) + ((y+1) * $scope.spacing);
					item.size.cx = (bx * $scope.panelWidth) + ((bx-1) * $scope.spacing);
					item.size.cy = (by * $scope.panelHeight) + ((by-1) * $scope.spacing);
					_cyContainer = _cyGrid = Math.max(_cyContainer, item.pos.y + item.size.cy + $scope.spacing);
					if (item.resize) item.resize(item, item.size.cx, item.size.cy);
				};
				
				function _addBlockRows(blocks, count) {
					if (blocks.length == 0) {
						for (var i=0; i<$scope.maxColumns; i++) blocks.push([{filled:false}]);
						count--;
					}
					for (var c=0; c<count; c++) {
						for (var x=0; x<$scope.maxColumns; x++) blocks[x].push({filled:false});
					}
					_rowCount += count;
					return blocks;
				};

				function _onWindowResize() {
					$scope.element = $scope.element || document.getElementById($scope.id1);
					if ($scope.element) {
						var scope = angular.element($scope.element).scope();
						if (scope) {
							scope.$apply(function () {
								_resizeGrid();
							});
						}
					}
				};
				function _resizeGrid() {
					//_hideGridItems();
					_cxContainer = $('#'+$scope.id1).width();
					_calcColumnCount();
					_adjustGridWidth();
					if ($scope.content.length > 0) _calcLayout($scope.content);
					$('#' + $scope.id1).height(_cyContainer);
					$('#' + $scope.id2).height(_cyGrid);
					//_showGridItems();
				};
				function _adjustGridWidth() {
					_cxGrid = _columnCount*$scope.panelWidth + (_columnCount+1)*$scope.spacing;
					$('#' + $scope.id2).width(_cxGrid);
				};

				function _calcColumnCount() {
					_columnCount = 0;
					_cxGrid = 0;

					do {
						_columnCount++;
						_cxGrid = _columnCount*$scope.panelWidth + (_columnCount+1)*$scope.spacing;
					} while (_cxGrid < _cxContainer);
					if (_cxGrid > _cxContainer) {
						_columnCount--;
					}
					_columnCount = Math.min(_columnCount, $scope.maxColumns);
				};
				
				function _hideGridItems() {
					for (var i=0; i<$scope.content.length; i++) {
						$('#gi_'+$scope.content[i].index).addClass('hidden');
					}
				};
				function _showGridItems() {
					for (var i=0; i<$scope.content.length; i++) {
						$('#gi_'+$scope.content[i].index).removeClass('hidden');
					}
				};

				$timeout(function () {
					_onWindowResize();
				}, $scope.loadDelay);
			},
			link: function ($scope, $element, $attr) {
			}
		}
	}
]);
