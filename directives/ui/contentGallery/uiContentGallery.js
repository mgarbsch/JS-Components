angular.module('uiDirectives')
.directive('uiContentGallery', ['$sce', '$timeout', function ($sce, $timeout) {
    return {
        restrict: 'E',
        transclude: true,
		controllerAs: 'ctrl',
		template: '<div id="{{id}}"><div ng-repeat="item in content track by $index" class="uiGalleryPanel {{panelStyle}}" style="width:{{item.cx}}px;height:{{item.cy}}px;left:{{item.x}}px;top:{{item.y}}px" ui-repeat-insert></div></div>',
        scope: {
            content: '=',
            spacing: '=?',
            minPanelWidth: '=?',
            maxPanelWidth: '=?',
            panelStyle: '@?',
			refresh: '=?',
			loadDelay: '=?'
        },
        controller: function ($scope) {
            $scope.id = 'gallery' + Math.floor(Math.random() * 1000000);
            $scope.element = document.getElementById($scope.id);

            $scope.content = $scope.content || [];
			$scope.refresh = $scope.refresh || undefined;
            if ($scope.spacing == undefined) $scope.spacing = 10;
            if ($scope.minPanelWidth == undefined) $scope.minPanelWidth = 160;
            if ($scope.maxPanelWidth == undefined) $scope.maxPanelWidth = 320;
			if ($scope.loadDelay == undefined) $scope.loadDelay = 500;

            var cxContainer = 0;
            var cyContainer = 0;
            var cxPanel = 0;
            var columnCount = 0;
            var columnHeights = [];

			$(window).on('DOMContentLoaded load resize', onWindowResize);
            //document.addEventListener("DOMContentLoaded", onWindowResize, false);
            //window.onresize = onWindowResize;

            $scope.$watch('content', function () {
                if (cxContainer > 0) calcLayout($scope.content);
            });

			$scope.refresh = function () {
				onWindowResize();
			};
			
            function calcLayout(items) {
                cyContainer = 0;
                columnHeights.splice(0, columnHeights.length);
                for (var i = 0; i < columnCount; i++) { columnHeights.push({ idx: i, h: 0 }); }

                for (var j = 0; j < items.length; j++) {
                    columnHeights.sort(function (a, b) { return a.h - b.h; });
                    cyContainer = Math.max(cyContainer, columnHeights[columnHeights.length-1].h);
					if (items[j].resize) items[j].resize(items[j], cxPanel, 0)
                    else {
						items[j].cx = cxPanel;
						items[j].cy = calcPanelHeight(items[j], cxPanel);
					}
                    items[j].x = columnHeights[0].idx * (cxPanel + $scope.spacing);
                    items[j].y = columnHeights[0].h;
                    items[j].index = j;
                    columnHeights[0].h += items[j].cy + $scope.spacing;
                    cyContainer = Math.max(cyContainer, columnHeights[0].h);
                }
            };

            function onWindowResize() {
                $scope.element = $scope.element || document.getElementById($scope.id);
                if ($scope.element) {
                    var scope = angular.element($scope.element).scope();
					if (scope) {
						scope.$apply(function () {
							cxContainer = $('#'+$scope.id).width();
							calcPanelWidth(cxContainer);
							if ($scope.content.length > 0) calcLayout($scope.content);
							$('#' + $scope.id).height(cyContainer);
						});
					}
                }
            };

            function calcPanelWidth(cxContainer) {
                cxPanel = $scope.maxPanelWidth;
                columnCount = 0;

                do {
                    columnCount++;
                    cxPanel = calcPanelWidth2(cxContainer, columnCount);
                } while (cxPanel > $scope.maxPanelWidth);
                if (cxPanel < $scope.minPanelWidth) {
                    columnCount--;
                    cxPanel = calcPanelWidth2(cxContainer, columnCount);
                }
            };
            function calcPanelWidth2(cxContainer, colCount) {
                return Math.floor((cxContainer - (colCount - 1) * $scope.spacing) / colCount);
            };
            function calcPanelHeight(item, cxPanel) {
                return Math.floor((item.dy * cxPanel)/ item.dx);
            };

            $timeout(function () {
                onWindowResize();
            }, $scope.loadDelay);
        },
        link: function ($scope, $element, $attr) {
        }
    }
}]);
