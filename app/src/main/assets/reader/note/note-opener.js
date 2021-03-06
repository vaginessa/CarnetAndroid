'use strict';

var JSZip = require('jszip');
var mkdirp = require('mkdirp');
var fs = require('fs');

var NoteOpener = function NoteOpener(note) {
  this.note = note;
};

NoteOpener.prototype.getMainTextMetadataAndPreviews = function (callback) {
  var opener = this;
  this.getFullHTML(function (data, zip) {
    if (zip != undefined) {
      opener.getMetadataString(zip, function (metadata) {
        var tempElement = document.createElement("div");
        tempElement.innerHTML = data;
        opener.getPreviews(zip, function (previews) {
          console.log(previews);
          callback(tempElement.innerText, metadata != undefined ? JSON.parse(metadata) : undefined, previews);
        });
      });
    } else {
      callback(undefined, undefined);
    }
  });
};

NoteOpener.prototype.getPreviews = function (zip, callback) {
  var p = new PreviewOpener(zip, callback);
  p.start();
};

var PreviewOpener = function PreviewOpener(zip, callback) {
  this.zip = zip;
  this.currentFile = 0;
  this.callback = callback;
  this.data = [];
};

PreviewOpener.prototype.start = function () {
  var extractor = this;
  this.files = [];
  this.zip.folder("data").forEach(function (relativePath, file) {
    console.log(relativePath);

    if (relativePath.startsWith("preview_")) {
      extractor.files.push(file.name);
    }
  });
  this.fullRead();
};

PreviewOpener.prototype.fullRead = function () {
  console.log("fullExtract = " + this.files.length);

  if (this.currentFile >= this.files.length || this.currentFile >= 2) {
    console.log("size = " + this.files.length);
    console.log("took " + (Date.now() - this.startTime) + "ms");
    this.callback(this.data);
    return;
  }
  var filename = this.files[this.currentFile];
  var previewOpener = this;
  console.log("extract  = " + filename);
  var file = this.zip.file(filename);

  if (file != null) {
    file.async('base64').then(function (content) {

      if (content != "") {
        previewOpener.data.push('data:image/jpeg;base64,' + content);
      }
      previewOpener.currentFile++;
      previewOpener.fullRead();
    });
  } else {
    previewOpener.currentFile++;
    previewOpener.fullRead();
  }
};

NoteOpener.prototype.getMetadataString = function (zip, callback) {
  if (zip.file("metadata.json") != null) zip.file("metadata.json").async("string").then(callback);else {
    callback(undefined);
  }
};

NoteOpener.prototype.getFullHTML = function (callback) {
  console.log("this.note.path  " + this.note.path);

  fs.readFile(this.note.path, function (err, data) {
    if (err) {
      console.log("error ");
      callback(undefined, undefined);
      return console.log(err);
    }
    console.log("loadAsync  " + data.length);

    if (data.length != 0) JSZip.loadAsync(data, {
      base64: true
    }).then(function (zip) {
      console.log("then  " + zip);

      zip.file("index.html").async("string").then(function (content) {
        console.log("ok  ");

        callback(content, zip);
      });
    }, function (e) {
      callback(undefined, undefined);
    });else callback(undefined, undefined);
  });
};

NoteOpener.prototype.extractTo = function (path, callback) {
  var opener = this;
  console.log("extractTo");
  fs.readFile(this.note.path, 'base64', function (err, data) {
    if (!err) {
      var extractor = new Extractor(data, path, opener, callback);
      extractor.start();
    } else callback(true);
  });
};

NoteOpener.prototype.compressFrom = function (path, callback) {
  var comp = new Compressor(path, this.note.path, callback);
  comp.start();
};

var Extractor = function Extractor(data, dest, opener, callback) {
  this.data = data;
  this.currentFile = 0;
  this.path = dest;
  this.startTime = Date.now();
  this.callback = callback;
  this.opener = opener;
};

Extractor.prototype.start = function () {
  this.zip = new JSZip();
  var extractor = this;
  this.zip.loadAsync(this.data, {
    base64: true
  }).then(function (contents) {
    extractor.files = Object.keys(contents.files);
    extractor.fullExtract();
  });
};

Extractor.prototype.fullExtract = function () {
  console.log("fullExtract = " + this.files.length);

  if (this.currentFile >= this.files.length) {
    console.log("size = " + this.files.length);
    console.log("took " + (Date.now() - this.startTime) + "ms");
    this.callback();
    return;
  }
  var filename = this.files[this.currentFile];
  var extractor = this;
  console.log("extract  = " + filename);
  var file = this.zip.file(filename);

  if (file != null) {
    file.async('base64').then(function (content) {

      if (content != "") {

        var dest = extractor.path + filename;
        console.log("mkdir");
        mkdirp.sync(getParentFolderFromPath(dest));
        console.log("mkdirok");

        fs.writeFileSync(dest, content, 'base64');
        if (filename == "metadata.json") {
          extractor.opener.note.metadata = JSON.parse(decodeURIComponent(escape(atob(content))));
        }
      }
      extractor.currentFile++;
      extractor.fullExtract();
    });
  } else {
    extractor.currentFile++;
    extractor.fullExtract();
  }
};

var Compressor = function Compressor(source, dest, callback) {
  this.source = source;
  this.currentFile = 0;
  this.path = dest;
  this.callback = callback;
};

Compressor.prototype.start = function () {
  var fs = require('fs');
  var archiver = require('archiver');
  console.log("start");
  var archive = archiver.create('zip');
  var output = fs.createWriteStream(this.path);
  output.on('close', function () {
    compressor.callback();
  });
  archive.pipe(output);
  var compressor = this;
  archive.directory(this.source, false).finalize();
};
if (typeof exports !== 'undefined') exports.NoteOpener = NoteOpener;