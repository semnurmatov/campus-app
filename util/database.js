const mysql = require('mysql2');


const pool = mysql.createPool({
    host: 'sql11.freesqldatabase.com',
    user: 'sql11430893',
    database: 'sql11430893',
    password: 'htRITgP64G'
    
    // host: process.env.DATABASE_AMZ,
    // user: process.env.DATABASE_USER,
    // database: process.env.DATABASE_NAME,
    // password: process.env.DATABASE_PASSWORD

    // host: 'localhost',
    // user: 'root',
    // database: 'campusApp',
    // password: 'redblack'
});

module.exports = pool.promise();