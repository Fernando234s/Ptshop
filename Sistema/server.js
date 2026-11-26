const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./db");

const app = express();app.get("/style.css", (req, res) => {
    res.sendFile(__dirname + "/style.css");
});
const chave = process.env.CPF_KEY || "chave_teste_clinica";

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1800000 }
}));

// LOGIN

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/login/login.html");
});

app.post("/login", async (req, res) => {
    const { usuario, senha } = req.body;

    const [dados] = await (await db).query(
        "SELECT * FROM usuarios WHERE usuario = ?",
        [usuario]
    );

    if (dados.length > 0 &&
        bcrypt.compareSync(senha, dados[0].senha)) {

        req.session.regenerate(erro => {
            if (erro) return res.send("Erro na sessão");

            req.session.nome = dados[0].nome;
            req.session.expiracao = Date.now() + 1800000;

            res.redirect("/principal");
        });

    } else {
        res.redirect("/?erro=1");
    }
});

// AUTENTICAÇÃO

app.use((req, res, next) => {
    if (!req.session.nome ||
        Date.now() >= req.session.expiracao) {

        return res.redirect("/");
    }

    res.set("Cache-Control", "no-store");
    next();
});

// TELA PRINCIPAL

app.get("/principal", (req, res) => {
    res.sendFile(__dirname + "/principal/principal.html");
});

app.get("/usuario", (req, res) => {
    res.json({
        nome: req.session.nome,
        expiracao: req.session.expiracao
    });
});

app.post("/sair", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// TUTORES

app.get("/tutores", (req, res) => {
    res.sendFile(__dirname + "/tutores/tutores.html");
});

// Listar e pesquisar tutores
app.get("/api/tutores", async (req, res) => {
    const busca = req.query.busca || "";

    const [dados] = await (await db).query(`
        SELECT id_tutor, nome, telefone, endereco,
        CAST(AES_DECRYPT(cpf, ?, cpf_iv) AS CHAR) AS cpf
        FROM tutores
        WHERE nome LIKE ?
        ORDER BY nome
    `, [chave, "%" + busca + "%"]);

    res.json(dados);
});

// Cadastrar e editar tutor
app.post("/tutores/salvar", async (req, res) => {
    const { id, nome, telefone, endereco } = req.body;
    const cpf = req.body.cpf.replace(/\D/g, "");

    if (!nome.trim() || cpf.length !== 11) {
        return res.send("Nome ou CPF inválido");
    }

    const iv = crypto.randomBytes(16);

    if (id) {
        await (await db).query(`
            UPDATE tutores SET
            nome = ?,
            cpf = AES_ENCRYPT(?, ?, ?),
            cpf_iv = ?,
            telefone = ?,
            endereco = ?
            WHERE id_tutor = ?
        `, [nome, cpf, chave, iv, iv,
            telefone, endereco, id]);

    } else {
        await (await db).query(`
            INSERT INTO tutores
            (nome, cpf, cpf_iv, telefone, endereco)
            VALUES (?, AES_ENCRYPT(?, ?, ?), ?, ?, ?)
        `, [nome, cpf, chave, iv, iv,
            telefone, endereco]);
    }

    res.redirect("/tutores");
});

// PETS

app.get("/pets", (req, res) => {
    res.sendFile(__dirname + "/pets/pets.html");
});

// Listar pets
app.get("/api/pets", async (req, res) => {
    const [dados] = await (await db).query(`
        SELECT pets.*, tutores.nome AS tutor
        FROM pets
        JOIN tutores ON pets.id_tutor = tutores.id_tutor
        ORDER BY pets.nome
    `);

    res.json(dados);
});

// Cadastrar pet
app.post("/pets/cadastrar", async (req, res) => {
    const { nome, especie, raca, id_tutor } = req.body;

    await (await db).query(`
        INSERT INTO pets (nome, especie, raca, id_tutor)
        VALUES (?, ?, ?, ?)
    `, [nome, especie, raca, id_tutor]);

    res.redirect("/pets");
});

// AGENDAMENTOS

app.get("/agendamentos", (req, res) => {
    res.sendFile(
        __dirname + "/agendamentos/agendamentos.html"
    );
});

// Listar agendamentos
app.get("/api/agendamentos", async (req, res) => {
    const [dados] = await (await db).query(`
        SELECT
        a.id_agendamento,
        DATE_FORMAT(a.data_agendamento, '%Y-%m-%d') AS data,
        a.horario,
        a.descricao,
        p.id_pet,
        p.nome AS pet,
        p.especie,
        p.raca,
        t.id_tutor,
        t.nome AS tutor,
        CAST(AES_DECRYPT(t.cpf, ?, t.cpf_iv) AS CHAR) AS cpf,
        t.telefone,
        t.endereco
        FROM agendamentos a
        JOIN pets p ON a.id_pet = p.id_pet
        JOIN tutores t ON p.id_tutor = t.id_tutor
        ORDER BY a.data_agendamento, a.horario
    `, [chave]);

    res.json(dados);
});

// Cadastrar agendamento
app.post("/agendamentos/cadastrar", async (req, res) => {
    const { data, horario, descricao, id_pet } = req.body;

    await (await db).query(`
        INSERT INTO agendamentos
        (data_agendamento, horario, descricao, id_pet)
        VALUES (?, ?, ?, ?)
    `, [data, horario, descricao, id_pet]);

    res.redirect("/agendamentos");
});

// Alterar data do agendamento
app.post("/agendamentos/editar", async (req, res) => {
    const { id, data } = req.body;

    await (await db).query(`
        UPDATE agendamentos
        SET data_agendamento = ?
        WHERE id_agendamento = ?
    `, [data, id]);

    res.redirect("/agendamentos");
});

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.log(erro.message);
    res.status(500).send("Erro ao realizar operação");
});

// Iniciar servidor
db.then(() => {
    app.listen(3000, () => {
        console.log("Servidor funcionando!");
    });
}).catch(erro => {
    console.log(erro.message);
});