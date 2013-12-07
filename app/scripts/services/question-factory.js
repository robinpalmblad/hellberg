
var app = angular.module('hellbergApp').factory('Questions', ['$http', '$q', 'LOCALE', function($http, $q, LOCALE) {
  var instance = { }

  var FOURSQUARE_API_ACCESS_TOKEN = "SL5IPGO1JG5XW1NU0QT1BQY1ESDO1HI13HXSS5EBRKFP1DXS";
  var FOURSQUARE_API_CLIENT_ID = "MURHMAGAPKW5ZAXYEEPFC30BALAU0D4CZYLRRWOMEKIDLV2C";
  var FOURSQUARE_API_CLIENT_SECRET = "TI0FW2KG2NPVFP20TSMIBSYALQJ4XM0I2WFMBXB3JTXPJMHU";

  var get_question = function(idx) {

  };

  var get_wikipedia_page = function(search_term) {

    var url = "http://" + LOCALE.lang + ".wikipedia.org/w/api.php?action=query&format=json&callback=JSON_CALLBACK&prop=revisions&rvprop=content&titles=" + encodeURIComponent(search_term);
    return load_url(url);
  };

  var get_foursquare_venues = function(coords) {
    var url = "http://api.foursquare.com/v2/venues/explore?ll=" + encodeURIComponent(coords.lat) + "," + encodeURIComponent(coords.lng) + "&v=20131207&callback=JSON_CALLBACK";

    // Userless request
    url += "&client_id=" + encodeURIComponent(FOURSQUARE_API_CLIENT_ID);
    url += "&client_secret=" + encodeURIComponent(FOURSQUARE_API_CLIENT_SECRET);

    // Use(r)ful request? PUN INTENDED LOL
    // url += "&oauth_token=" + encodeURIComponent(FOURSQUARE_API_ACCESS_TOKEN);

    return load_url(url);
  };

  var load_url = function(url) {
    return $http.jsonp(url);
  };

  instance.fetch = function(departure_name, destination_name, points) {

    var dep = new Hellberg.TripLocation({
      name: departure_name,
      coordinate: {
        lat: points.length ? points[0].lat : 0.0,
        lng: points.length ? points[0].lng : 0.0
      },
      type: Hellberg.TripLocation.prototype.LOCATION_TYPE_DEPARTURE
    });

    var dest = new Hellberg.TripLocation({
      name: destination_name,
      coordinate: {
        lat: points.length ? points[(points.length - 1)].lat : 0.0,
        lng: points.length ? points[(points.length - 1)].lng : 0.0
      },
      type: Hellberg.TripLocation.prototype.LOCATION_TYPE_DESTINATION
    });

    var answer = new Hellberg.Answer({
      answers: [
        dest.name
      ]
    });

    var questions = [];

    var wikidfd = $q.defer();

    // var wikipedia_questions = [];
    get_wikipedia_page(dest.name).then(function(response) {
      var data = response.data;

      for (pid in data.query.pages) {
        var page = data.query.pages[pid];
        var revision = page.revisions.pop();

        var content = revision['*'];
        content = txtwiki.parseWikitext(content);

        // refractor into library - ugly-regex.js :D LOL

        content = content.replace(/^[  \s]*\|.*$/gi, '');         // Remove all lines beginning with |
        content = content.replace(/[\s\n]+/gi, ' ');              // Remove all whitespave
        content = content.replace(/\{\{[^\}]*\}\}/gi, '');      // Remove all {{ tags }}
        content = content.replace(/\([^\)]*[;][^\)]*\)/gi, '');     // Remove junk parahteses, such as ( ; )
        content = content.replace(/([=]+[^=]+[=]+)/gi, '');     // Remove === Headings ===

        content = content.replace(/[\s\n]+/gi, ' ');                                    // Remove all whitespave
        content = $('<div />').html(content).text();                                    // Remove all HTML entities

        content = content.replace(/%/gi, '%%');                                   // Escape any % char
        content = content.replace(new RegExp(dest.name, 'gi'), '%s');       // Replace all instances of city name with %s
        content = content.replace(/\s+,\s+/gi, ', ');                       // Fix commas

        var boundary = "#####";

        content = content.replace(/([\.\?!])\s+/gi, '$1' + boundary);
        var sentences = content.split(boundary);
        var questions = [];

        for (var idx = 0; idx < sentences.length; idx++) {
          var sentence = sentences[idx];
          if (sentence.match, '%s') {

            var template = new Hellberg.FactQuestionTemplate({
              format: sentence.replace(/^\s+/gi, ''),
              location: dest
            });

            var question = new Hellberg.Question({
              question: template.question(),
              answer: answer
            });

            questions.push(question);
          }
        }

        wikidfd.resolve(questions);
      }
    });

    var fsqdfd = $q.defer();

    get_foursquare_venues(dest.coordinate).then(function(response) {

      var venues = response.data.response.groups[0].items;

      for (var idx = 0; idx < venues.length; idx++) {
        var venue_data = venues[idx];

        var name = venue_data.venue.name;
        var category = venue_data.venue.categories[0].shortName;

        if (answer.validate_answer(name) !== true) {
          var template = new Hellberg.VenueQuestionTemplate({
            name: name,
            category: category,
            location: dest
          });

          var question = new Hellberg.Question({
            question: template.question(),
            answer: answer
          });

          questions.push(question);
        }
      }

      fsqdfd.resolve(questions);
    });

    var dfd = $q.defer();

    $q.all([wikidfd.promise, fsqdfd.promise]).then(function(res) {
      var question_set = new Hellberg.QuestionSet();

      var wikipedia_questions = res[0];
      var foursquare_questions = res[1];

      question_set.add(wikipedia_questions[0]);
      question_set.add(wikipedia_questions[1]);
      question_set.add(foursquare_questions[0]);
      question_set.add(wikipedia_questions[2]);
      question_set.add(wikipedia_questions[3]);

      dfd.resolve(question_set);
    });

    return dfd.promise;
  };

  return instance;
}]);
