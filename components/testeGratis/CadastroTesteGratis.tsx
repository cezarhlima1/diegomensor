"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { SENHA_MIN, emailValido } from "@/components/auth/authLogic";
import { telefoneValido } from "./testeGratisLogic";
import { registrarTesteGratis } from "./actions";

type Campos = {
  nomeCompleto: string;
  nomeEmpresa: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
};

type ErrosCampos = Partial<Record<keyof Campos, string>>;

const vazio: Campos = {
  nomeCompleto: "",
  nomeEmpresa: "",
  email: "",
  telefone: "",
  senha: "",
  confirmarSenha: "",
};

/**
 * Valida os campos no client ANTES de chamar a server action — feedback
 * imediato por campo (mesmo padrão de components/Cadastro.tsx). A action
 * repete toda validação no servidor (nunca confia só nesta checagem).
 */
function validar(dados: Campos): ErrosCampos {
  const erros: ErrosCampos = {};
  if (dados.nomeCompleto.trim().length < 3) erros.nomeCompleto = "Digite seu nome completo.";
  if (dados.nomeEmpresa.trim().length < 2) erros.nomeEmpresa = "Digite o nome da sua oficina/empresa.";
  if (!emailValido(dados.email.trim())) erros.email = "Digite um e-mail válido.";
  if (!telefoneValido(dados.telefone)) erros.telefone = "Digite um telefone com DDD.";
  if (dados.senha.length < SENHA_MIN) erros.senha = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (dados.confirmarSenha !== dados.senha) erros.confirmarSenha = "As senhas não coincidem.";
  return erros;
}

/**
 * Formulário de cadastro público de teste grátis (3 dias). Submissão válida:
 * chama a server action registrarTesteGratis (cria usuário + empresa +
 * licença de teste) e, em caso de sucesso, autentica o lead no browser
 * (signInWithPassword) e navega para /calculadora — o usuário nunca vê a
 * tela de login, o teste já começa logado.
 */
export default function CadastroTesteGratis() {
  const [campos, setCampos] = useState<Campos>(vazio);
  const [erros, setErros] = useState<ErrosCampos>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function atualizar(campo: keyof Campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;

    const encontrados = validar(campos);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setErroEnvio(null);
    setEnviando(true);
    try {
      const resultado = await registrarTesteGratis({
        nomeCompleto: campos.nomeCompleto,
        nomeEmpresa: campos.nomeEmpresa,
        email: campos.email,
        telefone: campos.telefone,
        senha: campos.senha,
      });
      if (!resultado.ok) {
        setErroEnvio(resultado.error);
        setEnviando(false);
        return;
      }

      // Conta criada — autentica no browser para o lead já entrar logado.
      const supabase = createSupabaseBrowserClient();
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: campos.email.trim().toLowerCase(),
        password: campos.senha,
      });
      if (erroLogin) {
        // Conta existe e está pronta; só o login automático falhou (ex.: rede).
        // Não deixa o lead travado: manda para /login com a conta já pronta.
        setErroEnvio("Conta criada! Não foi possível entrar automaticamente — faça login para continuar.");
        setEnviando(false);
        return;
      }

      window.location.assign("/calculadora");
    } catch (err) {
      console.error("CadastroTesteGratis: falha inesperada ao cadastrar:", err);
      setErroEnvio("Não foi possível concluir o cadastro. Tente novamente em instantes.");
      setEnviando(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={enviar} noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="tg-nome" className="quiz-label">
          Nome completo
        </label>
        <input
          id="tg-nome"
          type="text"
          autoComplete="name"
          className={`quiz-input ${erros.nomeCompleto ? "is-invalid" : ""}`}
          placeholder="Seu nome completo"
          value={campos.nomeCompleto}
          onChange={(e) => atualizar("nomeCompleto", e.target.value)}
        />
        {erros.nomeCompleto && <span className="quiz-error">{erros.nomeCompleto}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="tg-empresa" className="quiz-label">
          Nome da empresa
        </label>
        <input
          id="tg-empresa"
          type="text"
          autoComplete="organization"
          className={`quiz-input ${erros.nomeEmpresa ? "is-invalid" : ""}`}
          placeholder="Nome da sua oficina"
          value={campos.nomeEmpresa}
          onChange={(e) => atualizar("nomeEmpresa", e.target.value)}
        />
        {erros.nomeEmpresa && <span className="quiz-error">{erros.nomeEmpresa}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="tg-email" className="quiz-label">
          E-mail
        </label>
        <input
          id="tg-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={`quiz-input ${erros.email ? "is-invalid" : ""}`}
          placeholder="voce@suaoficina.com.br"
          value={campos.email}
          onChange={(e) => atualizar("email", e.target.value)}
        />
        {erros.email && <span className="quiz-error">{erros.email}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="tg-telefone" className="quiz-label">
          Telefone (com DDD)
        </label>
        <input
          id="tg-telefone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className={`quiz-input ${erros.telefone ? "is-invalid" : ""}`}
          placeholder="(00) 00000-0000"
          value={campos.telefone}
          onChange={(e) => atualizar("telefone", e.target.value)}
        />
        {erros.telefone && <span className="quiz-error">{erros.telefone}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="tg-senha" className="quiz-label">
          Senha
        </label>
        <div className="password-field">
          <input
            id="tg-senha"
            type={senhaVisivel ? "text" : "password"}
            autoComplete="new-password"
            className={`quiz-input ${erros.senha ? "is-invalid" : ""}`}
            placeholder="Crie uma senha"
            value={campos.senha}
            onChange={(e) => atualizar("senha", e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setSenhaVisivel((visivel) => !visivel)}
            aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={senhaVisivel}
          >
            {senhaVisivel ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {erros.senha && <span className="quiz-error">{erros.senha}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="tg-confirmar-senha" className="quiz-label">
          Confirmar senha
        </label>
        <input
          id="tg-confirmar-senha"
          type={senhaVisivel ? "text" : "password"}
          autoComplete="new-password"
          className={`quiz-input ${erros.confirmarSenha ? "is-invalid" : ""}`}
          placeholder="Digite a senha novamente"
          value={campos.confirmarSenha}
          onChange={(e) => atualizar("confirmarSenha", e.target.value)}
        />
        {erros.confirmarSenha && <span className="quiz-error">{erros.confirmarSenha}</span>}
      </div>

      {erroEnvio && (
        <p className="auth-erro" role="alert">
          {erroEnvio}
        </p>
      )}

      <button type="submit" className="btn btn--wide mt-2" disabled={enviando}>
        {enviando ? "Criando sua conta…" : "Começar meu teste grátis"}
      </button>

      <p className="reassure text-center">
        <b>Grátis por 3 dias</b> · sem cartão de crédito · cancele quando quiser
      </p>
    </form>
  );
}
