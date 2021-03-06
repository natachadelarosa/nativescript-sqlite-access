import { DbBuilder, IDatabase } from "nativescript-sqlite-access";
import { databaseName, databaseTables } from "../db-setting";

describe("#replace()", function() {
    let database: IDatabase;
    before(function() {
        database = DbBuilder(databaseName);
    });

    it("replace person #2 ", function(done) {
        database.replace(databaseTables.PERSONS, {
            name: "Filly Lollo",
            _id: 2
        });

        database.query(databaseTables.PERSONS, ["name"], "_id=?", [1]).process()
        .then(function(results) {
            let result = results.pop();
            done(result.name === "Filly Lollo");
        })
        .catch(done);

    });

    it("replace person and committed", function(done) {
        database.beginTransact();
        database.replace(databaseTables.PERSONS, {
            name: "Mixed Box",
            _id: 2
        });
        database.commit();

        database.query(databaseTables.PERSONS, ["name"], "_id=?", [1]).process()
        .then(function(results) {
            let result = results.pop();
            done(result.name === "Mixed Box");
        })
        .catch(done);
    });

    it("replace person and rollback", function(done) {
        database.beginTransact();
        database.replace(databaseTables.PERSONS, {
            name: "Facebook is bad",
            _id: 2
        });
        database.rollback();

        database.query(databaseTables.PERSONS, ["name"], "_id=?", [1]).process()
        .then(function(results) {
            let result = results.pop();
            done(result.name === "Mixed Box");
        })
        .catch(done);
    });

    after(function() {
        database.close();
    });

});
