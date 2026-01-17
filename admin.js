// ======= CONFIG FIREBASE =======
const firebaseConfig = {
  apiKey: "AIzaSyB0PkPh_8RoExgPNWNc4tHBqtib25xeNFo",
  authDomain: "lista-de-casamento-6077a.firebaseapp.com",
  projectId: "lista-de-casamento-6077a",
  storageBucket: "lista-de-casamento-6077a.firebasestorage.app",
  messagingSenderId: "513702847586",
  appId: "1:513702847586:web:d113388217fd1a0e62dd3b"
};

// UID do usuário admin (pego no Firebase Auth)
const ADMIN_UID = "0XjhYpambgcui8TsJ0OhZyovP2T2";

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log("admin.js carregado");

// ======= ELEMENTOS DA TELA =======
const loginArea = document.getElementById("loginArea");
const dashboard = document.getElementById("dashboard");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const loginErro = document.getElementById("loginErro");

// Form presente
const formPresente = document.getElementById("formPresente");
const formTitulo = document.getElementById("formTitulo");
const presenteIdInput = document.getElementById("presenteId");
const tituloInput = document.getElementById("titulo");
const imagemUrlInput = document.getElementById("imagemUrl");
const descricaoInput = document.getElementById("descricao");
const lojaNomeInput = document.getElementById("lojaNome");
const lojaUrlInput = document.getElementById("lojaUrl");
const precoTotalInput = document.getElementById("precoTotal");
const permiteCotasSelect = document.getElementById("permiteCotas");
const valorPorCotaInput = document.getElementById("valorPorCota");
const qtdCotasTotalInput = document.getElementById("qtdCotasTotal");
const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");

const campoValorCota = document.getElementById("campoValorCota");
const campoQtdCotas = document.getElementById("campoQtdCotas");

// Tabelas
const tabelaPresentes = document.getElementById("tabelaPresentes");
const tabelaReservas = document.getElementById("tabelaReservas");

// Só pra garantir que nenhum elemento crítico veio null:
if (!btnLogin) console.error("Elemento #btnLogin não encontrado no HTML");
if (!formPresente) console.error("Elemento #formPresente não encontrado no HTML");
if (!permiteCotasSelect) console.error("Elemento #permiteCotas não encontrado no HTML");

// ======= CONTROLE DE LOGIN =======

if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    loginErro.classList.add("d-none");
    loginErro.textContent = "";

    try {
      console.log("Tentando login com", email);
      await auth.signInWithEmailAndPassword(email, senha);
      // se der certo, onAuthStateChanged vai disparar
    } catch (err) {
      console.error("Erro no login:", err);
      loginErro.textContent = "Falha no login. Verifique e-mail/senha.";
      loginErro.classList.remove("d-none");
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await auth.signOut();
  });
}

// Observa estado de autenticação
auth.onAuthStateChanged((user) => {
  console.log("onAuthStateChanged -> user:", user?.uid, "ADMIN:", ADMIN_UID);

  if (user && user.uid === ADMIN_UID) {
    // Mostra dashboard
    loginArea.classList.add("d-none");
    dashboard.classList.remove("d-none");
    btnLogout.classList.remove("d-none");
    loginErro.classList.add("d-none");

    iniciarDashboard();
  } else {
    // Não logado ou não é admin
    dashboard.classList.add("d-none");
    btnLogout.classList.add("d-none");
    loginArea.classList.remove("d-none");

    // se tiver user mas não for admin, mostra mensagem
    if (user && user.uid !== ADMIN_UID) {
      loginErro.textContent = "Este usuário não tem acesso ao painel admin.";
      loginErro.classList.remove("d-none");
    }
  }
});

// ======= LÓGICA DO DASHBOARD =======

function iniciarDashboard() {
  console.log("Iniciando dashboard...");
  carregarPresentes();
  carregarReservas();
  atualizaVisibilidadeCotas();
}

if (permiteCotasSelect) {
  permiteCotasSelect.addEventListener("change", atualizaVisibilidadeCotas);
}

function atualizaVisibilidadeCotas() {
  const permite = permiteCotasSelect.value === "true";
  campoValorCota.style.display = permite ? "block" : "none";
  campoQtdCotas.style.display = permite ? "block" : "none";
}

// ======= CRUD PRESENTES =======

if (formPresente) {
  formPresente.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = presenteIdInput.value || null;
    const permiteCotas = permiteCotasSelect.value === "true";

    const dados = {
      titulo: tituloInput.value.trim(),
      imagemUrl: imagemUrlInput.value.trim() || null,
      descricao: descricaoInput.value.trim() || null,
      lojaNome: lojaNomeInput.value.trim() || null,
      lojaUrl: lojaUrlInput.value.trim() || null,
      precoTotal: precoTotalInput.value ? Number(precoTotalInput.value) : null,
      permiteCotas,
      valorPorCota: permiteCotas && valorPorCotaInput.value ? Number(valorPorCotaInput.value) : null,
      qtdCotasTotal: permiteCotas && qtdCotasTotalInput.value ? Number(qtdCotasTotalInput.value) : 1,
      qtdCotasReservadas: 0,
      status: "disponivel"
    };

    try {
      if (id) {
        delete dados.qtdCotasReservadas;
        delete dados.status;
        await db.collection("presentes").doc(id).update(dados);
      } else {
        await db.collection("presentes").add(dados);
      }
      limparFormPresente();
    } catch (err) {
      console.error("Erro ao salvar presente:", err);
      alert("Erro ao salvar presente. Veja o console.");
    }
  });
}

if (btnCancelarEdicao) {
  btnCancelarEdicao.addEventListener("click", () => {
    limparFormPresente();
  });
}

function limparFormPresente() {
  presenteIdInput.value = "";
  formTitulo.textContent = "Novo presente";
  formPresente.reset();
  permiteCotasSelect.value = "false";
  atualizaVisibilidadeCotas();
  btnCancelarEdicao.classList.add("d-none");
}

function carregarPresentes() {
  db.collection("presentes")
    .orderBy("titulo")
    .onSnapshot((snapshot) => {
      tabelaPresentes.innerHTML = "";

      snapshot.forEach((doc) => {
        const p = doc.data();
        const id = doc.id;

        const tr = document.createElement("tr");

        const cotasInfo = p.permiteCotas
          ? `${p.qtdCotasReservadas || 0}/${p.qtdCotasTotal} cotas`
          : "—";

        tr.innerHTML = `
          <td>${p.titulo || ""}</td>
          <td>${p.precoTotal ? "R$ " + p.precoTotal.toFixed(2) : "—"}</td>
          <td>${cotasInfo}</td>
          <td>${p.status || "—"}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" data-id="${id}" data-acao="editar">
              Editar
            </button>
            <button class="btn btn-sm btn-outline-danger" data-id="${id}" data-acao="excluir">
              Excluir
            </button>
          </td>
        `;

        tabelaPresentes.appendChild(tr);
      });
    });

  // Delegação de eventos de editar/excluir
  tabelaPresentes.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const acao = btn.getAttribute("data-acao");

    if (acao === "excluir") {
      if (confirm("Tem certeza que deseja excluir este presente?")) {
        try {
          await db.collection("presentes").doc(id).delete();
        } catch (err) {
          console.error("Erro ao excluir presente:", err);
          alert("Erro ao excluir presente.");
        }
      }
    }

    if (acao === "editar") {
      try {
        const doc = await db.collection("presentes").doc(id).get();
        if (!doc.exists) return;

        const p = doc.data();
        presenteIdInput.value = id;
        formTitulo.textContent = "Editar presente";

        tituloInput.value = p.titulo || "";
        imagemUrlInput.value = p.imagemUrl || "";
        descricaoInput.value = p.descricao || "";
        lojaNomeInput.value = p.lojaNome || "";
        lojaUrlInput.value = p.lojaUrl || "";
        precoTotalInput.value = p.precoTotal || "";

        permiteCotasSelect.value = p.permiteCotas ? "true" : "false";
        atualizaVisibilidadeCotas();
        valorPorCotaInput.value = p.valorPorCota || "";
        qtdCotasTotalInput.value = p.qtdCotasTotal || "";

        btnCancelarEdicao.classList.remove("d-none");
      } catch (err) {
        console.error("Erro ao carregar presente para edição:", err);
      }
    }
  });
}

// ======= LISTAGEM DE RESERVAS =======

function carregarReservas() {
  db.collection("reservas")
    .orderBy("criadoEm", "desc")
    .onSnapshot((snapshot) => {
      tabelaReservas.innerHTML = "";

      snapshot.forEach((doc) => {
        const r = doc.data();

        const tr = document.createElement("tr");

        const valorTexto = r.valorTotal
          ? "R$ " + Number(r.valorTotal).toFixed(2)
          : "—";

        const dataTexto = r.criadoEm && r.criadoEm.toDate
          ? r.criadoEm.toDate().toLocaleString("pt-BR")
          : "—";

        tr.innerHTML = `
          <td>${r.tituloPresente || ""}</td>
          <td>${r.nomeConvidado || ""}</td>
          <td>${r.quantidadeCotas || 1}</td>
          <td>${valorTexto}</td>
          <td>${r.mensagem || ""}</td>
          <td>${dataTexto}</td>
        `;

        tabelaReservas.appendChild(tr);
      });
    });
}
