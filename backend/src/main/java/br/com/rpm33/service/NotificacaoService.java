package br.com.rpm33.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.Notificacao;
import br.com.rpm33.model.NotificacaoFiltro;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.NotificacaoRepository;

/**
 * RN0046: avisos ao cliente. Nascem de uma operação da curadoria (hoje, a troca
 * autorizada); o cliente só lê e marca como lidos.
 */
@Service("Notificacao")
public class NotificacaoService implements IService {

  private final NotificacaoRepository notificacaoRepository;
  private final ClienteRepository clienteRepository;
  private final RegistradorLog registradorLog;

  public NotificacaoService(NotificacaoRepository notificacaoRepository,
      ClienteRepository clienteRepository, RegistradorLog registradorLog) {
    this.notificacaoRepository = notificacaoRepository;
    this.clienteRepository = clienteRepository;
    this.registradorLog = registradorLog;
  }

  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Notificacao entrada = (Notificacao) entidade;
    if (entrada.getClienteId() == null || !clienteRepository.existsById(entrada.getClienteId())) {
      return Resultado.erro("Cliente não encontrado.");
    }
    if (entrada.getMensagem() == null || entrada.getMensagem().isBlank()) {
      return Resultado.erro("Informe a mensagem da notificação.");
    }
    Notificacao nova = new Notificacao();
    nova.setClienteId(entrada.getClienteId());
    nova.setPedidoId(entrada.getPedidoId());
    nova.setMensagem(entrada.getMensagem().trim());
    nova.setIsLida(false);
    Notificacao salva = notificacaoRepository.save(nova);
    registrar(OperacaoLog.INSERIR, salva, RegistradorLog.CURADORIA);
    return Resultado.com(salva);
  }

  /** O cliente marca a notificação como lida. */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    Notificacao entrada = (Notificacao) entidade;
    Optional<Notificacao> encontrada = entrada.getId() == null ? Optional.empty()
        : notificacaoRepository.findById(entrada.getId());
    if (encontrada.isEmpty()) {
      return Resultado.erro("Notificação não encontrada.");
    }
    if (entrada.getIsLida() == null) {
      return Resultado.erro("Informe se a notificação foi lida.");
    }
    Notificacao atual = encontrada.get();
    atual.setIsLida(entrada.getIsLida());
    String usuario = clienteRepository.findById(atual.getClienteId())
        .map(cliente -> cliente.getEmail()).orElse(RegistradorLog.CURADORIA);
    registrar(OperacaoLog.ALTERAR, atual, usuario);
    return Resultado.com(atual);
  }

  /** As notificações do cliente, da mais recente para a mais antiga. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof NotificacaoFiltro filtro) {
      if (filtro.getClienteId() == null) {
        return Resultado.erro("Informe o cliente.");
      }
      return Resultado.de(notificacaoRepository.findByClienteIdOrderByIdDesc(filtro.getClienteId()));
    }
    Notificacao notificacao = (Notificacao) entidade;
    return (notificacao.getId() == null ? Optional.<Notificacao>empty()
        : notificacaoRepository.findById(notificacao.getId()))
        .map(Resultado::com)
        .orElseGet(() -> Resultado.erro("Notificação não encontrada."));
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("A notificação não é excluída: marque-a como lida.");
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
