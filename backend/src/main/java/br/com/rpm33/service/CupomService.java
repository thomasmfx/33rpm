package br.com.rpm33.service;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.rpm33.model.Cliente;
import br.com.rpm33.model.Cupom;
import br.com.rpm33.model.CupomFiltro;
import br.com.rpm33.model.EntidadeDominio;
import br.com.rpm33.model.OperacaoLog;
import br.com.rpm33.model.TipoCupom;
import br.com.rpm33.repository.ClienteRepository;
import br.com.rpm33.repository.CupomRepository;
import br.com.rpm33.repository.TipoCupomRepository;

/**
 * Cupons do cliente: consulta para o checkout e para Meus cupons, geração do cupom de
 * troca (RN0036) e consumo na compra. Toda escrita aqui nasce de um pedido do cliente,
 * por isso o log leva o e-mail dele.
 */
@Service("Cupom")
public class CupomService implements IService {

  private final CupomRepository cupomRepository;
  private final TipoCupomRepository tipoCupomRepository;
  private final ClienteRepository clienteRepository;
  private final RegistradorLog registradorLog;

  public CupomService(CupomRepository cupomRepository, TipoCupomRepository tipoCupomRepository,
      ClienteRepository clienteRepository, RegistradorLog registradorLog) {
    this.cupomRepository = cupomRepository;
    this.tipoCupomRepository = tipoCupomRepository;
    this.clienteRepository = clienteRepository;
    this.registradorLog = registradorLog;
  }

  /** RN0036: o cupom de troca gerado pelo que os cupons passaram do total. */
  @Override
  @Transactional
  public Resultado salvar(EntidadeDominio entidade) {
    Cupom entrada = (Cupom) entidade;
    List<String> erros = new ArrayList<>();
    Cliente cliente = entrada.getCliente();
    if (cliente == null && entrada.getClienteId() != null) {
      cliente = clienteRepository.findById(entrada.getClienteId()).orElse(null);
    }
    if (cliente == null) {
      erros.add("Cliente não encontrado.");
    }
    TipoCupom tipo = resolverTipo(entrada.getTipo());
    if (tipo == null) {
      erros.add("Tipo de cupom não registrado no sistema.");
    }
    if (vazio(entrada.getCodigo())) {
      erros.add("Informe o código do cupom.");
    } else if (cupomRepository.existsByCodigoIgnoreCase(entrada.getCodigo().trim())) {
      erros.add("Já existe um cupom com o código " + entrada.getCodigo().trim() + ".");
    }
    if (entrada.getValor() == null || entrada.getValor().signum() <= 0) {
      erros.add("O valor do cupom precisa ser maior que zero.");
    }
    if (!erros.isEmpty()) {
      return Resultado.erro(erros);
    }

    Cupom novo = new Cupom();
    novo.setCliente(cliente);
    novo.setClienteId(cliente.getId());
    novo.setTipo(tipo);
    novo.setCodigo(entrada.getCodigo().trim());
    novo.setValor(entrada.getValor().setScale(2, RoundingMode.HALF_UP));
    novo.setIsUtilizado(false);
    novo.setPedidoOrigemId(entrada.getPedidoOrigemId());
    Cupom salvo = cupomRepository.save(novo);
    registrar(OperacaoLog.INSERIR, salvo);
    return Resultado.com(salvo);
  }

  /** RN0033 a RN0036: o cupom usado na compra não volta a ser aceito. */
  @Override
  @Transactional
  public Resultado alterar(EntidadeDominio entidade) {
    Cupom entrada = (Cupom) entidade;
    Optional<Cupom> encontrado =
        entrada.getId() == null ? Optional.empty() : cupomRepository.findById(entrada.getId());
    if (encontrado.isEmpty()) {
      return Resultado.erro("Cupom não encontrado.");
    }
    if (entrada.getIsUtilizado() == null) {
      return Resultado.erro("Informe se o cupom foi utilizado.");
    }
    Cupom atual = encontrado.get();
    // dois pedidos simultâneos leem o cupom livre; só um pode consumi-lo
    if (Boolean.TRUE.equals(entrada.getIsUtilizado()) && cupomRepository.consumir(atual.getId()) == 0) {
      return Resultado.erro("O cupom " + atual.getCodigo() + " já foi utilizado.");
    }
    atual.setIsUtilizado(entrada.getIsUtilizado());
    registrar(OperacaoLog.ALTERAR, atual);
    return Resultado.com(atual);
  }

  /** Os cupons do cliente, usados e disponíveis, por tipo e código. */
  @Override
  @Transactional(readOnly = true)
  public Resultado consultar(EntidadeDominio entidade) {
    if (entidade instanceof CupomFiltro filtro) {
      if (filtro.getClienteId() == null) {
        return Resultado.de(cupomRepository.findAllByOrderByTipoIdAscCodigoAsc());
      }
      return Resultado.de(Boolean.TRUE.equals(filtro.getDisponiveis())
          ? cupomRepository.findByClienteIdAndIsUtilizadoFalseOrderByTipoIdAscCodigoAsc(
              filtro.getClienteId())
          : cupomRepository.findByClienteIdOrderByTipoIdAscCodigoAsc(filtro.getClienteId()));
    }
    Cupom cupom = (Cupom) entidade;
    return (cupom.getId() == null ? Optional.<Cupom>empty() : cupomRepository.findById(cupom.getId()))
        .map(Resultado::com)
        .orElseGet(() -> Resultado.erro("Cupom não encontrado."));
  }

  @Override
  public Resultado excluir(EntidadeDominio entidade) {
    return Resultado.erro("O cupom não é excluído: usado ou não, ele fica no histórico do cliente.");
  }

  private TipoCupom resolverTipo(TipoCupom informado) {
    if (informado == null) {
      return null;
    }
    if (informado.getId() != null) {
      return tipoCupomRepository.findById(informado.getId()).orElse(null);
    }
    return vazio(informado.getDesc()) ? null
        : tipoCupomRepository.findByDescIgnoreCase(informado.getDesc().trim()).orElse(null);
  }

  private void registrar(String operacao, Cupom cupom) {
    Map<String, Object> dados = new LinkedHashMap<>();
    dados.put("codigo", cupom.getCodigo());
    dados.put("tipo", cupom.getTipo().getDesc());
    dados.put("valor", cupom.getValor());
    dados.put("isUtilizado", cupom.getIsUtilizado());
    dados.put("clienteId", cupom.getClienteId());
    if (cupom.getPedidoOrigemId() != null) {
      dados.put("pedidoOrigemId", cupom.getPedidoOrigemId());
    }
    registradorLog.registrar(operacao, Cupom.class.getSimpleName(), cupom.getId(), dados,
        cupom.getCliente().getEmail());
  }

  private static boolean vazio(String valor) {
    return valor == null || valor.isBlank();
  }
}
