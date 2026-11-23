package br.com.rpm33.model;

/**
 * RNF0044: o painel do assistente na curadoria. treinoEmUso é o ajuste fino em uso, nulo
 * enquanto o assistente responde com o modelo base; os exemplos são os que o próximo
 * treino enviaria.
 */
public record SituacaoAssistente(String descricao, String modeloBase,
    Treinamento treinoEmUso, boolean treinoEmAndamento, int exemplosVendas,
    int exemplosFeedback, int exemplosAcervo, int feedbacksDescartados, int exemplosNovos,
    int minimoExemplos) {
}
