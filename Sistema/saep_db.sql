CREATE DATABASE saep_db;
USE saep_db;

-- Tabela de usuarios
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(60) NOT NULL
);

-- Tabela de tutores
CREATE TABLE tutores (
    id_tutor INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    cpf VARBINARY(32) NOT NULL,
    cpf_iv BINARY(16) NOT NULL,
    telefone VARCHAR(20),
    endereco VARCHAR(150)
);

-- Tabela de pets
CREATE TABLE pets (
    id_pet INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    especie VARCHAR(50) NOT NULL,
    raca VARCHAR(50),
    id_tutor INT NOT NULL,
    FOREIGN KEY (id_tutor) REFERENCES tutores(id_tutor)
);

-- Tabela de agendamentos
CREATE TABLE agendamentos (
    id_agendamento INT PRIMARY KEY AUTO_INCREMENT,
    data_agendamento DATE NOT NULL,
    horario TIME NOT NULL,
    descricao VARCHAR(150),
    id_pet INT NOT NULL,
    FOREIGN KEY (id_pet) REFERENCES pets(id_pet)
);

-- Cadastro de usuarios
-- Todos possuem a senha de teste 123 protegida por bcrypt

INSERT INTO usuarios (nome, usuario, senha) VALUES
('Administrador', 'admin', '$2b$10$/LZXtPhuJFiZ7wJBxopvI.cFWIsNVeb0K274qp2E.gR6Fs1gipNY6'),
('Maria', 'maria', '$2b$10$1d5rOq2u2yK80Sg0R.blCO2Hg4lw1xAG4bBtZMo5yIJt2DjGhERKO'),
('Joao', 'joao', '$2b$10$ofYwhcoiyCBzhtqjMas3hOQcgEB6Bxf107zfBVAdVWhH0ON5UtUx6');

-- Configuracao da criptografia do CPF
SET SESSION block_encryption_mode = 'aes-256-cbc';

SET @chave = 'chave_teste_clinica';

SET @iv1 = RANDOM_BYTES(16);
SET @iv2 = RANDOM_BYTES(16);
SET @iv3 = RANDOM_BYTES(16);

-- Cadastro de tutores
INSERT INTO tutores 
(nome, cpf, cpf_iv, telefone, endereco) VALUES
('Ana', AES_ENCRYPT('00000000001', @chave, @iv1),
@iv1, '4600001001', 'Rua A'),

('Pedro', AES_ENCRYPT('00000000002', @chave, @iv2),
@iv2, '4600001002', 'Rua B'),

('Lucas', AES_ENCRYPT('00000000003', @chave, @iv3),
@iv3, '4600001003', 'Rua C');

-- Cadastro de pets
INSERT INTO pets (nome, especie, raca, id_tutor) VALUES
('Rex', 'Cachorro', 'Labrador', 1),
('Mimi', 'Gato', 'Siames', 2),
('Luna', 'Cachorro', 'Poodle', 3);

-- Cadastro de agendamentos
INSERT INTO agendamentos 
(data_agendamento, horario, descricao, id_pet) VALUES
('2026-12-01', '09:00:00', 'Consulta', 1),
('2026-12-05', '14:00:00', 'Vacinacao', 2),
('2027-01-10', '10:00:00', 'Retorno', 3);

-- Listagem dos agendamentos com dados do tutor e pet
SELECT
    a.id_agendamento,
    a.data_agendamento,
    a.horario,
    a.descricao,
    p.id_pet,
    p.nome AS pet,
    p.especie,
    p.raca,
    t.id_tutor,
    t.nome AS tutor,
    CAST(AES_DECRYPT(t.cpf, @chave, t.cpf_iv) AS CHAR) AS cpf,
    t.telefone,
    t.endereco
FROM agendamentos a
JOIN pets p ON a.id_pet = p.id_pet
JOIN tutores t ON p.id_tutor = t.id_tutor
ORDER BY a.data_agendamento, a.horario;

-- Verificar registros
SELECT * FROM usuarios;
SELECT * FROM tutores;
SELECT * FROM pets;
SELECT * FROM agendamentos;