"use strict";

var fs = require("fs");
var Search = function Search(keyword, path, callback) {
    this.keyword = keyword.toLowerCase();
    this.callback = callback;
    this.path = path;
};

Search.prototype.start = function () {
    this.fileList = [];
    this.toVisit = [];
    this.result = [];
    var search = this;

    this.recursiveVisit(this.path, function () {
        if (search.fileList.length > 0) {
            search.searchInFiles(search.callback);
        }
    });
};
Search.prototype.searchInFiles = function (callback) {
    var search = this;
    if (search.fileList.length > 0) {
        this.searchInFile(search.fileList.pop(), function () {
            search.searchInFiles(callback);
        });
    } else callback.onEnd(this.result);
};

function getFilenameFromPath(path) {
    return path.replace(/^.*[\\\/]/, '');
}

function stripExtensionFromName(name) {
    return name.replace(/\.[^/.]+$/, "");
}
Search.prototype.searchInFile = function (filePath, callback) {
    console.log("searchInFile " + filePath);
    var NoteOpener = require("../note/note-opener").NoteOpener;
    var Note = require("./note").Note;

    var opener = new NoteOpener(new Note(filePath, "", filePath, undefined));
    var search = this;
    try {
        console.log("opening");

        opener.getMainTextAndMetadata(function (txt, metadata) {
            var fileName = stripExtensionFromName(getFilenameFromPath(filePath));
            console.log("opened");
            if (fileName.toLowerCase().indexOf(search.keyword) >= 0 || txt !== undefined && txt.toLowerCase().indexOf(search.keyword) >= 0 || metadata !== undefined && metadata.keywords.indexOf(search.keyword) >= 0) {
                search.result.push(new Note(fileName, txt, filePath, metadata));
                search.callback.update(new Note(stripExtensionFromName(getFilenameFromPath(filePath)), txt, filePath, metadata));
                console.log("found in " + filePath);
            }
            callback();
        });
    } catch (error) {
        console.log(error);
        callback();
    }
};
Search.prototype.recursiveVisit = function (path, callback) {
    var search = this;
    console.log("visiting " + path);
    fs.readdir(path, function (err, dir) {

        if (!err) {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = dir[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var filePath = _step.value;

                    filePath = path + "/" + filePath;
                    var stat = fs.statSync(filePath);

                    if (!stat.isFile()) {
                        search.toVisit.push(filePath);
                    } else if (filePath.endsWith(".sqd")) {
                        search.fileList.push(filePath);
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }if (search.toVisit.length > 0) {
            search.recursiveVisit(search.toVisit.pop(), callback);
        } else callback();
    });
};
exports.Search = Search;