'use strict';

angular.module('hellbergApp')
  .controller('TripCtrl', ['$scope', '$routeParams', '$q', function ($scope, $routeParams, $q) {

    var dfd1 = $q.defer();

    var service = new google.maps.places.PlacesService($("#attribution")[0]);
    service.getDetails({ reference: $routeParams.place1 }, function(res) {
      dfd1.resolve(res);
    });

    var dfd2 = $q.defer();
    service.getDetails({ reference: $routeParams.place2 }, function(res) {
      dfd2.resolve(res);
    });

    $q.all([dfd1.promise, dfd2.promise]).then(function(res) {
      var directionsService = new google.maps.DirectionsService();

      var request = {
        origin:res[0].name,
        destination:res[0].name,
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.route(request, function(result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          var route = result.routes[0];
          console.log("route", route);
        } else {
          // [todo] - error
        }
      });
    });

  }]);