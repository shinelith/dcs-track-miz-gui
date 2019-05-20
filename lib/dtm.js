/**
 * DCS Track Miz
 */

var fs = require("fs");
var jszip = require("jszip");
var async = require("async");
var path = require("path");

/**
 * 转换trk为miz
 * @param {*} trkFile 
 * @param {*} outputPath 
 */
function convert(trkFile, outputPath, option) {
    async.waterfall([
        function (callback) {
            if (trkFile == undefined) {
                callback("Error: need trk file");
                return;
            }
            callback(null, trkFile);
        },
        function (trkFile,callback) {
            fs.readFile(trkFile, function (err, data) {
                if (err) {
                    callback("Error: trk file not found");
                    return;
                }
                jszip.loadAsync(data).then(function (zip) {
                    if (option.clean) {
                        zip.remove("track");
                        zip.remove("track_data");
                    } else {
                        zip.remove("track/net");
                        zip.remove("track_data/network_header");
                        zip.folder("track_data").file("continue_track", "1");
                    }                   
                    var content = zip.generateAsync({
                        compression: "DEFLATE",
                        compressionOptions: {
                            level: 9
                        },
                        type: "nodebuffer"
                    }).then(function (content) {
                        if (!fs.existsSync(outputPath)) {
                            fs.mkdirSync(outputPath);
                        }
                        var mizFile = path.basename(trkFile).split('.')[0] + ".miz";
                        fs.writeFile(outputPath + mizFile, content, function (error) {});
                        console.log("Convert SUCCESS!");
                        callback(null);
                    });
                });
            });
        }
    ], function (err, result) {
        if (err) {
            console.log(err);
        }
    });
}

/**
 * 抽取动画并加入到指定miz中
 * @param {*} trkFile 
 * @param {*} mizFile 
 * @param {*} outputPath 
 */
function merge(trkFile, mizFile, outputPath,outputName) {
    /**
     * 解压zip中的目录到temp中
     * zip JSZip Object
     * folder 文件夹名
     */
    function unzipFolder(zip, folder, cb) {
        var track = zip.folder(folder);
        var zipList = new Array();
        track.forEach(function (path, file) {
            // 忽略部分文件
            if (remove_files.indexOf(path) >= 0) {
                return;
            }
            zipList.push(function (zipCb) {
                file.async('nodebuffer').then(function (content) {
                    var tempFolder = tempPath + folder;
                    if (!fs.existsSync(tempFolder)) {
                        fs.mkdirSync(tempFolder);
                    }
                    var dest = tempFolder + "/" + path;
                    fs.writeFileSync(dest, content);
                    zipCb(null, null);
                });
            });
        });
        async.series(zipList, function (err, result) {
            cb(null);
        });
    }

    /**
     * 
     * @param {*} zip 
     * @param {*} path 
     */

    function addFolderToZip(zip, path) {
        var folder = zip.folder(path);
        var file_names = fs.readdirSync(tempPath + path);
        if (!file_names)
            return;
        file_names.forEach(function (filename) {
            folder.file(filename, fs.readFileSync(tempPath + path + "/" + filename));
        });
    }

    var tempPath = "temp/";
    var remove_files = ["net", "network_header"];

    async.waterfall([
        function (callback) {
            if (trkFile == undefined) {
                callback("Error: need track file");
                return;
            }
            if (mizFile == undefined) {
                callback("Error: need miz file");
                return;
            }
            callback(null, trkFile, mizFile);
        },
        function (trkFile, mizFile, callback) {
            // 获取track中的动画
            fs.readFile(trkFile, function (error, data) {
                if (error) {
                    callback("Error: trk file not found");
                    return;
                }
                if (!fs.existsSync(tempPath)) {
                    fs.mkdirSync(tempPath);
                }
                jszip.loadAsync(data).then(function (zip) {
                    async.parallel([
                        function (cb) {
                            unzipFolder(zip, "track", cb);
                        },
                        function (cb) {
                            unzipFolder(zip, "track_data", cb);
                        }
                    ], function (err, result) {
                        callback(null, mizFile);
                    });
                });
            });
        },
        function (mizFile, callback) {
            // 将动画与现有的miz合并
            fs.readFile(mizFile, function (error, data) {
                if (error) {
                    callback("miz file not found");
                    return;
                }
                jszip.loadAsync(data).then(function (zip) {
                    addFolderToZip(zip, "track");
                    addFolderToZip(zip, "track_data");
                    zip.folder("track_data").file("continue_track", "1");
                    var content = zip.generateAsync({
                        compression: "DEFLATE",
                        compressionOptions: {
                            level: 9
                        },
                        type: "nodebuffer"
                    }).then(function (content) {
                        if (!fs.existsSync(outputPath)) {
                            fs.mkdirSync(outputPath);
                        }
                        if (outputName == null) {
                            outputName = path.basename(mizFile)
                        }
                        fs.writeFile(outputPath + outputName, content, function (error) {});
                        console.log("Merge SUCCESS!");
                        callback(null);
                    });
                });
            });
        },
        function (callback) {
            var files = [];
            function rm(path) {
                if (fs.existsSync(path)) {
                    files = fs.readdirSync(path);
                    files.forEach(function (file, index) {
                        var curPath = path + "/" + file;
                        if (fs.statSync(curPath).isDirectory()) { // recurse
                            rm(curPath);
                        } else {
                            fs.unlinkSync(curPath);
                        }
                    });
                    fs.rmdirSync(path);
                }
            };
            rm(tempPath);
            callback(null, null);
        }
    ], function (err, result) {
        if (err) {
            console.log(err);
        }
    });
}

/**
 * 清空文件中的track信息
 * @param {*} file 
 * @param {*} outputPath 
 */
function clean(file, outputPath, outputFileName = null) {
    async.waterfall([
        function (callback) {
            if (file == undefined) {
                callback("Error: need input file");
                return;
            }
            callback(null, file);
        },
        function (file, callback) {
            fs.readFile(file, function (err, data) {
                if (err) {
                    callback("Error: input file not found");
                    return;
                }
                jszip.loadAsync(data).then(function (zip) {
                    zip.remove("track");
                    zip.remove("track_data");
                    var content = zip.generateAsync({
                        compression: "DEFLATE",
                        compressionOptions: {
                            level: 9
                        },
                        type: "nodebuffer"
                    }).then(function (content) {
                        if (!fs.existsSync(outputPath)) {
                            fs.mkdirSync(outputPath);
                        }
                        if (outputFileName) {
                            file = outputFileName
                        }
                        fs.writeFile(outputPath + file, content, function (error) { });
                        console.log("Clean SUCCESS!");
                        callback(null);
                    });
                });
            });
        }
    ], function (err, result) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports = {
    convert,
    merge,
    clean
}