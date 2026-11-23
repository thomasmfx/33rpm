package br.com.rpm33.controller;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import br.com.rpm33.model.Categoria;
import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Disco;
import br.com.rpm33.model.InteracaoAssistente;
import br.com.rpm33.repository.CategoriaRepository;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.DiscoRepository;
import br.com.rpm33.repository.InteracaoAssistenteRepository;
import br.com.rpm33.service.AssistenteService;
import br.com.rpm33.service.ClienteService;

/**
 * RNF0044: as preferências declaradas e as conversas avaliadas com que o assistente começa,
 * de carga/assistente.json. Entram pelos serviços (ClienteService.alterarPreferencias,
 * AssistenteService.registrarConversaAnterior e avaliar), com validação e log, e dão ao
 * primeiro treino feedback útil e não útil para aproveitar e descartar. Roda na subida,
 * depois das vendas, quando ainda não há conversa; cliente que não existe mais é pulado.
 */
@Component
@Profile("dev")
@Order(3)
public class CargaAssistente implements ApplicationRunner {

  private static final String ARQUIVO = "carga/assistente.json";
  private static final String MODELO = "Carga de demonstração";

  private final ClienteService clienteService;
  private final AssistenteService assistenteService;
  private final ClienteRepository clienteRepository;
  private final CategoriaRepository categoriaRepository;
  private final DiscoRepository discoRepository;
  private final InteracaoAssistenteRepository interacaoRepository;
  private final ObjectMapper objectMapper;

  public CargaAssistente(ClienteService clienteService, AssistenteService assistenteService,
      ClienteRepository clienteRepository, CategoriaRepository categoriaRepository,
      DiscoRepository discoRepository, InteracaoAssistenteRepository interacaoRepository,
      ObjectMapper objectMapper) {
    this.clienteService = clienteService;
    this.assistenteService = assistenteService;
    this.clienteRepository = clienteRepository;
    this.categoriaRepository = categoriaRepository;
    this.discoRepository = discoRepository;
    this.interacaoRepository = interacaoRepository;
    this.objectMapper = objectMapper;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (interacaoRepository.count() > 0 || discoRepository.count() == 0) {
      return;
    }
    Carga carga = ler();
    Map<String, Long> discos = discoRepository.findAll().stream()
        .collect(Collectors.toMap(Disco::getTitulo, Disco::getId, (a, b) -> a));

    for (PreferenciasCarga preferencias : carga.preferencias()) {
      clienteRepository.findByEmailIgnoreCase(preferencias.cliente())
          .ifPresent(cliente -> clienteService.alterarPreferencias(cliente.getId(),
              preferencias.categorias().stream().map(this::categoria).toList()));
    }

    List<String> falhas = new ArrayList<>();
    for (InteracaoCarga conversa : carga.interacoes()) {
      Optional<Cliente> cliente = clienteRepository.findByEmailIgnoreCase(conversa.cliente());
      if (cliente.isEmpty()) {
        continue;
      }
      ObjectNode resposta = objectMapper.createObjectNode();
      resposta.put("texto", conversa.texto());
      ArrayNode sugestoes = resposta.putArray("sugestoes");
      for (SugestaoCarga sugestao : conversa.sugestoes()) {
        Long discoId = discos.get(sugestao.titulo());
        if (discoId == null) {
          falhas.add(sugestao.titulo() + ": disco fora do acervo.");
        } else {
          sugestoes.addObject().put("discoId", discoId).put("motivo", sugestao.motivo());
        }
      }
      InteracaoAssistente gravada = assistenteService.registrarConversaAnterior(cliente.get(),
          conversa.pergunta(), resposta.toString(), MODELO);
      if (conversa.util() != null) {
        assistenteService.avaliar(gravada.getId(), conversa.util());
      }
      interacaoRepository.flush();
      interacaoRepository.retroagir(gravada.getId(),
          LocalDate.now().minusDays(conversa.diasAtras()).atTime(19, 0));
    }
    if (!falhas.isEmpty()) {
      throw new IllegalStateException("Carga do assistente recusada: " + String.join(" | ", falhas));
    }
  }

  private Categoria categoria(CategoriaCarga carga) {
    return categoriaRepository.findByDescIgnoreCaseAndTipo(carga.desc(), carga.tipo())
        .orElseThrow(() -> new IllegalStateException(
            "Carga do assistente recusada: categoria " + carga.desc() + " fora do acervo."));
  }

  private Carga ler() {
    try (InputStream arquivo = new ClassPathResource(ARQUIVO).getInputStream()) {
      return objectMapper.readValue(arquivo, Carga.class);
    } catch (IOException e) {
      throw new UncheckedIOException("Não foi possível ler " + ARQUIVO, e);
    }
  }

  record Carga(List<PreferenciasCarga> preferencias, List<InteracaoCarga> interacoes) {
  }

  record PreferenciasCarga(String cliente, List<CategoriaCarga> categorias) {
  }

  record CategoriaCarga(String desc, String tipo) {
  }

  /** util nulo: a conversa fica sem avaliação. */
  record InteracaoCarga(String cliente, String pergunta, String texto,
      List<SugestaoCarga> sugestoes, Boolean util, int diasAtras) {
  }

  record SugestaoCarga(String titulo, String motivo) {
  }
}
