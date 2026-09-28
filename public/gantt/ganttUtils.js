/**
 * Escapa caracteres para evitar XSS ao injetar HTML.
 */
export function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/* ==================== DATAS E TEMPO ==================== */

export function analisarData(texto) {
    if (!texto) return null;
    const [ano, mes, dia] = texto.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
}

export function paraISO(objetoData) {
    if (!objetoData) return "";
    const ano = objetoData.getFullYear();
    const mes = String(objetoData.getMonth() + 1).padStart(2, "0");
    const dia = String(objetoData.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

export function formatarDataBR(textoISO) {
    if (!textoISO) return "";
    const [ano, mes, dia] = textoISO.split("-");
    if (!ano || !mes || !dia) return textoISO;
    return `${dia}/${mes}/${ano}`;
}

export function adicionarDias(dataInicial, dias) {
    const res = new Date(dataInicial);
    res.setDate(res.getDate() + dias);
    return res;
}

export function inicioDaSemana(data) {
    const dataSegunda = new Date(data);
    const diaDaSemana = dataSegunda.getDay();
    const diasAteSegunda = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
    dataSegunda.setDate(dataSegunda.getDate() + diasAteSegunda);
    dataSegunda.setHours(0, 0, 0, 0);
    return dataSegunda;
}

export function inicioDoMes(data) {
    return new Date(data.getFullYear(), data.getMonth(), 1);
}

export function inicioDoAno(data) {
    return new Date(data.getFullYear(), 0, 1);
}

export function diferencaDias(dataInicial, dataFinal) {
    const msPorDia = 86400000;
    return Math.round((dataFinal - dataInicial) / msPorDia);
}

export function obterSemanaISO(data) {
    const dataUtc = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
    const diaDaSemana = dataUtc.getUTCDay() || 7;
    dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - diaDaSemana);
    const dataInicioAno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
    return Math.ceil(((dataUtc - dataInicioAno) / 86400000 + 1) / 7);
}
