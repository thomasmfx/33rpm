package br.com.rpm33.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.Pedido;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {

  List<Pedido> findByClienteIdOrderByDataCadastroDescIdDesc(Long clienteId);

  List<Pedido> findAllByOrderByDataCadastroDescIdDesc();

  /** RN0037: os pedidos à espera da validação, os mais antigos primeiro. */
  List<Pedido> findByStatusDescricaoOrderByIdAsc(String status);

  List<Pedido> findByStatusDescricaoAndDataCadastroLessThanEqualOrderByIdAsc(String status,
      LocalDateTime limite);

  /**
   * RN0028 e RN0044: o pedido EM PROCESSAMENTO ainda não baixou o estoque, mas os
   * itens dele já não estão livres para outra compra.
   */
  @Query("select i.discoId, sum(i.quantidade) from ItemPedido i "
      + "where i.discoId in :discoIds and i.pedido.status.descricao = 'EM PROCESSAMENTO' "
      + "group by i.discoId")
  List<Object[]> reservadosEmProcessamento(@Param("discoIds") Collection<Long> discoIds);

  /**
   * RF0055, RN0071: o valor vendido por mês e gênero principal. Só ENTREGUE conta, pela
   * data da compra; o fim é exclusivo, para o último dia entrar inteiro.
   */
  @Query("select year(p.dataCadastro), month(p.dataCadastro), g.desc, "
      + "sum(i.precoUnitario * i.quantidade) "
      + "from ItemPedido i join i.pedido p join i.disco d join d.generoPrincipal g "
      + "where p.status.descricao = 'ENTREGUE' and p.dataCadastro >= :inicio "
      + "and p.dataCadastro < :fimExclusivo and g.desc in :categorias "
      + "group by year(p.dataCadastro), month(p.dataCadastro), g.desc")
  List<Object[]> vendasEntreguesPorMesECategoria(@Param("inicio") LocalDateTime inicio,
      @Param("fimExclusivo") LocalDateTime fimExclusivo,
      @Param("categorias") Collection<String> categorias);

  /** Teste e demonstração (perfil dev): move a compra no tempo, que o banco carimba com a hora de agora. */
  @Modifying
  @Query(value = "UPDATE pedido SET data = :data WHERE id = :id", nativeQuery = true)
  int retroagir(@Param("id") Long id, @Param("data") LocalDateTime data);
}
