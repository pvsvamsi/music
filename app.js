var app = angular.module('MusicApp', ['ngRoute', 'ngResource']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/default.html',
            controller: 'mainController'
        })
        .when('/editTrack', {
            templateUrl: 'views/editTrack.html',
            controller: 'editTrackController'
        })
        .when('/addTrack', {
            templateUrl: 'views/addTrack.html',
            controller: 'addTrackController'
        })
        .when('/addGenre', {
            templateUrl: 'views/addGenre.html',
            controller: 'addGenreController'
        })
        .when('/editGenre', {
            templateUrl: 'views/ediGenre.html',
            controller: 'editGenreController'
        })
        .otherwise({
            redirectTo: '/'
        });
}]);

app.controller('mainController', function ($scope, Track, TrackByTitle, $timeout, TracksByPage, $location, musicService) {
    var getById = null;
    $scope.tracks = musicService.tracksArr;
    $scope.currentPageNo = musicService.currentPageNo;
    $scope.lastPageNo = musicService.lastPageNo;
    $scope.searchText = "";
    var track;
    function getTrackById() {
        track = Track.get({id: getById}, function () {
            console.log(track);
        });
    }

    $scope.navigateRight = function(isFirstCall){
        if($scope.currentPageNo < $scope.lastPageNo) {
            $scope.tracks = [];
            track = TracksByPage.get({pageNum: ($scope.currentPageNo + 1)}, function () {
                console.log(track);
                parseTracks(track.results);
                $scope.currentPageNo++;
                if(isFirstCall){
                    $scope.lastPageNo = Math.ceil(track.count/$scope.tracks.length);
                }
            })
        }
    };
    if($scope.tracks.length === 0) {
        $scope.navigateRight(true);
    }else{
        showStars();
    }
    $scope.navigateLeft = function () {
        if($scope.currentPageNo>1) {
            $scope.tracks = [];
            track = TracksByPage.get({pageNum: ($scope.currentPageNo - 1)}, function () {
                parseTracks(track.results);
                $scope.currentPageNo--;
            })
        }
    };

    $scope.searchTitle = function () {
        if($scope.searchText !== "") {
            track = TrackByTitle.get({title: $scope.searchText}, function () {
                parseTracks(track.results);
                console.log(track);
                $scope.lastPageNo = Math.ceil(track.count/$scope.tracks.length);
            })
        }else{
            $scope.currentPageNo--;
            $scope.navigateRight(true);
        }
    };

    $scope.addNewTrack = function () {
        updateServiceVariables();
        $location.path('/addTrack');
    };

    $scope.addNewGenre = function () {
        $location.path('/addGenre');
    };

    function parseTracks(result){
        $scope.showRating = false;
        $scope.tracks = result;
        for(var i=0; i<$scope.tracks.length; i++){
            $scope.tracks[i].genresStr = musicService.createGenresString($scope.tracks[i].genres, "|");
        }
        showStars();
    }

    $scope.editTrack = function (editTrack, index) {
        musicService.selectedTrackIndex = index;
        musicService.editTrackObj = editTrack;
        musicService.editTrackObj.rating = parseFloat(editTrack.rating);
        musicService.editTrackObj.genresStr = musicService.createGenresString(editTrack.genres,",");
        updateServiceVariables();
        $location.path('/editTrack');
    };

    function updateServiceVariables(){
        musicService.tracksArr = $scope.tracks;
        musicService.currentPageNo = $scope.currentPageNo;
        musicService.lastPageNo = $scope.lastPageNo;
    }

    function showStars() {
        $timeout(function(){
            $('span.stars').stars();
            $scope.showRating = true;
        },0);
    }

    $.fn.stars = function() {
        return $(this).each(function() {
            // Get the value
            var val = parseFloat($(this).html())/2;
            // Make sure that the value is in 0 - 5 range, multiply to get width
            var size = Math.max(0, (Math.min(5, val))) * 16;
            // Create stars holder
            var $span = $('<span />').width(size);
            // Replace the numerical value with stars
            $(this).html($span);
        });
    };
});

app.controller('editTrackController', function ($scope, TrackUpdate, $location, musicService) {
    $scope.trackObj = musicService.editTrackObj;
    if($scope.trackObj.title === ""){
        $location.path('/');
    }
    $scope.editNewTrack = function() {
        var sendObj = angular.copy($scope.trackObj);
        delete sendObj.genresStr;
        sendObj.genres = convertObjToArr($scope.trackObj.genres);
        $scope.track = new TrackUpdate(sendObj);
        $scope.track.$update(sendObj, function () {
            delete $scope.trackObj.genresStr;
            musicService.tracksArr[musicService.selectedTrackIndex] = $scope.trackObj;
            $location.path('/');
        });
    };
    function convertObjToArr(obj){
        var arr = [];
        for(var key in obj){
            if(obj.hasOwnProperty(key)){
                arr.push(parseInt(obj[key].id));
            }
        }
        return arr;
    }
});

app.controller('addTrackController', function ($scope, Track, $location) {
    $scope.songName = "";
    $scope.songGenre = "";
    $scope.songRating = 0.0;

    $scope.track = new Track();
    $scope.addNewTrack = function() {
        $scope.track = {
            "title" : $scope.songName,
            "rating" : $scope.songRating,
            "genres" : [
                21
            ]
        };
        Track.save($scope.track, function () {
            $location.path('/');
        });
    }
});

app.controller('addGenreController', function ($scope, Genres, $location) {
    $scope.genreName = "";
    $scope.genre = new Genres();
    $scope.addNewGenre = function() {
        $scope.genre = {
            "name" : $scope.genreName
        };
        Genres.save($scope.genre, function () {
            $location.path('/');
        });
    }
});

app.controller('editGenreController', function ($scope, Genres, $location) {
    $scope.genreObj = musicService.editGenreObj;
    $scope.genre = new Genres();
    $scope.editGenre = function() {
        Genres.save($scope.genreObj, function () {
            $location.path('/');
        });
    }
});

app.service('musicService', function () {
    this.editTrackObj = {"id": 1,
                "title": "",
                "rating": 0.0,
                "genres": []};
    this.editGenreObj = {"id": 1,
                "name": ""};
    this.tracksArr = [];
    this.currentPageNo = 0;
    this.lastPageNo = 1;
    this.selectedTrackIndex = 0;

    this.createGenresString = function(genres, seperator){
        var genresStr = "";
        for(var j=0; j<genres.length; j++){
            genresStr +=genres[j].name + " "+seperator+" ";
        }
        return genresStr.slice(0, -3);
    }
});

app.factory('Track', function($resource) {
    return $resource('http://104.197.128.152:8000/v1/tracks/:id');
});

app.factory('TracksByPage', function($resource) {
    return $resource('http://104.197.128.152:8000/v1/tracks?page=:pageNum');
});

app.factory('TrackByTitle', function($resource){
    return $resource('http://104.197.128.152:8000/v1/tracks?title=:title');
});

app.factory('TrackUpdate', function($resource) {
    return $resource('http://104.197.128.152:8000/v1/tracks/:id', { id: '@_id' }, {
        update: {
            method: 'POST',
            data: {}
        }
    });
});

app.factory('GenreUpdate', function($resource) {
    return $resource('http://104.197.128.152:8000/v1/genres/:id', { id: '@_id' }, {
        update: {
            method: 'POST',
            data: {}
        }
    });
});

app.factory('Genres', function($resource) {
    return $resource('http://104.197.128.152:8000/v1/genres/:id');
});