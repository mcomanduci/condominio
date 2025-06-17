import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
let app, db, auth, userId, appId;
const localDB = {
  condominios: [],
  unidades: [],
  fornecedores: [],
  financeiro: [],
  infracoes: [],
  configInfracoes: [],
  recibos: [],
  configuracao: { assinatura: null, nomeCondominio: "", nomeSindico: "" },
  gruposPagar: [],
  gruposReceber: [],
};
let signaturePad, currentReceiptData;

// --- UTILS ---
const parseCurrency = (str) => {
  if (!str || typeof str !== "string") return 0;
  return parseFloat(
    str.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
  );
};
const parseDateToISO = (str) => {
  if (!str || typeof str !== "string" || !str.includes("/")) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};
const formatDateFromISO = (iso) => {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

// --- DATABASE INITIAL DATA (Only for first time seeding) ---
const db_raw = {
  condominios: [
    {
      nome: "Solares",
      sindico: "Bruno Fabrini",
      sub_sindico: "",
      telefone: "37984088946",
      email: "edificiosolares74@gmail.com",
      endereco: "Rua Bahia, 74, Divinópolis, Centro",
    },
  ],
  unidades: [
    {
      unidade: "101",
      responsavel: "Thiago Martins da Silva",
      cpf: "111.111.111-11",
      telefone: "37998452512",
      email: "thiagomartins@gmail.com",
    },
    {
      unidade: "102",
      responsavel: "Delvair Dorica Do Nascimento Reis",
      cpf: "222.222.222-22",
      telefone: "37999582808",
      email: "DELVA.DORICA@GMAIL.COM",
    },
    {
      unidade: "201",
      responsavel: "Ivone Araujo Oliveira",
      cpf: "333.333.333-33",
      telefone: "37988194081",
      email: "ia_brindes@hotmail.com",
    },
    {
      unidade: "202",
      responsavel: "Milton Demis Guimarães",
      cpf: "444.444.444-44",
      telefone: "37984268101",
      email: "mdguima@hotmail.com",
    },
    {
      unidade: "301",
      responsavel: "Bruno Chaves Fabrini",
      cpf: "555.555.555-55",
      telefone: "37984088946",
      email: "brunocfabrini@yahoo.com.br",
    },
    {
      unidade: "302",
      responsavel: "Márcia Valéria de Freitas Melo",
      cpf: "666.666.666-66",
      telefone: "37998054098",
      email: "marciavaleriafreitasmelo@gmail.com",
    },
    {
      unidade: "401",
      responsavel: "Rosa Maria e Silva",
      cpf: "777.777.777-77",
      telefone: "37988030877",
      email: "rosamaria210157@gmail.com",
    },
    {
      unidade: "402",
      responsavel: "Alair Moura",
      cpf: "888.888.888-88",
      telefone: "37998704277",
      email: "thiago.emoura2012@gmail.com",
    },
    {
      unidade: "501",
      responsavel: "Renata Gontijo Gomes Dias",
      cpf: "999.999.999-99",
      telefone: "37998683549",
      email: "renatagontijogomesdias@gmail.com",
    },
    {
      unidade: "Loja 64",
      responsavel: "Delvair Dorica Do Nascimento Reis",
      cpf: "000.000.000-00",
      telefone: "37999582808",
      email: "DELVA.DORICA@GMAIL.COM",
    },
    {
      unidade: "Loja 68",
      responsavel: "",
      cpf: "",
      telefone: "",
      email: "",
    },
  ],
  fornecedores: [
    {
      nome: "Cia de Saneamento de MG",
      telefone: "",
      responsavel: "",
      pix: "",
      endereco: "",
    },
    {
      nome: "Fernando Eletricista",
      telefone: "37988147987",
      responsavel: "",
      pix: "37991144518",
      endereco: "",
    },
    {
      nome: "CEMIG",
      telefone: "",
      responsavel: "",
      pix: "",
      endereco: "",
    },
    {
      nome: "Edna",
      telefone: "",
      responsavel: "",
      pix: "",
      endereco: "",
    },
  ],
  financeiro: [
    {
      data: "08/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 202 - Demmis",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 207,00",
      dt_pag_rec: "08/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 301 - Bruno",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 167,00",
      dt_pag_rec: "08/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento:
        "faxina que faltava para fechar o mês de abril foi pago pela Rosa do 401.",
      valor: "R$ 75,00",
      dt_pag_rec: "02/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "INSS referente ao mês de Abril.",
      valor: "R$ 165,00",
      dt_pag_rec: "02/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Entrada",
      classificacao: "Fundo",
      pagador: "Condomínio",
      detalhamento: "Foi entregue 950 reais das reservas do alair.",
      valor: "R$ 950,00",
      dt_pag_rec: "08/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 501 - Renata",
      detalhamento: "Codomínio referente ao mês de março",
      valor: "R$ 338,00",
      dt_pag_rec: "05/05/2025",
    },
    {
      data: "08/05/2025",
      movimento: "Saída",
      classificacao: "Despesas fixas",
      pagador: "Cia de Saneamento de MG",
      detalhamento:
        "Conta de água referente ao mês de abril. Conta foi paga de forma digital pelo morador do 301. Foi retirado 645 do fundo para o pagamento do morador visto que ele tinha ainda que pagar a taxa de codomínio",
      vencimento: "15/05/2025",
      valor: "R$ 812,73",
      dt_pag_rec: "08/05/2025",
    },
    {
      data: "09/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento:
        "Primeira Faxina referente ao mês de maio. foi pago pela Rosa do 401",
      valor: "R$ 75,00",
      dt_pag_rec: "02/05/2025",
    },
    {
      data: "09/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento:
        "Segunda Faxina referente ao Mês de maio. foi pago pela Rosa do 402.",
      valor: "R$ 75,00",
      dt_pag_rec: "08/05/2025",
    },
    {
      data: "09/05/2025",
      movimento: "Entrada",
      classificacao: "Fundo",
      pagador: "Condomínio",
      detalhamento: "Fundo que havia na bolsa do alair para pagar a Rosa",
      valor: "R$ 300,00",
      dt_pag_rec: "02/05/2025",
    },
    {
      data: "09/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 401 - Rosa",
      detalhamento:
        "Rosa pagou 77 do condomínio dela, foi descontado 90 reais do que ela tinha pagado para a Edna",
      valor: "R$ 77,00",
      dt_pag_rec: "09/05/2025",
    },
    {
      data: "14/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 201 - Ivone",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 192,00",
      dt_pag_rec: "13/05/2025",
    },
    {
      data: "14/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 302 - Marcia",
      detalhamento:
        "Condomínio referente ao mês de abril. O dela é 192, mas me passou 200. Então tenho que descontar 8 reais do próximo aluguel ou então dar a ela o troco",
      valor: "R$ 200,00",
      dt_pag_rec: "13/05/2025",
    },
    {
      data: "14/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 402 - Alair",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 216,00",
      dt_pag_rec: "13/05/2025",
    },
    {
      data: "14/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 501 - Renata",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 291,00",
      dt_pag_rec: "13/05/2025",
    },
    {
      data: "02/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 102 - Delva",
      detalhamento: "Condomínio referente ao mês de Março",
      valor: "R$ 197,00",
      dt_pag_rec: "02/05/2025",
    },
    {
      data: "02/05/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 101 - Thiago",
      detalhamento: "Condomínio referente ao mês de Março",
      valor: "R$ 167,00",
      dt_pag_rec: "29/05/2025",
    },
    {
      data: "20/05/2025",
      movimento: "Saída",
      classificacao: "Serviços contratados",
      pagador: "Fernando Eletricista",
      detalhamento: "Sensor de presença da garagem trocado",
      valor: "R$ 139,90",
      dt_pag_rec: "15/05/2025",
    },
    {
      data: "22/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "Terceira Faxina referente ao mês de maio.",
      valor: "R$ 75,00",
      dt_pag_rec: "15/05/2025",
    },
    {
      data: "23/05/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "Quarta Faxina referente ao mês de maio.",
      valor: "R$ 75,00",
      dt_pag_rec: "22/05/2025",
    },
    {
      data: "02/06/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "Quinta Faxina referente ao mês de maio.",
      valor: "R$ 75,00",
      dt_pag_rec: "29/05/2025",
    },
    {
      data: "02/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Loja 64 - Delva",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 30,00",
      dt_pag_rec: "02/06/2025",
    },
    {
      data: "09/06/2025",
      movimento: "Saída",
      classificacao: "Despesas fixas",
      pagador: "Cia de Saneamento de MG",
      detalhamento: "Conta de Água referente ao mês de Maio",
      vencimento: "15/06/2025",
      valor: "R$ 574,16",
      dt_pag_rec: "14/06/2025",
    },
    {
      data: "10/06/2025",
      movimento: "Saída",
      classificacao: "Despesas fixas",
      pagador: "CEMIG",
      detalhamento:
        "Conta de energia referente a JUN/2025. A conta estava zerada",
      vencimento: "23/06/2025",
      valor: "R$ 69,02",
      dt_pag_rec: "13/06/2025",
    },
    {
      data: "13/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 102 - Delva",
      detalhamento: "Condomínio referente ao mês de Maio",
      valor: "R$ 222,00",
      dt_pag_rec: "12/06/2025",
    },
    {
      data: "13/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Loja 64 - Delva",
      detalhamento: "Condomínio referente ao mês de Maio",
      valor: "R$ 30,00",
      dt_pag_rec: "12/06/2025",
    },
    {
      data: "13/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 202 - Demmis",
      detalhamento: "Condomínio referente ao mês de Maio",
      valor: "R$ 228,00",
      dt_pag_rec: "12/06/2025",
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 401 - Rosa",
      detalhamento: "Condomínio referente ao mês de Maio",
      valor: "R$ 192,00",
      dt_pag_rec: "12/06/2025",
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 301 - Bruno",
      detalhamento: "Condomínio referente ao mês de Maio / ZERADO",
      valor: "R$ 0,00",
      dt_pag_rec: "12/06/2025",
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 302 - Marcia",
      detalhamento: "Condomínio referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 213,00",
      dt_pag_rec: "13/06/2025",
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 402 - Alair",
      detalhamento: "Condomínio referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 235,00",
      dt_pag_rec: "13/06/2025",
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 501 - Renata",
      detalhamento: "Condomínio referente ao mês de Maio",
      valor: "R$ 306,00",
      dt_pag_rec: "12/06/2025",
    },
    // Lembretes
    {
      data: "02/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Loja 68",
      detalhamento: "Condomínio referente ao mês de Março",
      valor: "R$ 40,00",
      dt_pag_rec: null,
    },
    {
      data: "02/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Loja 68",
      detalhamento: "Condomínio referente ao mês de Abril",
      valor: "R$ 40,00",
      dt_pag_rec: null,
    },
    {
      data: "09/06/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "Primeira faxina referente ao mês de junho",
      vencimento: "05/06/2025",
      valor: "R$ 75,00",
      dt_pag_rec: null,
    },
    {
      data: "09/06/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "Segunda faxina referente ao mês de junho",
      vencimento: "12/06/2025",
      valor: "R$ 75,00",
      dt_pag_rec: null,
    },
    {
      data: "09/06/2025",
      movimento: "Saída",
      classificacao: "Despesas com pessoal",
      pagador: "Edna",
      detalhamento: "INSS referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 165,00",
      dt_pag_rec: null,
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 101 - Thiago",
      detalhamento: "Condomínio referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 192,00",
      dt_pag_rec: null,
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Loja 68",
      detalhamento: "Condomínio referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 40,00",
      dt_pag_rec: null,
    },
    {
      data: "14/06/2025",
      movimento: "Entrada",
      classificacao: "Cotas condominiais",
      pagador: "Morador 201 - Ivone",
      detalhamento: "Condomínio referente ao mês de Maio",
      vencimento: "12/06/2025",
      valor: "R$ 213,00",
      dt_pag_rec: null,
    },
  ],
  configInfracoes: [
    {
      nome: "Barulho após horário permitido",
      artigo: 'Alínea "b" do §1º do Art. 22 da Lei nº 4.591/64...',
      sancao: "Multa de 10% da cota condominial",
      recurso: "Prazo de 5 dias úteis para defesa escrita",
    },
    {
      nome: "Uso indevido da garagem",
      artigo: 'Conforme a alínea "b" do §1º do Art. 22 da Lei nº 4.591/64...',
      sancao: "Multa de 5% da cota condominial",
      recurso: "Recurso à administradora por escrito",
    },
    {
      nome: "Animais soltos nas áreas comuns",
      artigo: 'Embasaa na alínea "b" do §1º do Art. 22 da Lei nº 4.591/64...',
      sancao: "Multa de 10% (1ª) > 20% (2ª) da cota",
      recurso: "Recurso será avaliado em assembleia",
    },
  ],
};

// --- DATA TRANSFORMATION AND INITIALIZATION ---
function initializeDatabase(raw) {
  const db = {};
  db.condominios = raw.condominios.map((item, index) => ({
    ...item,
    id: (index + 1).toString(),
  }));
  db.unidades = raw.unidades.map((item, index) => ({
    ...item,
    id: (index + 1).toString(),
    condominioId: "1",
    bloco: item.unidade.includes("Loja") ? "Loja" : "A",
    apto: item.unidade,
  }));
  db.fornecedores = raw.fornecedores.map((item, index) => ({
    ...item,
    id: (index + 1).toString(),
  }));

  db.financeiro = raw.financeiro.map((item, index) => {
    const tipo =
      item.movimento.toUpperCase() === "ENTRADA" ? "RECEITA" : "DESPESA";
    const dt_pag_rec = parseDateToISO(item.dt_pag_rec);
    const status = dt_pag_rec
      ? tipo === "RECEITA"
        ? "RECEBIDO"
        : "PAGO"
      : tipo === "RECEITA"
      ? "A RECEBER"
      : "A PAGAR";
    return {
      id: (index + 1).toString(),
      data: parseDateToISO(item.data),
      tipo,
      grupo: item.classificacao,
      descricao: item.detalhamento,
      pagador: item.pagador,
      valor: parseCurrency(item.valor),
      status,
      dt_pag_rec,
      vencimento: parseDateToISO(item.vencimento),
    };
  });

  db.configInfracoes = raw.configInfracoes.map((item, index) => ({
    ...item,
    id: (index + 1).toString(),
  }));
  db.infracoes = [];
  db.recibos = [];

  db.gruposPagar = [
    ...new Set(
      raw.financeiro
        .filter((i) => i.movimento === "Saída")
        .map((i) => i.classificacao)
    ),
  ];
  db.gruposReceber = [
    ...new Set(
      raw.financeiro
        .filter((i) => i.movimento === "Entrada")
        .map((i) => i.classificacao)
    ),
  ];

  return db;
}

// --- GLOBAL FUNCTIONS & STATE ---
const getCondominioName = (id) =>
  localDB.condominios.find((c) => c.id == id)?.nome || "N/A";
const getUnidadeInfo = (id) => {
  const u = localDB.unidades.find((u) => u.id == id);
  return u ? `${u.apto} (${u.responsavel})` : "N/A";
};
const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);

const formGenerators = {
  condominios: (item = {}) =>
    `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="col-span-2"><label class="block text-sm font-medium">Nome</label><input type="text" id="nome" class="mt-1 p-2 border rounded-md w-full" value="${
      item.nome || ""
    }"></div><div><label class="block text-sm font-medium">Síndico</label><input type="text" id="sindico" class="mt-1 p-2 border rounded-md w-full" value="${
      item.sindico || ""
    }"></div><div><label class="block text-sm font-medium">Telefone</label><input type="text" id="telefone" class="mt-1 p-2 border rounded-md w-full" value="${
      item.telefone || ""
    }"></div><div class="col-span-2"><label class="block text-sm font-medium">E-mail</label><input type="email" id="email" class="mt-1 p-2 border rounded-md w-full" value="${
      item.email || ""
    }"></div><div class="col-span-2"><label class="block text-sm font-medium">Endereço</label><input type="text" id="endereco" class="mt-1 p-2 border rounded-md w-full" value="${
      item.endereco || ""
    }"></div></div>`,
  unidades: (item = {}) =>
    `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">Unidade (Apto/Loja)</label><input type="text" id="apto" class="mt-1 p-2 border rounded-md w-full" value="${
      item.apto || ""
    }"></div><div><label class="block text-sm font-medium">Responsável</label><input type="text" id="responsavel" class="mt-1 p-2 border rounded-md w-full" value="${
      item.responsavel || ""
    }"></div><div><label class="block text-sm font-medium">CPF</label><input type="text" id="cpf" class="mt-1 p-2 border rounded-md w-full" value="${
      item.cpf || ""
    }"></div><div><label class="block text-sm font-medium">E-mail</label><input type="email" id="email" class="mt-1 p-2 border rounded-md w-full" value="${
      item.email || ""
    }"></div><div><label class="block text-sm font-medium">Telefone</label><input type="text" id="telefone" class="mt-1 p-2 border rounded-md w-full" value="${
      item.telefone || ""
    }"></div></div>`,
  fornecedores: (item = {}) =>
    `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="col-span-2"><label class="block text-sm font-medium">Nome</label><input type="text" id="nome" class="mt-1 p-2 border rounded-md w-full" value="${
      item.nome || ""
    }"></div><div><label class="block text-sm font-medium">Contato</label><input type="text" id="responsavel" class="mt-1 p-2 border rounded-md w-full" value="${
      item.responsavel || ""
    }"></div><div><label class="block text-sm font-medium">Telefone</label><input type="text" id="telefone" class="mt-1 p-2 border rounded-md w-full" value="${
      item.telefone || ""
    }"></div><div><label class="block text-sm font-medium">PIX</label><input type="text" id="pix" class="mt-1 p-2 border rounded-md w-full" value="${
      item.pix || ""
    }"></div><div class="col-span-2"><label class="block text-sm font-medium">Endereço</label><input type="text" id="endereco" class="mt-1 p-2 border rounded-md w-full" value="${
      item.endereco || ""
    }"></div></div>`,
  configInfracoes: (item = {}) =>
    `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 gap-y-4"><div class="col-span-2"><label class="block text-sm font-medium">Nome da Infração</label><input type="text" id="nome" class="mt-1 p-2 border rounded-md w-full" value="${
      item.nome || ""
    }"></div><div class="col-span-2"><label class="block text-sm font-medium">Artigo / Detalhamento Legal</label><textarea id="artigo" class="mt-1 p-2 border rounded-md w-full" rows="4">${
      item.artigo || ""
    }</textarea></div><div><label class="block text-sm font-medium">Sanção</label><input type="text" id="sancao" class="mt-1 p-2 border rounded-md w-full" value="${
      item.sancao || ""
    }"></div></div>`,
  financeiro: (item = {}) => {
    const tipo = item.tipo || "DESPESA";
    const grupos =
      tipo === "RECEITA" ? localDB.gruposReceber : localDB.gruposPagar;
    return `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div><label class="block text-sm font-medium">Data Lançamento</label><input type="date" id="data" class="mt-1 p-2 border rounded-md w-full" value="${
      item.data || new Date().toISOString().slice(0, 10)
    }"></div><div><label class="block text-sm font-medium">Data Pagamento/Recebimento</label><input type="date" id="dt_pag_rec" class="mt-1 p-2 border rounded-md w-full" value="${
      item.dt_pag_rec || ""
    }"></div><div><label class="block text-sm font-medium">Tipo</label><select id="tipo" class="mt-1 p-2 border rounded-md w-full" onchange="updateGroupOptions(this.value)"><option value="RECEITA" ${
      tipo == "RECEITA" ? "selected" : ""
    }>Receita</option><option value="DESPESA" ${
      tipo == "DESPESA" ? "selected" : ""
    }>Despesa</option></select></div><div><label class="block text-sm font-medium">Classificação</label><select id="grupo" class="mt-1 p-2 border rounded-md w-full">${grupos
      .map(
        (g) =>
          `<option value="${g}" ${
            item.grupo == g ? "selected" : ""
          }>${g}</option>`
      )
      .join(
        ""
      )}</select></div><div class="col-span-2"><label class="block text-sm font-medium">Pagador / Fornecedor</label><input type="text" id="pagador" class="mt-1 p-2 border rounded-md w-full" value="${
      item.pagador || ""
    }"></div><div class="col-span-2"><label class="block text-sm font-medium">Detalhamento</label><input type="text" id="descricao" class="mt-1 p-2 border rounded-md w-full" value="${
      item.descricao || ""
    }"></div><div><label class="block text-sm font-medium">Valor (R$)</label><input type="number" step="0.01" id="valor" class="mt-1 p-2 border rounded-md w-full" value="${
      item.valor || ""
    }"></div></div>`;
  },
  recibos: (item = {}) => `
                <input type="hidden" id="id" value="${item.id || ""}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                     <div>
                        <label class="block text-sm font-medium">Tipo de Recibo</label>
                        <select id="recibo-tipo" class="mt-1 p-2 border rounded-md w-full" onchange="updateReciboPessoa(this.value)">
                            <option value="recebimento">Recebimento (de Morador)</option>
                            <option value="pagamento">Pagamento (a Fornecedor)</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm font-medium" id="recibo-pessoa-label">Morador</label>
                        <select id="recibo-pessoaId" class="mt-1 p-2 border rounded-md w-full" onchange="populateReciboForm(this.value)">
                            <option value="">Preencher manualmente...</option>
                            ${localDB.unidades
                              .map(
                                (u) =>
                                  `<option value="u-${u.id}">${u.apto} - ${u.responsavel}</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                    <div><label class="block text-sm font-medium">Nome</label><input type="text" id="recibo-nome" required class="mt-1 p-2 border rounded-md w-full" value=""></div>
                    <div><label class="block text-sm font-medium">CPF/CNPJ</label><input type="text" id="recibo-cpf" class="mt-1 p-2 border rounded-md w-full" value=""></div>
                    <div><label class="block text-sm font-medium">Valor (R$)</label><input type="number" step="0.01" id="recibo-valor" required class="mt-1 p-2 border rounded-md w-full" value=""></div>
                    <div class="col-span-2"><label class="block text-sm font-medium">Referente a</label><input type="text" id="recibo-referencia" required class="mt-1 p-2 border rounded-md w-full" placeholder="Ex: Taxa de condomínio de Julho/2025"></div>
                </div>`,
  infracoes: (item = {}) =>
    `<input type="hidden" id="id" value="${
      item.id || ""
    }"><div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><div><label class="block text-sm font-medium">Data</label><input type="date" id="data" class="mt-1 p-2 border rounded-md w-full" value="${
      item.data || new Date().toISOString().slice(0, 10)
    }"></div><div><label class="block text-sm font-medium">Unidade</label><select id="unidadeId" class="mt-1 p-2 border rounded-md w-full"><option value="">Selecione...</option>${localDB.unidades
      .map(
        (u) =>
          `<option value="${u.id}" ${
            item.unidadeId == u.id ? "selected" : ""
          }>${u.apto} (${u.responsavel})</option>`
      )
      .join(
        ""
      )}</select></div><div class="col-span-2"><label class="block text-sm font-medium">Tipo de Infração</label><select id="configInfracaoId" class="mt-1 p-2 border rounded-md w-full" onchange="autofillInfracao(this.value)"><option value="">Selecione o tipo...</option>${localDB.configInfracoes
      .map(
        (c) =>
          `<option value="${c.id}" ${
            item.configInfracaoId == c.id ? "selected" : ""
          }>${c.nome}</option>`
      )
      .join(
        ""
      )}</select></div><div class="col-span-2 flex items-end gap-2"><div class="flex-grow"><label class="block text-sm font-medium">Detalhamento da Infração</label><textarea id="artigo" class="mt-1 p-2 border rounded-md w-full bg-gray-100" rows="5" readonly>${
      item.artigo || ""
    }</textarea></div><button id="aprimorar-texto-btn" onclick="aprimorarNotificacao()" class="h-10 px-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400" disabled title="Selecione um tipo de infração primeiro">✨ Aprimorar Texto</button></div><div><label class="block text-sm font-medium">Valor da Multa (R$)</label><input type="number" step="0.01" id="valor" class="mt-1 p-2 border rounded-md w-full" value="${
      item.valor || ""
    }"></div><div><label class="block text-sm font-medium">Status</label><select id="status" class="mt-1 p-2 border rounded-md w-full"><option value="NOTIFICADO" ${
      item.status == "NOTIFICADO" ? "selected" : ""
    }>Notificado</option><option value="PENDENTE DE PAGAMENTO" ${
      item.status == "PENDENTE DE PAGAMENTO" ? "selected" : ""
    }>Pendente de Pagamento</option><option value="PAGO" ${
      item.status == "PAGO" ? "selected" : ""
    }>Pago</option><option value="CANCELADO" ${
      item.status == "CANCELADO" ? "selected" : ""
    }>Cancelado</option></select></div></div>`,
};

const statusColors = {
  PAGO: "bg-green-100 text-green-700",
  RECEBIDO: "bg-green-100 text-green-700",
  "A PAGAR": "bg-yellow-100 text-yellow-700",
  "A RECEBER": "bg-yellow-100 text-yellow-700",
  "PENDENTE DE PAGAMENTO": "bg-yellow-100 text-yellow-700",
  NOTIFICADO: "bg-blue-100 text-blue-700",
  CANCELADO: "bg-gray-100 text-gray-700",
};
function renderTable(
  section,
  title,
  data,
  headers,
  renderRow,
  canAdd = true,
  backView = "view-main-menu"
) {
  const container = document.getElementById(`view-${section}`);
  let content = `<div class="bg-white rounded-lg shadow p-6"><div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4"><h2 class="text-2xl font-bold">${title}</h2><div class="flex items-center gap-2"><input type="text" id="search-${section}" class="border rounded-lg py-2 px-3" placeholder="Buscar...">${
    canAdd
      ? `<button onclick="openModal('${section}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-plus mr-2"></i>Adicionar</button>`
      : ""
  }<button onclick="showView('${backView}')" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-arrow-left mr-2"></i>Voltar</button></div></div><div class="overflow-x-auto"><table class="min-w-full bg-white"><thead class="bg-gray-200"><tr>${headers
    .map((h) => `<th class="py-3 px-4 text-left font-semibold">${h}</th>`)
    .join("")}</tr></thead><tbody id="tbody-${section}">${data
    .map(renderRow)
    .join("")}</tbody></table></div></div>`;
  container.innerHTML = content;
  document
    .getElementById(`search-${section}`)
    .addEventListener("keyup", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filteredData = data.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm)
        )
      );
      document.getElementById(`tbody-${section}`).innerHTML = filteredData
        .map(renderRow)
        .join("");
    });
}
const renderers = {
  condominios: () =>
    renderTable(
      "condominios",
      "Dados do Condomínio",
      localDB.condominios,
      ["Nome", "Síndico", "Telefone", "E-mail", "Ações"],
      (item) =>
        `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${item.nome}</td><td class="py-3 px-4">${item.sindico}</td><td class="py-3 px-4">${item.telefone}</td><td class="py-3 px-4">${item.email}</td><td class="py-3 px-4"><button onclick="openModal('condominios', '${item.id}')" class="text-blue-500 hover:underline">Editar</button></td></tr>`,
      false
    ),
  unidades: () =>
    renderTable(
      "unidades",
      "Cadastro de Unidades",
      localDB.unidades,
      ["Unidade", "Responsável", "CPF", "Ações"],
      (item) =>
        `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${item.apto}</td><td class="py-3 px-4">${item.responsavel}</td><td class="py-3 px-4">${item.cpf}</td><td class="py-3 px-4"><button onclick="openModal('unidades', '${item.id}')" class="text-blue-500 hover:underline">Editar</button> <button onclick="confirmDelete('unidades', '${item.id}')" class="text-red-500 hover:underline ml-4">Excluir</button></td></tr>`
    ),
  fornecedores: () =>
    renderTable(
      "fornecedores",
      "Cadastro de Fornecedores",
      localDB.fornecedores,
      ["Nome", "Telefone", "PIX", "Ações"],
      (item) =>
        `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${item.nome}</td><td class="py-3 px-4">${item.telefone}</td><td class="py-3 px-4">${item.pix}</td><td class="py-3 px-4"><button onclick="openModal('fornecedores', '${item.id}')" class="text-blue-500 hover:underline">Editar</button> <button onclick="confirmDelete('fornecedores', '${item.id}')" class="text-red-500 hover:underline ml-4">Excluir</button></td></tr>`
    ),
  configuracoes: () => {
    document.getElementById(
      "view-configuracoes"
    ).innerHTML = `<div class="bg-white rounded-lg shadow p-6"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">Configurações</h2><button onclick="showView('view-main-menu')" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-arrow-left mr-2"></i>Voltar</button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div class="p-4 border rounded-lg hover:shadow-lg cursor-pointer" onclick="showView('view-configInfracoes')"><h3 class="font-bold text-lg text-blue-600"><i class="fas fa-file-signature mr-2"></i>Configurar Tipos de Infração</h3><p class="text-sm text-gray-600">Defina os modelos de texto para as infrações.</p></div><div class="p-4 border rounded-lg hover:shadow-lg cursor-pointer" onclick="showView('view-configAssinatura')"><h3 class="font-bold text-lg text-teal-600"><i class="fas fa-signature mr-2"></i>Configurar Assinatura e Recibo</h3><p class="text-sm text-gray-600">Cadastre a sua assinatura e os dados do emissor.</p></div></div></div>`;
  },
  configInfracoes: () =>
    renderTable(
      "configInfracoes",
      "Configuração de Infrações",
      localDB.configInfracoes,
      ["Nome", "Sanção", "Ações"],
      (item) =>
        `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${item.nome}</td><td class="py-3 px-4">${item.sancao}</td><td class="py-3 px-4"><button onclick="openModal('configInfracoes', '${item.id}')" class="text-blue-500 hover:underline">Editar</button> <button onclick="confirmDelete('configInfracoes', '${item.id}')" class="text-red-500 hover:underline ml-4">Excluir</button></td></tr>`,
      true,
      "view-configuracoes"
    ),
  recibos: () =>
    renderTable(
      "recibos",
      "Recibos Gerados",
      localDB.recibos,
      ["Data", "Pagador", "Valor", "Referência", "Ações"],
      (item) => `<tr class="border-b hover:bg-gray-50">
                    <td class="py-3 px-4">${formatDateFromISO(item.data)}</td>
                    <td class="py-3 px-4">${item.nome}</td>
                    <td class="py-3 px-4">${formatCurrency(item.valor)}</td>
                    <td class="py-3 px-4">${item.referencia}</td>
                    <td class="py-3 px-4">
                        <button onclick="previewReceipt('${
                          item.id
                        }')" class="text-blue-500 hover:underline">Ver/Imprimir</button> 
                        <button onclick="confirmDelete('recibos', '${
                          item.id
                        }')" class="text-red-500 hover:underline ml-4">Excluir</button>
                    </td>
                </tr>`,
      true,
      "view-main-menu"
    ),
  financeiro: () => {
    const container = document.getElementById("view-financeiro");
    const realizados = localDB.financeiro.filter((i) => i.dt_pag_rec);
    const pendentes = localDB.financeiro.filter((i) => !i.dt_pag_rec);

    const totalReceitas = realizados
      .filter((i) => i.tipo === "RECEITA")
      .reduce((acc, i) => acc + i.valor, 0);
    const totalDespesas = realizados
      .filter((i) => i.tipo === "DESPESA")
      .reduce((acc, i) => acc + i.valor, 0);
    const saldo = totalReceitas - totalDespesas;

    const headers = [
      "Dt. Lanç.",
      "Dt. Pag/Rec",
      "Pagador/Fornecedor",
      "Descrição",
      "Valor",
      "Status",
      "Ações",
    ];
    const renderRowRealizado = (item) =>
      `<tr class="border-b"><td class="p-2">${formatDateFromISO(
        item.data
      )}</td><td class="p-2 font-bold">${formatDateFromISO(
        item.dt_pag_rec
      )}</td><td class="p-2">${item.pagador}</td><td class="p-2">${
        item.descricao
      }</td><td class="p-2">${formatCurrency(
        item.valor
      )}</td><td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${
        statusColors[item.status] || ""
      }">${
        item.status
      }</span></td><td class="p-2"><button onclick="openModal('financeiro', '${
        item.id
      }')" class="text-blue-500"><i class="fas fa-edit"></i></button> <button onclick="confirmDelete('financeiro', '${
        item.id
      }')" class="text-red-500 ml-2"><i class="fas fa-trash"></i></button></td></tr>`;
    const renderRowPendente = (item) =>
      `<tr class="border-b"><td class="p-2">${formatDateFromISO(
        item.data
      )}</td><td class="p-2 text-center">-</td><td class="p-2">${
        item.pagador
      }</td><td class="p-2">${
        item.descricao
      }</td><td class="p-2">${formatCurrency(
        item.valor
      )}</td><td class="p-2"><span class="px-2 py-1 text-xs rounded-full ${
        statusColors[item.status] || ""
      }">${
        item.status
      }</span></td><td class="p-2"><button onclick="confirmarPagamento('${
        item.id
      }')" class="text-green-500" title="Confirmar Pagamento/Recebimento"><i class="fas fa-check-circle"></i></button><button onclick="openModal('financeiro', '${
        item.id
      }')" class="text-blue-500 ml-2"><i class="fas fa-edit"></i></button> <button onclick="confirmDelete('financeiro', '${
        item.id
      }')" class="text-red-500 ml-2"><i class="fas fa-trash"></i></button></td></tr>`;

    container.innerHTML = `<div class="bg-white rounded-lg shadow p-6"><div class="flex justify-between items-center mb-6"><h2 class="text-2xl font-bold">Módulo Financeiro</h2><div><button onclick="openModal('financeiro')" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-plus mr-2"></i>Novo</button><button onclick="showView('view-main-menu')" class="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg ml-2"><i class="fas fa-arrow-left mr-2"></i>Voltar</button></div></div>
                 <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center"><div class="bg-green-100 p-4 rounded-lg"><h3 class="font-bold text-green-800">Receitas Realizadas</h3><p class="text-2xl font-semibold text-green-600">${formatCurrency(
                   totalReceitas
                 )}</p></div><div class="bg-red-100 p-4 rounded-lg"><h3 class="font-bold text-red-800">Despesas Realizadas</h3><p class="text-2xl font-semibold text-red-600">${formatCurrency(
      totalDespesas
    )}</p></div><div class="p-4 rounded-lg ${
      saldo >= 0 ? "bg-blue-100" : "bg-orange-100"
    }"><h3 class="font-bold ${
      saldo >= 0 ? "text-blue-800" : "text-orange-800"
    }">Saldo em Caixa</h3><p class="text-2xl font-semibold ${
      saldo >= 0 ? "text-blue-600" : "text-orange-600"
    }">${formatCurrency(saldo)}</p></div></div>
                 <div class="mb-8"><h3 class="text-xl font-semibold mb-3 text-gray-700">Contas Pendentes (Lembretes)</h3><div class="overflow-x-auto"><table class="min-w-full bg-white text-sm"><thead><tr class="bg-gray-100">${headers
                   .map(
                     (h) => `<th class="p-2 text-left font-semibold">${h}</th>`
                   )
                   .join("")}</tr></thead><tbody>${
      pendentes.length > 0
        ? pendentes.map(renderRowPendente).join("")
        : '<tr><td colspan="7" class="p-4 text-center text-gray-500">Nenhuma conta pendente.</td></tr>'
    }</tbody></table></div></div>
                 <div><h3 class="text-xl font-semibold mb-3 text-gray-700">Movimento de Caixa (Realizado)</h3><div class="overflow-x-auto"><table class="min-w-full bg-white text-sm"><thead><tr class="bg-gray-100">${headers
                   .map(
                     (h) => `<th class="p-2 text-left font-semibold">${h}</th>`
                   )
                   .join("")}</tr></thead><tbody>${
      realizados.length > 0
        ? realizados.map(renderRowRealizado).join("")
        : '<tr><td colspan="7" class="p-4 text-center text-gray-500">Nenhum lançamento realizado.</td></tr>'
    }</tbody></table></div></div></div>`;
  },
  infracoes: () =>
    renderTable(
      "infracoes",
      "Controle de Infrações",
      localDB.infracoes,
      ["Data", "Unidade", "Valor", "Status", "Ações"],
      (item) =>
        `<tr class="border-b hover:bg-gray-50"><td class="py-3 px-4">${formatDateFromISO(
          item.data
        )}</td><td class="py-3 px-4">${getUnidadeInfo(
          item.unidadeId
        )}</td><td class="py-3 px-4">${formatCurrency(
          item.valor
        )}</td><td class="py-3 px-4"><span class="px-2 py-1 font-semibold text-xs rounded-full ${
          statusColors[item.status] || ""
        }">${
          item.status
        }</span></td><td class="py-3 px-4"><button onclick="openPrintModal('${
          item.id
        }')" class="text-gray-600 hover:underline" title="Imprimir Notificação"><i class="fas fa-print"></i></button><button onclick="openModal('infracoes', '${
          item.id
        }')" class="text-blue-500 hover:underline ml-4" title="Editar"><i class="fas fa-edit"></i></button> <button onclick="confirmDelete('infracoes', '${
          item.id
        }')" class="text-red-500 hover:underline ml-4" title="Excluir"><i class="fas fa-trash"></i></button></td></tr>`
    ),
  configAssinatura: () => {
    const container = document.getElementById("view-configAssinatura");
    container.innerHTML = `<div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold">Configurar Assinatura e Recibo</h2>
                        <button onclick="showView('view-configuracoes')" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"><i class="fas fa-arrow-left mr-2"></i>Voltar</button>
                    </div>
                     <div class="space-y-6">
                        <div class="p-4 border rounded-lg">
                            <h3 class="text-lg font-semibold mb-2 border-b pb-2">Dados do Emissor (para Recibos)</h3>
                             <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div><label class="block text-sm font-medium">Nome do Condomínio</label><input type="text" id="config-nome-condominio" class="mt-1 p-2 border rounded-md w-full" value="${
                                  localDB.configuracao.nomeCondominio || ""
                                }"></div>
                                <div><label class="block text-sm font-medium">Nome do Síndico</label><input type="text" id="config-nome-sindico" class="mt-1 p-2 border rounded-md w-full" value="${
                                  localDB.configuracao.nomeSindico || ""
                                }"></div>
                             </div>
                             <button onclick="saveReciboConfig()" class="mt-4 bg-blue-600 text-white font-bold py-2 px-3 rounded-md">Salvar Dados do Emissor</button>
                        </div>
                        <div class="p-4 border rounded-lg">
                            <h3 class="text-lg font-semibold mb-2 border-b pb-2">Assinatura Digital</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                <div>
                                    <h4 class="font-medium mb-2">Desenhar Assinatura</h4>
                                    <canvas id="signature-pad" class="bg-gray-50 w-full" width="400" height="200"></canvas>
                                    <div class="mt-2">
                                        <button onclick="clearSignature()" class="text-sm text-gray-600 hover:text-red-500">Limpar</button>
                                        <button onclick="saveSignature()" class="ml-4 bg-blue-600 text-white font-bold py-2 px-3 rounded-md">Salvar Desenho</button>
                                    </div>
                                </div>
                                <div>
                                     <h4 class="font-medium mb-2">Carregar Imagem da Assinatura</h4>
                                     <input type="file" id="signature-upload" accept="image/png, image/jpeg" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                     <div class="mt-4">
                                        <h4 class="font-medium mb-2">Assinatura Atual</h4>
                                        <div id="current-signature" class="p-2 border rounded-md h-32 flex items-center justify-center bg-gray-50">
                                            ${
                                              localDB.configuracao.assinatura
                                                ? `<img src="${localDB.configuracao.assinatura}" class="max-h-full max-w-full">`
                                                : '<span class="text-gray-400">Nenhuma assinatura salva</span>'
                                            }
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
    setupSignaturePad();
    document
      .getElementById("signature-upload")
      .addEventListener("change", handleSignatureUpload);
  },
};

window.openModal = (section, id = null) => {
  const isEditing = id !== null;
  const item = isEditing ? localDB[section].find((i) => i.id === id) : {};
  const title =
    (isEditing ? "Editar " : "Adicionar ") +
    (section === "financeiro"
      ? "Lançamento"
      : section === "infracoes"
      ? "Infração"
      : section === "configInfracoes"
      ? "Tipo de Infração"
      : section === "recibos"
      ? "Recibo"
      : section.slice(0, -1));
  document.getElementById("modal-title").innerText = title;
  document.getElementById("modal-body").innerHTML =
    formGenerators[section](item);
  document.getElementById(
    "modal-footer"
  ).innerHTML = `<button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button>${
    section === "recibos"
      ? `<button onclick="previewReceiptGeneration()" class="px-4 py-2 bg-blue-600 text-white rounded-md ml-2">Gerar Recibo</button>`
      : `<button type="submit" onclick="saveData('${section}')" class="px-4 py-2 bg-blue-600 text-white rounded-md ml-2">Salvar</button>`
  }`;
  if (section === "infracoes" && item.configInfracaoId) {
    autofillInfracao(item.configInfracaoId, item.artigo);
  }
  if (section === "financeiro" && item.id) {
    updateGroupOptions(item.tipo);
    document.getElementById("grupo").value = item.grupo;
  }
  if (section === "recibos") {
    updateReciboPessoa("recebimento");
  }
  document.getElementById("form-modal").style.display = "flex";
};

window.closeModal = () => {
  document.getElementById("form-modal").style.display = "none";
};
window.openPrintModal = (infracaoId) => {
  const infracao = localDB.infracoes.find((i) => i.id === infracaoId);
  if (!infracao) return;
  const unidade = localDB.unidades.find((u) => u.id === infracao.unidadeId);
  const condominio = localDB.condominios[0];
  const config = localDB.configInfracoes.find(
    (ci) => ci.id === infracao.configInfracaoId
  );
  const printArea = document.getElementById("print-area");
  printArea.innerHTML = `<h2 class="text-xl font-bold text-center mb-6">NOTIFICAÇÃO DE MULTA</h2><p class="mb-4">À<br>Sr(a) <strong>${
    unidade?.responsavel || "N/A"
  }</strong><br>Residente no(a) <strong>${unidade?.apto || "N/A"} - ${
    condominio.nome
  }</strong></p><p class="mb-4">Na qualidade de síndico(a) do ${
    condominio.nome
  } faço uso da presente para notificá-lo(a) de que, devido a infração cometida no dia <strong>${formatDateFromISO(
    infracao.data
  )}</strong> consubstanciada em <strong>${
    config?.nome || "Infração não especificada"
  }</strong>, lhe foi imposta a multa de <strong>${formatCurrency(
    infracao.valor
  )}</strong>.</p><p class="text-sm mb-4">${
    infracao.artigo || config?.artigo || ""
  }</p><p class="mb-6">Caso deseje apresentar recurso, o prazo é de <strong>${
    config?.recurso || "5 dias úteis"
  }</strong>.</p><p class="text-center mt-8">Atenciosamente</p><p class="text-center font-bold mt-4">_________________________<br>${
    condominio.sindico
  }</p><p class="text-center">${
    condominio.nome
  }</p><p class="text-center text-sm mt-4">${formatDateFromISO(
    new Date().toISOString()
  )}</p>`;
  document.getElementById("print-modal").style.display = "flex";
};
window.closePrintModal = () => {
  document.getElementById("print-modal").style.display = "none";
};
window.closeAnalysisModal = () => {
  document.getElementById("gemini-analysis-modal").style.display = "none";
};
window.closeReceiptPreviewModal = () => {
  document.getElementById("receipt-preview-modal").style.display = "none";
};

window.autofillInfracao = (configId, existingText = null) => {
  const aprimorarBtn = document.getElementById("aprimorar-texto-btn");
  const artigoTextarea = document.getElementById("artigo");
  if (existingText) {
    artigoTextarea.value = existingText;
    aprimorarBtn.disabled = !existingText;
    return;
  }
  const config = localDB.configInfracoes.find((c) => c.id == configId);
  artigoTextarea.value = config ? config.artigo : "";
  aprimorarBtn.disabled = !config;
};

window.updateGroupOptions = (tipo) => {
  const grupos =
    tipo === "RECEITA" ? localDB.gruposReceber : localDB.gruposPagar;
  document.getElementById("grupo").innerHTML = grupos
    .map((g) => `<option value="${g}">${g}</option>`)
    .join("");
};
window.confirmarPagamento = async (id) => {
  const itemRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "financeiro",
    id
  );
  await updateDoc(itemRef, {
    status:
      localDB.financeiro.find((i) => i.id === id).tipo === "RECEITA"
        ? "RECEBIDO"
        : "PAGO",
    dt_pag_rec: new Date().toISOString().slice(0, 10),
  });
};

window.saveData = async (section, dataToSave) => {
  let data = dataToSave;
  let id = null;

  if (!data) {
    const form = document.getElementById("modal-form");
    const idInput = form.querySelector("#id");
    id = idInput ? idInput.value : null;
    data = {};

    if (section === "financeiro") {
      const tipo = form.querySelector("#tipo").value;
      const dtPagRec = form.querySelector("#dt_pag_rec").value;
      data = {
        data: form.querySelector("#data").value,
        dt_pag_rec: dtPagRec || null,
        tipo: tipo,
        grupo: form.querySelector("#grupo").value,
        pagador: form.querySelector("#pagador").value,
        descricao: form.querySelector("#descricao").value,
        valor: parseFloat(form.querySelector("#valor").value) || 0,
        status: dtPagRec
          ? tipo === "RECEITA"
            ? "RECEBIDO"
            : "PAGO"
          : tipo === "RECEITA"
          ? "A RECEBER"
          : "A PAGAR",
      };
    } else if (section === "condominios") {
      data = {
        nome: form.querySelector("#nome").value,
        sindico: form.querySelector("#sindico").value,
        telefone: form.querySelector("#telefone").value,
        email: form.querySelector("#email").value,
        endereco: form.querySelector("#endereco").value,
      };
    } else {
      const fields = Object.keys(
        formGenerators[section]({})
          .match(/id="(\w+)"/g)
          .reduce((acc, curr) => ((acc[curr.slice(4, -1)] = 1), acc), {})
      );
      fields.forEach((field) => {
        const input = form.querySelector(`#${field}`);
        if (input && field !== "id") {
          if (input.type === "number") {
            data[field] = parseFloat(input.value) || 0;
          } else if (input.id.endsWith("Id")) {
            data[field] = input.value || null;
          } else {
            data[field] = input.value;
          }
        }
      });
    }
  } else {
    id = data.id;
    delete data.id;
  }

  const collectionRef = collection(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    section
  );
  if (id) {
    await setDoc(doc(collectionRef, id), data);
  } else {
    const newDoc = await addDoc(collectionRef, data);
  }
  if (document.getElementById("form-modal").style.display === "flex") {
    closeModal();
  }
};

window.confirmDelete = (section, id) => {
  document.getElementById(
    "confirm-footer"
  ).innerHTML = `<button onclick="closeConfirmModal()" class="px-4 py-2 bg-gray-200 rounded-md">Cancelar</button><button onclick="deleteData('${section}', '${id}')" class="px-4 py-2 bg-red-600 text-white rounded-md ml-2">Excluir</button>`;
  document.getElementById("confirm-modal").style.display = "flex";
};
window.closeConfirmModal = () => {
  document.getElementById("confirm-modal").style.display = "none";
};

window.deleteData = async (section, id) => {
  await deleteDoc(doc(db, "artifacts", appId, "users", userId, section, id));
  closeConfirmModal();
};

let lastView = "view-main-menu";
window.showView = (viewId) => {
  if (document.getElementById(lastView))
    document.getElementById(lastView).style.display = "none";
  const section = viewId.replace("view-", "");
  if (renderers[section]) {
    renderers[section]();
  }
  const newView = document.getElementById(viewId);
  newView.style.display = "block";
  lastView = viewId;
};

// --- GEMINI API FUNCTIONS ---
async function callGemini(prompt) {
  const apiKey = ""; // API Key is handled by the environment
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const result = await response.json();
    if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
      return result.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected API response structure:", result);
      return "Não foi possível obter uma resposta da IA.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Ocorreu um erro ao comunicar com a IA. Por favor, tente novamente.";
  }
}

window.analisarFinancas = async () => {
  const contentDiv = document.getElementById("gemini-analysis-content");
  contentDiv.innerHTML =
    '<div class="flex justify-center items-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-purple-600"></i><p class="ml-3">A analisar os dados... Por favor, aguarde.</p></div>';
  document.getElementById("gemini-analysis-modal").style.display = "flex";

  const realizados = localDB.financeiro.filter((i) => i.dt_pag_rec);
  const financialData = realizados
    .map((item) => `${item.tipo};${item.grupo};${item.valor}`)
    .join("\n");
  const prompt = `Analise os seguintes dados financeiros de um condomínio (formato: TIPO;GRUPO;VALOR):\n${financialData}\n\nCom base nestes dados, forneça:\n1. Um resumo geral da saúde financeira.\n2. As 3 maiores fontes de receita, em ordem.\n3. As 3 maiores categorias de despesa, em ordem.\n4. Uma sugestão prática de onde seria possível economizar. Seja direto e claro nas suas respostas. Responda em Português do Brasil e formate a resposta com títulos e listas.`;

  const analysis = await callGemini(prompt);
  contentDiv.innerHTML = analysis
    .replace(/\n/g, "<br>")
    .replace(/\*/g, "<strong>")
    .replace(/<\/strong> /g, "</strong>&nbsp;");
};

window.aprimorarNotificacao = async () => {
  const aprimorarBtn = document.getElementById("aprimorar-texto-btn");
  const artigoTextarea = document.getElementById("artigo");
  const originalText = artigoTextarea.value;

  if (!originalText) return;

  aprimorarBtn.disabled = true;
  aprimorarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const prompt = `Reescreva o seguinte texto de notificação de infração de condomínio para que seja mais claro e amigável para o morador, mas mantendo a seriedade e o tom formal necessário. Não remova a informação legal, apenas torne-a mais compreensível. Texto original: "${originalText}"`;

  const enhancedText = await callGemini(prompt);

  artigoTextarea.value = enhancedText;
  aprimorarBtn.disabled = false;
  aprimorarBtn.innerHTML = "✨ Aprimorar Texto";
};

// --- RECEIPT FUNCTIONS ---
window.populateReciboForm = (unidadeId) => {
  const tipo = document.getElementById("recibo-tipo").value;
  let pessoa;
  if (tipo === "recebimento") {
    pessoa = localDB.unidades.find((u) => `u-${u.id}` === unidadeId);
  } else {
    pessoa = localDB.fornecedores.find((f) => `f-${f.id}` === unidadeId);
  }

  if (pessoa) {
    document.getElementById("recibo-nome").value =
      pessoa.responsavel || pessoa.nome || "";
    document.getElementById("recibo-cpf").value = pessoa.cpf || "";
  } else {
    document.getElementById("recibo-nome").value = "";
    document.getElementById("recibo-cpf").value = "";
  }
};

window.updateReciboPessoa = (tipo) => {
  const select = document.getElementById("recibo-pessoaId");
  const label = document.getElementById("recibo-pessoa-label");
  if (tipo === "recebimento") {
    label.innerText = "Morador";
    select.innerHTML = `<option value="">Preencher manualmente...</option>${localDB.unidades
      .map(
        (u) => `<option value="u-${u.id}">${u.apto} - ${u.responsavel}</option>`
      )
      .join("")}`;
  } else {
    label.innerText = "Fornecedor";
    select.innerHTML = `<option value="">Preencher manualmente...</option>${localDB.fornecedores
      .map((f) => `<option value="f-${f.id}">${f.nome}</option>`)
      .join("")}`;
  }
  populateReciboForm(""); // Clear fields
};

window.previewReceiptGeneration = async () => {
  currentReceiptData = {
    tipoRecibo: document.getElementById("recibo-tipo").value,
    nome: document.getElementById("recibo-nome").value,
    cpf: document.getElementById("recibo-cpf").value,
    valor: parseFloat(document.getElementById("recibo-valor").value),
    referencia: document.getElementById("recibo-referencia").value,
    data: new Date().toISOString().slice(0, 10),
  };

  if (
    !currentReceiptData.nome ||
    !currentReceiptData.valor ||
    !currentReceiptData.referencia
  ) {
    alert(
      "Por favor, preencha todos os campos obrigatórios: Nome, Valor e Referência."
    );
    return;
  }

  const docRef = await addDoc(
    collection(db, "artifacts", appId, "users", userId, "recibos"),
    { ...currentReceiptData }
  );
  currentReceiptData.id = docRef.id; // Store the new ID

  previewReceipt(currentReceiptData.id, true);
};

window.previewReceipt = (reciboId, fromGeneration = false) => {
  const recibo = fromGeneration
    ? currentReceiptData
    : localDB.recibos.find((r) => r.id === reciboId);
  if (!recibo) {
    alert("Recibo não encontrado!");
    return;
  }
  currentReceiptData = recibo; // Ensure currentReceiptData is set for PDF generation

  const previewArea = document.getElementById("receipt-preview-area");
  const condominio = localDB.condominios[0];
  const verbo =
    recibo.tipoRecibo === "recebimento" ? "Recebi(emos) de" : "Pagamos a";

  let html = `
                <div id="receipt-content" class="p-6 border border-gray-300 bg-white">
                     <h2 class="text-2xl font-bold text-center mb-6">Recibo Condomínio Solares</h2>
                    <p class="mb-4">${verbo} <strong>${
    recibo.nome
  }</strong>, CPF/CNPJ nº <strong>${
    recibo.cpf || "Não informado"
  }</strong>, a importância de <strong>${formatCurrency(
    recibo.valor
  )}</strong>.</p>
                    <p class="mb-4">Referente a: <strong>${
                      recibo.referencia
                    }</strong>.</p>
                    <p class="mb-6">Para maior clareza, firmo(amos) o presente.</p>
                    <p class="mb-8">Divinópolis, ${new Date(
                      recibo.data
                    ).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}.</p>
                    <div class="flex justify-between items-end">
                        <div id="qrcode" class="p-1 border"></div>
                        <div class="text-center">
                           ${
                             localDB.configuracao.assinatura
                               ? `<img src="${localDB.configuracao.assinatura}" class="h-20 mx-auto">`
                               : '<div class="h-20"></div>'
                           }
                           <div class="border-t border-black w-64 mt-2"></div>
                           <p class="font-semibold">${
                             localDB.configuracao.nomeSindico ||
                             condominio.sindico
                           }</p>
                           <p class="text-sm">${
                             localDB.configuracao.nomeCondominio ||
                             condominio.nome
                           }</p>
                        </div>
                    </div>
                     <p class="text-xs text-gray-500 mt-4 text-center">Código de Verificação: ${
                       recibo.id
                     }</p>
                </div>`;
  previewArea.innerHTML = html;
  generateQRCode(recibo.id);

  if (fromGeneration) {
    closeModal();
  }
  document.getElementById("receipt-preview-modal").style.display = "flex";
};

function generateQRCode(reciboId) {
  const url = `${
    window.location.href.split("?")[0]
  }?recibo=${reciboId}&uid=${userId}&appid=${appId}`;
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  document.getElementById("qrcode").innerHTML = qr.createImgTag(3, 4);
}

window.generatePdf = () => {
  const { jsPDF } = window.jspdf;
  const content = document.getElementById("receipt-content");

  html2canvas(content).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 15, 15, pdfWidth - 30, pdfHeight - 30);
    pdf.save(`recibo-${currentReceiptData.nome.replace(/\s/g, "_")}.pdf`);
  });
};

// --- SIGNATURE PAD FUNCTIONS ---
function setupSignaturePad() {
  const canvas = document.getElementById("signature-pad");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function getTouchPos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.touches[0].clientX - rect.left,
      y: evt.touches[0].clientY - rect.top,
    };
  }

  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    const pos = getMousePos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener("mouseup", () => {
    drawing = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    drawing = true;
    const pos = getTouchPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener("touchend", (e) => {
    e.preventDefault();
    drawing = false;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!drawing) return;
    const pos = getTouchPos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });
}

window.clearSignature = () => {
  const canvas = document.getElementById("signature-pad");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

window.saveSignature = async () => {
  const canvas = document.getElementById("signature-pad");
  const signatureDataUrl = canvas.toDataURL();
  const configRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "configuracao",
    "main"
  );
  await setDoc(configRef, { assinatura: signatureDataUrl }, { merge: true });
  alert("Assinatura salva com sucesso!");
  document.getElementById(
    "current-signature"
  ).innerHTML = `<img src="${signatureDataUrl}" class="max-h-full max-w-full">`;
};

function handleSignatureUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const signatureDataUrl = e.target.result;
      const configRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        userId,
        "configuracao",
        "main"
      );
      await setDoc(
        configRef,
        { assinatura: signatureDataUrl },
        { merge: true }
      );
      alert("Assinatura salva com sucesso!");
      document.getElementById(
        "current-signature"
      ).innerHTML = `<img src="${signatureDataUrl}" class="max-h-full max-w-full">`;
    };
    reader.readAsDataURL(file);
  }
}

window.saveReciboConfig = async () => {
  const nomeCondominio = document.getElementById(
    "config-nome-condominio"
  ).value;
  const nomeSindico = document.getElementById("config-nome-sindico").value;
  const configRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "configuracao",
    "main"
  );
  await setDoc(configRef, { nomeCondominio, nomeSindico }, { merge: true });
  alert("Dados do emissor salvos com sucesso!");
};

// --- FIREBASE INITIALIZATION ---

try {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD1Wfs7Rxx_It70-KiObxfiTiiS9Kz5aGI",
    authDomain: "condominio-84c37.firebaseapp.com",
    projectId: "condominio-84c37",
    storageBucket: "condominio-84c37.firebasestorage.app",
    messagingSenderId: "74015695256",
    appId: "1:74015695256:web:00fae83dae4f721a444bed",
  };
  // const fbConfig = JSON.parse(__FIREBASE_CONFIG__);
  app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);
  appId = "solares-app-default";

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
      document.getElementById("loading-overlay").style.display = "flex";

      // Check for validation mode
      const urlParams = new URLSearchParams(window.location.search);
      const receiptIdToValidate = urlParams.get("recibo");
      if (receiptIdToValidate) {
        const uid = urlParams.get("uid");
        const appid = urlParams.get("appid");
        await displayValidationResult(receiptIdToValidate, uid, appid);
      } else {
        await seedInitialData();
        setupListeners();
        // A small delay to ensure data loads before hiding overlay
        setTimeout(() => {
          document.getElementById("loading-overlay").style.display = "none";
          document.getElementById("app").style.display = "block";
          showView("view-main-menu");
        }, 1500);
      }
    } else {
      const token =
        typeof __initial_auth_token !== "undefined"
          ? __initial_auth_token
          : null;
      if (token) {
        await signInWithCustomToken(auth, token);
      } else {
        await signInAnonymously(auth);
      }
    }
  });
} catch (e) {
  document.getElementById(
    "loading-overlay"
  ).innerHTML = `<div class="text-center p-4 bg-red-100 text-red-700 rounded-lg">
                <h3 class="font-bold">Erro de Autenticação!</h3>
                <p class="mt-2">Ocorreu um problema ao iniciar a aplicação. Por favor, tente recarregar a página.</p>
            </div>`;
  console.error("Firebase Init Error: ", e);
}

async function seedInitialData() {
  const seedFlagRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "system",
    "seeded"
  );
  const seedFlagDoc = await getDoc(seedFlagRef);

  if (seedFlagDoc.exists()) {
    console.log("Data already seeded.");
    return;
  }

  console.log("Seeding initial data to Firestore...");
  document.getElementById("loading-overlay").querySelector("p").innerText =
    "A configurar a sua base de dados pela primeira vez...";

  const initialData = initializeDatabase(db_raw);
  const batch = writeBatch(db);
  const sectionsToSeed = [
    "condominios",
    "unidades",
    "fornecedores",
    "financeiro",
    "configInfracoes",
    "recibos",
  ];

  for (const section of sectionsToSeed) {
    if (Array.isArray(initialData[section])) {
      initialData[section].forEach((item) => {
        if (item.id) {
          const { id, ...data } = item;
          const docRef = doc(
            db,
            "artifacts",
            appId,
            "users",
            userId,
            section,
            id
          );
          batch.set(docRef, data);
        }
      });
    }
  }
  batch.set(seedFlagRef, { timestamp: new Date() });

  await batch.commit();
  console.log("Initial data seeded successfully.");
}

function setupListeners() {
  const collectionsToSync = [
    "condominios",
    "unidades",
    "fornecedores",
    "financeiro",
    "infracoes",
    "configInfracoes",
    "recibos",
  ];

  const configRef = doc(
    db,
    "artifacts",
    appId,
    "users",
    userId,
    "configuracao",
    "main"
  );
  onSnapshot(configRef, (doc) => {
    if (doc.exists()) {
      localDB.configuracao = { ...localDB.configuracao, ...doc.data() };
    }
  });

  collectionsToSync.forEach((section) => {
    const q = query(
      collection(db, "artifacts", appId, "users", userId, section)
    );
    onSnapshot(q, (querySnapshot) => {
      localDB[section] = [];
      querySnapshot.forEach((doc) => {
        localDB[section].push({ id: doc.id, ...doc.data() });
      });

      if (section === "financeiro") {
        localDB.gruposPagar = [
          ...new Set(
            localDB.financeiro
              .filter((i) => i.tipo === "DESPESA")
              .map((i) => i.grupo)
          ),
        ];
        localDB.gruposReceber = [
          ...new Set(
            localDB.financeiro
              .filter((i) => i.tipo === "RECEITA")
              .map((i) => i.grupo)
          ),
        ];
      }

      if (
        document.getElementById(`view-${section}`)?.style.display === "block"
      ) {
        renderers[section]();
      }
    });
  });
}

async function displayValidationResult(receiptId, uid, appid) {
  const validationView = document.getElementById("validation-view");
  const appContainer = document.getElementById("app");
  appContainer.style.display = "none"; // Hide the main app

  try {
    if (!uid || !appid) throw new Error("URL de validação inválida.");

    const receiptRef = doc(
      db,
      "artifacts",
      appid,
      "users",
      uid,
      "recibos",
      receiptId
    );
    const receiptDoc = await getDoc(receiptRef);

    let content;
    if (receiptDoc.exists()) {
      const data = receiptDoc.data();
      content = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
                        <h2 class="text-2xl font-bold text-center text-green-600 mb-4"><i class="fas fa-check-circle mr-2"></i>Recibo Válido</h2>
                        <div class="space-y-2 border-t pt-4 mt-4">
                            <p><strong>Código de Verificação:</strong> ${receiptId}</p>
                            <p><strong>Pagador:</strong> ${data.nome}</p>
                            <p><strong>Valor:</strong> ${formatCurrency(
                              data.valor
                            )}</p>
                            <p><strong>Data:</strong> ${formatDateFromISO(
                              data.data
                            )}</p>
                            <p><strong>Referente a:</strong> ${
                              data.referencia
                            }</p>
                        </div>
                    </div>`;
    } else {
      content = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto">
                        <h2 class="text-2xl font-bold text-center text-red-600 mb-4"><i class="fas fa-times-circle mr-2"></i>Recibo Inválido</h2>
                        <p>O código de verificação <strong>${receiptId}</strong> não foi encontrado ou não é válido.</p>
                    </div>`;
    }
    validationView.innerHTML = content;
  } catch (error) {
    console.error("Validation error:", error);
    validationView.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-lg max-w-lg mx-auto"><h2 class="text-2xl font-bold text-center text-red-600 mb-4">Erro na Validação</h2><p>Não foi possível verificar o recibo neste momento.</p></div>`;
  }
  document.getElementById("loading-overlay").style.display = "none";
  validationView.style.display = "block";
}
