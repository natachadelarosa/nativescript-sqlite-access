"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("tns-core-modules/file-system");
var sqlite_access_common_1 = require("./sqlite-access.common");
var _db;
var _dataReturnedType;
var SqliteAccess = (function () {
    function SqliteAccess(db, returnType) {
        _db = db;
        _dataReturnedType = returnType;
    }
    SqliteAccess.prototype.insert = function (tableName, values) {
        this.execSQL("INSERT INTO " + tableName + " (" + Object.keys(values).join(",") + ") VALUES(" + __mapToAddOrUpdateValues(values, true) + ")");
        var value = sqlite3_last_insert_rowid(_db.value);
        return Number(value);
    };
    SqliteAccess.prototype.replace = function (tableName, values) {
        this.execSQL("REPLACE INTO " + tableName + " (" + Object.keys(values).join(",") + ") VALUES(" + __mapToAddOrUpdateValues(values, true) + ")");
        var value = sqlite3_changes(_db.value);
        return Number(value);
    };
    SqliteAccess.prototype.update = function (tableName, values, whereClause, whereArs) {
        whereClause = whereClause && "WHERE " + whereClause.replace(/\?/g, __replaceQuestionMarkForParams(whereArs)) || "";
        this.execSQL("UPDATE " + tableName + " SET " + __mapToAddOrUpdateValues(values, false) + " " + whereClause);
        var value = sqlite3_changes(_db.value);
        return Number(value);
    };
    SqliteAccess.prototype.delete = function (tableName, whereClause, whereArgs) {
        whereClause = whereClause && "WHERE " + whereClause.replace(/\?/g, __replaceQuestionMarkForParams(whereArgs)) || "";
        this.execSQL("DELETE FROM " + tableName + " " + whereClause);
        var value = sqlite3_changes(_db.value);
        return Number(value);
    };
    SqliteAccess.prototype.select = function (sql, conditionParams) {
        return new sqlite_access_common_1.ExtendedPromise(function (subscribers, resolve, error) {
            try {
                sql = sql.replace(/\?/g, __replaceQuestionMarkForParams(conditionParams));
                var cursor = __execQueryAndReturnStatement(sql, _db);
                var result = __processCursor(cursor, _dataReturnedType, subscribers.shift());
                resolve(result);
            }
            catch (ex) {
                error(ex);
            }
        });
    };
    SqliteAccess.prototype.query = function (tableName, columns, selection, selectionArgs, groupBy, orderBy, limit) {
        selection = selection && "WHERE " + selection.replace(/\?/g, __replaceQuestionMarkForParams(selectionArgs)) || "";
        groupBy = groupBy && "GROUP BY " + groupBy || "";
        orderBy = orderBy && "ORDER BY " + orderBy || "";
        limit = limit && "LIMIT " + limit || "";
        var _columns = columns && columns.join(',') || tableName + ".*";
        var query = "SELECT " + _columns + " FROM " + tableName + " " + selection + " " + groupBy + " " + orderBy + " " + limit;
        return new sqlite_access_common_1.ExtendedPromise(function (subscribers, resolve, error) {
            try {
                var cursor = __execQueryAndReturnStatement(query, _db);
                var result = __processCursor(cursor, _dataReturnedType, subscribers.shift());
                resolve(result);
            }
            catch (ex) {
                error("ErrCode:" + ex);
            }
        });
    };
    SqliteAccess.prototype.execSQL = function (sql) {
        var cursorRef;
        cursorRef = __execQueryAndReturnStatement(sql, _db);
        sqlite3_finalize(cursorRef.value);
    };
    SqliteAccess.prototype.beginTransact = function () {
        this.execSQL("BEGIN TRANSACTION");
    };
    SqliteAccess.prototype.commit = function () {
        this.execSQL("COMMIT TRANSACTION");
    };
    SqliteAccess.prototype.rollback = function () {
        this.execSQL("ROLLBACK TRANSACTION");
    };
    SqliteAccess.prototype.close = function () {
        if (_db === null) {
            return;
        }
        sqlite3_close(_db.value);
        _db = null;
    };
    return SqliteAccess;
}());
function __execQueryAndReturnStatement(sql, dbPointer) {
    var cursorRef = new interop.Reference();
    var resultCode = sqlite3_prepare_v2(dbPointer.value, sql, -1, cursorRef, null);
    var applyStatementCode = sqlite3_step(cursorRef.value);
    if (resultCode !== 0 || (applyStatementCode !== 101 && applyStatementCode !== 100)) {
        sqlite3_finalize(cursorRef.value);
        cursorRef.value = null;
        cursorRef = null;
        throw NSString.stringWithUTF8String(sqlite3_errmsg(dbPointer.value)).toString();
    }
    return cursorRef.value;
}
function __replaceQuestionMarkForParams(whereParams) {
    var counter = 0;
    return function () {
        return sqlite_access_common_1.parseToDbValue(whereParams[counter++]);
    };
}
function __processCursor(cursorRef, returnType, reduceOrMapSub) {
    var result = reduceOrMapSub && reduceOrMapSub.initialValue || [];
    var dbValue = null, hasData = sqlite3_data_count(cursorRef) > 0;
    if (hasData) {
        var counter = 0;
        do {
            dbValue = __getRowValues(cursorRef, returnType);
            if (reduceOrMapSub) {
                if (reduceOrMapSub.initialValue) {
                    result = reduceOrMapSub.callback(result, dbValue, counter++);
                    continue;
                }
                dbValue = reduceOrMapSub.callback(dbValue, counter++);
            }
            result.push(dbValue);
        } while (sqlite3_step(cursorRef) === 100);
    }
    sqlite3_finalize(cursorRef);
    return result;
}
function __getRowValues(cursor, returnType) {
    var rowValue = {};
    if (returnType === 1) {
        rowValue = [];
    }
    var primitiveType = null;
    var columnName = '';
    var value = null;
    var columnCount = sqlite3_column_count(cursor);
    for (var i = 0; i < columnCount; i++) {
        primitiveType = sqlite3_column_type(cursor, i);
        columnName = sqlite3_column_name(cursor, i);
        columnName = NSString.stringWithUTF8String(columnName).toString();
        switch (primitiveType) {
            case 1:
                value = sqlite3_column_int64(cursor, i);
                break;
            case 2:
                value = sqlite3_column_double(cursor, i);
                break;
            case 3:
                value = sqlite3_column_text(cursor, i);
                value = NSString.stringWithUTF8String(value).toString();
                value = sqlite_access_common_1.parseToJsValue(value);
                break;
            case 4:
                continue;
            case 5:
                value = null;
                break;
        }
        if (Array.isArray(rowValue) && returnType === 1) {
            rowValue.push(value);
            continue;
        }
        rowValue[columnName] = value;
    }
    return rowValue;
}
function __openCreateDataBase(dbName, mode) {
    var dbInstance = new interop.Reference();
    var resultCode = 0;
    if (dbName === ":memory:") {
        resultCode = sqlite3_open_v2(dbName, dbInstance, mode | 296, null);
    }
    else {
        dbName = fs.knownFolders.documents().path + "/" + dbName;
        mode = mode | 4;
        resultCode = sqlite3_open_v2(dbName, dbInstance, mode, null);
    }
    if (resultCode !== 0) {
        throw "Could not open database. sqlite error code " + resultCode;
    }
    return dbInstance;
}
function __mapToAddOrUpdateValues(values, inserting) {
    if (inserting === void 0) { inserting = true; }
    var contentValues = [];
    for (var key in values) {
        if (values.hasOwnProperty(key)) {
            var value = sqlite_access_common_1.parseToDbValue(values[key]);
            value = value === null ? 'null' : value;
            contentValues.push(inserting ? value : key + "=" + value);
        }
    }
    return contentValues.join(",");
}
function DbBuilder(dbName, options) {
    if (!dbName)
        throw "Must specify a db name";
    options = options || ({
        version: 1
    });
    options.version = options.version || 1;
    options.returnType = options.returnType || 0;
    var db = __openCreateDataBase(dbName, 2);
    var currVersion = __dbVersion(db);
    if (options.version > currVersion) {
        __dbVersion(db, options.version);
        var tableCreateScripts = options.createTableScriptsFn && options.createTableScriptsFn();
        var tableDroptScripts = options.dropTableScriptsFn && options.dropTableScriptsFn();
        try {
            if (tableDroptScripts && currVersion > 0) {
                for (var script in tableDroptScripts) {
                    var cursorRef = __execQueryAndReturnStatement(tableDroptScripts[script], db);
                    sqlite3_finalize(cursorRef);
                }
            }
            if (tableCreateScripts) {
                for (var script in tableCreateScripts) {
                    var cursorRef = __execQueryAndReturnStatement(tableCreateScripts[script], db);
                    sqlite3_finalize(cursorRef);
                }
            }
        }
        catch (error) {
            __dbVersion(db, currVersion);
            sqlite3_close(db);
            throw error;
        }
    }
    else if (options.version < currVersion) {
        sqlite3_close(db);
        throw "It is not possible to set the version " + options.version + " to database, because is lower then current version, Db current version is " + currVersion;
    }
    return new SqliteAccess(db, options.returnType);
}
exports.DbBuilder = DbBuilder;
function __dbVersion(db, version) {
    var sql = "PRAGMA user_version";
    if (isNaN(version)) {
        version = __execQueryReturnOneArrayRow(db, sql).pop();
    }
    else {
        var cursorRef = __execQueryAndReturnStatement(sql + "=" + version, db);
        sqlite3_finalize(cursorRef);
    }
    return version;
}
function __execQueryReturnOneArrayRow(db, query) {
    var cursorRef = __execQueryAndReturnStatement(query, db);
    var result = __processCursor(cursorRef, 1);
    return result.shift();
}
__export(require("./sqlite-access.common"));
//# sourceMappingURL=sqlite-access.ios.js.map