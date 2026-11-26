const mysql = require("mysql2/promise");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "admin",
    database: "saep_db"
}).then(async conexao => {

    await conexao.query(
        "SET SESSION block_encryption_mode = 'aes-256-cbc'"
    );

    console.log("Banco conectado!");

    return conexao;
});

module.exports = db;