package br.com.rpm33.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Notificacao;
import br.com.rpm33.model.NotificacaoFiltro;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.NotificacaoRepository;

/**
 * RN0046: avisos ao cliente. Nascem de uma operação da curadoria (hoje, a troca
 * autorizada); o cliente só lê e marca como lidos.
 */
@Service
public class NotificacaoService {

  private final NotificacaoRepository notificacaoRepository;
  private final ClienteRepository clienteRepository;
  private final RegistradorLog registradorLog;

  public NotificacaoService(NotificacaoRepository notificacaoRepository,
      ClienteRepository clienteRepository, RegistradorLog registradorLog) {
    this.notificacaoRepository = notificacaoRepository;
    this.clienteRepository = clienteRepository;
    this.registradorLog = registradorLog;
  }

  @Transactional
  public Notificacao criar(Notificacao entrada) {
    if (entrada.getClienteId() == null || !clienteRepository.existsById(entrada.getClienteId())) {
      throw new RegraNegocioException("Cliente não encontrado.");
    }
    if (entrada.getMensagem() == null || entrada.getMensagem().isBlank()) {
      throw new RegraNegocioException("Informe a mensagem da notificação.");
    }
    Notificacao nova = new Notificacao();
    nova.setClienteId(entrada.getClienteId());
    nova.setPedidoId(entrada.getPedidoId());
    nova.setMensagem(entrada.getMensagem().trim());
    nova.setIsLida(false);
    Notificacao salva = notificacaoRepository.save(nova);
    registrar(OperacaoLog.INSERIR, salva, RegistradorLog.CURADORIA);
    return salva;
  }

  /** O cliente marca a notificação como lida. */
  @Transactional
  public Notificacao marcarComoLida(Long id) {
    Notificacao atual = notificacaoRepository.findById(id)
        .orElseThrow(() -> new RegraNegocioException("Notificação não encontrada."));
    atual.setIsLida(true);
    String usuario = clienteRepository.findById(atual.getClienteId())
        .map(cliente -> cliente.getEmail()).orElse(RegistradorLog.CURADORIA);
    registrar(OperacaoLog.ALTERAR, atual, usuario);
    return atual;
  }

  /** As notificações do cliente, da mais recente para a mais antiga. */
  @Transactional(readOnly = true)
  public List<Notificacao> consultar(NotificacaoFiltro filtro) {
    if (filtro.getClienteId() == null) {
      throw new RegraNegocioException("Informe o cliente.");
    }
    return notificacaoRepository.findByClienteIdOrderByIdDesc(filtro.getClienteId());
  }

  private void registrar(String operacao, Notificacao notificacao, String usuario) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("clienteId", notificacao.getClienteId());
    dados.put("pedidoId", notificacao.getPedidoId());
    dados.put("mensagem", notificacao.getMensagem());
    dados.put("isLida", notificacao.getIsLida());
    registradorLog.registrar(operacao, Notificacao.class.getSimpleName(), notificacao.getId(),
        dados, usuario);
  }
}
