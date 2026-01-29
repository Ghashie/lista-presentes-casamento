const firebaseConfig = {
  apiKey: "AIzaSyB0PkPh_8RoExgPNWNc4tHBqtib25xeNFo",
  authDomain: "lista-de-casamento-6077a.firebaseapp.com",
  projectId: "lista-de-casamento-6077a",
  storageBucket: "lista-de-casamento-6077a.firebasestorage.app",
  messagingSenderId: "513702847586",
  appId: "1:513702847586:web:d113388217fd1a0e62dd3b"
};

// Chave Pix para presentes do tipo "cotas"
const PIX_CHAVE = "+5521998827325";

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ====== ELEMENTOS ======
const listaPresentesDiv = document.getElementById("listaPresentes");
const listaVaziaDiv = document.getElementById("listaVazia");

// Modal reserva
const modalReservaEl = document.getElementById("modalReserva");
const modalReserva = new bootstrap.Modal(modalReservaEl);
const formReserva = document.getElementById("formReserva");
const reservaPresenteTituloSpan = document.getElementById("reservaPresenteTitulo");
const reservaPresenteDescricaoSpan = document.getElementById("reservaPresenteDescricao");
const nomeConvidadoInput = document.getElementById("nomeConvidado");
const mensagemConvidadoInput = document.getElementById("mensagemConvidado");
const grupoQtdCotasDiv = document.getElementById("grupoQtdCotas");
const qtdCotasInput = document.getElementById("qtdCotasInput");
const textoCotasDisponiveis = document.getElementById("textoCotasDisponiveis");
const valorReservaTextoSpan = document.getElementById("valorReservaTexto");

// Modal Pix (apenas para tipo "cotas")
const modalPixEl = document.getElementById("modalPix");
const modalPix = new bootstrap.Modal(modalPixEl);
const pixPresenteTituloSpan = document.getElementById("pixPresenteTitulo");
const pixPresenteTituloInlineSpan = document.getElementById("pixPresenteTituloInline");
const pixDetalhesReservaSpan = document.getElementById("pixDetalhesReserva");
const pixValorSpan = document.getElementById("pixValor");
const pixChaveSpan = document.getElementById("pixChave");
const btnCopiarChave = document.getElementById("btnCopiarChave");
const btnCopiarValor = document.getElementById("btnCopiarValor");

// Estado atual do presente selecionado
let presenteSelecionado = null;
let valorReservaAtual = 0;
let qtdCotasEscolhida = 1;

// Helper: descobre tipo do presente mesmo se faltar o campo (retrocompat)
function obterTipoPresente(p) {
  if (p.tipo) return p.tipo; // se já vier do banco

  // fallback: tenta deduzir
  if (p.permiteCotas) return "cotas";
  if (p.lojaUrl) return "online";
  return "livre";
}

// ========== CARREGAR PRESENTES ==========
function carregarPresentes() {
  db.collection("presentes")
    .orderBy("titulo")
    .onSnapshot((snapshot) => {
      listaPresentesDiv.innerHTML = "";

      if (snapshot.empty) {
        listaVaziaDiv.classList.remove("d-none");
        return;
      } else {
        listaVaziaDiv.classList.add("d-none");
      }

      snapshot.forEach((doc) => {
        const p = doc.data();
        const id = doc.id;

        const tipo = obterTipoPresente(p);
        const isCotas = tipo === "cotas";
        const isOnline = tipo === "online";
        const isLivre = tipo === "livre";

        const col = document.createElement("div");
        col.className = "col-12 col-md-6 col-lg-4";

        const cotasText = isCotas
          ? `${p.qtdCotasReservadas || 0}/${p.qtdCotasTotal} cotas`
          : null;

        const esgotado =
          p.status === "completo" ||
          (isCotas && (p.qtdCotasReservadas || 0) >= (p.qtdCotasTotal || 1));

        // Texto do tipo para badge
        let labelTipo = "";
        if (isCotas) labelTipo = "Cotas via Pix";
        else if (isOnline) labelTipo = "Presente online";
        else labelTipo = "Presente livre";

        // Bloco de preço/infos
        let blocoInfo = "";
        if (isCotas && p.valorPorCota) {
          blocoInfo = `
            <p class="mb-1">
              <span class="presente-info-preco d-block">Cota: <strong>R$ ${p.valorPorCota.toFixed(2)}</strong></span>
              <span class="presente-info-cotas d-block">Cotas: <strong>${cotasText}</strong></span>
            </p>
          `;
        } else if (p.precoTotal) {
          blocoInfo = `
            <p class="mb-1">
              <span class="presente-info-preco d-block">
                Valor ${isOnline ? "aprox." : "sugerido"}:
                <strong>R$ ${p.precoTotal.toFixed(2)}</strong>
              </span>
            </p>
          `;
        }

        // Link da loja (mais destacado para ONLINE)
        let blocoLoja = "";
        if (p.lojaNome || p.lojaUrl) {
          const linkTexto = isOnline ? "Abrir site da loja" : "Ver na loja";
          blocoLoja = `
            <p class="small mb-2">
              Loja: ${p.lojaNome || ""} 
              ${p.lojaUrl ? `• <a href="${p.lojaUrl}" target="_blank">${linkTexto}</a>` : ""}
            </p>
          `;
        }

        col.innerHTML = `
          <div class="card h-100 shadow-sm">
            ${p.imagemUrl ? `
              <img src="${p.imagemUrl}" class="card-img-top" alt="${p.titulo}" />
            ` : ""}

            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                <h5 class="card-title mb-0">${p.titulo || ""}</h5>
                <span class="badge-status ${
                  isCotas ? "badge-tipo-cotas" :
                  isOnline ? "badge-tipo-online" :
                             "badge-tipo-livre"
                }">${labelTipo}</span>
              </div>

              <p class="card-text small text-muted mb-2">
                ${p.descricao || ""}
              </p>

              ${blocoLoja}
              ${blocoInfo}

              <div class="mt-auto pt-2">
                <button
                  class="btn btn-sm ${esgotado ? "btn-secondary" : "btn-primary"} w-100 btnPresentear"
                  data-id="${id}"
                  ${esgotado ? "disabled" : ""}
                >
                  ${esgotado ? "Já escolhido" : "Presentear"}
                </button>
              </div>
            </div>
          </div>
        `;

        listaPresentesDiv.appendChild(col);
      });
    });
}

// ========== ABRIR MODAL DE RESERVA ==========
listaPresentesDiv.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btnPresentear");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  const doc = await db.collection("presentes").doc(id).get();
  if (!doc.exists) return;

  presenteSelecionado = { id: doc.id, ...doc.data() };
  const tipo = obterTipoPresente(presenteSelecionado);

  // Preenche modal
  reservaPresenteTituloSpan.textContent = presenteSelecionado.titulo || "";
  reservaPresenteDescricaoSpan.textContent = presenteSelecionado.descricao || "";

  nomeConvidadoInput.value = "";
  mensagemConvidadoInput.value = "";

  const cotasReservadas = presenteSelecionado.qtdCotasReservadas || 0;
  const cotasTotal = presenteSelecionado.qtdCotasTotal || 1;
  const cotasDisponiveis = Math.max(cotasTotal - cotasReservadas, 0);

  if (tipo === "cotas") {
    grupoQtdCotasDiv.classList.remove("d-none");
    qtdCotasInput.min = 1;
    qtdCotasInput.max = cotasDisponiveis;
    qtdCotasInput.value = 1;
    textoCotasDisponiveis.textContent =
      `Cotas disponíveis: ${cotasDisponiveis} de ${cotasTotal}.`;
    qtdCotasEscolhida = 1;
    valorReservaAtual = (presenteSelecionado.valorPorCota || 0) * qtdCotasEscolhida;
  } else {
    // livre ou online → sem cotas
    grupoQtdCotasDiv.classList.add("d-none");
    qtdCotasEscolhida = 1;
    valorReservaAtual = presenteSelecionado.precoTotal || 0;
  }

  // Se não tiver valor (tipo livre), só mostra "—"
  valorReservaTextoSpan.textContent =
    valorReservaAtual > 0 ? `R$ ${valorReservaAtual.toFixed(2)}` : "—";

  modalReserva.show();
});

// Atualiza valor quando muda qtd de cotas
qtdCotasInput.addEventListener("input", () => {
  if (!presenteSelecionado) return;
  const tipo = obterTipoPresente(presenteSelecionado);
  if (tipo !== "cotas") return;

  const v = Number(qtdCotasInput.value || 1);
  const cotasReservadas = presenteSelecionado.qtdCotasReservadas || 0;
  const cotasTotal = presenteSelecionado.qtdCotasTotal || 1;
  const cotasDisponiveis = Math.max(cotasTotal - cotasReservadas, 0);

  if (v < 1) {
    qtdCotasEscolhida = 1;
  } else if (v > cotasDisponiveis) {
    qtdCotasEscolhida = cotasDisponiveis;
  } else {
    qtdCotasEscolhida = v;
  }

  qtdCotasInput.value = qtdCotasEscolhida;
  valorReservaAtual = (presenteSelecionado.valorPorCota || 0) * qtdCotasEscolhida;
  valorReservaTextoSpan.textContent = `R$ ${valorReservaAtual.toFixed(2)}`;
});

// ========== SUBMIT DA RESERVA ==========
formReserva.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!presenteSelecionado) return;

  const nome = nomeConvidadoInput.value.trim();
  const mensagem = mensagemConvidadoInput.value.trim();

  if (!nome) {
    alert("Por favor, informe seu nome.");
    return;
  }

  const tipo = obterTipoPresente(presenteSelecionado);

  try {
    const presenteRef = db.collection("presentes").doc(presenteSelecionado.id);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(presenteRef);
      if (!doc.exists) throw new Error("Presente não encontrado.");

      const p = doc.data();
      const tipoP = obterTipoPresente(p);

      const cotasReservadas = p.qtdCotasReservadas || 0;
      const cotasTotal = p.qtdCotasTotal || 1;
      const cotasDisponiveis = Math.max(cotasTotal - cotasReservadas, 0);

      if (tipoP === "cotas") {
        if (qtdCotasEscolhida > cotasDisponiveis) {
          throw new Error("Quantidade de cotas indisponível.");
        }
      } else {
        if (cotasReservadas >= cotasTotal) {
          throw new Error("Presente já foi escolhido.");
        }
      }

      const valorTotal =
        tipoP === "cotas"
          ? (p.valorPorCota || 0) * qtdCotasEscolhida
          : (p.precoTotal || 0);

      const reservaRef = db.collection("reservas").doc();
      transaction.set(reservaRef, {
        presenteId: presenteSelecionado.id,
        tituloPresente: p.titulo || "",
        nomeConvidado: nome,
        mensagem: mensagem || null,
        quantidadeCotas: tipoP === "cotas" ? qtdCotasEscolhida : 1,
        valorTotal,
        tipoPresente: tipoP,
        statusPagamento: tipoP === "cotas" ? "pendente" : "externo",
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });

      const incremento = tipoP === "cotas" ? qtdCotasEscolhida : 1;
      const novoReservado = cotasReservadas + incremento;
      const novoStatus =
        novoReservado >= cotasTotal ? "completo" : (p.status || "disponivel");

      transaction.update(presenteRef, {
        qtdCotasReservadas: novoReservado,
        status: novoStatus
      });

      presenteSelecionado.qtdCotasReservadas = novoReservado;
      presenteSelecionado.status = novoStatus;
    });

    modalReserva.hide();

    // Pós-reserva de acordo com o tipo
    if (tipo === "cotas") {
      mostrarModalPix(nome, presenteSelecionado, qtdCotasEscolhida, valorReservaAtual, mensagem);
    } else if (tipo === "online") {
      // agradece + abre site da loja (se houver link)
      let msg = "Presente reservado! Muito obrigado 💚\n\n";
      msg += "Agora é só finalizar a compra no site da loja.";
      alert(msg);

      if (presenteSelecionado.lojaUrl) {
        window.open(presenteSelecionado.lojaUrl, "_blank");
      }
    } else {
      // tipo livre
      alert(
        "Presente reservado! Muito obrigado 💚\n\n" +
        "Fique à vontade para escolher o modelo/versão desse presente."
      );
    }

  } catch (err) {
    console.error("Erro ao reservar presente:", err);
    alert(err.message || "Erro ao reservar presente. Tente novamente.");
  }
});

// ========== MODAL PIX (somente COTAS) ==========
function mostrarModalPix(nome, presente, qtdCotas, valor, mensagem) {
  pixPresenteTituloSpan.textContent = presente.titulo || "";
  pixPresenteTituloInlineSpan.textContent = presente.titulo || "";

  const msgExtra = mensagem ? `Mensagem: "${mensagem}"` : "";
  const txtCotas =
    `${qtdCotas} cota(s) de R$ ${presente.valorPorCota.toFixed(2)}`;

  pixDetalhesReservaSpan.textContent =
    `${nome} • ${txtCotas}${msgExtra ? " • " + msgExtra : ""}`;

  pixValorSpan.textContent = `R$ ${valor.toFixed(2)}`;
  pixChaveSpan.textContent = PIX_CHAVE;

  modalPix.show();
}

// Copiar Pix
btnCopiarChave.addEventListener("click", () => {
  navigator.clipboard.writeText(PIX_CHAVE)
    .then(() => alert("Chave Pix copiada!"))
    .catch(() => alert("Não foi possível copiar. Copie manualmente."));
});

btnCopiarValor.addEventListener("click", () => {
  navigator.clipboard.writeText(valorReservaAtual.toFixed(2).replace(".", ","))
    .then(() => alert("Valor copiado!"))
    .catch(() => alert("Não foi possível copiar. Copie manualmente."));
});

// Inicia
carregarPresentes();
